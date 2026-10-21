//! Plan trees that cannot call host code or suspend before executing anything.
//! A failed plan must never replay a partial evaluation's effects. Plans borrow
//! ASTs and resolve current bindings on every invocation; plans are not cached.
use super::*;
use smallvec::SmallVec;
use std::borrow::Cow;

enum Operator {
    JsonInvoke,
    Builtin(&'static str),
    Special(&'static str),
}

impl Operator {
    fn from_value(value: Cow<'_, Value>) -> Option<Self> {
        match value.as_ref() {
            Value::Builtin(name) if matches!(name.as_str(), "invoke" | "_call_obj_meth_") => {
                Some(Self::JsonInvoke)
            }
            Value::Builtin(name) => crate::builtins::sync_name(name)
                .or_else(|| crate::collections::sync_name(name))
                .map(Self::Builtin),
            Value::Special(name) => {
                macro_rules! specials {
                    ($($name:literal),*) => {
                        match name.as_str() {
                            $($name => Some(Self::Special($name)),)*
                            _ => None,
                        }
                    };
                }
                specials!(
                    "`", "$AST$", "fn", "->fn", "toFn", "defFn", "=>", "lambda", "\"", "'", "q",
                    "begin", "if"
                )
            }
            _ => None,
        }
    }
}

enum Operation<'a> {
    Json(&'static str, Value),
    Literal(&'a Ast),
    Binding(Value),
    Unbound(&'a str),
    Quote(&'a Ast),
    RawQuote(&'a Ast),
    Closure(&'static str, &'a [Ast], EnvId),
    Call(Operator, usize),
}
struct Instruction<'a> {
    operation: Option<Operation<'a>>,
    // First instruction after this subtree, used to skip lazy branches.
    end: usize,
}
// Leaf closure bodies can borrow their call bindings without an arena scope.
// A nested closure must instead capture a materialized lexical environment.
struct CallBindings<'a> {
    params: &'a [String],
    args: &'a [Value],
    function: usize,
}

impl Runtime {
    pub(super) fn eval_immediate(
        &mut self,
        ast: &Ast,
        options: &EvalOptions,
    ) -> Option<Result<Value>> {
        if self.controls.is_some() || self.controls_active() || self.legacy_context {
            return None;
        }
        self.steps.set(0);
        self.budget.set(options.max_steps);
        let result = self.eval_scoped_immediate(ast, self.global, options)?;
        self.output.clone_from(&self.output_log.borrow());
        Some(result)
    }

    pub(crate) fn eval_scoped_immediate(
        &mut self,
        ast: &Ast,
        env: EnvId,
        options: &EvalOptions,
    ) -> Option<Result<Value>> {
        self.eval_immediate_with_bindings(ast, env, options, None)
    }

    pub(super) fn eval_closure_immediate(
        &mut self,
        ast: &Ast,
        env: EnvId,
        options: &EvalOptions,
        params: &[String],
        args: &[Value],
        function: usize,
    ) -> Option<Result<Value>> {
        self.eval_immediate_with_bindings(
            ast,
            env,
            options,
            Some(CallBindings {
                params,
                args,
                function,
            }),
        )
    }

    fn eval_immediate_with_bindings(
        &mut self,
        ast: &Ast,
        env: EnvId,
        options: &EvalOptions,
        bindings: Option<CallBindings<'_>>,
    ) -> Option<Result<Value>> {
        let frames = self.immediate_frames(env)?;
        let depth = self.depth.get();
        let mut remaining = options.max_steps;
        let mut plan = SmallVec::<[Instruction<'_>; 16]>::new();
        self.plan_immediate(
            ast,
            &frames,
            options,
            bindings.as_ref(),
            depth,
            &mut remaining,
            &mut plan,
        )?;
        Some(self.run_immediate(&mut plan, &mut 0, options, depth))
    }

    pub(crate) fn eval_arguments_immediate(
        &mut self,
        args: &[Ast],
        env: EnvId,
        options: &EvalOptions,
    ) -> Option<Result<Vec<Value>>> {
        let frames = self.immediate_frames(env)?;
        let depth = self.depth.get();
        let mut remaining = options.max_steps;
        let mut plan = SmallVec::<[Instruction<'_>; 16]>::new();
        // Handles may be read directly only when *every* argument is a leaf
        // read or primitive quote. Otherwise an earlier expression could mutate
        // a later binding, or require the ordinary async sibling ordering.
        let data_reads = args.iter().all(|ast| match ast {
            Json::Null | Json::Bool(_) | Json::Number(_) | Json::String(_) => true,
            Json::Array(a) if a.is_empty() => true,
            Json::Array(a) if a.len() == 2 && !matches!(a[1], Json::Array(_) | Json::Object(_)) => {
                a[0].as_str().is_some_and(|name| {
                    matches!(
                        self.immediate_lookup(
                            name,
                            &frames,
                            options,
                            None,
                            true,
                            Operator::from_value
                        ),
                        Some(Some(Operator::Special("\"" | "'" | "q")))
                    )
                })
            }
            _ => false,
        });
        // Validate every argument before running any. A rejected plan must not
        // repeat effects or change the existing async sibling polling order.
        for ast in args {
            if data_reads {
                if let Json::String(name) = ast {
                    if depth >= options.max_depth.min(256) || remaining == 0 {
                        return None;
                    }
                    let value =
                        self.immediate_lookup(name, &frames, options, None, false, |v| {
                            Some(v.into_owned())
                        })?;
                    let operation = match value {
                        Some(Value::Promise(_) | Value::Stream(_)) => return None,
                        Some(value) => Operation::Binding(value),
                        None => Operation::Unbound(name),
                    };
                    remaining -= 1;
                    plan.push(Instruction {
                        operation: Some(operation),
                        end: plan.len() + 1,
                    });
                    continue;
                }
            }
            self.plan_immediate(
                ast,
                &frames,
                options,
                None,
                depth,
                &mut remaining,
                &mut plan,
            )?;
        }
        let mut cursor = 0;
        let mut values = Vec::with_capacity(args.len());
        while cursor < plan.len() {
            match self.run_immediate(&mut plan, &mut cursor, options, depth) {
                Ok(value) => values.push(value),
                Err(error) => return Some(Err(error)),
            }
        }
        Some(Ok(values))
    }

    fn immediate_frames(&self, env: EnvId) -> Option<Rc<[EnvId]>> {
        // Controlled evaluation can invoke interrupt hooks and uses cumulative
        // budgets; legacy lookup and callable returns have distinct semantics.
        if self.controls.is_some() || self.controls_active() || self.legacy_context {
            return None;
        }
        let frames = self.env_frames(env);
        for id in frames.iter() {
            let frame = self.envs.borrow(*id)?;
            if frame.hook.is_some() || frame.backing.as_ref().is_some_and(Value::is_callable) {
                return None;
            }
        }
        Some(frames)
    }

    // Outer None means the binding requires the full evaluator; inner None is
    // an unbound name, whose resolveString behavior depends on its use in an if.
    fn immediate_lookup<T>(
        &self,
        name: &str,
        frames: &[EnvId],
        options: &EvalOptions,
        bindings: Option<&CallBindings<'_>>,
        callable: bool,
        convert: impl Fn(Cow<'_, Value>) -> Option<T>,
    ) -> Option<Option<T>> {
        crate::security::key(name).ok()?;
        let convert = |value: Cow<'_, Value>| {
            self.validate_value(&value).ok()?;
            convert(value)
        };
        if let Some(bindings) = bindings {
            // Repeated parameter names overwrite earlier values, including $this$.
            if let Some(index) = bindings.params.iter().rposition(|param| param == name) {
                return convert(Cow::Borrowed(
                    bindings.args.get(index).unwrap_or(&Value::Undefined),
                ))
                .map(Some);
            }
            if name == "$this$" {
                return convert(Cow::Owned(Value::Function(bindings.function))).map(Some);
            }
        }
        for id in frames {
            let frame = self.envs.borrow(*id)?;
            if let Some(backing) = &frame.backing {
                if self.has_own(backing, name) {
                    return convert(Cow::Owned(self.get(backing, name))).map(Some);
                }
            }
            if let Some(value) = frame.values.get(name) {
                if !callable
                    && frame.library
                    && options.disallow_lib_functions_getting
                    && value.is_callable()
                {
                    continue;
                }
                return convert(Cow::Borrowed(value)).map(Some);
            }
            if frame.library && name == "Hashmap" {
                return None;
            }
        }
        Some(None)
    }

    #[allow(clippy::too_many_arguments)]
    fn plan_immediate<'a>(
        &self,
        ast: &'a Ast,
        frames: &[EnvId],
        options: &EvalOptions,
        bindings: Option<&CallBindings<'_>>,
        depth: usize,
        remaining: &mut usize,
        plan: &mut SmallVec<[Instruction<'a>; 16]>,
    ) -> Option<()> {
        if depth >= options.max_depth.min(256) || *remaining == 0 {
            return None;
        }
        *remaining -= 1;
        let start = plan.len();
        let operation = match ast {
            Json::String(name) => {
                match self.immediate_lookup(name, frames, options, bindings, false, |v| {
                    Some(v.into_owned())
                })? {
                    Some(
                        value @ (Value::Undefined
                        | Value::Null
                        | Value::Bool(_)
                        | Value::Number(_)
                        | Value::String(_)
                        | Value::Utf16(_)
                        | Value::Date(_)),
                    ) => Operation::Binding(value),
                    None => Operation::Unbound(name),
                    _ => return None,
                }
            }
            Json::Array(list) if !list.is_empty() => {
                let operator = self.immediate_lookup(
                    list[0].as_str()?,
                    frames,
                    options,
                    bindings,
                    true,
                    Operator::from_value,
                )??;
                match &operator {
                    Operator::JsonInvoke => {
                        // Only a resolved protected JSON receiver, a literal method,
                        // and one already resolved input qualify. Dynamic calls retain
                        // their ordinary argument order and asynchronous fallback.
                        if list.len() != 4
                            || options.max_steps != EvalOptions::default().max_steps
                            || options.max_depth != EvalOptions::default().max_depth
                            || depth + 8 >= options.max_depth
                        {
                            return None;
                        }
                        let resolve = |ast: &Ast| -> Option<Value> {
                            if let Some(name) = ast.as_str() {
                                return self.immediate_lookup(
                                    name,
                                    frames,
                                    options,
                                    bindings,
                                    false,
                                    |value| Some(value.into_owned()),
                                )?;
                            }
                            let quote = ast.as_array()?;
                            if quote.len() != 2 || !quote[1].is_string() {
                                return None;
                            }
                            let op = self.immediate_lookup(
                                quote[0].as_str()?,
                                frames,
                                options,
                                bindings,
                                true,
                                Operator::from_value,
                            )??;
                            if !matches!(op, Operator::Special("\"" | "'" | "q")) {
                                return None;
                            }
                            Some(Value::String(quote[1].as_str()?.into()))
                        };
                        if resolve(&list[1])? != Value::Object(self.json_object) {
                            return None;
                        }
                        let Value::String(method) = resolve(&list[2])? else {
                            return None;
                        };
                        let method = match method.as_str() {
                            "parse" => "parse",
                            "stringify" => "stringify",
                            _ => return None,
                        };
                        let value = resolve(&list[3])?;
                        if matches!(value, Value::Promise(_) | Value::Stream(_)) {
                            return None;
                        }
                        if method == "parse" && !matches!(value, Value::String(_)) {
                            return None;
                        }
                        if method == "stringify" && !crate::json::plain(self, &value) {
                            return None;
                        }
                        Operation::Json(method, value)
                    }

                    Operator::Special(name) if matches!(*name, "`" | "$AST$") => {
                        let ast = list.get(1)?;
                        if ast.get("$lpeInternalLiteral").is_some() {
                            return None;
                        }
                        Operation::RawQuote(ast)
                    }
                    Operator::Special(name)
                        if matches!(*name, "fn" | "->fn" | "toFn" | "defFn" | "=>" | "lambda") =>
                    {
                        if bindings.is_some() {
                            return None;
                        }
                        Operation::Closure(name, &list[1..], *frames.first()?)
                    }
                    Operator::Special(name) if matches!(*name, "\"" | "'" | "q") => {
                        if list.len() != 2
                            || !matches!(
                                list[1],
                                Json::String(_) | Json::Number(_) | Json::Bool(_) | Json::Null
                            )
                        {
                            return None;
                        }
                        Operation::Quote(&list[1])
                    }
                    Operator::Builtin(_) => {
                        plan.push(Instruction {
                            operation: None,
                            end: start + 1,
                        });
                        for arg in &list[1..] {
                            self.plan_immediate(
                                arg,
                                frames,
                                options,
                                bindings,
                                depth + 1,
                                remaining,
                                plan,
                            )?;
                        }
                        Operation::Call(operator, list.len() - 1)
                    }
                    Operator::Special(name) if *name == "begin" || *name == "if" => {
                        plan.push(Instruction {
                            operation: None,
                            end: start + 1,
                        });
                        for arg in &list[1..] {
                            self.plan_immediate(
                                arg,
                                frames,
                                options,
                                bindings,
                                depth + 1,
                                remaining,
                                plan,
                            )?;
                        }
                        Operation::Call(operator, list.len() - 1)
                    }
                    _ => return None,
                }
            }
            Json::Object(o)
                if o.len() != 1 || ast.get("$lpe").and_then(Json::as_str) != Some("undefined") =>
            {
                return None
            }
            _ => Operation::Literal(ast),
        };
        let instruction = Instruction {
            operation: Some(operation),
            end: plan.len().max(start + 1),
        };
        if plan.len() == start {
            plan.push(instruction);
        } else {
            plan[start] = instruction;
        }
        Some(())
    }

    fn run_immediate(
        &mut self,
        plan: &mut [Instruction<'_>],
        cursor: &mut usize,
        options: &EvalOptions,
        depth: usize,
    ) -> Result<Value> {
        self.tick()?;
        if depth >= options.max_depth {
            return Err(Error::new(
                "LimitError",
                "Evaluation nesting limit exceeded",
            ));
        }
        let instruction = &mut plan[*cursor];
        let end = instruction.end;
        let operation = instruction
            .operation
            .take()
            .expect("unexecuted instruction");
        *cursor += 1;
        match operation {
            Operation::Json(method, value) => {
                self.tick()?;
                if method == "parse" {
                    crate::json::parse(self, &value)
                } else {
                    crate::json::stringify_plain(self, &value)
                }
            }

            Operation::Literal(ast) if ast.is_array() => Ok(Value::Null),
            Operation::Literal(ast) => Ok(self.from_json(ast)),
            Operation::Binding(value) => Ok(value),
            Operation::Unbound(name) => Ok(if options.resolve_string {
                Value::String(name.into())
            } else {
                Value::Undefined
            }),
            Operation::RawQuote(ast) => {
                self.tick()?;
                self.tick()?;
                Ok(self.from_json(ast))
            }
            Operation::Closure(name, args, env) => {
                self.tick()?;
                self.tick()?;
                crate::specials::make_closure(self, name, args, env, options)
            }
            Operation::Quote(ast) => {
                self.tick()?; // operator dispatch
                self.tick()?; // special form
                let value = self.from_json(ast);
                if matches!(value, Value::String(_)) {
                    Ok(value)
                } else {
                    Ok(self.string_from_utf16(self.to_utf16(&value)))
                }
            }
            Operation::Call(operator, count) => {
                self.tick()?;
                match operator {
                    Operator::JsonInvoke => unreachable!("JSON invoke has a dedicated operation"),
                    Operator::Builtin(name) => {
                        let mut values = SmallVec::<[Value; 4]>::with_capacity(count);
                        while *cursor < end {
                            values.push(self.run_immediate(plan, cursor, options, depth + 1)?);
                        }
                        self.tick()?;
                        if depth + 1 >= options.max_depth {
                            return Err(Error::new("LimitError", "Call nesting limit exceeded"));
                        }
                        if matches!(name, "list" | "array" | "[") {
                            crate::collections::make_list(self, values.into_vec())
                        } else if let Some(value) = crate::builtins::call_sync(self, name, &values)?
                        {
                            Ok(value)
                        } else {
                            Ok(crate::collections::call_sync(self, name, &values)?
                                .expect("validated immediate builtin"))
                        }
                    }
                    Operator::Special(name) => {
                        self.tick()?;
                        if name == "begin" {
                            let mut value = Value::Null;
                            while *cursor < end {
                                value = self.run_immediate(plan, cursor, options, depth + 1)?;
                            }
                            return Ok(value);
                        }
                        let mut condition_options = options.clone();
                        condition_options.resolve_string = false;
                        let mut remaining = count;
                        while remaining >= 2 {
                            if self
                                .run_immediate(plan, cursor, &condition_options, depth + 1)?
                                .truthy()
                            {
                                let value = self.run_immediate(plan, cursor, options, depth + 1)?;
                                *cursor = end;
                                return Ok(value);
                            }
                            *cursor = plan[*cursor].end; // unselected branch
                            remaining -= 2;
                        }
                        if remaining == 1 {
                            self.run_immediate(plan, cursor, options, depth + 1)
                        } else {
                            self.tick()?; // implicit undefined AST
                            if depth + 1 >= options.max_depth {
                                return Err(Error::new(
                                    "LimitError",
                                    "Evaluation nesting limit exceeded",
                                ));
                            }
                            Ok(Value::Undefined)
                        }
                    }
                }
            }
        }
    }
}
