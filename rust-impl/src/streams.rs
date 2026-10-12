use super::*;

pub type StreamResolver = Rc<
    dyn for<'a> Fn(
        &'a mut Runtime,
        Vec<Value>,
        EnvId,
        EvalOptions,
    ) -> LocalBoxFuture<'a, Result<Value>>,
>;
type Subscriber = Rc<dyn Fn(&Runtime, Value)>;

struct Disposer {
    callback: Box<dyn Fn()>,
    active: Cell<bool>,
}

struct ConstructionGuard {
    runtime: Runtime,
    stream: usize,
    committed: bool,
}
impl Drop for ConstructionGuard {
    fn drop(&mut self) {
        if !self.committed {
            self.runtime.dispose_stream(self.stream);
        }
    }
}
struct RetainGuard {
    runtime: Runtime,
    stream: Value,
    committed: bool,
}
impl Drop for RetainGuard {
    fn drop(&mut self) {
        if !self.committed {
            let _ = self.runtime.stream_release(&self.stream);
        }
    }
}
impl Disposer {
    fn run(&self) {
        if self.active.replace(false) {
            (self.callback)();
        }
    }
}
impl Drop for Disposer {
    fn drop(&mut self) {
        self.run();
    }
}

/// Roots captured by a reactive computation, independent of its input values.
#[derive(Clone)]
pub struct StreamContext {
    pub(super) env: EnvId,
    pub(super) options: EvalOptions,
    pub(super) asts: Vec<Ast>,
    pub(super) values: Vec<Value>,
}
impl StreamContext {
    pub fn new(env: EnvId, options: &EvalOptions) -> Self {
        Self {
            env,
            options: options.clone(),
            asts: vec![],
            values: vec![],
        }
    }
    pub fn with_asts(mut self, asts: &[Ast]) -> Self {
        self.asts = asts.to_vec();
        self
    }
    pub fn with_values(mut self, values: Vec<Value>) -> Self {
        self.values = values;
        self
    }
}

/// Explicitly dispose a subscription through its owning Runtime.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StreamSubscription {
    pub(super) stream: usize,
    token: usize,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StreamStats {
    pub references: usize,
    pub listeners: usize,
    pub disposed: bool,
}
#[derive(Clone)]
pub(super) struct Computation {
    pub args: Vec<Value>,
    pub current: Vec<Value>,
    pub context: StreamContext,
    resolve: StreamResolver,
}
#[derive(Clone)]
pub(super) enum Listener {
    Derived {
        target: usize,
        argument: Option<usize>,
    },
    Host(Subscriber),
}
#[derive(Clone)]
pub(super) struct StreamState {
    pub value: Value,
    references: usize,
    disposed: bool,
    pub listeners: IndexMap<usize, Listener>,
    next_token: usize,
    pub computation: Option<Computation>,
    pub dependencies: Vec<StreamSubscription>,
    pub child: Option<StreamSubscription>,
    dispose: Option<Rc<Disposer>>,
}

