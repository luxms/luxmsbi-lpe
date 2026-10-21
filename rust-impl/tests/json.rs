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
