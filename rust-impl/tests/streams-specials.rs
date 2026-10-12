use lpe::{Ast, EvalOptions, Runtime, Value};
use serde_json::json;
use std::{cell::Cell, rc::Rc};

fn eval(rt: &mut Runtime, ast: Ast) -> Value {
    rt.eval_ast(&ast, &EvalOptions::default())
        .unwrap_or_else(|error| panic!("{ast}: {error}"))
}

fn source(rt: &mut Runtime, name: &str, initial: Ast) -> Value {
    let initial = rt.from_json(&initial);
    let stream = rt.create_stream(initial);
    rt.set_global(name, stream.clone());
    stream
}

fn next(rt: &mut Runtime, stream: &Value, value: Ast) {
    let value = rt.from_json(&value);
    rt.stream_next(stream, value).unwrap();
}

fn current(rt: &mut Runtime, stream: &Value, expected: Ast) {
    assert!(matches!(stream, Value::Stream(_)), "{stream:?}");
    let value = rt.stream_value(stream).unwrap();
    let expected = rt.from_json(&expected);
    assert_eq!(rt.to_json(&value).unwrap(), rt.to_json(&expected).unwrap());
}

fn counter(rt: &mut Runtime, name: &str, result: Value) -> Rc<Cell<usize>> {
    let calls = Rc::new(Cell::new(0));
    let count = calls.clone();
    rt.register(name, move |_| {
        count.set(count.get() + 1);
        Ok(result.clone())
    });
    calls
}

#[test]
fn if_switches_stream_branches_and_releases_subscriptions() {
    let mut rt = Runtime::new();
    let gate = source(&mut rt, "gate", json!(true));
    let left = source(&mut rt, "left", json!(10));
    let right = source(&mut rt, "right", json!(20));
    let output = eval(&mut rt, json!(["if", "gate", "left", "right"]));
    current(&mut rt, &output, json!(10));
    assert_eq!(rt.stream_stats(&left).unwrap().listeners, 1);
    assert_eq!(rt.stream_stats(&right).unwrap().listeners, 0);
    next(&mut rt, &right, json!(21));
    current(&mut rt, &output, json!(10));
    next(&mut rt, &gate, json!(false));
    current(&mut rt, &output, json!(21));
    assert_eq!(rt.stream_stats(&left).unwrap().listeners, 0);
    assert_eq!(rt.stream_stats(&right).unwrap().listeners, 1);
    next(&mut rt, &left, json!(11));
    current(&mut rt, &output, json!(21));
    next(&mut rt, &gate, json!(true));
    current(&mut rt, &output, json!(11));
    rt.stream_retain(&output).unwrap();
    rt.stream_release(&output).unwrap();
    assert!(!rt.stream_stats(&output).unwrap().disposed);
    rt.stream_release(&output).unwrap();
    assert!(rt.stream_stats(&output).unwrap().disposed);
    for input in [&gate, &left, &right] {
        let stats = rt.stream_stats(input).unwrap();
        assert_eq!(stats.listeners, 0);
        assert_eq!(stats.references, 1);
    }
}

#[test]
fn switched_computed_branches_keep_initial_ownership_but_detach_output() {
    let mut rt = Runtime::new();
    let gate = source(&mut rt, "gate", json!(true));
    let left = source(&mut rt, "left", json!(1));
    let right = source(&mut rt, "right", json!(2));
    let left_calls = counter(&mut rt, "visitLeft", Value::Number(10.0));
    let right_calls = counter(&mut rt, "visitRight", Value::Number(20.0));
    let output = eval(
        &mut rt,
        json!(["if", "gate", ["visitLeft", "left"], ["visitRight", "right"]]),
    );
    assert_eq!((left_calls.get(), right_calls.get()), (1, 0));
    next(&mut rt, &right, json!(3));
    assert_eq!((left_calls.get(), right_calls.get()), (1, 0));
    next(&mut rt, &gate, json!(false));
    assert_eq!((left_calls.get(), right_calls.get()), (1, 1));
    // JS retains the new computed stream's initial owner after switching away.
    // Its callback stays live, but its output is detached from the outer stream.
    assert_eq!(rt.stream_stats(&left).unwrap().listeners, 1);
    next(&mut rt, &left, json!(4));
    assert_eq!((left_calls.get(), right_calls.get()), (2, 1));
    current(&mut rt, &output, json!(20));
    next(&mut rt, &right, json!(5));
    assert_eq!((left_calls.get(), right_calls.get()), (2, 2));
    current(&mut rt, &output, json!(20));
}

