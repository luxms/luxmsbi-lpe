//! LPE special forms evaluate their own arguments; no MAL macro expansion is used.
use crate::runtime::{StreamContext, StreamResolver};
use crate::{Ast, EnvId, Error, EvalOptions, Result, Runtime, Value};
use indexmap::IndexMap;
use serde_json::json;
use std::{cell::Cell, rc::Rc};

pub fn names() -> &'static [&'static str] {
    &[
        "`",
        "$AST$",
        "\"",
        "'",
        "q",
        "f\"",
        "f'",
        "formatString",
        "str>EVAL",
        "strToEVAL",
        ".",
        "->",
        "threadFirst",
        "..",
        "->>",
        "threadLast",
        ".-",
        "property",
        "begin",
        "if",
        "do",
        "return",
        "catchReturn",
        "try",
        "nvl",
        "coalesce",
        "let",
        "let*",
        "letseq",
        "letstar",
        "fn",
        "->fn",
        "toFn",
        "defFn",
        "=>",
        "lambda",
        "def",
        ":=",
        "assign",
        "undef",
        "resolve",
        "ctx",
        "define",
        "makeHash",
        "vector",
        "{",
        "tuple",
        "hash",
        "mapit",
        "filterit",
        "repeat",
        "get_in",
        "assoc_in",
        "cp",
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
        "&&",
        "and",
        "||",
        "or",
        "logicalAnd",
        "logical_and",
        "logicalOr",
        "logical_or",
        "eval_ast",
        "eval_lpe",
        "rep",
        "set_options",
        "throw",
        "[]",
        "astToString",
    ]
}

fn arg(args: &[Ast], index: usize) -> Ast {
    args.get(index)
        .cloned()
        .unwrap_or_else(|| json!({"$lpe":"undefined"}))
}

fn array_constructor(ast: &Ast) -> bool {
    matches!(
        ast.as_str(),
        Some("[" | "list" | "array" | "vector" | "()" | "tuple")
    )
}

fn caught(result: Result<Value>) -> Result<Value> {
    match result {
        Err(e) if e.kind == "Return" => Ok(e.value.unwrap_or(Value::Undefined)),
        other => other,
    }
}

fn wrong_type(message: &str) -> Error {
    Error::new("LPE_FUNC_WRONG_ARG_TYPE", message)
}

fn raw_string(rt: &mut Runtime, ast: &Ast) -> String {
    let value = rt.from_json(ast);
    rt.to_string(&value)
}

// An evaluated AST can contain actual functions and shared objects, not only JSON.
fn value_ast(rt: &mut Runtime, value: Value) -> Result<Ast> {
    value_ast_inner(rt, value, &mut std::collections::HashSet::new(), 0)
}

fn value_ast_inner(
    rt: &mut Runtime,
    value: Value,
    seen: &mut std::collections::HashSet<usize>,
    depth: usize,
) -> Result<Ast> {
    rt.tick()?;
    if depth > 256 {
        return Err(Error::new("LimitError", "AST conversion depth exceeded"));
    }
    if matches!(value, Value::Array(_)) {
        let Value::Array(id) = value else {
            unreachable!()
        };
        if !seen.insert(id) {
            return Err(Error::new("TypeError", "Circular AST array"));
        }
        let values = rt.array_values(&value)?;
        let ast = Ast::Array(
            values
                .into_iter()
                .map(|v| value_ast_inner(rt, v, seen, depth + 1))
                .collect::<Result<_>>()?,
        );
        seen.remove(&id);
        Ok(ast)
    } else if matches!(
        value,
        Value::Object(_)
            | Value::Utf16(_)
            | Value::Function(_)
            | Value::Builtin(_)
            | Value::Special(_)
            | Value::Date(_)
            | Value::Stream(_)
            | Value::Promise(_)
    ) {
        Ok(rt.ast_literal(value))
    } else {
        rt.to_json(&value)
    }
}

async fn lookup(rt: &mut Runtime, env: EnvId, name: &str, options: &EvalOptions) -> Result<Value> {
    let mut options = options.clone();
    options.resolve_string = false;
    rt.lookup_async(env, name, &options, false).await
}

async fn sequence(
    rt: &mut Runtime,
    args: &[Ast],
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    let mut result = Value::Null;
    for (index, ast) in args.iter().enumerate() {
        match rt.eval_in(ast, env, options).await {
            Err(e) if e.kind == "Return" => return Ok(e.value.unwrap_or(Value::Undefined)),
            value => result = value?,
        }
        if matches!(result, Value::Stream(_) | Value::Promise(_)) {
            let rest = args[index + 1..].to_vec();
            let resolve: StreamResolver = Rc::new(move |rt, values, env, options| {
                let rest = rest.clone();
                Box::pin(async move {
                    if rest.is_empty() {
                        Ok(values[0].clone())
                    } else {
                        sequence(rt, &rest, env, &options).await
                    }
                })
            });
            return caught(
                rt.unbox(
                    vec![result],
                    StreamContext::new(env, options).with_asts(args),
                    resolve,
                )
                .await,
            );
        }
    }
    Ok(result)
}

fn compare(rt: &Runtime, op: &str, a: &Value, b: &Value) -> bool {
    let primitive = |v: &Value| match v {
        Value::Array(_) | Value::Object(_) => rt.string_from_utf16(rt.to_utf16(v)),
        _ => v.clone(),
    };
    let (a, b) = (primitive(a), primitive(b));
    let order = match (&a, &b) {
        (Value::String(_) | Value::Utf16(_), Value::String(_) | Value::Utf16(_)) => {
            Some(rt.to_utf16(&a).cmp(&rt.to_utf16(&b)))
        }
        _ => rt.to_number(&a).partial_cmp(&rt.to_number(&b)),
    };
    use std::cmp::Ordering::*;
    matches!(
        (op, order),
        ("<", Some(Less))
            | ("<=", Some(Less | Equal))
            | (">", Some(Greater))
            | (">=", Some(Greater | Equal))
    )
}

