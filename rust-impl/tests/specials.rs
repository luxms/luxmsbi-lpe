use lpe::{Ast, Error, EvalOptions, Runtime, Value};
use serde_json::json;

fn check(ast: Ast, expected: Ast) {
    let mut rt = Runtime::new();
    let value = rt
        .eval_ast(&ast, &EvalOptions::default())
        .unwrap_or_else(|e| panic!("{ast}: {e}"));
    let expected = rt.from_json(&expected);
    assert_eq!(
        rt.to_json(&value).unwrap(),
        rt.to_json(&expected).unwrap(),
        "{ast}"
    );
}

#[test]
fn quoted_ast_and_omitted_arguments() {
    check(json!(["$AST$", ["+", "x", 1]]), json!(["+", "x", 1]));
    check(json!(["`", ["return", 1]]), json!(["return", 1]));
    check(json!(["q", ["a", "b"]]), json!("a,b"));
    check(json!(["q"]), json!("undefined"));
    check(json!(["begin"]), json!(null));
    for name in ["if", "do", "catchReturn", "$AST$"] {
        check(json!([name]), json!({"$lpe":"undefined"}));
    }
}

#[test]
fn quoted_lookup_does_not_use_string_fallback() {
    check(json!(["q", "absent", "_"]), json!({"$lpe":"undefined"}));
    check(json!(["resolve", "absent"]), json!({"$lpe":"undefined"}));
    check(json!(["begin", ["def", "x", 9], ["q", "x", "_"]]), json!(9));
}

#[test]
fn thread_first_last_and_property_access() {
    check(json!([".", 5, ["-", 2], ["*", 3]]), json!(9));
    check(json!(["..", 5, ["-", 2]]), json!(-3));
    check(json!([".", {"a":[7,8]}, "a", ["()", 1]]), json!(8));
    check(json!([".", "single"]), json!(["resolve", "single"]));
    check(json!(["property", null, "x"]), json!({"$lpe":"undefined"}));
    check(json!(["property", null, "x", 7]), json!(7));
}

#[test]
fn property_undefined_means_get_and_preserves_identity() {
    check(
        json!(["let", [["obj", {"x":1}]],
        ["property", "obj", "x", ["property", "obj", "x", 5]],
        ["property", "obj", "x", "undefined"]]),
        json!(5),
    );
    check(
        json!([
            "let",
            [["obj", {}]],
            ["assign", [".", "obj", "nested", "key"], 42],
            "obj"
        ]),
        json!({"nested":{"key":42}}),
    );
}

#[test]
fn begin_and_let_are_return_boundaries() {
    check(
        json!(["begin", ["return", 7], ["throw", "unreachable"]]),
        json!(7),
    );
    check(json!(["begin", ["begin", ["return", 7]], 9]), json!(9));
    check(json!(["let", [], ["return", 11], 12]), json!(11));
    check(
        json!(["catchReturn", ["if", true, ["return", 13]]]),
        json!(13),
    );
    let error = Runtime::new()
        .eval_ast(&json!(["return", 17]), &EvalOptions::default())
        .unwrap_err();
    assert_eq!(error.kind, "Return");
    assert_eq!(error.value, Some(Value::Number(17.0)));
}

#[test]
fn try_catches_thrown_values_and_return_objects() {
    check(
        json!(["try", ["throw", ["q", "failure"]], "e", "e"]),
        json!("failure"),
    );
    check(
        json!(["try", ["return", 4], "e", ["property", "e", "value"]]),
        json!(4),
    );
    check(json!(["try", 8, "e", ["throw", "bad"]]), json!(8));
    assert!(Runtime::new()
        .eval_ast(&json!(["try", 8, ["q", "e"], 3]), &EvalOptions::default())
        .is_err());
}

#[test]
fn if_only_disables_unresolved_string_fallback_for_conditions() {
    check(
        json!(["if", "missing", 1, "otherMissing", 2, "fallback"]),
        json!("fallback"),
    );
    check(json!(["if", false, 1]), json!({"$lpe":"undefined"}));
    check(
        json!(["if", ["q", "nonempty"], "unresolved", ["throw", "bad"]]),
        json!("unresolved"),
    );
    check(
        json!(["begin", ["if", "missing", 1], "missing"]),
        json!("missing"),
    );
}