#[test]
fn if_multiple_conditions_preserve_branch_options() {
    let mut rt = Runtime::new();
    let gate = source(&mut rt, "gate", json!(false));
    let output = eval(
        &mut rt,
        json!([
            "if",
            "unknownCondition",
            ["throw", "inactive"],
            "gate",
            "unknownBranch",
            9
        ]),
    );
    current(&mut rt, &output, json!(9));
    next(&mut rt, &gate, json!(true));
    current(&mut rt, &output, json!("unknownBranch"));
    next(&mut rt, &gate, json!(false));
    current(&mut rt, &output, json!(9));
}

#[test]
fn logical_forms_short_circuit_on_each_update() {
    for (name, initial, changed, first, second) in [
        ("and", 0, 1, json!(0), json!(9)),
        ("or", 1, 0, json!(1), json!(9)),
        ("logicalAnd", 0, 1, json!(false), json!(true)),
        ("logicalOr", 1, 0, json!(true), json!(true)),
    ] {
        let mut rt = Runtime::new();
        let gate = source(&mut rt, "gate", json!(initial));
        let calls = counter(&mut rt, "tail", Value::Number(9.0));
        let output = eval(&mut rt, json!([name, "gate", ["tail"]]));
        current(&mut rt, &output, first.clone());
        assert_eq!(calls.get(), 0, "{name}");
        next(&mut rt, &gate, json!(changed));
        current(&mut rt, &output, second);
        assert_eq!(calls.get(), 1, "{name}");
        next(&mut rt, &gate, json!(initial));
        current(&mut rt, &output, first);
        assert_eq!(calls.get(), 1, "{name}");
    }
}

#[test]
fn logical_single_arguments_keep_js_identity_and_coercion() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(0));
    for name in ["and", "or"] {
        assert_eq!(eval(&mut rt, json!([name, "input"])), input);
    }
    let output = eval(&mut rt, json!(["logicalAnd", "input"]));
    current(&mut rt, &output, json!(false));
    next(&mut rt, &input, json!(5));
    current(&mut rt, &output, json!(true));
}

#[test]
fn comparisons_unbox_together_and_keep_chained_middle_evaluation() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(1));
    let middle = counter(&mut rt, "middle", Value::Number(5.0));
    let tail = counter(&mut rt, "tail", Value::Number(8.0));
    let output = eval(&mut rt, json!(["<", "input", ["<", ["middle"], ["tail"]]]));
    current(&mut rt, &output, json!(true));
    next(&mut rt, &input, json!(6));
    current(&mut rt, &output, json!(false));
    assert_eq!((middle.get(), tail.get()), (1, 1));
    next(&mut rt, &input, json!(2));
    current(&mut rt, &output, json!(true));
    assert_eq!((middle.get(), tail.get()), (1, 2));
    for name in ["<", "lt", "less", "<=", "le", "lte"] {
        let output = eval(&mut rt, json!([name, 1, "input", 5]));
        current(&mut rt, &output, json!(true));
        next(&mut rt, &input, json!(6));
        current(&mut rt, &output, json!(false));
        next(&mut rt, &input, json!(2));
    }
}

#[test]
fn coalesce_and_plain_assignment_do_not_unbox() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(null));
    let fallback = counter(&mut rt, "fallback", Value::Number(9.0));
    for name in ["nvl", "coalesce"] {
        assert_eq!(eval(&mut rt, json!([name, "input", ["fallback"]])), input);
    }
    assert_eq!(eval(&mut rt, json!([":=", "alias", "input"])), input);
    assert_eq!(eval(&mut rt, json!(["resolve", "alias"])), input);
    let context = eval(&mut rt, json!(["ctx", "input"]));
    assert_eq!(rt.get(&context, "input"), input);
    let returned = eval(&mut rt, json!(["catchReturn", ["return", "input"]]));
    assert_eq!(returned, input);
    next(&mut rt, &input, json!(4));
    assert_eq!(fallback.get(), 0);
    assert_eq!(rt.stream_stats(&input).unwrap().listeners, 0);
}

