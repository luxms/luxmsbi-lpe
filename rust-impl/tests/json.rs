use lpe::{EvalOptions, Runtime, Value};
use serde_json::Value as Json;

#[test]
fn json_object_matches_independent_javascript_cases() {
    let cases: Vec<Json> =
        serde_json::from_str(include_str!("../fixtures/json.cases.json")).unwrap();
    for case in cases {
        let mut rt = Runtime::new();
        rt.set_context(&case["request"]["context"]).unwrap();
        let result = rt.eval_with_options(
            case["request"]["source"].as_str().unwrap(),
            &EvalOptions::default(),
        );
        if case["expected"]["ok"] == true {
            let value = result.unwrap_or_else(|error| panic!("{}: {error}", case["id"]));
            let expected = rt.from_json(&case["expected"]["value"]);
            assert_eq!(
                rt.to_json(&value).unwrap(),
                rt.to_json(&expected).unwrap(),
                "{}",
                case["id"]
            );
        } else {
            assert_eq!(
                result.unwrap_err().kind,
                case["expected"]["error"]["kind"],
                "{}",
                case["id"]
            );
        }
    }
}

#[test]
fn json_callbacks_cannot_call_special_forms_as_ordinary_functions() {
    let mut rt = Runtime::new();
    for source in [
        "invoke(JSON, 'parse', '1', if)",
        "invoke(JSON, 'stringify', 1, if)",
        "invoke(JSON, 'stringify', {toJSON=if})",
    ] {
        assert_eq!(rt.eval(source).unwrap_err().kind, "LPESecurityError");
    }
}

#[test]
fn json_callbacks_keep_partially_transformed_trees_alive_during_collection() {
    let mut rt = Runtime::new();
    rt.register_sync_host("collect", |rt, args| {
        rt.collect_garbage(&[]);
        Ok(args.get(1).cloned().unwrap_or(Value::Undefined))
    });
    for source in [
        "invoke(JSON, 'stringify', {toJSON=(key=>{a=[1,2],b={c=3}})}, collect)",
        "invoke(JSON, 'stringify', invoke(JSON, 'parse', '{\"a\":[1,2],\"b\":{\"c\":3}}', collect))",
    ] {
        let result = rt.eval(source).unwrap();
        assert_eq!(result, Value::String("{\"a\":[1,2],\"b\":{\"c\":3}}".into()));
    }
}

#[test]
fn parsed_reserved_fields_are_data_and_remain_inaccessible_to_lpe() {
    let mut rt = Runtime::new();
    let source = r#"invoke(JSON,"stringify",invoke(JSON,"parse",'{"constructor":1,"__proto__":2}',(key,value)=>value))"#;
    assert_eq!(
        rt.eval(source).unwrap(),
        Value::String(r#"{"constructor":1,"__proto__":2}"#.into())
    );
    assert_eq!(
        rt.eval(r#"get(invoke(JSON,"parse",'{"constructor":1}'),"constructor")"#)
            .unwrap_err()
            .kind,
        "LPESecurityError"
    );
}

#[test]
fn json_fast_paths_match_full_evaluation_and_preserve_callback_effects() {
    for source in [
        r#"invoke(JSON,"parse",text)"#,
        r#"invoke(JSON,"stringify",value)"#,
        r#"begin(obj:={toJSON=(key=>mark(key))},invoke(JSON,"stringify",obj))"#,
        r#"begin(obj:={self=null},obj.self:=obj,invoke(JSON,"stringify",obj))"#,
        r#"invoke(JSON,method(),input())"#,
        r#"invoke(JSON,"stringify",{then=if})"#,
        r#"invoke(JSON,"parse",text,(key,value,ctx)=>if(isNumber(value),ctx.source,value))"#,
    ] {
        let mut outputs = Vec::new();
        for full in [false, true] {
            let mut rt = Runtime::new();
            rt.set_context(&serde_json::json!({"text":"{\"a\":1e2}","value":{"a":[1,2],"b":true}}))
                .unwrap();
            if full {
                rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                    .unwrap();
            }
            let events = std::rc::Rc::new(std::cell::RefCell::new(Vec::new()));
            for (name, value) in [
                ("mark", Value::Number(42.0)),
                ("method", Value::String("parse".into())),
                ("input", Value::String("42".into())),
            ] {
                let events = events.clone();
                rt.register_sync_host(name, move |_, _| {
                    events.borrow_mut().push(name);
                    Ok(value.clone())
                });
            }
            let result = rt
                .eval(source)
                .map(|value| rt.to_json(&value).unwrap())
                .map_err(|error| error.kind);
            outputs.push((result, events.borrow().clone()));
        }
        assert_eq!(outputs[0], outputs[1], "{source}");
    }
}

#[test]
fn json_configured_limits_use_the_full_controlled_path() {
    for max_steps in 1..40 {
        let mut outcomes = Vec::new();
        for full in [false, true] {
            let mut rt = Runtime::new();
            if full {
                rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                    .unwrap();
            }
            let options = EvalOptions {
                max_steps,
                ..EvalOptions::default()
            };
            outcomes.push(
                rt.eval_with_options(r#"invoke(JSON,"parse",'{"a":[1,2]}')"#, &options)
                    .map(|v| rt.to_json(&v).unwrap())
                    .map_err(|e| e.kind),
            );
        }
        assert_eq!(outcomes[0], outcomes[1], "steps={max_steps}");
    }
}

#[test]
fn malformed_json_does_not_retain_partial_native_parse_trees() {
    let mut rt = Runtime::new();
    rt.set_global("text", Value::String(r#"[{"a":[1,2]},{"b":[3,4]},"#.into()));
    let before = rt.live_allocations();
    for _ in 0..10 {
        assert_eq!(
            rt.eval(r#"invoke(JSON,"parse",text)"#).unwrap_err().kind,
            "SyntaxError"
        );
    }
    assert_eq!(rt.live_allocations(), before);
}