pub async fn call(
    rt: &mut Runtime,
    name: &str,
    args: &[Ast],
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    rt.tick()?;
    match name {
        "[]" | "astToString" => {
            let value = rt.checked_from_json(&arg(args, 0))?;
            rt.checked_string_from_utf16(rt.checked_to_utf16(&value)?)
        }
        "throw" => {
            let mut values = vec![];
            for ast in args {
                values.push(rt.eval_in(ast, env, options).await?);
            }
            let value = values.into_iter().next().unwrap_or(Value::Undefined);
            let message = rt.to_string(&value);
            let mut error = Error::with_value("Error", value);
            error.message = message;
            Err(error)
        }
        "`" | "$AST$" => {
            let ast = arg(args, 0);
            if ast.get("$lpeInternalLiteral").is_some() {
                rt.eval_in(&ast, env, options).await
            } else {
                rt.checked_from_json(&ast)
            }
        }
        "\"" | "'" | "q" => {
            if args.iter().skip(1).any(|v| v.as_str() == Some("_")) {
                let ast = arg(args, 0);
                let name = if ast.get("$lpeInternalLiteral").is_some() {
                    let value = rt.eval_in(&ast, env, options).await?;
                    rt.to_string(&value)
                } else {
                    raw_string(rt, &ast)
                };
                lookup(rt, env, &name, options).await
            } else {
                let ast = arg(args, 0);
                let value = if ast.get("$lpeInternalLiteral").is_some() {
                    rt.eval_in(&ast, env, options).await?
                } else {
                    rt.checked_from_json(&ast)?
                };
                let value = rt.checked_string_from_utf16(rt.checked_to_utf16(&value)?)?;
                for flag in args.iter().skip(1) {
                    let name = format!("str>{}", raw_string(rt, flag));
                    if lookup(rt, env, &name, options).await?.is_callable() {
                        let literal = rt.ast_literal(value);
                        return rt.eval_in(&json!([name, literal]), env, options).await;
                    }
                }
                Ok(value)
            }
        }
        "f\"" | "f'" | "formatString" => {
            let flags = arg(args, 0)
                .as_array()
                .cloned()
                .ok_or_else(|| Error::new("TypeError", "Format string flags must be an array"))?;
            let mut values = Vec::new();
            for ast in args.iter().skip(1) {
                values.push(rt.eval_in(ast, env, options).await?);
            }
            rt.unbox(
                values,
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let flags = flags.clone();
                    Box::pin(async move {
                        let mut text = Vec::new();
                        for value in &values {
                            text.extend(rt.checked_to_utf16(value)?);
                        }
                        let value = rt.checked_string_from_utf16(text)?;
                        let literal = rt.ast_literal(value);
                        let mut quoted = vec![json!("'"), literal];
                        quoted.extend(flags);
                        rt.eval_in(&Ast::Array(quoted), env, &options).await
                    })
                }),
            )
            .await
        }
        "." | "->" | "threadFirst" | ".." | "->>" | "threadLast" => {
            let first = matches!(name, "." | "->" | "threadFirst");
            let mut acc = arg(args, 0);
            for next in args.iter().skip(1) {
                rt.tick()?;
                acc = if first
                    && (!next.is_array()
                        || (next[0] == "()" && next.as_array().is_some_and(|a| a.len() == 2)))
                {
                    json!([".-", acc, next])
                } else {
                    let mut call = next
                        .as_array()
                        .cloned()
                        .ok_or_else(|| wrong_type("threadLast expects function calls"))?;
                    if first {
                        call.insert(1.min(call.len()), acc);
                    } else {
                        call.push(acc);
                    }
                    Ast::Array(call)
                };
            }
            // A single scalar in threadFirst returns this AST, not its evaluation.
            if first && !acc.is_array() {
                return Ok(rt.from_json(&json!(["resolve", acc])));
            }
            rt.eval_in(&acc, env, options).await
        }
        ".-" | "property" => {
            let obj = rt.eval_in(&arg(args, 0), env, options).await?;
            let key = if let Some(key) = args.get(1).and_then(Ast::as_str) {
                Value::String(key.to_owned())
            } else {
                rt.eval_in(&arg(args, 1), env, options).await?
            };
            let value = rt.eval_in(&arg(args, 2), env, options).await?;
            rt.unbox(
                vec![obj, key, value],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(|rt, values, _, _| {
                    Box::pin(async move {
                        let key = rt.safe_key(&values[1])?;
                        let value = values[2].clone();
                        if value == Value::Undefined {
                            rt.safe_get(&values[0], &key)
                        } else {
                            rt.set(&values[0], &key, value)
                        }
                    })
                }),
            )
            .await
        }
        "begin" => sequence(rt, args, env, options).await,
        "catchReturn" => caught(rt.eval_in(&arg(args, 0), env, options).await),
        "return" => {
            let value = rt.eval_in(&arg(args, 0), env, options).await?;
            Err(Error::with_value("Return", value))
        }
        "if" => {
            let mut condition_options = options.clone();
            condition_options.resolve_string = false;
            let mut index = 0;
            while index + 1 < args.len() {
                let condition = rt.eval_in(&args[index], env, &condition_options).await?;
                if matches!(condition, Value::Stream(_) | Value::Promise(_)) {
                    let branches = args[index + 1..].to_vec();
                    return rt
                        .unbox(
                            vec![condition],
                            StreamContext::new(env, options).with_asts(args),
                            Rc::new(move |rt, values, env, options| {
                                let branches = branches.clone();
                                Box::pin(async move {
                                    if values[0].truthy() {
                                        rt.eval_in(&branches[0], env, &options).await
                                    } else {
                                        call(rt, "if", &branches[1..], env, &options).await
                                    }
                                })
                            }),
                        )
                        .await;
                }
                if condition.truthy() {
                    return rt.eval_in(&args[index + 1], env, options).await;
                }
                index += 2;
            }
            rt.eval_in(&arg(args, index), env, options).await
        }
        "do" => {
            if args.len() < 2 {
                return rt.eval_in(&arg(args, 0), env, options).await;
            }
            let value = rt.eval_in(&args[1], env, options).await?;
            do_loop(rt, value, args, env, options, Rc::new(Cell::new(0)), false).await
        }
        "try" => {
            let key = args
                .get(1)
                .and_then(Ast::as_str)
                .ok_or_else(|| wrong_type("errorName must be a string"))?;
            match rt.eval_in(&arg(args, 0), env, options).await {
                Ok(value) => Ok(value),
                // JS returns the Promise from the try block without attaching a catch.
                Err(error) if error.is_async => Err(error),
                Err(error) => {
                    let value = if error.kind == "Return" {
                        let mut fields = IndexMap::new();
                        fields.insert("value".into(), error.value.unwrap_or(Value::Undefined));
                        fields.insert("message".into(), Value::String(error.message));
                        rt.object(fields)
                    } else if let Some(value) = error.value {
                        value
                    } else {
                        rt.object(IndexMap::from([
                            ("message".into(), Value::String(error.message)),
                            ("name".into(), Value::String(error.kind.into())),
                        ]))
                    };
                    let local = rt.new_env(IndexMap::from([(key.to_owned(), value)]), vec![env]);
                    rt.eval_in(&arg(args, 2), local, options).await
                }
            }
        }
        // JS coalesce tests the stream object itself, not its current value.
        "nvl" | "coalesce" => {
            for ast in args {
                let value = rt.eval_in(ast, env, options).await?;
                if !value.is_nullish() {
                    return Ok(value);
                }
            }
            Ok(Value::Null)
        }
        "&&" | "and" | "||" | "or" | "logicalAnd" | "logical_and" | "logicalOr" | "logical_or" => {
            let and = matches!(name, "&&" | "and" | "logicalAnd" | "logical_and");
            let boolean = matches!(
                name,
                "logicalAnd" | "logical_and" | "logicalOr" | "logical_or"
            );
            let mut value = Value::Bool(and);
            for (index, ast) in args.iter().enumerate() {
                value = if boolean {
                    rt.eval_in(&json!(["toBool", ast]), env, options).await?
                } else {
                    rt.eval_in(ast, env, options).await?
                };
                if index + 1 == args.len() {
                    return Ok(value);
                }
                if matches!(value, Value::Stream(_) | Value::Promise(_)) {
                    let rest = args[index + 1..].to_vec();
                    let name = name.to_owned();
                    return rt
                        .unbox(
                            vec![value],
                            StreamContext::new(env, options).with_asts(args),
                            Rc::new(move |rt, values, env, options| {
                                let rest = rest.clone();
                                let name = name.clone();
                                Box::pin(async move {
                                    if values[0].truthy() != and {
                                        Ok(values[0].clone())
                                    } else {
                                        call(rt, &name, &rest, env, &options).await
                                    }
                                })
                            }),
                        )
                        .await;
                }
                if value.truthy() != and {
                    return Ok(value);
                }
            }
            Ok(value)
        }
        "<" | "lt" | "less" | "<=" | "le" | "lte" | ">" | "gt" | "greater" | ">=" | "ge"
        | "gte" => {
            let op = match name {
                "lt" | "less" => "<",
                "le" | "lte" => "<=",
                "gt" | "greater" => ">",
                "ge" | "gte" => ">=",
                name => name,
            };
            if args.len() == 2 {
                if let Some(next) = args[1].as_array().filter(|a| {
                    a.first()
                        .and_then(Ast::as_str)
                        .is_some_and(|op| matches!(op, "<" | "<=" | ">" | ">="))
                }) {
                    let a = rt.eval_in(&args[0], env, options).await?;
                    let b = rt.eval_in(&arg(next, 1), env, options).await?;
                    let next = next.clone();
                    let op = op.to_owned();
                    return rt
                        .unbox(
                            vec![a, b],
                            StreamContext::new(env, options).with_asts(args),
                            Rc::new(move |rt, values, env, options| {
                                let next = next.clone();
                                let op = op.clone();
                                Box::pin(async move {
                                    if !compare(rt, &op, &values[0], &values[1]) {
                                        return Ok(Value::Bool(false));
                                    }
                                    let mut call =
                                        vec![next[0].clone(), rt.ast_literal(values[1].clone())];
                                    call.extend_from_slice(next.get(2..).unwrap_or(&[]));
                                    rt.eval_in(&Ast::Array(call), env, &options).await
                                })
                            }),
                        )
                        .await;
                }
            }
            let mut values = Vec::new();
            for ast in args {
                values.push(rt.eval_in(ast, env, options).await?);
            }
            let op = op.to_owned();
            rt.unbox(
                values,
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, _, _| {
                    let op = op.clone();
                    Box::pin(async move {
                        Ok(Value::Bool(
                            values
                                .windows(2)
                                .all(|pair| compare(rt, &op, &pair[0], &pair[1])),
                        ))
                    })
                }),
            )
            .await
        }
        "let" => {
            let missing_bindings;
            let bindings = if let Some(bindings) = args.first() {
                bindings
            } else {
                missing_bindings = arg(args, 0);
                &missing_bindings
            };
            let kv_array = !(bindings
                .as_array()
                .is_some_and(|a| a.first().is_some_and(Ast::is_string))
                || bindings.get("$lpeInternalLiteral").is_some());
            let values = if !kv_array {
                vec![
                    if let Some(result) = rt.eval_scoped_immediate(bindings, env, options) {
                        result?
                    } else {
                        rt.eval_in(bindings, env, options).await?
                    },
                ]
            } else {
                let pairs: Vec<(std::borrow::Cow<'_, Ast>, &Ast)> = if let Some(obj) =
                    bindings.as_object()
                {
                    obj.iter()
                        .map(|(k, v)| (std::borrow::Cow::Owned(json!(k)), v))
                        .collect()
                } else if let Some(pairs) = bindings.as_array() {
                    let mut result = vec![];
                    for pair in pairs {
                        let pair = pair.as_array().filter(|p| p.len() == 2).ok_or_else(|| {
                            wrong_type("let bindings must contain [key, value] pairs")
                        })?;
                        result.push((std::borrow::Cow::Borrowed(&pair[0]), &pair[1]));
                    }
                    result
                } else {
                    return Err(wrong_type(
                        "let bindings must be Array<[Key, Value]> | Hash | Function",
                    ));
                };
                let mut values = vec![];
                for (key, value) in pairs {
                    let key = if key.is_string() {
                        json!(["$AST$", key])
                    } else {
                        key.into_owned()
                    };
                    let binding = Ast::Array(vec![json!("list"), key, value.clone()]);
                    values.push(
                        if let Some(result) = rt.eval_scoped_immediate(&binding, env, options) {
                            result?
                        } else {
                            rt.eval_in(&binding, env, options).await?
                        },
                    );
                }
                values
            };
            if values
                .iter()
                .all(|value| !matches!(value, Value::Stream(_) | Value::Promise(_)))
            {
                let local = let_scope(rt, values, kv_array, env)?;
                return sequence(rt, args.get(1..).unwrap_or(&[]), local, options).await;
            }
            let body = args.get(1..).unwrap_or(&[]).to_vec();
            rt.unbox(
                values,
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let body = body.clone();
                    Box::pin(async move {
                        let local = let_scope(rt, values, kv_array, env)?;
                        sequence(rt, &body, local, &options).await
                    })
                }),
            )
            .await
        }
        "let*" | "letseq" | "letstar" => {
            let bindings = arg(args, 0);
            let mut bindings = bindings.as_array().cloned().ok_or_else(|| {
                Error::new("Error", "LISP: let* expression invalid bindings form")
            })?;
            if bindings.first().is_some_and(array_constructor) {
                bindings.remove(0);
            }
            if bindings.first().is_some_and(Ast::is_string) {
                bindings = vec![Ast::Array(bindings)];
            }
            let mut local = env;
            for (index, pair) in bindings.iter().enumerate() {
                let mut pair = pair.as_array().cloned().ok_or_else(|| {
                    Error::new("Error", "LISP: let* binding must be a [name, value] pair")
                })?;
                if pair.first().is_some_and(array_constructor) {
                    pair.remove(0);
                }
                if pair.len() != 2 {
                    return Err(Error::new(
                        "Error",
                        "LISP: let* binding must be a [name, value] pair",
                    ));
                }
                let key = if let Some(key) = pair[0].as_str() {
                    Value::String(key.to_owned())
                } else {
                    rt.eval_in(&pair[0], local, options).await?
                };
                let value = rt.eval_in(&pair[1], local, options).await?;
                if matches!(key, Value::Stream(_) | Value::Promise(_))
                    || matches!(value, Value::Stream(_) | Value::Promise(_))
                {
                    let mut rest = vec![Ast::Array(bindings[index + 1..].to_vec())];
                    rest.extend_from_slice(args.get(1..).unwrap_or(&[]));
                    return rt
                        .unbox(
                            vec![key, value],
                            StreamContext::new(local, options).with_asts(args),
                            Rc::new(move |rt, values, env, options| {
                                let rest = rest.clone();
                                Box::pin(async move {
                                    let key = rt.safe_key(&values[0])?;
                                    let local = rt.new_env(
                                        IndexMap::from([(key.into_owned(), values[1].clone())]),
                                        vec![env],
                                    );
                                    call(rt, "let*", &rest, local, &options).await
                                })
                            }),
                        )
                        .await;
                }
                local = rt.new_env(
                    IndexMap::from([(rt.safe_key(&key)?.into_owned(), value)]),
                    vec![local],
                );
            }
            sequence(rt, args.get(1..).unwrap_or(&[]), local, options).await
        }
        "fn" | "->fn" | "toFn" | "defFn" | "=>" | "lambda" => {
            make_closure(rt, name, args, env, options)
        }
        "def" | ":=" | "assign" => {
            let target = arg(args, 0);
            if name != "def" && target.is_array() {
                let path = target.as_array().unwrap();
                if path.first().and_then(Ast::as_str) != Some(".") {
                    return Err(Error::new("LPE_LEFT_ARG_MUST_BE_LVALUE", ":="));
                }
                let root = arg(path, 1);
                let obj = if root.is_array() {
                    rt.eval_in(&root, env, options).await?
                } else {
                    let key = raw_string(rt, &root);
                    let value = lookup(rt, env, &key, options).await?;
                    if value == Value::Undefined {
                        return Err(Error::new("LPE_VAR_NOT_FOUND", key));
                    }
                    value
                };
                let mut values = vec![obj];
                for key in path.iter().skip(2) {
                    values.push(if let Some(key) = key.as_str() {
                        Value::String(key.to_owned())
                    } else {
                        rt.eval_in(key, env, options).await?
                    });
                }
                values.push(rt.eval_in(&arg(args, 1), env, options).await?);
                rt.unbox(
                    values,
                    StreamContext::new(env, options).with_asts(args),
                    Rc::new(|rt, values, _, _| {
                        Box::pin(async move {
                            let mut obj = values[0].clone();
                            let keys: Vec<_> = values[1..values.len() - 1]
                                .iter()
                                .map(|key| rt.safe_key(key))
                                .collect::<Result<_>>()?;
                            for key in keys.iter().take(keys.len().saturating_sub(1)) {
                                let mut next = rt.get(&obj, key);
                                if next.is_nullish() {
                                    next = rt.object(IndexMap::new());
                                    rt.set(&obj, key, next.clone())?;
                                } else if !matches!(
                                    next,
                                    Value::Array(_)
                                        | Value::Object(_)
                                        | Value::Function(_)
                                        | Value::Date(_)
                                ) {
                                    return Err(Error::new(
                                        "LPE_VAR_NOT_DOT_ACCESSIBLE",
                                        rt.to_string(&next),
                                    ));
                                }
                                obj = next;
                            }
                            rt.set(
                                &obj,
                                keys.last().map(|key| key.as_ref()).unwrap_or("undefined"),
                                values.last().unwrap().clone(),
                            )
                        })
                    }),
                )
                .await
            } else {
                let value = if rt.legacy_context_enabled() && args.get(1).is_none() {
                    Value::Undefined
                } else {
                    rt.eval_in(&arg(args, 1), env, options).await?
                };
                let key = if name == "def" && target.is_array() && !rt.legacy_context_enabled() {
                    rt.eval_in(&target, env, options).await?
                } else {
                    rt.from_json(&target)
                };
                if rt.legacy_context_enabled() {
                    let key = rt.to_string(&key);
                    rt.assign_async(env, &key, value, options).await
                } else if name == "def" {
                    rt.unbox(
                        vec![key, value],
                        StreamContext::new(env, options).with_asts(args),
                        Rc::new(move |rt, values, env, options| {
                            Box::pin(async move {
                                let key = rt.safe_key(&values[0])?;
                                rt.assign_async(env, &key, values[1].clone(), &options)
                                    .await
                            })
                        }),
                    )
                    .await
                } else {
                    // Unlike def, JS assignment to a variable stores the stream itself.
                    let key = rt.safe_key(&key)?;
                    rt.assign_async(env, &key, value, options).await
                }
            }
        }
        "undef" => {
            let ast = arg(args, 0);
            let key = if let Some(key) = ast.as_str() {
                Value::String(key.to_owned())
            } else {
                rt.eval_in(&ast, env, options).await?
            };
            rt.unbox(
                vec![key],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(|rt, values, env, _| {
                    Box::pin(async move { Ok(rt.undefine(env, &rt.safe_key(&values[0])?)) })
                }),
            )
            .await
        }
        "resolve" => {
            let key = raw_string(rt, &arg(args, 0));
            lookup(rt, env, &key, options).await
        }
        "ctx" => {
            let mut values = IndexMap::new();
            for key in args {
                let key = key
                    .as_str()
                    .ok_or_else(|| wrong_type("ctx keys must be strings, not expressions"))?;
                values.insert(key.to_owned(), lookup(rt, env, key, options).await?);
            }
            Ok(rt.object(values))
        }
        "define" => define(rt, args, env, options).await,
        "makeHash" | "vector" | "{" | "tuple" | "hash" => {
            let mut values = vec![];
            let mut names = vec![];
            for ast in args {
                let kwarg = ast.as_array().filter(|a| {
                    a.len() == 3 && a[0] == "=" && (name == "makeHash" || a[1].is_string())
                });
                if let Some(pair) = kwarg {
                    let key = if name == "makeHash" {
                        values.push(rt.eval_in(&pair[1], env, options).await?);
                        None
                    } else {
                        Some(pair[1].as_str().unwrap().to_owned())
                    };
                    names.push(key);
                    values.push(rt.eval_in(&pair[2], env, options).await?);
                } else if name != "makeHash" {
                    names.push(None);
                    values.push(rt.eval_in(ast, env, options).await?);
                }
            }
            let name = name.to_owned();
            rt.unbox(
                values,
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, _, _| {
                    let name = name.clone();
                    let names = names.clone();
                    Box::pin(async move {
                        let mut positional = vec![];
                        let mut named = IndexMap::new();
                        if name == "makeHash" {
                            for pair in values.as_chunks::<2>().0 {
                                named.insert(rt.safe_key(&pair[0])?.into_owned(), pair[1].clone());
                            }
                        } else {
                            for (key, value) in names.into_iter().zip(values) {
                                if let Some(key) = key {
                                    crate::security::key(&key)?;
                                    named.insert(key, value);
                                } else {
                                    positional.push(value);
                                }
                            }
                        }
                        if matches!(name.as_str(), "hash" | "makeHash")
                            || (name != "tuple" && positional.is_empty() && !named.is_empty())
                        {
                            return Ok(rt.object(named));
                        }
                        let array = rt.array(positional);
                        for (key, value) in named {
                            rt.set(&array, &key, value)?;
                        }
                        Ok(array)
                    })
                }),
            )
            .await
        }
        "repeat" => {
            let count = rt.eval_in(&arg(args, 0), env, options).await?;
            let body = arg(args, 1);
            rt.unbox(
                vec![count],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let body = body.clone();
                    Box::pin(async move {
                        let count = match values[0] {
                            Value::Number(n)
                                if n >= 0.0 && n.fract() == 0.0 && n <= u32::MAX as f64 =>
                            {
                                n as usize
                            }
                            Value::Number(_) => {
                                return Err(Error::new("RangeError", "Invalid array length"))
                            }
                            _ => 1,
                        };
                        if count > options.max_steps {
                            return Err(Error::new(
                                "LimitError",
                                "Array allocation limit exceeded",
                            ));
                        }
                        rt.charge_items::<Value>(count)?;
                        let mut result = vec![];
                        for _ in 0..count {
                            rt.tick()?;
                            let value = rt.eval_in(&body, env, &options).await?;
                            rt.charge_owned_payload(&value)?;
                            result.push(value);
                        }
                        rt.unbox(
                            result,
                            StreamContext::new(env, &options).with_asts(&[body]),
                            Rc::new(|rt, values, _, _| {
                                Box::pin(async move { Ok(rt.array(values)) })
                            }),
                        )
                        .await
                    })
                }),
            )
            .await
        }
        "mapit" | "filterit" => {
            let source = rt.eval_in(&arg(args, 0), env, options).await?;
            let body = arg(args, 1);
            let map = name == "mapit";
            rt.unbox(
                vec![source],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let body = body.clone();
                    Box::pin(async move {
                        let source = values[0].clone();
                        if source.is_nullish() {
                            return Err(Error::new(
                                "TypeError",
                                "Cannot convert undefined or null to object",
                            ));
                        }
                        let length = rt.to_number(&rt.get(&source, "length"));
                        if length > options.max_steps as f64 {
                            return Err(Error::new(
                                "LimitError",
                                "Array allocation limit exceeded",
                            ));
                        }
                        let length = if length.is_nan() || length < 0.0 {
                            0
                        } else {
                            length as usize
                        };
                        rt.charge_items::<Value>(length)?;
                        let mut result = vec![];
                        let mut holes = vec![];
                        for index in 0..length {
                            rt.tick()?;
                            if !rt.has_own(&source, &index.to_string()) {
                                if map {
                                    holes.push(index);
                                    result.push(Value::Undefined);
                                }
                                continue;
                            }
                            let value = rt.get(&source, &index.to_string());
                            let local = rt.new_env(
                                IndexMap::from([
                                    ("it".into(), value.clone()),
                                    ("idx".into(), Value::Number(index as f64)),
                                ]),
                                vec![env],
                            );
                            let mapped = caught(rt.eval_in(&body, local, &options).await)?;
                            if map {
                                rt.charge_owned_payload(&mapped)?;
                                result.push(mapped);
                            } else if mapped.truthy() {
                                // JS filterit tests the predicate before unboxing selected elements.
                                rt.charge_owned_payload(&value)?;
                                result.push(value);
                            }
                        }
                        rt.unbox(
                            result,
                            StreamContext::new(env, &options)
                                .with_asts(&[body])
                                .with_values(vec![source]),
                            Rc::new(move |rt, values, _, _| {
                                let holes = holes.clone();
                                Box::pin(async move {
                                    let result = rt.array(values);
                                    for index in holes {
                                        rt.delete(&result, &index.to_string())?;
                                    }
                                    Ok(result)
                                })
                            }),
                        )
                        .await
                    })
                }),
            )
            .await
        }
        "get_in" => {
            let origin = arg(args, 0);
            let quoted = origin
                .as_array()
                .is_some_and(|a| matches!(a.first().and_then(Ast::as_str), Some("q" | "'" | "\"")));
            let mut values = vec![rt.eval_in(&origin, env, options).await?];
            for key in args.iter().skip(1) {
                values.push(rt.eval_in(key, env, options).await?);
            }
            rt.unbox(
                values,
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    Box::pin(async move {
                        let mut origin = values[0].clone();
                        if quoted {
                            if let Value::String(name) = &origin {
                                let binding = lookup(rt, env, name, &options).await?;
                                if binding != Value::Undefined {
                                    origin = binding;
                                }
                            }
                        }
                        let path = if values.len() == 2 && matches!(values[1], Value::Array(_)) {
                            rt.array_values(&values[1])?
                        } else {
                            values[1..].to_vec()
                        };
                        rt.safe_get_in(origin, &path)
                    })
                }),
            )
            .await
        }
        "assoc_in" => {
            let origin = rt.eval_in(&arg(args, 0), env, options).await?;
            let path = rt.eval_in(&arg(args, 1), env, options).await?;
            let expr = arg(args, 2);
            rt.unbox(
                vec![origin, path],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let expr = expr.clone();
                    Box::pin(async move {
                        associate(
                            rt,
                            values[0].clone(),
                            values[1].clone(),
                            &expr,
                            env,
                            &options,
                        )
                        .await
                    })
                }),
            )
            .await
        }
        "cp" => {
            let from = rt.eval_in(&arg(args, 0), env, options).await?;
            let to = rt.eval_in(&arg(args, 1), env, options).await?;
            rt.unbox(
                vec![from, to],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(|rt, values, env, options| {
                    Box::pin(async move {
                        let from = rt.array_values(&values[0])?;
                        let to = rt.array_values(&values[1])?;
                        let mut source = from.first().cloned().unwrap_or(Value::Undefined);
                        let mut target = to.first().cloned().unwrap_or(Value::Undefined);
                        if let Value::String(name) = &source {
                            source = rt.lookup_async(env, name, &options, false).await?;
                        }
                        if let Value::String(name) = &target {
                            target = rt.lookup_async(env, name, &options, false).await?;
                        }
                        let source = rt.ast_literal(source);
                        let target = rt.ast_literal(target);
                        let from_path = rt.array(from.into_iter().skip(1).collect());
                        let from_path = rt.ast_literal(from_path);
                        let to_path = rt.array(to.into_iter().skip(1).collect());
                        let to_path = rt.ast_literal(to_path);
                        let ast =
                            json!(["assoc_in", target, to_path, ["get_in", source, from_path]]);
                        rt.eval_in(&ast, env, &options).await
                    })
                }),
            )
            .await
        }
        "eval_ast" | "eval_lpe" | "str>EVAL" | "strToEVAL" | "rep" => {
            let input = rt.eval_in(&arg(args, 0), env, options).await?;
            let name = name.to_owned();
            rt.unbox(
                vec![input],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let name = name.clone();
                    Box::pin(async move {
                        let input = values[0].clone();
                        let ast = match name.as_str() {
                            "eval_ast" => value_ast(rt, input)?,
                            "eval_lpe" | "str>EVAL" | "strToEVAL" => {
                                rt.parse_source(&rt.to_string(&input))?
                            }
                            _ => serde_json::from_str(&rt.to_string(&input))
                                .map_err(|e| Error::new("SyntaxError", e.to_string()))?,
                        };
                        if name == "rep" {
                            rt.eval_in(&json!(["jsonStringify", ast]), env, &options)
                                .await
                        } else {
                            rt.eval_in(&ast, env, &options).await
                        }
                    })
                }),
            )
            .await
        }
        "set_options" => {
            let value = rt.eval_in(&arg(args, 0), env, options).await?;
            let body = arg(args, 1);
            rt.unbox(
                vec![value],
                StreamContext::new(env, options).with_asts(args),
                Rc::new(move |rt, values, env, options| {
                    let body = body.clone();
                    Box::pin(async move {
                        let value = values[0].clone();
                        let mut json = json!({
                            "resolveString": options.resolve_string,
                            "disallowLibFunctionsGetting": options.disallow_lib_functions_getting,
                            "maxLoopIterations": options.max_loop_iterations,
                            "maxSteps": options.max_steps,
                            "maxDepth": options.max_depth,
                        });
                        let mut values = IndexMap::new();
                        if matches!(value, Value::Array(_)) {
                            for pair in rt.array_values(&value)? {
                                let pair = rt.array_values(&pair)?;
                                let key = rt.to_string(pair.first().unwrap_or(&Value::Undefined));
                                values
                                    .insert(key, pair.get(1).cloned().unwrap_or(Value::Undefined));
                            }
                        } else {
                            for key in rt.keys(&value) {
                                values.insert(key.clone(), rt.get(&value, &key));
                            }
                        }
                        for (key, value) in values {
                            json[&key] = rt.to_json(&value)?;
                        }
                        let options = EvalOptions::from_json(&json).map_err(|error| {
                            if json.get("unsafe") == Some(&Ast::Bool(true)) {
                                crate::security::error(
                                    "Unsafe evaluation cannot be enabled from LPE",
                                )
                            } else {
                                error
                            }
                        })?;
                        rt.eval_in(&body, env, &options).await
                    })
                }),
            )
            .await
        }
        _ => Err(Error::new(
            "UnknownFunction",
            format!("Unknown special form {name}"),
        )),
    }
}

