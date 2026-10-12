use lpe::parser::{parse_with_diagnostics, parse_with_options};
use serde_json::{json, Value};

#[test]
fn opt_in_diagnostics_preserve_parse_results_and_ordinary_errors() {
    for (source, options) in [
        ("1 + 2 * 3", Value::Null),
        ("[month]", json!({"squareBrackets": true})),
        ("where(a and not b)", json!({})),
    ] {
        assert_eq!(
            parse_with_diagnostics(source, &options).unwrap(),
            parse_with_options(source, &options).unwrap()
        );
    }
    for source in ["a()b()", "x ? (1, 2)", "f(", "'unterminated"] {
        let ordinary = parse_with_options(source, &Value::Null).unwrap_err();
        let detailed = parse_with_diagnostics(source, &Value::Null).unwrap_err();
        assert_eq!(detailed.error.kind, ordinary.kind, "{source}");
        assert_eq!(detailed.error.message, ordinary.message, "{source}");
        assert_eq!(detailed.to_string(), ordinary.to_string());
    }
}

#[test]
fn token_carets_preserve_js_code_unit_spans_and_newline_rendering() {
    for (source, from, to, caret) in [
        ("a()b()", 3, 4, "---^--"),
        ("\"\u{1f600}\" x", 5, 6, "-----^"),
        ("a()\nb()c()", 7, 8, "--------^--"),
    ] {
        let failure = parse_with_diagnostics(source, &Value::Null).unwrap_err();
        let diagnostic = failure.diagnostic.unwrap();
        assert_eq!(diagnostic["src"], source);
        assert_eq!(diagnostic["from"], from);
        assert_eq!(diagnostic["to"], to);
        assert_eq!(diagnostic["crs"], caret);
    }
}

#[test]
fn invalid_ternary_points_to_group_and_its_direct_children() {
    let failure = parse_with_diagnostics("x ? (1, 2)", &Value::Null).unwrap_err();
    let diagnostic = failure.diagnostic.unwrap();
    assert_eq!(diagnostic["crs"], "----^-----");
    assert_eq!(diagnostic["from"], 4);
    assert_eq!(diagnostic["to"], 5);
    assert_eq!(diagnostic["first"].as_array().unwrap().len(), 2);
    assert_eq!(diagnostic["first"][0]["crs"], "-----^----");
    assert_eq!(diagnostic["first"][1]["crs"], "--------^-");
    assert_eq!(diagnostic["first"][0]["value"], 1);
    assert_eq!(diagnostic["first"][1]["value"], 2);
}

#[test]
fn end_of_input_and_lexer_errors_do_not_invent_token_locations() {
    let failure = parse_with_diagnostics("f(", &Value::Null).unwrap_err();
    let diagnostic = failure.diagnostic.unwrap();
    assert_eq!(diagnostic["value"], "(end)");
    for key in ["src", "crs", "from", "to"] {
        assert!(diagnostic.get(key).is_none(), "{key}");
    }
    let failure = parse_with_diagnostics("'unterminated", &Value::Null).unwrap_err();
    assert_eq!(failure.error.kind, "SyntaxError");
    assert!(failure.diagnostic.is_none());
}

#[test]
fn diagnostic_mode_preserves_depth_and_source_limits() {
    let deep = format!("{}1{}", "(".repeat(512), ")".repeat(512));
    let long = "x".repeat(1_048_577);
    for source in [deep, long] {
        let ordinary = parse_with_options(&source, &Value::Null).unwrap_err();
        let detailed = parse_with_diagnostics(&source, &Value::Null).unwrap_err();
        assert_eq!(detailed.error.kind, ordinary.kind);
        assert_eq!(detailed.error.message, ordinary.message);
    }
}