#[test]
fn begin_restarts_only_the_remaining_sequence_and_catches_return() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(1));
    let before = counter(&mut rt, "before", Value::Null);
    let after = counter(&mut rt, "after", Value::Number(8.0));
    let output = eval(
        &mut rt,
        json!([
            "begin",
            ["before"],
            "input",
            ["return", ["after"]],
            ["throw", "unreachable"]
        ]),
    );
    current(&mut rt, &output, json!(8));
    next(&mut rt, &input, json!(2));
    assert_eq!((before.get(), after.get()), (1, 2));
    current(&mut rt, &output, json!(8));
}

#[test]
fn let_unboxes_raw_pairs_hash_bindings_and_evaluated_bindings() {
    for bindings in [
        json!([["x", "input"]]),
        json!({"x":"input"}),
        json!(["hash", ["=", "x", "input"]]),
    ] {
        let mut rt = Runtime::new();
        let input = source(&mut rt, "input", json!(2));
        let output = eval(&mut rt, json!(["let", bindings, ["+", "x", 1]]));
        current(&mut rt, &output, json!(3));
        next(&mut rt, &input, json!(5));
        current(&mut rt, &output, json!(6));
    }
    let mut rt = Runtime::new();
    let bindings = source(&mut rt, "bindings", json!({"x":3}));
    let output = eval(&mut rt, json!(["let", ["resolve", "bindings"], "x"]));
    current(&mut rt, &output, json!(3));
    next(&mut rt, &bindings, json!({"x":8}));
    current(&mut rt, &output, json!(8));
}

#[test]
fn letstar_rebuilds_dependent_bindings_and_dynamic_names() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(2));
    let key = source(&mut rt, "key", json!("a"));
    let output = eval(
        &mut rt,
        json!([
            "let*",
            [["x", "input"], ["y", ["*", "x", 3]]],
            ["+", "x", "y"]
        ]),
    );
    current(&mut rt, &output, json!(8));
    next(&mut rt, &input, json!(4));
    current(&mut rt, &output, json!(16));
    let dynamic = eval(
        &mut rt,
        json!(["letseq", [[["resolve", "key"], "input"]], ["ctx", "a", "b"]]),
    );
    current(&mut rt, &dynamic, json!({"a":4,"b":{"$lpe":"undefined"}}));
    next(&mut rt, &key, json!("b"));
    current(&mut rt, &dynamic, json!({"a":{"$lpe":"undefined"},"b":4}));
    next(&mut rt, &input, json!(7));
    current(&mut rt, &dynamic, json!({"a":{"$lpe":"undefined"},"b":7}));
}

#[test]
fn def_and_dynamic_undef_repeat_mutations() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(2));
    let output = eval(&mut rt, json!(["def", "bound", "input"]));
    current(&mut rt, &output, json!(2));
    assert_eq!(eval(&mut rt, json!("bound")), Value::Number(2.0));
    next(&mut rt, &input, json!(6));
    assert_eq!(eval(&mut rt, json!("bound")), Value::Number(6.0));
    rt.set_global("other", Value::Number(9.0));
    let key = source(&mut rt, "key", json!("bound"));
    let removed = eval(&mut rt, json!(["undef", ["resolve", "key"]]));
    current(&mut rt, &removed, json!(6));
    next(&mut rt, &key, json!("other"));
    current(&mut rt, &removed, json!(9));
    assert_eq!(eval(&mut rt, json!(["resolve", "other"])), Value::Undefined);
}