async fn do_loop(
    rt: &mut Runtime,
    mut value: Value,
    args: &[Ast],
    env: EnvId,
    options: &EvalOptions,
    iterations: Rc<Cell<usize>>,
    mut resolved: bool,
) -> Result<Value> {
    loop {
        // A resolver consumes one unbox layer, even if that layer contains a promise.
        if !resolved && matches!(value, Value::Stream(_) | Value::Promise(_)) {
            let asts = args.to_vec();
            return rt
                .unbox(
                    vec![value],
                    StreamContext::new(env, options).with_asts(args),
                    Rc::new(move |rt, values, env, options| {
                        let asts = asts.clone();
                        let iterations = iterations.clone();
                        Box::pin(async move {
                            do_loop(
                                rt,
                                values[0].clone(),
                                &asts,
                                env,
                                &options,
                                iterations,
                                true,
                            )
                            .await
                        })
                    }),
                )
                .await;
        }
        if iterations.get() >= options.max_loop_iterations {
            return Err(Error::new("Error", format!("The maximum number of iterations ({}) is exceeded. Check the condition or change the limit in the settings.", options.max_loop_iterations)));
        }
        iterations.set(iterations.get() + 1);
        rt.tick()?;
        let condition = rt.eval_in(&args[0], env, options).await?;
        if matches!(condition, Value::Stream(_) | Value::Promise(_)) {
            let context = StreamContext::new(env, options)
                .with_asts(args)
                .with_values(vec![value.clone()]);
            let asts = args.to_vec();
            return rt
                .unbox(
                    vec![condition],
                    context,
                    Rc::new(move |rt, values, env, options| {
                        let asts = asts.clone();
                        let value = value.clone();
                        let iterations = iterations.clone();
                        Box::pin(async move {
                            if !values[0].truthy() {
                                return Ok(value);
                            }
                            let value = rt.eval_in(&asts[1], env, &options).await?;
                            do_loop(rt, value, &asts, env, &options, iterations, false).await
                        })
                    }),
                )
                .await;
        }
        if !condition.truthy() {
            return Ok(value);
        }
        value = rt.eval_in(&args[1], env, options).await?;
        resolved = false;
    }
}

