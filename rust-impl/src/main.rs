use lpe::{Error, EvalOptions, Result, Runtime, Value};
use serde_json::{json, Value as Json};
use std::io::{self, BufRead, Write};

fn validate_input(value: &Json) -> Result<()> {
    match value {
        Json::Object(object) => {
            match object.get("$lpe").and_then(Json::as_str) {
                Some("utf16") => {
                    return Err(Error::new(
                        "Error",
                        "Unsupported tag: utf16; protocol is UTF-8 only",
                    ));
                }
                Some("function") => {
                    return Err(Error::new("Error", "Function tags are output-only"));
                }
                Some("number")
                    if !matches!(
                        object.get("value").and_then(Json::as_str),
                        Some("NaN" | "Infinity" | "-Infinity" | "-0")
                    ) =>
                {
                    return Err(Error::new("Error", "Invalid number tag"));
                }
                _ => {}
            }
            for value in object.values() {
                validate_input(value)?;
            }
        }
        Json::Array(array) => {
            for value in array {
                validate_input(value)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn validate_output(
    runtime: &Runtime,
    value: &Value,
    seen: &mut std::collections::HashSet<(u8, usize)>,
    depth: usize,
) -> Result<()> {
    if depth > 256 {
        return Err(Error::new("LimitError", "Serialization depth exceeded"));
    }
    match value {
        Value::Utf16(_) => {
            return Err(Error::new(
                "UnsupportedEncoding",
                "Result is outside the UTF-8 protocol",
            ))
        }
        Value::Promise(_) => {
            return Err(Error::new("Error", "Nested promise is outside tagged JSON"))
        }
        Value::Array(id) if seen.insert((0, *id)) => {
            let values = runtime.array_values(value)?;
            if runtime.keys(value).iter().any(|key| {
                key.parse::<usize>()
                    .ok()
                    .is_none_or(|index| index >= values.len() || index.to_string() != *key)
            }) {
                return Err(Error::new(
                    "Error",
                    "Named array properties are outside tagged JSON",
                ));
            }
            for value in values {
                validate_output(runtime, &value, seen, depth + 1)?;
            }
        }
        Value::Object(id) if seen.insert((1, *id)) => {
            for (_, value) in runtime.object_values(value)? {
                validate_output(runtime, &value, seen, depth + 1)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn encode_output(runtime: &Runtime, value: &Value) -> Result<Json> {
    validate_output(runtime, value, &mut std::collections::HashSet::new(), 0)?;
    runtime.to_json(value)
}

fn calendar_matches(value: &Json, check: &str, date: chrono::NaiveDate) -> Result<bool> {
    use chrono::{Datelike, Duration};
    let day = |offset| {
        (date + Duration::days(offset))
            .format("%Y-%m-%d")
            .to_string()
    };
    Ok(match check {
        "utc-date" => value == &json!(day(0)),
        "utc-year-prefix" => value
            .as_str()
            .is_some_and(|s| s.starts_with(&format!("{}-", date.year()))),
        "utc-week" => {
            let monday = -i64::from(date.weekday().num_days_from_monday());
            value == &json!([day(monday), day(monday + 6)])
        }
        "utc-extend-five" => value == &json!([day(0), day(5)]),
        _ => {
            return Err(Error::new(
                "ProtocolError",
                format!("Unknown calendar check {check}"),
            ))
        }
    })
}

fn register_source_skip(rt: &mut Runtime) -> Result<()> {
    // Contexts are pushed from the STDLIB fallback outward.
    for (label, special, replacement) in [
        ("Ast2", true, None),
        ("Start2", false, None),
        (
            "Ast1",
            true,
            Some(json!(["toStart", ["'", "20250203"], ["'", "w"]])),
        ),
        ("Start1", false, None),
    ] {
        rt.push_context(indexmap::IndexMap::new());
        rt.register_host("__sourceSkipResult", move |rt, args| {
            let value = Value::String(format!(
                "{label} {}",
                rt.to_string(args.first().unwrap_or(&Value::Undefined))
            ));
            Box::pin(async move { Ok(value) })
        });
        let callback = rt.lookup(
            rt.global_env(),
            "__sourceSkipResult",
            &EvalOptions::default(),
            true,
        )?;
        if special {
            rt.register_special("toStart", move |rt, _, _, _| {
                let skip = rt.skip_form(callback.clone(), replacement.clone());
                Box::pin(async move { Ok(skip) })
            });
        } else {
            rt.register_host("toStart", move |rt, _| {
                let skip = rt.skip_form(callback.clone(), None);
                Box::pin(async move { Ok(skip) })
            });
        }
    }
    Ok(())
}

fn validate_vararg_selector(selector: &Json) -> Result<()> {
    let invalid = || Error::new("ProtocolError", "Invalid vararg probe configuration");
    let selector = selector.as_array().ok_or_else(invalid)?;
    let source = selector.first().and_then(Json::as_str).unwrap_or("");
    if matches!(source, "args" | "kwargs" | "trace") {
        return if selector.len() == 1 {
            Ok(())
        } else {
            Err(invalid())
        };
    }
    let key = selector.get(1).unwrap_or(&Json::Null);
    let action = selector.get(2).and_then(Json::as_str).unwrap_or("value");
    if !(2..=4).contains(&selector.len())
        || !(match source {
            "arg" => key.as_u64().is_some_and(|n| n <= 9_007_199_254_740_991),
            "kwarg" => key.is_string(),
            _ => false,
        })
        || selector.get(2).is_some_and(|v| !v.is_string())
        || !matches!(action, "value" | "isFunction" | "call" | "calls")
        || if action == "calls" {
            selector
                .get(3)
                .and_then(Json::as_u64)
                .is_none_or(|n| n > 100)
        } else {
            selector.len() > 3
        }
    {
        return Err(invalid());
    }
    Ok(())
}

async fn select_vararg_value(
    rt: &mut Runtime,
    values: &[Value],
    selector: &Json,
    events: &std::cell::RefCell<Vec<Value>>,
) -> Result<Value> {
    let selector = selector.as_array().unwrap();
    let parameters = values.len() - 2;
    let value = match selector[0].as_str().unwrap() {
        "args" => return Ok(values[parameters].clone()),
        "kwargs" => return Ok(values[parameters + 1].clone()),
        "trace" => return Ok(rt.array(events.borrow().clone())),
        "arg" => selector[1]
            .as_u64()
            .and_then(|n| usize::try_from(n).ok())
            .filter(|n| *n < parameters)
            .and_then(|n| values.get(n))
            .cloned()
            .unwrap_or(Value::Undefined),
        "kwarg" => rt.get(&values[parameters + 1], selector[1].as_str().unwrap()),
        _ => unreachable!(),
    };
    match selector.get(2).and_then(Json::as_str).unwrap_or("value") {
        "isFunction" => {
            rt.call_value(
                Value::Builtin("isFunction".into()),
                vec![value],
                rt.global_env(),
            )
            .await
        }
        "call" => rt.call_value(value, vec![], rt.global_env()).await,
        "calls" => {
            let mut results = Vec::new();
            for _ in 0..selector[3].as_u64().unwrap() {
                results.push(
                    rt.call_value(value.clone(), vec![], rt.global_env())
                        .await?,
                );
            }
            Ok(rt.array(results))
        }
        _ => Ok(value),
    }
}

fn register_vararg_probe(rt: &mut Runtime, config: &Json) -> Result<()> {
    use std::{
        cell::{Cell, RefCell},
        rc::Rc,
    };
    let invalid = || Error::new("ProtocolError", "Invalid vararg probe configuration");
    let result = config.get("result").ok_or_else(invalid)?.clone();
    if result.is_array() {
        validate_vararg_selector(&result)?;
    } else if let Some(fields) = result.as_object() {
        for selector in fields.values() {
            validate_vararg_selector(selector)?;
        }
    } else {
        return Err(invalid());
    }
    let template = config
        .get("template")
        .and_then(Json::as_array)
        .ok_or_else(|| Error::new("Error", "LPE vararg template must be array"))?
        .clone();
    let events = Rc::new(RefCell::new(Vec::new()));
    let trace = events.clone();
    rt.register("track", move |args| {
        let value = args.first().cloned().unwrap_or(Value::Undefined);
        trace.borrow_mut().push(value.clone());
        Ok(value)
    });
    let counter = Rc::new(Cell::new(0_u32));
    for name in ["counter", "inc"] {
        let counter = counter.clone();
        rt.register(name, move |_| {
            counter.set(counter.get() + 1);
            Ok(Value::Number(counter.get() as f64))
        });
    }
    rt.register("probeFail", |_| {
        Err(Error::new("Error", "vararg probe failure"))
    });
    rt.register_vararg_host("testFunc", template, move |rt, values| {
        let result = result.clone();
        let events = events.clone();
        Box::pin(async move {
            if result.is_array() {
                select_vararg_value(rt, &values, &result, &events).await
            } else {
                let mut fields = indexmap::IndexMap::new();
                for (name, selector) in result.as_object().unwrap() {
                    fields.insert(
                        name.clone(),
                        select_vararg_value(rt, &values, selector, &events).await?,
                    );
                }
                Ok(rt.object(fields))
            }
        })
    })
}

fn stream_scenario(request: &Json) -> Result<Json> {
    use futures::FutureExt;
    use indexmap::IndexMap;
    use lpe::StreamContext;
    use std::{cell::RefCell, rc::Rc};
    let fail = |message: &str| Error::new("ProtocolError", message);
    let inputs = request
        .get("sources")
        .and_then(Json::as_object)
        .ok_or_else(|| fail("stream sources must be an object"))?;
    if inputs.contains_key("result") {
        return Err(fail("stream source name result is reserved"));
    }
    if request.get("steps").is_some_and(|steps| !steps.is_array()) {
        return Err(fail("stream steps must be an array"));
    }
    let mut runtime = Runtime::new();
    let mut sources = IndexMap::new();
    for (name, value) in inputs {
        let value = runtime.from_json(value);
        let stream = runtime.create_stream(value);
        runtime.set_global(name, stream.clone());
        sources.insert(name.clone(), stream);
    }
    let options = EvalOptions {
        resolve_string: false,
        ..Default::default()
    };
    let result = if let Some(child) = request.get("unboxReturn") {
        if request.get("source").is_some() {
            return Err(fail("stream requires either source or unboxReturn"));
        }
        let child = child
            .as_str()
            .and_then(|name| sources.get(name))
            .ok_or_else(|| fail("Unknown stream source"))?
            .clone();
        let input = request
            .get("unboxInput")
            .and_then(Json::as_str)
            .unwrap_or("flag");
        let input = sources
            .get(input)
            .ok_or_else(|| fail("Unknown stream source"))?
            .clone();
        let context =
            StreamContext::new(runtime.global_env(), &options).with_values(vec![child.clone()]);
        futures::executor::block_on(runtime.unbox(
            vec![input],
            context,
            Rc::new(move |_, _, _, _| {
                let child = child.clone();
                async move { Ok(child) }.boxed_local()
            }),
        ))?
    } else {
        let source = request
            .get("source")
            .and_then(Json::as_str)
            .ok_or_else(|| fail("stream requires either source or unboxReturn"))?;
        runtime.eval_with_options(source, &options)?
    };
    let events = Rc::new(RefCell::new(Vec::<Result<Json>>::new()));
    if matches!(result, Value::Stream(_)) {
        let recorded = events.clone();
        runtime.stream_subscribe_host(&result, move |runtime, value| {
            recorded.borrow_mut().push(encode_output(runtime, &value));
        })?;
    }
    let snapshot = |runtime: &Runtime| -> Result<Json> {
        let value = if matches!(result, Value::Stream(_)) {
            runtime.stream_value(&result)?
        } else {
            result.clone()
        };
        let mut states = serde_json::Map::new();
        for (name, stream) in &sources {
            let stats = runtime.stream_stats(stream)?;
            // Observation must not affect the adapter's visible subscription counts.
            let observer = usize::from(stream == &result && !stats.disposed);
            states.insert(
                name.clone(),
                json!({
                    "value": encode_output(runtime, &runtime.stream_value(stream)?)?,
                    "refs": stats.references, "listeners": stats.listeners - observer,
                }),
            );
        }
        let events = events
            .borrow()
            .iter()
            .cloned()
            .collect::<Result<Vec<_>>>()?;
        Ok(json!({"value":encode_output(runtime, &value)?,"sources":states,"events":events}))
    };
    let mut snapshots = vec![snapshot(&runtime)?];
    for step in request
        .get("steps")
        .and_then(Json::as_array)
        .into_iter()
        .flatten()
    {
        let name = step
            .get("name")
            .and_then(Json::as_str)
            .ok_or_else(|| fail("Missing stream step name"))?;
        let stream = if name == "result" {
            &result
        } else {
            sources
                .get(name)
                .ok_or_else(|| fail("Unknown stream source"))?
        };
        if !matches!(stream, Value::Stream(_)) {
            return Err(fail("Stream step target is not a stream"));
        }
        match step.get("op").and_then(Json::as_str) {
            Some("next") => {
                let value = step
                    .get("value")
                    .map(|value| runtime.from_json(value))
                    .unwrap_or(Value::Undefined);
                runtime.stream_next(stream, value)?;
            }
            Some("retain") => runtime.stream_retain(stream)?,
            Some("release") => runtime.stream_release(stream)?,
            _ => return Err(fail("Unknown stream step")),
        }
        snapshots.push(snapshot(&runtime)?);
    }
    Ok(json!({"snapshots":snapshots}))
}

fn process(request: &Json) -> Result<Json> {
    if !request.is_object() {
        return Err(Error::new("ProtocolError", "Request must be a JSON object"));
    }
    validate_input(request)?;
    let op = request.get("op").and_then(Json::as_str).unwrap_or("eval");
    let source = request.get("source").and_then(Json::as_str).unwrap_or("");
    match op {
        "stream" => return stream_scenario(request),
        "parse" => {
            return lpe::parser::parse_with_options(
                source,
                request.get("options").unwrap_or(&Json::Null),
            )
        }
        "deparse" => {
            return Ok(Json::String(lpe::deparser::deparse_with_options(
                request.get("ast").unwrap_or(&Json::Null),
                request.get("options").unwrap_or(&Json::Null),
            )?))
        }
        "eval" | "evalAst" | "api" => {}
        _ => {
            return Err(Error::new(
                "ProtocolError",
                format!("Unknown operation {op}"),
            ))
        }
    }
    let mut rt = Runtime::new();
    if let Some(fixtures) = request.get("hostFixtures").and_then(Json::as_array) {
        for fixture in fixtures {
            match fixture.as_str().unwrap_or("") {
                "async" => {
                    rt.register_async("promise", |args| {
                        Box::pin(
                            async move { Ok(args.first().cloned().unwrap_or(Value::Undefined)) },
                        )
                    });
                    rt.register_async("asyncDouble", |args| {
                        Box::pin(async move {
                            match args.first() {
                                Some(Value::Number(n)) => Ok(Value::Number(n * 2.0)),
                                _ => Err(Error::new("TypeError", "Expected number")),
                            }
                        })
                    });
                    rt.register_async("asyncFail", |_| {
                        Box::pin(async { Err(Error::new("Error", "async failure")) })
                    });
                }
                "counter" => {
                    let counter = std::rc::Rc::new(std::cell::Cell::new(0));
                    rt.register("counter", move |_| {
                        counter.set(counter.get() + 1);
                        Ok(Value::Number(counter.get() as f64))
                    });
                }
                "async-values" => {
                    for i in 1..=4 {
                        rt.set_global(format!("v{i}"), Value::Number(i as f64));
                        let p = rt.promise(async move { Ok(Value::Number(i as f64)) });
                        rt.set_global(format!("p{i}"), p);
                    }
                    rt.register_async("later", |args| {
                        Box::pin(
                            async move { Ok(args.first().cloned().unwrap_or(Value::Undefined)) },
                        )
                    });
                }
                "host-special" => {
                    rt.register_special("rawAst", |rt, args, _, _| {
                        Box::pin(async move { Ok(rt.from_json(&Json::Array(args))) })
                    });
                    rt.register_special("evalAstHere", |rt, args, env, opts| {
                        Box::pin(async move {
                            rt.eval_in(
                                args.first().unwrap_or(&json!({"$lpe":"undefined"})),
                                env,
                                &opts,
                            )
                            .await
                        })
                    });
                }
                "host-lookup" => {
                    rt.register("dynamicFn", |args| match args.first() {
                        Some(Value::Number(n)) => Ok(Value::Number(n + 1.0)),
                        _ => Err(Error::new("TypeError", "Expected number")),
                    });
                    rt.set_lookup_hook(rt.global_env(), |name, _| {
                        Ok(if name == "dynamicValue" {
                            Some(Value::Number(42.0))
                        } else {
                            None
                        })
                    })?;
                }
                "host-library" => {
                    rt.push_context(indexmap::IndexMap::new());
                    rt.set_global("libValue", Value::Number(7.0));
                    rt.register("libFn", |_| Ok(Value::Number(42.0)));
                    rt.register("libraryValue", |_| Ok(Value::Number(7.0)));
                    rt.mark_library(rt.global_env())?;
                    rt.push_context(indexmap::IndexMap::new());
                }
                "host-skip" => {
                    rt.register_host("wrapped", |rt, args| {
                        let s = format!(
                            "base:{}",
                            rt.to_string(args.first().unwrap_or(&Value::Undefined))
                        );
                        Box::pin(async move { Ok(Value::String(s)) })
                    });
                    rt.push_context(indexmap::IndexMap::new());
                    rt.register_host("outerResult", |rt, args| {
                        let s = format!(
                            "outer:{}",
                            rt.to_string(args.first().unwrap_or(&Value::Undefined))
                        );
                        Box::pin(async move { Ok(Value::String(s)) })
                    });
                    let callback = rt.lookup(
                        rt.global_env(),
                        "outerResult",
                        &EvalOptions::default(),
                        true,
                    )?;
                    let skip = rt.skip_form(callback, None);
                    rt.register("wrapped", move |_| Ok(skip.clone()));
                }
                "source-skip" => register_source_skip(&mut rt)?,
                "vararg-pair" => {
                    rt.register_vararg_host(
                        "testFunc",
                        vec![json!("a"), json!("b")],
                        |rt, args| {
                            Box::pin(async move {
                                Ok(rt.object(
                                    [
                                        ("a".into(), args[0].clone()),
                                        ("b".into(), args[1].clone()),
                                        ("args".into(), args[2].clone()),
                                        ("kwargs".into(), args[3].clone()),
                                    ]
                                    .into_iter()
                                    .collect(),
                                ))
                            })
                        },
                    )?;
                }
                "vararg-callback" => {
                    rt.register_vararg_host(
                        "testFunc",
                        vec![json!("a"), json!("callback:fn")],
                        |rt, args| {
                            Box::pin(async move {
                                let result = rt
                                    .call_value(args[1].clone(), vec![], rt.global_env())
                                    .await?;
                                Ok(rt.object(
                                    [
                                        ("a".into(), args[0].clone()),
                                        ("callbackResult".into(), result),
                                    ]
                                    .into_iter()
                                    .collect(),
                                ))
                            })
                        },
                    )?;
                }
                "vararg-regex" => {
                    rt.register_vararg_host(
                        "testFunc",
                        vec![json!({"[":"int", "(.)\\1":"int", ".*(?<=a)b":"int", "pre|post":"int", ".":"bool"})],
                        |_, args| Box::pin(async move { Ok(args[1].clone()) }),
                    )?;
                }
                "vararg-probe" => {
                    register_vararg_probe(&mut rt, request.get("vararg").unwrap_or(&Json::Null))?
                }
                "async-trace" => {
                    let events = std::rc::Rc::new(std::cell::RefCell::new(Vec::<String>::new()));
                    let trace = events.clone();
                    rt.register_host("trace", move |rt, _| {
                        let values = trace.borrow().iter().cloned().map(Value::String).collect();
                        let value = rt.array(values);
                        Box::pin(async move { Ok(value) })
                    });
                    rt.register_async("traceAsync", move |args| {
                        let label = match args.first() {
                            Some(Value::String(s)) => s.clone(),
                            _ => String::new(),
                        };
                        events.borrow_mut().push(format!("start:{label}"));
                        let events = events.clone();
                        Box::pin(async move {
                            let mut pending = true;
                            futures::future::poll_fn(move |cx| {
                                if pending {
                                    pending = false;
                                    cx.waker().wake_by_ref();
                                    std::task::Poll::Pending
                                } else {
                                    std::task::Poll::Ready(())
                                }
                            })
                            .await;
                            events.borrow_mut().push(format!("end:{label}"));
                            Ok(args.get(1).cloned().unwrap_or(Value::Undefined))
                        })
                    });
                }
                other => {
                    return Err(Error::new(
                        "ProtocolError",
                        format!("Unknown host fixture {other}"),
                    ))
                }
            }
        }
    }
    if let Some(context) = request.get("context") {
        rt.set_context(context)?;
    }
    let options = EvalOptions::from_json(request.get("options").unwrap_or(&Json::Null))?;
    if op == "api" {
        let name = request
            .get("name")
            .and_then(Json::as_str)
            .ok_or_else(|| Error::new("ProtocolError", "Missing API name"))?;
        let mut args: Vec<Value> = request
            .get("args")
            .and_then(Json::as_array)
            .map(|args| args.iter().map(|v| rt.from_json(v)).collect())
            .unwrap_or_default();
        if let Some(name) = request.get("binding").and_then(Json::as_str) {
            args = vec![rt.lookup(rt.global_env(), name, &options, false)?];
        }
        let arg = |i| args.get(i).cloned().unwrap_or(Value::Undefined);
        let value = match name {
            "exportType" => {
                let export = request.get("export").and_then(Json::as_str).unwrap_or("");
                if export != "parse" {
                    return Err(Error::new(
                        "ProtocolError",
                        format!("Unsupported export {export}"),
                    ));
                }
                Value::String("function".into())
            }
            "syntaxDiagnostic" => {
                let failure = lpe::parser::parse_with_diagnostics(
                    source,
                    request.get("options").unwrap_or(&Json::Null),
                )
                .err()
                .ok_or_else(|| {
                    Error::new(
                        "ProtocolError",
                        "Expected a syntax error, but parsing succeeded",
                    )
                })?;
                let diagnostic = failure
                    .diagnostic
                    .filter(|_| failure.error.kind == "SyntaxError")
                    .ok_or_else(|| {
                        Error::new(
                            "ProtocolError",
                            "Syntax error did not contain a structured diagnostic",
                        )
                    })?;
                let undefined = json!({"$lpe": "undefined"});
                let first = diagnostic.get("first").and_then(Json::as_array);
                return Ok(json!({
                    "crs": diagnostic.get("crs").unwrap_or(&undefined),
                    "firstCarets": first.into_iter().flatten().map(|token| token.get("crs").unwrap_or(&undefined)).collect::<Vec<_>>()
                }));
            }
            "calendarInvariant" => {
                let ast = lpe::parser::parse_with_options(
                    source,
                    request.get("options").unwrap_or(&Json::Null),
                )?;
                let before = chrono::Utc::now().date_naive();
                let value = rt.eval_ast(&ast, &options)?;
                let after = chrono::Utc::now().date_naive();
                let value = encode_output(&rt, &value)?;
                let check = request.get("check").and_then(Json::as_str).unwrap_or("");
                Value::Bool(
                    calendar_matches(&value, check, before)?
                        || calendar_matches(&value, check, after)?,
                )
            }
            "isString" | "isArray" | "isHash" | "isFunction" | "isNumber" | "isNumberLike" => {
                futures::executor::block_on(rt.call_value(
                    Value::Builtin(name.into()),
                    args,
                    rt.global_env(),
                ))?
            }
            "$getvar$" | "$setvar$" | "$var$" => {
                let context = arg(0);
                let env = rt.env_from_value(context, vec![])?;
                let key = rt.to_string(&arg(1));
                if name == "$setvar$" || (name == "$var$" && arg(2) != Value::Undefined) {
                    rt.assign(env, &key, arg(2))?
                } else {
                    let opts = EvalOptions {
                        resolve_string: false,
                        ..Default::default()
                    };
                    rt.lookup(env, &key, &opts, false)?
                }
            }
            "EVAL" => {
                let ast = request
                    .get("args")
                    .and_then(Json::as_array)
                    .and_then(|a| a.first())
                    .unwrap_or(&Json::Null);
                let context = arg(1);
                let env = rt.env_from_value(context, vec![])?;
                futures::executor::block_on(rt.eval_in(ast, env, &options))?
            }
            "variableAccessors" => {
                let context = rt.from_json(request.get("context").unwrap_or(&json!({})));
                let env = rt.env_from_value(context.clone(), vec![])?;
                let mut values = vec![];
                for step in request
                    .get("steps")
                    .and_then(Json::as_array)
                    .into_iter()
                    .flatten()
                {
                    let name = step.get("name").and_then(Json::as_str).unwrap_or("");
                    let key = step.get("key").and_then(Json::as_str).unwrap_or("");
                    let value = step
                        .get("value")
                        .map(|v| rt.from_json(v))
                        .unwrap_or(Value::Undefined);
                    values.push(
                        if name == "$setvar$" || (name == "$var$" && value != Value::Undefined) {
                            rt.assign(env, key, value)?
                        } else if name == "$getvar$" || name == "$var$" {
                            rt.lookup(
                                env,
                                key,
                                &EvalOptions {
                                    resolve_string: false,
                                    ..Default::default()
                                },
                                false,
                            )?
                        } else {
                            return Err(Error::new("ProtocolError", "Unknown variable accessor"));
                        },
                    );
                }
                let values = rt.array(values);
                rt.object(
                    [("values".into(), values), ("context".into(), context)]
                        .into_iter()
                        .collect(),
                )
            }
            _ => return Err(Error::new("ProtocolError", format!("Unknown API {name}"))),
        };
        return encode_output(&rt, &value);
    }
    let ast = if op == "evalAst" {
        request
            .get("ast")
            .cloned()
            .ok_or_else(|| Error::new("ProtocolError", "Missing ast"))?
    } else {
        lpe::parser::parse_with_options(source, request.get("options").unwrap_or(&Json::Null))?
    };
    let value = rt.eval_ast(&ast, &options)?;
    encode_output(&rt, &value)
}

fn main() {
    let stdin = io::stdin();
    let mut input = stdin.lock();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    loop {
        let mut line = Vec::new();
        // Bound requests before parsing or allocation of the JSON tree.
        let read =
            std::io::Read::take(&mut input, 4 * 1024 * 1024 + 1).read_until(b'\n', &mut line);
        match read {
            Ok(0) => break,
            Err(e) => {
                eprintln!("input error: {e}");
                break;
            }
            _ => {}
        }
        let result = if line.len() > 4 * 1024 * 1024 {
            Err(Error::new("LimitError", "Request exceeds 4 MiB"))
        } else {
            serde_json::from_slice::<Json>(&line)
                .map_err(|e| Error::new("ProtocolError", e.to_string()))
                .and_then(|r| process(&r))
        };
        let response = match result {
            Ok(value) => json!({"ok":true,"value":value}),
            Err(e) => json!({"ok":false,"error":{"kind":e.kind,"message":e.message}}),
        };
        if writeln!(stdout, "{response}")
            .and_then(|_| stdout.flush())
            .is_err()
        {
            break;
        }
        if line.len() > 4 * 1024 * 1024 {
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{calendar_matches, process};
    use chrono::NaiveDate;
    use serde_json::json;

    fn date(year: i32, month: u32, day: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(year, month, day).unwrap()
    }

    #[test]
    fn calendar_date_and_year_reject_stale_or_wrong_values() {
        let today = date(2024, 3, 1);
        assert!(calendar_matches(&json!("2024-03-01"), "utc-date", today).unwrap());
        for value in [
            json!("2024-02-29"),
            json!("2024-03-02"),
            json!("2023-03-01"),
            json!(null),
            json!(["2024-03-01"]),
        ] {
            assert!(
                !calendar_matches(&value, "utc-date", today).unwrap(),
                "{value}"
            );
        }
        assert!(calendar_matches(&json!("2024-03-01"), "utc-year-prefix", today).unwrap());
        for value in [
            json!("2023-03-01"),
            json!("20240-03-01"),
            json!(2024),
            json!("2024"),
        ] {
            assert!(
                !calendar_matches(&value, "utc-year-prefix", today).unwrap(),
                "{value}"
            );
        }
    }

    #[test]
    fn calendar_weeks_use_monday_and_sunday_across_year_and_leap_boundaries() {
        for (today, expected) in [
            (date(2024, 1, 1), json!(["2024-01-01", "2024-01-07"])),
            (date(2023, 12, 31), json!(["2023-12-25", "2023-12-31"])),
            (date(2024, 12, 31), json!(["2024-12-30", "2025-01-05"])),
            (date(2024, 2, 29), json!(["2024-02-26", "2024-03-03"])),
        ] {
            assert!(
                calendar_matches(&expected, "utc-week", today).unwrap(),
                "{today}"
            );
            assert!(
                !calendar_matches(&json!([expected[1], expected[0]]), "utc-week", today).unwrap()
            );
        }
        let sunday_based = json!(["2024-12-29", "2025-01-04"]);
        assert!(!calendar_matches(&sunday_based, "utc-week", date(2024, 12, 31)).unwrap());
        assert!(!calendar_matches(
            &json!(["2024-12-30", "2025-01-05", null]),
            "utc-week",
            date(2024, 12, 31)
        )
        .unwrap());
    }

    #[test]
    fn calendar_five_day_extension_crosses_leap_day_and_new_year() {
        for (today, expected) in [
            (date(2024, 2, 27), json!(["2024-02-27", "2024-03-03"])),
            (date(2024, 2, 29), json!(["2024-02-29", "2024-03-05"])),
            (date(2023, 12, 29), json!(["2023-12-29", "2024-01-03"])),
        ] {
            assert!(
                calendar_matches(&expected, "utc-extend-five", today).unwrap(),
                "{today}"
            );
        }
        for wrong in [
            json!(["2024-02-27", "2024-03-02"]),
            json!(["2024-02-27", "2024-03-04"]),
            json!(["2024-02-26", "2024-03-03"]),
        ] {
            assert!(!calendar_matches(&wrong, "utc-extend-five", date(2024, 2, 27)).unwrap());
        }
    }

    #[test]
    fn calendar_unknown_checks_are_protocol_errors() {
        let error = calendar_matches(&json!(true), "unknown", date(2024, 1, 1)).unwrap_err();
        assert_eq!(error.kind, "ProtocolError");
    }

    #[test]
    fn diagnostic_probe_rejects_success_and_unstructured_errors() {
        for source in ["1 + 2", "'unterminated"] {
            let error = process(&json!({
                "op": "api", "name": "syntaxDiagnostic", "source": source
            }))
            .unwrap_err();
            assert_eq!(error.kind, "ProtocolError", "{source}");
        }
        let diagnostic = process(&json!({
            "op": "api", "name": "syntaxDiagnostic", "source": "f("
        }))
        .unwrap();
        assert_eq!(
            diagnostic,
            json!({"crs": {"$lpe": "undefined"}, "firstCarets": []})
        );
    }
}