impl Runtime {
    pub fn create_stream(&mut self, value: Value) -> Value {
        self.create_stream_with_dispose(value, || {})
    }
    pub fn create_stream_with_dispose<F>(&mut self, value: Value, dispose: F) -> Value
    where
        F: Fn() + 'static,
    {
        self.preserve_promises.set(true);
        let value = Value::Stream(self.streams.insert(StreamState {
            value,
            references: 1,
            disposed: false,
            listeners: IndexMap::new(),
            next_token: 0,
            computation: None,
            dependencies: vec![],
            child: None,
            dispose: Some(Rc::new(Disposer {
                callback: Box::new(dispose),
                active: Cell::new(true),
            })),
        }));
        self.retain_task_value(&value);
        value
    }
    fn stream_id(&self, value: &Value) -> Result<usize> {
        match value {
            Value::Stream(id) if self.streams.get(*id).is_some() => Ok(*id),
            Value::Stream(_) => Err(Error::new("InvalidHandle", "Expired stream")),
            _ => Err(Error::new("TypeError", "Expected a stream")),
        }
    }
    pub fn stream_value(&self, stream: &Value) -> Result<Value> {
        Ok(self.streams.get(self.stream_id(stream)?).unwrap().value)
    }
    pub fn stream_stats(&self, stream: &Value) -> Result<StreamStats> {
        let state = self.streams.get(self.stream_id(stream)?).unwrap();
        Ok(StreamStats {
            references: state.references,
            listeners: state.listeners.len(),
            disposed: state.disposed,
        })
    }
    pub fn stream_retain(&mut self, stream: &Value) -> Result<()> {
        let id = self.stream_id(stream)?;
        let mut state = self.streams.get_mut(id).unwrap();
        if state.disposed {
            return Err(Error::new(
                "StreamDisposed",
                "Cannot retain a disposed stream",
            ));
        }
        state.references = state
            .references
            .checked_add(1)
            .ok_or_else(|| Error::new("LimitError", "Stream reference limit exceeded"))?;
        Ok(())
    }
    pub fn stream_release(&mut self, stream: &Value) -> Result<()> {
        let id = self.stream_id(stream)?;
        let dispose = {
            let mut state = self.streams.get_mut(id).unwrap();
            if state.disposed {
                return Err(Error::new("StreamDisposed", "Stream was already released"));
            }
            state.references -= 1;
            state.references == 0
        };
        if dispose {
            self.dispose_stream(id);
        }
        Ok(())
    }
    fn dispose_stream(&mut self, id: usize) {
        let Some(mut state) = self.streams.get_mut(id) else {
            return;
        };
        if state.disposed {
            return;
        }
        state.disposed = true;
        state.references = 0;
        state.listeners.clear();
        let dependencies = std::mem::take(&mut state.dependencies);
        let child = state.child.take();
        let computation = state.computation.take();
        let dispose = state.dispose.take();
        drop(state);
        if let Some(child) = child {
            self.stream_unsubscribe(child);
            let _ = self.stream_release(&Value::Stream(child.stream));
        }
        for subscription in dependencies {
            self.stream_unsubscribe(subscription);
        }
        if let Some(computation) = computation {
            for value in computation.args {
                if matches!(value, Value::Stream(_)) {
                    let _ = self.stream_release(&value);
                }
            }
        }
        if let Some(dispose) = dispose {
            dispose.run();
        }
    }
    pub fn stream_subscribe<F>(&mut self, stream: &Value, listener: F) -> Result<StreamSubscription>
    where
        F: Fn(Value) + 'static,
    {
        self.stream_subscribe_host(stream, move |_, value| listener(value))
    }
    pub fn stream_subscribe_host<F>(
        &mut self,
        stream: &Value,
        listener: F,
    ) -> Result<StreamSubscription>
    where
        F: Fn(&Runtime, Value) + 'static,
    {
        let id = self.stream_id(stream)?;
        self.subscribe_stream(id, Listener::Host(Rc::new(listener)))
    }
    fn subscribe_stream(&mut self, id: usize, listener: Listener) -> Result<StreamSubscription> {
        let mut state = self
            .streams
            .get_mut(id)
            .ok_or_else(|| Error::new("InvalidHandle", "Expired stream"))?;
        if state.disposed {
            return Err(Error::new(
                "StreamDisposed",
                "Cannot subscribe to a disposed stream",
            ));
        }
        let token = state.next_token;
        state.next_token = token
            .checked_add(1)
            .ok_or_else(|| Error::new("LimitError", "Stream subscription limit exceeded"))?;
        state.listeners.insert(token, listener);
        Ok(StreamSubscription { stream: id, token })
    }
    pub fn stream_unsubscribe(&mut self, subscription: StreamSubscription) -> bool {
        self.streams
            .get_mut(subscription.stream)
            .is_some_and(|mut state| state.listeners.shift_remove(&subscription.token).is_some())
    }
    pub fn stream_next(&mut self, stream: &Value, value: Value) -> Result<()> {
        futures::executor::block_on(self.stream_next_async(stream, value))
    }
    pub async fn stream_next_async(&mut self, stream: &Value, value: Value) -> Result<()> {
        self.steps.set(0);
        let id = self.stream_id(stream)?;
        let cancelled = self.cancelled.clone();
        let mut evaluation = self.emit_stream(id, value);
        let result = futures::future::poll_fn(move |cx| {
            if cancelled.load(Ordering::Relaxed) {
                std::task::Poll::Ready(Err(Error::new("Cancelled", "Stream update cancelled")))
            } else {
                evaluation.as_mut().poll(cx)
            }
        })
        .await;
        self.output = self.output_log.borrow().clone();
        result
    }
    fn emit_stream(&mut self, id: usize, value: Value) -> LocalBoxFuture<'_, Result<()>> {
        async move {
            self.tick()?;
            if self.depth.get() >= 256 {
                return Err(Error::new(
                    "LimitError",
                    "Stream propagation depth exceeded",
                ));
            }
            self.depth.set(self.depth.get() + 1);
            let _guard = DepthGuard(self.depth.clone());
            let roots = self.task(&Ast::Null, self.global);
            roots.retain_task_value(&Value::Stream(id));
            roots.retain_task_value(&value);
            let listeners = {
                let mut state = self
                    .streams
                    .get_mut(id)
                    .ok_or_else(|| Error::new("InvalidHandle", "Expired stream"))?;
                if state.disposed {
                    return Err(Error::new(
                        "StreamDisposed",
                        "Cannot update a disposed stream",
                    ));
                }
                state.value = value.clone();
                state.listeners.clone()
            };
            for (_, listener) in listeners {
                self.tick()?;
                match listener {
                    Listener::Host(callback) => callback(self, value.clone()),
                    Listener::Derived { target, argument } => {
                        if self.streams.get(target).is_none_or(|state| state.disposed) {
                            continue;
                        }
                        if let Some(index) = argument {
                            if let Some(mut state) = self.streams.get_mut(target) {
                                if let Some(computation) = &mut state.computation {
                                    computation.current[index] = value.clone();
                                }
                            }
                            self.recompute_stream(target).await?;
                        } else {
                            self.emit_stream(target, value.clone()).await?;
                        }
                    }
                }
            }
            Ok(())
        }
        .boxed_local()
    }
    fn recompute_stream(&mut self, id: usize) -> LocalBoxFuture<'_, Result<()>> {
        async move {
            let computation = self
                .streams
                .get(id)
                .and_then(|state| state.computation)
                .ok_or_else(|| Error::new("StreamDisposed", "Reactive computation was disposed"))?;
            let context = computation.context;
            let roots = self.task(&Ast::Array(context.asts.clone()), context.env);
            roots.retain_task_value(&Value::Stream(id));
            for value in &context.values {
                roots.retain_task_value(value);
            }
            let result =
                (computation.resolve)(self, computation.current, context.env, context.options)
                    .await?;
            roots.retain_task_value(&result);
            self.set_stream_result(id, result).await
        }
        .boxed_local()
    }
    fn set_stream_result(&mut self, id: usize, value: Value) -> LocalBoxFuture<'_, Result<()>> {
        async move {
            self.tick()?;
            let state = self
                .streams
                .get(id)
                .ok_or_else(|| Error::new("InvalidHandle", "Expired stream"))?;
            if state.disposed {
                return Ok(());
            }
            let next = if let Value::Stream(child) = &value {
                Some(*child)
            } else {
                None
            };
            if next == Some(id) {
                return Err(Error::new("StreamCycle", "A stream cannot return itself"));
            }
            if next.is_some() && state.child.map(|s| s.stream) == next {
                return Ok(());
            }
            if let Some(child) = state.child {
                self.streams.get_mut(id).unwrap().child = None;
                self.stream_unsubscribe(child);
                self.stream_release(&Value::Stream(child.stream))?;
            }
            if let Some(child) = next {
                self.stream_retain(&value)?;
                let roots = self.task(&Ast::Null, self.global);
                roots.retain_task_value(&value);
                let mut retained = RetainGuard {
                    runtime: roots,
                    stream: value.clone(),
                    committed: false,
                };
                let current = self.stream_value(&value)?;
                self.emit_stream(id, current).await?;
                if self.streams.get(id).is_none_or(|state| state.disposed) {
                    return Ok(());
                }
                let subscription = self.subscribe_stream(
                    child,
                    Listener::Derived {
                        target: id,
                        argument: None,
                    },
                )?;
                self.streams.get_mut(id).unwrap().child = Some(subscription);
                retained.committed = true;
            } else {
                self.emit_stream(id, value).await?;
            }
            Ok(())
        }
        .boxed_local()
    }
    /// Lift a resolver over stream inputs, preserving one subscription per occurrence.
    /// Like JS, the stream path passes Promise operands through without awaiting them.
    /// Capture arena values in context roots, never capture a Runtime in the resolver.
    pub fn unbox(
        &mut self,
        args: Vec<Value>,
        context: StreamContext,
        resolve: StreamResolver,
    ) -> LocalBoxFuture<'_, Result<Value>> {
        async move {
            let roots = self.task(&Ast::Array(context.asts.clone()), context.env);
            for value in args.iter().chain(&context.values) {
                roots.retain_task_value(value);
            }
            if !args.iter().any(|value| matches!(value, Value::Stream(_))) {
                if args.iter().any(|value| matches!(value, Value::Promise(_))) {
                    let mut task = roots;
                    let future = async move {
                        let values = task.resolve_stream_arguments(args).await?;
                        resolve(&mut task, values, context.env, context.options).await
                    };
                    if self.preserve_promises.get() {
                        return Ok(self.promise(future));
                    }
                    return future.await;
                }
                return resolve(self, args, context.env, context.options).await;
            }
            let mut retained = vec![];
            let mut current = args.clone();
            for (index, value) in args.iter().enumerate() {
                if matches!(value, Value::Stream(_)) {
                    if let Err(error) = self.stream_retain(value) {
                        for value in retained {
                            let _ = self.stream_release(&value);
                        }
                        return Err(error);
                    }
                    retained.push(value.clone());
                    current[index] = self.stream_value(value)?;
                }
            }
            let output = self.create_stream(Value::Undefined);
            let id = self.stream_id(&output)?;
            roots.retain_task_value(&output);
            let mut construction = ConstructionGuard {
                runtime: roots,
                stream: id,
                committed: false,
            };
            self.streams.get_mut(id).unwrap().computation = Some(Computation {
                args: args.clone(),
                current,
                context,
                resolve,
            });
            if let Err(error) = self.recompute_stream(id).await {
                self.dispose_stream(id);
                return Err(error);
            }
            for (index, value) in args.iter().enumerate() {
                if let Value::Stream(source) = value {
                    match self.subscribe_stream(
                        *source,
                        Listener::Derived {
                            target: id,
                            argument: Some(index),
                        },
                    ) {
                        Ok(subscription) => self
                            .streams
                            .get_mut(id)
                            .unwrap()
                            .dependencies
                            .push(subscription),
                        Err(error) => {
                            self.dispose_stream(id);
                            return Err(error);
                        }
                    }
                }
            }
            construction.committed = true;
            Ok(output)
        }
        .boxed_local()
    }
    pub(super) fn collect_streams(&mut self, live: &HashSet<usize>) {
        let ids: Vec<_> = self
            .streams
            .0
            .borrow()
            .slots
            .iter()
            .enumerate()
            .filter(|(_, slot)| slot.value.is_some())
            .map(|(index, slot)| (slot.generation << SHIFT) | index)
            .filter(|id| !live.contains(id))
            .collect();
        for id in ids {
            self.dispose_stream(id);
        }
        self.streams.sweep(live);
    }

    async fn resolve_stream_arguments(&mut self, args: Vec<Value>) -> Result<Vec<Value>> {
        let roots = self.task(&Ast::Null, self.global);
        for value in &args {
            roots.retain_task_value(value);
        }
        let mut futures: Vec<_> = args
            .into_iter()
            .map(|value| {
                let mut task = self.task(&Ast::Null, self.global);
                task.retain_task_value(&value);
                Some(async move { task.resolve_value(value).await }.boxed_local())
            })
            .collect();
        let mut values = vec![Value::Undefined; futures.len()];
        futures::future::poll_fn(|cx| {
            let mut pending = false;
            let mut failure = None;
            for (index, future) in futures.iter_mut().enumerate() {
                if let Some(active) = future.as_mut() {
                    match active.as_mut().poll(cx) {
                        std::task::Poll::Pending => pending = true,
                        std::task::Poll::Ready(result) => {
                            *future = None;
                            match result {
                                Ok(value) => {
                                    roots.retain_task_value(&value);
                                    values[index] = value;
                                }
                                Err(error) if failure.is_none() => failure = Some(error),
                                Err(_) => {}
                            }
                        }
                    }
                }
            }
            if let Some(error) = failure {
                std::task::Poll::Ready(Err(error))
            } else if pending {
                std::task::Poll::Pending
            } else {
                std::task::Poll::Ready(Ok(std::mem::take(&mut values)))
            }
        })
        .await
    }
}
