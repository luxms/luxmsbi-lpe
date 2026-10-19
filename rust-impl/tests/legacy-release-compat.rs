use futures::executor::block_on;
use lpe::parser::{parse_with_diagnostics, parse_with_options};
use lpe::{EvalOptions, Runtime, RuntimeControls, RuntimeLimits, Value};
use serde_json::{json, Value as Json};

fn call(runtime: &mut Runtime, function: Value, args: Vec<Value>) -> Value {
    let env = runtime.global_env();
    block_on(runtime.call_value(function, args, env)).unwrap()
}

fn configured(legacy: bool, controlled: bool) -> Runtime {
    let mut runtime = Runtime::new();
    runtime.set_legacy_context(legacy);
    runtime.set_global("x", Value::Number(8.0));
    if controlled {
        runtime
            .set_controls(Some(RuntimeControls::new(RuntimeLimits::default())))
            .unwrap();
    }
    runtime
}

// JS 1.6.7 env_bind iterates supplied arguments, not declared parameters.
// Both 78653e18 and r1.7.0 filled the missing duplicate slot with Undefined.
#[test]
fn legacy_fn_distinguishes_supplied_undefined_from_missing_duplicate_arguments() {
    for controlled in [false, true] {
        for params in [json!(["x", "x"]), json!(["[", "x", "x"])] {
            for (args, expected) in [
                (vec![], Value::Number(8.0)),
                (vec![Value::Number(1.0)], Value::Number(1.0)),
                (vec![Value::Null], Value::Null),
                (vec![Value::Undefined], Value::Number(8.0)),
                (
                    vec![Value::Number(1.0), Value::Undefined],
                    Value::Number(8.0),
                ),
                (vec![Value::Number(1.0), Value::Null], Value::Null),
                (
                    vec![Value::Number(1.0), Value::Number(2.0)],
                    Value::Number(2.0),
                ),
                (
                    vec![Value::Undefined, Value::Number(1.0)],
                    Value::Number(1.0),
                ),
                (
                    vec![Value::Number(1.0), Value::Number(2.0), Value::Number(3.0)],
                    Value::Number(2.0),
                ),
            ] {
                let mut runtime = configured(true, controlled);
                let function = runtime
                    .eval_ast(
                        &json!(["fn", params, ["list", "x", "x"]]),
                        &EvalOptions::default(),
                    )
                    .unwrap();
                let count = args.len();
                let value = call(&mut runtime, function, args);
                assert_eq!(
                    runtime.array_values(&value).unwrap(),
                    vec![expected.clone(), expected],
                    "{count} supplied arguments, params={params}, controlled={controlled}"
                );
            }
        }
    }
}

#[test]
fn ast_calls_preserve_argument_count_and_evaluate_supplied_arguments_once() {
    for controlled in [false, true] {
        let mut runtime = configured(true, controlled);
        let undefined = json!(["get", {}, ["q", "missing"]]);
        let constructor = json!(["fn", ["x", "x"], ["list", "x", "x"]]);
        let value = runtime
            .eval_ast(&json!([constructor, 1]), &EvalOptions::default())
            .unwrap();
        assert_eq!(
            runtime.array_values(&value).unwrap(),
            vec![Value::Number(1.0); 2]
        );
        let value = runtime
            .eval_ast(&json!([constructor, 1, undefined]), &EvalOptions::default())
            .unwrap();
        assert_eq!(
            runtime.array_values(&value).unwrap(),
            vec![Value::Number(8.0); 2]
        );

        runtime.set_global("n", Value::Number(0.0));
        let value = runtime
            .eval_ast(
                &json!([
                    constructor,
                    ["begin", ["assign", "n", ["+", "n", 1]], 1],
                    ["begin", ["assign", "n", ["+", "n", 1]], undefined],
                    ["assign", "n", ["+", "n", 1]]
                ]),
                &EvalOptions::default(),
            )
            .unwrap();
        assert_eq!(
            runtime.array_values(&value).unwrap(),
            vec![Value::Number(8.0); 2]
        );
        assert_eq!(runtime.eval("n").unwrap(), Value::Number(3.0));
    }
}

