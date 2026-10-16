use futures::executor::block_on;
use futures::FutureExt;
use indexmap::IndexMap;
use lpe::{parse, Ast, Error, Result, Value};
use runtime::{EnvId, EvalOptions, Runtime, RuntimeControls, RuntimeLimits};
use std::cell::RefCell;
use std::rc::Rc;

// Compile private dispatch and its runtime together so resource helpers stay
// crate-private. Keep this integration target for the existing audit scripts.
#[path = "../src/builtins.rs"]
mod builtins;
#[allow(dead_code)]
#[path = "../src/collections.rs"]
mod collections;
#[allow(dead_code)]
#[path = "../src/datetime.rs"]
mod datetime;
#[allow(dead_code)]
#[path = "../src/regexp.rs"]
mod regexp;
#[allow(dead_code, unused_imports, clippy::wrong_self_convention)]
#[path = "../src/runtime.rs"]
mod runtime;
#[allow(dead_code)]
#[path = "../src/specials.rs"]
mod specials;

fn s(value: &str) -> Value {
    Value::String(value.into())
}
fn n(value: f64) -> Value {
    Value::Number(value)
}
fn call(rt: &mut Runtime, name: &str, args: &[Value]) -> Value {
    block_on(builtins::call(rt, name, args))
        .unwrap_or_else(|e| panic!("{name}({args:?}): {e}"))
        .expect("handled builtin")
}
fn error(rt: &mut Runtime, name: &str, args: &[Value], kind: &str) {
    assert_eq!(
        block_on(builtins::call(rt, name, args)).unwrap_err().kind,
        kind,
        "{name}"
    );
}
fn array(rt: &Runtime, value: &Value) -> Vec<Value> {
    rt.array_values(value).unwrap()
}

#[test]
fn dispatch_declares_every_regular_alias_and_leaves_specials_alone() {
    let names = builtins::names();
    let unique = names
        .iter()
        .copied()
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(names.len(), unique.len());
    let mut rt = Runtime::new();
    for name in [
        "unknown",
        "<",
        "lt",
        "less",
        "<=",
        "le",
        "lte",
        ">",
        "gt",
        "greater",
        ">=",
        "ge",
        "gte",
        "and",
        "&&",
        "or",
        "||",
        "logicalAnd",
        "logical_and",
        "logicalOr",
        "logical_or",
        "[]",
        "astToString",
        "RegExp",
    ] {
        assert!(!names.contains(&name), "{name}");
        assert_eq!(block_on(builtins::call(&mut rt, name, &[])).unwrap(), None);
    }
    for group in [
        &["+", "add", "plus"][..],
        &["-", "minus", "subtract"],
        &["*", "mul", "multiply"],
        &["/", "div", "divide"],
        &["=", "eq", "equal", "=="],
        &["===", "strictEq"],
        &["!=", "neq", "ne"],
        &["!==", "strictNe"],
        &["not", "!"],
        &["->any", "toAny"],
        &["->bool", "toBool"],
        &["->int", "toInt", "toNumber"],
        &["->str", "toStr"],
        &["null?", "isNull"],
        &["undefined?", "isUndef", "isUndefined"],
        &["true?", "isTrue"],
        &["false?", "isFalse"],
        &["bool?", "isBool"],
        &["number?", "isNumber"],
        &["numberlike?", "isNumberLike"],
        &["string?", "isString"],
        &["list?", "isArray"],
        &["hash?", "isHash"],
        &["obj?", "isObj"],
        &["func?", "isFunction"],
        &["pr_str", "jsonJoin"],
    ] {
        let expected = call(&mut rt, group[0], &[n(2.0), n(3.0)]);
        for name in group {
            assert!(names.contains(name), "{name}");
            assert_eq!(call(&mut rt, name, &[n(2.0), n(3.0)]), expected, "{name}");
        }
    }
    for name in ["read-string", "jsonParse", "json_parse"] {
        assert!(names.contains(&name));
        assert_eq!(call(&mut rt, name, &[s("42")]), n(42.0));
    }
}

#[test]
fn arithmetic_preserves_js_reduce_and_coercion() {
    let mut rt = Runtime::new();
    for name in ["add", "minus", "multiply", "divide"] {
        error(&mut rt, name, &[], "TypeError");
    }
    assert_eq!(
        call(&mut rt, "add", &[n(1.0), s("1"), n(1.0), n(1.0)]),
        s("1111")
    );
    assert_eq!(
        call(&mut rt, "add", &[Value::Null, Value::Bool(true)]),
        n(1.0)
    );
    assert_eq!(
        call(&mut rt, "add", &[Value::Builtin("add".into()), n(1.0)]),
        s("undefined1")
    );
    assert_eq!(call(&mut rt, "add", &[s("12")]), s("12"));
    assert_eq!(call(&mut rt, "multiply", &[s("12")]), s("12"));
    assert_eq!(call(&mut rt, "minus", &[s("3.5")]), n(-3.5));
    assert_eq!(call(&mut rt, "divide", &[n(4.0)]), n(0.25));
    assert_eq!(call(&mut rt, "divide", &[n(1.0), n(0.0)]), n(f64::INFINITY));
    assert!(matches!(call(&mut rt, "divide", &[n(0.0), n(0.0)]), Value::Number(x) if x.is_nan()));
    assert!(
        matches!(call(&mut rt, "minus", &[n(0.0)]), Value::Number(x) if x == 0.0 && x.is_sign_negative())
    );
    let values = rt.array(vec![n(1.0), n(2.0)]);
    assert_eq!(call(&mut rt, "add", &[values, n(3.0)]), s("1,23"));
    for _ in 0..32 {
        assert!(matches!(call(&mut rt, "rand", &[]), Value::Number(x) if (0.0..1.0).contains(&x)));
    }
}

#[test]
fn extrema_compare_values_and_return_original_winner() {
    let mut rt = Runtime::new();
    let numbers = rt.array(vec![n(1.0), n(5.0), n(2.0)]);
    assert_eq!(call(&mut rt, "max", std::slice::from_ref(&numbers)), n(5.0));
    assert_eq!(call(&mut rt, "min", &[numbers]), n(1.0));
    let strings = rt.array(vec![s("9"), s("10")]);
    assert_eq!(call(&mut rt, "max", std::slice::from_ref(&strings)), s("9"));
    assert_eq!(call(&mut rt, "min", &[strings]), s("10"));
    let mixed = rt.array(vec![s("9"), n(10.0)]);
    assert_eq!(call(&mut rt, "max", &[mixed]), n(10.0));
    let nan = rt.array(vec![n(f64::NAN), n(2.0)]);
    assert_eq!(call(&mut rt, "max", &[nan]), n(2.0));
    let zero = rt.array(vec![n(0.0), n(-0.0)]);
    assert!(matches!(call(&mut rt, "max", &[zero]), Value::Number(x) if x.is_sign_negative()));
    let empty = rt.array(vec![]);
    error(&mut rt, "min", &[empty], "TypeError");
    let nonarray = call(&mut rt, "max", &[n(2.0)]);
    assert_eq!(array(&rt, &nonarray), vec![]);
}

