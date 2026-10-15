use futures::{executor::block_on, FutureExt};
use lpe::{Error, EvalOptions, Runtime, RuntimeControls, RuntimeLimits, Value};
use serde_json::json;
use std::{cell::Cell, num::NonZeroUsize, rc::Rc, sync::atomic::Ordering, task::Poll};

fn controlled(work: usize, bytes: usize) -> Runtime {
    let mut rt = Runtime::new();
    rt.set_controls(Some(RuntimeControls::new(RuntimeLimits {
        max_work: work,
        max_intermediate_bytes: bytes,
        ..RuntimeLimits::default()
    })))
    .unwrap();
    rt
}

#[test]
fn callback_is_same_thread_and_preserves_structured_error() {
    let thread = std::thread::current().id();
    let count = Rc::new(Cell::new(0));
    let calls = count.clone();
    let mut rt = Runtime::new();
    rt.set_controls(Some(
        RuntimeControls::new(RuntimeLimits::default()).with_interrupt_hook(
            NonZeroUsize::new(3).unwrap(),
            move || {
                assert_eq!(std::thread::current().id(), thread);
                calls.set(calls.get() + 1);
                if calls.get() == 4 {
                    Err(Error::new("Cancelled", "host interrupt"))
                } else {
                    Ok(())
                }
            },
        ),
    ))
    .unwrap();
    let error = rt.eval("range(100)").unwrap_err();
    assert_eq!(error.kind, "Cancelled");
    assert_eq!(error.message, "host interrupt");
    assert_eq!(count.get(), 4);
    assert_eq!(rt.control_usage().work, 10);
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn pathological_regex_stops_inside_search_and_runtime_recovers() {
    for flags in ["", "u", "g", "y"] {
        let mut rt = controlled(5000, 1_000_000);
        let ast = json!([
            "re_match",
            ["q", format!("{}!", "a".repeat(24))],
            ["q", "^(a+)+$"],
            ["q", flags]
        ]);
        let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
        assert_eq!(error.kind, "LimitError");
        assert!(error.message.contains("work"));
        assert_eq!(rt.control_usage().work, 5000);
        assert_eq!(rt.eval("6*7").unwrap(), Value::Number(42.0));
    }
}

#[test]
fn hook_and_atomic_token_are_polled_inside_regex() {
    for atomic in [false, true] {
        let mut rt = Runtime::new();
        let token = rt.cancellation_token();
        let calls = Rc::new(Cell::new(0));
        let count = calls.clone();
        rt.set_controls(Some(
            RuntimeControls::new(RuntimeLimits::default()).with_interrupt_hook(
                NonZeroUsize::new(1).unwrap(),
                move || {
                    count.set(count.get() + 1);
                    if count.get() == 4000 {
                        if atomic {
                            token.store(true, Ordering::Relaxed);
                        } else {
                            return Err(Error::new("Cancelled", "regex interrupt"));
                        }
                    }
                    Ok(())
                },
            ),
        ))
        .unwrap();
        let ast = json!([
            "re_match",
            ["q", "aaaaaaaaaaaaaaaaaaaaaaaa!"],
            ["q", "^(a+)+$"]
        ]);
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err().kind,
            "Cancelled"
        );
        assert_eq!(calls.get(), 4000);
        rt.cancellation_token().store(false, Ordering::Relaxed);
        assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
    }
}

#[test]
fn allocation_is_rejected_before_repeat_body_and_padding_expansion() {
    let calls = Rc::new(Cell::new(0));
    let count = calls.clone();
    let mut rt = controlled(100_000, 4096);
    rt.register("body", move |_| {
        count.set(count.get() + 1);
        Ok(Value::Null)
    });
    for source in [
        "repeat(100000, body())",
        "padEnd('x', 1000000000, 'a')",
        "reshape(100000, 'abc')",
    ] {
        let error = rt.eval(source).unwrap_err();
        assert_eq!(error.kind, "LimitError", "{source}: {error}");
        assert!(error.message.contains("allocation"), "{source}: {error}");
        assert!(
            rt.control_usage().work < 1000,
            "must reject before expansion"
        );
    }
    assert_eq!(calls.get(), 0);
}

