use lpe::deparser::{deparse, deparse_with_options};
use lpe::parser::{parse, parse_with_options};
use serde_json::{json, Value};

fn roundtrip(source: &str, options: Value) {
    let ast = parse_with_options(source, &options).unwrap_or_else(|e| panic!("{source}: {e}"));
    let first = deparse_with_options(&ast, &options).unwrap();
    let mut text = first.clone();
    for _ in 0..3 {
        let actual = parse_with_options(&text, &options)
            .unwrap_or_else(|e| panic!("{source} rendered as {text}: {e}"));
        assert_eq!(actual, ast, "{source} rendered as {text}");
        text = deparse_with_options(&actual, &options).unwrap();
        assert_eq!(text, first, "unstable rendering: {source}");
    }
}

#[test]
fn ast_shapes_and_new_syntax() {
    for (source, expected) in [
        ("123", json!(123)),
        ("1+2*3", json!(["+", 1, ["*", 2, 3]])),
        ("1/2/3", json!(["/", ["/", 1, 2], 3])),
        ("a+b+c", json!(["+", "a", "b", "c"])),
        ("(a+b)+c", json!(["+", ["()", ["+", "a", "b"]], "c"])),
        ("x=y=z", json!(["=", "x", ["=", "y", "z"]])),
        ("a and b or c", json!(["and", "a", ["or", "b", "c"]])),
        ("not(a)", json!(["not", ["()", "a"]])),
        ("not()", json!(["not"])),
        ("f(a,not(b))", json!(["f", "a", ["not", "b"]])),
        ("f(a,in)", json!(["f", "a", "in"])),
        ("f(a,in(1,2))", json!(["f", "a", ["in", 1, 2]])),
        ("(,)", json!(["tuple"])),
        ("(1,)", json!(["tuple", 1])),
        ("(1,2)", json!(["tuple", 1, 2])),
        ("()", json!(["()"])),
        ("[1,2]", json!(["[", 1, 2])),
        ("{1;2}", json!(["vector", 1, 2])),
        ("{=}", json!(["hash"])),
        ("{a=1,b=2}", json!(["vector", ["=", "a", 1], ["=", "b", 2]])),
        (
            "f(,1,)",
            json!(["f", {"$lpe":"undefined"}, 1, {"$lpe":"undefined"}]),
        ),
        (
            "VAR x := 1; VAR y = x+2; RETURN y*3",
            json!([
                "let*",
                ["[", ["[", "x", 1], ["[", "y", ["+", "x", 2]]],
                ["*", "y", 3]
            ]),
        ),
        ("o ~> name", json!(["_get_obj_meth_", "o", ["\"", "name"]])),
        (
            "o ~> name(1)",
            json!(["_call_obj_meth_", "o", ["\"", "name"], 1]),
        ),
        ("o ~> (key)", json!(["_get_obj_meth_", "o", "key"])),
        ("a?b:c", json!(["if", "a", "b", "c"])),
        ("lpe:f(1)", json!(["f", 1])),
        ("\u{26a1}f(1)", json!(["f", 1])),
    ] {
        assert_eq!(parse(source).unwrap(), expected, "{source}");
    }
}

#[test]
fn comments_lines_and_separators() {
    for source in [
        "1 /* mid */ + 2",
        "1 + 2 /* unterminated",
        "1 + -- mid\n2",
        "1 + 2 // tail",
        "1 + 2 -- tail",
    ] {
        assert_eq!(parse(source).unwrap(), json!(["+", 1, 2]));
    }
    assert_eq!(parse("1--2").unwrap(), json!(["-", 1, ["-", 2]]));
    assert_eq!(
        parse("a\n\n.\nb\n. c").unwrap(),
        json!([".", "a", "b", "c"])
    );
    assert_eq!(parse("a\nb;c").unwrap(), json!(["begin", "a", "b", "c"]));
    assert_eq!(
        parse("f(\na;\nb,\nc\n)").unwrap(),
        json!(["f", "a", "b", "c"])
    );
    assert_eq!(parse("[\na,\nb\n]").unwrap(), json!(["[", "a", "b"]));
}

