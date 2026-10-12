use futures::{executor::block_on, future::poll_fn};
use indexmap::IndexMap;
use lpe::{Error, EvalOptions, Runtime, Value};
use serde_json::{json, Value as Json};
use std::{cell::RefCell, rc::Rc, task::Poll};

fn call(rt: &mut Runtime, name: &str, args: Vec<Value>) -> lpe::Result<Value> {
    let env = rt.global_env();
    block_on(rt.call_value(Value::Builtin(name.into()), args, env))
}

fn check(rt: &mut Runtime, name: &str, args: Json, expected: Json) {
    let args: Vec<_> = args
        .as_array()
        .unwrap()
        .iter()
        .map(|v| rt.from_json(v))
        .collect();
    let actual = call(rt, name, args).unwrap_or_else(|e| panic!("{name}: {e}"));
    let expected = rt.from_json(&expected);
    assert_eq!(
        rt.to_json(&actual).unwrap(),
        rt.to_json(&expected).unwrap(),
        "{name}"
    );
}

fn function(rt: &mut Runtime, params: &[&str], body: Json) -> Value {
    rt.closure(
        params.iter().map(|s| s.to_string()).collect(),
        body,
        rt.global_env(),
        EvalOptions::default(),
    )
}

fn lookup(rt: &mut Runtime, name: &str) -> Value {
    rt.lookup(rt.global_env(), name, &EvalOptions::default(), true)
        .unwrap()
}

#[test]
fn constructors_ranges_reshape_and_zip() {
    let mut rt = Runtime::new();
    for name in ["list", "array", "["] {
        check(&mut rt, name, json!([1, 2, 3]), json!([1, 2, 3]));
    }
    for (args, expected) in [
        (json!([5]), json!([0, 1, 2, 3, 4])),
        (json!([1, 5]), json!([1, 2, 3, 4])),
        (json!([5, 1, -2]), json!([5, 3])),
        (json!([0, 3, 0]), json!([0, 1, 2])),
        (json!([3, 0]), json!([])),
        (json!([]), json!([])),
        (json!([0, 1, 0.25]), json!([0, 0.25, 0.5, 0.75])),
    ] {
        check(&mut rt, "range", args, expected);
    }
    for name in ["reshape", "\u{2374}"] {
        check(&mut rt, name, json!([5, 1, 2]), json!([1, 2, 1, 2, 1]));
    }
    let empty = call(&mut rt, "reshape", vec![Value::Number(2.0)]).unwrap();
    assert_eq!(
        rt.array_values(&empty).unwrap(),
        vec![Value::Undefined, Value::Undefined]
    );
    check(
        &mut rt,
        "zip",
        json!([[[1, 2], [3, 4]]]),
        json!([[1, 3], [2, 4]]),
    );
    check(
        &mut rt,
        "zip",
        json!([[[1], [2, 3], [4]], true]),
        json!([[1, 2, 4]]),
    );
    check(&mut rt, "zip", json!([[]]), json!([]));
    check(
        &mut rt,
        "zip",
        json!([[[1, 2], [3]]]),
        json!([[1,3],[2,{"$lpe":"undefined"}]]),
    );
}

#[test]
fn scalar_access_slices_and_non_mutating_reverse() {
    let mut rt = Runtime::new();
    for name in ["count", "length"] {
        check(&mut rt, name, json!([[1, 2, 3]]), json!(3));
    }
    check(&mut rt, "length", json!(["a\u{1f600}b"]), json!(4));
    for name in ["empty", "empty?"] {
        check(&mut rt, name, json!([[]]), json!(true));
        check(&mut rt, name, json!([""]), json!(false));
        check(&mut rt, name, json!([{}]), json!(false));
    }
    for (args, out) in [
        (json!([[1, 2, 3, 4], 1, 3]), json!([2, 3])),
        (json!([[1, 2, 3, 4], -2]), json!([3, 4])),
        (json!([[1, 2, 3, 4], 3, 1]), json!([])),
        (json!(["hello", 1]), json!("ello")),
        (json!(["a\u{1f600}b", 1, 3]), json!("\u{1f600}")),
        (json!([123, 0, 1]), json!([])),
    ] {
        check(&mut rt, "slice", args, out);
    }
    check(&mut rt, "rest", json!([[1, 2, 3]]), json!([2, 3]));
    check(
        &mut rt,
        "concat",
        json!([[1, 2], 3, [4]]),
        json!([1, 2, 3, 4]),
    );
    for name in ["cons", "pushStart"] {
        check(&mut rt, name, json!([1, [2, 3]]), json!([1, 2, 3]));
    }
    check(&mut rt, "first", json!([[]]), Json::Null);
    assert_eq!(call(&mut rt, "last", vec![]).unwrap(), Value::Undefined);
    let original = rt.from_json(&json!([1, 2, 3]));
    rt.set(&original, "note", Value::Number(7.0)).unwrap();
    let reverse = call(&mut rt, "reverse", vec![original.clone()]).unwrap();
    assert_eq!(
        rt.array_values(&reverse).unwrap(),
        vec![Value::Number(3.0), Value::Number(2.0), Value::Number(1.0)]
    );
    assert_eq!(rt.get(&reverse, "note"), Value::Number(7.0));
    assert_eq!(rt.get(&original, "0"), Value::Number(1.0));
}