#[test]
fn short_circuit_operators_keep_values() {
    check(json!(["and"]), json!(true));
    check(json!(["or"]), json!(false));
    check(json!(["nvl"]), json!(null));
    check(json!(["and", 1, 0, ["throw", "bad"]]), json!(0));
    check(json!(["or", 0, "ok", ["throw", "bad"]]), json!("ok"));
    check(
        json!(["nvl", "undefined", null, false, ["throw", "bad"]]),
        json!(false),
    );
    check(json!(["logicalAnd", 1, 8]), json!(true));
    check(json!(["logicalOr", 0, 8]), json!(true));
}

#[test]
fn chained_comparisons_share_one_evaluation_and_short_circuit() {
    check(
        json!([
            "let",
            [["x", 0]],
            [
                "list",
                ["<", 0, ["<=", ["assign", "x", ["+", "x", 1]], 2]],
                "x"
            ]
        ]),
        json!([true, 1]),
    );
    check(
        json!(["<", 9, [">", 3, ["throw", "unreachable"]]]),
        json!(false),
    );
    check(json!(["<", ["q", "12"], ["q", "2"]]), json!(true));
    check(json!([">=", "NaN", 1]), json!(false));
    check(json!(["<="]), json!(true));
    // Only nested operator chains short-circuit; flat comparisons evaluate all arguments.
    assert!(Runtime::new()
        .eval_ast(
            &json!(["<", 2, 1, ["throw", "expected"]]),
            &EvalOptions::default()
        )
        .is_err());
}

#[test]
fn let_bindings_are_parallel_and_letstar_bindings_are_sequential() {
    check(
        json!([
            "let",
            [["x", 10]],
            ["let", [["x", 2], ["y", "x"]], ["list", "x", "y"]]
        ]),
        json!([2, 10]),
    );
    check(
        json!(["let*", [["x", 2], ["y", ["*", "x", 3]]], "y"]),
        json!(6),
    );
    check(
        json!([
            "letseq",
            ["[", ["[", ["q", "x"], 2], ["[", ["q", "y"], ["*", "x", 4]]],
            "y"
        ]),
        json!(8),
    );
    check(json!(["letstar", ["x", 7], "x"]), json!(7));
    check(json!(["let", {"x":["+",2,3]}, "x"]), json!(5));
}

#[test]
fn let_object_context_is_aliased() {
    check(
        json!(["let", [["obj", {"x":2}]],
        ["let", ["identity", "obj"], ["assign", "x", 7]],
        ["property", "obj", "x"]]),
        json!(7),
    );
}

#[test]
fn let_function_context_uses_async_lookup() {
    check(
        json!([
            "let",
            [
                "fn",
                ["key"],
                ["if", ["=", "key", ["q", "x"]], 19, "undefined"]
            ],
            "x"
        ]),
        json!(19),
    );
}

#[test]
fn assignment_updates_nearest_existing_binding_and_undef_reveals_parent() {
    check(
        json!([
            "let",
            [["x", 1]],
            ["let", [["y", 2]], ["assign", "x", 5]],
            "x"
        ]),
        json!(5),
    );
    check(
        json!([
            "let",
            [["x", 1]],
            ["let", [["x", 2]], ["list", ["undef", "x"], "x"]]
        ]),
        json!([2, 1]),
    );
    check(json!(["let", [["x", 1]], ["undef", ["q", "x"]]]), json!(1));
    check(
        json!(["ctx", "missing"]),
        json!({"missing":{"$lpe":"undefined"}}),
    );
}

