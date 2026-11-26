use futures::executor::block_on;
use indexmap::IndexMap;
use lpe::{EnvId, EvalOptions, Runtime, RuntimeControls, RuntimeLimits, Value};
use serde_json::json;
use std::sync::atomic::Ordering;

fn lookup(rt: &mut Runtime, env: EnvId, name: &str) -> Value {
    rt.lookup(env, name, &EvalOptions::default(), true).unwrap()
}

#[test]
fn library_before_request_deletes_library_fn_and_isolates_fresh_runtimes() {
    for full in [false, true] {
        for disallow in [false, true] {
            let mut control = Runtime::new();
            let mut rt = Runtime::new();
            let library = rt.library_env();
            let request_fn = rt.closure(
                vec!["x".into()],
                json!(["add", "x", 1]),
                rt.global_env(),
                EvalOptions::default(),
            );
            let request = rt.new_env(IndexMap::from([("fn".into(), request_fn.clone())]), vec![]);
            let env = rt.new_env(IndexMap::new(), vec![library, request]);
            if full {
                rt.set_lookup_hook(env, |_, _| Ok(None)).unwrap();
            }
            let options = EvalOptions {
                disallow_lib_functions_getting: disallow,
                ..Default::default()
            };
            assert_eq!(lookup(&mut rt, env, "fn"), Value::Special("fn".into()));
            let result =
                block_on(rt.eval_in(&json!(["list", ["undef", "fn"], ["fn", 41]]), env, &options))
                    .unwrap();
            assert_eq!(
                rt.array_values(&result).unwrap(),
                vec![Value::Special("fn".into()), Value::Number(42.0)]
            );
            assert_eq!(lookup(&mut rt, request, "fn"), request_fn);
            assert_eq!(lookup(&mut rt, library, "fn"), Value::String("fn".into()));
            assert_eq!(
                block_on(rt.eval_in(&json!(["fn", 41]), env, &options)).unwrap(),
                Value::Number(42.0)
            );
            assert_eq!(rt.undefine(env, "fn"), request_fn);
            assert_eq!(rt.undefine(env, "fn"), Value::Undefined);
            for fresh in [&mut control, &mut Runtime::new()] {
                assert_eq!(
                    fresh.eval("fn(x, add(x, 1))(41)").unwrap(),
                    Value::Number(42.0)
                );
            }
        }
    }
}

#[test]
fn begin_resolves_deleted_builtins_again_before_calling_a_fallback() {
    for name in ["count", "length"] {
        for controlled in [false, true] {
            let mut rt = Runtime::new();
            if controlled {
                rt.set_controls(Some(RuntimeControls::new(RuntimeLimits::default())))
                    .unwrap();
            }
            let library = rt.library_env();
            let operator = name.to_owned();
            rt.register_sync_host("sql_fallback", move |rt, args| {
                Ok(Value::String(format!(
                    "{operator}({})",
                    rt.to_string(&args[0])
                )))
            });
            let global = rt.global_env();
            let fallback = lookup(&mut rt, global, "sql_fallback");
            let request = rt.new_env(IndexMap::from([(name.into(), fallback)]), vec![]);
            let env = rt.new_env(IndexMap::new(), vec![library, request]);
            let body = json!(["begin", ["undef", name], [name, ["[", 1, 2, 3]]]);
            let query = rt.closure(vec![], body, env, EvalOptions::default());
            rt.set_global("query", query);
            assert_eq!(
                rt.eval(&format!("{name}([1, 2, 3])")).unwrap(),
                Value::Number(3.0)
            );
            assert_eq!(
                rt.eval("query()").unwrap(),
                Value::String(format!("{name}(1,2,3)"))
            );
            assert_eq!(lookup(&mut rt, library, name), Value::String(name.into()));
            assert_eq!(
                Runtime::new().eval(&format!("{name}([1, 2, 3])")).unwrap(),
                Value::Number(3.0)
            );
        }
    }
}

