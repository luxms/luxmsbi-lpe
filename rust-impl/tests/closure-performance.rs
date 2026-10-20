use futures::{executor::block_on, task::noop_waker};
use lpe::{parse, EvalOptions, Runtime, Value};
use serde_json::json;
use std::{cell::Cell, rc::Rc, sync::atomic::Ordering, task::Context};

fn call(rt: &mut Runtime, function: Value, arg: f64) -> Value {
    let env = rt.global_env();
    block_on(rt.call_value(function, vec![Value::Number(arg)], env)).unwrap()
}

#[test]
fn builtin_aliases_and_shadowed_operators_are_resolved_on_each_call() {
    let mut rt = Runtime::new();
    rt.set_global("op", Value::Builtin("add".into()));
    let function = rt.eval("fn(x,op(x,1))").unwrap();
    assert_eq!(call(&mut rt, function.clone(), 41.0), Value::Number(42.0));
    rt.set_global("op", Value::Builtin("mul".into()));
    assert_eq!(call(&mut rt, function.clone(), 41.0), Value::Number(41.0));
    let calls = Rc::new(Cell::new(0));
    let observed = calls.clone();
    rt.register("op", move |_| {
        observed.set(observed.get() + 1);
        Ok(Value::Number(43.0))
    });
    assert_eq!(call(&mut rt, function.clone(), 41.0), Value::Number(43.0));
    assert_eq!(calls.get(), 1);
    rt.set_global("op", Value::Number(7.0));
    let env = rt.global_env();
    assert_eq!(
        block_on(rt.call_value(function, vec![Value::Number(41.0)], env))
            .unwrap_err()
            .kind,
        "TypeError"
    );
}

