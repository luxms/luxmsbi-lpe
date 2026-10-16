use futures::{channel::oneshot, executor::block_on, task::noop_waker};
use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::{json, Value as Json};
use std::{cell::RefCell, future::Future, pin::Pin, rc::Rc, task::Context};

fn equivalent(a: &Json, b: &Json) -> bool {
    match (a, b) {
        (Json::Number(a), Json::Number(b)) => a.as_f64() == b.as_f64(),
        (Json::Array(a), Json::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| equivalent(a, b))
        }
        (Json::Object(a), Json::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(key, a)| b.get(key).is_some_and(|b| equivalent(a, b)))
        }
        _ => a == b,
    }
}

fn call(runtime: &mut Runtime, function: Value, args: Vec<Value>) -> lpe::Result<Value> {
    let env = runtime.global_env();
    block_on(runtime.call_value(function, args, env))
}

#[test]
fn original_legacy_and_modern_js_closure_oracles() {
    let fixture: Json =
        serde_json::from_str(include_str!("../fixtures/closure-return.json")).unwrap();
    assert_eq!(fixture["provenance"]["legacyVersion"], "1.6.7");
    assert_eq!(fixture["provenance"]["modernVersion"], "1.7.3");
    let mut failures = Vec::new();
    for case in fixture["cases"].as_array().unwrap() {
        for (legacy, profile) in [(true, "legacy"), (false, "modern")] {
            let mut runtime = Runtime::new();
            runtime.set_legacy_context(legacy);
            let events = Rc::new(RefCell::new(Vec::new()));
            let recorded = events.clone();
            runtime.register_host("mark", move |runtime, args| {
                let value = args.first().cloned().unwrap_or(Value::Undefined);
                recorded.borrow_mut().push(runtime.to_json(&value).unwrap());
                Box::pin(async move { Ok(value) })
            });
            let options = EvalOptions::from_json(&case["options"]).unwrap();
            let mut actual = match runtime.eval_ast(&case["ast"], &options) {
                Ok(value) => json!({"value": runtime.to_json(&value).unwrap()}),
                Err(error) => json!({"error": error.message}),
            };
            actual["events"] = json!(*events.borrow());
            if !equivalent(&actual, &case[profile]) {
                failures.push(format!(
                    "{} {profile}: expected {}, got {actual}",
                    case["id"], case[profile]
                ));
            }
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn only_legacy_fn_defers_a_callable_result() {
    let options = EvalOptions::default();
    for legacy in [false, true] {
        let mut runtime = Runtime::new();
        runtime.set_legacy_context(legacy);
        let result = runtime
            .eval_ast(&json!([["fn", [], ["fn", [], 7]]]), &options)
            .unwrap();
        if legacy {
            assert!(result.is_callable());
            assert_eq!(
                call(&mut runtime, result, vec![]).unwrap(),
                Value::Number(7.0)
            );
        } else {
            assert_eq!(result, Value::Number(7.0));
        }
        for name in ["->fn", "toFn", "defFn", "=>", "lambda"] {
            let ast = if matches!(name, "=>" | "lambda") {
                json!([[name, ["tuple"], ["fn", [], 7]]])
            } else {
                json!([[name, ["fn", [], 7]]])
            };
            assert_eq!(
                runtime.eval_ast(&ast, &options).unwrap(),
                Value::Number(7.0)
            );
        }
    }
}

#[test]
fn creation_policy_survives_profile_switching() {
    for legacy_at_creation in [false, true] {
        let mut runtime = Runtime::new();
        runtime.set_legacy_context(legacy_at_creation);
        let factory = runtime
            .eval_ast(&json!(["fn", [], ["fn", [], 7]]), &EvalOptions::default())
            .unwrap();
        runtime.set_legacy_context(!legacy_at_creation);
        let returned = call(&mut runtime, factory, vec![]).unwrap();
        if legacy_at_creation {
            assert!(returned.is_callable());
            assert_eq!(
                call(&mut runtime, returned, vec![]).unwrap(),
                Value::Number(7.0)
            );
        } else {
            assert_eq!(returned, Value::Number(7.0));
        }
    }
}

#[test]
fn public_host_closure_constructor_keeps_existing_auto_call_behavior() {
    for legacy in [false, true] {
        let mut runtime = Runtime::new();
        runtime.set_legacy_context(legacy);
        let closure = runtime.closure(
            vec![],
            json!(["fn", [], 7]),
            runtime.global_env(),
            EvalOptions::default(),
        );
        assert_eq!(
            call(&mut runtime, closure, vec![]).unwrap(),
            Value::Number(7.0)
        );
    }
}

#[test]
fn returned_closure_keeps_lexical_scope_alive_across_gc_and_calls() {
    let mut runtime = Runtime::new();
    runtime.set_legacy_context(true);
    let returned = runtime
        .eval_ast(
            &json!([
                [
                    "fn",
                    ["captured"],
                    ["fn", ["n"], ["+", ["get", "captured", 0], "n"]]
                ],
                ["list", 40]
            ]),
            &EvalOptions::default(),
        )
        .unwrap();
    assert!(returned.is_callable());
    runtime.set_global("captured", Value::Number(900.0));
    for n in [1.0, 2.0, 3.0] {
        runtime.collect_garbage(std::slice::from_ref(&returned));
        assert_eq!(
            call(&mut runtime, returned.clone(), vec![Value::Number(n)]).unwrap(),
            Value::Number(40.0 + n)
        );
    }
    runtime.collect_garbage(&[]);
    assert_eq!(
        call(&mut runtime, returned, vec![]).unwrap_err().kind,
        "InvalidHandle"
    );
}

#[test]
fn effects_and_errors_start_only_on_explicit_invocation() {
    let mut runtime = Runtime::new();
    runtime.set_legacy_context(true);
    let events = Rc::new(RefCell::new(Vec::new()));
    let observed = events.clone();
    runtime.register("fail", move |_| {
        observed.borrow_mut().push("inner");
        Err(Error::new("ClosureFailure", "inner failure"))
    });
    let returned = runtime
        .eval_ast(
            &json!([["fn", [], ["fn", [], ["fail"]]]]),
            &EvalOptions::default(),
        )
        .unwrap();
    assert!(events.borrow().is_empty());
    let error = call(&mut runtime, returned, vec![]).unwrap_err();
    assert_eq!(error.kind, "ClosureFailure");
    assert_eq!(error.message, "inner failure");
    assert_eq!(*events.borrow(), vec!["inner"]);
    let error = runtime
        .eval_ast(&json!([["fn", [], ["fail"]]]), &EvalOptions::default())
        .unwrap_err();
    assert_eq!(error.kind, "ClosureFailure");
    assert_eq!(*events.borrow(), vec!["inner", "inner"]);
    assert_eq!(runtime.eval("2+3").unwrap(), Value::Number(5.0));
}

#[test]
fn returned_body_obeys_the_captured_budget_without_running_at_creation() {
    let mut runtime = Runtime::new();
    runtime.set_legacy_context(true);
    let mut body = vec![json!("begin")];
    body.extend((0..100).map(|_| json!(["+", 1, 1])));
    let options = EvalOptions {
        max_steps: 32,
        ..Default::default()
    };
    let returned = runtime
        .eval_ast(&json!([["fn", [], ["fn", [], body]]]), &options)
        .unwrap();
    let call = json!([runtime.ast_literal(returned)]);
    assert_eq!(
        runtime.eval_ast(&call, &options).unwrap_err().kind,
        "LimitError"
    );
    assert_eq!(runtime.eval("2+3").unwrap(), Value::Number(5.0));
}

fn poll_once<F: Future + ?Sized>(future: Pin<&mut F>) -> std::task::Poll<F::Output> {
    future.poll(&mut Context::from_waker(&noop_waker()))
}

#[test]
fn suspended_task_preserves_legacy_creation_policy_and_cancellation() {
    for cancel in [false, true] {
        let mut runtime = Runtime::new();
        runtime.set_legacy_context(true);
        let (tx, rx) = oneshot::channel();
        let rx = RefCell::new(Some(rx));
        runtime.register_async("gate", move |_| {
            let rx = rx.borrow_mut().take().expect("gate called once");
            Box::pin(async move { rx.await.unwrap() })
        });
        let events = Rc::new(RefCell::new(Vec::new()));
        let observed = events.clone();
        runtime.register("effect", move |_| {
            observed.borrow_mut().push("inner");
            Ok(Value::Number(7.0))
        });
        let token = runtime.cancellation_token();
        // identity evaluates its argument in a task facade, and the closure
        // body suspends before creating the returned function.
        let ast = json!([
            "identity",
            [["fn", [], ["begin", ["gate"], ["fn", [], ["effect"]]]]]
        ]);
        let options = EvalOptions::default();
        let mut pending = Box::pin(runtime.eval_async(&ast, &options));
        assert!(poll_once(pending.as_mut()).is_pending());
        assert!(events.borrow().is_empty());
        if cancel {
            token.store(true, std::sync::atomic::Ordering::Relaxed);
        } else {
            tx.send(Ok(Value::Null)).unwrap();
        }
        let result = block_on(pending);
        assert!(events.borrow().is_empty());
        if cancel {
            assert_eq!(result.unwrap_err().kind, "Cancelled");
        } else {
            let returned = result.unwrap();
            assert!(returned.is_callable());
            assert_eq!(
                call(&mut runtime, returned, vec![]).unwrap(),
                Value::Number(7.0)
            );
            assert_eq!(*events.borrow(), vec!["inner"]);
        }
    }
}