#[test]
fn closures_capture_scope_support_recursion_and_catch_return() {
    check(
        json!(["let", [["x", 4]], [["fn", ["[", "y"], ["+", "x", "y"]], 3]]),
        json!(7),
    );
    check(
        json!([
            [
                "fn",
                "n",
                [
                    "if",
                    ["<=", "n", 1],
                    1,
                    ["*", "n", ["$this$", ["-", "n", 1]]]
                ]
            ],
            5
        ]),
        json!(120),
    );
    check(
        json!([
            ["lambda", ["tuple", "a", "b"], ["return", ["+", "a", "b"]]],
            2,
            3
        ]),
        json!(5),
    );
    check(json!([["toFn", ["+", "x", 1], "x"], 8]), json!(9));
    check(json!([["->fn", "+"], 2, 3]), json!(5));
}

#[test]
fn kwargs_constructors_and_dynamic_hash_keys() {
    check(
        json!(["vector", ["=", "a", 1], ["=", "b", 2]]),
        json!({"a":1,"b":2}),
    );
    check(
        json!(["property", ["tuple", 1, ["=", "a", 2]], "a"]),
        json!(2),
    );
    check(
        json!(["property", ["vector", 1, ["=", "a", 2]], "length"]),
        json!(1),
    );
    check(
        json!([
            "makeHash",
            ["=", ["+", 1, 2], "value"],
            ["throw", "ignored"]
        ]),
        json!({"3":"value"}),
    );
    check(json!(["hash", 1, ["=", "a", 2]]), json!({"a":2}));
    check(json!(["vector"]), json!([]));
    check(json!(["hash"]), json!({}));
}

#[test]
fn repeat_evaluates_each_time_and_allocates_distinct_objects() {
    check(
        json!([
            "let",
            [["x", 0]],
            ["repeat", 3, ["assign", "x", ["+", "x", 1]]]
        ]),
        json!([1, 2, 3]),
    );
    check(
        json!([
            "let",
            [["arr", ["repeat", 2, ["hash"]]]],
            ["assign", [".", "arr", ["()", 0], "x"], 1],
            "arr"
        ]),
        json!([{"x":1},{}]),
    );
    check(json!(["repeat", ["q", "3"], 5]), json!([5]));
    assert!(Runtime::new()
        .eval_ast(&json!(["repeat", -1, 5]), &EvalOptions::default())
        .is_err());
}

#[test]
fn mapit_and_filterit_bind_it_idx_and_catch_return() {
    check(
        json!(["mapit", ["list", 3, 4], ["return", ["+", "it", "idx"]]]),
        json!([3, 5]),
    );
    check(
        json!(["filterit", ["list", 3, 4, 5], ["return", [">", "it", 3]]]),
        json!([4, 5]),
    );
    check(
        json!(["mapit", ["q", "ab"], ["+", "it", "idx"]]),
        json!(["a0", "b1"]),
    );
    check(
        json!(["filterit", {"0":8,"1":2,"length":2}, [">", "it", 4]]),
        json!([8]),
    );
}

#[test]
fn do_runs_body_first_and_enforces_iteration_limit() {
    check(
        json!([
            "let",
            [["x", 0]],
            ["do", ["<", "x", 3], ["assign", "x", ["+", "x", 1]]]
        ]),
        json!(3),
    );
    check(json!(["do", false, 9]), json!(9));
    let options = EvalOptions {
        max_loop_iterations: 2,
        ..Default::default()
    };
    let err = Runtime::new()
        .eval_ast(&json!(["do", true, 1]), &options)
        .unwrap_err();
    assert_eq!(err.kind, "Error");
}

#[test]
fn assoc_in_mutates_origin_and_pops_supplied_path() {
    check(
        json!([
            "let",
            [["obj", {}], ["path", ["list", ["q", "a"], ["q", "b"]]]],
            ["assoc_in", "obj", "path", 7],
            ["list", "obj", "path"]
        ]),
        json!([{"a":{"b":7}},["a"]]),
    );
    check(
        json!([
            "let",
            [["obj", {}]],
            ["assoc_in", "obj", ["list", "items", 0], 7],
            "obj"
        ]),
        json!({"items":[7]}),
    );
}