#[test]
fn prefixed_strings_unicode_and_column_literals() {
    for (source, expected) in [
        (r#"D'2020-01-01'"#, json!(["'", "2020-01-01", "D"])),
        (r#"r'\d+\n'"#, json!(["'", "\\d+\\n", "r"])),
        (
            r#"'\t\b\f\u0000\u001f'"#,
            json!(["'", "\t\u{0008}\u{000c}\0\u{001f}"]),
        ),
        (r#"'\uD83D\uDE00'"#, json!(["'", "\u{1f600}"])),
        ("\u{03c6}", json!("\u{03c6}")),
    ] {
        assert_eq!(parse(source).unwrap(), expected, "{source}");
    }
    assert_eq!(
        parse_with_options("Table [Column name]", &json!({"squareBrackets":true})).unwrap(),
        json!(["[]", "Column name", "Table"])
    );
    for source in [
        r#"[a\b]"#,
        "[city name]",
        "Table [Column name]",
        "f([x], [y])",
    ] {
        roundtrip(source, json!({"squareBrackets":true}));
    }
}

#[test]
fn standalone_surrogate_escapes_are_rejected_for_utf8() {
    for unit in 0xd800u16..=0xdfff {
        let source = format!("'\\u{unit:04x}'");
        let error = parse(&source).unwrap_err();
        assert_eq!(error.kind, "SyntaxError");
        assert!(error.message.contains("unpaired surrogate escape"));
    }
    for source in [
        r#"'a\ud800b\udc00c'"#,
        r#""\ud800\"\\\udc00\n""#,
        r#"'\ud800\ud800\udc00\udc00'"#,
        r#"'\udfff\ud800'"#,
        r#"D'\ud800'"#,
        r#"f('\ud800',,"\udc00")"#,
        "'\u{1f600}\\ud800\u{1f600}'",
        r#"o ~> "\ud800""#,
    ] {
        assert_eq!(parse(source).unwrap_err().kind, "SyntaxError");
    }
    assert_eq!(parse(r#"r'\ud800'"#).unwrap(), json!(["'", "\\ud800", "r"]));
    assert_eq!(parse(r#"'\u-000'"#).unwrap(), json!(["'", "\0"]));
    assert!(parse(r#"'\u-123'"#).is_err());
    assert!(parse(r#"'\ud83d\ude00\ud800'"#).is_err());
}

#[test]
fn valid_surrogate_pair_escapes_produce_unicode_strings() {
    for (high, low, expected) in [
        (0xd800u16, 0xdc00u16, '\u{10000}'),
        (0xd83d, 0xde00, '\u{1f600}'),
        (0xdbff, 0xdfff, '\u{10ffff}'),
    ] {
        let source = format!("'\\u{high:04x}\\u{low:04x}'");
        let ast = parse(&source).unwrap();
        assert_eq!(ast, json!(["'", expected.to_string()]));
        assert_eq!(deparse(&ast).unwrap(), format!("'{expected}'"));
        for lint in [false, true] {
            roundtrip(&source, json!({"lint":lint}));
        }
    }
    for source in [
        r#"'a\ud83d\ude00b'"#,
        r#"D'\ud83d\ude00'"#,
        "'\u{1f600}'",
        r#"r'\ud800'"#,
    ] {
        roundtrip(source, json!({}));
    }
}

#[test]
fn string_literals_require_plain_unicode_string_payloads() {
    for payload in [
        json!(null),
        json!([-1]),
        json!([65536]),
        json!([1.5]),
        json!([true]),
        json!({"$lpe":"utf16", "value":[0xd800]}),
        json!({"$lpe":"utf16", "value":[0xd83d,0xde00]}),
    ] {
        for prefix in ["", "r", "D"] {
            let error = deparse(&json!(["'", payload, prefix])).unwrap_err();
            assert_eq!(error.kind, "SyntaxError");
            assert!(error.message.contains("string payload"));
        }
    }
}

#[test]
fn all_operator_roundtrips() {
    let operators = [
        ":", ":=", "<-", "=>", "&&", "and", "\u{2227}", "||", "or", "\u{2228}", "\u{2371}",
        "\u{2372}", "\u{22a3}", "\u{22a2}", "\u{2374}", "in", "is", "~", "=", "\u{2260}", "==",
        "===", "!==", "!=", "<", "<=", "\u{2264}", ">", ">=", "\u{2265}", "<>", "@", "+", "-", "#",
        "*", "/", ".", "..", "->", "->>", "::",
    ];
    for op in operators {
        for source in [
            format!("a {op} b"),
            format!("a {op} b {op} c"),
            format!("(a {op} b) {op} c"),
            format!("a {op} (b {op} c)"),
        ] {
            for lint in [false, true] {
                roundtrip(&source, json!({"lint":lint}));
            }
        }
    }
    for left in [
        ":", ":=", "<-", "=>", "&&", "||", "in", "=", "<", "@", "+", "-", "#", "*", "/", "::",
    ] {
        for right in [
            ":", ":=", "<-", "=>", "&&", "||", "in", "=", "<", "@", "+", "-", "#", "*", "/", "::",
        ] {
            for source in [
                format!("a {left} b {right} c"),
                format!("(a {left} b) {right} c"),
                format!("a {left} (b {right} c)"),
            ] {
                roundtrip(&source, json!({}));
            }
        }
    }
}

#[test]
fn special_forms_calls_and_literals_roundtrip() {
    for source in [
        "begin()",
        "begin(x)",
        "begin(x,y)",
        "begin(,x)",
        "begin(begin(x,y),z)",
        "x := 1; print(x); x+2",
        "a:=b:=c",
        "$value <- promise(1)",
        "f := (x,y) => x+y; f(2,3)",
        "f := () => 1",
        "(x => x*x)(5)",
        "f(1)(2)",
        "fn({x}, return(1))(5)",
        "a ? (b ? c : d) : e",
        "VAR x = 1 RETURN x",
        "VAR x = 1 VAR y = x+2 RETURN y*3",
        "f(VAR x = 1 RETURN x+2)",
        "VAR x=1 RETURN VAR y=x+2 RETURN y",
        "f(,1,)",
        "f(,)",
        "f(1,,3)",
        "f(g(,1),,h(1,))",
        "not a",
        "!a",
        "!!a",
        "not(a)",
        "not((a))",
        "not not a",
        "not(a && b)",
        "not(not(a))",
        "- -a",
        "@@a",
        "@a @ b",
        "a @ @b",
        "@a::T",
        "(@a)(b)",
        "(f)(1)",
        "(a+b)(c)",
        "f()(x)(y)",
        "a.b.c",
        "a.b(1)",
        "(a.b)(1)",
        "(a+b).c",
        "(-a).b",
        "-a.b",
        "a.(b+c)",
        "a.not(b)",
        "a.not(b+c)",
        "a.(b.c)",
        "a -> f(1) -> g(2)",
        "a ->> f(1) ->> g(2)",
        "a ~> b",
        "a ~> b(1)",
        "a ~> (key)",
        "a ~> \"b\"",
        "a ~> b ~> c",
        "a.b ~> c(1)",
        "(a ~> b)(1)",
        "a ~> f(not(a))",
        "f(a,!(a))",
        "f(a,!b)",
        "f(a,!((b)))",
        "and(a,b)::c",
        "a::and(b,c)",
        "not a::b",
        "a::not b",
        "and()",
        "or()",
        "and(a)",
        "and(a,b,c)",
        "and(and(a,b),c)",
        "or(or(a,b),c)",
        "and(or(a,b),c)",
        "or(and(a,b),c)",
        "and(a,or(b,c))",
        "or(a,and(b,c))",
        "and(not a,b)",
        "or(not(a),b)",
        "and(a:=b,c)",
        "or(a,b:c)",
        "car(a=>b,c)",
        "nor(a<-b,c)",
        "or(a,not + b)",
        "or(a,in)",
        "and(a,is)",
        "begin(1,not)",
        "begin(1,in)",
        "begin(1,is)",
        "begin(1,not(1,2))",
        "begin(1,not+b)",
        "null",
        "true",
        "false",
        "undefined",
        "0",
        "-0",
        "1.25",
        "1e21",
        "1e-7",
        "2e-324",
        "0e-1000",
        "1.7976931348623157e308",
        "5e-324",
        "{}",
        "{=}",
        "{a=1,b=2}",
        "{a={b=3}}",
        "[1,2,[3]]",
        "(,)",
        "(1,)",
        "(1,2)",
        "()",
        r#"'\t\b\f\n\r\u0000\u001f'"#,
        r#"'a\\b'"#,
        r#"'a\'b'"#,
        r#""a\"b""#,
        r#"r'\d+'"#,
        r#"r'\'"#,
        r#"D'\t'"#,
    ] {
        for lint in [false, true] {
            roundtrip(source, json!({"lint":lint}));
        }
    }
    for name in ["in", "is"] {
        for args in ["", "1", "1,2", "1,2,3"] {
            for tail in ["", "=x", ".x", "(x)", " + x", "::x"] {
                roundtrip(&format!("f(a,{name}({args}){tail})"), json!({}));
            }
        }
    }
}

#[test]
fn exact_rendering_and_lint() {
    for (ast, text) in [
        (json!(["-", 1]), "-1"),
        (json!(["*", ["+", "x", "y"], "z"]), "(x + y) * z"),
        (json!(["or", ["+", "x", "y"], "z"]), "x + y || z"),
        (json!([".", 1, "x"]), "1 .x"),
        (json!(["f", {"$lpe":"undefined"}, 1]), "f(, 1)"),
        (json!(1e21), "1e+21"),
        (json!(1e-7), "1e-7"),
        (json!(1e-6), "0.000001"),
    ] {
        assert_eq!(deparse(&ast).unwrap(), text);
    }
    assert_eq!(
        deparse_with_options(
            &parse("VAR x=1 VAR y=2 RETURN x+y").unwrap(),
            &json!({"lint":true})
        )
        .unwrap(),
        "VAR x = 1\nVAR y = 2\nRETURN x + y"
    );
    let source = format!("f('{}', r'\\d+',, '\\t')", "a".repeat(125));
    roundtrip(&source, json!({"lint":true}));
    assert!(
        deparse_with_options(&parse(&source).unwrap(), &json!({"lint":true}))
            .unwrap()
            .contains('\n')
    );
}

#[test]
fn errors_are_controlled() {
    for source in [
        "",
        "// comment",
        "a b",
        "a()b()",
        "1e",
        "1e+",
        "1e999",
        "123abc",
        "'unterminated",
        "'line\nbreak'",
        "f(",
        "a +",
        "[1,]",
        "{1,}",
        "(,,)",
        "RETURN x",
        "VAR x=1",
        "VAR =1 RETURN x",
        "VAR x 1 RETURN x",
        "x ? (1,2)",
        "x ~> 5",
        "x ~> f()()",
        "a % b",
        "a ** b",
        "a << b",
        "?",
    ] {
        let error = parse(source).unwrap_err();
        assert_eq!(error.kind, "SyntaxError", "{source}: {error}");
    }
}

#[test]
fn resource_limits_and_long_flat_chains() {
    let sum = (0..3000)
        .map(|i| format!("sum(a{i})"))
        .collect::<Vec<_>>()
        .join(" + ");
    let ast = parse(&sum).unwrap();
    assert_eq!(ast.as_array().unwrap().len(), 3001);
    assert_eq!(ast[3000], json!(["sum", "a2999"]));
    for source in [
        "(".repeat(5000),
        "- ".repeat(5000),
        "x=".repeat(5000),
        "x-".repeat(5000) + "x",
        "x()".to_string() + &"()".repeat(5000),
        "a".repeat(1_048_577),
    ] {
        assert_eq!(parse(&source).unwrap_err().kind, "SyntaxError");
    }
    let mut deep = json!("x");
    for _ in 0..120 {
        deep = json!(["f", deep]);
    }
    assert_eq!(deparse(&deep).unwrap_err().kind, "SyntaxError");
    assert_eq!(deparse(&json!(["'", 123])).unwrap_err().kind, "SyntaxError");
}

/// Uses only the checked-out JS reference, not an installed package or a JS runtime in the library.
#[test]
#[ignore = "optional differential verification requires Node.js and the checked-out JS test corpus"]
fn reference_js_corpus() {
    let script = r#"
const fs = require('fs');
const vm = require('vm');
const strip = path => fs.readFileSync(path, 'utf8').replace(/^import .*;\s*$/gm, '').replace(/^export default .*;\s*$/gm, '').replace(/^export \{.*\};\s*$/gm, '').replace(/export function /g, 'function ');
const lex = new Function(strip('src/lpel.js') + ';return {tokenize,makeError,LPESyntaxError}')();
const parse = new Function('tokenize','makeError','LPESyntaxError','isArray','isHash','console', strip('src/lpep.js') + ';return parse')(
  lex.tokenize, lex.makeError, lex.LPESyntaxError, Array.isArray, x => x !== null && typeof x === 'object' && !Array.isArray(x), {error(){}});
const deparse = new Function(strip('src/lped.js') + ';return deparse')();
const rows = new Map();
const tagged = x => JSON.parse(JSON.stringify(x, (k,v) => v === undefined ? {$lpe:'undefined'} : v));
const record = (source, options = {}) => {
  const ast = parse(source, options);
  rows.set(JSON.stringify([source,options]), {source,options,ast:tagged(ast),compact:deparse(ast,{...options,lint:false}),linted:deparse(ast,{...options,lint:true})});
  return ast;
};
const lpe = {parse:record,deparse};
const invoke = (name, fn) => fn.call({timeout(){}});
for (const file of ['test-deparse-forms-roundtrip.js','test-deparse-literals-roundtrip.js','test-deparse-operators-roundtrip.js']) {
  vm.runInNewContext(fs.readFileSync('test/'+file,'utf8'), {require:id => id === '../dist/lpe' ? lpe : require(id),describe:invoke,it:invoke,console}, {filename:file});
}
for (const source of ['a\n.\nb','1--2','1 + -- comment\n2','/* comment */ x', '1 + 2 /* unfinished', 'f(a;b,c)', 'VAR x := 1; VAR y = 2; RETURN x+y', 'lpe:f(1)', '\u26a1f(1)', "'\\uD83D\\uDE00'"]) record(source);
for (const source of ['[x]', 'Table [Column name]', 'f(Table[x], [y])']) record(source,{squareBrackets:true});
for (const source of ["'\\u0x41'", "'\\u+123'", "'\\u 123'", "'\\u-000'", "'\\u1z34'"]) record(source);
for (const source of ['1000000000000000100', '9007199254740993', '999999999999999999999', '1.0000000000000002', '2.2250738585072014e-308']) record(source);
for (const source of ["'\\ud800\\udc00'", "'\\udbff\\udfff'", "r'\\ud800'", "'a\\ud83d\\ude00b'", "D'\\ud83d\\ude00'"]) record(source);
let seed = 0x51e;
const choose = list => list[(seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) % list.length];
const atom = () => choose(['x','y','foo','$x','1','0.125','true','false','null','and','or','not','in','is',"'text'","r'\\d+'",'()','(,)','{=}','[1,2]']);
const expr = depth => {
  if (!depth) return atom();
  switch (choose([0,1,2,3,4,5,6,7,8])) {
    case 0: return atom();
    case 1: return choose(['+','- ','!','not ','#','@','.']) + expr(depth-1);
    case 2: return '(' + expr(depth-1) + ')';
    case 3: return expr(depth-1) + ' ' + choose(['+','-','*','/','=','and','or','in','is',':',':=','=>','::','~>','.','->','&&','||','@','?']) + ' ' + expr(depth-1);
    case 4: return choose(['f','and','or','not','in','is']) + '(' + expr(depth-1) + choose([',',';',',,']) + expr(depth-1) + ')';
    case 5: return '{' + expr(depth-1) + choose([',',';']) + expr(depth-1) + '}';
    case 6: return 'VAR x = ' + expr(depth-1) + ' RETURN ' + expr(depth-1);
    case 7: return expr(depth-1) + choose([';','\n','\n.\n',' /*x*/ + ']) + expr(depth-1);
    case 8: return expr(depth-1) + '(' + expr(depth-1) + ')';
  }
};
for (let i=0; i<3000; i++) {
  const source = expr(3);
  try { record(source); }
  catch(e) { rows.set(JSON.stringify([source,{}]), {source,options:{},error:true}); }
}
process.stdout.write(JSON.stringify([...rows.values()]));
"#;
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    let output = std::process::Command::new(
        std::env::var("LPE_REFERENCE_NODE").unwrap_or_else(|_| "node".into()),
    )
    .args(["-e", script])
    .current_dir(root)
    .output()
    .expect("Node.js is required for this opt-in test");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let rows: Vec<Value> = serde_json::from_slice(&output.stdout).unwrap();
    eprintln!("Comparing {} JS parser/deparser fixtures", rows.len());
    for row in &rows {
        let source = row["source"].as_str().unwrap();
        if row["error"] == true {
            assert!(
                parse_with_options(source, &row["options"]).is_err(),
                "JS rejects source accepted by Rust: {source}"
            );
            continue;
        }
        let ast =
            parse_with_options(source, &row["options"]).unwrap_or_else(|e| panic!("{source}: {e}"));
        assert_eq!(ast, row["ast"], "JS AST differs for {source}");
        for (lint, key) in [(false, "compact"), (true, "linted")] {
            let actual = deparse_with_options(&ast, &json!({"lint":lint})).unwrap();
            assert_eq!(
                actual,
                row[key].as_str().unwrap(),
                "JS rendering differs for {source}; lint={lint}"
            );
        }
    }
}

/// Capture explicit calls and evaluation source inputs while the unmodified JS suite runs.
#[test]
#[ignore = "requires Node.js, npm ci, and npm run build at the repository root"]
fn reference_js_full_suite() {
    let script = r#"
const fs = require('fs');
const path = require('path');
const Module = require('module');
const Mocha = require('mocha');
const rows = new Map();
const counts = {parse:0,deparse:0,evalSources:0};
const tag = value => JSON.parse(JSON.stringify(value, (key,v) => v === undefined ? {$lpe:'undefined'} : v));
const capture = (op, fn, input, options) => {
  counts[op]++;
  const row = {op,input:tag(input),options:tag(options || {})};
  try {
    const result = fn(input, options);
    row.result = tag(result);
    rows.set(JSON.stringify([op,row.input,row.options]),row);
    return result;
  } catch(error) {
    row.error = error.name;
    rows.set(JSON.stringify([op,row.input,row.options]),row);
    throw error;
  }
};
const wrapped = new WeakMap();
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  const exports = originalLoad.apply(this,arguments);
  if (!/dist[/\\]lpe(?:\.nodoc)?(?:\.js)?$/.test(request)) return exports;
  if (wrapped.has(exports)) return wrapped.get(exports);
  const methods = {
    parse:(source,options) => capture('parse',exports.parse,source,options),
    deparse:(ast,options) => capture('deparse',exports.deparse,ast,options),
    eval_lpe:(source,context,options) => {
      if (typeof source === 'string') {
        counts.evalSources++;
        try { capture('parse',exports.parse,source,options); } catch (_) {}
      }
      return exports.eval_lpe(source,context,options);
    },
  };
  const proxy = new Proxy(exports,{get:(target,key,receiver) => methods[key] || Reflect.get(target,key,receiver)});
  wrapped.set(exports,proxy);
  return proxy;
};
console.log = console.error = console.warn = () => {};
const failures = [];
let stats;
const mocha = new Mocha({timeout:20000,reporter:function(runner) {
  runner.on('fail',(test,error) => failures.push({title:test.fullTitle(),message:error.message}));
  runner.on('end',() => {stats = runner.stats});
}});
for (const file of fs.readdirSync('test').filter(f => /^test.*\.js$/.test(f)).sort()) mocha.addFile(path.resolve('test',file));
mocha.run(function(failed) {
  process.stdout.write(JSON.stringify({counts,stats,failures,rows:[...rows.values()]}));
  process.exitCode = failed ? 1 : 0;
});
"#;
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    let output = std::process::Command::new(
        std::env::var("LPE_REFERENCE_NODE").unwrap_or_else(|_| "node".into()),
    )
    .args(["-e", script])
    .current_dir(root)
    .output()
    .expect("Node.js is required for this opt-in test");
    let captured: Value = serde_json::from_slice(&output.stdout).unwrap_or_else(|e| {
        panic!(
            "Invalid reference output: {e}\n{}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        )
    });
    assert!(
        output.status.success(),
        "JS suite failures: {}\n{}",
        captured["failures"],
        String::from_utf8_lossy(&output.stderr)
    );
    let rows = captured["rows"].as_array().unwrap();
    eprintln!(
        "Full JS suite: {}; {} unique parse/deparse cases; calls {}",
        captured["stats"],
        rows.len(),
        captured["counts"]
    );
    for row in rows {
        let actual = if row["op"] == "parse" {
            parse_with_options(
                row["input"].as_str().expect("parse source is a string"),
                &row["options"],
            )
        } else {
            deparse_with_options(&row["input"], &row["options"]).map(Value::String)
        };
        if row.get("error").is_some() {
            assert!(actual.is_err(), "JS rejected input accepted by Rust: {row}");
        } else {
            assert_eq!(
                actual.unwrap_or_else(|e| panic!("{row}: {e}")),
                row["result"],
                "JS differs: {row}"
            );
        }
    }
}