#[test]
fn constructors_unbox_flat_values_and_dynamic_hash_keys() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(2));
    let key = source(&mut rt, "key", json!("a"));
    let hash = eval(
        &mut rt,
        json!(["makeHash", ["=", "key", "input"], ["throw", "ignored"]]),
    );
    let vector = eval(&mut rt, json!(["vector", "input", ["=", "named", "input"]]));
    let tuple = eval(&mut rt, json!(["tuple", ["=", "named", "input"]]));
    let kwargs = eval(&mut rt, json!(["hash", "input", ["=", "named", "input"]]));
    current(&mut rt, &hash, json!({"a":2}));
    next(&mut rt, &key, json!("b"));
    next(&mut rt, &input, json!(7));
    current(&mut rt, &hash, json!({"b":7}));
    current(&mut rt, &kwargs, json!({"named":7}));
    let vector = rt.stream_value(&vector).unwrap();
    assert_eq!(rt.get(&vector, "0"), Value::Number(7.0));
    assert_eq!(rt.get(&vector, "named"), Value::Number(7.0));
    let tuple = rt.stream_value(&tuple).unwrap();
    assert!(matches!(tuple, Value::Array(_)));
    assert_eq!(rt.get(&tuple, "named"), Value::Number(7.0));
}

#[test]
fn property_and_dot_assignment_unbox_object_keys_and_value() {
    let mut rt = Runtime::new();
    let object = source(&mut rt, "object", json!({"a":1,"b":2}));
    let key = source(&mut rt, "key", json!("a"));
    let read = eval(&mut rt, json!(["property", "object", ["resolve", "key"]]));
    current(&mut rt, &read, json!(1));
    next(&mut rt, &key, json!("b"));
    current(&mut rt, &read, json!(2));
    next(&mut rt, &object, json!({"b":3}));
    current(&mut rt, &read, json!(3));
    let input = source(&mut rt, "input", json!(5));
    let write = eval(
        &mut rt,
        json!(["assign", [".", "object", ["resolve", "key"]], "input"]),
    );
    current(&mut rt, &write, json!(5));
    next(&mut rt, &input, json!(8));
    let object = rt.stream_value(&object).unwrap();
    assert_eq!(rt.get(&object, "b"), Value::Number(8.0));
    next(&mut rt, &key, json!("c"));
    assert_eq!(rt.get(&object, "c"), Value::Number(8.0));
}

#[test]
fn repeat_unboxes_count_and_each_generated_value() {
    let mut rt = Runtime::new();
    let count = source(&mut rt, "count", json!(2));
    let input = source(&mut rt, "input", json!(4));
    let output = eval(&mut rt, json!(["repeat", "count", "input"]));
    current(&mut rt, &output, json!([4, 4]));
    next(&mut rt, &input, json!(6));
    current(&mut rt, &output, json!([6, 6]));
    next(&mut rt, &count, json!(3));
    current(&mut rt, &output, json!([6, 6, 6]));
    next(&mut rt, &count, json!(0));
    current(&mut rt, &output, json!([]));
}

#[test]
fn mapit_unboxes_source_and_mapped_values_with_local_bindings() {
    let mut rt = Runtime::new();
    let array = source(&mut rt, "array", json!([2, 3]));
    let input = source(&mut rt, "input", json!(10));
    let output = eval(
        &mut rt,
        json!(["mapit", "array", ["return", ["+", "it", "idx", "input"]]]),
    );
    current(&mut rt, &output, json!([12, 14]));
    next(&mut rt, &input, json!(20));
    current(&mut rt, &output, json!([22, 24]));
    next(&mut rt, &array, json!([5]));
    current(&mut rt, &output, json!([25]));
    next(&mut rt, &input, json!(30));
    current(&mut rt, &output, json!([35]));
}