#[test]
fn callbacks_have_exact_arities_and_capture_lexical_environment() {
    let mut rt = Runtime::new();
    let seen = Rc::new(RefCell::new(Vec::new()));
    let record = seen.clone();
    rt.register("record", move |args| {
        record.borrow_mut().push(args.clone());
        Ok(args.first().cloned().unwrap_or(Value::Undefined))
    });
    let callback = lookup(&mut rt, "record");
    let array = rt.from_json(&json!([1, 2, 3]));
    for (name, arity) in [
        ("map", 1),
        ("filter", 1),
        ("mapArr", 3),
        ("filterArr", 3),
        ("reduce", 2),
        ("reduceArr", 4),
    ] {
        seen.borrow_mut().clear();
        call(
            &mut rt,
            name,
            vec![array.clone(), callback.clone(), Value::Number(0.0)],
        )
        .unwrap();
        let calls = seen.borrow();
        assert_eq!(calls.len(), 3, "{name}");
        assert!(calls.iter().all(|args| args.len() == arity), "{name}");
        if arity == 3 {
            assert_eq!(calls[1][1], Value::Number(1.0));
            assert_eq!(calls[1][2], array);
        }
    }
    let env = rt.new_env(
        IndexMap::from([("factor".into(), Value::Number(4.0))]),
        vec![rt.global_env()],
    );
    let closure = rt.closure(
        vec!["x".into()],
        json!(["*", "x", "factor"]),
        env,
        EvalOptions::default(),
    );
    let out = call(&mut rt, "map", vec![array, closure]).unwrap();
    assert_eq!(
        rt.array_values(&out).unwrap(),
        vec![Value::Number(4.0), Value::Number(8.0), Value::Number(12.0)]
    );
}

#[test]
fn awaited_callbacks_and_errors() {
    let mut rt = Runtime::new();
    let seen = Rc::new(RefCell::new(Vec::new()));
    let record = seen.clone();
    rt.register_async("later", move |args| {
        let record = record.clone();
        Box::pin(async move {
            let mut yielded = false;
            poll_fn(|cx| {
                if yielded {
                    Poll::Ready(())
                } else {
                    yielded = true;
                    cx.waker().wake_by_ref();
                    Poll::Pending
                }
            })
            .await;
            record.borrow_mut().push(args[0].clone());
            Ok(args[0].clone())
        })
    });
    let callback = lookup(&mut rt, "later");
    let array = rt.from_json(&json!([1, 2, 3]));
    let out = call(&mut rt, "map", vec![array.clone(), callback]).unwrap();
    assert_eq!(rt.array_values(&out).unwrap(), *seen.borrow());
    rt.register("fail", |_| Err(Error::new("TestError", "callback failed")));
    let failure = lookup(&mut rt, "fail");
    assert_eq!(
        call(&mut rt, "filter", vec![array, failure])
            .unwrap_err()
            .kind,
        "TestError"
    );
}

#[test]
fn callback_iteration_observes_mutation_and_preserves_holes() {
    let mut rt = Runtime::new();
    let array = rt.from_json(&json!([1, 2, 3]));
    let callback = function(
        &mut rt,
        &["v", "i", "a"],
        json!(["begin", ["set", "a", 1, 9], "v"]),
    );
    let out = call(&mut rt, "mapArr", vec![array.clone(), callback]).unwrap();
    assert_eq!(rt.get(&out, "1"), Value::Number(9.0));
    rt.delete(&array, "1").unwrap();
    let identity = function(&mut rt, &["v"], json!("v"));
    let out = call(&mut rt, "map", vec![array.clone(), identity.clone()]).unwrap();
    assert!(!rt.has_own(&out, "1"));
    assert_eq!(rt.get(&out, "length"), Value::Number(3.0));
    let out = call(&mut rt, "filter", vec![array.clone(), identity]).unwrap();
    assert_eq!(rt.get(&out, "length"), Value::Number(2.0));
    let out = call(&mut rt, "findIndex", vec![array, Value::Undefined]).unwrap();
    assert_eq!(out, Value::Number(1.0));
}