#[test]
fn equality_checks_first_argument_against_itself_too() {
    let mut rt = Runtime::new();
    for name in ["eq", "strictEq"] {
        assert_eq!(call(&mut rt, name, &[]), Value::Bool(true));
        assert_eq!(call(&mut rt, name, &[n(f64::NAN)]), Value::Bool(false));
    }
    for name in ["ne", "strictNe"] {
        assert_eq!(call(&mut rt, name, &[]), Value::Bool(false));
        assert_eq!(call(&mut rt, name, &[n(f64::NAN)]), Value::Bool(true));
    }
    assert_eq!(
        call(&mut rt, "eq", &[Value::Undefined, Value::Null]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "strictEq", &[n(1.0), s("1")]),
        Value::Bool(false)
    );
    let empty = rt.array(vec![]);
    assert_eq!(
        call(
            &mut rt,
            "eq",
            &[Value::Bool(false), empty.clone(), n(0.0), s("")]
        ),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "strictEq", &[empty.clone(), empty]),
        Value::Bool(true)
    );
    assert_eq!(call(&mut rt, "not", &[n(f64::NAN)]), Value::Bool(true));
    let empty = rt.array(vec![]);
    assert_eq!(call(&mut rt, "not", &[empty]), Value::Bool(false));
}

#[test]
fn type_checks_and_conversions_cover_non_json_values() {
    let mut rt = Runtime::new();
    for (value, type_name, class) in [
        (Value::Undefined, "undefined", "Undefined"),
        (Value::Null, "object", "Null"),
        (Value::Bool(false), "boolean", "Boolean"),
        (n(f64::NAN), "number", "Number"),
        (s("abc"), "string", "String"),
        (Value::Date(0), "object", "Date"),
        (Value::Builtin("add".into()), "function", "Function"),
        (Value::Special("and".into()), "function", "Function"),
    ] {
        assert_eq!(
            call(&mut rt, "type", std::slice::from_ref(&value)),
            s(type_name)
        );
        assert_eq!(
            call(&mut rt, "classOf", &[value]),
            s(&format!("[object {class}]"))
        );
    }
    assert_eq!(
        call(&mut rt, "isHash", &[Value::Date(0)]),
        Value::Bool(true)
    );
    assert_eq!(call(&mut rt, "isObj", &[Value::Date(0)]), Value::Bool(true));
    assert_eq!(call(&mut rt, "toInt", &[s("3.25")]), n(3.25));
    assert_eq!(call(&mut rt, "toInt", &[Value::Null]), n(0.0));
    assert!(matches!(call(&mut rt, "toInt", &[]), Value::Number(x) if x.is_nan()));
    for text in ["0", "1", "123", "0.5", "10.00"] {
        assert_eq!(
            call(&mut rt, "isNumberLike", &[s(text)]),
            Value::Bool(true),
            "{text}"
        );
    }
    for text in [
        "", "00", "01", "-1", "+1", "1e2", " 1", "1 ", "1.", ".5", "0\n", "NaN", "Infinity",
        "\u{661}",
    ] {
        assert_eq!(
            call(&mut rt, "isNumberLike", &[s(text)]),
            Value::Bool(false),
            "{text:?}"
        );
    }
    assert_eq!(
        call(&mut rt, "isNumberLike", &[n(f64::NAN)]),
        Value::Bool(true)
    );
    let a = rt.array(vec![n(1.0), Value::Null, n(2.0)]);
    assert_eq!(call(&mut rt, "toStr", std::slice::from_ref(&a)), s("1,,2"));
    assert_eq!(
        call(&mut rt, "isa", &[a, Value::Builtin("Array".into())]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "isa", &[n(1.0), Value::Builtin("Object".into())]),
        Value::Bool(false)
    );
    error(&mut rt, "isa", &[n(1.0), s("Array")], "TypeError");
}

#[test]
fn json_is_plain_not_runtime_tagged_and_omits_undefined() {
    let mut rt = Runtime::new();
    for value in [Value::Undefined, Value::Builtin("add".into())] {
        assert_eq!(call(&mut rt, "jsonStringify", &[value]), Value::Undefined);
    }
    let values = rt.array(vec![
        Value::Undefined,
        n(f64::NAN),
        n(f64::INFINITY),
        Value::Builtin("add".into()),
        n(-0.0),
    ]);
    assert_eq!(
        call(&mut rt, "jsonStringify", &[values]),
        s("[null,null,null,null,0]")
    );
    let value = rt.object(IndexMap::from([
        ("b".into(), n(1.0)),
        ("10".into(), n(10.0)),
        ("2".into(), n(2.0)),
        ("missing".into(), Value::Undefined),
        ("fn".into(), Value::Builtin("add".into())),
        ("null".into(), Value::Null),
    ]));
    assert_eq!(
        call(&mut rt, "jsonStringify", &[value]),
        s("{\"2\":2,\"10\":10,\"b\":1,\"null\":null}")
    );
    assert_eq!(
        call(&mut rt, "jsonStringify", &[Value::Date(0)]),
        s("\"1970-01-01T00:00:00.000Z\"")
    );
    let tagged = call(
        &mut rt,
        "jsonParse",
        &[s("{\"$type\":\"undefined\",\"__proto__\":42}")],
    );
    assert!(matches!(tagged, Value::Object(_)));
    assert_eq!(rt.get(&tagged, "__proto__"), n(42.0));
    assert_eq!(call(&mut rt, "jsonParse", &[Value::Null]), Value::Null);
    for text in ["undefined", "{", "NaN", "[1,]", "01"] {
        error(&mut rt, "jsonParse", &[s(text)], "SyntaxError");
    }
    let shared = rt.object(IndexMap::from([("a".into(), n(1.0))]));
    let values = rt.array(vec![shared.clone(), shared.clone()]);
    assert_eq!(
        call(&mut rt, "jsonStringify", &[values]),
        s("[{\"a\":1},{\"a\":1}]")
    );
    rt.set(&shared, "self", shared.clone()).unwrap();
    error(&mut rt, "jsonStringify", &[shared], "TypeError");
    let cycle = rt.array(vec![]);
    rt.set(&cycle, "0", cycle.clone()).unwrap();
    error(&mut rt, "str", &[cycle], "TypeError");
}

#[test]
fn str_jsonjoin_and_tostr_are_distinct() {
    let mut rt = Runtime::new();
    let a = rt.array(vec![n(1.0), n(2.0)]);
    assert_eq!(
        call(
            &mut rt,
            "str",
            &[s("a"), a.clone(), Value::Null, Value::Undefined]
        ),
        s("a[1,2]null")
    );
    assert_eq!(
        call(&mut rt, "jsonJoin", &[n(1.0), s("a"), a, Value::Undefined]),
        s("1 \"a\" [1,2] ")
    );
    assert_eq!(call(&mut rt, "str", &[]), s(""));
    assert_eq!(
        call(&mut rt, "str", &[Value::Builtin("add".into())]),
        s("add")
    );
}

