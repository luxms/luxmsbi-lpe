use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::{json, Value as Json};
use std::{cell::RefCell, rc::Rc};

fn evaluate(rt: &mut Runtime, ast: Json) -> Json {
    let value = rt.eval_ast(&ast, &EvalOptions::default()).unwrap();
    rt.to_json(&value).unwrap()
}

fn capture(rt: &mut Runtime, template: Json) {
    rt.register_vararg_host(
        "testFunc",
        template.as_array().unwrap().clone(),
        |rt, args| Box::pin(async move { Ok(rt.array(args)) }),
    )
    .unwrap();
}

#[test]
fn positional_named_rest_and_missing_values() {
    let mut rt = Runtime::new();
    capture(&mut rt, json!(["a", "b"]));
    for (ast, expected) in [
        (json!(["testFunc", 3, 4]), json!([3.0, 4.0, [], {}])),
        (
            json!(["testFunc", ["+", 1, 2], ["*", 3, 4]]),
            json!([3.0, 12.0, [], {}]),
        ),
        (
            json!(["testFunc", 1, 2, 3, 4, 5]),
            json!([1.0, 2.0, [3.0, 4.0, 5.0], {}]),
        ),
        (
            json!(["testFunc", ["=", "b", 4], ["=", "a", 3]]),
            json!([3.0, 4.0, [], {}]),
        ),
        (
            json!(["testFunc", ["=", "b", 4], ["=", "c", ["+", 2, 3]], 3]),
            json!([3.0, 4.0, [], {"c":5.0}]),
        ),
        (
            json!(["testFunc", 1]),
            json!([1.0, {"$lpe":"undefined"}, [], {}]),
        ),
        (json!(["testFunc", null, null]), json!([null, null, [], {}])),
    ] {
        assert_eq!(evaluate(&mut rt, ast.clone()), expected, "{ast}");
    }
}

#[test]
fn lazy_callbacks_capture_lexical_context_and_options() {
    let mut rt = Runtime::new();
    rt.set_global("x", Value::Number(999.0));
    rt.register_vararg_host("testFunc", vec![json!("callback:fn")], |rt, args| {
        Box::pin(async move {
            let mut values = Vec::new();
            for _ in 0..3 {
                values.push(
                    rt.call_value(args[0].clone(), vec![], rt.global_env())
                        .await?,
                );
            }
            Ok(rt.array(values))
        })
    })
    .unwrap();
    assert_eq!(
        evaluate(
            &mut rt,
            json!(["let", {"x":41}, ["testFunc", ["+", "x", 1]]])
        ),
        json!([42.0, 42.0, 42.0])
    );
    let value = rt
        .eval_ast(
            &json!(["testFunc", "unbound"]),
            &EvalOptions {
                resolve_string: false,
                ..Default::default()
            },
        )
        .unwrap();
    assert_eq!(
        rt.to_json(&value).unwrap(),
        json!([{"$lpe":"undefined"}, {"$lpe":"undefined"}, {"$lpe":"undefined"}])
    );
}

#[test]
fn named_lazy_callbacks_preserve_eager_order_and_run_each_time() {
    let mut rt = Runtime::new();
    let trace = Rc::new(RefCell::new(Vec::new()));
    let recorded = trace.clone();
    rt.register("track", move |args| {
        recorded.borrow_mut().push(args[0].clone());
        Ok(args[0].clone())
    });
    rt.register_vararg_host(
        "testFunc",
        vec![json!("a"), json!("b:fn"), json!("c")],
        move |rt, args| {
            let trace = trace.clone();
            Box::pin(async move {
                let before = rt.array(trace.borrow().clone());
                let mut calls = Vec::new();
                for _ in 0..3 {
                    calls.push(
                        rt.call_value(args[1].clone(), vec![], rt.global_env())
                            .await?,
                    );
                }
                let after = rt.array(trace.borrow().clone());
                let calls = rt.array(calls);
                Ok(rt.array(vec![args[0].clone(), args[2].clone(), before, calls, after]))
            })
        },
    )
    .unwrap();
    assert_eq!(
        evaluate(
            &mut rt,
            json!([
                "testFunc",
                ["=", "b", ["track", 2]],
                ["track", 1],
                ["track", 3]
            ])
        ),
        json!([
            1.0,
            3.0,
            [1.0, 3.0],
            [2.0, 2.0, 2.0],
            [1.0, 3.0, 2.0, 2.0, 2.0]
        ])
    );
}