#[test]
fn predicates_reduce_and_short_circuiting() {
    let mut rt = Runtime::new();
    check(&mut rt, "find", json!([[1, 2, 3], "2"]), json!(2));
    check(&mut rt, "findIndex", json!([[1, 2, 3], 6]), json!(-1));
    check(&mut rt, "some", json!([[1, 2, 3], 3]), json!(true));
    check(&mut rt, "every", json!([[], null]), json!(true));
    check(&mut rt, "every", json!([123, null]), json!(false));
    let array = rt.from_json(&json!([1, 2, 3]));
    let add = Value::Builtin("add".into());
    assert_eq!(
        call(
            &mut rt,
            "reduce",
            vec![array.clone(), add, Value::Number(0.0)]
        )
        .unwrap(),
        Value::Number(6.0)
    );
    let callback = function(
        &mut rt,
        &["acc", "v", "i"],
        json!(["+", "acc", ["*", "v", "i"]]),
    );
    assert_eq!(
        call(
            &mut rt,
            "reduceArr",
            vec![array, callback, Value::Number(0.0)]
        )
        .unwrap(),
        Value::Number(8.0)
    );
    assert_eq!(call(&mut rt, "reduce", vec![]).unwrap(), Value::Undefined);
    let calls = Rc::new(RefCell::new(0));
    let count = calls.clone();
    rt.register("yes", move |_| {
        *count.borrow_mut() += 1;
        Ok(Value::Bool(true))
    });
    let yes = lookup(&mut rt, "yes");
    let array = rt.from_json(&json!([1, 2, 3]));
    call(&mut rt, "some", vec![array, yes]).unwrap();
    assert_eq!(*calls.borrow(), 1);
}

#[test]
fn sort_is_lexical_by_default_and_mutates_shared_handle() {
    let mut rt = Runtime::new();
    let array = rt.from_json(&json!([3, 20, 1]));
    let alias = array.clone();
    rt.set(&array, "note", Value::Bool(true)).unwrap();
    assert_eq!(call(&mut rt, "sort", vec![array.clone()]).unwrap(), alias);
    assert_eq!(
        rt.array_values(&alias).unwrap(),
        vec![Value::Number(1.0), Value::Number(20.0), Value::Number(3.0)]
    );
    let compare = function(&mut rt, &["a", "b"], json!(["-", "b", "a"]));
    call(&mut rt, "sort", vec![array.clone(), compare]).unwrap();
    assert_eq!(rt.get(&array, "0"), Value::Number(20.0));
    assert_eq!(rt.get(&array, "note"), Value::Bool(true));
    let objects = rt.from_json(&json!([{"name":"Ben"},{"name":"Alice"},{"name":"Duncan"}]));
    let key = function(&mut rt, &["x"], json!(["get", "x", ["q", "name"]]));
    call(&mut rt, "sortBy", vec![objects.clone(), key]).unwrap();
    assert_eq!(
        rt.get(&rt.get(&objects, "0"), "name"),
        Value::String("Alice".into())
    );
}

#[test]
fn flat_partition_and_frequency_aliases() {
    let mut rt = Runtime::new();
    check(
        &mut rt,
        "flat",
        json!([[[1, 2], 3, [4, [5]]]]),
        json!([1, 2, 3, 4, [5]]),
    );
    check(
        &mut rt,
        "flat",
        json!([[[1, 2], 3, [4, [5]]], 2]),
        json!([1, 2, 3, 4, 5]),
    );
    check(&mut rt, "flat", json!([123]), json!(123));
    check(
        &mut rt,
        "partition",
        json!([[1, 2, 3, 4, 5], 2]),
        json!([[1, 2], [3, 4], [5]]),
    );
    for name in ["frequencies", "counter"] {
        check(
            &mut rt,
            name,
            json!([[1, 1, 2, 2, 2, 3]]),
            json!({"1":2,"2":3,"3":1}),
        );
    }
    let array = rt.from_json(&json!([1]));
    assert!(call(&mut rt, "partition", vec![array, Value::Number(0.0)]).is_err());
}