#[test]
fn missing_argument_policy_is_captured_by_fn_constructor_not_call_profile() {
    for controlled in [false, true] {
        for legacy_at_creation in [false, true] {
            for legacy_at_call in [false, true] {
                let mut runtime = configured(legacy_at_creation, controlled);
                // A leaf body exercises the immediate evaluator when eligible.
                let function = runtime
                    .eval_ast(&json!(["fn", ["x", "x"], "x"]), &EvalOptions::default())
                    .unwrap();
                runtime.set_legacy_context(legacy_at_call);
                let undefined = if legacy_at_call {
                    Value::Number(8.0)
                } else {
                    Value::Undefined
                };
                let expected = if legacy_at_creation {
                    Value::Number(1.0)
                } else {
                    undefined.clone()
                };
                assert_eq!(
                    call(&mut runtime, function.clone(), vec![Value::Number(1.0)]),
                    expected
                );
                assert_eq!(
                    call(
                        &mut runtime,
                        function.clone(),
                        vec![Value::Number(1.0), Value::Undefined]
                    ),
                    undefined
                );
                assert_eq!(
                    call(
                        &mut runtime,
                        function,
                        vec![Value::Number(1.0), Value::Null]
                    ),
                    Value::Null
                );
            }
        }
    }
}

#[test]
fn modern_fn_other_constructors_and_host_closures_keep_missing_slot_behavior() {
    for controlled in [false, true] {
        for legacy in [false, true] {
            let mut runtime = configured(legacy, controlled);
            let mut constructors = vec![
                json!(["->fn", "x", "x", "x"]),
                json!(["toFn", "x", "x", "x"]),
                json!(["defFn", "x", "x", "x"]),
                json!(["lambda", ["tuple", "x", "x"], "x"]),
                json!(["=>", ["tuple", "x", "x"], "x"]),
            ];
            if !legacy {
                constructors.push(json!(["fn", ["x", "x"], "x"]));
            }
            let expected = if legacy {
                Value::Number(8.0)
            } else {
                Value::Undefined
            };
            for constructor in constructors {
                let function = runtime
                    .eval_ast(&constructor, &EvalOptions::default())
                    .unwrap();
                assert_eq!(
                    call(&mut runtime, function, vec![Value::Number(1.0)]),
                    expected,
                    "{constructor}"
                );
            }
            let function = runtime.closure(
                vec!["x".into(), "x".into()],
                json!("x"),
                runtime.global_env(),
                EvalOptions::default(),
            );
            assert_eq!(
                call(&mut runtime, function, vec![Value::Number(1.0)]),
                expected
            );
        }
    }
}

#[test]
fn returned_closures_retain_duplicate_parameter_bindings_after_collection() {
    for controlled in [false, true] {
        for (args, expected) in [
            (vec![Value::Number(1.0)], Value::Number(1.0)),
            (
                vec![Value::Number(1.0), Value::Undefined],
                Value::Number(8.0),
            ),
        ] {
            let mut runtime = configured(true, controlled);
            let factory = runtime
                .eval_ast(
                    &json!(["fn", ["x", "x"], ["fn", [], "x"]]),
                    &EvalOptions::default(),
                )
                .unwrap();
            let returned = call(&mut runtime, factory, args);
            assert!(returned.is_callable());
            runtime.collect_garbage(std::slice::from_ref(&returned));
            assert_eq!(call(&mut runtime, returned.clone(), vec![]), expected);
            assert_eq!(call(&mut runtime, returned, vec![]), expected);
        }
    }
}

#[test]
fn constructors_keep_independent_binding_policies_in_one_runtime() {
    let mut runtime = configured(true, false);
    let legacy = runtime
        .eval_ast(&json!(["fn", ["x", "x"], "x"]), &EvalOptions::default())
        .unwrap();
    runtime.set_legacy_context(false);
    let modern = runtime
        .eval_ast(&json!(["fn", ["x", "x"], "x"]), &EvalOptions::default())
        .unwrap();
    runtime.collect_garbage(&[legacy.clone(), modern.clone()]);
    assert_eq!(
        call(&mut runtime, legacy.clone(), vec![Value::Number(1.0)]),
        Value::Number(1.0)
    );
    assert_eq!(
        call(&mut runtime, modern.clone(), vec![Value::Number(1.0)]),
        Value::Undefined
    );
    runtime.set_legacy_context(true);
    assert_eq!(
        call(&mut runtime, legacy, vec![Value::Number(2.0)]),
        Value::Number(2.0)
    );
    assert_eq!(
        call(&mut runtime, modern, vec![Value::Number(2.0)]),
        Value::Number(8.0)
    );
}

#[test]
fn legacy_line_breaks_is_opt_in_and_preserves_modern_multiline_chains() {
    let legacy = json!({"legacyLineBreaks":true});
    let chain = json!([".", "s", ["slice", 1, 3]]);
    let statements = json!(["begin", "s", ["slice", 1, 3]]);
    // ASTs observed from bundled JS 1.6.7; current Rust default deliberately differs.
    for source in [
        "s\n.slice(1,3)",
        "s\r\n  .slice(1,3)",
        "s\n\n.slice(1,3)",
        "s // comment\n.slice(1,3)",
        "lpe:s\n.slice(1,3)",
        "\u{26a1}s\n.slice(1,3)",
    ] {
        assert_eq!(
            parse_with_options(source, &legacy).unwrap(),
            statements,
            "{source}"
        );
        assert_eq!(parse_with_diagnostics(source, &legacy).unwrap(), statements);
        for options in [
            Json::Null,
            json!({}),
            json!({"legacyLineBreaks":false}),
            json!({"legacyLineBreaks":"true"}),
        ] {
            assert_eq!(parse_with_options(source, &options).unwrap(), chain);
        }
        assert_eq!(lpe::parse(source).unwrap(), chain);
    }
}