#[test]
fn string_methods_coerce_arguments_not_receivers() {
    let mut rt = Runtime::new();
    for name in [
        "lower",
        "upper",
        "trim",
        "split",
        "words",
        "indexOf",
        "re_match",
        "padStart",
        "replace",
        "startsWith",
        "endsWith",
        "includes",
    ] {
        error(&mut rt, name, &[n(42.0)], "TypeError");
    }
    assert_eq!(
        call(&mut rt, "lower", &[s("HELLO \u{3a3}\u{39f}\u{3a3}")]),
        s("hello \u{3c3}\u{3bf}\u{3c2}")
    );
    assert_eq!(call(&mut rt, "upper", &[s("Stra\u{df}e")]), s("STRASSE"));
    assert_eq!(
        call(&mut rt, "trim", &[s("\u{feff}\u{a0} hello \r\n")]),
        s("hello")
    );
    assert_eq!(
        call(&mut rt, "trim", &[s("\u{85}hello\u{85}")]),
        s("\u{85}hello\u{85}")
    );
    assert_eq!(call(&mut rt, "trimStart", &[s("  hello  ")]), s("hello  "));
    assert_eq!(call(&mut rt, "trimEnd", &[s("  hello  ")]), s("  hello"));
    assert_eq!(
        call(&mut rt, "startsWith", &[s("undefined"), Value::Undefined]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "endsWith", &[s("a42"), n(42.0)]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "includes", &[s("abc"), s("")]),
        Value::Bool(true)
    );
    for (text, sep, expected) in [
        ("a,b,", s(","), vec![s("a"), s("b"), s("")]),
        ("", s(""), vec![]),
        ("", s(","), vec![s("")]),
        ("abc", Value::Undefined, vec![s("abc")]),
        ("a1b", n(1.0), vec![s("a"), s("b")]),
    ] {
        let result = call(&mut rt, "split", &[s(text), sep]);
        assert_eq!(array(&rt, &result), expected);
    }
}

#[test]
fn string_indices_padding_and_utf16_units() {
    let mut rt = Runtime::new();
    assert_eq!(
        call(&mut rt, "indexOf", &[s("\u{1f600}ab"), s("b")]),
        n(3.0)
    );
    assert_eq!(
        call(&mut rt, "indexOf", &[s("abc"), s(""), n(1000.0)]),
        n(3.0)
    );
    assert_eq!(
        call(&mut rt, "indexOf", &[s("abc"), s("a"), n(-2.0)]),
        n(0.0)
    );
    assert_eq!(
        call(&mut rt, "indexOf", &[s("abc"), s("a"), n(1.0)]),
        n(-1.0)
    );
    assert_eq!(
        call(&mut rt, "padStart", &[s("10"), n(5.0), s("0")]),
        s("00010")
    );
    assert_eq!(
        call(&mut rt, "padEnd", &[s("x"), n(6.9), s("ab")]),
        s("xababa")
    );
    assert_eq!(call(&mut rt, "padStart", &[s("x"), n(3.0)]), s("  x"));
    assert_eq!(call(&mut rt, "padEnd", &[s("x"), n(9.0), s("")]), s("x"));
    assert_eq!(
        call(&mut rt, "padEnd", &[s("\u{1f600}"), n(3.0), s("x")]),
        s("\u{1f600}x")
    );
    let split = call(&mut rt, "split", &[s("\u{1f600}"), s("")]);
    assert_eq!(
        array(&rt, &split),
        vec![Value::Utf16(vec![0xd83d]), Value::Utf16(vec![0xde00])]
    );
    assert_eq!(
        call(&mut rt, "padStart", &[s("x"), n(2.0), s("\u{1f600}")]),
        Value::Utf16(vec![0xd83d, 120])
    );
    error(
        &mut rt,
        "padStart",
        &[s("x"), n(f64::INFINITY)],
        "RangeError",
    );
}

#[test]
fn replacements_have_js_substitution_and_callback_semantics() {
    let mut rt = Runtime::new();
    assert_eq!(
        call(&mut rt, "replace", &[s("aba"), s("a"), s("x")]),
        s("xba")
    );
    assert_eq!(
        call(&mut rt, "replaceAll", &[s("aba"), s("a"), s("x")]),
        s("xbx")
    );
    assert_eq!(
        call(&mut rt, "replace", &[s("abc"), s("b"), s("$$:$&:$`:$':$1")]),
        s("a$:b:a:c:$1c")
    );
    assert_eq!(
        call(&mut rt, "replaceAll", &[s("ab"), s(""), s("-")]),
        s("-a-b-")
    );
    assert_eq!(call(&mut rt, "replace", &[s("a"), s("a")]), s("undefined"));
    assert_eq!(
        call(&mut rt, "replaceAll", &[s("\u{1f600}"), s(""), s("")]),
        s("\u{1f600}")
    );
    assert_eq!(
        call(&mut rt, "replaceAll", &[s("\u{1f600}"), s(""), s("-")]),
        Value::Utf16(vec![45, 0xd83d, 45, 0xde00, 45])
    );
    let calls = Rc::new(RefCell::new(Vec::new()));
    let recorded = calls.clone();
    rt.register_async("replacement", move |args| {
        recorded.borrow_mut().push(args);
        async { Ok(s("$&")) }.boxed_local()
    });
    let callback = rt.eval("replacement").unwrap();
    assert_eq!(
        call(&mut rt, "replaceAll", &[s("\u{1f600}aa"), s("a"), callback]),
        s("\u{1f600}$&$&")
    );
    assert_eq!(
        *calls.borrow(),
        vec![
            vec![s("a"), n(2.0), s("\u{1f600}aa")],
            vec![s("a"), n(3.0), s("\u{1f600}aa")]
        ]
    );
}

#[test]
fn array_method_overloads_use_identity_and_same_value_zero() {
    let mut rt = Runtime::new();
    let values = rt.array(vec![n(1.0), n(f64::NAN), s("1"), n(1.0)]);
    assert_eq!(
        call(&mut rt, "indexOf", &[values.clone(), n(1.0), n(-1.0)]),
        n(3.0)
    );
    assert_eq!(
        call(&mut rt, "indexOf", &[values.clone(), n(f64::NAN)]),
        n(-1.0)
    );
    assert_eq!(
        call(&mut rt, "includes", &[values, n(f64::NAN)]),
        Value::Bool(true)
    );
}

#[test]
fn regex_defaults_ascii_classes_and_lookarounds() {
    let mut rt = Runtime::new();
    let words = call(
        &mut rt,
        "words",
        &[s("a-1, test_2 - 322 __432__ \u{451}\u{436}")],
    );
    assert_eq!(
        array(&rt, &words),
        vec![
            s("a-1"),
            s("test_2"),
            s("322"),
            s("__432__"),
            s("\u{451}\u{436}")
        ]
    );
    let words = call(
        &mut rt,
        "words",
        &[s("a-1, test_2 \u{e9} \u{661}"), s(r"\w+")],
    );
    assert_eq!(array(&rt, &words), vec![s("a"), s("1"), s("test_2")]);
    let words = call(&mut rt, "words", &[s("x12 y34"), s(r"(?<=[a-z])\d+")]);
    assert_eq!(array(&rt, &words), vec![s("12"), s("34")]);
    let matches = call(&mut rt, "re_match", &[s("bookkeeper"), s(r"(.)\1"), s("g")]);
    assert_eq!(array(&rt, &matches), vec![s("oo"), s("kk"), s("ee")]);
    assert_eq!(
        call(&mut rt, "re_match", &[s("abc"), s("[0-9]+")]),
        Value::Null
    );
    let words = call(&mut rt, "words", &[s("")]);
    assert_eq!(array(&rt, &words), vec![]);
    let matches = call(
        &mut rt,
        "re_match",
        &[s("\u{feff}\u{85}"), s(r"\s"), s("g")],
    );
    assert_eq!(array(&rt, &matches), vec![s("\u{feff}")]);
}