async fn associate(
    rt: &mut Runtime,
    origin: Value,
    path: Value,
    expr: &Ast,
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    let keys = rt.array_values(&path)?;
    if keys.is_empty() {
        return Err(Error::new(
            "TypeError",
            "assoc_in path must be a nonempty array",
        ));
    }
    let checked = keys
        .iter()
        .map(|key| rt.safe_key(key))
        .collect::<Result<Vec<_>>>()?;
    let mut focus = origin.clone();
    for index in 0..keys.len().saturating_sub(1) {
        rt.tick()?;
        let key = &checked[index];
        let mut value = rt.get(&focus, key);
        if value == Value::Undefined {
            value = if matches!(keys[index + 1], Value::String(_)) {
                rt.object(IndexMap::new())
            } else {
                rt.array(vec![])
            };
            rt.set(&focus, key, value.clone())?;
        }
        focus = value;
    }
    let key = keys.last().unwrap().clone();
    let focus = rt.ast_literal(focus);
    let key = rt.ast_literal(key);
    let origin = rt.ast_literal(origin);
    rt.eval_in(
        &json!(["begin", ["set", focus, key, expr], origin]),
        env,
        options,
    )
    .await
}

async fn define(
    rt: &mut Runtime,
    args: &[Ast],
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    let mut functions = IndexMap::new();
    let mut statics = lookup(rt, env, "##static", options).await?;
    if !statics.truthy() {
        statics = rt.object(IndexMap::new());
    }
    let mut index = 0;
    while let Some(definition) = args
        .get(index)
        .and_then(Ast::as_array)
        .filter(|a| a.first().is_some_and(array_constructor))
    {
        let body = definition
            .last()
            .and_then(Ast::as_array)
            .filter(|a| {
                a.first()
                    .and_then(Ast::as_str)
                    .is_some_and(|s| matches!(s, "\"" | "'"))
            })
            .ok_or_else(|| {
                Error::new(
                    "Error",
                    "Last argument of define must be <String> (\"func body at quotes\")",
                )
            })?;
        let source = raw_string(rt, &arg(body, 1));
        let key = raw_string(rt, &arg(definition, 1));
        let mut params = vec![];
        let state = rt.object(IndexMap::new());
        rt.set(&statics, &key, state.clone())?;
        for parameter in definition
            .get(2..definition.len().saturating_sub(1))
            .unwrap_or(&[])
        {
            let (name, value) = if let Some(pair) = parameter.as_array() {
                if pair.first().and_then(Ast::as_str) != Some("=") {
                    return Err(Error::new(
                        "Error",
                        "Argument of function must be <name> or <name = defaultValue>",
                    ));
                }
                (arg(pair, 1), rt.eval_in(&arg(pair, 2), env, options).await?)
            } else {
                (parameter.clone(), Value::Undefined)
            };
            let name = name
                .as_str()
                .ok_or_else(|| wrong_type("Function parameter name must be a string"))?;
            if let Some(name) = name.strip_prefix('$') {
                rt.set(&state, name, value)?;
            } else {
                params.push((name.to_owned(), value));
            }
        }
        let body = if source.is_empty() {
            json!(false)
        } else {
            // JS parses define bodies when called, so unused invalid bodies do not fail.
            json!(["eval_lpe", ["\"", source]])
        };
        functions.insert(key, rt.defined_special(params, body, state));
        index += 1;
    }
    let local = rt.new_env(functions, vec![env]);
    let local = rt.new_env(IndexMap::from([("##static".into(), statics)]), vec![local]);
    sequence(rt, &args[index..], local, options).await
}