#[test]
fn library_overrides_must_replace_displaced_bindings_to_delete_in_one_step() {
    for name in ["count", "length"] {
        for remove_displaced in [false, true] {
            for controlled in [false, true] {
                let mut rt = Runtime::new();
                if controlled {
                    rt.set_controls(Some(RuntimeControls::new(RuntimeLimits::default())))
                        .unwrap();
                }
                let library = rt.library_env();
                if remove_displaced {
                    assert_eq!(rt.undefine(library, name), Value::Builtin(name.into()));
                }
                rt.register_sync_host(name, |_, _| Ok(Value::Number(99.0)));
                let overlay = rt.global_env();
                let replacement = lookup(&mut rt, overlay, name);
                rt.mark_library(overlay).unwrap();
                rt.push_context(IndexMap::new());
                let operator = name.to_owned();
                rt.register_sync_host("sql_fallback", move |rt, args| {
                    Ok(Value::String(format!(
                        "{operator}({})",
                        rt.to_string(&args[0])
                    )))
                });
                let global = rt.global_env();
                let fallback = lookup(&mut rt, global, "sql_fallback");
                let request = rt.new_env(IndexMap::from([(name.into(), fallback)]), vec![]);
                let env = rt.new_env(IndexMap::new(), vec![overlay, request]);
                let body = json!(["list", ["undef", name], [name, ["[", 1, 2, 3]]]);
                let query = rt.closure(vec![], body, env, EvalOptions::default());
                rt.set_global("query", query);
                assert_eq!(
                    rt.eval(&format!("{name}([1, 2, 3])")).unwrap(),
                    Value::Number(99.0)
                );
                let first = rt.eval("query()").unwrap();
                let sql = Value::String(format!("{name}(1,2,3)"));
                assert_eq!(
                    rt.array_values(&first).unwrap(),
                    vec![
                        replacement,
                        if remove_displaced {
                            sql.clone()
                        } else {
                            Value::Number(3.0)
                        }
                    ]
                );
                if !remove_displaced {
                    // Distinct owning frames require distinct deletions, even
                    // when the host marks both frames as libraries.
                    let second = rt.eval("query()").unwrap();
                    assert_eq!(
                        rt.array_values(&second).unwrap(),
                        vec![Value::Builtin(name.into()), sql]
                    );
                }
                assert_eq!(
                    Runtime::new().eval(&format!("{name}([1, 2, 3])")).unwrap(),
                    Value::Number(3.0)
                );
            }
        }
    }
}

#[test]
fn marked_frames_delete_ordinary_values_and_functions_in_context_order() {
    let mut rt = Runtime::new();
    rt.register("host", |_| Ok(Value::Number(42.0)));
    let global = rt.global_env();
    let host = lookup(&mut rt, global, "host");
    for value in [
        Value::Undefined,
        Value::Null,
        Value::Bool(false),
        Value::Number(0.0),
        Value::String("value".into()),
        Value::Builtin("add".into()),
        Value::Special("if".into()),
        rt.object(IndexMap::from([("x".into(), Value::Number(1.0))])),
        host,
    ] {
        for backed in [false, true] {
            let values = IndexMap::from([("entry".into(), value.clone())]);
            let library = if backed {
                let object = rt.object(values);
                rt.env_from_value(object, vec![]).unwrap()
            } else {
                rt.new_env(values, vec![])
            };
            rt.mark_library(library).unwrap();
            let request = rt.new_env(
                IndexMap::from([("entry".into(), Value::Number(9.0))]),
                vec![],
            );
            let left = rt.new_env(IndexMap::new(), vec![library]);
            let right = rt.new_env(IndexMap::new(), vec![library, request]);
            let env = rt.new_env(IndexMap::new(), vec![left, right]);
            assert_eq!(lookup(&mut rt, env, "entry"), value);
            assert_eq!(rt.undefine(env, "entry"), value);
            assert_eq!(lookup(&mut rt, env, "entry"), Value::Number(9.0));
            assert_eq!(rt.undefine(env, "entry"), Value::Number(9.0));
            assert_eq!(rt.undefine(env, "entry"), Value::Undefined);
        }
    }
}

