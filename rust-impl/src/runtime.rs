use crate::{Ast, Error, Result, Value};
#[path = "controls.rs"]
mod controls;
#[path = "immediate.rs"]
mod immediate;
pub use controls::{ControlUsage, RuntimeControls, RuntimeLimits};
#[path = "streams.rs"]
mod streams;
use futures::future::LocalBoxFuture;
use futures::FutureExt;
use indexmap::IndexMap;
use serde_json::{json, Value as Json};
use std::{
    cell::{Cell, Ref, RefCell, RefMut},
    collections::{HashMap, HashSet},
    future::Future,
    rc::{Rc, Weak},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
pub use streams::{StreamContext, StreamResolver, StreamStats, StreamSubscription};

pub type EnvId = usize;
type Native = Rc<dyn Fn(Vec<Value>) -> LocalBoxFuture<'static, Result<Value>>>;
type Host = Rc<dyn for<'a> Fn(&'a mut Runtime, Vec<Value>) -> LocalBoxFuture<'a, Result<Value>>>;
type DetachedHost = Rc<dyn Fn(&mut Runtime, Vec<Value>) -> LocalBoxFuture<'static, Result<Value>>>;
type Special = Rc<
    dyn for<'a> Fn(
        &'a mut Runtime,
        Vec<Ast>,
        EnvId,
        EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>>,
>;
type Lookup = Rc<dyn Fn(&str, &EvalOptions) -> Result<Option<Value>>>;

#[derive(Debug, Clone)]
pub struct EvalOptions {
    pub resolve_string: bool,
    pub disallow_lib_functions_getting: bool,
    pub max_loop_iterations: usize,
    pub max_steps: usize,
    pub max_depth: usize,
}
impl Default for EvalOptions {
    fn default() -> Self {
        Self {
            resolve_string: true,
            disallow_lib_functions_getting: false,
            max_loop_iterations: 100,
            max_steps: 1_000_000,
            max_depth: 128,
        }
    }
}
impl EvalOptions {
    pub fn from_json(json: &Json) -> Result<Self> {
        if json
            .get("streamAdapter")
            .is_some_and(|v| !v.is_null() && v != &Json::Bool(false))
        {
            return Err(Error::new("OptionsError", "Stream adapters are native host objects, not JSON options; use Runtime stream methods"));
        }
        let mut result = Self::default();
        // An explicitly supplied options object does not inherit JS's default resolveString.
        if json.is_object() {
            result.resolve_string = json
                .get("resolveString")
                .and_then(Json::as_bool)
                .unwrap_or(false);
        }
        result.disallow_lib_functions_getting = json
            .get("disallowLibFunctionsGetting")
            .and_then(Json::as_bool)
            .unwrap_or(false);
        for (key, destination) in [
            ("maxLoopIterations", &mut result.max_loop_iterations),
            ("maxSteps", &mut result.max_steps),
            ("maxDepth", &mut result.max_depth),
        ] {
            if let Some(v) = json.get(key) {
                *destination = v
                    .as_u64()
                    .and_then(|n| usize::try_from(n).ok())
                    .ok_or_else(|| {
                        Error::new(
                            "OptionsError",
                            format!("{key} must be a nonnegative integer"),
                        )
                    })?;
            }
        }
        result.max_depth = result.max_depth.min(256);
        Ok(result)
    }
}

struct Slot<T> {
    generation: usize,
    value: Option<T>,
}
struct ArenaStorage<T> {
    slots: Vec<Slot<T>>,
    free: Vec<usize>,
}
struct Arena<T>(Rc<RefCell<ArenaStorage<T>>>);
impl<T> Clone for Arena<T> {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}
const SHIFT: u32 = usize::BITS / 2;
const INDEX_MASK: usize = (1usize << SHIFT) - 1;
fn array_index(key: &str) -> Option<usize> {
    key.parse::<u32>()
        .ok()
        .filter(|n| *n != u32::MAX && n.to_string() == key)
        .map(|n| n as usize)
}
// Count JavaScript code units without materializing a UTF-16 buffer.
fn string_length(value: &Value) -> usize {
    match value {
        Value::String(s) if s.is_ascii() => s.len(),
        Value::String(s) => s.encode_utf16().count(),
        Value::Utf16(s) => s.len(),
        _ => unreachable!("string value"),
    }
}
impl<T> Default for Arena<T> {
    fn default() -> Self {
        Self(Rc::new(RefCell::new(ArenaStorage {
            slots: vec![],
            free: vec![],
        })))
    }
}
impl<T: Clone> Arena<T> {
    fn with<R>(&self, id: usize, f: impl FnOnce(&T) -> R) -> Option<R> {
        let storage = self.0.borrow();
        let value = storage.slots.get(id & INDEX_MASK)?;
        (value.generation == id >> SHIFT).then_some(())?;
        value.value.as_ref().map(f)
    }

    fn insert(&mut self, value: T) -> usize {
        let mut storage = self.0.borrow_mut();
        if let Some(index) = storage.free.pop() {
            let slot = &mut storage.slots[index];
            slot.value = Some(value);
            (slot.generation << SHIFT) | index
        } else {
            let index = storage.slots.len();
            storage.slots.push(Slot {
                generation: 0,
                value: Some(value),
            });
            index
        }
    }
    fn get(&self, id: usize) -> Option<T> {
        self.0
            .borrow()
            .slots
            .get(id & INDEX_MASK)
            .filter(|s| s.generation == id >> SHIFT)?
            .value
            .clone()
    }
    // Borrow arena contents for read-only access; cloning an environment also
    // clones every binding in the standard library.
    fn borrow(&self, id: usize) -> Option<Ref<'_, T>> {
        Ref::filter_map(self.0.borrow(), |storage| {
            storage
                .slots
                .get(id & INDEX_MASK)
                .filter(|s| s.generation == id >> SHIFT)?
                .value
                .as_ref()
        })
        .ok()
    }
    fn get_mut(&mut self, id: usize) -> Option<RefMut<'_, T>> {
        RefMut::filter_map(self.0.borrow_mut(), |storage| {
            storage
                .slots
                .get_mut(id & INDEX_MASK)
                .filter(|s| s.generation == id >> SHIFT)?
                .value
                .as_mut()
        })
        .ok()
    }
    fn sweep(&mut self, live: &HashSet<usize>) {
        let mut storage = self.0.borrow_mut();
        let mut retired = vec![];
        let mut free = vec![];
        for (index, slot) in storage.slots.iter_mut().enumerate() {
            if slot.value.is_some() && !live.contains(&((slot.generation << SHIFT) | index)) {
                retired.extend(slot.value.take());
                slot.generation += 1;
                if slot.generation <= INDEX_MASK {
                    free.push(index);
                }
            }
        }
        storage.free.extend(free);
        drop(storage);
        drop(retired);
    }
    fn live_len(&self) -> usize {
        self.0
            .borrow()
            .slots
            .iter()
            .filter(|s| s.value.is_some())
            .count()
    }
}

type PromiseFuture = futures::future::Shared<LocalBoxFuture<'static, Result<Value>>>;
// Deferred unboxing owns a runtime facade. Its promise-store link must be weak
// so a pending future cannot keep its own arena alive after Runtime is dropped.
struct PromiseArena {
    owner: Option<Arena<PromiseFuture>>,
    storage: Weak<RefCell<ArenaStorage<PromiseFuture>>>,
}
impl Default for PromiseArena {
    fn default() -> Self {
        let owner = Arena::default();
        let storage = Rc::downgrade(&owner.0);
        Self {
            owner: Some(owner),
            storage,
        }
    }
}
impl Clone for PromiseArena {
    fn clone(&self) -> Self {
        Self {
            owner: None,
            storage: self.storage.clone(),
        }
    }
}
impl PromiseArena {
    fn arena(&self) -> Option<Arena<PromiseFuture>> {
        self.owner
            .as_ref()
            .cloned()
            .or_else(|| self.storage.upgrade().map(Arena))
    }
    fn insert(&mut self, value: PromiseFuture) -> usize {
        self.arena()
            .expect("Runtime owns pending evaluation")
            .insert(value)
    }
    fn get(&self, id: usize) -> Option<PromiseFuture> {
        self.arena()?.get(id)
    }
    fn sweep(&mut self, live: &HashSet<usize>) {
        if let Some(mut arena) = self.arena() {
            arena.sweep(live);
        }
    }
    fn live_len(&self) -> usize {
        self.arena().map_or(0, |arena| arena.live_len())
    }
}

#[derive(Clone)]
struct Environment {
    values: IndexMap<String, Value>,
    parents: smallvec::SmallVec<[EnvId; 1]>,
    frames: RefCell<Option<Rc<[EnvId]>>>,
    library: bool,
    hook: Option<Lookup>,
    backing: Option<Value>,
}
#[derive(Clone)]
enum Function {
    Closure {
        params: Rc<[String]>,
        body: Rc<Ast>,
        env: EnvId,
        options: EvalOptions,
        call_result: bool,
        bind_supplied_only: bool,
    },
    Native(Native),
    Sync(Rc<dyn Fn(Vec<Value>) -> Result<Value>>),
    Special(Special),
    Bound {
        receiver: Value,
        name: String,
    },
    Skip {
        callback: Value,
        ast: Option<Ast>,
    },
    Defined {
        params: Vec<(String, Value)>,
        body: Ast,
        statics: Value,
    },
    Vararg {
        template: Vec<Ast>,
        callback: Native,
    },
    VarargHost {
        template: Vec<Ast>,
        callback: Host,
    },
    Host(DetachedHost),
}
#[derive(Default)]
struct TaskRoots {
    values: smallvec::SmallVec<[Value; 2]>,
    env: EnvId,
    envs: Vec<EnvId>,
    literals: Vec<usize>,
}

// Active synchronous frames only need roots, not a complete runtime facade.
struct RootGuard(Rc<RefCell<TaskRoots>>);
impl RootGuard {
    fn retain_task_value(&self, value: &Value) {
        if is_heap_reference(value) {
            self.0.borrow_mut().values.push(value.clone());
        }
    }
}

struct DepthGuard(Rc<Cell<usize>>);
impl Drop for DepthGuard {
    fn drop(&mut self) {
        self.0.set(self.0.get() - 1);
    }
}

/// Values belong to this runtime. Retain values across collect_garbage by passing
/// them as roots; environment bindings and registered functions are rooted automatically.
pub struct Runtime {
    arrays: Arena<Vec<Value>>,
    objects: Arena<IndexMap<String, Value>>,
    functions: Arena<Function>,
    envs: Arena<Environment>,
    global: EnvId,
    library: EnvId,
    legacy_context: bool,
    literals: Arena<Value>,
    array_properties: Rc<RefCell<HashMap<usize, IndexMap<String, Value>>>>,
    array_holes: Rc<RefCell<HashMap<usize, HashSet<usize>>>>,
    promises: PromiseArena,
    streams: Arena<streams::StreamState>,
    preserve_promises: Rc<Cell<bool>>,
    tasks: Rc<RefCell<Vec<Weak<RefCell<TaskRoots>>>>>,
    task_roots: Option<Rc<RefCell<TaskRoots>>>,
    steps: Rc<Cell<usize>>,
    budget: Rc<Cell<usize>>,
    depth: Rc<Cell<usize>>,
    cancelled: Arc<AtomicBool>,
    controls: Option<RuntimeControls>,
    control: controls::ControlSlot,
    last_control: Option<Rc<controls::EvaluationControl>>,
    pub output: Vec<String>,
    output_log: Rc<RefCell<Vec<String>>>,
}
impl Default for Runtime {
    fn default() -> Self {
        Self::new()
    }
}

