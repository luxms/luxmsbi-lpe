use lpe::deparser::deparse_with_options;
use lpe::parser::{parse, parse_with_options};
use lpe::{EvalOptions, Runtime};
use serde_json::{json, Value};
use std::collections::BTreeMap;

const SOURCE: &str = include_str!("../fixtures/production/layout.lpe");
const CASES: &str = include_str!("../fixtures/production-layout.cases.json");

#[test]
fn production_layout_preserves_structure_and_widget_order() {
    fn visit(
        node: &Value,
        calls: &mut BTreeMap<String, usize>,
        widgets: &mut Vec<Value>,
        tabs: &mut Vec<Value>,
    ) {
        let Some(args) = node.as_array() else {
            return;
        };
        let name = args[0].as_str().unwrap();
        *calls.entry(name.into()).or_default() += 1;
        if name == "#" {
            widgets.push(args[1].clone());
        }
        if name == "." && node[2][0] == "mapIt" {
            let click = node[2][1]
                .as_array()
                .unwrap()
                .iter()
                .find(|arg| arg[0] == "=" && arg[1] == "onClick")
                .unwrap();
            tabs.push(json!([node[1], click[2][1][1]]));
        }
        for arg in &args[1..] {
            visit(arg, calls, widgets, tabs);
        }
    }

    assert!(SOURCE.starts_with("lpe:vbox("));
    let ast = parse(SOURCE).unwrap();
    let mut calls = BTreeMap::new();
    let mut widgets = Vec::new();
    let mut tabs = Vec::new();
    visit(&ast, &mut calls, &mut widgets, &mut tabs);
    let expected: Value =
        serde_json::from_str(include_str!("../fixtures/production/layout-structure.json")).unwrap();
    assert_eq!(
        json!({"root": ast[0], "calls": calls, "widgets": widgets, "tabs": tabs}),
        expected
    );
}

#[test]
fn production_layout_roundtrips_with_both_line_endings_and_formatting_modes() {
    let expected = parse(SOURCE).unwrap();
    let cases: Vec<Value> = serde_json::from_str(CASES).unwrap();
    let mut count = 0;
    for fixture in cases.iter().filter(|case| case["kind"] == "roundtrip") {
        count += 1;
        let id = fixture["id"].as_str().unwrap();
        let request = &fixture["request"];
        let source = request["source"].as_str().unwrap();
        assert_eq!(source.replace("\r\n", "\n"), SOURCE, "{id}");
        let options = &request["options"];
        let mut ast = parse_with_options(source, options).unwrap();
        assert_eq!(ast, expected, "{id}");
        let mut first = None;
        for _ in 0..3 {
            let rendered = deparse_with_options(&ast, options).unwrap();
            if let Some(ref previous) = first {
                assert_eq!(&rendered, previous, "{id}");
            }
            ast = parse_with_options(&rendered, options).unwrap();
            assert_eq!(ast, expected, "{id}");
            first = Some(rendered);
        }
    }
    assert_eq!(count, 4);
}

#[test]
fn production_layout_titles_and_conditional_colors_evaluate_without_ui_hosts() {
    let cases: Vec<Value> = serde_json::from_str(CASES).unwrap();
    let mut count = 0;
    for fixture in cases.iter().filter(|case| case["kind"] != "roundtrip") {
        count += 1;
        let id = fixture["id"].as_str().unwrap();
        let request = &fixture["request"];
        let mut runtime = Runtime::new();
        runtime.set_context(&request["context"]).unwrap();
        let result = match request["op"].as_str().unwrap() {
            "eval" => runtime.eval(request["source"].as_str().unwrap()),
            "evalAst" => runtime.eval_ast(&request["ast"], &EvalOptions::default()),
            op => panic!("Unexpected operation: {op}"),
        }
        .unwrap_or_else(|error| panic!("{id}: {error}"));
        assert_eq!(
            runtime.to_json(&result).unwrap(),
            fixture["expected"]["value"],
            "{id}"
        );
    }
    assert_eq!(count, 126);
}