#[test]
fn own_undefined_stops_deletion_even_when_legacy_lookup_falls_through() {
    for legacy in [false, true] {
        for backed in [false, true] {
            let mut rt = Runtime::new();
            rt.set_legacy_context(legacy);
            let parent = rt.new_env(IndexMap::from([("x".into(), Value::Number(7.0))]), vec![]);
            let values = IndexMap::from([("x".into(), Value::Undefined)]);
            let env = if backed {
                let object = rt.object(values);
                rt.env_from_value(object, vec![parent]).unwrap()
            } else {
                rt.new_env(values, vec![parent])
            };
            assert_eq!(rt.undefine(env, "x"), Value::Undefined);
            assert_eq!(lookup(&mut rt, parent, "x"), Value::Number(7.0));
            assert_eq!(lookup(&mut rt, env, "x"), Value::Number(7.0));
        }
    }
}

#[test]
fn lexical_shadows_are_removed_before_library_bindings() {
    for legacy in [false, true] {
        for full in [false, true] {
            let mut rt = Runtime::new();
            rt.set_legacy_context(legacy);
            if full {
                rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                    .unwrap();
            }
            for ast in [
                json!([
                    "let",
                    [["add", 99]],
                    ["list", ["undef", "add"], ["add", 2, 3]]
                ]),
                json!([
                    ["fn", ["add"], ["list", ["undef", "add"], ["add", 2, 3]]],
                    99
                ]),
            ] {
                let result = rt.eval_ast(&ast, &EvalOptions::default()).unwrap();
                assert_eq!(
                    rt.array_values(&result).unwrap(),
                    vec![Value::Number(99.0), Value::Number(5.0)]
                );
                assert_eq!(rt.eval("add(2, 3)").unwrap(), Value::Number(5.0));
            }
        }
    }
}

#[test]
fn copied_special_forms_survive_deletion_and_collection() {
    for full in [false, true] {
        let mut rt = Runtime::new();
        if full {
            rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                .unwrap();
        }
        let removed = rt.eval("undef(undef)").unwrap();
        assert_eq!(removed, Value::Special("undef".into()));
        rt.set_global("remove", removed);
        let constructor = rt.eval("remove(fn)").unwrap();
        assert_eq!(constructor, Value::Special("fn".into()));
        rt.set_global("make", constructor);
        rt.collect_garbage(&[]);
        assert_eq!(
            rt.eval("make(x, add(x, 1))(41)").unwrap(),
            Value::Number(42.0)
        );
        assert_eq!(rt.eval("remove(fn)").unwrap(), Value::Undefined);
        assert_eq!(rt.eval("undef(fn)").unwrap_err().kind, "TypeError");
    }
}

#[test]
fn dynamic_and_async_names_delete_only_the_selected_own_property() {
    let mut rt = Runtime::new();
    assert_eq!(
        rt.eval("undef(identity(\"add\"))").unwrap(),
        Value::Builtin("add".into())
    );
    assert_eq!(rt.eval("plus(20, 22)").unwrap(), Value::Number(42.0));
    rt.register_async("name", |_| {
        Box::pin(async { Ok(Value::String("fn".into())) })
    });
    assert_eq!(
        rt.eval("undef(name())").unwrap(),
        Value::Special("fn".into())
    );
    rt.set_global("12", Value::Number(8.0));
    assert_eq!(rt.eval("undef(identity(12))").unwrap(), Value::Number(8.0));
    assert_eq!(
        rt.eval("undef(identity(\"missing\"))").unwrap(),
        Value::Undefined
    );
    assert_eq!(rt.eval("undef(\"null\")").unwrap(), Value::Null);
    assert_eq!(rt.eval("undef(\"undefined\")").unwrap(), Value::Undefined);
    let library = rt.library_env();
    assert_eq!(
        lookup(&mut rt, library, "null"),
        Value::String("null".into())
    );
    assert_eq!(
        lookup(&mut rt, library, "undefined"),
        Value::String("undefined".into())
    );
}

