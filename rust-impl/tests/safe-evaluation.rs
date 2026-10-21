use lpe::{Error, EvalOptions, Runtime};
use serde_json::Value as Json;

#[test]
fn safe_language_contract_matches_with_immediate_and_full_evaluation() {
    let cases: Vec<Json> =
        serde_json::from_str(include_str!("../fixtures/release180.cases.json")).unwrap();
    for case in cases {
        for full in [false, true] {
            let mut rt = Runtime::new();
            rt.set_context(&case["request"]["context"]).unwrap();
            if full {
                rt.set_lookup_hook(rt.global_env(), |_, _| Ok(None))
                    .unwrap();
            }
            let result = rt.eval_with_options(
                case["request"]["source"].as_str().unwrap(),
                &EvalOptions::default(),
            );
            if case["expected"]["ok"] == true {
                let value =
                    result.unwrap_or_else(|error| panic!("{} full={full}: {error}", case["id"]));
                // JSON numbers from arithmetic may have floating-point representation.
                let actual = rt.to_json(&value).unwrap();
                let expected = rt.from_json(&case["expected"]["value"]);
                assert_eq!(
                    actual,
                    rt.to_json(&expected).unwrap(),
                    "{} full={full}",
                    case["id"]
                );
            } else {
                let Error { kind, .. } = result.unwrap_err();
                assert_eq!(
                    kind, case["expected"]["error"]["kind"],
                    "{} full={full}",
                    case["id"]
                );
            }
        }
    }
}