#[test]
fn filterit_truth_tests_stream_predicates_before_unboxing_selected_elements() {
    let mut rt = Runtime::new();
    let array = source(&mut rt, "array", json!([1, 2]));
    let predicate = source(&mut rt, "predicate", json!(false));
    let output = eval(&mut rt, json!(["filterit", "array", "predicate"]));
    current(&mut rt, &output, json!([1, 2]));
    assert_eq!(rt.stream_stats(&predicate).unwrap().listeners, 0);
    next(&mut rt, &predicate, json!(false));
    current(&mut rt, &output, json!([1, 2]));
    next(&mut rt, &array, json!([3]));
    current(&mut rt, &output, json!([3]));
    let items = rt.array(vec![predicate.clone()]);
    rt.set_global("items", items);
    let selected = eval(&mut rt, json!(["filterit", "items", true]));
    current(&mut rt, &selected, json!([false]));
    next(&mut rt, &predicate, json!(true));
    current(&mut rt, &selected, json!([true]));
}

#[test]
fn ordinary_map_keeps_callback_streams_inside_its_array() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(3));
    let output = eval(
        &mut rt,
        json!(["map", ["list", 1, 2], ["fn", "x", "input"]]),
    );
    assert_eq!(
        rt.array_values(&output).unwrap(),
        vec![input.clone(), input.clone()]
    );
    assert_eq!(rt.stream_stats(&input).unwrap().listeners, 0);
}

#[test]
fn get_in_and_cp_follow_reactive_roots_and_paths() {
    let mut rt = Runtime::new();
    let object = source(&mut rt, "object", json!({"a":1,"b":2}));
    let key = source(&mut rt, "key", json!("a"));
    let output = eval(
        &mut rt,
        json!(["get_in", ["resolve", "object"], ["list", "key"]]),
    );
    current(&mut rt, &output, json!(1));
    next(&mut rt, &key, json!("b"));
    current(&mut rt, &output, json!(2));
    next(&mut rt, &object, json!({"b":9}));
    current(&mut rt, &output, json!(9));
    let from = source(&mut rt, "from", json!([{"a":4},"a"]));
    let to = source(&mut rt, "to", json!([{}, "copy"]));
    let copied = eval(&mut rt, json!(["cp", "from", "to"]));
    current(&mut rt, &copied, json!({"copy":4}));
    next(&mut rt, &from, json!([{"b":7},"b"]));
    current(&mut rt, &copied, json!({"copy":7}));
    next(&mut rt, &to, json!([{}, "other"]));
    current(&mut rt, &copied, json!({"other":7}));
}

#[test]
fn assoc_in_reacts_to_assigned_values_without_popping_path_again() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(4));
    let object = rt.from_json(&json!({}));
    let path = rt.from_json(&json!(["a", "b"]));
    rt.set_global("object", object.clone());
    rt.set_global("path", path.clone());
    let output = eval(&mut rt, json!(["assoc_in", "object", "path", "input"]));
    current(&mut rt, &output, json!({"a":{"b":4}}));
    assert_eq!(
        rt.array_values(&path).unwrap(),
        vec![Value::String("a".into())]
    );
    next(&mut rt, &input, json!(8));
    assert_eq!(rt.stream_value(&output).unwrap(), object);
    current(&mut rt, &output, json!({"a":{"b":8}}));
    assert_eq!(
        rt.array_values(&path).unwrap(),
        vec![Value::String("a".into())]
    );
}

#[test]
fn eval_forms_unbox_input_and_preserve_lexical_context() {
    for (name, first, second, initial, changed) in [
        (
            "eval_ast",
            json!(["+", "x", 1]),
            json!(["*", "x", 2]),
            json!(5),
            json!(8),
        ),
        (
            "eval_lpe",
            json!("x + 1"),
            json!("x * 2"),
            json!(5),
            json!(8),
        ),
        (
            "rep",
            json!("[\"+\",\"x\",1]"),
            json!("[\"*\",\"x\",2]"),
            json!("5"),
            json!("8"),
        ),
    ] {
        let mut rt = Runtime::new();
        let code = source(&mut rt, "code", first);
        let output = eval(&mut rt, json!(["let", [["x", 4]], [name, "code"]]));
        current(&mut rt, &output, initial);
        next(&mut rt, &code, second);
        current(&mut rt, &output, changed);
    }
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(3));
    let output = eval(&mut rt, json!(["rep", ["q", "\"input\""]]));
    current(&mut rt, &output, json!("3"));
    next(&mut rt, &input, json!(7));
    current(&mut rt, &output, json!("7"));
}

