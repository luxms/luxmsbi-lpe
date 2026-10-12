//! Portable safety checks: fixed seeds, explicit GC roots, and work counters.
//! No timing thresholds, external reference process, or ignored failure cases.
use futures::executor::block_on;
use indexmap::IndexMap;
use lpe::{deparse, parse, Error, EvalOptions, Runtime, Value};
use rand::{rngs::StdRng, Rng, SeedableRng};
use serde_json::json;
use std::{panic::catch_unwind, sync::atomic::Ordering};

fn call(rt: &mut Runtime, function: Value, args: Vec<Value>) -> lpe::Result<Value> {
    let env = rt.global_env();
    block_on(rt.call_value(function, args, env))
}

fn expired_array(rt: &Runtime, value: &Value) {
    assert_eq!(rt.array_values(value).unwrap_err().kind, "InvalidHandle");
}

#[test]
fn repeated_closure_environment_backing_and_literal_cycles_are_collected() {
    let mut rt = Runtime::new();
    rt.collect_garbage(&[]);
    let baseline = rt.live_allocations();
    for iteration in 0..256 {
        let payload = rt.array(vec![Value::Number(iteration as f64)]);
        let backing = rt.object(IndexMap::new());
        let env = rt
            .env_from_value(backing.clone(), vec![rt.global_env()])
            .unwrap();
        let body = rt.ast_literal(payload.clone());
        let closure = rt.closure(vec![], body, env, EvalOptions::default());
        rt.set(&backing, "self", closure.clone()).unwrap();
        rt.set(&payload, "owner", closure.clone()).unwrap();
        rt.set(&payload, "backing", backing.clone()).unwrap();
        rt.collect_garbage(std::slice::from_ref(&closure));
        assert_eq!(rt.live_allocations(), baseline + 5, "iteration {iteration}");
        let returned = call(&mut rt, closure.clone(), vec![]).unwrap();
        assert_eq!(returned, payload);
        assert_eq!(
            rt.array_values(&returned).unwrap(),
            vec![Value::Number(iteration as f64)]
        );
        rt.collect_garbage(std::slice::from_ref(&closure));
        assert_eq!(
            rt.live_allocations(),
            baseline + 5,
            "invocation environment leaked"
        );
        rt.collect_garbage(&[]);
        assert_eq!(
            rt.live_allocations(),
            baseline,
            "cycle leaked at iteration {iteration}"
        );
        expired_array(&rt, &payload);
        assert_eq!(
            rt.object_values(&backing).unwrap_err().kind,
            "InvalidHandle"
        );
        assert_eq!(
            call(&mut rt, closure, vec![]).unwrap_err().kind,
            "InvalidHandle"
        );
    }
}

#[test]
fn rooted_closure_keeps_environment_bindings_alive_but_not_invocation_frames() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let payload = rt.array(vec![Value::Number(42.0)]);
    let env = rt.new_env(
        IndexMap::from([("captured".into(), payload.clone())]),
        vec![rt.global_env()],
    );
    let closure = rt.closure(vec![], json!("captured"), env, EvalOptions::default());
    rt.assign(env, "self", closure.clone()).unwrap();
    for _ in 0..128 {
        rt.collect_garbage(std::slice::from_ref(&closure));
        assert_eq!(rt.live_allocations(), baseline + 3);
        assert_eq!(call(&mut rt, closure.clone(), vec![]).unwrap(), payload);
    }
    rt.collect_garbage(&[]);
    assert_eq!(rt.live_allocations(), baseline);
    expired_array(&rt, &payload);
}

#[test]
fn failed_evaluation_and_error_payloads_leave_no_unrooted_arena_data() {
    let mut rt = Runtime::new();
    rt.register("fail_hardening", |args| {
        Err(Error::with_value("HardeningFailure", args[0].clone()))
    });
    rt.collect_garbage(&[]);
    let baseline = rt.live_allocations();
    let ast =
        json!(["let", {"scratch":["list",["hash"],["list",1,2]]}, ["fail_hardening","scratch"]]);
    for iteration in 0..256 {
        let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
        assert_eq!(error.kind, "HardeningFailure");
        let payload = error
            .value
            .expect("host failure preserves its array payload");
        assert_eq!(rt.array_values(&payload).unwrap().len(), 2);
        rt.collect_garbage(&[]);
        assert_eq!(
            rt.live_allocations(),
            baseline,
            "failed evaluation leaked at {iteration}"
        );
        expired_array(&rt, &payload);
        assert_eq!(rt.eval("6 * 7").unwrap(), Value::Number(42.0));
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
    }
}