#[test]
fn set_operations_order_duplicates_coercion_and_identity() {
    let mut rt = Runtime::new();
    check(
        &mut rt,
        "distinct",
        json!([[3, 1, 2, 3, 3, 2, 3]]),
        json!([3, 1, 2]),
    );
    check(
        &mut rt,
        "distinct",
        json!([[1,"1",true,null,{"$lpe":"undefined"}]]),
        json!([1, null]),
    );
    check(
        &mut rt,
        "union",
        json!([[[1, 2], null, [2, 3]]]),
        json!([1, 2, 3]),
    );
    check(
        &mut rt,
        "intersect",
        json!([[[1, 2, 2, 2], [2, 3], [1, 2]]]),
        json!([2]),
    );
    check(
        &mut rt,
        "difference",
        json!([[[1, 2, 1], [2, 3]]]),
        json!([1, 1]),
    );
    check(
        &mut rt,
        "uniques",
        json!([[[1, 2, 1], [2, 3]]]),
        json!([1, 3]),
    );
    let a = rt.object(IndexMap::new());
    let b = rt.object(IndexMap::new());
    let array = rt.array(vec![a.clone(), b.clone(), a.clone()]);
    let distinct = call(&mut rt, "distinct", vec![array]).unwrap();
    assert_eq!(rt.array_values(&distinct).unwrap(), vec![a, b]);
    let array = rt.array(vec![Value::Number(f64::NAN)]);
    let out = call(&mut rt, "distinct", vec![array]).unwrap();
    assert!(rt.array_values(&out).unwrap().is_empty());
    let array = rt.from_json(&json!([{"a":1},{"a":2},{"a":1}]));
    let cmp = function(
        &mut rt,
        &["x", "y"],
        json!(["=", ["get", "x", ["q", "a"]], ["get", "y", ["q", "a"]]]),
    );
    let out = call(&mut rt, "distinct", vec![array, cmp]).unwrap();
    assert_eq!(rt.get(&out, "length"), Value::Number(2.0));
}

#[test]
fn sampling_preserves_input_and_sample_one_returns_scalar() {
    let mut rt = Runtime::new();
    let array = rt.from_json(&json!([1, 2, 3, 4, 5]));
    let shuffled = call(&mut rt, "shuffle", vec![array.clone()]).unwrap();
    let mut values: Vec<_> = rt
        .array_values(&shuffled)
        .unwrap()
        .iter()
        .map(|v| rt.to_number(v) as i32)
        .collect();
    values.sort();
    assert_eq!(values, vec![1, 2, 3, 4, 5]);
    assert_eq!(rt.get(&array, "0"), Value::Number(1.0));
    for args in [vec![array.clone()], vec![array.clone(), Value::Number(1.0)]] {
        assert!(matches!(
            call(&mut rt, "sample", args).unwrap(),
            Value::Number(_)
        ));
    }
    let out = call(&mut rt, "sample", vec![array, Value::Number(20.0)]).unwrap();
    assert_eq!(rt.get(&out, "length"), Value::Number(5.0));
}

#[test]
fn object_access_named_properties_and_undefined_defaults() {
    let mut rt = Runtime::new();
    let obj = rt.object(IndexMap::new());
    let alias = obj.clone();
    assert_eq!(
        call(
            &mut rt,
            "set",
            vec![obj.clone(), Value::String("x".into()), Value::Undefined]
        )
        .unwrap(),
        alias
    );
    assert_eq!(
        call(
            &mut rt,
            "get",
            vec![obj.clone(), Value::String("x".into()), Value::Number(42.0)]
        )
        .unwrap(),
        Value::Undefined
    );
    for name in ["contains?", "containsKey"] {
        assert_eq!(
            call(&mut rt, name, vec![obj.clone(), Value::String("x".into())]).unwrap(),
            Value::Bool(true)
        );
    }
    call(&mut rt, "del", vec![obj.clone(), Value::String("x".into())]).unwrap();
    assert_eq!(
        call(
            &mut rt,
            "nth",
            vec![obj, Value::String("x".into()), Value::Number(42.0)]
        )
        .unwrap(),
        Value::Number(42.0)
    );
    let array = rt.from_json(&json!([1, 2]));
    rt.set(&array, "a", Value::Number(3.0)).unwrap();
    let keys = call(&mut rt, "keys", vec![array.clone()]).unwrap();
    assert_eq!(
        rt.array_values(&keys).unwrap(),
        vec![
            Value::String("0".into()),
            Value::String("1".into()),
            Value::String("a".into())
        ]
    );
    for name in ["vals", "values"] {
        let out = call(&mut rt, name, vec![array.clone()]).unwrap();
        assert_eq!(
            rt.array_values(&out).unwrap(),
            vec![Value::Number(1.0), Value::Number(2.0), Value::Number(3.0)]
        );
    }
    check(
        &mut rt,
        "entries",
        json!([{"a":1,"b":2}]),
        json!([["a", 1], ["b", 2]]),
    );
    check(
        &mut rt,
        "fromEntries",
        json!([[["a", 1], ["b", 2], ["a", 3]]]),
        json!({"a":3,"b":2}),
    );
    check(
        &mut rt,
        "pluck",
        json!([[{"a":1},{"a":2}],"a"]),
        json!([1, 2]),
    );
}

