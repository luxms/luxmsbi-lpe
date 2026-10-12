use lpe::{parse, Error, EvalOptions, Runtime, Value};

fn main() -> lpe::Result<()> {
    let mut runtime = Runtime::new();
    runtime.set_global("input", Value::Number(41.0));
    runtime.register("increment", |args| match args.first() {
        Some(Value::Number(number)) => Ok(Value::Number(number + 1.0)),
        _ => Err(Error::new("TypeError", "increment expects a number")),
    });
    let ast = parse("mul(increment(input), 2)")?;
    let result = runtime.eval_ast(&ast, &EvalOptions::default())?;
    assert_eq!(result, Value::Number(84.0));
    println!("{}", runtime.to_json(&result)?);

    runtime.register_async("later", |args| {
        Box::pin(async move { Ok(args.first().cloned().unwrap_or(Value::Undefined)) })
    });
    let ast = parse("later(42)")?;
    let result = futures::executor::block_on(runtime.eval_async(&ast, &EvalOptions::default()))?;
    assert_eq!(result, Value::Number(42.0));

    let input = runtime.create_stream(Value::Number(21.0));
    runtime.set_global("liveInput", input.clone());
    let derived = runtime.eval("liveInput * 2")?;
    assert_eq!(runtime.stream_value(&derived)?, Value::Number(42.0));
    runtime.stream_next(&input, Value::Number(30.0))?;
    assert_eq!(runtime.stream_value(&derived)?, Value::Number(60.0));

    // Stream payloads preserve Promises; only the host explicitly awaits them.
    let mixed = runtime.eval("later(liveInput)")?;
    let payload = runtime.stream_value(&mixed)?;
    assert!(matches!(payload, Value::Promise(_)));
    assert_eq!(
        futures::executor::block_on(runtime.resolve_value(payload))?,
        Value::Number(30.0)
    );
    runtime.stream_release(&mixed)?;
    runtime.stream_release(&derived)?;
    assert_eq!(runtime.stream_stats(&input)?.references, 1);
    runtime.stream_release(&input)?;

    // Values kept by the host must be passed as roots at collection boundaries.
    runtime.collect_garbage(&[result]);
    Ok(())
}
