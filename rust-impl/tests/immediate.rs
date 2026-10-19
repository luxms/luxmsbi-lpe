use lpe::{parse, Error, EvalOptions, Runtime, Value};
use serde_json::json;
use std::{cell::Cell, rc::Rc};

fn outcome(rt: &Runtime, result: Result<Value, Error>) -> String {
    match result {
        Ok(value) => format!("ok:{}", rt.to_json(&value).unwrap()),
        Err(e) => format!("{}:{}:{}", e.kind, e.message, e.is_async),
    }
}

#[test]
fn immediate_and_async_evaluation_agree_at_every_budget_and_depth_boundary() {
    for source in [
        "add(mul(3,7),div(8,2))",
        "add(price,tax)",
        "upper(trim('  Привет 😀  '))",
        "if(eq(price,12),add(1,2),div())",
        "if(missing,1,2)",
        "if(false,1)",
        "begin(1,2,3)",
        "add()",
        "join(reverse([1,2,3]),'-')",
        "get(jsonParse('{\"a\":42}'),'a')",
        "toAny(unknown)",
        "q(42)",
        "add(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20)",
        "let([[f,fn(x,add(x,1))]],f(41))",
    ] {
        let ast = parse(source).unwrap();
        for steps in 0..40 {
            for depth in 0..7 {
                let options = EvalOptions {
                    max_steps: steps,
                    max_depth: depth,
                    ..Default::default()
                };
                let mut immediate = Runtime::new();
                let mut asynchronous = Runtime::new();
                for rt in [&mut immediate, &mut asynchronous] {
                    rt.set_context(&json!({"price":12,"tax":2})).unwrap();
                }
                // An inert hook forces the full path even inside closure bodies.
                asynchronous
                    .set_lookup_hook(asynchronous.global_env(), |_, _| Ok(None))
                    .unwrap();
                let a = immediate.eval_ast(&ast, &options);
                let b = futures::executor::block_on(asynchronous.eval_async(&ast, &options));
                assert_eq!(
                    outcome(&immediate, a),
                    outcome(&asynchronous, b),
                    "{source} steps={steps} depth={depth}"
                );
            }
        }
    }
}

#[test]
fn changed_and_shadowed_bindings_are_observed_without_replaying_callbacks() {
    let mut rt = Runtime::new();
    let ast = parse("add(mul(x,2),side())").unwrap();
    let calls = Rc::new(Cell::new(0));
    let count = calls.clone();
    rt.register("side", move |_| {
        count.set(count.get() + 1);
        Ok(Value::Number(1.0))
    });
    for x in 1..4 {
        rt.set_global("x", Value::Number(x as f64));
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap(),
            Value::Number((x * 2 + 1) as f64)
        );
    }
    assert_eq!(calls.get(), 3);
    rt.register("mul", |_| Ok(Value::Number(10.0)));
    assert_eq!(
        rt.eval_ast(&ast, &EvalOptions::default()).unwrap(),
        Value::Number(11.0)
    );
    assert_eq!(calls.get(), 4);
}

#[test]
fn compound_bindings_that_contain_promises_use_async_unboxing() {
    let mut rt = Runtime::new();
    let promise = rt.promise(async { Ok(Value::Number(42.0)) });
    let array = rt.array(vec![promise]);
    rt.set_global("values", array);
    assert_eq!(rt.eval("first(values)").unwrap(), Value::Number(42.0));
}

#[test]
fn cancellation_also_applies_to_immediate_expressions() {
    let mut rt = Runtime::new();
    rt.cancellation_token()
        .store(true, std::sync::atomic::Ordering::Relaxed);
    assert_eq!(rt.eval("add(1,2)").unwrap_err().kind, "Cancelled");
}

#[test]
fn cached_scope_order_keeps_live_bindings_hooks_and_parent_precedence() {
    use indexmap::IndexMap;
    let mut rt = Runtime::new();
    let common = rt.new_env(IndexMap::from([("x".into(), Value::Number(1.0))]), vec![]);
    let left = rt.new_env(IndexMap::new(), vec![common]);
    let right = rt.new_env(
        IndexMap::from([("x".into(), Value::Number(2.0))]),
        vec![common],
    );
    let scope = rt.new_env(IndexMap::new(), vec![left, right]);
    let options = EvalOptions::default();
    for _ in 0..2 {
        assert_eq!(
            rt.lookup(scope, "x", &options, false).unwrap(),
            Value::Number(1.0)
        );
    }
    rt.assign(common, "x", Value::Number(3.0)).unwrap();
    assert_eq!(
        rt.lookup(scope, "x", &options, false).unwrap(),
        Value::Number(3.0)
    );
    rt.undefine(common, "x");
    assert_eq!(
        rt.lookup(scope, "x", &options, false).unwrap(),
        Value::Number(2.0)
    );
    rt.set_lookup_hook(left, |name, _| {
        Ok((name == "x").then_some(Value::Number(4.0)))
    })
    .unwrap();
    assert_eq!(
        rt.lookup(scope, "x", &options, false).unwrap(),
        Value::Number(4.0)
    );
}

#[test]
fn omitted_closure_body_still_returns_undefined() {
    let mut rt = Runtime::new();
    assert_eq!(rt.eval("let([[f,fn(x)]],f(1))").unwrap(), Value::Undefined);
}

#[test]
fn closure_fallback_roots_unused_arguments_through_host_collection() {
    let mut rt = Runtime::new();
    rt.register_special("collect", |rt, _, _, _| {
        Box::pin(async move {
            rt.collect_garbage(&[]);
            Ok(Value::Undefined)
        })
    });
    rt.register_host("sink", |rt, args| {
        rt.collect_garbage(&[]);
        let value = rt.get(&args[1], "0");
        Box::pin(async move { Ok(value) })
    });
    let function = rt.closure(
        vec!["x".into()],
        parse("begin(collect(),sink)").unwrap(),
        rt.global_env(),
        EvalOptions::default(),
    );
    let extra = rt.array(vec![Value::Number(42.0)]);
    let env = rt.global_env();
    assert_eq!(
        futures::executor::block_on(rt.call_value(function, vec![Value::Null, extra], env))
            .unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn borrowed_closure_parameters_preserve_overwrites_and_escaping_captures() {
    let mut rt = Runtime::new();
    for (params, args, body) in [
        (vec!["x", "x"], vec![1.0, 41.0], "add(x,1)"),
        (vec!["$this$"], vec![41.0], "add($this$,1)"),
    ] {
        let function = rt.closure(
            params.into_iter().map(String::from).collect(),
            parse(body).unwrap(),
            rt.global_env(),
            EvalOptions::default(),
        );
        let env = rt.global_env();
        assert_eq!(
            futures::executor::block_on(rt.call_value(
                function,
                args.into_iter().map(Value::Number).collect(),
                env,
            ))
            .unwrap(),
            Value::Number(42.0)
        );
    }
    let function = rt.closure(
        vec!["x".into()],
        parse("[fn(y,add(x,y))]").unwrap(),
        rt.global_env(),
        EvalOptions::default(),
    );
    let env = rt.global_env();
    let returned =
        futures::executor::block_on(rt.call_value(function, vec![Value::Number(41.0)], env))
            .unwrap();
    rt.collect_garbage(std::slice::from_ref(&returned));
    let captured = rt.get(&returned, "0");
    assert_eq!(
        futures::executor::block_on(rt.call_value(captured, vec![Value::Number(1.0)], env))
            .unwrap(),
        Value::Number(42.0)
    );
}