#[test]
fn get_in_and_cp_keep_object_identity() {
    check(json!(["get_in", {"a":{"b":7}}, "a", "b"]), json!(7));
    check(
        json!([
            "get_in",
            ["hash", ["=", "a", ["hash", ["=", "b", 8]]]],
            ["list", ["q", "a"], ["q", "b"]]
        ]),
        json!(8),
    );
    check(
        json!(["let", [["source", {"a":{"n":5}}], ["target", {}]],
        ["cp", ["list", "source", ["q","a"]], ["list", "target", ["q","copy"]]],
        ["assign", [".", "source", "a", "n"], 9], "target"]),
        json!({"copy":{"n":9}}),
    );
}

#[test]
fn define_defaults_recursion_statics_and_dynamic_scope() {
    check(
        json!(["define", ["vector", "unused", ["\"", "1 + ("]], 4]),
        json!(4),
    );
    check(
        json!([
            "define",
            ["vector", "sum", "a", ["=", "b", 10], ["\"", "a + b"]],
            ["sum", 2]
        ]),
        json!(12),
    );
    check(
        json!([
            "define",
            [
                "vector",
                "factorial",
                "n",
                ["\"", "if(n < 2, 1, n * factorial(n - 1))"]
            ],
            ["factorial", 5]
        ]),
        json!(120),
    );
    check(
        json!([
            "define",
            [
                "vector",
                "incr",
                ["=", "$inc", 0],
                ["\"", "this.inc := this.inc + 1"]
            ],
            ["incr"],
            ["incr"],
            ["incr"]
        ]),
        json!(3),
    );
    check(
        json!([
            "define",
            ["vector", "read", ["\"", "x"]],
            ["let", [["x", 9]], ["read"]]
        ]),
        json!(9),
    );
}

#[test]
fn eval_forms_use_current_environment() {
    check(
        json!(["let", [["x", 4]], ["eval_ast", ["$AST$", ["+", "x", 2]]]]),
        json!(6),
    );
    check(
        json!(["let", [["x", 4]], ["eval_lpe", ["q", "x + 3"]]]),
        json!(7),
    );
    check(json!(["rep", ["q", "[\"+\",2,3]"]]), json!("5"));
}

#[test]
fn set_options_is_scoped_and_accepts_pairs() {
    check(
        json!(["list", ["set_options", {"resolveString":false}, "missing"], "missing"]),
        json!([{"$lpe":"undefined"},"missing"]),
    );
    check(
        json!([
            "set_options",
            ["list", ["list", ["q", "resolveString"], false]],
            "missing"
        ]),
        json!({"$lpe":"undefined"}),
    );
    check(json!(["set_options", {}, "missing"]), json!("missing"));
}

#[test]
fn async_values_work_in_conditions_mapping_and_try() {
    let mut rt = Runtime::new();
    rt.register_async("later", |args| {
        Box::pin(async move { Ok(args.first().cloned().unwrap_or(Value::Undefined)) })
    });
    let ast = json!([
        "list",
        ["if", ["later", true], 7, 8],
        [
            "mapit",
            ["later", ["list", 1, 2]],
            ["later", ["+", "it", 1]]
        ],
        ["try", ["later", 9], "e", ["throw", "unexpected catch"]]
    ]);
    let value = rt.eval_ast(&ast, &EvalOptions::default()).unwrap();
    assert_eq!(rt.to_json(&value).unwrap(), json!([7.0, [2.0, 3.0], 9.0]));
}

#[test]
fn try_does_not_catch_native_async_rejections() {
    let mut rt = Runtime::new();
    rt.set_global("caught", Value::Bool(false));
    rt.register_async("fail", |_| {
        Box::pin(async {
            let mut error = Error::with_value("Error", Value::String("rejected value".into()));
            error.message = "async failure".into();
            Err(error)
        })
    });
    let ast = json!([
        "try",
        ["try", ["fail"], "inner", ["assign", "caught", true]],
        "outer",
        ["assign", "caught", true]
    ]);
    let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
    assert!(error.is_async);
    assert_eq!(error.kind, "Error");
    assert_eq!(error.message, "async failure");
    assert_eq!(error.value, Some(Value::String("rejected value".into())));
    assert_eq!(rt.eval("caught").unwrap(), Value::Bool(false));
}

