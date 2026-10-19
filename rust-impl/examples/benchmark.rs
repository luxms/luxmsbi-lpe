use lpe::{parse, EvalOptions, Runtime};
use serde_json::{json, Value};
use std::hint::black_box;
use std::time::Instant;

fn equivalent(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| equivalent(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(k, a)| b.get(k).is_some_and(|b| equivalent(a, b)))
        }
        _ => a == b,
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let iterations = args
        .get(1)
        .map(|v| v.parse::<u32>())
        .transpose()?
        .unwrap_or(10_000);
    let name = args.get(2).map(String::as_str).unwrap_or("arithmetic");
    let warmup = args
        .get(3)
        .map(|v| v.parse::<u32>())
        .transpose()?
        .unwrap_or(iterations.min(10_000));
    if !(1..=1_000_000).contains(&iterations) || warmup > 1_000_000 {
        return Err("iterations must be 1..1000000 and warmup 0..1000000".into());
    }
    let cases: Vec<Value> =
        serde_json::from_str(include_str!("../fixtures/benchmark-inputs.json"))?;
    let case = cases
        .iter()
        .find(|c| c["id"] == name)
        .ok_or("unknown benchmark case")?;
    let source = if let Some(file) = case["sourceFile"].as_str() {
        std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("fixtures")
                .join(file),
        )?
    } else {
        case["source"].as_str().unwrap().to_owned()
    };
    let ast = parse(&source)?;
    let parse_only = case["parseOnly"] == true;
    let mut runtime = Runtime::new();
    let options = EvalOptions::default();
    if !parse_only {
        runtime.set_context(&case["context"])?;
        let value = runtime.eval_ast(&ast, &options)?;
        assert!(
            equivalent(&runtime.to_json(&value)?, &case["expected"]),
            "result mismatch for {name}"
        );
    }
    for i in 0..warmup {
        black_box(parse(black_box(&source))?);
        if !parse_only {
            black_box(runtime.eval_ast(black_box(&ast), &options)?);
            if i % 256 == 255 {
                runtime.collect_garbage(&[]);
            }
        }
    }
    runtime.collect_garbage(&[]);
    let start = Instant::now();
    for _ in 0..iterations {
        black_box(parse(black_box(&source))?);
    }
    let parse_seconds = start.elapsed().as_secs_f64();
    let mut report = json!({"case":name,"iterations":iterations,"warmup":warmup,
        "parseSeconds":parse_seconds,"parsePerSecond":iterations as f64 / parse_seconds});
    if !parse_only {
        let start = Instant::now();
        for i in 0..iterations {
            black_box(runtime.eval_ast(black_box(&ast), &options)?);
            // Runtime collection is explicit. Include sustained-workload collection
            // in the measurement instead of letting arenas grow without bound.
            if i % 256 == 255 {
                runtime.collect_garbage(&[]);
            }
        }
        runtime.collect_garbage(&[]);
        let eval_seconds = start.elapsed().as_secs_f64();
        let value = runtime.eval_ast(&ast, &options)?;
        assert!(
            equivalent(&runtime.to_json(&value)?, &case["expected"]),
            "result mismatch for {name}"
        );
        report["value"] = runtime.to_json(&value)?;
        report["evalSeconds"] = json!(eval_seconds);
        report["evalPerSecond"] = json!(iterations as f64 / eval_seconds);
    }
    println!("{report}");
    Ok(())
}
