use futures::{channel::oneshot, executor::block_on, task::noop_waker};
use indexmap::IndexMap;
use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::{json, Value as Json};
use std::cell::RefCell;
use std::rc::Rc;
use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};

fn fixture() -> Json {
    serde_json::from_str(include_str!("../fixtures/legacy-context.json")).unwrap()
}

fn outcome(rt: &Runtime, result: lpe::Result<Value>) -> Json {
    match result {
        Ok(value) => json!({"value": rt.to_json(&value).unwrap()}),
        Err(error) => json!({"error": error.message}),
    }
}

// JSON distinguishes integer/floating encodings; the JS oracle has one Number type.
fn equivalent(actual: &Json, expected: &Json) -> bool {
    match (actual, expected) {
        (Json::Number(a), Json::Number(b)) => a.as_f64() == b.as_f64(),
        (Json::Array(a), Json::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| equivalent(a, b))
        }
        (Json::Object(a), Json::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(key, a)| b.get(key).is_some_and(|b| equivalent(a, b)))
        }
        _ => actual == expected,
    }
}

#[test]
fn original_js_1_6_7_ast_oracle() {
    let fixture = fixture();
    assert_eq!(fixture["provenance"]["jsVersion"], "1.6.7");
    let mut failures = vec![];
    for case in fixture["cases"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|c| c["kind"] == "ast")
    {
        let mut rt = Runtime::new();
        rt.set_legacy_context(true);
        rt.set_context(&case["context"]).unwrap();
        let options = EvalOptions::from_json(&case["options"]).unwrap();
        let result = rt.eval_ast(&case["ast"], &options);
        let actual = outcome(&rt, result);
        if !equivalent(&actual, &case["expected"]) {
            failures.push(format!(
                "{}: expected {}, got {actual}",
                case["id"], case["expected"]
            ));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn original_js_1_6_7_getter_setter_effect_order_oracle() {
    let mut failures = vec![];
    for case in fixture()["cases"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|c| c["kind"] == "host")
    {
        let mut rt = Runtime::new();
        rt.set_legacy_context(true);
        let events = Rc::new(RefCell::new(vec![]));
        let written = Rc::new(RefCell::new(Value::Undefined));
        let getter = case.get("getter").cloned().unwrap_or(json!([4]));
        let getter = Rc::new(RefCell::new(
            getter
                .as_array()
                .unwrap()
                .iter()
                .map(|v| rt.from_json(v))
                .collect::<Vec<_>>(),
        ));
        let error = case["error"].as_str().unwrap_or("").to_owned();
        let rhs_events = events.clone();
        let rhs_getter = getter.clone();
        let rhs_error = error.clone();
        let update = case["rhsUpdatesGetter"] == true;
        rt.register("rhs", move |_| {
            rhs_events.borrow_mut().push(json!({"event": "rhs"}));
            if rhs_error == "rhs" {
                return Err(Error::new("Error", "rhs failure"));
            }
            if update {
                *rhs_getter.borrow_mut() = vec![Value::Number(6.0)];
            }
            Ok(Value::Number(8.0))
        });
        let reads = Rc::new(RefCell::new(0));
        let resolver_events = events.clone();
        let resolver_written = written.clone();
        let setter = rt.from_json(case.get("setter").unwrap_or(&json!(9)));
        rt.register_host("resolver", move |rt, args| {
            let result = if args[0] != Value::String("x".into()) {
                Ok(Value::Undefined)
            } else {
                let event = if args[1] == Value::Undefined {
                    "get"
                } else {
                    "set"
                };
                resolver_events.borrow_mut().push(json!({
                    "event": event, "value": rt.to_json(&args[1]).unwrap(),
                    "options": rt.to_json(&args[2]).unwrap(),
                }));
                if error == event {
                    Err(Error::new("Error", format!("{event} failure")))
                } else if event == "get" {
                    let getter = getter.borrow();
                    let mut reads = reads.borrow_mut();
                    let value = getter[(*reads).min(getter.len() - 1)].clone();
                    *reads += 1;
                    Ok(value)
                } else {
                    *resolver_written.borrow_mut() = args[1].clone();
                    Ok(setter.clone())
                }
            };
            Box::pin(async move { result })
        });
        let options = EvalOptions::default();
        let resolver = rt
            .lookup(rt.global_env(), "resolver", &options, true)
            .unwrap();
        let resolver = rt.ast_literal(resolver);
        let mut ast = vec![case["op"].clone(), json!("x")];
        if case["missingRhs"] != true {
            ast.push(if case["read"] == true {
                json!(["get", {}, ["q", "missing"]])
            } else {
                json!(["rhs"])
            });
        }
        let mut ast = Json::Array(ast);
        if case["nested"] == true || case.get("shadow").is_some() {
            let key = if case.get("shadow").is_some() {
                "x"
            } else {
                "unused"
            };
            let value = if case["shadow"] == "null" {
                Json::Null
            } else {
                json!(["get", {}, ["q", "missing"]])
            };
            ast = json!(["let", [[key, value]], ast]);
        }
        let result = rt.eval_ast(&json!(["let", resolver, ast]), &options);
        let mut actual = outcome(&rt, result);
        actual["events"] = json!(*events.borrow());
        actual["written"] = rt.to_json(&written.borrow()).unwrap();
        if !equivalent(&actual, &case["expected"]) {
            failures.push(format!(
                "{}: expected {}, got {actual}",
                case["id"], case["expected"]
            ));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn default_profile_and_switching_back_keep_original_behavior() {
    let mut rt = Runtime::new();
    let options = EvalOptions::default();
    let ast = json!(["let", [["f", ["fn", [], 4]]], "f"]);
    assert!(rt.eval_ast(&ast, &options).unwrap().is_callable());
    rt.set_legacy_context(true);
    assert_eq!(
        rt.eval_ast(&ast, &options).unwrap(),
        Value::String("f".into())
    );
    rt.set_legacy_context(false);
    assert!(rt.eval_ast(&ast, &options).unwrap().is_callable());
    let env = rt.global_env();
    assert_eq!(
        block_on(rt.assign_async(env, "new", Value::Number(3.0), &options)).unwrap(),
        Value::Number(3.0)
    );
    assert_eq!(
        block_on(rt.assign_async(env, "new", Value::Undefined, &options)).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        rt.lookup(env, "new", &options, true).unwrap(),
        Value::Undefined
    );
}

#[test]
fn raw_lookup_remains_callable_and_undefined_own_slots_fall_through() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    let options = EvalOptions {
        resolve_string: false,
        disallow_lib_functions_getting: true,
        ..Default::default()
    };
    rt.set_global("x", Value::Number(2.0));
    let object = rt.object(IndexMap::from([("x".into(), Value::Undefined)]));
    let env = rt
        .env_from_value(object.clone(), vec![rt.global_env()])
        .unwrap();
    for callable in [false, true] {
        assert_eq!(
            rt.lookup(env, "x", &options, callable).unwrap(),
            Value::Number(2.0)
        );
        assert_eq!(
            block_on(rt.lookup_async(env, "x", &options, callable)).unwrap(),
            Value::Number(2.0)
        );
        assert!(rt
            .lookup(env, "add", &options, callable)
            .unwrap()
            .is_callable());
    }
    assert_eq!(
        block_on(rt.assign_async(env, "x", Value::Number(8.0), &options)).unwrap(),
        Value::Number(8.0)
    );
    assert_eq!(rt.get(&object, "x"), Value::Undefined);
    assert!(rt.has_own(&object, "x"));
    assert_eq!(
        rt.lookup(rt.global_env(), "x", &options, true).unwrap(),
        Value::Number(8.0)
    );
}

#[test]
fn library_writes_are_explicitly_unsupported_not_silently_shadowed() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    for name in ["add", "null", "Hashmap"] {
        let error = rt
            .eval_ast(&json!(["def", name, 8]), &EvalOptions::default())
            .unwrap_err();
        assert_eq!(error.kind, "Unsupported");
        assert_eq!(
            error.message,
            format!("Legacy assignment cannot mutate library binding {name}")
        );
    }
    assert_eq!(rt.eval("add(2,3)").unwrap(), Value::Number(5.0));
    assert!(rt
        .eval_ast(
            &json!(["def", "add", ["get", {}, "missing"]]),
            &EvalOptions::default()
        )
        .unwrap()
        .is_callable());
    rt.set_global("add", Value::Null);
    assert_eq!(
        rt.eval_ast(&json!(["def", "add", 8]), &EvalOptions::default())
            .unwrap(),
        Value::Number(8.0)
    );
}

#[test]
fn authoritative_hook_masks_do_not_leak_native_library_names() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    let env = rt.global_env();
    rt.set_lookup_hook(env, |name, _| {
        Ok((name == "range").then_some(Value::Undefined))
    })
    .unwrap();
    let options = EvalOptions::default();
    assert_eq!(
        rt.lookup(env, "range", &options, true).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        block_on(rt.assign_async(env, "range", Value::Undefined, &options)).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        block_on(rt.assign_async(env, "range", Value::Number(7.0), &options)).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        rt.lookup(env, "range", &options, true).unwrap(),
        Value::Number(7.0)
    );
}

fn poll_once<F: Future + ?Sized>(future: Pin<&mut F>) -> Poll<F::Output> {
    future.poll(&mut Context::from_waker(&noop_waker()))
}

fn ready_within<F: Future + ?Sized>(mut future: Pin<&mut F>) -> F::Output {
    for _ in 0..8 {
        if let Poll::Ready(value) = poll_once(future.as_mut()) {
            return value;
        }
    }
    panic!("still pending after eight polls");
}

#[test]
fn suspended_rhs_getter_setter_run_once_in_order_in_task_facades() {
    for op in ["def", "assign", ":="] {
        let mut rt = Runtime::new();
        rt.set_legacy_context(true);
        let events = Rc::new(RefCell::new(vec![]));
        let (rhs_tx, rhs_rx) = oneshot::channel();
        let rhs_rx = RefCell::new(Some(rhs_rx));
        let rhs_events = events.clone();
        rt.register_async("rhs", move |_| {
            rhs_events.borrow_mut().push("rhs");
            let rx = rhs_rx.borrow_mut().take().expect("RHS runs once");
            Box::pin(async move { rx.await.unwrap() })
        });
        let (get_tx, get_rx) = oneshot::channel();
        let (set_tx, set_rx) = oneshot::channel();
        let get_rx = RefCell::new(Some(get_rx));
        let set_rx = RefCell::new(Some(set_rx));
        let resolver_events = events.clone();
        rt.register_host("resolver", move |rt, args| {
            if args[0] != Value::String("x".into()) {
                return Box::pin(async { Ok(Value::Undefined) });
            }
            assert_eq!(rt.to_json(&args[2]).unwrap(), json!({}));
            rt.collect_garbage(&[]);
            let rx = if args[1] == Value::Undefined {
                resolver_events.borrow_mut().push("get");
                get_rx.borrow_mut().take().expect("getter runs once")
            } else {
                assert_eq!(args[1], Value::Number(8.0));
                resolver_events.borrow_mut().push("set");
                set_rx.borrow_mut().take().expect("setter runs once")
            };
            Box::pin(async move { rx.await.unwrap() })
        });
        let options = EvalOptions {
            resolve_string: false,
            disallow_lib_functions_getting: true,
            ..Default::default()
        };
        let resolver = rt
            .lookup(rt.global_env(), "resolver", &options, true)
            .unwrap();
        let resolver = rt.ast_literal(resolver);
        // An ordinary call evaluates its argument through a runtime task facade.
        let ast = json!(["identity", ["let", resolver, [op, "x", ["rhs"]]]]);
        let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
        assert!(poll_once(evaluation.as_mut()).is_pending());
        assert_eq!(*events.borrow(), vec!["rhs"]);
        rhs_tx.send(Ok(Value::Number(8.0))).unwrap();
        assert!(poll_once(evaluation.as_mut()).is_pending());
        assert_eq!(*events.borrow(), vec!["rhs", "get"]);
        assert!(poll_once(evaluation.as_mut()).is_pending());
        assert_eq!(*events.borrow(), vec!["rhs", "get"]);
        get_tx.send(Ok(Value::Number(4.0))).unwrap();
        assert!(poll_once(evaluation.as_mut()).is_pending());
        assert_eq!(*events.borrow(), vec!["rhs", "get", "set"]);
        set_tx.send(Ok(Value::Number(17.0))).unwrap();
        assert_eq!(
            ready_within(evaluation.as_mut()).unwrap(),
            Value::Number(17.0)
        );
        assert_eq!(*events.borrow(), vec!["rhs", "get", "set"]);
    }
}

#[test]
fn getter_rejection_and_cancellation_do_not_start_a_setter() {
    for cancel in [false, true] {
        let mut rt = Runtime::new();
        rt.set_legacy_context(true);
        let (tx, rx) = oneshot::channel::<lpe::Result<Value>>();
        let rx = RefCell::new(Some(rx));
        rt.register_host("resolver", move |_, args| {
            if args[0] != Value::String("x".into()) {
                return Box::pin(async { Ok(Value::Undefined) });
            }
            assert_eq!(args[1], Value::Undefined, "setter must not run");
            let rx = rx.borrow_mut().take().expect("getter runs once");
            Box::pin(async move { rx.await.unwrap() })
        });
        let options = EvalOptions::default();
        let resolver = rt
            .lookup(rt.global_env(), "resolver", &options, true)
            .unwrap();
        let ast = json!(["let", rt.ast_literal(resolver), ["def", "x", 8]]);
        let token = rt.cancellation_token();
        let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
        assert!(poll_once(evaluation.as_mut()).is_pending());
        if cancel {
            token.store(true, std::sync::atomic::Ordering::Relaxed);
        } else {
            tx.send(Err(Error::new("TestError", "getter rejected")))
                .unwrap();
        }
        let error = ready_within(evaluation.as_mut()).unwrap_err();
        assert_eq!(error.kind, if cancel { "Cancelled" } else { "TestError" });
    }
}

#[test]
fn assign_async_roots_compound_rhs_and_environment_across_host_gc() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    rt.register_host("resolver", |rt, args| {
        rt.collect_garbage(&[]);
        let result = if args[1] == Value::Undefined {
            Value::Number(4.0)
        } else {
            assert!(equivalent(
                &rt.to_json(&args[1]).unwrap(),
                &json!({"payload": [8]})
            ));
            Value::Number(9.0)
        };
        Box::pin(async move { Ok(result) })
    });
    let options = EvalOptions::default();
    let resolver = rt
        .lookup(rt.global_env(), "resolver", &options, true)
        .unwrap();
    let env = rt.env_from_value(resolver, vec![]).unwrap();
    let rhs = rt.from_json(&json!({"payload": [8]}));
    assert_eq!(
        block_on(rt.assign_async(env, "x", rhs.clone(), &options)).unwrap(),
        Value::Number(9.0)
    );
    rt.collect_garbage(&[]);
    assert!(
        rt.to_json(&rhs).is_err(),
        "assignment roots are released on completion"
    );
}

#[test]
fn assignment_uses_existing_step_budget_and_bounds_context_recursion() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    rt.set_global("x", Value::Number(1.0));
    rt.register_special("assign_many", |rt, _, env, options| {
        Box::pin(async move {
            for i in 0..100 {
                rt.assign_async(env, "x", Value::Number(i.into()), &options)
                    .await?;
            }
            Ok(Value::Null)
        })
    });
    let options = EvalOptions {
        max_steps: 20,
        ..Default::default()
    };
    let error = rt.eval_ast(&json!(["assign_many"]), &options).unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert_eq!(error.message, "Evaluation step limit exceeded");
    // Top-level evaluation is the only budget reset, not assign_async.
    assert_eq!(rt.eval("1").unwrap(), Value::Number(1.0));
    let options = EvalOptions {
        max_depth: 2,
        ..Default::default()
    };
    let mut env = rt.global_env();
    for _ in 0..4 {
        env = rt.new_env(IndexMap::new(), vec![env]);
    }
    let error = block_on(rt.assign_async(env, "x", Value::Number(8.0), &options)).unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert_eq!(error.message, "Assignment context depth exceeded");
}

#[test]
fn synchronous_object_assignment_does_not_dispatch_function_contexts() {
    let mut rt = Runtime::new();
    rt.register("resolver", |_| {
        panic!("synchronous object-only assignment must not call a getter/setter")
    });
    let options = EvalOptions::default();
    let resolver = rt
        .lookup(rt.global_env(), "resolver", &options, true)
        .unwrap();
    let env = rt.env_from_value(resolver, vec![rt.global_env()]).unwrap();
    assert_eq!(
        rt.assign(env, "x", Value::Number(8.0)).unwrap(),
        Value::Number(8.0)
    );
    assert_eq!(
        rt.lookup(env, "x", &options, false).unwrap(),
        Value::Number(8.0)
    );
}

#[test]
fn list_assignment_shorthand_remains_a_documented_external_boundary() {
    for case in fixture()["boundaries"].as_array().unwrap() {
        let mut rt = Runtime::new();
        rt.set_legacy_context(true);
        let result = rt.eval_ast(&case["ast"], &EvalOptions::default());
        let actual = outcome(&rt, result);
        assert!(equivalent(&actual, &case["native"]));
        assert!(!equivalent(&actual, &case["js"]));
    }
}

#[test]
fn stream_assignment_preserves_default_unboxing_and_legacy_identity() {
    for legacy in [false, true] {
        for case in fixture()["streamAssignments"].as_array().unwrap() {
            let mut rt = Runtime::new();
            rt.set_legacy_context(legacy);
            let input = rt.create_stream(Value::Number(2.0));
            rt.set_global("input", input.clone());
            rt.set_global("bound", Value::Number(0.0));
            let options = EvalOptions::default();
            let result = rt
                .eval_ast(&json!([case["op"], "bound", "input"]), &options)
                .unwrap();
            let unboxes = !legacy && case["op"] == "def";
            let bound = rt
                .lookup(rt.global_env(), "bound", &options, false)
                .unwrap();
            if unboxes {
                assert_ne!(result, input);
                assert_eq!(bound, Value::Number(2.0));
            } else {
                assert_eq!(result, input);
                assert_eq!(bound, input);
                assert_eq!(rt.stream_stats(&input).unwrap().listeners, 0);
                assert_eq!(rt.stream_stats(&input).unwrap().references, 1);
            }
            rt.stream_next(&input, Value::Number(6.0)).unwrap();
            let bound = rt
                .lookup(rt.global_env(), "bound", &options, false)
                .unwrap();
            if unboxes {
                assert_eq!(bound, Value::Number(6.0));
                assert_eq!(rt.stream_value(&result).unwrap(), Value::Number(6.0));
                rt.stream_release(&result).unwrap();
            } else if legacy {
                let observed = json!({
                    "sameResult": result == input,
                    "sameBinding": bound == input,
                    "value": rt.to_json(&rt.stream_value(&bound).unwrap()).unwrap(),
                    "events": [],
                });
                assert!(equivalent(&observed, &case["expected"]));
            }
        }
    }
}
