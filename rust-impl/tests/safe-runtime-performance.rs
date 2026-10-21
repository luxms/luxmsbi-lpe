use lpe::{parse, EvalOptions, Runtime, Value};
use serde_json::json;

#[test]
fn indexed_collection_paths_preserve_live_slots_holes_and_named_properties() {
    // Independent expected values checked against JS LPE 1.8.0.
    let cases = [
        (
            r#"begin(a:=[10,undefined,30],del(a,0),[get(a,0,99),get(a,1,99),get(a,"01",99),containsKey(a,0),containsKey(a,1)])"#,
            json!([99,{"$lpe":"undefined"},99,false,true]),
        ),
        (
            r#"begin(a:=[1,2,3],mapArr(a,(v,i)=>begin(if(i=0,set(a,1,20)),v)))"#,
            json!([1, 20, 3]),
        ),
        (
            r#"begin(a:=[1,2,3],mapArr(a,(v,i)=>begin(if(i=0,set(a,"length",1)),v)))"#,
            json!([1,{"$lpe":"undefined"},{"$lpe":"undefined"}]),
        ),
        (
            r#"begin(a:=[10,20],set(a,"01",7),set(a,"4294967295",9),[get(a,1),get(a,"01"),get(a,"4294967295"),count(a)])"#,
            json!([20, 7, 9, 2]),
        ),
    ];
    for (source, expected) in cases {
        let mut rt = Runtime::new();
        let actual = rt.eval(source).unwrap();
        let expected = rt.from_json(&expected);
        assert_eq!(
            rt.to_json(&actual).unwrap(),
            rt.to_json(&expected).unwrap(),
            "{source}"
        );
    }
}

#[test]
fn canonical_index_order_does_not_promote_numeric_looking_property_names() {
    let mut rt = Runtime::new();
    let object = rt.from_json(
        &json!({"4294967295":9,"01":7,"+1":6,"1e0":5,"-0":4,"2":2,"0":0,"4294967294":8,"1":1}),
    );
    assert_eq!(
        rt.keys(&object),
        [
            "0",
            "1",
            "2",
            "4294967294",
            "4294967295",
            "01",
            "+1",
            "1e0",
            "-0"
        ]
    );
    let array = rt.from_json(&json!([10, 20, 30]));
    for key in ["01", "+1", "1e0", "-0", "4294967295"] {
        assert!(!rt.has_own(&array, key));
        rt.set(&array, key, Value::Number(99.0)).unwrap();
        assert_eq!(rt.get(&array, key), Value::Number(99.0));
    }
    assert_eq!(rt.get(&array, "length"), Value::Number(3.0));
    assert_eq!(rt.get(&array, "1"), Value::Number(20.0));
}

#[test]
fn borrowed_paths_still_validate_segments_after_missing_data() {
    let mut rt = Runtime::new();
    for source in [
        r#"get_in({},["missing","constructor"])"#,
        r#"get_in({},["missing",{}])"#,
    ] {
        assert_eq!(rt.eval(source).unwrap_err().kind, "LPESecurityError");
    }
}

#[test]
fn synchronous_dispatch_remains_lazy_and_checks_call_limits_and_values() {
    let mut rt = Runtime::new();
    let env = rt.global_env();
    let options = EvalOptions::default();
    let array = rt.from_json(&json!([1]));
    // Creating and dropping a call future must not execute the write.
    drop(rt.call_with_options(
        Value::Builtin("set".into()),
        vec![array.clone(), Value::Number(0.0), Value::Number(9.0)],
        env,
        &options,
    ));
    assert_eq!(rt.get(&array, "0"), Value::Number(1.0));
    let limited = EvalOptions {
        max_depth: 0,
        ..options.clone()
    };
    assert_eq!(
        futures::executor::block_on(rt.call_with_options(
            Value::Builtin("count".into()),
            vec![array],
            env,
            &limited
        ))
        .unwrap_err()
        .kind,
        "LimitError"
    );
    let invalid = rt.object(indexmap::IndexMap::from([(
        "then".into(),
        Value::Special("if".into()),
    )]));
    assert_eq!(
        futures::executor::block_on(rt.call_with_options(
            Value::Builtin("count".into()),
            vec![invalid],
            env,
            &options
        ))
        .unwrap_err()
        .kind,
        "LPESecurityError"
    );
    assert_eq!(
        rt.eval_ast(&parse("1").unwrap(), &limited)
            .unwrap_err()
            .kind,
        "LimitError"
    );
}

#[test]
fn direct_data_arguments_do_not_snapshot_across_effectful_siblings() {
    let mut rt = Runtime::new();
    assert_eq!(
        rt.eval(r#"begin(obj:={x=1},get(obj,begin(set(obj,"x",2),"x")))"#)
            .unwrap(),
        Value::Number(2.0)
    );
    assert_eq!(
        rt.eval(r#"begin(obj:={x=1},get(obj,"x")+begin(set(obj,"x",2),get(obj,"x")))"#)
            .unwrap(),
        Value::Number(3.0)
    );
    let promise = rt.promise(async { Ok(Value::Number(42.0)) });
    let values = rt.array(vec![promise]);
    rt.set_global("values", values);
    assert_eq!(rt.eval("first(values)").unwrap(), Value::Number(42.0));
}

#[test]
fn direct_pluck_keeps_sparse_results_and_expired_handle_behavior() {
    let mut rt = Runtime::new();
    let value = rt.eval(r#"begin(a:=[{x=1},{x=2},{x=3}],del(a,1),b:=pluck(a,"x"),[count(b),containsKey(b,1),get(b,2)])"#).unwrap();
    let expected = rt.from_json(&json!([3, false, 3]));
    assert_eq!(rt.to_json(&value).unwrap(), rt.to_json(&expected).unwrap());
    let expired = rt.array(vec![Value::Number(1.0)]);
    rt.collect_garbage(&[]);
    rt.set_global("expired", expired);
    let value = rt.eval("pluck(expired,'x')").unwrap();
    assert_eq!(rt.to_json(&value).unwrap(), json!([]));
}

#[test]
fn formatted_data_reads_keep_unicode_coercion_and_budget_boundaries() {
    fn outcome(rt: &Runtime, result: lpe::Result<Value>) -> String {
        match result {
            Ok(value) => format!("ok:{}", rt.to_json(&value).unwrap()),
            Err(error) => format!("{}:{}", error.kind, error.message),
        }
    }
    for source in [
        r#"f"{name}: {amount} / {count}""#,
        r#"f"{null}/{undefined}/{true}/{-0}""#,
        r#"f"😀 {name}""#,
    ] {
        let ast = parse(source).unwrap();
        for steps in 0..55 {
            for depth in 0..7 {
                let options = EvalOptions {
                    max_steps: steps,
                    max_depth: depth,
                    ..Default::default()
                };
                let mut fast = Runtime::new();
                let mut full = Runtime::new();
                for rt in [&mut fast, &mut full] {
                    rt.set_context(&json!({"name":"мир","amount":123.5,"count":32}))
                        .unwrap();
                }
                full.set_lookup_hook(full.global_env(), |_, _| Ok(None))
                    .unwrap();
                let a = fast.eval_ast(&ast, &options);
                let b = full.eval_ast(&ast, &options);
                assert_eq!(
                    outcome(&fast, a),
                    outcome(&full, b),
                    "{source} steps={steps} depth={depth}"
                );
            }
        }
    }
    let mut rt = Runtime::new();
    assert_eq!(
        rt.eval(r#"begin(a:=get("😀",0),b:=get("😀",1),f"{a}{b}")"#)
            .unwrap(),
        Value::String("😀".into())
    );
}