#[test]
fn joins_distinguish_array_nulls_and_object_stringification() {
    let mut rt = Runtime::new();
    check(&mut rt, "join", json!([[1, null, 3], "-"]), json!("1--3"));
    check(
        &mut rt,
        "joinObj",
        json!([[1, null, 3], "-"]),
        json!("1-null-3"),
    );
    let obj = rt.from_json(&json!({"a":12,"b":"test"}));
    let callback = function(&mut rt, &["k", "v"], json!(["str", "k", ["q", ": "], "v"]));
    assert_eq!(
        call(
            &mut rt,
            "joinObj",
            vec![obj, Value::String("; ".into()), callback]
        )
        .unwrap(),
        Value::String("a: 12; b: test".into())
    );
}

#[test]
fn nested_select_omit_and_compact_do_not_mutate_inputs() {
    let mut rt = Runtime::new();
    check(
        &mut rt,
        "select",
        json!([{"a":1,"b":2,"c":3},["a","c"]]),
        json!({"a":1,"c":3}),
    );
    check(
        &mut rt,
        "select",
        json!([[1, 2, 3, 4], [0, 3]]),
        json!([1, 4]),
    );
    check(
        &mut rt,
        "select",
        json!([[123,{"id":2,"action":"delete"}],{"0":["name"],"1":["action"]}]),
        json!([{"action":"delete"}]),
    );
    check(
        &mut rt,
        "omit",
        json!([[123,{"id":2,"action":"delete"}],{"0":["name"],"1":["id"]}]),
        json!([123,{"action":"delete"}]),
    );
    check(
        &mut rt,
        "omit",
        json!([[1, 2, 3, 4], [0, 3]]),
        json!([2, 3]),
    );
    let obj = rt.from_json(&json!({"a":1,"b":{"c":null},"d":null}));
    let compact = call(&mut rt, "compact", vec![obj.clone(), Value::Number(2.0)]).unwrap();
    assert!(rt.has_own(&obj, "d"));
    assert!(!rt.has_own(&compact, "d"));
    assert!(!rt.has_own(&rt.get(&compact, "b"), "c"));
    check(
        &mut rt,
        "compact",
        json!([[null, 1, null, 2], 1]),
        json!([1, 2]),
    );
}

#[test]
fn cloning_preserves_graph_aliases_and_cycles_without_json_roundtrip() {
    let mut rt = Runtime::new();
    let child = rt.from_json(&json!({"value":7}));
    let root = rt.object(IndexMap::from([
        ("a".into(), child.clone()),
        ("b".into(), child.clone()),
    ]));
    rt.set(&root, "self", root.clone()).unwrap();
    let spec = rt.array(vec![]);
    let copy = call(&mut rt, "omit", vec![root.clone(), spec]).unwrap();
    assert_ne!(copy, root);
    assert_eq!(rt.get(&copy, "self"), copy);
    assert_eq!(rt.get(&copy, "a"), rt.get(&copy, "b"));
    assert_ne!(rt.get(&copy, "a"), child);
}

#[test]
fn update_in_mutates_aliases_creates_objects_and_matches_regex_keys() {
    let mut rt = Runtime::new();
    let obj = rt.from_json(&json!({"Ivan":{"id":1},"Bob":{"id":2}}));
    let path = rt.from_json(&json!(["/.+/", "name"]));
    let callback = function(&mut rt, &["x", "path"], json!(["get", "path", 0]));
    let out = call(
        &mut rt,
        "update_in",
        vec![obj.clone(), path, callback, Value::Bool(true)],
    )
    .unwrap();
    assert_eq!(out, obj);
    assert_eq!(
        rt.get(&rt.get(&obj, "Ivan"), "name"),
        Value::String("Ivan".into())
    );
    let path = rt.from_json(&json!(["a", "b"]));
    let callback = function(&mut rt, &["x"], json!(42));
    call(&mut rt, "update_in", vec![obj.clone(), path, callback]).unwrap();
    assert_eq!(rt.get(&rt.get(&obj, "a"), "b"), Value::Number(42.0));
}

#[test]
fn update_in_regex_keys_use_ecmascript_syntax_and_code_units() {
    let mut rt = Runtime::new();
    for (pattern, expected) in [
        (
            r"/(?<=a+)b/",
            json!({"aaab":9,"abab":9,"xy":3,"\u{1f600}":4}),
        ),
        (
            r"/^(ab)\1$/",
            json!({"aaab":1,"abab":9,"xy":3,"\u{1f600}":4}),
        ),
        ("/^..$/", json!({"aaab":1,"abab":2,"xy":9,"\u{1f600}":9})),
    ] {
        let obj = rt.from_json(&json!({"aaab":1,"abab":2,"xy":3,"\u{1f600}":4}));
        let path = rt.from_json(&json!([pattern]));
        let callback = function(&mut rt, &["x"], json!(9));
        let out = call(
            &mut rt,
            "update_in",
            vec![obj, path, callback, Value::Bool(true)],
        )
        .unwrap();
        let expected = rt.from_json(&expected);
        assert_eq!(
            rt.to_json(&out).unwrap(),
            rt.to_json(&expected).unwrap(),
            "{pattern}"
        );
    }
    let obj = rt.from_json(&json!({"x":1}));
    let path = rt.from_json(&json!(["/[/"]));
    let callback = function(&mut rt, &["x"], json!(9));
    assert_eq!(
        call(
            &mut rt,
            "update_in",
            vec![obj, path, callback, Value::Bool(true)]
        )
        .unwrap_err()
        .kind,
        "SyntaxError"
    );
}

