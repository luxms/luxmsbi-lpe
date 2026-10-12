use lpe::{parse, EvalOptions, Runtime, Value};
use serde_json::json;
use std::hint::black_box;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let iterations = std::env::args()
        .nth(1)
        .map(|value| value.parse::<u32>())
        .transpose()?
        .unwrap_or(10_000);
    if !(1..=1_000_000).contains(&iterations) {
        return Err("iterations must be between 1 and 1000000".into());
    }
    let source = "add(mul(3,7),div(8,2))";
    let ast = parse(source)?;
    let mut runtime = Runtime::new();
    let options = EvalOptions::default();
    assert_eq!(runtime.eval_ast(&ast, &options)?, Value::Number(25.0));

    let start = Instant::now();
    for _ in 0..iterations {
        black_box(parse(black_box(source))?);
    }
    let parse_seconds = start.elapsed().as_secs_f64();
    let start = Instant::now();
    for _ in 0..iterations {
        black_box(runtime.eval_ast(black_box(&ast), &options)?);
    }
    let eval_seconds = start.elapsed().as_secs_f64();
    runtime.collect_garbage(&[]);
    println!(
        "{}",
        json!({"iterations":iterations,"source":source,
            "parseSeconds":parse_seconds,"evalSeconds":eval_seconds,
            "parsePerSecond":iterations as f64 / parse_seconds,
            "evalPerSecond":iterations as f64 / eval_seconds})
    );
    Ok(())
}
