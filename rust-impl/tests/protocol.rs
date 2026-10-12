use serde_json::{json, Value};
use std::io::Write;
use std::process::{Command, Stdio};

fn requests(input: &[u8]) -> Vec<Value> {
    let mut child = Command::new(env!("CARGO_BIN_EXE_lpe"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut stdin = child.stdin.take().unwrap();
    stdin.write_all(input).unwrap();
    drop(stdin);
    let output = child.wait_with_output().unwrap();
    assert!(output.status.success(), "{:?}", output);
    assert!(output.stderr.is_empty(), "{:?}", output.stderr);
    String::from_utf8(output.stdout)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect()
}

#[test]
fn invalid_request_does_not_corrupt_the_next_request() {
    let results = requests(b"not json\n[]\n{\"op\":\"eval\",\"source\":\"add(20,22)\"}\n");
    assert_eq!(results.len(), 3);
    for result in &results[..2] {
        assert_eq!(result["ok"], false);
        assert_eq!(result["error"]["kind"], "ProtocolError");
    }
    assert_eq!(results[2]["ok"], true);
    assert_eq!(results[2]["value"].as_f64(), Some(42.0));
}

#[test]
fn utf8_is_the_only_text_encoding() {
    let text = "\u{41f}\u{440}\u{438}\u{432}\u{435}\u{442}, \u{1f600}";
    let request = json!({"op":"eval", "source":format!("\"{text}\"")});
    let results = requests(format!("{request}\n").as_bytes());
    assert_eq!(results, vec![json!({"ok":true,"value":text})]);

    let results = requests(b"{\"source\":\"\xff\"}\n{\"source\":\"1\"}\n");
    assert_eq!(results[0]["error"]["kind"], "ProtocolError");
    assert_eq!(results[1]["ok"], true);
}

#[test]
fn unknown_operations_and_fixtures_fail_explicitly() {
    let results = requests(b"{\"op\":\"missing\"}\n{\"hostFixtures\":[\"missing\"]}\n");
    assert_eq!(results.len(), 2);
    for result in results {
        assert_eq!(result["ok"], false);
        assert_eq!(result["error"]["kind"], "ProtocolError");
    }
}

#[test]
fn documentation_apis_are_not_exposed_by_rust() {
    let scope: Value = serde_json::from_str(include_str!("../fixtures/scope.json")).unwrap();
    let apis = scope["v8OnlyApis"].as_array().unwrap();
    let mut input = String::new();
    for name in apis {
        input.push_str(&format!("{}\n", json!({"op":"api","name":name})));
    }
    input.push_str("{\"op\":\"eval\",\"source\":\"add(20,22)\"}\n");
    let results = requests(input.as_bytes());
    assert_eq!(results.len(), apis.len() + 1);
    for (name, result) in apis.iter().zip(&results) {
        assert_eq!(result["ok"], false, "{name}");
        assert_eq!(result["error"]["kind"], "ProtocolError", "{name}");
    }
    assert_eq!(results.last().unwrap()["value"].as_f64(), Some(42.0));
}

#[test]
fn requests_have_isolated_contexts_and_preserve_explicit_options() {
    let results = requests(
        b"{\"source\":\"counter()\",\"hostFixtures\":[\"counter\"]}\n\
          {\"source\":\"counter()\",\"hostFixtures\":[\"counter\"]}\n\
          {\"source\":\"missing\"}\n\
          {\"source\":\"missing\",\"options\":{}}\n",
    );
    assert_eq!(results.len(), 4);
    assert_eq!(results[0]["value"].as_f64(), Some(1.0));
    assert_eq!(results[1]["value"].as_f64(), Some(1.0));
    assert_eq!(results[2]["value"], "missing");
    assert_eq!(results[3]["value"], json!({"$lpe":"undefined"}));
}

#[test]
fn oversized_input_is_bounded_before_json_parsing() {
    let input = vec![b' '; 4 * 1024 * 1024 + 1];
    let results = requests(&input);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0]["ok"], false);
    assert_eq!(results[0]["error"]["kind"], "LimitError");
}

#[test]
fn invalid_tags_and_non_utf8_results_are_not_silently_serialized() {
    let mut input = String::new();
    for tag in [
        json!({"$lpe":"utf16","value":[55296]}),
        json!({"$lpe":"function"}),
        json!({"$lpe":"number","value":"invalid"}),
    ] {
        input.push_str(&format!("{}\n", json!({"op":"evalAst","ast":tag})));
    }
    input.push_str(&format!("{}\n", json!({"source":"first(\"\u{1f600}\")"})));
    let results = requests(input.as_bytes());
    assert_eq!(results.len(), 4);
    for result in &results {
        assert_eq!(result["ok"], false, "{result}");
    }
    assert_eq!(results[3]["error"]["kind"], "UnsupportedEncoding");
}

#[test]
fn named_array_properties_cannot_disappear_at_the_wire_boundary() {
    let results = requests(b"{\"source\":\"re_match(\\\"abc\\\",\\\"b\\\")\"}\n");
    assert_eq!(results.len(), 1);
    assert_eq!(results[0]["ok"], false);
    assert!(results[0]["error"]["message"]
        .as_str()
        .unwrap()
        .contains("Named array properties"));
}