// Closure construction never evaluates its body and cannot suspend.
pub(crate) fn make_closure(
    rt: &mut Runtime,
    name: &str,
    args: &[Ast],
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    let missing = (args.len() < 2).then(|| json!({"$lpe":"undefined"}));
    let missing = missing.as_ref().unwrap_or(&Ast::Null);
    let first = args.first().unwrap_or(missing);
    let (params, body): (&[Ast], &Ast) = match name {
        "->fn" | "toFn" | "defFn" => (args.get(1..).unwrap_or(&[]), first),
        "fn" => {
            let params = if first.is_string() {
                std::slice::from_ref(first)
            } else if let Some(list) = first.as_array() {
                let skip = usize::from(list.first().is_some_and(array_constructor));
                &list[skip..]
            } else {
                return Err(wrong_type("fn args must be VarName | Array<VarName>"));
            };
            if params.iter().any(|p| !p.is_string()) {
                return Err(wrong_type("fn argument names must be strings"));
            }
            (params, args.get(1).unwrap_or(missing))
        }
        _ => {
            let params = if let Some(list) = first.as_array().filter(|a| {
                a.first()
                    .and_then(Ast::as_str)
                    .is_some_and(|n| matches!(n, "tuple" | "()"))
            }) {
                &list[1..]
            } else {
                std::slice::from_ref(first)
            };
            (params, args.get(1).unwrap_or(missing))
        }
    };
    // Non-string ->fn parameters are ignored, but retain their argument positions.
    let params = params
        .iter()
        .enumerate()
        .map(|(i, p)| {
            p.as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| format!("##ignored-parameter-{i}"))
        })
        .collect();
    let body = rt.share_closure_body(body);
    // Legacy fn binds only supplied arguments and returns callable results directly.
    // Other constructors keep filling missing slots, regardless of the profile.
    let legacy_fn = name == "fn" && rt.legacy_context_enabled();
    Ok(rt.closure_with_params(params, body, env, options.clone(), !legacy_fn, legacy_fn))
}

fn let_scope(rt: &mut Runtime, values: Vec<Value>, kv_array: bool, env: EnvId) -> Result<EnvId> {
    let borrowed = if kv_array {
        None
    } else {
        let value = &values[0];
        if !matches!(value, Value::Array(_)) {
            return rt.env_from_value(value.clone(), vec![env]);
        }
        Some(rt.borrow_array(value)?)
    };
    let pairs = borrowed.as_deref().unwrap_or(&values);
    let mut bindings = IndexMap::with_capacity(pairs.len());
    for pair in pairs {
        let pair = rt.borrow_array(pair)?;
        if pair.len() != 2 {
            return Err(wrong_type("let bindings must contain [key, value] pairs"));
        }
        let Value::String(key) = &pair[0] else {
            return Err(wrong_type("let binding name must be a string"));
        };
        crate::security::key(key)?;
        bindings.insert(key.clone(), pair[1].clone());
    }
    drop(borrowed);
    // Pair bindings are a new lexical scope. They do not expose a backing
    // object, so keep their map directly rather than allocating an extra object.
    Ok(rt.new_child_env(bindings, env))
}