#[test]
fn try_does_not_catch_global_promise_rejections() {
    let mut rt = Runtime::new();
    rt.set_global("caught", Value::Bool(false));
    let promise = rt.promise(async { Err(Error::new("Error", "global rejection")) });
    rt.set_global("rejected", promise);
    let error = rt
        .eval_ast(
            &json!(["try", "rejected", "e", ["assign", "caught", true]]),
            &EvalOptions::default(),
        )
        .unwrap_err();
    assert!(error.is_async);
    assert_eq!(error.message, "global rejection");
    assert_eq!(rt.eval("caught").unwrap(), Value::Bool(false));
}

#[test]
fn try_still_catches_synchronous_native_errors() {
    let mut rt = Runtime::new();
    rt.register("fail", |_| Err(Error::new("Error", "sync failure")));
    let value = rt
        .eval_ast(
            &json!(["try", ["fail"], "e", ["property", "e", "message"]]),
            &EvalOptions::default(),
        )
        .unwrap();
    assert_eq!(value, Value::String("sync failure".into()));
}

#[test]
fn ast_to_string_is_unevaluated() {
    check(json!(["astToString", ["throw", 1]]), json!("throw,1"));
    check(json!(["[]", 123]), json!("123"));
}

#[test]
fn eval_ast_preserves_callable_values() {
    check(json!(["eval_ast", ["[", "+", 1, 2]]), json!(3));
}

#[test]
fn quoted_get_in_and_cp_roots_are_resolved_again() {
    check(
        json!(["let", [["a", {"3":[300,600]}]], ["get_in", ["q","a"], ["list", ["q","3"], 1]]]),
        json!(600),
    );
    check(
        json!(["let", [["a", {"3":[300,600]}], ["b",{}]],
        ["cp", ["list", ["q","a"], ["q","3"]], ["list", ["q","b"], ["q","5"], 0, ["q","newkey"]]], "b"]),
        json!({"5":[{"newkey":[300,600]}]}),
    );
}

#[test]
fn internal_code_units_are_preserved_but_wire_values_must_be_utf8() {
    let mut rt = Runtime::new();
    let text = Value::String("\u{1f600}".into());
    let high = rt.get(&text, "0");
    let low = rt.get(&text, "1");
    assert_eq!(rt.to_utf16(&high), vec![0xd83d]);
    assert_eq!(rt.to_utf16(&low), vec![0xde00]);
    assert_eq!(rt.to_json(&high).unwrap_err().kind, "UnicodeError");
    rt.set_global("high", high.clone());
    rt.set_global("low", low.clone());
    assert_eq!(
        rt.eval_ast(&json!(["<", "high", "low"]), &EvalOptions::default())
            .unwrap(),
        Value::Bool(true)
    );
    assert_eq!(
        rt.eval_ast(&json!([">", "high", ["q", "z"]]), &EvalOptions::default())
            .unwrap(),
        Value::Bool(true)
    );
    let joined = rt.string_from_utf16([rt.to_utf16(&high), rt.to_utf16(&low)].concat());
    assert_eq!(rt.to_json(&joined).unwrap(), json!("\u{1f600}"));
    let former_tag = json!({"$lpe":"utf16","value":[0xd800]});
    assert!(matches!(rt.from_json(&former_tag), Value::Object(_)));
}

#[test]
fn eval_ast_rejects_cycles_without_recursing_unboundedly() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![]);
    rt.set(&array, "0", array.clone()).unwrap();
    rt.set_global("cycle", array);
    let error = rt
        .eval_ast(&json!(["eval_ast", "cycle"]), &EvalOptions::default())
        .unwrap_err();
    assert_eq!(error.kind, "TypeError");
    assert!(error.message.contains("Circular"));
}

#[test]
fn mapit_keeps_holes_absent() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![Value::Number(1.0), Value::Number(2.0)]);
    rt.delete(&array, "0").unwrap();
    rt.set_global("sparse", array);
    let value = rt
        .eval_ast(&json!(["mapit", "sparse", "it"]), &EvalOptions::default())
        .unwrap();
    assert!(!rt.has_own(&value, "0"));
    assert_eq!(rt.get(&value, "1"), Value::Number(2.0));
}