#[test]
fn explicitly_rooted_error_payload_survives_and_then_is_reclaimed() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let error = rt
        .eval_ast(
            &json!(["throw", ["list", ["list", 42]]]),
            &EvalOptions::default(),
        )
        .unwrap_err();
    assert_eq!(error.kind, "Error");
    let payload = error.value.expect("throw payload");
    rt.collect_garbage(std::slice::from_ref(&payload));
    assert_eq!(rt.live_allocations(), baseline + 2);
    let nested = rt.get(&payload, "0");
    assert_eq!(rt.array_values(&nested).unwrap(), vec![Value::Number(42.0)]);
    rt.collect_garbage(&[]);
    assert_eq!(rt.live_allocations(), baseline);
    expired_array(&rt, &payload);
    expired_array(&rt, &nested);
}

#[test]
fn allocation_before_budget_failure_is_collectible_and_runtime_recovers() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let options = EvalOptions {
        max_steps: 64,
        ..EvalOptions::default()
    };
    let ast = json!([
        "map",
        ["list", 1, 2, 3],
        [
            "fn",
            ["list", "x"],
            ["begin", ["list", "x"], ["range", 1e100]]
        ]
    ]);
    for _ in 0..64 {
        assert_eq!(rt.eval_ast(&ast, &options).unwrap_err().kind, "LimitError");
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
        assert_eq!(
            rt.eval_ast(&json!(42), &options).unwrap(),
            Value::Number(42.0)
        );
    }
}

#[test]
fn stale_handles_never_alias_reused_slots_and_named_children_are_traced() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let mut expired = Vec::new();
    for _ in 0..256 {
        let owner = rt.array(vec![]);
        let child = rt.array(vec![Value::Number(7.0)]);
        rt.set(&owner, "child", child.clone()).unwrap();
        rt.set(&child, "owner", owner.clone()).unwrap();
        rt.collect_garbage(std::slice::from_ref(&owner));
        assert_eq!(rt.live_allocations(), baseline + 2);
        assert_eq!(rt.get(&owner, "child"), child);
        assert_eq!(rt.array_values(&child).unwrap(), vec![Value::Number(7.0)]);
        for old in &expired {
            assert_ne!(*old, owner);
            expired_array(&rt, old);
        }
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
        expired.push(owner);
    }
}

fn small_budget_runtime() -> Runtime {
    let mut rt = Runtime::new();
    let options = EvalOptions {
        max_steps: 64,
        ..EvalOptions::default()
    };
    assert_eq!(
        rt.eval_ast(&json!(0), &options).unwrap(),
        Value::Number(0.0)
    );
    rt
}

#[test]
fn rejected_sparse_growth_is_atomic_and_does_not_change_named_properties() {
    let mut rt = small_budget_runtime();
    let array = rt.array(vec![Value::Number(1.0), Value::Undefined]);
    rt.set(&array, "label", Value::String("kept".into()))
        .unwrap();
    rt.delete(&array, "0").unwrap();
    let values = rt.array_values(&array).unwrap();
    let keys = rt.keys(&array);
    for key in ["64", "1000000000", "4294967294"] {
        assert_eq!(
            rt.set(&array, key, Value::Null).unwrap_err().kind,
            "LimitError"
        );
        assert_eq!(rt.array_values(&array).unwrap(), values);
        assert_eq!(rt.keys(&array), keys);
        assert_eq!(rt.get(&array, "label"), Value::String("kept".into()));
    }
    for n in [-1.0, 0.5, f64::NAN, f64::INFINITY] {
        assert_eq!(
            rt.set(&array, "length", Value::Number(n)).unwrap_err().kind,
            "RangeError"
        );
        assert_eq!(rt.array_values(&array).unwrap(), values);
        assert_eq!(rt.keys(&array), keys);
    }
}

#[test]
fn setting_existing_length_at_array_budget_boundary_is_a_noop() {
    let mut rt = small_budget_runtime();
    let array = rt.array(vec![]);
    rt.set(&array, "63", Value::Number(42.0)).unwrap();
    assert_eq!(rt.get(&array, "length"), Value::Number(64.0));
    let keys = rt.keys(&array);
    assert_eq!(keys, vec!["63".to_owned()]);
    rt.set(&array, "length", Value::Number(64.0))
        .expect("setting an already permitted length must not fail");
    assert_eq!(rt.keys(&array), keys);
    assert_eq!(rt.get(&array, "63"), Value::Number(42.0));
}