#[test]
fn regex_captures_metadata_indices_and_named_groups() {
    let mut rt = Runtime::new();
    let result = call(
        &mut rt,
        "re_match",
        &[s("\u{1f600}test(aaa)"), s(r"\((?<word>a+)(b)?\)"), s("d")],
    );
    assert_eq!(
        array(&rt, &result),
        vec![s("(aaa)"), s("aaa"), Value::Undefined]
    );
    assert_eq!(rt.get(&result, "index"), n(6.0));
    assert_eq!(rt.get(&result, "input"), s("\u{1f600}test(aaa)"));
    assert_eq!(rt.get(&rt.get(&result, "groups"), "word"), s("aaa"));
    let indices = rt.get(&result, "indices");
    assert_eq!(array(&rt, &rt.get(&indices, "0")), vec![n(6.0), n(11.0)]);
    assert_eq!(array(&rt, &rt.get(&indices, "1")), vec![n(7.0), n(10.0)]);
    assert_eq!(rt.get(&indices, "2"), Value::Undefined);
    assert_eq!(
        array(&rt, &rt.get(&rt.get(&indices, "groups"), "word")),
        vec![n(7.0), n(10.0)]
    );
    let plain = call(&mut rt, "re_match", &[s("x"), s("x")]);
    assert_eq!(rt.get(&plain, "groups"), Value::Undefined);
}

#[test]
fn regex_flags_zero_width_sticky_and_utf16() {
    let mut rt = Runtime::new();
    for flags in ["gg", "z", "ii"] {
        error(
            &mut rt,
            "re_match",
            &[s("a"), s("a"), s(flags)],
            "SyntaxError",
        );
    }
    error(&mut rt, "re_match", &[s("a"), s("[")], "SyntaxError");
    assert_eq!(
        call(&mut rt, "re_match", &[s("ba"), s("a"), s("y")]),
        Value::Null
    );
    let sticky = call(&mut rt, "re_match", &[s("aa ba"), s("a"), s("gy")]);
    assert_eq!(array(&rt, &sticky), vec![s("a"), s("a")]);
    let insensitive = call(&mut rt, "re_match", &[s("aA"), s("a"), s("gi")]);
    assert_eq!(array(&rt, &insensitive), vec![s("a"), s("A")]);
    let multiline = call(&mut rt, "re_match", &[s("a\rb\u{2028}c"), s("^."), s("gm")]);
    assert_eq!(array(&rt, &multiline), vec![s("a"), s("b"), s("c")]);
    assert_eq!(call(&mut rt, "re_match", &[s("a\n"), s("a$")]), Value::Null);
    let dot = call(&mut rt, "re_match", &[s("\n"), s("."), s("s")]);
    assert_eq!(array(&rt, &dot), vec![s("\n")]);
    let empty = call(&mut rt, "re_match", &[s("\u{1f600}"), s(""), s("g")]);
    assert_eq!(array(&rt, &empty), vec![s(""), s(""), s("")]);
    let empty = call(&mut rt, "re_match", &[s("\u{1f600}"), s(""), s("gu")]);
    assert_eq!(array(&rt, &empty), vec![s(""), s("")]);
    let pair = call(&mut rt, "re_match", &[s("\u{1f600}"), s("..")]);
    assert_eq!(array(&rt, &pair), vec![s("\u{1f600}")]);
    let unicode = call(&mut rt, "re_match", &[s("\u{1f600}"), s("."), s("u")]);
    assert_eq!(array(&rt, &unicode), vec![s("\u{1f600}")]);
    let unit = call(&mut rt, "re_match", &[s("\u{1f600}"), s(".")]);
    assert_eq!(array(&rt, &unit), vec![Value::Utf16(vec![0xd83d])]);
}

#[test]
fn utf16_surrogates_survive_all_string_operations() {
    let mut rt = Runtime::new();
    let high = Value::Utf16(vec![0xd800]);
    let low = Value::Utf16(vec![0xdc00]);
    assert_eq!(
        call(&mut rt, "add", &[high.clone(), low.clone()]),
        s("\u{10000}")
    );
    assert_eq!(
        call(&mut rt, "str", &[high.clone(), low.clone()]),
        s("\u{10000}")
    );
    assert_eq!(call(&mut rt, "toStr", std::slice::from_ref(&high)), high);
    assert_eq!(
        call(&mut rt, "isString", std::slice::from_ref(&low)),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "type", std::slice::from_ref(&low)),
        s("string")
    );
    assert_eq!(
        call(&mut rt, "classOf", std::slice::from_ref(&low)),
        s("[object String]")
    );
    assert_eq!(
        call(&mut rt, "isNumberLike", std::slice::from_ref(&low)),
        Value::Bool(false)
    );
    let text = Value::Utf16(vec![32, 65, 0xd800, 66, 32]);
    assert_eq!(
        call(&mut rt, "lower", std::slice::from_ref(&text)),
        Value::Utf16(vec![32, 97, 0xd800, 98, 32])
    );
    assert_eq!(
        call(&mut rt, "trim", std::slice::from_ref(&text)),
        Value::Utf16(vec![65, 0xd800, 66])
    );
    assert_eq!(
        call(&mut rt, "indexOf", &[text.clone(), high.clone()]),
        n(2.0)
    );
    assert_eq!(
        call(&mut rt, "includes", &[text.clone(), high.clone()]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "startsWith", &[high.clone(), high.clone()]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "endsWith", &[low.clone(), low.clone()]),
        Value::Bool(true)
    );
    assert_eq!(
        call(&mut rt, "replace", &[text.clone(), high.clone(), s("x")]),
        s(" AxB ")
    );
    let parts = call(&mut rt, "split", &[text.clone(), high.clone()]);
    assert_eq!(array(&rt, &parts), vec![s(" A"), s("B ")]);
    let a = rt.array(vec![high.clone()]);
    assert_eq!(call(&mut rt, "toStr", std::slice::from_ref(&a)), high);
    assert_eq!(call(&mut rt, "add", &[a, low.clone()]), s("\u{10000}"));
    for flags in ["", "u"] {
        let result = call(&mut rt, "re_match", &[high.clone(), s("."), s(flags)]);
        assert_eq!(array(&rt, &result), vec![high.clone()]);
        let result = call(&mut rt, "re_match", &[text.clone(), high.clone(), s(flags)]);
        assert_eq!(array(&rt, &result), vec![high.clone()]);
        assert_eq!(rt.get(&result, "index"), n(2.0));
        assert_eq!(rt.get(&result, "input"), text);
    }
    let collision = Value::Utf16(vec![0xdb80, 0xdc00, 0xd800]);
    let result = call(&mut rt, "re_match", &[collision, s("."), s("gu")]);
    assert_eq!(array(&rt, &result), vec![s("\u{f0000}"), high]);
}

