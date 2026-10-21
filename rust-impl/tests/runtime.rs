use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::json;
use std::sync::atomic::Ordering;

#[test]
fn vararg_type_patterns_follow_ecmascript() {
    let mut rt = Runtime::new();
    rt.register_vararg_host(
        "testFunc",
        vec![json!({"[":"int", "(.)\\1":"int", ".*(?<=a)b":"int", "pre|post":"int", ".":"bool"})],
        |_, args| Box::pin(async move { Ok(args[1].clone()) }),
    )
    .unwrap();
    for (name, input, expected) in [
        ("aa", "42", Value::Number(42.0)),
        ("aaab", "42", Value::Number(42.0)),
        ("prefix", "42", Value::Number(42.0)),
        ("xpost", "42", Value::Number(42.0)),
        ("xy", "42", Value::String("42".into())),
        ("\u{1f600}", "42", Value::String("42".into())),
        ("x", "", Value::Bool(false)),
    ] {
        let result = rt
            .eval_ast(
                &json!(["testFunc", ["=", name, ["\"", input]]]),
                &EvalOptions::default(),
            )
            .unwrap();
        assert_eq!(rt.get(&result, name), expected, "{name}");
    }
}

#[test]
fn javascript_values_and_coercion() {
    let mut rt = Runtime::new();
    for (input, expected) in [
        ("undefined", json!({"$lpe":"undefined"})),
        ("NaN", json!({"$lpe":"number","value":"NaN"})),
        ("Infinity", json!({"$lpe":"number","value":"Infinity"})),
        ("null", json!(null)),
    ] {
        let value = rt.eval(input).unwrap();
        assert_eq!(rt.to_json(&value).unwrap(), expected);
    }
    assert_eq!(rt.to_number(&Value::String(" 0xff ".into())), 255.0);
    assert_eq!(rt.to_number(&Value::Null), 0.0);
    assert!(rt.equal(&Value::Bool(false), &Value::String("0".into()), false));
    assert!(!rt.equal(&Value::Bool(false), &Value::Number(0.0), true));
    assert!(!rt.equal(&Value::Number(f64::NAN), &Value::Number(f64::NAN), false));
}

#[test]
fn shared_values_sparse_arrays_and_expired_handles() {
    let mut rt = Runtime::new();
    let a = rt.array(vec![Value::Number(1.0), Value::Undefined]);
    let alias = a.clone();
    rt.delete(&a, "0").unwrap();
    assert!(!rt.has_own(&alias, "0"));
    assert!(rt.has_own(&alias, "1"));
    rt.set(&a, "name", Value::String("shared".into())).unwrap();
    assert_eq!(rt.get(&alias, "name"), Value::String("shared".into()));
    rt.collect_garbage(std::slice::from_ref(&a));
    assert!(rt.array_values(&a).is_ok());
    rt.collect_garbage(&[]);
    assert!(rt.array_values(&a).is_err());
    let fresh = rt.array(vec![]);
    assert_ne!(fresh, a);
    assert!(rt.array_values(&a).is_err());
}

#[test]
fn cyclic_values_are_collected() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    for _ in 0..1000 {
        let a = rt.array(vec![]);
        rt.set(&a, "0", a.clone()).unwrap();
        assert!(rt.to_json(&a).is_err());
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
    }
}

#[test]
fn nested_literals_survive_only_when_reachable() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    for _ in 0..1000 {
        let a = rt.array(vec![Value::Number(3.0)]);
        let ast = rt.ast_literal(a);
        let f = rt.closure(vec![], ast, rt.global_env(), EvalOptions::default());
        rt.collect_garbage(std::slice::from_ref(&f));
        assert!(rt.live_allocations() > baseline);
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
    }
}