#[test]
fn nonindex_properties_cannot_trigger_huge_sparse_allocation() {
    let mut rt = small_budget_runtime();
    let array = rt.array(vec![Value::Number(1.0)]);
    for key in [
        "01",
        "-1",
        "1.0",
        "+1",
        "4294967295",
        "18446744073709551616",
    ] {
        rt.set(&array, key, Value::String(key.into())).unwrap();
        assert_eq!(rt.get(&array, key), Value::String(key.into()));
        assert!(rt.has_own(&array, key));
        assert_eq!(rt.get(&array, "length"), Value::Number(1.0));
        rt.delete(&array, key).unwrap();
        assert!(!rt.has_own(&array, key));
    }
    assert_eq!(rt.keys(&array), vec!["0".to_owned()]);
}

#[test]
fn repeated_sparse_shrink_and_regrowth_never_resurrect_deleted_values() {
    let mut rt = small_budget_runtime();
    let array = rt.array(vec![]);
    for _ in 0..128 {
        rt.set(&array, "31", Value::Number(31.0)).unwrap();
        assert_eq!(rt.keys(&array), vec!["31".to_owned()]);
        rt.set(&array, "length", Value::Number(0.0)).unwrap();
        rt.set(&array, "length", Value::Number(32.0)).unwrap();
        assert!(rt.keys(&array).is_empty());
        for index in 0..32 {
            assert!(!rt.has_own(&array, &index.to_string()));
            assert_eq!(rt.get(&array, &index.to_string()), Value::Undefined);
        }
        rt.set(&array, "length", Value::Number(0.0)).unwrap();
    }
}

#[test]
fn sparse_callbacks_charge_skipped_slots_against_the_work_budget() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![]);
    rt.set(&array, "length", Value::Number(1024.0)).unwrap();
    rt.set_global("sparse", array.clone());
    rt.register("must_not_run", |_| {
        panic!("a callback must not run on a hole")
    });
    let options = EvalOptions {
        max_steps: 32,
        ..EvalOptions::default()
    };
    for name in ["map", "filter", "reduce", "flat", "sort"] {
        let ast = if name == "flat" || name == "sort" {
            json!([name, "sparse"])
        } else {
            json!([name, "sparse", "must_not_run", 0])
        };
        assert_eq!(
            rt.eval_ast(&ast, &options).unwrap_err().kind,
            "LimitError",
            "{name}"
        );
        assert_eq!(rt.get(&array, "length"), Value::Number(1024.0));
        assert!(rt.keys(&array).is_empty());
    }
}

fn assert_syntax_error(source: &str) {
    let result =
        catch_unwind(|| parse(source)).unwrap_or_else(|_| panic!("parser panicked on {source:?}"));
    let error = result.unwrap_err();
    assert_eq!(error.kind, "SyntaxError", "input {source:?}");
    assert!(
        !error.message.is_empty(),
        "syntax error must contain diagnostics"
    );
}

#[test]
fn seeded_randomized_malformed_inputs_are_rejected_without_panicking() {
    let mut rng = StdRng::seed_from_u64(0x6c70_652d_7361_6665);
    let alphabet = [
        'a',
        'Z',
        '0',
        '9',
        '_',
        ' ',
        '+',
        '*',
        '\u{03c6}',
        '\u{4e2d}',
        '\u{1f600}',
    ];
    for _ in 0..1024 {
        let count = rng.gen_range(0..96);
        let text: String = (0..count)
            .map(|_| alphabet[rng.gen_range(0..alphabet.len())])
            .collect();
        assert_syntax_error(&format!("'{text}"));
        assert_syntax_error(&format!("){text}"));
        assert_syntax_error(&("(".repeat(rng.gen_range(1..128)) + "42"));
    }
}

#[test]
fn seeded_arbitrary_token_inputs_are_deterministic_and_successes_roundtrip() {
    let mut rng = StdRng::seed_from_u64(0x4c50_455f_4655_5a5a);
    let tokens = [
        "a",
        "0",
        "1",
        ".",
        "..",
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        ",",
        ";",
        ":=",
        "=>",
        "+",
        "-",
        "/",
        "*",
        "\"",
        "'",
        "\\",
        "\n",
        " ",
        "and",
        "or",
        "not",
        "\0",
        "\u{03c6}",
        "\u{1f600}",
    ];
    let (mut accepted, mut rejected) = (0, 0);
    for case in 0..(64 + 4096) {
        let source = if case < 64 {
            format!("f({}, {})", case, case + 1)
        } else {
            let count = rng.gen_range(0..48);
            (0..count)
                .map(|_| tokens[rng.gen_range(0..tokens.len())])
                .collect::<String>()
        };
        let parsed =
            catch_unwind(|| parse(&source)).unwrap_or_else(|_| panic!("case {case}: {source:?}"));
        if case < 64 {
            assert_eq!(
                parsed
                    .as_ref()
                    .expect("deterministic valid call must parse"),
                &json!(["f", case, case + 1])
            );
        }
        let again = parse(&source);
        match parsed {
            Ok(ast) => {
                accepted += 1;
                assert_eq!(again.unwrap(), ast, "nondeterministic parse: {source:?}");
                let rendered = deparse(&ast)
                    .unwrap_or_else(|e| panic!("accepted input {source:?}, AST {ast}: {e}"));
                assert_eq!(
                    parse(&rendered).unwrap(),
                    ast,
                    "case {case}: {source:?} rendered as {rendered:?}"
                );
            }
            Err(error) => {
                rejected += 1;
                let again = again.unwrap_err();
                assert_eq!(error.kind, "SyntaxError", "case {case}: {source:?}");
                assert!(!error.message.is_empty());
                assert_eq!((error.kind, error.message), (again.kind, again.message));
            }
        }
    }
    assert!(
        accepted >= 64,
        "corpus must exercise successful parsing too: {accepted}"
    );
    assert!(
        rejected >= 3000,
        "corpus must exercise malformed input: {rejected}"
    );
}