impl Runtime {
    // Each suspended branch owns a facade. Arena borrows end inside synchronous
    // methods, so futures never share a mutable Runtime reference or a RefMut.
    fn roots(&self, ast: &Ast, env: EnvId) -> RootGuard {
        let mut values = vec![];
        let mut literals = HashSet::new();
        self.mark_ast_literals(ast, &mut literals, &mut values);
        let roots = Rc::new(RefCell::new(TaskRoots {
            values: values.into(),
            env,
            envs: Vec::new(),
            literals: literals.into_iter().collect(),
        }));
        self.tasks.borrow_mut().push(Rc::downgrade(&roots));
        RootGuard(roots)
    }
    fn call_roots(&self, function: &Value, args: &[Value], env: EnvId) -> RootGuard {
        let roots = self.roots(&Ast::Null, env);
        roots.retain_task_value(function);
        for value in args {
            roots.retain_task_value(value);
        }
        roots
    }
    fn task(&self, ast: &Ast, env: EnvId) -> Self {
        let roots = self.roots(ast, env).0;
        Self {
            arrays: self.arrays.clone(),
            objects: self.objects.clone(),
            functions: self.functions.clone(),
            envs: self.envs.clone(),
            global: self.global,
            library: self.library,
            legacy_context: self.legacy_context,
            literals: self.literals.clone(),
            array_properties: self.array_properties.clone(),
            array_holes: self.array_holes.clone(),
            promises: self.promises.clone(),
            streams: self.streams.clone(),
            preserve_promises: self.preserve_promises.clone(),
            tasks: self.tasks.clone(),
            task_roots: Some(roots),
            steps: self.steps.clone(),
            budget: self.budget.clone(),
            depth: Rc::new(Cell::new(self.depth.get())),
            cancelled: self.cancelled.clone(),
            controls: self.controls.clone(),
            control: Rc::new(RefCell::new(self.control.borrow().clone())),
            last_control: self.last_control.clone(),
            output: vec![],
            output_log: self.output_log.clone(),
        }
    }
    fn retain_task_value(&self, value: &Value) {
        if let Some(roots) = &self.task_roots {
            roots.borrow_mut().values.push(value.clone());
        }
    }
    pub fn new() -> Self {
        let mut rt = Self {
            arrays: Arena::default(),
            objects: Arena::default(),
            functions: Arena::default(),
            envs: Arena::default(),
            global: 0,
            library: 0,
            legacy_context: false,
            literals: Arena::default(),
            promises: PromiseArena::default(),
            streams: Arena::default(),
            preserve_promises: Rc::new(Cell::new(false)),
            tasks: Rc::default(),
            task_roots: None,
            array_properties: Rc::default(),
            array_holes: Rc::default(),
            steps: Rc::new(Cell::new(0)),
            budget: Rc::new(Cell::new(1_000_000)),
            depth: Rc::new(Cell::new(0)),
            cancelled: Arc::new(AtomicBool::new(false)),
            controls: None,
            control: Rc::default(),
            last_control: None,
            output: vec![],
            output_log: Rc::default(),
        };
        let mut library = IndexMap::new();
        for names in [
            crate::builtins::names(),
            crate::collections::names(),
            crate::datetime::names(),
        ] {
            for name in names {
                library.insert((*name).into(), Value::Builtin((*name).into()));
            }
        }
        for name in [
            "()",
            "identity",
            "ensureThat",
            "apply",
            "eval",
            "print",
            "println",
            "prn",
            "_get_obj_meth_",
            "~>",
            "invoke",
            "_call_obj_meth_",
            "Array",
            "Object",
            "Date",
            "$$CONTEXT_NAME$$",
        ] {
            library.insert(name.into(), Value::Builtin(name.into()));
        }
        for name in crate::specials::names() {
            library.insert((*name).into(), Value::Special((*name).into()));
        }
        for (name, value) in [
            ("true", Value::Bool(true)),
            ("false", Value::Bool(false)),
            ("#t", Value::Bool(true)),
            ("#f", Value::Bool(false)),
            ("null", Value::Null),
            ("NIL", Value::Null),
            ("undefined", Value::Undefined),
            ("NaN", Value::Number(f64::NAN)),
            ("Infinity", Value::Number(f64::INFINITY)),
        ] {
            library.insert(name.into(), value);
        }
        rt.library = rt.envs.insert(Environment {
            values: library,
            parents: smallvec::SmallVec::new(),
            frames: RefCell::default(),
            library: true,
            hook: None,
            backing: None,
        });
        rt.global = rt.new_env(IndexMap::new(), vec![rt.library]);
        rt
    }
    pub fn global_env(&self) -> EnvId {
        self.global
    }
    /// Opt into the bounded 1.6.7 context profile before starting evaluation.
    /// Undefined bindings fall through; bare nonliteral functions evaluate to
    /// their identifier. Variable special forms use `assign_async` semantics.
    /// Legacy `fn` closures return callable body results without invoking them.
    /// Library writes are rejected, not enabled by this profile.
    pub fn set_legacy_context(&mut self, enabled: bool) {
        self.legacy_context = enabled;
    }
    pub(crate) fn legacy_context_enabled(&self) -> bool {
        self.legacy_context
    }
    pub fn push_context(&mut self, values: IndexMap<String, Value>) -> EnvId {
        self.global = self.new_env(values, vec![self.global]);
        self.global
    }
    pub fn mark_library(&mut self, env: EnvId) -> Result<()> {
        self.envs
            .get_mut(env)
            .ok_or_else(|| Error::new("InvalidHandle", "Invalid context"))?
            .library = true;
        Ok(())
    }
    pub fn library_env(&self) -> EnvId {
        self.library
    }
    pub fn cancellation_token(&self) -> Arc<AtomicBool> {
        self.cancelled.clone()
    }
    pub fn tick(&self) -> Result<()> {
        if self.controls_active() {
            return self.control_checkpoint();
        }
        if self.cancelled.load(Ordering::Relaxed) {
            return Err(Error::new("Cancelled", "Evaluation cancelled"));
        }
        if self.steps.get() >= self.budget.get() {
            return Err(Error::new("LimitError", "Evaluation step limit exceeded"));
        }
        self.steps.set(self.steps.get() + 1);
        Ok(())
    }
    pub fn new_env(&mut self, values: IndexMap<String, Value>, parents: Vec<EnvId>) -> EnvId {
        self.insert_env(values, parents.into())
    }
    pub(crate) fn new_child_env(
        &mut self,
        values: IndexMap<String, Value>,
        parent: EnvId,
    ) -> EnvId {
        self.insert_env(values, smallvec::smallvec![parent])
    }
    fn insert_env(
        &mut self,
        values: IndexMap<String, Value>,
        parents: smallvec::SmallVec<[EnvId; 1]>,
    ) -> EnvId {
        let id = self.envs.insert(Environment {
            values,
            parents,
            frames: RefCell::default(),
            library: false,
            hook: None,
            backing: None,
        });
        if let Some(roots) = &self.task_roots {
            roots.borrow_mut().envs.push(id);
        }
        id
    }
    pub fn env_from_value(&mut self, value: Value, parents: Vec<EnvId>) -> Result<EnvId> {
        if !matches!(value, Value::Object(_) | Value::Function(_)) {
            return Err(Error::new(
                "TypeError",
                "Binding context must be an object or function",
            ));
        }
        let id = self.envs.insert(Environment {
            values: IndexMap::new(),
            parents: parents.into(),
            frames: RefCell::default(),
            library: false,
            hook: None,
            backing: Some(value),
        });
        if let Some(roots) = &self.task_roots {
            roots.borrow_mut().envs.push(id);
        }
        Ok(id)
    }
    pub fn defined_special(
        &mut self,
        params: Vec<(String, Value)>,
        body: Ast,
        statics: Value,
    ) -> Value {
        let value = Value::Function(self.functions.insert(Function::Defined {
            params,
            body,
            statics,
        }));
        self.retain_task_value(&value);
        value
    }
    pub fn set_global(&mut self, name: impl Into<String>, value: Value) {
        self.envs
            .get_mut(self.global)
            .unwrap()
            .values
            .insert(name.into(), value);
    }
    pub fn set_context(&mut self, context: &Json) -> Result<()> {
        if context.is_null() {
            return Ok(());
        }
        if let Some(contexts) = context.as_array() {
            for ctx in contexts.iter().rev() {
                self.set_context(ctx)?;
            }
            return Ok(());
        }
        if !context.is_object() {
            return Err(Error::new("TypeError", "Context must be an object"));
        }
        let value = self.from_json(context);
        for (key, value) in self.object_values(&value)? {
            self.set_global(key, value);
        }
        Ok(())
    }
    pub fn set_lookup_hook<F>(&mut self, env: EnvId, hook: F) -> Result<()>
    where
        F: Fn(&str, &EvalOptions) -> Result<Option<Value>> + 'static,
    {
        self.envs
            .get_mut(env)
            .ok_or_else(|| Error::new("InvalidHandle", "Invalid environment"))?
            .hook = Some(Rc::new(hook));
        Ok(())
    }
    pub fn register<F>(&mut self, name: &str, callback: F)
    where
        F: Fn(Vec<Value>) -> Result<Value> + 'static,
    {
        let id = self.functions.insert(Function::Sync(Rc::new(callback)));
        self.set_global(name, Value::Function(id));
    }
    pub fn register_async<F>(&mut self, name: &str, callback: F)
    where
        F: Fn(Vec<Value>) -> LocalBoxFuture<'static, Result<Value>> + 'static,
    {
        let id = self.functions.insert(Function::Native(Rc::new(callback)));
        self.set_global(name, Value::Function(id));
    }
    pub fn promise<F>(&mut self, future: F) -> Value
    where
        F: std::future::Future<Output = Result<Value>> + 'static,
    {
        let value = Value::Promise(self.promises.insert(future.boxed_local().shared()));
        self.retain_task_value(&value);
        value
    }
    pub fn resolve_value(&mut self, mut value: Value) -> LocalBoxFuture<'_, Result<Value>> {
        Box::pin(async move {
            while let Value::Promise(id) = value {
                self.tick()?;
                let future = self
                    .promises
                    .get(id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired promise"))?;
                value = future.await.map_err(|mut e| {
                    e.is_async = true;
                    e
                })?;
            }
            Ok(value)
        })
    }
    pub fn register_special<F>(&mut self, name: &str, callback: F)
    where
        F: for<'a> Fn(
                &'a mut Runtime,
                Vec<Ast>,
                EnvId,
                EvalOptions,
            ) -> LocalBoxFuture<'a, Result<Value>>
            + 'static,
    {
        let id = self.functions.insert(Function::Special(Rc::new(callback)));
        self.set_global(
            name.strip_prefix("sf:").unwrap_or(name),
            Value::Function(id),
        );
    }
    /// Callback arguments are template parameters followed by rest-array and kwargs-object.
    pub fn register_vararg<F>(&mut self, name: &str, template: Vec<Ast>, callback: F) -> Result<()>
    where
        F: Fn(Vec<Value>) -> LocalBoxFuture<'static, Result<Value>> + 'static,
    {
        Self::validate_vararg_template(&template)?;
        let id = self.functions.insert(Function::Vararg {
            template,
            callback: Rc::new(callback),
        });
        self.set_global(name, Value::Function(id));
        Ok(())
    }
    pub fn register_vararg_host<F>(
        &mut self,
        name: &str,
        template: Vec<Ast>,
        callback: F,
    ) -> Result<()>
    where
        F: for<'a> Fn(&'a mut Runtime, Vec<Value>) -> LocalBoxFuture<'a, Result<Value>> + 'static,
    {
        Self::validate_vararg_template(&template)?;
        let id = self.functions.insert(Function::VarargHost {
            template,
            callback: Rc::new(callback),
        });
        self.set_global(name, Value::Function(id));
        Ok(())
    }
    fn validate_vararg_template(template: &[Ast]) -> Result<()> {
        let mut types = false;
        for entry in template {
            if types {
                return Err(Error::new(
                    "Error",
                    "LPE vararg template definition error: must be no arguments after type declaration",
                ));
            }
            if !entry.is_string() && !entry.is_object() && !entry.is_array() {
                let ty = match entry {
                    Json::Null => "object",
                    Json::Bool(_) => "boolean",
                    Json::Number(_) => "number",
                    _ => unreachable!(),
                };
                return Err(Error::new(
                    "Error",
                    format!("LPE vararg template definition error: type {ty} is not supported"),
                ));
            }
            types = entry.is_object() || entry.is_array();
        }
        Ok(())
    }
    pub fn register_host<F>(&mut self, name: &str, callback: F)
    where
        F: Fn(&mut Runtime, Vec<Value>) -> LocalBoxFuture<'static, Result<Value>> + 'static,
    {
        let id = self.functions.insert(Function::Host(Rc::new(callback)));
        self.set_global(name, Value::Function(id));
    }
    pub fn closure(
        &mut self,
        params: Vec<String>,
        body: Ast,
        env: EnvId,
        options: EvalOptions,
    ) -> Value {
        self.closure_with_params(params.into(), body, env, options, true, false)
    }
    pub(crate) fn closure_with_params(
        &mut self,
        params: Rc<[String]>,
        body: Ast,
        env: EnvId,
        options: EvalOptions,
        call_result: bool,
        bind_supplied_only: bool,
    ) -> Value {
        let value = Value::Function(self.functions.insert(Function::Closure {
            params,
            body: Rc::new(body),
            env,
            options,
            call_result,
            bind_supplied_only,
        }));
        self.retain_task_value(&value);
        value
    }
    pub fn skip_form(&mut self, callback: Value, ast: Option<Ast>) -> Value {
        Value::Function(self.functions.insert(Function::Skip { callback, ast }))
    }
    // Parents never change. Cache only their order, never values or resolutions;
    // shadowing, hooks, and live object contexts are still looked up each time.
    fn env_frames(&self, env: EnvId) -> Rc<[EnvId]> {
        if let Some(frames) = self
            .envs
            .borrow(env)
            .and_then(|e| e.frames.borrow().clone())
        {
            return frames;
        }
        // Most lexical scopes add one frame to an already resolved parent.
        // Reuse that order without rebuilding a set for the whole chain.
        let inherited = self.envs.borrow(env).and_then(|e| {
            if let [parent] = e.parents.as_slice() {
                self.envs.borrow(*parent)?.frames.borrow().clone()
            } else {
                None
            }
        });
        if let Some(parent) = inherited.filter(|frames| !frames.contains(&env)) {
            let frames: Rc<[EnvId]> = std::iter::once(env).chain(parent.iter().copied()).collect();
            *self.envs.borrow(env).unwrap().frames.borrow_mut() = Some(frames.clone());
            return frames;
        }
        let mut frames = Vec::new();
        let mut seen = HashSet::new();
        self.flatten_env(env, &mut frames, &mut seen);
        let complete = frames.len() == seen.len();
        let frames: Rc<[EnvId]> = frames.into();
        if complete {
            if let Some(e) = self.envs.borrow(env) {
                *e.frames.borrow_mut() = Some(frames.clone());
            }
        }
        frames
    }
    fn flatten_env(&self, id: EnvId, out: &mut Vec<EnvId>, seen: &mut HashSet<EnvId>) {
        if !seen.insert(id) {
            return;
        }
        if let Some(env) = self.envs.borrow(id) {
            out.push(id);
            for parent in &env.parents {
                self.flatten_env(*parent, out, seen);
            }
        }
    }
    fn find(
        &mut self,
        env: EnvId,
        name: &str,
        options: &EvalOptions,
        callable: bool,
        start: usize,
    ) -> Result<(Value, usize)> {
        let frames = self.env_frames(env);
        for (position, frame) in frames.iter().enumerate().skip(start) {
            let e = self.envs.borrow(*frame).unwrap();
            if let Some(backing @ Value::Object(_)) = &e.backing {
                if self.has_own(backing, name) {
                    let value = self.get(backing, name);
                    if !self.legacy_context || !matches!(value, Value::Undefined) {
                        return Ok((value, position + 1));
                    }
                }
            }
            if let Some(value) = e.values.get(name) {
                if !self.legacy_context
                    && !callable
                    && e.library
                    && options.disallow_lib_functions_getting
                    && value.is_callable()
                {
                    continue;
                }
                if !self.legacy_context || !matches!(value, Value::Undefined) {
                    return Ok((value.clone(), position + 1));
                }
            }
            if let Some(value) = e.values.get(&format!("sf:{name}")) {
                if value.is_callable() {
                    return Ok((value.clone(), position + 1));
                }
            }
            let library = e.library;
            let hook = e.hook.clone();
            drop(e);
            if let Some(hook) = hook {
                if let Some(value) = hook(name, options)? {
                    return Ok((value, position + 1));
                }
            }
            if library && name == "Hashmap" {
                return Ok((self.object(IndexMap::new()), position + 1));
            }
        }
        Ok((
            if options.resolve_string {
                Value::String(name.into())
            } else {
                Value::Undefined
            },
            frames.len(),
        ))
    }
    pub fn lookup(
        &mut self,
        env: EnvId,
        name: &str,
        options: &EvalOptions,
        want_callable: bool,
    ) -> Result<Value> {
        self.find(env, name, options, want_callable, 0).map(|v| v.0)
    }
    async fn find_async<'a>(
        &'a mut self,
        env: EnvId,
        name: &'a str,
        options: &'a EvalOptions,
        callable: bool,
        start: usize,
    ) -> Result<(Value, usize)> {
        let frames = self.env_frames(env);
        for (position, id) in frames.iter().enumerate().skip(start) {
            let (backing, library, value, hook) = {
                let e = self.envs.borrow(*id).unwrap();
                (
                    e.backing.clone(),
                    e.library,
                    e.values.get(name).cloned(),
                    e.hook.clone(),
                )
            };
            if let Some(backing) = &backing {
                if backing.is_callable() {
                    let options_value = self.from_json(&json!({"resolveString":options.resolve_string,"wantCallable":callable,"disallowLibFunctionsGetting":options.disallow_lib_functions_getting}));
                    let value = self
                        .call_with_options(
                            backing.clone(),
                            vec![Value::String(name.into()), Value::Undefined, options_value],
                            env,
                            options,
                        )
                        .await?;
                    if !matches!(value, Value::Undefined) {
                        return Ok((value, position + 1));
                    }
                } else if self.has_own(backing, name) {
                    let value = self.get(backing, name);
                    if !self.legacy_context || !matches!(value, Value::Undefined) {
                        return Ok((value, position + 1));
                    }
                }
            }
            if let Some(value) = value {
                if !self.legacy_context
                    && !callable
                    && library
                    && options.disallow_lib_functions_getting
                    && value.is_callable()
                {
                    continue;
                }
                if !self.legacy_context || !matches!(value, Value::Undefined) {
                    return Ok((value, position + 1));
                }
            }
            if let Some(hook) = hook {
                if let Some(v) = hook(name, options)? {
                    return Ok((v, position + 1));
                }
            }
            if library && name == "Hashmap" {
                return Ok((self.object(IndexMap::new()), position + 1));
            }
        }
        Ok((
            if options.resolve_string {
                Value::String(name.into())
            } else {
                Value::Undefined
            },
            frames.len(),
        ))
    }
    pub fn lookup_async<'a>(
        &'a mut self,
        env: EnvId,
        name: &'a str,
        options: &'a EvalOptions,
        callable: bool,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            self.find_async(env, name, options, callable, 0)
                .await
                .map(|v| v.0)
        })
    }
    pub fn assign(&mut self, env: EnvId, name: &str, value: Value) -> Result<Value> {
        let frames = self.env_frames(env);
        let mut first = None;
        for id in frames.iter().copied() {
            if let Some(backing @ Value::Object(_)) =
                self.envs.borrow(id).and_then(|e| e.backing.clone())
            {
                first.get_or_insert(id);
                if self.has_own(&backing, name) {
                    return self.set(&backing, name, value);
                }
            }
            let mut e = self.envs.get_mut(id).unwrap();
            if e.library {
                continue;
            }
            first.get_or_insert(id);
            if e.values.contains_key(name) {
                e.values.insert(name.into(), value.clone());
                return Ok(value);
            }
        }
        let id = first.ok_or_else(|| Error::new("ScopeError", "No writable context"))?;
        if let Some(backing @ Value::Object(_)) =
            self.envs.borrow(id).and_then(|e| e.backing.clone())
        {
            return self.set(&backing, name, value);
        }
        self.envs
            .get_mut(id)
            .unwrap()
            .values
            .insert(name.into(), value.clone());
        Ok(value)
    }
    /// Assign an already evaluated RHS without resetting execution budgets.
    /// The default profile follows JS 1.7.3 function-context lookup on writes.
    /// In the legacy profile undefined is a read sentinel, missing
    /// names are created in the head frame and return undefined, and existing
    /// function contexts receive a setter call whose result is returned.
    pub fn assign_async<'a>(
        &'a mut self,
        env: EnvId,
        name: &'a str,
        value: Value,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            let roots = self.task(&Ast::Null, env);
            roots.retain_task_value(&value);
            if !self.legacy_context {
                return self.current_assign_in(env, name, value, options).await;
            }
            if matches!(value, Value::Undefined) {
                return Ok(self
                    .legacy_assignment_lookup(env, name, options)
                    .await?
                    .unwrap_or(Value::Undefined));
            }
            self.legacy_assign_in(env, name, value, options, 0).await
        })
    }

    async fn current_assign_in(
        &mut self,
        env: EnvId,
        name: &str,
        value: Value,
        options: &EvalOptions,
    ) -> Result<Value> {
        let frames = self.env_frames(env);
        let mut first = None;
        for id in frames.iter().copied() {
            self.tick()?;
            let (backing, library) = {
                let frame = self.envs.borrow(id).unwrap();
                (frame.backing.clone(), frame.library)
            };
            if let Some(function) = backing.as_ref().filter(|value| value.is_callable()) {
                // JS 1.7.3 varSetter passes undefined even for writes. Only an
                // undefined result falls through; false and null claim the name.
                let rs = self.from_json(&json!({
                    "resolveString": options.resolve_string,
                    "disallowLibFunctionsGetting": options.disallow_lib_functions_getting
                }));
                let found = self
                    .call_with_options(
                        function.clone(),
                        vec![Value::String(name.into()), Value::Undefined, rs],
                        env,
                        options,
                    )
                    .await?;
                if !matches!(found, Value::Undefined) {
                    return Ok(found);
                }
                continue;
            }
            if library {
                continue;
            }
            first.get_or_insert(id);
            if let Some(object @ Value::Object(_)) = backing {
                if self.has_own(&object, name) {
                    return self.set(&object, name, value);
                }
            }
            let mut frame = self.envs.get_mut(id).unwrap();
            if frame.values.contains_key(name) {
                frame.values.insert(name.into(), value.clone());
                return Ok(value);
            }
        }
        let id = first.ok_or_else(|| Error::new("ScopeError", "No writable context"))?;
        if let Some(object @ Value::Object(_)) =
            self.envs.borrow(id).and_then(|frame| frame.backing.clone())
        {
            return self.set(&object, name, value);
        }
        self.envs
            .get_mut(id)
            .unwrap()
            .values
            .insert(name.into(), value.clone());
        Ok(value)
    }

    // Unlike ordinary expression lookup, 1.6.7 def/assign call $var$ without
    // options. Callback data is {}, while native limits still apply to calls.
    async fn legacy_frame_value(
        &mut self,
        env: EnvId,
        name: &str,
        options: &EvalOptions,
    ) -> Result<Option<Value>> {
        self.tick()?;
        let frame = self
            .envs
            .get(env)
            .ok_or_else(|| Error::new("InvalidHandle", "Invalid context"))?;
        if let Some(backing) = frame.backing {
            let value = if backing.is_callable() {
                let empty_options = self.object(IndexMap::new());
                self.call_with_options(
                    backing,
                    vec![Value::String(name.into()), Value::Undefined, empty_options],
                    env,
                    options,
                )
                .await?
            } else {
                self.get(&backing, name)
            };
            if !matches!(value, Value::Undefined) {
                return Ok(Some(value));
            }
        }
        if let Some(value) = frame.values.get(name) {
            if !matches!(value, Value::Undefined) {
                return Ok(Some(value.clone()));
            }
        }
        if let Some(hook) = frame.hook {
            let lookup_options = EvalOptions {
                resolve_string: false,
                disallow_lib_functions_getting: false,
                ..options.clone()
            };
            // Some(Undefined) remains an authoritative missing-name mask;
            // None falls through, just like an undefined own property.
            if let Some(value) = hook(name, &lookup_options)? {
                return Ok(Some(value));
            }
        }
        if frame.library && name == "Hashmap" {
            return Ok(Some(self.object(IndexMap::new())));
        }
        Ok(None)
    }

    async fn legacy_assignment_lookup(
        &mut self,
        env: EnvId,
        name: &str,
        options: &EvalOptions,
    ) -> Result<Option<Value>> {
        let mut frames = vec![];
        self.flatten_env(env, &mut frames, &mut HashSet::new());
        for frame in frames {
            if let Some(value) = self.legacy_frame_value(frame, name, options).await? {
                return Ok(Some(value));
            }
        }
        Ok(None)
    }

    fn legacy_assign_in<'a>(
        &'a mut self,
        env: EnvId,
        name: &'a str,
        value: Value,
        options: &'a EvalOptions,
        depth: usize,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            if depth >= options.max_depth {
                return Err(Error::new(
                    "LimitError",
                    "Assignment context depth exceeded",
                ));
            }
            let own = self.legacy_frame_value(env, name, options).await?;
            if own.as_ref().is_some_and(|v| !matches!(v, Value::Undefined)) {
                return self.legacy_write_frame(env, name, value, options).await;
            }
            if own.is_none() {
                let parents = self
                    .envs
                    .get(env)
                    .ok_or_else(|| Error::new("InvalidHandle", "Invalid context"))?
                    .parents;
                for parent in parents {
                    match self.legacy_assignment_lookup(parent, name, options).await? {
                        Some(Value::Undefined) => break,
                        Some(_) => {
                            // JS re-enters a matched nested context for writes.
                            // Re-probe only across that boundary, never twice
                            // for a direct function-context getter/setter pair.
                            return self
                                .legacy_assign_in(parent, name, value, options, depth + 1)
                                .await;
                        }
                        None => {}
                    }
                }
            }
            self.legacy_write_frame(env, name, value, options).await?;
            Ok(Value::Undefined)
        })
    }

    async fn legacy_write_frame(
        &mut self,
        env: EnvId,
        name: &str,
        value: Value,
        options: &EvalOptions,
    ) -> Result<Value> {
        let frame = self
            .envs
            .get(env)
            .ok_or_else(|| Error::new("InvalidHandle", "Invalid context"))?;
        if frame.library {
            return Err(Error::new(
                "Unsupported",
                format!("Legacy assignment cannot mutate library binding {name}"),
            ));
        }
        match frame.backing {
            Some(function) if function.is_callable() => {
                let empty_options = self.object(IndexMap::new());
                self.call_with_options(
                    function,
                    vec![Value::String(name.into()), value, empty_options],
                    env,
                    options,
                )
                .await
            }
            Some(object @ Value::Object(_)) => self.set(&object, name, value),
            _ => {
                self.envs
                    .get_mut(env)
                    .unwrap()
                    .values
                    .insert(name.into(), value.clone());
                Ok(value)
            }
        }
    }
    pub fn undefine(&mut self, env: EnvId, name: &str) -> Value {
        let frames = self.env_frames(env);
        for id in frames.iter().copied() {
            if let Some(backing @ Value::Object(_)) =
                self.envs.borrow(id).and_then(|e| e.backing.clone())
            {
                if self.has_own(&backing, name) {
                    let v = self.get(&backing, name);
                    let _ = self.delete(&backing, name);
                    return v;
                }
            }
            let mut e = self.envs.get_mut(id).unwrap();
            if !e.library {
                if let Some(v) = e.values.shift_remove(name) {
                    return v;
                }
            }
        }
        Value::Undefined
    }
    pub fn array(&mut self, values: Vec<Value>) -> Value {
        let value = Value::Array(self.arrays.insert(values));
        self.retain_task_value(&value);
        value
    }
    pub fn object(&mut self, values: IndexMap<String, Value>) -> Value {
        let value = Value::Object(self.objects.insert(values));
        self.retain_task_value(&value);
        value
    }
    pub fn array_values(&self, value: &Value) -> Result<Vec<Value>> {
        match value {
            Value::Array(id) => self
                .arrays
                .with(*id, |values| {
                    if self.controls_active() {
                        for value in values {
                            self.charge_value(value)?;
                        }
                    }
                    Ok(values.clone())
                })
                .ok_or_else(|| Error::new("InvalidHandle", "Expired array"))?,
            _ => Err(Error::new("TypeError", "Expected array")),
        }
    }
    pub(crate) fn borrow_array(&self, value: &Value) -> Result<Ref<'_, [Value]>> {
        match value {
            Value::Array(id) => self
                .arrays
                .borrow(*id)
                .map(|values| Ref::map(values, Vec::as_slice))
                .ok_or_else(|| Error::new("InvalidHandle", "Expired array")),
            _ => Err(Error::new("TypeError", "Expected array")),
        }
    }
    pub(crate) fn dense_array_values(&self, value: &Value) -> Option<Vec<Value>> {
        let Value::Array(id) = value else { return None };
        if self
            .array_holes
            .borrow()
            .get(id)
            .is_some_and(|holes| !holes.is_empty())
            || self
                .array_properties
                .borrow()
                .get(id)
                .is_some_and(|props| !props.is_empty())
        {
            return None;
        }
        self.arrays.get(*id)
    }
    pub fn object_values(&self, value: &Value) -> Result<IndexMap<String, Value>> {
        match value {
            Value::Object(id) => self
                .objects
                .with(*id, |values| {
                    if self.controls_active() {
                        for (key, value) in values {
                            self.charge_intermediate(key.len())?;
                            self.charge_value(value)?;
                        }
                    }
                    Ok(values.clone())
                })
                .ok_or_else(|| Error::new("InvalidHandle", "Expired object"))?,
            _ => Err(Error::new("TypeError", "Expected object")),
        }
    }
    pub fn get(&self, value: &Value, key: &str) -> Value {
        match value {
            Value::Object(id) => self
                .objects
                .borrow(*id)
                .and_then(|a| a.get(key).cloned())
                .unwrap_or(Value::Undefined),
            Value::Array(id) => self
                .arrays
                .borrow(*id)
                .map(|a| {
                    if key == "length" {
                        Value::Number(a.len() as f64)
                    } else if let Some(n) = array_index(key) {
                        a.get(n).cloned().unwrap_or(Value::Undefined)
                    } else {
                        self.array_properties
                            .borrow()
                            .get(id)
                            .and_then(|p| p.get(key))
                            .cloned()
                            .unwrap_or(Value::Undefined)
                    }
                })
                .unwrap_or(Value::Undefined),
            Value::String(_) | Value::Utf16(_) => {
                if key == "length" {
                    Value::Number(string_length(value) as f64)
                } else {
                    array_index(key)
                        .and_then(|i| match value {
                            Value::String(s) => s.encode_utf16().nth(i),
                            Value::Utf16(s) => s.get(i).copied(),
                            _ => unreachable!(),
                        })
                        .map(|u| self.string_from_utf16(vec![u]))
                        .unwrap_or(Value::Undefined)
                }
            }
            Value::Builtin(name) | Value::Special(name) if key == "lpeName" || key == "name" => {
                Value::String(self.canonical_name(name).into())
            }
            _ => Value::Undefined,
        }
    }
    pub fn has_own(&self, value: &Value, key: &str) -> bool {
        match value {
            Value::Object(id) => self
                .objects
                .borrow(*id)
                .is_some_and(|v| v.contains_key(key)),
            Value::Array(id) => {
                if key == "length" {
                    true
                } else if let Some(n) = array_index(key) {
                    self.arrays.borrow(*id).is_some_and(|v| n < v.len())
                        && !self
                            .array_holes
                            .borrow()
                            .get(id)
                            .is_some_and(|h| h.contains(&n))
                } else {
                    self.array_properties
                        .borrow()
                        .get(id)
                        .is_some_and(|v| v.contains_key(key))
                }
            }
            Value::String(_) | Value::Utf16(_) => {
                key == "length" || array_index(key).is_some_and(|n| n < string_length(value))
            }
            _ => false,
        }
    }
    pub fn set(&mut self, value: &Value, key: &str, new: Value) -> Result<Value> {
        if self.controls_active() {
            self.charge_value(&new)?;
            self.charge_intermediate(key.len())?;
            if let Value::Array(id) = value {
                let len = self.arrays.with(*id, Vec::len).unwrap_or(0);
                let end = if key == "length" {
                    match new {
                        Value::Number(n) if n >= 0.0 && n.fract() == 0.0 => n as usize,
                        _ => len,
                    }
                } else {
                    array_index(key).map_or(len, |n| n.saturating_add(1))
                };
                let extra = end.saturating_sub(len);
                self.charge_items::<Value>(extra)?;
                self.charge_items::<usize>(extra)?;
            }
        }
        match value {
            Value::Object(id) => {
                self.objects
                    .get_mut(*id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired object"))?
                    .insert(key.into(), new.clone());
            }
            Value::Array(id) => {
                let max = self.budget.get();
                let mut a = self
                    .arrays
                    .get_mut(*id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired array"))?;
                if key == "length" {
                    let n = match new {
                        Value::Number(n) if n >= 0.0 && n.fract() == 0.0 && n <= max as f64 => {
                            n as usize
                        }
                        _ => return Err(Error::new("RangeError", "Invalid array length")),
                    };
                    if n > a.len() {
                        self.array_holes
                            .borrow_mut()
                            .entry(*id)
                            .or_default()
                            .extend(a.len()..n);
                    }
                    a.resize(n, Value::Undefined);
                    self.array_holes
                        .borrow_mut()
                        .entry(*id)
                        .or_default()
                        .retain(|i| *i < n);
                } else {
                    let Some(index) = array_index(key) else {
                        self.array_properties
                            .borrow_mut()
                            .entry(*id)
                            .or_default()
                            .insert(key.into(), new.clone());
                        return Ok(new);
                    };
                    if index >= max {
                        return Err(Error::new("LimitError", "Array allocation limit exceeded"));
                    }
                    if index >= a.len() {
                        self.array_holes
                            .borrow_mut()
                            .entry(*id)
                            .or_default()
                            .extend(a.len()..index);
                        a.resize(index + 1, Value::Undefined);
                    }
                    self.array_holes
                        .borrow_mut()
                        .entry(*id)
                        .or_default()
                        .remove(&index);
                    a[index] = new.clone();
                }
            }
            _ => return Err(Error::new("TypeError", "Cannot set property on this value")),
        }
        Ok(new)
    }
    pub fn replace_array(&mut self, value: &Value, values: Vec<Value>) -> Result<()> {
        if let Value::Array(id) = value {
            *self
                .arrays
                .get_mut(*id)
                .ok_or_else(|| Error::new("InvalidHandle", "Expired array"))? = values;
            self.array_holes.borrow_mut().remove(id);
            Ok(())
        } else {
            Err(Error::new("TypeError", "Expected array"))
        }
    }
    pub fn delete(&mut self, value: &Value, key: &str) -> Result<bool> {
        match value {
            Value::Object(id) => {
                self.objects
                    .get_mut(*id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired object"))?
                    .shift_remove(key);
            }
            Value::Array(id) => {
                if let Some(n) = array_index(key) {
                    if let Some(mut a) = self.arrays.get_mut(*id) {
                        if let Some(v) = a.get_mut(n) {
                            *v = Value::Undefined;
                            self.array_holes
                                .borrow_mut()
                                .entry(*id)
                                .or_default()
                                .insert(n);
                        }
                    }
                } else if let Some(p) = self.array_properties.borrow_mut().get_mut(id) {
                    p.shift_remove(key);
                }
            }
            _ => {}
        }
        Ok(true)
    }
    pub fn keys(&self, value: &Value) -> Vec<String> {
        match value {
            Value::Object(id) => {
                let mut keys: Vec<String> = self
                    .objects
                    .borrow(*id)
                    .map(|o| o.keys().cloned().collect())
                    .unwrap_or_default();
                keys.sort_by_key(|k| {
                    k.parse::<u32>()
                        .ok()
                        .filter(|n| *n != u32::MAX && n.to_string() == *k)
                        .map(|n| (0, n))
                        .unwrap_or((1, 0))
                });
                keys
            }
            Value::Array(id) => (0..self.arrays.borrow(*id).map(|a| a.len()).unwrap_or(0))
                .filter(|n| {
                    !self
                        .array_holes
                        .borrow()
                        .get(id)
                        .is_some_and(|h| h.contains(n))
                })
                .map(|n| n.to_string())
                .chain(
                    self.array_properties
                        .borrow()
                        .get(id)
                        .into_iter()
                        .flat_map(|p| p.keys().cloned()),
                )
                .collect(),
            Value::String(_) | Value::Utf16(_) => {
                (0..string_length(value)).map(|n| n.to_string()).collect()
            }
            _ => vec![],
        }
    }
    pub fn to_string(&self, value: &Value) -> String {
        self.string_inner(value, &mut HashSet::new())
    }
    pub fn string_from_utf16(&self, units: Vec<u16>) -> Value {
        match String::from_utf16(&units) {
            Ok(s) => Value::String(s),
            Err(_) => Value::Utf16(units),
        }
    }
    pub fn to_utf16(&self, value: &Value) -> Vec<u16> {
        self.utf16_inner(value, &mut HashSet::new())
    }
    fn utf16_inner(&self, value: &Value, seen: &mut HashSet<usize>) -> Vec<u16> {
        match value {
            Value::Utf16(s) => s.clone(),
            Value::String(s) => s.encode_utf16().collect(),
            Value::Array(id) => {
                if !seen.insert(*id) {
                    return vec![];
                }
                let mut output = vec![];
                if let Some(a) = self.arrays.get(*id) {
                    for (i, v) in a.iter().enumerate() {
                        if i > 0 {
                            output.push(44);
                        }
                        if !v.is_nullish() {
                            output.extend(self.utf16_inner(v, seen));
                        }
                    }
                }
                seen.remove(id);
                output
            }
            _ => self.to_string(value).encode_utf16().collect(),
        }
    }
    fn string_inner(&self, value: &Value, seen: &mut HashSet<usize>) -> String {
        match value {
            Value::Undefined => "undefined".into(),
            Value::Null => "null".into(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => ryu_js::Buffer::new().format(*n).to_owned(),
            Value::String(s) => s.clone(),
            Value::Utf16(s) => String::from_utf16_lossy(s),
            Value::Object(_) | Value::Stream(_) => "[object Object]".into(),
            Value::Promise(_) => "[object Promise]".into(),
            Value::Array(id) => {
                if !seen.insert(*id) {
                    return String::new();
                }
                let s = self
                    .arrays
                    .get(*id)
                    .map(|a| {
                        a.iter()
                            .map(|v| {
                                if v.is_nullish() {
                                    String::new()
                                } else {
                                    self.string_inner(v, seen)
                                }
                            })
                            .collect::<Vec<_>>()
                            .join(",")
                    })
                    .unwrap_or_default();
                seen.remove(id);
                s
            }
            Value::Date(ms) => chrono::DateTime::from_timestamp_millis(*ms)
                .map(|d| d.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
                .unwrap_or_else(|| "Invalid Date".into()),
            _ => "undefined".into(),
        }
    }
    pub fn to_number(&self, value: &Value) -> f64 {
        match value {
            Value::Number(n) => *n,
            Value::Null => 0.0,
            Value::Bool(b) => {
                if *b {
                    1.0
                } else {
                    0.0
                }
            }
            Value::Date(ms) => *ms as f64,
            Value::String(s) => {
                let s = s.trim();
                if s.is_empty() {
                    return 0.0;
                }
                for (prefix, radix) in [
                    ("0x", 16),
                    ("0X", 16),
                    ("0b", 2),
                    ("0B", 2),
                    ("0o", 8),
                    ("0O", 8),
                ] {
                    if let Some(t) = s.strip_prefix(prefix) {
                        return u64::from_str_radix(t, radix)
                            .map(|n| n as f64)
                            .unwrap_or(f64::NAN);
                    }
                }
                s.parse().unwrap_or(f64::NAN)
            }
            Value::Array(_) => self.to_number(&Value::String(self.to_string(value))),
            _ => f64::NAN,
        }
    }
    pub fn equal(&self, a: &Value, b: &Value, strict: bool) -> bool {
        if let (Value::Builtin(a) | Value::Special(a), Value::Builtin(b) | Value::Special(b)) =
            (a, b)
        {
            return self.canonical_name(a) == self.canonical_name(b);
        }
        if let (Value::String(a), Value::String(b)) = (a, b) {
            return a == b;
        }
        if matches!(a, Value::String(_) | Value::Utf16(_))
            && matches!(b, Value::String(_) | Value::Utf16(_))
        {
            return self.to_utf16(a) == self.to_utf16(b);
        }
        if a == b {
            return true;
        }
        if strict {
            return false;
        }
        if a.is_nullish() && b.is_nullish() {
            return true;
        }
        if a.is_nullish() || b.is_nullish() {
            return false;
        }
        if matches!(a, Value::Number(_) | Value::Bool(_))
            || matches!(b, Value::Number(_) | Value::Bool(_))
        {
            return self.to_number(a) == self.to_number(b);
        }
        match (a, b) {
            (Value::String(_), Value::Array(_) | Value::Object(_) | Value::Date(_))
            | (Value::Array(_) | Value::Object(_) | Value::Date(_), Value::String(_)) => {
                self.to_string(a) == self.to_string(b)
            }
            _ => false,
        }
    }
    fn canonical_name<'a>(&self, name: &'a str) -> &'a str {
        match name {
            "+" | "plus" => "add",
            "-" | "subtract" => "minus",
            "*" | "multiply" => "mul",
            "/" | "divide" => "div",
            "()" | "ensureThat" => "identity",
            "'" | "\"" => "q",
            "~>" => "_get_obj_meth_",
            "_call_obj_meth_" => "invoke",
            "." | "->" => "threadFirst",
            ".." | "->>" => "threadLast",
            "coalesce" => "nvl",
            "->any" => "toAny",
            "->bool" => "toBool",
            "->int" | "toNumber" => "toInt",
            "->str" => "toStr",
            "json_parse" | "read-string" => "jsonParse",
            "null?" => "isNull",
            "isUndefined" | "undefined?" => "isUndef",
            "true?" => "isTrue",
            "false?" => "isFalse",
            "bool?" => "isBool",
            "number?" => "isNumber",
            "numberlike?" => "isNumberLike",
            "string?" => "isString",
            "list?" => "isArray",
            "hash?" => "isHash",
            "obj?" => "isObj",
            "func?" => "isFunction",
            "jsonJoin" => "pr_str",
            "[]" => "astToString",
            ":=" => "assign",
            "letstar" | "let*" => "letseq",
            ".-" => "property",
            "=" | "==" | "equal" => "eq",
            "===" => "strictEq",
            "!=" | "neq" => "ne",
            "!==" => "strictNe",
            "<" | "less" => "lt",
            "<=" | "lte" => "le",
            ">" | "greater" => "gt",
            ">=" | "gte" => "ge",
            "!" => "not",
            "&&" => "and",
            "||" => "or",
            "logical_and" => "logicalAnd",
            "logical_or" => "logicalOr",
            "{" => "vector",
            "[" | "array" => "list",
            "\u{2374}" => "reshape",
            "->fn" | "defFn" => "toFn",
            "=>" => "lambda",
            "length" => "count",
            "empty?" => "empty",
            "pushStart" => "cons",
            "frequencies" => "counter",
            "contains?" => "containsKey",
            "nth" => "get",
            "values" => "vals",
            "today" => "now",
            name => name,
        }
    }
    pub fn from_json(&mut self, json: &Json) -> Value {
        match json {
            Json::Null => Value::Null,
            Json::Bool(b) => Value::Bool(*b),
            Json::Number(n) => Value::Number(n.as_f64().unwrap_or(f64::NAN)),
            Json::String(s) => Value::String(s.clone()),
            Json::Array(a) => {
                let values = a.iter().map(|v| self.from_json(v)).collect();
                self.array(values)
            }
            Json::Object(o) => {
                match o.get("$lpe").and_then(Json::as_str) {
                    Some("undefined") => return Value::Undefined,
                    Some("number") => {
                        return Value::Number(match o.get("value").and_then(Json::as_str) {
                            Some("Infinity") => f64::INFINITY,
                            Some("-Infinity") => f64::NEG_INFINITY,
                            Some("-0") => -0.0,
                            _ => f64::NAN,
                        })
                    }
                    Some("date") => {
                        if let Some(s) = o.get("value").and_then(Json::as_str) {
                            if let Ok(d) = chrono::DateTime::parse_from_rfc3339(s) {
                                return Value::Date(d.timestamp_millis());
                            }
                        }
                    }
                    _ => {}
                }
                let values = o
                    .iter()
                    .map(|(k, v)| (k.clone(), self.from_json(v)))
                    .collect();
                self.object(values)
            }
        }
    }
    /// Public values must be UTF-8. Utf16 is only an internal intermediate for
    /// JS code-unit operations; it is not a supported tagged wire format.
    pub fn to_json(&self, value: &Value) -> Result<Json> {
        self.json_inner(value, &mut HashSet::new(), 0)
    }
    fn json_inner(
        &self,
        value: &Value,
        seen: &mut HashSet<(u8, usize)>,
        depth: usize,
    ) -> Result<Json> {
        if depth > 256 {
            return Err(Error::new("LimitError", "Serialization depth exceeded"));
        }
        Ok(match value {
            Value::Undefined => json!({"$lpe":"undefined"}),
            Value::Null => Json::Null,
            Value::Bool(b) => json!(b),
            Value::Number(n) if n.is_nan() => json!({"$lpe":"number","value":"NaN"}),
            Value::Number(n) if !n.is_finite() => {
                json!({"$lpe":"number","value":if n.is_sign_negative(){"-Infinity"}else{"Infinity"}})
            }
            Value::Number(n) if *n == 0.0 && n.is_sign_negative() => {
                json!({"$lpe":"number","value":"-0"})
            }
            Value::Number(n) => json!(n),
            Value::String(s) => json!(s),
            Value::Utf16(_) => return Err(Error::new("UnicodeError", "Result is not valid UTF-8")),
            Value::Date(_) => json!({"$lpe":"date","value":self.to_string(value)}),
            Value::Function(_) | Value::Builtin(_) | Value::Special(_) => {
                json!({"$lpe":"function"})
            }
            Value::Promise(_) => json!({}),
            Value::Stream(_) => {
                return Err(Error::new(
                    "TypeError",
                    "Streams cannot be serialized; read the current value explicitly",
                ))
            }
            Value::Array(id) => {
                if !seen.insert((0, *id)) {
                    return Err(Error::new("TypeError", "Circular array"));
                }
                let a = self
                    .arrays
                    .get(*id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired array"))?;
                let output = a
                    .iter()
                    .map(|v| self.json_inner(v, seen, depth + 1))
                    .collect::<Result<Vec<_>>>()?;
                seen.remove(&(0, *id));
                Json::Array(output)
            }
            Value::Object(id) => {
                if !seen.insert((1, *id)) {
                    return Err(Error::new("TypeError", "Circular object"));
                }
                let a = self
                    .objects
                    .get(*id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired object"))?;
                let output = a
                    .iter()
                    .map(|(k, v)| Ok((k.clone(), self.json_inner(v, seen, depth + 1)?)))
                    .collect::<Result<serde_json::Map<_, _>>>()?;
                seen.remove(&(1, *id));
                Json::Object(output)
            }
        })
    }
    pub fn ast_literal(&mut self, value: Value) -> Ast {
        let id = self.literals.insert(value);
        if let Some(roots) = &self.task_roots {
            roots.borrow_mut().literals.push(id);
        }
        json!({"$lpeInternalLiteral":id})
    }
    pub fn eval(&mut self, source: &str) -> Result<Value> {
        self.eval_with_options(source, &EvalOptions::default())
    }
    pub fn eval_with_options(&mut self, source: &str, options: &EvalOptions) -> Result<Value> {
        let ast = self.parse_source(source)?;
        self.eval_ast(&ast, options)
    }
    pub(crate) fn parse_source(&self, source: &str) -> Result<Ast> {
        if self.legacy_context {
            crate::parser::parse_with_options(source, &json!({"legacyLineBreaks":true}))
        } else {
            crate::parse(source)
        }
    }
    pub fn eval_ast(&mut self, ast: &Ast, options: &EvalOptions) -> Result<Value> {
        if let Some(result) = self.eval_immediate(ast, options) {
            return result;
        }
        futures::executor::block_on(self.eval_async(ast, options))
    }
    pub async fn eval_async(&mut self, ast: &Ast, options: &EvalOptions) -> Result<Value> {
        let nested = self.controls_active();
        let _control_scope = self.enter_controls(options);
        if !nested {
            self.steps.set(0);
            self.budget.set(options.max_steps);
        } else {
            self.budget.set(self.budget.get().min(options.max_steps));
        }
        self.tasks
            .borrow_mut()
            .retain(|task| task.strong_count() > 0);
        let cancelled = self.cancelled.clone();
        let control = self.control.borrow().clone();
        let global = self.global;
        let result = {
            let mut evaluation = std::pin::pin!(async {
                let value = self.eval_in(ast, global, options).await?;
                // eval_in roots the AST and scope while running. Retain them here
                // only if resolving the returned promise can suspend again.
                if matches!(value, Value::Promise(_)) {
                    let _roots = self.roots(ast, global);
                    self.resolve_value(value).await
                } else {
                    Ok(value)
                }
            });
            futures::future::poll_fn(move |cx| {
                if cancelled.load(Ordering::Relaxed) {
                    let error = Error::new("Cancelled", "Evaluation cancelled");
                    std::task::Poll::Ready(Err(control
                        .as_ref()
                        .map_or(error.clone(), |c| c.fail(error))))
                } else {
                    if let Some(control) = &control {
                        if let Err(error) = control.work() {
                            return std::task::Poll::Ready(Err(error));
                        }
                    }
                    evaluation.as_mut().poll(cx)
                }
            })
            .await
        };
        self.output = self.output_log.borrow().clone();
        if let Some(control) = self.control.borrow().as_ref() {
            control.status()?;
        }
        result
    }
    pub fn eval_in<'a>(
        &'a mut self,
        ast: &'a Ast,
        env: EnvId,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            self.tick()?;
            self.control_depth(options)?;
            if self.depth.get() >= options.max_depth {
                return Err(Error::new(
                    "LimitError",
                    "Evaluation nesting limit exceeded",
                ));
            }
            self.depth.set(self.depth.get() + 1);
            let _guard = DepthGuard(self.depth.clone());
            if matches!(ast, Json::Null | Json::Bool(_) | Json::Number(_)) {
                return self.checked_from_json(ast);
            }
            // Host special forms may collect while this lexical scope is active.
            let roots = self.roots(ast, env);
            if let Some(id) = ast.get("$lpeInternalLiteral").and_then(Json::as_u64) {
                return self
                    .literals
                    .get(id as usize)
                    .ok_or_else(|| Error::new("InvalidHandle", "Invalid literal"));
            }
            match ast {
                Json::String(name) => {
                    let value = self.lookup_async(env, name, options, false).await?;
                    if self.legacy_context
                        && value.is_callable()
                        && !matches!(&value, Value::Builtin(name) if matches!(name.as_str(), "Array" | "Object" | "Date"))
                    {
                        Ok(Value::String(name.clone()))
                    } else if self.preserve_promises.get() {
                        Ok(value)
                    } else {
                        self.resolve_value(value).await
                    }
                }
                Json::Array(list) if list.is_empty() => Ok(Value::Null),
                Json::Array(list) => {
                    let mut next = 0;
                    let mut callbacks = vec![];
                    let mut expression = std::borrow::Cow::Borrowed(list.as_slice());
                    loop {
                        self.tick()?;
                        let operator = if let Some(name) = expression[0].as_str() {
                            let (v, n) = self.find_async(env, name, options, true, next).await?;
                            next = n;
                            v
                        } else {
                            self.eval_in(&expression[0], env, options).await?
                        };
                        roots.retain_task_value(&operator);
                        let result = match &operator {
                            Value::Special(name) => {
                                // Keep the large special-form future out of every
                                // ordinary expression frame.
                                crate::specials::call(self, name, &expression[1..], env, options)
                                    .boxed_local()
                                    .await?
                            }
                            Value::Function(id)
                                if matches!(
                                    self.functions.borrow(*id).as_deref(),
                                    Some(Function::Special(_))
                                ) =>
                            {
                                let Some(Function::Special(callback)) = self.functions.get(*id)
                                else {
                                    unreachable!()
                                };
                                callback(self, expression[1..].to_vec(), env, options.clone())
                                    .await?
                            }
                            Value::Function(id)
                                if matches!(
                                    self.functions.borrow(*id).as_deref(),
                                    Some(Function::Defined { .. })
                                ) =>
                            {
                                self.call_defined(*id, &expression[1..], env, options)
                                    .await?
                            }
                            Value::Function(id)
                                if matches!(
                                    self.functions.borrow(*id).as_deref(),
                                    Some(Function::Vararg { .. } | Function::VarargHost { .. })
                                ) =>
                            {
                                self.call_vararg(*id, &expression[1..], env, options)
                                    .await?
                            }
                            _ if !operator.is_callable() => {
                                let label = if operator.is_nullish() {
                                    let original = self.from_json(&expression[0]);
                                    self.to_string(&original)
                                } else {
                                    self.to_string(&operator)
                                };
                                return Err(Error::new(
                                    "TypeError",
                                    format!("{label} is not a function"),
                                ));
                            }
                            _ => {
                                let args =
                                    self.eval_arguments(&expression[1..], env, options).await?;
                                if args
                                    .iter()
                                    .all(|v| !matches!(v, Value::Stream(_) | Value::Promise(_)))
                                {
                                    self.call_with_options(operator, args, env, options).await?
                                } else {
                                    let context = StreamContext::new(env, options)
                                        .with_values(vec![operator.clone()]);
                                    self.unbox(
                                        args,
                                        context,
                                        Rc::new(move |rt, args, env, options| {
                                            let operator = operator.clone();
                                            async move {
                                                rt.call_with_options(operator, args, env, &options)
                                                    .await
                                            }
                                            .boxed_local()
                                        }),
                                    )
                                    .await?
                                }
                            }
                        };
                        if let Value::Function(id) = result {
                            if let Some(Function::Skip { callback, ast }) = self.functions.get(id) {
                                callbacks.push(callback);
                                if let Some(a) = ast {
                                    expression = std::borrow::Cow::Owned(match a {
                                        Json::Array(list) => list,
                                        _ => {
                                            return Err(Error::new(
                                                "TypeError",
                                                "Skip AST must be an array",
                                            ))
                                        }
                                    });
                                    if expression.is_empty() {
                                        return Err(Error::new("TypeError", "Skip AST is empty"));
                                    }
                                }
                                continue;
                            }
                        }
                        let mut result = result;
                        for callback in callbacks.into_iter().rev() {
                            result = self
                                .call_with_options(callback, vec![result], env, options)
                                .await?;
                        }
                        return Ok(result);
                    }
                }
                _ => self.checked_from_json(ast),
            }
        })
    }
    pub async fn eval_arguments(
        &mut self,
        args: &[Ast],
        env: EnvId,
        options: &EvalOptions,
    ) -> Result<Vec<Value>> {
        if !self.controls_active()
            && args
                .iter()
                .all(|ast| matches!(ast, Json::Null | Json::Bool(_) | Json::Number(_)))
        {
            let mut values = Vec::with_capacity(args.len());
            for ast in args {
                self.tick()?;
                if self.depth.get() >= options.max_depth {
                    return Err(Error::new(
                        "LimitError",
                        "Evaluation nesting limit exceeded",
                    ));
                }
                values.push(self.from_json(ast));
            }
            return Ok(values);
        }
        // Completed siblings remain roots until all arguments are delivered.
        let retained = self.roots(&Ast::Null, env);
        let roots = retained.0.clone();
        let mut futures = args
            .iter()
            .map(|ast| {
                let mut task = self.task(ast, env);
                let roots = roots.clone();
                Some(
                    async move {
                        let value = task.eval_in(ast, env, options).await?;
                        let value = if task.preserve_promises.get() {
                            value
                        } else {
                            task.resolve_value(value).await?
                        };
                        roots.borrow_mut().values.push(value.clone());
                        Ok::<Value, Error>(value)
                    }
                    .boxed_local(),
                )
            })
            .collect::<Vec<_>>();
        let mut values = vec![None; args.len()];
        let mut suspended = vec![false; args.len()];
        // JS evaluates arguments before Promise.all observes rejection. Start every
        // sibling after an async failure, but stop immediately on a synchronous throw.
        futures::future::poll_fn(move |cx| {
            let mut rejected = None;
            let mut pending = false;
            for index in 0..futures.len() {
                let Some(future) = futures[index].as_mut() else {
                    continue;
                };
                match future.as_mut().poll(cx) {
                    std::task::Poll::Pending => {
                        suspended[index] = true;
                        pending = true;
                    }
                    std::task::Poll::Ready(result) => {
                        futures[index] = None;
                        match result {
                            Ok(value) => values[index] = Some(value),
                            Err(mut error) => {
                                error.is_async |= suspended[index];
                                if !error.is_async {
                                    return std::task::Poll::Ready(Err(error));
                                }
                                if rejected.is_none() {
                                    rejected = Some(error);
                                }
                            }
                        }
                    }
                }
            }
            if let Some(error) = rejected {
                std::task::Poll::Ready(Err(error))
            } else if pending {
                std::task::Poll::Pending
            } else {
                std::task::Poll::Ready(Ok(values
                    .iter_mut()
                    .map(|v| v.take().expect("completed argument"))
                    .collect()))
            }
        })
        .await
    }
    pub fn call_value<'a>(
        &'a mut self,
        function: Value,
        args: Vec<Value>,
        env: EnvId,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            self.call_with_options(function, args, env, &EvalOptions::default())
                .await
        })
    }
    pub fn call_with_options<'a>(
        &'a mut self,
        function: Value,
        args: Vec<Value>,
        env: EnvId,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            self.tick()?;
            self.control_depth(options)?;
            if self.depth.get() >= options.max_depth {
                return Err(Error::new("LimitError", "Call nesting limit exceeded"));
            }
            self.depth.set(self.depth.get() + 1);
            let _guard = DepthGuard(self.depth.clone());
            let implementation = if let Value::Function(id) = &function {
                Some(
                    self.functions
                        .get(*id)
                        .ok_or_else(|| Error::new("InvalidHandle", "Expired function"))?,
                )
            } else {
                None
            };
            // A validated immediate closure body cannot call host code or collect.
            // Root its arguments only if evaluating that body needs the full path.
            let mut _roots = if matches!(implementation, Some(Function::Closure { .. })) {
                None
            } else {
                Some(self.call_roots(&function, &args, env))
            };
            match function {
                Value::Function(id) => match implementation.expect("validated function") {
                    Function::Native(callback) => {
                        let future = callback(args);
                        if self.preserve_promises.get() {
                            return Ok(self.promise(future));
                        }
                        let value = future.await.map_err(|mut e| {
                            e.is_async = true;
                            e
                        })?;
                        self.resolve_value(value).await
                    }
                    Function::Sync(callback) => {
                        let value = callback(args)?;
                        if self.preserve_promises.get() {
                            Ok(value)
                        } else {
                            self.resolve_value(value).await
                        }
                    }
                    Function::Host(callback) => {
                        let future = callback(self, args);
                        if self.preserve_promises.get() {
                            return Ok(self.promise(future));
                        }
                        let value = future.await.map_err(|mut e| {
                            e.is_async = true;
                            e
                        })?;
                        self.resolve_value(value).await
                    }
                    Function::Closure {
                        params,
                        body,
                        env: captured,
                        options,
                        call_result,
                        bind_supplied_only,
                    } => {
                        // Immediate call bindings fill missing slots. A legacy fn
                        // keeps its supplied-only policy even after profile changes.
                        let immediate = if bind_supplied_only {
                            None
                        } else {
                            self.eval_closure_immediate(
                                &body, captured, &options, &params, &args, id,
                            )
                        };
                        let immediate_value = match immediate {
                            Some(Ok(value)) if !call_result || !value.is_callable() => {
                                return Ok(value)
                            }
                            Some(Err(error)) if error.kind == "Return" => {
                                return Ok(error.value.unwrap_or(Value::Undefined));
                            }
                            Some(Err(error)) => return Err(error),
                            Some(Ok(value)) => Some(value),
                            None => None,
                        };
                        let mut bindings = IndexMap::new();
                        bindings.insert("$this$".into(), Value::Function(id));
                        for (index, name) in params.iter().enumerate() {
                            if bind_supplied_only && index >= args.len() {
                                break;
                            }
                            bindings.insert(
                                name.clone(),
                                args.get(index).cloned().unwrap_or(Value::Undefined),
                            );
                        }
                        let local = self.new_child_env(bindings, captured);
                        if let Some(value) = immediate_value {
                            return self.call_with_options(value, args, local, &options).await;
                        }
                        let result = if let Some(result) =
                            self.eval_scoped_immediate(&body, local, &options)
                        {
                            result
                        } else {
                            _roots = Some(self.call_roots(&Value::Function(id), &args, local));
                            self.eval_in(&body, local, &options).await
                        };
                        match result {
                            Err(e) if e.kind == "Return" => Ok(e.value.unwrap_or(Value::Undefined)),
                            Ok(v) if call_result && v.is_callable() => {
                                self.call_with_options(v, args, local, &options).await
                            }
                            result => result,
                        }
                    }
                    Function::Special(callback) => {
                        let ast = args.into_iter().map(|v| self.ast_literal(v)).collect();
                        callback(self, ast, env, options.clone()).await
                    }
                    Function::Bound { receiver, name } => {
                        self.call_method(receiver, &name, args, env, options).await
                    }
                    Function::Skip { .. } => Err(Error::new(
                        "TypeError",
                        "Skip forms are evaluator results, not callable functions",
                    )),
                    Function::Defined { .. } => {
                        let ast: Vec<_> = args.into_iter().map(|v| self.ast_literal(v)).collect();
                        self.call_defined(id, &ast, env, options).await
                    }
                    Function::Vararg { .. } | Function::VarargHost { .. } => {
                        let ast: Vec<_> = args.into_iter().map(|v| self.ast_literal(v)).collect();
                        self.call_vararg(id, &ast, env, options).await
                    }
                },
                Value::Special(name) => {
                    let ast: Vec<_> = args.into_iter().map(|v| self.ast_literal(v)).collect();
                    crate::specials::call(self, &name, &ast, env, options)
                        .boxed_local()
                        .await
                }
                Value::Builtin(name) => {
                    let first = args.first().cloned().unwrap_or(Value::Undefined);
                    match name.as_str() {
                        "$$CONTEXT_NAME$$" => return Ok(Value::String("STDLIB".into())),
                        "()" | "identity" | "ensureThat" => return Ok(first),
                        "apply" => {
                            return self
                                .call_with_options(
                                    first,
                                    args[1.min(args.len())..].to_vec(),
                                    env,
                                    options,
                                )
                                .await
                        }
                        "eval" => {
                            let ast = self.to_json(&first)?;
                            let local = self.new_env(IndexMap::new(), vec![self.library]);
                            return self.eval_in(&ast, local, &EvalOptions::default()).await;
                        }
                        "print" | "println" | "prn" => {
                            self.output_log.borrow_mut().push(
                                args.iter()
                                    .map(|a| self.to_string(a))
                                    .collect::<Vec<_>>()
                                    .join(" "),
                            );
                            return Ok(Value::Undefined);
                        }
                        "_get_obj_meth_" | "~>" => {
                            let name = self.to_string(args.get(1).unwrap_or(&Value::Undefined));
                            if first.is_nullish() {
                                return Err(Error::new("TypeError", "Nullish member receiver"));
                            }
                            let prop = self.get(&first, &name);
                            if !matches!(prop, Value::Undefined) {
                                return Ok(prop);
                            }
                            return Ok(Value::Function(self.functions.insert(Function::Bound {
                                receiver: first,
                                name,
                            })));
                        }
                        "invoke" | "_call_obj_meth_" => {
                            let method = self.to_string(args.get(1).unwrap_or(&Value::Undefined));
                            return self
                                .call_method(
                                    first,
                                    &method,
                                    args.get(2..).unwrap_or(&[]).to_vec(),
                                    env,
                                    options,
                                )
                                .await;
                        }
                        _ => {}
                    }
                    if let Some(v) = crate::builtins::call(self, &name, &args)
                        .boxed_local()
                        .await?
                    {
                        return Ok(v);
                    }
                    if let Some(v) = crate::collections::call(self, &name, &args)
                        .boxed_local()
                        .await?
                    {
                        return Ok(v);
                    }
                    if let Some(v) = crate::datetime::call(self, &name, &args).await? {
                        return Ok(v);
                    }
                    Err(Error::new(
                        "UnknownFunction",
                        format!("Unknown function {name}"),
                    ))
                }
                _ => Err(Error::new(
                    "TypeError",
                    format!("{} is not a function", self.to_string(&function)),
                )),
            }
        })
    }
    fn call_vararg<'a>(
        &'a mut self,
        id: usize,
        asts: &'a [Ast],
        env: EnvId,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            let f = self
                .functions
                .get(id)
                .ok_or_else(|| Error::new("InvalidHandle", "Invalid vararg function"))?;
            let template = match &f {
                Function::Vararg { template, .. } | Function::VarargHost { template, .. } => {
                    template.clone()
                }
                _ => return Err(Error::new("InvalidHandle", "Not vararg function")),
            };
            let mut names = vec![];
            let mut types = IndexMap::new();
            let inline_type = crate::regexp::RegExp::new(self, r"^(.*):\s*(\w+)$", "")?;
            for entry in template {
                if let Some(name) = entry.as_str() {
                    let matches = inline_type.is_match(self, name)?;
                    if let Some((name, ty)) = name.rsplit_once(':').filter(|_| matches) {
                        names.push(name.to_owned());
                        types.insert(name.trim().to_owned(), ty.trim().to_lowercase());
                    } else {
                        names.push(name.to_owned());
                    }
                } else if let Some(map) = entry.as_object() {
                    for (k, v) in map {
                        types.insert(k.clone(), v.as_str().unwrap_or("any").to_owned());
                    }
                } else if let Some(array) = entry.as_array() {
                    for (index, value) in array.iter().enumerate() {
                        types.insert(
                            index.to_string(),
                            value.as_str().unwrap_or("any").to_owned(),
                        );
                    }
                }
            }
            let mut positional = std::collections::VecDeque::new();
            let mut kwargs = IndexMap::new();
            let mut arguments = asts.to_vec();
            let mut arg_names = vec![String::new(); asts.len()];
            for (i, ast) in asts.iter().enumerate() {
                if let Some(a) = ast
                    .as_array()
                    .filter(|a| a.len() == 3 && a[0] == "=" && a[1].is_string())
                {
                    let name = a[1].as_str().unwrap();
                    kwargs.insert(name.to_owned(), i);
                    arg_names[i] = name.to_owned();
                    arguments[i] = a[2].clone();
                } else {
                    positional.push_back(i);
                }
            }
            let mut positions = vec![];
            for name in names {
                let index = kwargs
                    .shift_remove(&name)
                    .or_else(|| positional.pop_front());
                if let Some(i) = index {
                    arg_names[i] = name;
                }
                positions.push(index);
            }
            let mut values = vec![];
            for (i, ast) in arguments.iter().enumerate() {
                let name = &arg_names[i];
                let mut ty = types.get(name).cloned();
                if ty.is_none() {
                    for (p, t) in &types {
                        let regex = crate::regexp::RegExp::new(self, &format!("^{p}$"), "");
                        if let Err(error) = &regex {
                            if error.kind != "SyntaxError" {
                                return Err(error.clone());
                            }
                        }
                        if let Ok(regex) = regex {
                            if regex.is_match(self, name)? {
                                ty = Some(t.clone());
                                break;
                            }
                        }
                    }
                }
                let ty = ty.unwrap_or("any".into());
                let value = if ty == "any" {
                    self.eval_in(ast, env, options).await?
                } else {
                    self.eval_in(&json!([format!("->{ty}"), ast]), env, options)
                        .await?
                };
                values.push(value);
            }
            let context = StreamContext::new(env, options)
                .with_asts(asts)
                .with_values(vec![Value::Function(id)]);
            self.unbox(
                values,
                context,
                Rc::new(move |rt, values, _, _| {
                    let f = f.clone();
                    let positions = positions.clone();
                    let positional = positional.clone();
                    let kwargs = kwargs.clone();
                    async move {
                        let mut parameters: Vec<_> = positions
                            .into_iter()
                            .map(|index| {
                                index
                                    .and_then(|index| values.get(index).cloned())
                                    .unwrap_or(Value::Undefined)
                            })
                            .collect();
                        parameters.push(
                            rt.array(positional.into_iter().map(|i| values[i].clone()).collect()),
                        );
                        parameters.push(
                            rt.object(
                                kwargs
                                    .into_iter()
                                    .map(|(name, i)| (name, values[i].clone()))
                                    .collect(),
                            ),
                        );
                        match f {
                            Function::Vararg { callback, .. } => callback(parameters).await,
                            Function::VarargHost { callback, .. } => callback(rt, parameters).await,
                            _ => unreachable!(),
                        }
                    }
                    .boxed_local()
                }),
            )
            .await
        })
    }
    fn call_defined<'a>(
        &'a mut self,
        id: usize,
        args: &'a [Ast],
        env: EnvId,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            let Some(Function::Defined {
                params,
                body,
                statics,
            }) = self.functions.get(id)
            else {
                return Err(Error::new("InvalidHandle", "Invalid defined function"));
            };
            let mut bindings = IndexMap::new();
            bindings.insert("this".into(), statics);
            for (i, (name, default)) in params.into_iter().enumerate() {
                let value = if let Some(ast) = args.get(i).filter(|a| match a {
                    Json::Null => false,
                    Json::Bool(b) => *b,
                    Json::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
                    Json::String(s) => !s.is_empty(),
                    _ => true,
                }) {
                    self.eval_in(ast, env, options).await?
                } else {
                    default
                };
                bindings.insert(name, value);
            }
            let scope = self.new_env(bindings, vec![env]);
            match self.eval_in(&body, scope, options).await {
                Err(e) if e.kind == "Return" => Ok(e.value.unwrap_or(Value::Undefined)),
                result => result,
            }
        })
    }
    fn call_method<'a>(
        &'a mut self,
        receiver: Value,
        name: &'a str,
        args: Vec<Value>,
        env: EnvId,
        options: &'a EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        Box::pin(async move {
            let custom = self.get(&receiver, name);
            if custom.is_callable() {
                return self.call_with_options(custom, args, env, options).await;
            }
            if name == "toString" {
                return Ok(Value::String(self.to_string(&receiver)));
            }
            if let Value::Array(_) = receiver {
                if matches!(name, "push" | "pop" | "shift" | "unshift") {
                    let mut values = self.array_values(&receiver)?;
                    let result = match name {
                        "push" => {
                            values.extend(args);
                            Value::Number(values.len() as f64)
                        }
                        "unshift" => {
                            values.splice(0..0, args);
                            Value::Number(values.len() as f64)
                        }
                        "shift" => {
                            if values.is_empty() {
                                Value::Undefined
                            } else {
                                values.remove(0)
                            }
                        }
                        _ => values.pop().unwrap_or(Value::Undefined),
                    };
                    self.replace_array(&receiver, values)?;
                    return Ok(result);
                }
            }
            let mapped = match name {
                "toUpperCase" => "upper",
                "toLowerCase" => "lower",
                n => n,
            };
            if crate::collections::names().contains(&mapped)
                || crate::builtins::names().contains(&mapped)
            {
                let mut parameters = vec![receiver];
                parameters.extend(args);
                return self
                    .call_with_options(Value::Builtin(mapped.into()), parameters, env, options)
                    .await;
            }
            Err(Error::new(
                "UnsupportedFeature",
                format!("Native method {name} is not supported"),
            ))
        })
    }
    /// Collect unreachable arena objects. External values must be supplied as roots.
    pub fn collect_garbage(&mut self, roots: &[Value]) {
        let mut arrays = HashSet::new();
        let mut objects = HashSet::new();
        let mut functions = HashSet::new();
        let mut envs = HashSet::new();
        let mut literals = HashSet::new();
        let mut promises = HashSet::new();
        let mut streams = HashSet::new();
        let mut values = roots.to_vec();
        let mut environments = vec![self.global, self.library];
        self.tasks
            .borrow_mut()
            .retain(|task| task.strong_count() > 0);
        for task in self.tasks.borrow().iter().filter_map(Weak::upgrade) {
            let task = task.borrow();
            values.extend(task.values.clone());
            environments.push(task.env);
            environments.extend(&task.envs);
            for id in &task.literals {
                if literals.insert(*id) {
                    values.extend(self.literals.get(*id));
                }
            }
        }
        while !values.is_empty() || !environments.is_empty() {
            while let Some(id) = environments.pop() {
                if envs.insert(id) {
                    if let Some(env) = self.envs.borrow(id) {
                        values.extend(
                            env.values
                                .values()
                                .filter(|v| is_heap_reference(v))
                                .cloned(),
                        );
                        values.extend(env.backing.clone());
                        environments.extend(&env.parents);
                    }
                }
            }
            if let Some(value) = values.pop() {
                match value {
                    Value::Stream(id) if streams.insert(id) => {
                        if let Some(stream) = self.streams.get(id) {
                            values.push(stream.value.clone());
                            if let Some(computation) = &stream.computation {
                                values.extend(computation.args.clone());
                                values.extend(computation.current.clone());
                                values.extend(computation.context.values.clone());
                                environments.push(computation.context.env);
                                for ast in &computation.context.asts {
                                    self.mark_ast_literals(ast, &mut literals, &mut values);
                                }
                            }
                            values.extend(
                                stream.dependencies.iter().map(|s| Value::Stream(s.stream)),
                            );
                            values.extend(stream.child.iter().map(|s| Value::Stream(s.stream)));
                            for listener in stream.listeners.values() {
                                if let streams::Listener::Derived { target, .. } = listener {
                                    values.push(Value::Stream(*target));
                                }
                            }
                        }
                    }
                    Value::Array(id) if arrays.insert(id) => {
                        if let Some(a) = self.arrays.borrow(id) {
                            values.extend(a.iter().filter(|v| is_heap_reference(v)).cloned());
                        }
                        if let Some(p) = self.array_properties.borrow().get(&id) {
                            values.extend(p.values().cloned());
                        }
                    }
                    Value::Object(id) if objects.insert(id) => {
                        if let Some(a) = self.objects.borrow(id) {
                            values.extend(a.values().filter(|v| is_heap_reference(v)).cloned());
                        }
                    }
                    Value::Promise(id) if promises.insert(id) => {
                        if let Some(result) = self.promises.get(id).and_then(|p| p.peek().cloned())
                        {
                            match result {
                                Ok(value) => values.push(value),
                                Err(e) => values.extend(e.value),
                            }
                        }
                    }
                    Value::Function(id) if functions.insert(id) => match self.functions.get(id) {
                        Some(Function::Closure { env, body, .. }) => {
                            environments.push(env);
                            self.mark_ast_literals(&body, &mut literals, &mut values);
                        }
                        Some(Function::Bound { receiver, .. }) => values.push(receiver.clone()),
                        Some(Function::Skip { callback, ast }) => {
                            values.push(callback.clone());
                            if let Some(ast) = ast {
                                self.mark_ast_literals(&ast, &mut literals, &mut values);
                            }
                        }
                        Some(Function::Defined {
                            params,
                            body,
                            statics,
                        }) => {
                            values.push(statics.clone());
                            values.extend(params.iter().map(|v| v.1.clone()));
                            self.mark_ast_literals(&body, &mut literals, &mut values);
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }
        }
        self.arrays.sweep(&arrays);
        self.objects.sweep(&objects);
        self.functions.sweep(&functions);
        self.envs.sweep(&envs);
        self.literals.sweep(&literals);
        self.promises.sweep(&promises);
        self.collect_streams(&streams);
        self.array_properties
            .borrow_mut()
            .retain(|id, _| arrays.contains(id));
        self.array_holes
            .borrow_mut()
            .retain(|id, _| arrays.contains(id));
    }
    fn mark_ast_literals(&self, ast: &Ast, live: &mut HashSet<usize>, values: &mut Vec<Value>) {
        if !matches!(ast, Json::Array(_) | Json::Object(_)) {
            return;
        }
        let mut pending: smallvec::SmallVec<[&Ast; 16]> = smallvec::smallvec![ast];
        while let Some(ast) = pending.pop() {
            match ast {
                Json::Array(a) => pending.extend(a),
                Json::Object(o) => {
                    if let Some(id) = o.get("$lpeInternalLiteral").and_then(Json::as_u64) {
                        if live.insert(id as usize) {
                            if let Some(v) = self.literals.get(id as usize) {
                                values.push(v.clone());
                            }
                        }
                    }
                    pending.extend(o.values());
                }
                _ => {}
            }
        }
    }
    pub fn live_allocations(&self) -> usize {
        self.arrays.live_len()
            + self.objects.live_len()
            + self.functions.live_len()
            + self.envs.live_len()
            + self.literals.live_len()
            + self.streams.live_len()
            + self.promises.live_len()
    }
}

fn is_heap_reference(value: &Value) -> bool {
    matches!(
        value,
        Value::Array(_)
            | Value::Object(_)
            | Value::Function(_)
            | Value::Promise(_)
            | Value::Stream(_)
    )
}