#[test]
fn regex_kwargs_callbacks_are_not_memoized() {
    let mut rt = Runtime::new();
    let count = Rc::new(std::cell::Cell::new(0));
    rt.register("inc", move |_| {
        count.set(count.get() + 1);
        Ok(Value::Number(count.get() as f64))
    });
    rt.register_vararg_host("testFunc", vec![json!({"on.*":"fn"})], |rt, args| {
        Box::pin(async move {
            let callback = rt.get(&args[1], "onTick");
            let mut values = Vec::new();
            for _ in 0..3 {
                values.push(
                    rt.call_value(callback.clone(), vec![], rt.global_env())
                        .await?,
                );
            }
            Ok(rt.array(values))
        })
    })
    .unwrap();
    assert_eq!(
        evaluate(&mut rt, json!(["testFunc", ["=", "onTick", ["inc"]]])),
        json!([1.0, 2.0, 3.0])
    );
}

#[test]
fn inline_types_require_the_javascript_template_pattern() {
    let mut rt = Runtime::new();
    for name in ["a:fn ", "a:fn-name", "a:", "a:\u{3bb}"] {
        capture(&mut rt, json!([name]));
        assert_eq!(
            evaluate(&mut rt, json!(["testFunc", ["=", name, 7]])),
            json!([7.0, [], {}]),
            "{name:?}"
        );
    }
    capture(&mut rt, json!(["a: INT", "b:bool"]));
    assert_eq!(
        evaluate(&mut rt, json!(["testFunc", ["\"", "12.8"], 0])),
        json!([12.8, false, [], {}])
    );
    capture(&mut rt, json!(["a:fn", {"a":"int"}]));
    assert_eq!(
        evaluate(&mut rt, json!(["testFunc", ["\"", "12"]])),
        json!([12.0, [], {}])
    );
}

#[test]
fn invalid_templates_report_js_errors_for_both_registration_apis() {
    for (template, message) in [
        (
            json!([{}, "a"]),
            "must be no arguments after type declaration",
        ),
        (
            json!([[], "a"]),
            "must be no arguments after type declaration",
        ),
        (json!([1]), "type number is not supported"),
        (json!([true]), "type boolean is not supported"),
        (json!([null]), "type object is not supported"),
    ] {
        let mut rt = Runtime::new();
        let template = template.as_array().unwrap().clone();
        let errors = [
            rt.register_vararg("testFunc", template.clone(), |_| {
                Box::pin(async { Ok(Value::Undefined) })
            })
            .unwrap_err(),
            rt.register_vararg_host("testFunc", template, |_, _| {
                Box::pin(async { Ok(Value::Undefined) })
            })
            .unwrap_err(),
        ];
        for error in errors {
            assert_eq!(error.kind, "Error");
            assert_eq!(
                error.message,
                format!("LPE vararg template definition error: {message}")
            );
        }
    }
}

#[test]
fn array_type_declarations_use_enumerable_index_keys() {
    let mut rt = Runtime::new();
    capture(&mut rt, json!([[]]));
    assert_eq!(
        evaluate(&mut rt, json!(["testFunc", 1, 2])),
        json!([[1.0, 2.0], {}])
    );
    capture(&mut rt, json!([["int"]]));
    assert_eq!(
        evaluate(&mut rt, json!(["testFunc", ["=", "0", ["\"", "12"]]])),
        json!([[], {"0": 12.0}])
    );
}

#[test]
fn lazy_errors_are_deferred_but_not_swallowed() {
    let mut rt = Runtime::new();
    rt.register("fail", |_| Err(Error::new("Error", "deferred failure")));
    rt.register_vararg("ignore", vec![json!("callback:fn")], |_| {
        Box::pin(async { Ok(Value::Bool(true)) })
    })
    .unwrap();
    assert_eq!(evaluate(&mut rt, json!(["ignore", ["fail"]])), json!(true));
    rt.register_vararg_host("invoke", vec![json!("callback:fn")], |rt, args| {
        Box::pin(async move {
            rt.call_value(args[0].clone(), vec![], rt.global_env())
                .await
        })
    })
    .unwrap();
    capture(&mut rt, json!(["a"]));
    for name in ["invoke", "testFunc"] {
        let error = rt
            .eval_ast(&json!([name, ["fail"]]), &EvalOptions::default())
            .unwrap_err();
        assert_eq!(error.kind, "Error");
        assert_eq!(error.message, "deferred failure");
    }
}