#[test]
fn set_options_reacts_without_changing_outer_options() {
    let mut rt = Runtime::new();
    let options = source(&mut rt, "options", json!({"resolveString":false}));
    let output = eval(&mut rt, json!(["set_options", "options", "missing"]));
    current(&mut rt, &output, json!({"$lpe":"undefined"}));
    next(&mut rt, &options, json!({"resolveString":true}));
    current(&mut rt, &output, json!("missing"));
    next(&mut rt, &options, json!([["resolveString", false]]));
    current(&mut rt, &output, json!({"$lpe":"undefined"}));
    assert_eq!(
        eval(&mut rt, json!("missing")),
        Value::String("missing".into())
    );
}

#[test]
fn do_unboxes_body_before_condition_and_keeps_shared_iteration_limit() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(1));
    let conditions = counter(&mut rt, "condition", Value::Bool(false));
    let options = EvalOptions {
        max_loop_iterations: 2,
        ..Default::default()
    };
    let output = rt
        .eval_ast(&json!(["do", ["condition"], "input"]), &options)
        .unwrap();
    current(&mut rt, &output, json!(1));
    next(&mut rt, &input, json!(2));
    current(&mut rt, &output, json!(2));
    assert_eq!(conditions.get(), 2);
    let error = rt.stream_next(&input, Value::Number(3.0)).unwrap_err();
    assert_eq!(error.kind, "Error");
    assert!(error.message.contains("maximum number of iterations (2)"));
    assert_eq!(conditions.get(), 2);
}

#[test]
fn do_condition_stream_resumes_body_and_switches_back_to_saved_result() {
    let mut rt = Runtime::new();
    let gate = source(&mut rt, "gate", json!(false));
    rt.set_global("count", Value::Number(0.0));
    let output = eval(
        &mut rt,
        json!([
            "do",
            ["and", "gate", ["<", "count", 3]],
            ["assign", "count", ["+", "count", 1]]
        ]),
    );
    current(&mut rt, &output, json!(1));
    next(&mut rt, &gate, json!(true));
    current(&mut rt, &output, json!(3));
    next(&mut rt, &gate, json!(false));
    current(&mut rt, &output, json!(1));
    assert_eq!(eval(&mut rt, json!("count")), Value::Number(3.0));
}

#[test]
fn mapit_preserves_sparse_holes_when_unboxing_mapped_streams() {
    let mut rt = Runtime::new();
    let input = source(&mut rt, "input", json!(4));
    let array = rt.from_json(&json!([1, 2, 3]));
    rt.delete(&array, "1").unwrap();
    rt.set_global("array", array);
    let output = eval(&mut rt, json!(["mapit", "array", ["+", "it", "input"]]));
    let value = rt.stream_value(&output).unwrap();
    assert!(!rt.has_own(&value, "1"));
    assert_eq!(rt.get(&value, "0"), Value::Number(5.0));
    next(&mut rt, &input, json!(10));
    let value = rt.stream_value(&output).unwrap();
    assert!(!rt.has_own(&value, "1"));
    assert_eq!(rt.get(&value, "2"), Value::Number(13.0));
}

#[test]
fn stream_context_roots_inactive_ast_literals_and_lexical_environments() {
    let mut rt = Runtime::new();
    let gate = source(&mut rt, "gate", json!(false));
    let object = rt.from_json(&json!({"answer":42}));
    let literal = rt.ast_literal(object);
    let output = eval(
        &mut rt,
        json!([
            "let",
            [["local", 3]],
            [
                "if",
                "gate",
                ["+", ["property", literal, "answer"], "local"],
                0
            ]
        ]),
    );
    rt.collect_garbage(std::slice::from_ref(&output));
    next(&mut rt, &gate, json!(true));
    current(&mut rt, &output, json!(45));
    next(&mut rt, &gate, json!(false));
    rt.collect_garbage(std::slice::from_ref(&output));
    next(&mut rt, &gate, json!(true));
    current(&mut rt, &output, json!(45));
}