#[test]
fn merge_modes_deep_merging_and_schema_fill() {
    let mut rt = Runtime::new();
    check(
        &mut rt,
        "merge",
        json!([[{"a":1,"c":5},{"a":3,"b":2}]]),
        json!({"a":3,"c":5,"b":2}),
    );
    let hashes = rt.from_json(&json!([{"a":1},{"a":3,"b":2}]));
    let sum = function(&mut rt, &["k", "old", "new"], json!(["+", "old", "new"]));
    let out = call(&mut rt, "merge", vec![hashes.clone(), sum]).unwrap();
    assert_eq!(rt.get(&out, "a"), Value::Number(4.0));
    assert_eq!(rt.get(&out, "b"), Value::Number(2.0));
    let collect = function(&mut rt, &["k", "values", "has"], json!("has"));
    let out = call(
        &mut rt,
        "merge",
        vec![hashes.clone(), collect, Value::String("full".into())],
    )
    .unwrap();
    assert_eq!(
        rt.array_values(&rt.get(&out, "b")).unwrap(),
        vec![Value::Bool(false), Value::Bool(true)]
    );
    let first = function(&mut rt, &["k", "old", "new", "first"], json!("first"));
    let out = call(
        &mut rt,
        "merge",
        vec![hashes, first, Value::String("sequenceWithFirst".into())],
    )
    .unwrap();
    assert_eq!(rt.get(&out, "a"), Value::Bool(false));
    assert_eq!(rt.get(&out, "b"), Value::Bool(true));
    check(
        &mut rt,
        "mergeDeep",
        json!([{"a":[4,5,6]},{"a":[1],"b":2}]),
        json!({"a":[1,5,6],"b":2}),
    );
    check(
        &mut rt,
        "makeStruct",
        json!([[1, 2, 3], [0, 0, 0, 0, 0, 0]]),
        json!([1, 2, 3, 0, 0, 0]),
    );
    check(
        &mut rt,
        "makeStruct",
        json!([{"a":4},{"a":{"b":7}}]),
        json!({"a":{"b":7}}),
    );
}

#[test]
fn work_budget_bounds_large_counts_and_nonprogressing_ranges() {
    let mut rt = Runtime::new();
    let options = EvalOptions {
        max_steps: 64,
        ..EvalOptions::default()
    };
    for ast in [
        json!(["range", 1e100]),
        json!(["range", 1e100, 1e101, 1]),
        json!(["reshape", 1000000000, 1]),
    ] {
        let error = rt.eval_ast(&ast, &options).unwrap_err();
        assert_eq!(error.kind, "LimitError");
    }
    assert!(call(&mut Runtime::new(), "reshape", vec![Value::Number(-1.0)]).is_err());
    assert!(call(
        &mut Runtime::new(),
        "reshape",
        vec![Value::Number(f64::INFINITY)]
    )
    .is_err());
}

#[test]
fn missing_arguments_do_not_panic() {
    for name in [
        "range",
        "reshape",
        "zip",
        "count",
        "empty",
        "reverse",
        "slice",
        "concat",
        "first",
        "last",
        "rest",
        "cons",
        "map",
        "filter",
        "reduce",
        "sort",
        "some",
        "every",
        "flat",
        "frequencies",
        "partition",
        "distinct",
        "union",
        "intersect",
        "difference",
        "uniques",
        "shuffle",
        "sample",
        "pluck",
        "join",
        "joinObj",
        "containsKey",
        "get",
        "set",
        "del",
        "keys",
        "values",
        "entries",
        "fromEntries",
        "select",
        "omit",
        "compact",
        "update_in",
        "merge",
        "mergeDeep",
        "makeStruct",
    ] {
        let _ = call(&mut Runtime::new(), name, vec![]);
    }
}

