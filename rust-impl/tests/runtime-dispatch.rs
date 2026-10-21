use futures::executor::block_on;
use indexmap::IndexMap;
use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::{json, Value as Json};
use std::{cell::RefCell, rc::Rc};

fn encode(rt: &Runtime, value: &Value) -> Json {
    match value {
        Value::Undefined => json!({"$lpe": "undefined"}),
        Value::Array(_) => Json::Array(
            rt.array_values(value)
                .unwrap()
                .iter()
                .map(|item| encode(rt, item))
                .collect(),
        ),
        _ => rt.to_json(value).unwrap(),
    }
}

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
fn current_js_dispatch_and_assignment_oracle_with_fast_and_full_paths() {
    let fixture: Json =
        serde_json::from_str(include_str!("../fixtures/runtime-dispatch.json")).unwrap();
    for case in fixture["cases"].as_array().unwrap() {
        for legacy in [false, true] {
            if legacy && case["legacy"] != true {
                continue;
            }
            for full_path in [false, true] {
                let mut rt = Runtime::new();
                rt.set_legacy_context(legacy);
                rt.set_context(&case["context"]).unwrap();
                if full_path {
                    rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                        .unwrap();
                }
                let events = Rc::new(RefCell::new(Vec::new()));
                let log = events.clone();
                rt.register_host("mark", move |rt, args| {
                    log.borrow_mut().push(json!(["mark", encode(rt, &args[0])]));
                    let value = args[0].clone();
                    Box::pin(async move { Ok(value) })
                });
                let config = case["resolver"].clone();
                let log = events.clone();
                rt.register_sync_host("resolver", move |rt, args| {
                    let config = config.clone();
                    let log = log.clone();
                    (|| {
                        if args[0] != Value::String("x".into()) {
                            Ok(Value::Undefined)
                        } else {
                            assert_eq!(args[1], Value::Undefined);
                            let resolve = rt.get(&args[2], "resolveString") == Value::Bool(true);
                            let disallow = rt.get(&args[2], "disallowLibFunctionsGetting")
                                == Value::Bool(true);
                            log.borrow_mut().push(json!([
                                "resolve", {"$lpe": "undefined"}, resolve, disallow
                            ]));
                            if config["error"] == true {
                                Err(Error::new("Error", "resolver-error"))
                            } else if (config["options"] == true && !resolve)
                                || config["result"]["$lpe"] == "undefined"
                            {
                                Ok(Value::Undefined)
                            } else {
                                Ok(rt.from_json(&config["result"]))
                            }
                        }
                    })()
                });
                let options = if case.get("options").is_some() {
                    EvalOptions::from_json(&case["options"]).unwrap()
                } else {
                    EvalOptions::default()
                };
                let result = if full_path {
                    block_on(rt.eval_async(&case["ast"], &options))
                } else {
                    rt.eval_ast(&case["ast"], &options)
                };
                let actual = match result {
                    Ok(value) => json!({"value": encode(&rt, &value), "events": *events.borrow()}),
                    Err(error) => json!({"error": error.message, "events": *events.borrow()}),
                };
                assert!(
                    equivalent(&actual, &case["expected"]),
                    "{} legacy={legacy} full_path={full_path}: {actual} != {}",
                    case["id"],
                    case["expected"]
                );
            }
        }
    }
}

#[test]
fn current_assignment_skips_callable_frames_for_new_bindings_and_library_writes() {
    let mut rt = Runtime::new();
    rt.register("resolver", |_| Ok(Value::Undefined));
    let options = EvalOptions::default();
    let callback = rt
        .lookup(rt.global_env(), "resolver", &options, true)
        .unwrap();
    let env = rt.env_from_value(callback, vec![]).unwrap();
    assert_eq!(
        block_on(rt.assign_async(env, "x", Value::Number(8.0), &options))
            .unwrap_err()
            .kind,
        "ScopeError"
    );
    let library = rt.new_env(IndexMap::from([("x".into(), Value::Number(1.0))]), vec![]);
    rt.mark_library(library).unwrap();
    let writable = rt.new_env(IndexMap::new(), vec![library]);
    assert_eq!(
        block_on(rt.assign_async(writable, "x", Value::Undefined, &options)).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        rt.lookup(writable, "x", &options, false).unwrap(),
        Value::Undefined
    );
    assert_eq!(
        rt.lookup(library, "x", &options, false).unwrap(),
        Value::Number(1.0)
    );
}

#[test]
fn function_context_gc_preserves_rhs_for_fallthrough_and_options_for_lookup() {
    let mut rt = Runtime::new();
    rt.register_host("resolver", |rt, args| {
        rt.collect_garbage(&[]);
        assert_eq!(rt.get(&args[2], "resolveString"), Value::Bool(true));
        Box::pin(async { Ok(Value::Undefined) })
    });
    let options = EvalOptions::default();
    let callback = rt
        .lookup(rt.global_env(), "resolver", &options, true)
        .unwrap();
    let env = rt.env_from_value(callback, vec![rt.global_env()]).unwrap();
    let rhs = rt.array(vec![Value::Number(8.0)]);
    let value = block_on(rt.assign_async(env, "x", rhs, &options)).unwrap();
    assert_eq!(rt.array_values(&value).unwrap(), vec![Value::Number(8.0)]);
    assert_eq!(
        rt.lookup(rt.global_env(), "x", &options, false).unwrap(),
        value
    );
}