#[test]
fn cumulative_bytes_reset_between_evaluations_not_between_operations() {
    let mut rt = controlled(100_000, 5000);
    rt.eval("padEnd('x', 500, 'a')").unwrap();
    let first = rt.control_usage();
    rt.eval("padEnd('x', 500, 'a')").unwrap();
    assert_eq!(rt.control_usage(), first);
    let error = rt
        .eval("padEnd('x', 500, 'a'); padEnd('x', 500, 'a')")
        .unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert!(error.message.contains("allocation"));
    assert!(rt.control_usage().intermediate_bytes <= 5000);
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn nested_evaluation_cannot_reset_or_replace_controls() {
    let mut rt = controlled(40, 1_000_000);
    rt.register_special("nested", |rt, _, _, _| {
        async move {
            assert_eq!(rt.set_controls(None).unwrap_err().kind, "OptionsError");
            rt.eval_async(
                &json!(["range", 100]),
                &EvalOptions {
                    max_steps: usize::MAX,
                    max_depth: 256,
                    ..EvalOptions::default()
                },
            )
            .await
        }
        .boxed_local()
    });
    assert_eq!(rt.eval("nested()").unwrap_err().kind, "LimitError");
    assert_eq!(rt.control_usage().work, 40);
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn nested_options_cannot_relax_work_or_depth() {
    let mut rt = controlled(1000, 1_000_000);
    rt.register_special("limits", |rt, args, env, mut options| {
        async move {
            options.max_steps = args[0].as_u64().unwrap() as usize;
            options.max_depth = args[1].as_u64().unwrap() as usize;
            rt.eval_in(&args[2], env, &options).await
        }
        .boxed_local()
    });
    let ast = json!(["limits", 40, 128, ["limits", 10000, 128, ["range", 100]]]);
    assert_eq!(
        rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err().kind,
        "LimitError"
    );
    assert!(rt.control_usage().work <= 41);
    let ast = json!([
        "limits",
        1000,
        4,
        [
            "limits",
            1000,
            256,
            ["+", ["+", ["+", ["+", 1, 1], 1], 1], 1]
        ]
    ]);
    let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert!(error.message.contains("nesting"));
}

#[test]
fn failures_are_latched_even_when_host_or_lpe_catches_them() {
    let mut rt = controlled(1000, 1000);
    rt.register_special("swallow", |rt, _, _, _| {
        async move {
            assert_eq!(rt.charge_intermediate(1001).unwrap_err().kind, "LimitError");
            Ok(Value::Number(42.0))
        }
        .boxed_local()
    });
    assert_eq!(rt.eval("swallow()").unwrap_err().kind, "LimitError");
    assert_eq!(
        rt.eval("try(padEnd('x', 1000000), error, 42)")
            .unwrap_err()
            .kind,
        "LimitError"
    );
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn dropping_a_pending_evaluation_releases_its_control_scope() {
    let mut rt = controlled(1000, 10000);
    rt.register_async("wait", |_| futures::future::pending().boxed_local());
    let ast = json!(["wait"]);
    let options = EvalOptions::default();
    let mut future = Box::pin(rt.eval_async(&ast, &options));
    assert!(matches!(
        block_on(async { futures::poll!(&mut future) }),
        Poll::Pending
    ));
    drop(future);
    rt.set_controls(None).unwrap();
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn controlled_results_match_defaults_for_representative_builtins() {
    let mut rt = controlled(1_000_000, 10_000_000);
    let mut default = Runtime::new();
    for source in [
        "padStart('x', 5, 'ab')",
        "replaceAll('abba', 'b', '$`')",
        "split('a,b,c', ',')",
        "join(['a', 'b'], '-')",
        "reshape(5, 'a', 'b')",
        "map([1,2,3], fn(x, x+1))",
        "re_match('ababa', '(a)(b)?', 'g')",
        "re_match('ab', '(?<x>a)b', 'd')",
        "upper('Stra\u{df}e')",
        "'a' + 'b'",
        "toStr([1, null, [2,3]])",
    ] {
        let a = rt.eval(source).unwrap_or_else(|e| panic!("{source}: {e}"));
        let b = default
            .eval(source)
            .unwrap_or_else(|e| panic!("{source}: {e}"));
        assert_eq!(
            rt.to_json(&a).unwrap(),
            default.to_json(&b).unwrap(),
            "{source}"
        );
    }
}

#[test]
fn host_byte_reservations_detect_overflow_before_allocation() {
    let mut rt = controlled(1000, usize::MAX);
    rt.register_special("overflow", |rt, _, _, _| {
        async move {
            rt.charge_intermediate(usize::MAX)?;
            rt.charge_intermediate(1)?;
            Ok(Value::Null)
        }
        .boxed_local()
    });
    assert_eq!(rt.eval("overflow()").unwrap_err().kind, "LimitError");
    assert_eq!(
        block_on(rt.eval_async(&json!(42), &EvalOptions::default())).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn array_growth_rejects_before_mutation_and_is_collectible() {
    let mut rt = controlled(1000, 1024);
    let array = rt.array(vec![Value::Number(1.0)]);
    rt.set_global("arr", array.clone());
    for ast in [
        json!(["set", "arr", ["q", "length"], 100000]),
        json!(["set", "arr", 100000, 1]),
    ] {
        let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
        assert_eq!(error.kind, "LimitError");
        assert_eq!(rt.array_values(&array).unwrap(), vec![Value::Number(1.0)]);
    }
    rt.collect_garbage(&[]);
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn async_siblings_and_nested_evaluations_share_byte_reservations() {
    let mut rt = controlled(1000, 1000);
    rt.register_special("reserve", |rt, _, _, _| {
        async move {
            rt.charge_intermediate(600)?;
            Ok(Value::Null)
        }
        .boxed_local()
    });
    rt.register_special("nested", |rt, _, _, options| {
        async move { rt.eval_async(&json!(["reserve"]), &options).await }.boxed_local()
    });
    rt.eval("reserve()").unwrap();
    assert_eq!(
        rt.eval("nested(); nested()").unwrap_err().kind,
        "LimitError"
    );
    rt.register_async("later", |_| async { Ok(Value::Null) }.boxed_local());
    assert_eq!(
        rt.eval("list(later(), reserve(), reserve())")
            .unwrap_err()
            .kind,
        "LimitError"
    );
    rt.eval("reserve()").unwrap();
}

#[test]
fn preprocessing_and_oversized_patterns_are_bounded() {
    let mut rt = controlled(100_000, 1_000_000);
    rt.set_global("pattern", Value::String("a".repeat(4097)));
    let error = rt.eval("re_match('a', pattern)").unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert!(error.message.contains("pattern"));
    assert!(rt.control_usage().work < 100);
    rt.set_global("text", Value::String("a".repeat(10000)));
    rt.set_controls(Some(RuntimeControls::new(RuntimeLimits {
        max_work: 100,
        ..RuntimeLimits::default()
    })))
    .unwrap();
    assert_eq!(
        rt.eval("re_match(text, 'z')").unwrap_err().kind,
        "LimitError"
    );
    assert_eq!(rt.control_usage().work, 100);
}

#[test]
fn resource_limits_cover_other_string_expansion_paths() {
    for source in [
        "replaceAll(text, 'a', replacement)",
        "split(text, '')",
        "toStr([text,text,text])",
        "jsonStringify([text,text,text])",
        "join([text,text,text], text)",
        "text + text + text",
    ] {
        let mut rt = controlled(100_000, 1500);
        rt.set_global("text", Value::String("a".repeat(200)));
        rt.set_global("replacement", Value::String("b".repeat(200)));
        let error = rt.eval(source).unwrap_err();
        assert_eq!(error.kind, "LimitError", "{source}: {error}");
        assert!(error.message.contains("allocation"), "{source}: {error}");
    }
}

#[test]
fn repeated_owned_strings_exhaust_budget_inside_evaluation_before_serialization() {
    const BUDGET: usize = 16 * 1024 * 1024;
    let mut rt = controlled(100_000, BUDGET);
    rt.set_global("payload", Value::String("x".repeat(4000)));
    let error = rt.eval("repeat(10000, payload)").unwrap_err();
    assert_eq!(error.kind, "LimitError");
    assert!(error.message.contains("allocation"));
    let usage = rt.control_usage();
    assert!(usage.intermediate_bytes <= BUDGET);
    assert!(usage.intermediate_bytes > BUDGET - 4000);
    assert!(usage.work < 100_000, "the byte budget must fail first");
    assert_eq!(rt.eval("42").unwrap(), Value::Number(42.0));
}

#[test]
fn mapped_and_filtered_owned_strings_are_charged_before_retention() {
    for payload in [
        Value::String("x".repeat(4000)),
        Value::Utf16(vec![0xd800; 2000]),
    ] {
        let mut rt = controlled(100_000, 16_000);
        rt.set_global("payload", payload.clone());
        let source = rt.array(vec![payload; 10]);
        rt.set_global("source", source);
        for expression in [
            "repeat(10, payload)",
            "mapit(range(10), payload)",
            "filterit(source, true)",
        ] {
            let error = rt.eval(expression).unwrap_err();
            assert_eq!(error.kind, "LimitError", "{expression}");
            assert!(error.message.contains("allocation"), "{expression}");
            assert!(rt.control_usage().intermediate_bytes <= 16_000);
        }
    }
}

#[test]
fn legacy_binding_profile_shares_controls_and_recovers_without_resetting_semantics() {
    for legacy in [false, true] {
        let mut rt = controlled(300, 1_000_000);
        rt.set_legacy_context(legacy);
        let ast = json!(["let", {"x":0}, ["do", true, ["def", "x", ["+", "x", 1]]]]);
        let error = rt.eval_ast(&ast, &EvalOptions::default()).unwrap_err();
        assert_eq!(error.kind, "LimitError");
        assert!(error.message.contains("work"));
        assert_eq!(rt.control_usage().work, 300);

        rt.set_global("x", Value::Number(7.0));
        let ast = json!(["let", [["x", ["get", {}, "missing"]]], "x"]);
        assert_eq!(
            rt.eval_ast(&ast, &EvalOptions::default()).unwrap(),
            if legacy {
                Value::Number(7.0)
            } else {
                Value::Undefined
            }
        );
        assert_eq!(rt.eval("2+3").unwrap(), Value::Number(5.0));
    }
}