#[test]
fn parser_source_token_and_nesting_limits_are_enforced() {
    let boundary = " ".repeat(1_048_575) + "1";
    assert_eq!(parse(&boundary).unwrap(), json!(1));
    let oversized = boundary + " ";
    let error = parse(&oversized).unwrap_err();
    assert_eq!(error.kind, "SyntaxError");
    assert_eq!(error.message, "Source size limit exceeded.");

    let tokens = "a ".repeat(100_001);
    let error = parse(&tokens).unwrap_err();
    assert_eq!(error.kind, "SyntaxError");
    assert_eq!(error.message, "Token limit exceeded.");

    for source in [
        "(".repeat(1024) + "1" + &")".repeat(1024),
        "x=".repeat(1024) + "1",
        "- ".repeat(1024) + "1",
    ] {
        let error = parse(&source).unwrap_err();
        assert_eq!(error.kind, "SyntaxError");
        assert!(error.message.contains("nesting limit exceeded"), "{error}");
    }
    assert_eq!(parse("1 + 2").unwrap(), json!(["+", 1, 2]));
}

#[test]
fn evaluation_depth_loop_and_work_limits_recover_without_gc_leaks() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let mut nested = json!(42);
    for _ in 0..32 {
        nested = json!(["identity", nested]);
    }
    let options = EvalOptions {
        max_depth: 8,
        max_steps: 1000,
        max_loop_iterations: 3,
        ..EvalOptions::default()
    };
    assert_eq!(
        rt.eval_ast(&nested, &options).unwrap_err().kind,
        "LimitError"
    );
    let error = rt
        .eval_ast(&json!(["do", true, ["list", 1]]), &options)
        .unwrap_err();
    assert_eq!(error.kind, "Error");
    assert!(error.message.contains("maximum number of iterations (3)"));
    let options = EvalOptions {
        max_steps: 16,
        ..EvalOptions::default()
    };
    assert_eq!(
        rt.eval_ast(&json!(["range", 1e100]), &options)
            .unwrap_err()
            .kind,
        "LimitError"
    );
    rt.collect_garbage(&[]);
    assert_eq!(rt.live_allocations(), baseline);
    assert_eq!(
        rt.eval_ast(&json!(["+", 20, 22]), &EvalOptions::default())
            .unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn cancellation_is_explicit_and_recoverable() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let cancellation = rt.cancellation_token();
    cancellation.store(true, Ordering::Relaxed);
    assert_eq!(
        rt.eval_ast(&json!(["reshape", 1e9, 1]), &EvalOptions::default())
            .unwrap_err()
            .kind,
        "Cancelled"
    );
    cancellation.store(false, Ordering::Relaxed);
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
    rt.collect_garbage(&[]);
    assert_eq!(rt.live_allocations(), baseline);
}

#[test]
fn nan_sort_comparator_keeps_stable_input_order() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![
        Value::Number(3.0),
        Value::Number(1.0),
        Value::Number(2.0),
    ]);
    rt.register("nan_compare", |_| Ok(Value::Number(f64::NAN)));
    let callback = rt
        .lookup(
            rt.global_env(),
            "nan_compare",
            &EvalOptions::default(),
            true,
        )
        .unwrap();
    let result = call(
        &mut rt,
        Value::Builtin("sort".into()),
        vec![array.clone(), callback],
    )
    .unwrap();
    assert_eq!(result, array);
    assert_eq!(
        rt.array_values(&array).unwrap(),
        vec![Value::Number(3.0), Value::Number(1.0), Value::Number(2.0)]
    );
}