#[test]
fn sparse_arrays_keep_holes_distinct_from_undefined() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![
        Value::Undefined,
        Value::Number(2.0),
        Value::Number(1.0),
    ]);
    rt.delete(&array, "0").unwrap();
    let out = call(&mut rt, "distinct", vec![array.clone()]).unwrap();
    assert_eq!(
        rt.array_values(&out).unwrap(),
        vec![Value::Number(2.0), Value::Number(1.0)]
    );
    let outer = rt.array(vec![array.clone()]);
    let out = call(&mut rt, "union", vec![outer]).unwrap();
    assert_eq!(
        rt.array_values(&out).unwrap(),
        vec![Value::Number(2.0), Value::Number(1.0)]
    );
    for name in ["shuffle", "sample"] {
        let out = call(&mut rt, name, vec![array.clone(), Value::Number(3.0)]).unwrap();
        assert_eq!(rt.get(&out, "length"), Value::Number(3.0));
        assert!(!rt.has_own(&out, "2"));
    }
    let spec = rt.array(vec![]);
    let copy = call(&mut rt, "omit", vec![array.clone(), spec]).unwrap();
    assert!(!rt.has_own(&copy, "0"));
    let slice = call(&mut rt, "slice", vec![array.clone(), Value::Number(0.0)]).unwrap();
    assert!(!rt.has_own(&slice, "0"));
    rt.set(&array, "3", Value::Undefined).unwrap();
    call(&mut rt, "sort", vec![array.clone()]).unwrap();
    assert_eq!(rt.get(&array, "0"), Value::Number(1.0));
    assert_eq!(rt.get(&array, "1"), Value::Number(2.0));
    assert!(rt.has_own(&array, "2"));
    assert!(!rt.has_own(&array, "3"));
}

#[test]
fn sort_by_equal_keys_matches_source_comparator() {
    let mut rt = Runtime::new();
    let array =
        rt.from_json(&json!([{"key":1,"id":1},{"key":1,"id":2},{"key":0,"id":3},{"key":1,"id":4}]));
    let callback = function(&mut rt, &["v"], json!(["get", "v", ["q", "key"]]));
    call(&mut rt, "sortBy", vec![array.clone(), callback]).unwrap();
    let ids = call(&mut rt, "pluck", vec![array, Value::String("id".into())]).unwrap();
    assert_eq!(
        rt.array_values(&ids).unwrap(),
        vec![
            Value::Number(3.0),
            Value::Number(4.0),
            Value::Number(2.0),
            Value::Number(1.0)
        ]
    );
}

#[test]
fn nested_merge_callback_paths_and_manual_missing_values() {
    let mut rt = Runtime::new();
    let a = rt.from_json(&json!({"a":{"x":1},"b":2}));
    let b = rt.from_json(&json!({"a":{"x":3},"c":4}));
    let callback = function(&mut rt, &["path", "old", "new"], json!("path"));
    let out = call(
        &mut rt,
        "mergeDeep",
        vec![a.clone(), b.clone(), callback.clone()],
    )
    .unwrap();
    assert_eq!(
        rt.array_values(&rt.get(&rt.get(&out, "a"), "x")).unwrap(),
        vec![Value::String("a".into()), Value::String("x".into())]
    );
    assert_eq!(rt.get(&out, "b"), Value::Number(2.0));
    let out = call(
        &mut rt,
        "mergeDeep",
        vec![a, b, callback, Value::Bool(true)],
    )
    .unwrap();
    assert_eq!(
        rt.array_values(&rt.get(&out, "b")).unwrap(),
        vec![Value::String("b".into())]
    );
}

#[test]
fn joined_string_growth_is_bounded() {
    let mut rt = Runtime::new();
    let array = rt.array(vec![Value::Null; 20]);
    let error = call(
        &mut rt,
        "join",
        vec![array, Value::String("x".repeat(1024 * 1024))],
    )
    .unwrap_err();
    assert_eq!(error.kind, "LimitError");
}

#[test]
fn utf16_slices_and_joins_preserve_unpaired_surrogates() {
    let mut rt = Runtime::new();
    let text = Value::String("\u{1f600}".into());
    let high = call(
        &mut rt,
        "slice",
        vec![text.clone(), Value::Number(0.0), Value::Number(1.0)],
    )
    .unwrap();
    let low = call(&mut rt, "rest", vec![text.clone()]).unwrap();
    assert_eq!(high, Value::Utf16(vec![0xd83d]));
    assert_eq!(low, Value::Utf16(vec![0xde00]));
    assert_eq!(
        call(&mut rt, "length", vec![high.clone()]).unwrap(),
        Value::Number(1.0)
    );
    assert_eq!(
        call(&mut rt, "get", vec![text.clone(), Value::Number(0.0)]).unwrap(),
        high
    );
    assert_eq!(call(&mut rt, "first", vec![text]).unwrap(), high);
    assert_eq!(call(&mut rt, "last", vec![low.clone()]).unwrap(), low);
    assert_eq!(call(&mut rt, "slice", vec![high.clone()]).unwrap(), high);
    let pair = rt.array(vec![high.clone(), low.clone()]);
    assert_eq!(
        call(&mut rt, "join", vec![pair, Value::String(String::new())]).unwrap(),
        Value::String("\u{1f600}".into())
    );
    let array = rt.array(vec![Value::String("a".into()), high.clone()]);
    let joined = call(&mut rt, "join", vec![array, low]).unwrap();
    assert_eq!(rt.to_utf16(&joined), vec![0x61, 0xde00, 0xd83d]);
    let obj = rt.object(IndexMap::from([("x".into(), high.clone())]));
    assert_eq!(call(&mut rt, "joinObj", vec![obj]).unwrap(), high);
    let array = rt.array(vec![Value::String("\u{fffd}".into()), high.clone()]);
    call(&mut rt, "sort", vec![array.clone()]).unwrap();
    assert_eq!(rt.get(&array, "0"), high);
}