#[test]
fn legacy_line_breaks_keeps_continuations_after_dots_and_inside_groups() {
    for (source, expected) in [
        ("s.slice(1,3)", json!([".", "s", ["slice", 1, 3]])),
        ("s.\nslice(1,3)", json!([".", "s", ["slice", 1, 3]])),
        ("s.\n\nslice(1,3)", json!([".", "s", ["slice", 1, 3]])),
        (
            "(s\n.slice(1,3))",
            json!(["()", [".", "s", ["slice", 1, 3]]]),
        ),
        (
            "list(s\n.slice(1,3))",
            json!(["list", [".", "s", ["slice", 1, 3]]]),
        ),
        ("s;\n.slice(1,3)", json!(["begin", "s", ["slice", 1, 3]])),
    ] {
        assert_eq!(
            parse_with_options(source, &json!({"legacyLineBreaks":true})).unwrap(),
            expected
        );
        assert_eq!(lpe::parse(source).unwrap(), expected);
    }
    assert_eq!(
        parse_with_options(
            "[Column name]\n.identity()",
            &json!({"squareBrackets":true,"legacyLineBreaks":true})
        )
        .unwrap(),
        json!(["begin", ["[]", "Column name"], ["identity"]])
    );
}

#[test]
fn legacy_line_break_diagnostics_and_limits_keep_existing_contracts() {
    let options = json!({"legacyLineBreaks":true});
    let source = "s\n.length";
    let error = parse_with_options(source, &options).unwrap_err();
    assert_eq!(error.kind, "SyntaxError");
    assert_eq!(
        error.message,
        "Only functions may have dot (.) unary operator. At character 9."
    );
    let diagnostic = parse_with_diagnostics(source, &options).unwrap_err();
    assert_eq!(diagnostic.error.message, error.message);
    let diagnostic = diagnostic.diagnostic.unwrap();
    assert_eq!(
        diagnostic["message"],
        "Only functions may have dot (.) unary operator."
    );
    assert_eq!(diagnostic["src"], source);
    assert_eq!(diagnostic["from"], 3);
    assert_eq!(diagnostic["to"], 9);
    assert_eq!(diagnostic["value"], "length");
    assert!(lpe::parse(source).is_ok());
    for source in ["s\n.slice(".to_owned(), "x".repeat(1_048_577)] {
        assert_eq!(
            parse_with_options(&source, &options).unwrap_err().kind,
            "SyntaxError"
        );
        assert_eq!(
            parse_with_diagnostics(&source, &options)
                .unwrap_err()
                .error
                .kind,
            "SyntaxError"
        );
    }
    assert_eq!(
        parse_with_options("2+3", &options).unwrap(),
        json!(["+", 2, 3])
    );
}

#[test]
fn runtime_source_and_eval_lpe_follow_current_legacy_profile_without_changing_ast_eval() {
    for controlled in [false, true] {
        let mut runtime = configured(false, controlled);
        runtime.set_global("s", Value::String("A\u{1f600}B".into()));
        let source = "s\n.slice(1,3)";
        for legacy in [false, true, false] {
            runtime.set_legacy_context(legacy);
            let evaluate = [
                runtime.eval(source),
                runtime.eval_with_options(source, &EvalOptions::default()),
                runtime.eval_ast(&json!(["eval_lpe", ["q", source]]), &EvalOptions::default()),
                runtime.eval_ast(
                    &json!([["fn", [], ["eval_lpe", ["q", source]]]]),
                    &EvalOptions::default(),
                ),
            ];
            for value in evaluate {
                let value = value.unwrap();
                if legacy {
                    assert!(runtime.array_values(&value).unwrap().is_empty());
                } else {
                    assert_eq!(value, Value::String("\u{1f600}".into()));
                }
            }
            let modern_ast = lpe::parse(source).unwrap();
            assert_eq!(
                runtime
                    .eval_ast(&modern_ast, &EvalOptions::default())
                    .unwrap(),
                Value::String("\u{1f600}".into())
            );
        }
        runtime.set_legacy_context(true);
        assert_eq!(runtime.eval("s\n.length").unwrap_err().kind, "SyntaxError");
        assert_eq!(runtime.eval("20+22").unwrap(), Value::Number(42.0));
    }
}