#[test]
fn cancellation_and_limits_are_errors() {
    let mut rt = Runtime::new();
    rt.cancellation_token().store(true, Ordering::Relaxed);
    assert_eq!(rt.eval("1").unwrap_err().kind, "Cancelled");
    rt.cancellation_token().store(false, Ordering::Relaxed);
    assert_eq!(
        rt.eval_with_options(
            "1",
            &EvalOptions {
                max_steps: 0,
                ..Default::default()
            }
        )
        .unwrap_err()
        .kind,
        "LimitError"
    );
    assert!(EvalOptions::from_json(&json!({"maxSteps":-1})).is_err());
    assert_eq!(
        EvalOptions::from_json(&json!({"streamAdapter":{}}))
            .unwrap_err()
            .kind,
        "OptionsError"
    );
    assert_eq!(rt.eval("2").unwrap(), Value::Number(2.0));
}

#[test]
fn unsafe_evaluation_cannot_be_requested() {
    let error = EvalOptions::from_json(&json!({"unsafe": true})).unwrap_err();
    assert_eq!(error.kind, "OptionsError");
    assert_eq!(
        error.message,
        "Unsafe evaluation is not supported; Rust LPE only supports safe evaluation"
    );

    // JavaScript only enables unsafe evaluation for the boolean true.
    for options in [
        json!({}),
        json!({"unsafe": false}),
        json!({"unsafe": null}),
        json!({"unsafe": "true"}),
        json!({"unsafe": 1}),
    ] {
        let options = EvalOptions::from_json(&options).unwrap();
        let mut rt = Runtime::new();
        assert_eq!(
            rt.eval_with_options("20 + 22", &options).unwrap(),
            Value::Number(42.0)
        );
    }
}

#[test]
fn set_options_cannot_enable_unsafe_evaluation_or_run_its_body() {
    for settings in [
        json!({"unsafe": true}),
        json!(["list", ["list", ["q", "unsafe"], true]]),
    ] {
        let mut rt = Runtime::new();
        rt.eval("called := 0").unwrap();
        let error = rt
            .eval_ast(
                &json!(["set_options", settings, [":=", "called", 1]]),
                &EvalOptions::default(),
            )
            .unwrap_err();
        assert_eq!(error.kind, "LPESecurityError");
        assert_eq!(rt.eval("called").unwrap(), Value::Number(0.0));
        assert_eq!(rt.eval("20 + 22").unwrap(), Value::Number(42.0));
    }
}

#[test]
fn native_and_async_host_functions() {
    let mut rt = Runtime::new();
    rt.register("double", |args| match args.first() {
        Some(Value::Number(n)) => Ok(Value::Number(n * 2.0)),
        _ => Err(Error::new("TypeError", "number expected")),
    });
    assert_eq!(rt.eval("double(21)").unwrap(), Value::Number(42.0));
    rt.register_async("later", |args| {
        Box::pin(async move { Ok(args.first().cloned().unwrap_or(Value::Undefined)) })
    });
    assert_eq!(rt.eval("later(42)").unwrap(), Value::Number(42.0));
    rt.register_special("firstOnly", |rt, args, env, opt| {
        Box::pin(async move { rt.eval_in(&args[0], env, &opt).await })
    });
    assert_eq!(
        rt.eval("firstOnly(42, missing())").unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn ordinary_object_contexts_keep_aliases() {
    let mut rt = Runtime::new();
    let map = rt.from_json(&json!({"x":1}));
    let env = rt
        .env_from_value(map.clone(), vec![rt.global_env()])
        .unwrap();
    rt.assign(env, "x", Value::Number(2.0)).unwrap();
    assert_eq!(rt.get(&map, "x"), Value::Number(2.0));
    rt.assign(env, "new", Value::Number(3.0)).unwrap();
    assert_eq!(rt.get(&map, "new"), Value::Number(3.0));
}

#[test]
fn collection_inside_a_host_special_preserves_the_active_local_scope() {
    let mut rt = Runtime::new();
    rt.register_special("collect", |rt, _, _, _| {
        Box::pin(async move {
            rt.collect_garbage(&[]);
            Ok(Value::Undefined)
        })
    });
    assert_eq!(
        rt.eval("let([[x,42]],begin(collect(),x))").unwrap(),
        Value::Number(42.0)
    );
}