#[test]
fn immediately_built_closure_arguments_survive_host_collection() {
    let mut rt = Runtime::new();
    rt.register_host("collect", |rt, args| {
        rt.collect_garbage(&[]);
        let function = args[0].clone();
        Box::pin(async move { Ok(function) })
    });
    let ast = json!([["collect", ["fn", "x", ["add", "x", 1]]], 41]);
    assert_eq!(
        rt.eval_ast(&ast, &EvalOptions::default()).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn closure_call_futures_remain_lazy_and_check_cancellation_when_polled() {
    let mut rt = Runtime::new();
    let calls = Rc::new(Cell::new(0));
    let observed = calls.clone();
    rt.register("effect", move |_| {
        observed.set(observed.get() + 1);
        Ok(Value::Number(42.0))
    });
    let function = rt.eval("fn(x,effect())").unwrap();
    let env = rt.global_env();
    let options = EvalOptions::default();
    let token = rt.cancellation_token();
    let future = rt.call_with_options(function.clone(), vec![], env, &options);
    assert_eq!(calls.get(), 0);
    drop(future);
    assert_eq!(calls.get(), 0);

    let future = rt.call_with_options(function.clone(), vec![], env, &options);
    token.store(true, Ordering::Relaxed);
    assert_eq!(block_on(future).unwrap_err().kind, "Cancelled");
    assert_eq!(calls.get(), 0);
    token.store(false, Ordering::Relaxed);
    assert_eq!(call(&mut rt, function, 0.0), Value::Number(42.0));
    assert_eq!(calls.get(), 1);
}

#[test]
fn dropping_a_suspended_closure_restores_call_depth() {
    let mut rt = Runtime::new();
    rt.register_async("gate", |_| Box::pin(std::future::pending()));
    let function = rt.eval("fn(x,gate())").unwrap();
    let env = rt.global_env();
    let options = EvalOptions {
        max_depth: 1,
        ..Default::default()
    };
    let mut future = rt.call_with_options(function.clone(), vec![], env, &options);
    assert!(future
        .as_mut()
        .poll(&mut Context::from_waker(&noop_waker()))
        .is_pending());
    drop(future);
    rt.register("gate", |_| Ok(Value::Number(42.0)));
    assert_eq!(
        block_on(rt.call_with_options(function, vec![], env, &options)).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn reused_constructor_observes_body_and_parameter_edits() {
    let mut rt = Runtime::new();
    let options = EvalOptions::default();
    let mut ast = json!(["fn", ["[", "x"], ["add", "x", 1]]);
    let first = rt.eval_ast(&ast, &options).unwrap();
    // The body keeps the same address while its contents change.
    ast[2][2] = json!(2);
    let second = rt.eval_ast(&ast, &options).unwrap();
    rt.set_global("x", Value::Number(100.0));
    ast[1][1] = json!("y");
    let third = rt.eval_ast(&ast, &options).unwrap();
    assert_eq!(call(&mut rt, first, 40.0), Value::Number(41.0));
    assert_eq!(call(&mut rt, second, 40.0), Value::Number(42.0));
    assert_eq!(call(&mut rt, third, 40.0), Value::Number(102.0));
}

#[test]
fn shared_bodies_keep_distinct_captures_and_observe_live_bindings() {
    use indexmap::IndexMap;
    let mut rt = Runtime::new();
    let ast = parse("fn(x,add(x,offset))").unwrap();
    let options = EvalOptions::default();
    let first_env = rt.push_context(IndexMap::from([("offset".into(), Value::Number(1.0))]));
    let first = rt.eval_ast(&ast, &options).unwrap();
    rt.push_context(IndexMap::from([("offset".into(), Value::Number(2.0))]));
    let second = rt.eval_ast(&ast, &options).unwrap();
    rt.collect_garbage(&[first.clone(), second.clone()]);
    assert_eq!(call(&mut rt, first.clone(), 40.0), Value::Number(41.0));
    assert_eq!(call(&mut rt, second.clone(), 40.0), Value::Number(42.0));
    rt.assign(first_env, "offset", Value::Number(3.0)).unwrap();
    assert_eq!(call(&mut rt, first, 40.0), Value::Number(43.0));
    assert_eq!(call(&mut rt, second, 40.0), Value::Number(42.0));
}

#[test]
fn eviction_and_collection_do_not_resurrect_closures_or_literal_handles() {
    let mut rt = Runtime::new();
    let initial = rt.live_allocations();
    let options = EvalOptions::default();
    let sources: Vec<_> = (0..32)
        .map(|n| json!(["fn", "x", ["add", "x", n]]))
        .collect();
    let mut functions: Vec<_> = sources
        .iter()
        .map(|ast| rt.eval_ast(ast, &options).unwrap())
        .collect();
    functions.push(rt.eval_ast(&sources[0], &options).unwrap());
    rt.collect_garbage(&functions);
    for (n, function) in functions.iter().take(32).enumerate() {
        assert_eq!(
            call(&mut rt, function.clone(), 1.0),
            Value::Number((n + 1) as f64)
        );
    }
    assert_eq!(
        call(&mut rt, functions[32].clone(), 1.0),
        Value::Number(1.0)
    );

    let array = rt.array(vec![Value::Number(42.0)]);
    let ast = json!(["fn", "x", rt.ast_literal(array)]);
    let function = rt.eval_ast(&ast, &options).unwrap();
    let other = rt.eval_ast(&ast, &options).unwrap();
    rt.collect_garbage(&[function.clone(), other]);
    let result = call(&mut rt, function.clone(), 0.0);
    assert_eq!(rt.get(&result, "0"), Value::Number(42.0));
    rt.collect_garbage(&[]);
    assert_eq!(rt.live_allocations(), initial);
    let env = rt.global_env();
    assert_eq!(
        block_on(rt.call_value(function, vec![], env))
            .unwrap_err()
            .kind,
        "InvalidHandle"
    );
    let fresh = rt.eval_ast(&sources[0], &options).unwrap();
    assert_eq!(call(&mut rt, fresh, 41.0), Value::Number(41.0));
}