fn nested_object(rt: &mut Runtime, depth: usize) -> Value {
    let mut value = Value::Null;
    for _ in 0..depth {
        value = rt.object(IndexMap::from([("child".into(), value)]));
    }
    value
}

#[test]
fn recursive_collection_operations_fail_at_bounded_depth() {
    for name in ["mergeDeep", "compact", "makeStruct"] {
        let mut rt = Runtime::new();
        let left = nested_object(&mut rt, 400);
        let right = nested_object(&mut rt, 400);
        let args = if name == "compact" {
            vec![left, Value::Number(f64::INFINITY)]
        } else {
            vec![left, right]
        };
        assert_eq!(
            call(&mut rt, name, args).unwrap_err().kind,
            "LimitError",
            "{name}"
        );
    }
    for name in ["select", "omit"] {
        let mut rt = Runtime::new();
        let value = nested_object(&mut rt, 400);
        let selection = nested_object(&mut rt, 400);
        assert_eq!(
            call(&mut rt, name, vec![value, selection])
                .unwrap_err()
                .kind,
            "LimitError",
            "{name}"
        );
    }
}

#[test]
fn cyclic_merge_and_compact_fail_without_unbounded_recursion() {
    for name in ["mergeDeep", "compact"] {
        let mut rt = Runtime::new();
        let root = rt.object(IndexMap::new());
        rt.set(&root, "self", root.clone()).unwrap();
        let args = if name == "compact" {
            vec![root, Value::Number(f64::INFINITY)]
        } else {
            vec![root.clone(), root]
        };
        assert_eq!(call(&mut rt, name, args).unwrap_err().kind, "LimitError");
    }
}

#[test]
fn flat_is_iterative_for_deep_arrays_and_budgeted_for_cycles() {
    let mut rt = Runtime::new();
    let mut value = Value::Number(1.0);
    for _ in 0..4096 {
        value = rt.array(vec![value]);
    }
    let out = call(&mut rt, "flat", vec![value, Value::Number(f64::INFINITY)]).unwrap();
    assert_eq!(rt.array_values(&out).unwrap(), vec![Value::Number(1.0)]);

    let root = rt.array(vec![]);
    rt.set(&root, "0", root.clone()).unwrap();
    rt.set_global("cycle", root);
    let options = EvalOptions {
        max_steps: 64,
        ..EvalOptions::default()
    };
    assert_eq!(
        rt.eval_ast(&json!(["flat", "cycle", "Infinity"]), &options)
            .unwrap_err()
            .kind,
        "LimitError"
    );
}

#[test]
fn clone_traversal_and_recursive_merge_respect_work_budget() {
    let mut rt = Runtime::new();
    let tree = nested_object(&mut rt, 100);
    rt.set_global("tree", tree);
    let options = EvalOptions {
        max_steps: 32,
        ..EvalOptions::default()
    };
    for ast in [
        json!(["mergeDeep", "tree", "tree"]),
        json!(["compact", "tree", 100]),
        json!(["omit", "tree", ["list"]]),
    ] {
        assert_eq!(rt.eval_ast(&ast, &options).unwrap_err().kind, "LimitError");
    }
}

#[test]
fn unrepresentable_object_keys_error_instead_of_becoming_replacement_characters() {
    let mut rt = Runtime::new();
    let object = rt.object(IndexMap::new());
    let key = Value::Utf16(vec![0xd800]);
    for name in ["get", "set", "del", "containsKey"] {
        let error = call(
            &mut rt,
            name,
            vec![object.clone(), key.clone(), Value::Number(1.0)],
        )
        .unwrap_err();
        assert_eq!(error.kind, "UnsupportedFeature");
    }
    assert!(rt.keys(&object).is_empty());
}

#[test]
fn reshape_checks_owned_string_amplification_before_allocating() {
    let error = call(
        &mut Runtime::new(),
        "reshape",
        vec![Value::Number(100_000.0), Value::String("x".repeat(1024))],
    )
    .unwrap_err();
    assert_eq!(error.kind, "LimitError");
}