#[test]
fn json_strings_roundtrip_surrogates_controls_and_private_scalars() {
    let mut rt = Runtime::new();
    for (json, value, canonical) in [
        (r#""\ud800""#, Value::Utf16(vec![0xd800]), r#""\ud800""#),
        (
            r#""\udc00\ud800""#,
            Value::Utf16(vec![0xdc00, 0xd800]),
            r#""\udc00\ud800""#,
        ),
        (r#""\ud83d\ude00""#, s("\u{1f600}"), "\"\u{1f600}\""),
        ("\"\u{f0000}\"", s("\u{f0000}"), "\"\u{f0000}\""),
        (
            r#""\u0000\t\r\n\b\f\"\\/""#,
            s("\0\t\r\n\x08\x0c\"\\/"),
            r#""\u0000\t\r\n\b\f\"\\/""#,
        ),
    ] {
        assert_eq!(call(&mut rt, "jsonParse", &[s(json)]), value, "{json}");
        assert_eq!(
            call(&mut rt, "jsonStringify", &[value]),
            s(canonical),
            "{json}"
        );
    }
    let raw = Value::Utf16(vec![34, 0xd800, 34]);
    assert_eq!(
        call(&mut rt, "jsonParse", &[raw]),
        Value::Utf16(vec![0xd800])
    );
    let json = r#"{"a":["\ud800",{"b":"\udc00"}]}"#;
    let parsed = call(&mut rt, "jsonParse", &[s(json)]);
    assert_eq!(call(&mut rt, "jsonStringify", &[parsed]), s(json));
    error(
        &mut rt,
        "jsonParse",
        &[s(r#"{"\ud800":1}"#)],
        "UnicodeError",
    );
    for text in [r#""\uZ000""#, r#""\u123""#, r#""\q""#, "\"a\nb\""] {
        error(&mut rt, "jsonParse", &[s(text)], "SyntaxError");
    }
    assert_eq!(call(&mut rt, "jsonParse", &[s("1e400")]), n(f64::INFINITY));
    assert_eq!(
        call(&mut rt, "jsonParse", &[s("-1e400")]),
        n(f64::NEG_INFINITY)
    );
    assert!(
        matches!(call(&mut rt, "jsonParse", &[s("-0")]), Value::Number(x) if x == 0.0 && x.is_sign_negative())
    );
    assert_eq!(call(&mut rt, "jsonStringify", &[n(1e21)]), s("1e+21"));
    assert_eq!(call(&mut rt, "jsonStringify", &[n(1e-7)]), s("1e-7"));
}

#[test]
fn json_callbacks_promises_sparse_arrays_and_limits() {
    let mut rt = Runtime::new();
    let keys = Rc::new(RefCell::new(Vec::new()));
    let recorded = keys.clone();
    rt.register("toJSONValue", move |args| {
        recorded.borrow_mut().push(args);
        Ok(Value::Utf16(vec![0xd800]))
    });
    let method = rt.eval("toJSONValue").unwrap();
    let object = rt.object(IndexMap::from([("toJSON".into(), method)]));
    assert_eq!(
        call(&mut rt, "jsonStringify", std::slice::from_ref(&object)),
        s(r#""\ud800""#)
    );
    let values = rt.array(vec![object]);
    assert_eq!(
        call(&mut rt, "jsonStringify", &[values]),
        s(r#"["\ud800"]"#)
    );
    assert_eq!(*keys.borrow(), vec![vec![s("")], vec![s("0")]]);
    let promise = rt.promise(async { Ok(n(42.0)) });
    assert_eq!(
        call(&mut rt, "jsonStringify", std::slice::from_ref(&promise)),
        s("{}")
    );
    assert_eq!(call(&mut rt, "classOf", &[promise]), s("[object Promise]"));
    let sparse = rt.array(vec![n(1.0), Value::Undefined]);
    rt.delete(&sparse, "0").unwrap();
    assert_eq!(
        call(&mut rt, "indexOf", &[sparse.clone(), Value::Undefined]),
        n(1.0)
    );
    assert_eq!(call(&mut rt, "jsonStringify", &[sparse]), s("[null,null]"));
    rt.cancellation_token()
        .store(true, std::sync::atomic::Ordering::Relaxed);
    error(&mut rt, "padStart", &[s("x"), n(1000.0)], "Cancelled");
}

#[test]
fn regex_js_escape_and_backreference_edges() {
    let mut rt = Runtime::new();
    for (text, pattern, flags, expected) in [
        (
            s("\u{1f600}"),
            s(r"\ud83d\ude00"),
            "u",
            vec![s("\u{1f600}")],
        ),
        (s("\u{1f600}"), s(r"\ud83d\ude00"), "", vec![s("\u{1f600}")]),
        (
            Value::Utf16(vec![0xd800]),
            s(r"\ud800"),
            "u",
            vec![Value::Utf16(vec![0xd800])],
        ),
        (s("\n"), s("[^]"), "", vec![s("\n")]),
        (s("b"), s(r"(a)?\1b"), "", vec![s("b"), Value::Undefined]),
        (s("a"), s(r"\1(a)"), "", vec![s("a"), s("a")]),
        (s("\x01"), s(r"\1"), "", vec![s("\x01")]),
        (s("\t"), s(r"\11"), "", vec![s("\t")]),
        (s("a"), s(r"\a"), "", vec![s("a")]),
        (s("p{L}"), s(r"\p{L}"), "", vec![s("p{L}")]),
        (s("\u{e9}"), s(r"\p{L}"), "u", vec![s("\u{e9}")]),
    ] {
        let value = call(&mut rt, "re_match", &[text, pattern, s(flags)]);
        assert_eq!(array(&rt, &value), expected);
    }
    error(
        &mut rt,
        "re_match",
        &[s("a"), s(r"\a"), s("u")],
        "SyntaxError",
    );
    error(
        &mut rt,
        "re_match",
        &[s("a"), s(r"\1"), s("u")],
        "SyntaxError",
    );
}

#[test]
fn sparse_extrema_skip_holes_like_js_reduce() {
    let mut rt = Runtime::new();
    let values = rt.array(vec![n(5.0), n(2.0)]);
    rt.delete(&values, "1").unwrap();
    assert_eq!(call(&mut rt, "max", std::slice::from_ref(&values)), n(5.0));
    assert_eq!(call(&mut rt, "min", std::slice::from_ref(&values)), n(5.0));
    rt.delete(&values, "0").unwrap();
    error(&mut rt, "max", &[values], "TypeError");
}

#[test]
fn runtime_registers_and_evaluates_regular_builtins() {
    let mut rt = Runtime::new();
    for (source, expected) in [
        ("add(1, '1', 1)", s("111")),
        ("multiply(2, 3, 4)", n(24.0)),
        ("max({1, 5, 2, 8, 3})", n(8.0)),
        ("strictEq(1, '1')", Value::Bool(false)),
        ("isNumberLike('00')", Value::Bool(false)),
        ("jsonStringify({a = 1})", s("{\"a\":1}")),
        ("str('a', {1, 2, 3})", s("a[1,2,3]")),
        ("'10'.padStart(5, '0')", s("00010")),
        ("isa({1, 2}, Array)", Value::Bool(true)),
    ] {
        assert_eq!(
            rt.eval(source).unwrap_or_else(|e| panic!("{source}: {e}")),
            expected,
            "{source}"
        );
    }
}

// All inputs and successful outputs in this audit are valid Unicode. This is a
// focused compatibility corpus, not an ECMAScript conformance claim.
fn regex_audit_cases() -> Vec<(&'static str, &'static str, &'static str, serde_json::Value)> {
    use serde_json::json;
    vec![
        (
            "y",
            r"(?<a>x)?\k<a>y",
            "",
            json!({"matches":["y",null],"index":0}),
        ),
        (
            "x",
            r"\k<a>(?<a>x)",
            "",
            json!({"matches":["x","x"],"index":0}),
        ),
        (
            "xx",
            r"(?<a>x)\k<a>",
            "",
            json!({"matches":["xx","x"],"index":0}),
        ),
        (
            "a[b&",
            "[a[b]",
            "g",
            json!({"matches":["a","[","b"],"index":null}),
        ),
        (
            "a&b",
            "[a&&b]",
            "g",
            json!({"matches":["a","&","b"],"index":null}),
        ),
        ("ax", r"\x", "g", json!({"matches":["x"],"index":null})),
        ("xZ1", r"\xZ1", "", json!({"matches":["xZ1"],"index":0})),
        ("!", r"\!", "", json!({"matches":["!"],"index":0})),
        (
            "k<unknown>",
            r"\k<unknown>",
            "",
            json!({"matches":["k<unknown>"],"index":0}),
        ),
        ("x{a}", "x{a}", "", json!({"matches":["x{a}"],"index":0})),
        (
            "\u{212a}\u{17f}\u{1e9e}",
            "[a-z\u{df}]+",
            "giu",
            json!({"matches":["\u{212a}\u{17f}\u{1e9e}"],"index":null}),
        ),
        (
            "\u{212a}\u{17f}",
            r"\w+",
            "giu",
            json!({"matches":["\u{212a}\u{17f}"],"index":null}),
        ),
        (
            "\u{41f}\u{420}\u{418}\u{412}\u{415}\u{422}",
            "\u{43f}\u{440}\u{438}\u{432}\u{435}\u{442}",
            "i",
            json!({"matches":["\u{41f}\u{420}\u{418}\u{412}\u{415}\u{422}"],"index":0}),
        ),
        (
            "\u{3b1}\u{3b2} abc",
            r"\p{Script=Greek}+",
            "gu",
            json!({"matches":["\u{3b1}\u{3b2}"],"index":null}),
        ),
        (
            "a\rb\u{2028}c\u{2029}d",
            "^.",
            "gm",
            json!({"matches":["a","b","c","d"],"index":null}),
        ),
        ("a\nb", "a.b", "s", json!({"matches":["a\nb"],"index":0})),
        (
            "aa ba",
            "a",
            "gy",
            json!({"matches":["a","a"],"index":null}),
        ),
        ("ba", "a", "y", json!(null)),
        ("ab", "(?=.)", "g", json!({"matches":["",""],"index":null})),
        (
            "\u{1f600}ab",
            "(?<x>a)(b)?",
            "du",
            json!({"matches":["ab","a","b"],"index":2}),
        ),
        ("b", r"(a)?\1b", "", json!({"matches":["b",null],"index":0})),
    ]
}

fn regex_audit_snapshot(rt: &Runtime, value: &Value) -> serde_json::Value {
    if matches!(value, Value::Null) {
        return serde_json::Value::Null;
    }
    let matches = rt
        .array_values(value)
        .unwrap()
        .iter()
        .map(|v| match v {
            Value::Undefined => serde_json::Value::Null,
            Value::String(s) => serde_json::Value::String(s.clone()),
            _ => panic!("Audit returned non-UTF8 capture: {v:?}"),
        })
        .collect::<Vec<_>>();
    let index = match rt.get(value, "index") {
        Value::Number(n) => Some(n as usize),
        _ => None,
    };
    serde_json::json!({"matches":matches,"index":index})
}

#[test]
fn regex_valid_unicode_js_backed_audit() {
    let mut rt = Runtime::new();
    for (text, pattern, flags, expected) in regex_audit_cases() {
        let value = call(&mut rt, "re_match", &[s(text), s(pattern), s(flags)]);
        assert_eq!(
            regex_audit_snapshot(&rt, &value),
            expected,
            "{text:?}, /{pattern}/{flags}"
        );
    }
}

fn regex_regression_cases() -> Vec<(&'static str, &'static str, &'static str, serde_json::Value)> {
    use serde_json::json;
    vec![
        // Preserve all eight former engine gaps, including legacy case folding.
        ("abc", "a", "v", json!({"matches":["a"],"index":0})),
        (
            "abc",
            "[[a-z]&&[^aeiou]]",
            "v",
            json!({"matches":["b"],"index":1}),
        ),
        ("aaab", "(?<=a+)b", "", json!({"matches":["b"],"index":3})),
        (
            "ba",
            "(a|(b))+",
            "",
            json!({"matches":["ba","a",null],"index":0}),
        ),
        ("y", "(?:(x)?y){2}", "", json!(null)),
        ("\u{212a}\u{17f}\u{1e9e}", "[a-z\u{df}]+", "i", json!(null)),
        ("k", r"\u212a", "i", json!(null)),
        ("A", "(?i:a)", "", json!({"matches":["A"],"index":0})),
        (
            "xyy",
            "(?:(x)?y){2}",
            "",
            json!({"matches":["xyy",null],"index":0}),
        ),
        (
            "KkSs\u{df}\u{212a}\u{17f}\u{1e9e}",
            "[a-z\u{df}]+",
            "gi",
            json!({"matches":["KkSs\u{df}"],"index":null}),
        ),
        ("k", r"\u212a", "iu", json!({"matches":["k"],"index":0})),
        (
            "Ab AB",
            "(?i:a)b",
            "g",
            json!({"matches":["Ab"],"index":null}),
        ),
        (
            "aB Ab AB",
            "(?-i:a)b",
            "gi",
            json!({"matches":["aB"],"index":null}),
        ),
        (
            "AbC ABC abc",
            "(?i:a(?-i:b)c)",
            "g",
            json!({"matches":["AbC","abc"],"index":null}),
        ),
        (
            "x\rA\u{2028}B",
            "(?m:^[AB]$)",
            "g",
            json!({"matches":["A","B"],"index":null}),
        ),
        ("x\nA", "(?-m:^A)", "m", json!(null)),
        (
            "a\nb a\rX",
            "(?s:a.b).",
            "g",
            json!({"matches":["a\nb "],"index":null}),
        ),
        (
            "a\nb aXb",
            "(?-s:a.b)",
            "gs",
            json!({"matches":["aXb"],"index":null}),
        ),
        (
            "abcXYZ",
            "[[a-z]--[aeiou]]+",
            "gv",
            json!({"matches":["bc"],"index":null}),
        ),
        (
            "A\u{3b1}B\u{3b2}",
            r"[\p{Letter}&&\p{Script=Greek}]+",
            "gv",
            json!({"matches":["\u{3b1}","\u{3b2}"],"index":null}),
        ),
        (
            "ab cd a",
            r"[\q{ab|cd}]",
            "gv",
            json!({"matches":["ab","cd"],"index":null}),
        ),
        (
            "abc",
            "(?<=([ab]+)([bc]+))$",
            "",
            json!({"matches":["","a","bc"],"index":3}),
        ),
        (
            "aab",
            r"(?<=\1(a))b",
            "",
            json!({"matches":["b","a"],"index":2}),
        ),
        (
            "\u{1f600}\u{1f600}x\u{1f600}",
            "\u{1f600}",
            "gyu",
            json!({"matches":["\u{1f600}","\u{1f600}"],"index":null}),
        ),
        (
            "\u{1f600}\u{1f600}x\u{1f600}",
            "\u{1f600}",
            "gu",
            json!({"matches":["\u{1f600}","\u{1f600}","\u{1f600}"],"index":null}),
        ),
        (
            "\u{1f600}",
            "",
            "gy",
            json!({"matches":["","",""],"index":null}),
        ),
        (
            "\u{1f600}",
            "",
            "gyu",
            json!({"matches":["",""],"index":null}),
        ),
        (
            "\u{1f600}",
            "",
            "gyv",
            json!({"matches":["",""],"index":null}),
        ),
        ("ab", "(?=a)", "gy", json!({"matches":[""],"index":null})),
        ("z", "a", "g", json!(null)),
        ("\u{1f600}\u{1f600}", "^\u{1f600}{2}$", "", json!(null)),
        (
            "\u{1f600}\u{1f600}",
            "^(?:\u{1f600}){2}$",
            "",
            json!({"matches":["\u{1f600}\u{1f600}"],"index":0}),
        ),
        (
            "\u{1f600}\u{1f600}",
            "^\u{1f600}{2}$",
            "u",
            json!({"matches":["\u{1f600}\u{1f600}"],"index":0}),
        ),
        (
            "\u{1f600}\u{1f600}",
            "^\u{1f600}{2}$",
            "v",
            json!({"matches":["\u{1f600}\u{1f600}"],"index":0}),
        ),
        (
            "\u{1f600}",
            r"\ud83d\ude00",
            "",
            json!({"matches":["\u{1f600}"],"index":0}),
        ),
        (
            "\u{1f600}",
            r"\ud83d\ude00",
            "u",
            json!({"matches":["\u{1f600}"],"index":0}),
        ),
        (
            "\u{1f600}",
            r"\ud83d\ude00",
            "v",
            json!({"matches":["\u{1f600}"],"index":0}),
        ),
        ("a", r"\u{61}", "", json!(null)),
        ("a", r"\u{61}", "u", json!({"matches":["a"],"index":0})),
        ("a", r"\u{61}", "v", json!({"matches":["a"],"index":0})),
        (
            "aa",
            r"(?<\u0061>a)\k<a>",
            "",
            json!({"matches":["aa","a"],"index":0}),
        ),
        (
            "aa",
            r"(?<\u{61}>a)\k<a>",
            "",
            json!({"matches":["aa","a"],"index":0}),
        ),
        ("\u{1f600}a", r"\ud83d\u0061", "", json!(null)),
        ("\u{1f600}a", r"\ud83d\u0061", "u", json!(null)),
        ("\u{1f600}a", r"\ud83d\u0061", "v", json!(null)),
    ]
}

#[test]
fn regex_regressions_match_javascript_values() {
    let mut rt = Runtime::new();
    for (text, pattern, flags, expected) in regex_regression_cases() {
        let value = call(&mut rt, "re_match", &[s(text), s(pattern), s(flags)]);
        assert_eq!(
            regex_audit_snapshot(&rt, &value),
            expected,
            "{text:?}, /{pattern}/{flags}"
        );
    }
}

#[test]
fn regex_legacy_quantifiers_and_unpaired_surrogate_escapes() {
    let mut rt = Runtime::new();
    let repeated = s(&"u".repeat(61));
    let value = call(
        &mut rt,
        "re_match",
        &[repeated.clone(), s(r"\u{61}"), s("")],
    );
    assert_eq!(
        rt.array_values(&value)
            .expect("legacy \\u{61} matches 61 u characters"),
        vec![repeated]
    );
    let legacy = Value::Utf16(vec![0xd83d, 0xde00, 0xde00]);
    let value = call(
        &mut rt,
        "re_match",
        &[legacy.clone(), s("^\u{1f600}{2}$"), s("")],
    );
    assert_eq!(
        rt.array_values(&value)
            .expect("legacy emoji quantifier repeats only the low surrogate"),
        vec![legacy]
    );
    for flags in ["", "u", "v"] {
        let text = Value::Utf16(vec![0xd83d, 0x61]);
        let value = call(
            &mut rt,
            "re_match",
            &[text.clone(), s(r"\ud83d\u0061"), s(flags)],
        );
        assert_eq!(
            rt.array_values(&value)
                .unwrap_or_else(|e| panic!("/\\ud83d\\u0061/{flags}: {e}")),
            vec![text],
            "/\\ud83d\\u0061/{flags}"
        );
    }
}

// [captures, index, input, groups, indices, indices.groups], preserving undefined.
fn regex_metadata_cases() -> Vec<(&'static str, &'static str, &'static str, serde_json::Value)> {
    use serde_json::json;
    let u = json!({"$lpe":"undefined"});
    vec![
        ("a", "(a)", "", json!([["a", "a"], 0, "a", u, u, u])),
        (
            "\u{1f600}b",
            "(?<face>\u{1f600})(?<missing>a)?(?<tail>b)",
            "du",
            json!([["\u{1f600}b","\u{1f600}",u,"b"],0,"\u{1f600}b",{"face":"\u{1f600}","missing":u,"tail":"b"},[[0,3],[0,2],u,[2,3]],{"face":[0,2],"missing":u,"tail":[2,3]}]),
        ),
        (
            "\u{1f600}a",
            "(?<letter>a)(b)?",
            "d",
            json!([["a","a",u],2,"\u{1f600}a",{"letter":"a"},[[2,3],[2,3],u],{"letter":[2,3]}]),
        ),
        (
            "b",
            "(?<empty>a*)(?<missing>x)?b",
            "d",
            json!([["b","",u],0,"b",{"empty":"","missing":u},[[0,1],[0,0],u],{"empty":[0,0],"missing":u}]),
        ),
        (
            "b",
            "(a)?b",
            "d",
            json!([["b", u], 0, "b", u, [[0, 1], u], u]),
        ),
        (
            "ba",
            "(?<last>a|(?<inner>b))+",
            "d",
            json!([["ba","a",u],0,"ba",{"last":"a","inner":u},[[0,2],[1,2],u],{"last":[1,2],"inner":u}]),
        ),
        (
            "abc",
            "(?<=(?<left>[ab]+)(?<right>[bc]+))$",
            "d",
            json!([["","a","bc"],3,"abc",{"left":"a","right":"bc"},[[3,3],[0,1],[1,3]],{"left":[0,1],"right":[1,3]}]),
        ),
        (
            "abc",
            "(?<=([abc])+)$",
            "d",
            json!([["", "a"], 3, "abc", u, [[3, 3], [0, 1]], u]),
        ),
        (
            "\u{1f600}\u{1f600}x\u{1f600}",
            "(?<face>\u{1f600})",
            "dgyu",
            json!([["\u{1f600}", "\u{1f600}"], u, u, u, u, u]),
        ),
        (
            "\u{1f600}x",
            "(?<face>.)",
            "duy",
            json!([["\u{1f600}","\u{1f600}"],0,"\u{1f600}x",{"face":"\u{1f600}"},[[0,2],[0,2]],{"face":[0,2]}]),
        ),
        (
            "\u{1f600}x",
            "(?<face>.)",
            "dv",
            json!([["\u{1f600}","\u{1f600}"],0,"\u{1f600}x",{"face":"\u{1f600}"},[[0,2],[0,2]],{"face":[0,2]}]),
        ),
        (
            "a",
            "(?<x>a)|(?<x>b)",
            "d",
            json!([["a","a",u],0,"a",{"x":"a"},[[0,1],[0,1],u],{"x":[0,1]}]),
        ),
        (
            "b",
            "(?<x>a)|(?<x>b)",
            "d",
            json!([["b",u,"b"],0,"b",{"x":"b"},[[0,1],u,[0,1]],{"x":[0,1]}]),
        ),
    ]
}

fn regex_metadata_snapshot(rt: &Runtime, value: &Value) -> serde_json::Value {
    if matches!(value, Value::Null) {
        return serde_json::Value::Null;
    }
    let indices = rt.get(value, "indices");
    serde_json::json!([
        rt.to_json(value).unwrap(),
        rt.to_json(&rt.get(value, "index")).unwrap(),
        rt.to_json(&rt.get(value, "input")).unwrap(),
        rt.to_json(&rt.get(value, "groups")).unwrap(),
        rt.to_json(&indices).unwrap(),
        rt.to_json(&rt.get(&indices, "groups")).unwrap(),
    ])
}

#[test]
fn regex_metadata_preserves_undefined_utf16_offsets_and_capture_direction() {
    let mut rt = Runtime::new();
    for (text, pattern, flags, expected) in regex_metadata_cases() {
        let value = call(&mut rt, "re_match", &[s(text), s(pattern), s(flags)]);
        let expected = rt.from_json(&expected);
        assert_eq!(
            regex_metadata_snapshot(&rt, &value),
            rt.to_json(&expected).unwrap(),
            "{text:?}, /{pattern}/{flags}"
        );
    }
}

#[test]
fn regex_named_indices_alias_the_numbered_capture_not_an_equal_range() {
    let mut rt = Runtime::new();
    for (text, pattern, name, capture) in [
        ("a", "((?<named>a))", "named", "2"),
        ("a", "(?<outer>(?<inner>a))", "outer", "1"),
        ("a", "(?<outer>(?<inner>a))", "inner", "2"),
        ("a", "(?<x>a)|(?<x>b)", "x", "1"),
        ("b", "(?<x>a)|(?<x>b)", "x", "2"),
    ] {
        let value = call(&mut rt, "re_match", &[s(text), s(pattern), s("d")]);
        let indices = rt.get(&value, "indices");
        let named = rt.get(&rt.get(&indices, "groups"), name);
        assert!(
            matches!(named, Value::Array(_)),
            "{text:?}, /{pattern}/d, {name}"
        );
        for i in 0..array(&rt, &indices).len() {
            let key = i.to_string();
            assert_eq!(
                named == rt.get(&indices, &key),
                key == capture,
                "{text:?}, /{pattern}/d, {name}, index {i}"
            );
        }
        rt.set(&named, "0", n(99.0)).unwrap();
        assert_eq!(rt.get(&rt.get(&indices, capture), "0"), n(99.0));
        assert_eq!(rt.get(&rt.get(&indices, "0"), "0"), n(0.0));
    }
}

fn invalid_regex_cases() -> Vec<(&'static str, &'static str)> {
    vec![
        ("a", "uv"),
        ("a", "vv"),
        ("a", "z"),
        ("a", "dd"),
        ("a", "yy"),
        ("a", "U"),
        ("[", ""),
        ("(", ""),
        ("a{2,1}", ""),
        (r"\x", "u"),
        (r"\!", "u"),
        (r"\p{NotAProperty}", "u"),
        ("(?>a)", ""),
        ("(?i)a", ""),
        ("(?i-i:a)", ""),
        ("(?ii:a)", ""),
        ("(?g:a)", ""),
        ("(?-:a)", ""),
        ("[a&&]", "v"),
        ("[a--]", "v"),
        ("(?<a>x)(?<a>y)", ""),
        ("(?<1>x)", ""),
        (r"(?<a>x)\k<b>", ""),
    ]
}

#[test]
fn regex_invalid_flags_and_syntax_are_syntax_errors() {
    let mut rt = Runtime::new();
    for (pattern, flags) in invalid_regex_cases() {
        assert_eq!(
            block_on(builtins::call(
                &mut rt,
                "re_match",
                &[s("a"), s(pattern), s(flags)]
            ))
            .unwrap_err()
            .kind,
            "SyntaxError",
            "/{pattern}/{flags}"
        );
    }
}

#[test]
#[ignore = "Requires Node.js; executes the current JS string context as the audit oracle"]
fn regex_audit_against_current_javascript() {
    let mut cases = regex_audit_cases();
    cases.extend(regex_regression_cases());
    let metadata = regex_metadata_cases();
    let invalid = invalid_regex_cases();
    let mut inputs = cases
        .iter()
        .map(|(text, pattern, flags, _)| (*text, *pattern, *flags))
        .collect::<Vec<_>>();
    inputs.extend(
        metadata
            .iter()
            .map(|(text, pattern, flags, _)| (*text, *pattern, *flags)),
    );
    inputs.extend(
        invalid
            .iter()
            .map(|(pattern, flags)| ("a", *pattern, *flags)),
    );
    let script = r#"
const fs = require('node:fs');
const source = fs.readFileSync(process.argv[1], 'utf8')
  .replace(/^import .*$/gm, '').replace('export default _context;', '');
const context = new Function('isString', 'isFunction', source + '\nreturn _context;')(
  value => typeof value === 'string', value => typeof value === 'function');
const results = JSON.parse(process.argv[2]).map(([text, pattern, flags]) => {
  try {
    const value = context.re_match(text, pattern, flags);
    return value === null ? null : [Array.from(value), value.index, value.input, value.groups,
      value.indices && Array.from(value.indices), value.indices?.groups];
  } catch (error) {
    return {error: error.name};
  }
});
process.stdout.write(JSON.stringify(results, (_, value) => value === undefined ? {$lpe: 'undefined'} : value));
"#;
    let source = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/context/strings.js");
    let result = std::process::Command::new("node")
        .arg("-e")
        .arg(script)
        .arg(source)
        .arg(serde_json::to_string(&inputs).unwrap())
        .output()
        .expect("Node.js is required for the live JS audit");
    assert!(
        result.status.success(),
        "JS audit failed: {}",
        String::from_utf8_lossy(&result.stderr)
    );
    let results: Vec<serde_json::Value> = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(results.len(), inputs.len());
    for ((text, pattern, flags, expected), actual) in cases.iter().zip(&results) {
        let summary = if actual.is_null() {
            serde_json::Value::Null
        } else {
            let captures = actual[0]
                .as_array()
                .expect("JS captures")
                .iter()
                .map(|v| {
                    if v.is_object() {
                        serde_json::Value::Null
                    } else {
                        v.clone()
                    }
                })
                .collect::<Vec<_>>();
            serde_json::json!({"matches":captures,"index":actual[1].as_u64()})
        };
        assert_eq!(
            summary, *expected,
            "JS reference changed: {text:?}, /{pattern}/{flags}"
        );
    }
    for ((text, pattern, flags, expected), actual) in metadata.iter().zip(&results[cases.len()..]) {
        assert_eq!(
            actual, expected,
            "JS metadata changed: {text:?}, /{pattern}/{flags}"
        );
    }
    for ((pattern, flags), actual) in invalid.iter().zip(&results[cases.len() + metadata.len()..]) {
        assert_eq!(
            *actual,
            serde_json::json!({"error":"SyntaxError"}),
            "/{pattern}/{flags}"
        );
    }
    let mut rt = Runtime::new();
    for ((text, pattern, flags), expected) in inputs.iter().zip(&results) {
        let actual = match block_on(builtins::call(
            &mut rt,
            "re_match",
            &[s(text), s(pattern), s(flags)],
        )) {
            Ok(Some(value)) => regex_metadata_snapshot(&rt, &value),
            Err(error) => serde_json::json!({"error":error.kind}),
            Ok(None) => panic!("re_match was not handled"),
        };
        let expected = rt.from_json(expected);
        assert_eq!(
            actual,
            rt.to_json(&expected).unwrap(),
            "Rust/JS mismatch: {text:?}, /{pattern}/{flags}"
        );
    }
}