#[test]
fn deletion_does_not_consult_resolver_functions_or_lookup_hooks() {
    let mut rt = Runtime::new();
    rt.register("resolver", |_| {
        panic!("undef must not call a context resolver")
    });
    let global = rt.global_env();
    let resolver = lookup(&mut rt, global, "resolver");
    let library = rt.library_env();
    let env = rt.env_from_value(resolver, vec![library]).unwrap();
    rt.set_lookup_hook(env, |_, _| panic!("undef must not call a lookup hook"))
        .unwrap();
    assert_eq!(rt.undefine(env, "add"), Value::Builtin("add".into()));
    assert_eq!(rt.undefine(env, "missing"), Value::Undefined);
}

#[test]
fn legacy_profile_keeps_existing_marked_value_frame_policy() {
    let mut rt = Runtime::new();
    rt.set_legacy_context(true);
    let library = rt.library_env();
    let request = rt.new_env(IndexMap::from([("fn".into(), Value::Number(7.0))]), vec![]);
    let env = rt.new_env(IndexMap::new(), vec![library, request]);
    assert_eq!(rt.undefine(env, "fn"), Value::Number(7.0));
    assert_eq!(rt.undefine(env, "fn"), Value::Undefined);
    assert_eq!(lookup(&mut rt, library, "fn"), Value::Special("fn".into()));
    assert_eq!(
        rt.eval("fn(x, add(x, 1))(41)").unwrap(),
        Value::Number(42.0)
    );
    assert_eq!(rt.eval("def(add, 8)").unwrap_err().kind, "Unsupported");
}

#[test]
fn forbidden_literal_and_dynamic_keys_fail_without_deleting_own_properties() {
    for legacy in [false, true] {
        for key in [
            "constructor",
            "prototype",
            "__proto__",
            "caller",
            "callee",
            "arguments",
            "__defineGetter__",
            "__defineSetter__",
            "__lookupGetter__",
            "__lookupSetter__",
        ] {
            let mut rt = Runtime::new();
            rt.set_legacy_context(legacy);
            let object = rt.object(IndexMap::from([(key.into(), Value::Number(7.0))]));
            let env = rt
                .env_from_value(object.clone(), vec![rt.library_env()])
                .unwrap();
            rt.mark_library(env).unwrap();
            for ast in [
                json!(["undef", key]),
                json!(["undef", ["identity", ["q", key]]]),
            ] {
                let error = block_on(rt.eval_in(&ast, env, &EvalOptions::default())).unwrap_err();
                assert_eq!(error.kind, "LPESecurityError", "{key} legacy={legacy}");
                assert!(rt.has_own(&object, key));
                assert_eq!(rt.get(&object, key), Value::Number(7.0));
            }
        }
    }
    let mut rt = Runtime::new();
    for value in [Value::Null, Value::Bool(true), Value::Undefined] {
        let literal = rt.ast_literal(value);
        assert_eq!(
            rt.eval_ast(&json!(["undef", literal]), &EvalOptions::default())
                .unwrap_err()
                .kind,
            "LPESecurityError"
        );
    }
}

#[test]
fn cancellation_and_exhausted_limits_prevent_library_deletion() {
    for full in [false, true] {
        let mut rt = Runtime::new();
        if full {
            rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                .unwrap();
        }
        let library = rt.library_env();
        let ast = json!(["undef", "fn"]);
        rt.cancellation_token().store(true, Ordering::Relaxed);
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err().kind,
            "Cancelled"
        );
        rt.cancellation_token().store(false, Ordering::Relaxed);
        assert_eq!(lookup(&mut rt, library, "fn"), Value::Special("fn".into()));
        for options in [
            EvalOptions {
                max_steps: 0,
                ..Default::default()
            },
            EvalOptions {
                max_depth: 0,
                ..Default::default()
            },
        ] {
            assert_eq!(rt.eval_ast(&ast, &options).unwrap_err().kind, "LimitError");
            assert_eq!(lookup(&mut rt, library, "fn"), Value::Special("fn".into()));
        }
        rt.set_controls(Some(RuntimeControls::new(RuntimeLimits {
            max_work: 0,
            ..Default::default()
        })))
        .unwrap();
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err().kind,
            "LimitError"
        );
        assert_eq!(lookup(&mut rt, library, "fn"), Value::Special("fn".into()));
        rt.set_controls(None).unwrap();
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap(),
            Value::Special("fn".into())
        );
    }
}
