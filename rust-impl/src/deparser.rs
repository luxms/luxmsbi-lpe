//! Precedence-aware rendering of the JSON-shaped LPE AST.
use crate::{Error, Result};
use serde_json::Value;

const MAX_DEPTH: usize = 96;
const MAX_NODES: usize = 200_000;
const MAX_OUTPUT: usize = 4_194_304;

fn syntax(message: &str) -> Error {
    Error::new("SyntaxError", message)
}
fn omitted(value: &Value) -> bool {
    value
        .as_object()
        .is_some_and(|o| o.len() == 1 && o.get("$lpe").and_then(Value::as_str) == Some("undefined"))
}
fn head(value: &Value) -> Option<&str> {
    value.as_array()?.first()?.as_str()
}
fn callable(op: &str) -> bool {
    matches!(op, "and" | "or" | "nor" | "nand" | "car" | "cdr")
}
fn unary(value: &Value) -> bool {
    value.as_array().is_some_and(|a| {
        a.len() == 2 && matches!(a[0].as_str(), Some("+" | "-" | "#" | "@" | "not"))
    })
}
fn binding(op: &str) -> Option<u8> {
    Some(match op {
        ":" => 2,
        ":=" | "<-" => 20,
        "=>" => 21,
        "and" | "or" | "nor" | "nand" | "car" | "cdr" | "\u{2374}" | "in" | "is" => 30,
        "~" | "!~" | "=" | "==" | "===" | "!==" | "!=" | "<" | "<=" | ">" | ">=" | "<>" | "@" => 40,
        "+" | "-" | "#" => 50,
        "*" | "/" => 60,
        "." | ".." | "->" | "->>" => 70,
        "::" => 90,
        _ => return None,
    })
}
fn priority(value: &Value) -> u8 {
    if unary(value) {
        return 70;
    }
    match head(value) {
        Some(op) if callable(op) && value.as_array().unwrap().len() != 3 => 80,
        Some(op) => binding(op).unwrap_or(100),
        None => 100,
    }
}
fn left_assoc(op: &str) -> bool {
    matches!(
        op,
        "<-" | "=>" | "+" | "-" | "#" | "*" | "/" | "." | ".." | "->" | "->>"
    )
}
fn brackets(value: &Value, bp: u8, right: bool, op: &str) -> bool {
    let child = priority(value);
    !(right && unary(value))
        && (child < bp
            || (child == bp
                && if right {
                    left_assoc(op)
                } else {
                    !unary(value) && !left_assoc(head(value).unwrap_or(""))
                }))
}
fn keyword_start(text: &str) -> bool {
    ["not", "and", "or", "in", "is"].iter().any(|name| {
        text.strip_prefix(name).is_some_and(|tail| {
            !tail
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_alphanumeric() || c == '_')
        })
    })
}

fn number_text(value: &serde_json::Number) -> String {
    ryu_js::Buffer::new()
        .format(value.as_f64().unwrap_or(0.0))
        .to_owned()
}

fn js_string(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => number_text(n),
        Value::String(s) => s.clone(),
        Value::Array(a) => a
            .iter()
            .map(|v| {
                if v.is_null() || omitted(v) {
                    String::new()
                } else {
                    js_string(v)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) if omitted(value) => "undefined".into(),
        Value::Object(_) => "[object Object]".into(),
    }
}

fn push_escaped(result: &mut String, c: char) {
    match c {
        '\n' => result.push_str("\\n"),
        '\r' => result.push_str("\\r"),
        '\t' => result.push_str("\\t"),
        '\u{0008}' => result.push_str("\\b"),
        '\u{000c}' => result.push_str("\\f"),
        '\\' => result.push_str("\\\\"),
        '\'' => result.push_str("\\'"),
        '"' => result.push_str("\\\""),
        c if c < ' ' => result.push_str(&format!("\\u{:04x}", c as u32)),
        c => result.push(c),
    }
}

fn escaped(text: &str) -> String {
    let mut result = String::new();
    for c in text.chars() {
        push_escaped(&mut result, c);
    }
    result
}

struct Renderer {
    lint: bool,
}

impl Renderer {
    fn join(&self, parts: &[String], joiner: &str, indentation: usize) -> Result<String> {
        let bytes = parts.iter().map(String::len).sum::<usize>().saturating_add(
            parts
                .len()
                .saturating_sub(1)
                .saturating_mul(joiner.len() + 1),
        );
        if bytes > MAX_OUTPUT {
            return Err(syntax("Deparser output size limit exceeded."));
        }
        let oneline = parts.join(&format!("{joiner} "));
        if !self.lint || (!oneline.contains('\n') && oneline.encode_utf16().count() <= 120) {
            return Ok(oneline);
        }
        let lines = parts.iter().map(|p| p.split('\n').count()).sum::<usize>();
        if bytes.saturating_add(lines.saturating_sub(1).saturating_mul(indentation)) > MAX_OUTPUT {
            return Err(syntax("Deparser indentation size limit exceeded."));
        }
        let indent = " ".repeat(indentation);
        let result = parts
            .iter()
            .enumerate()
            .map(|(i, part)| {
                part.split('\n')
                    .enumerate()
                    .map(|(j, line)| {
                        if i == 0 && j == 0 {
                            line.into()
                        } else {
                            format!("{indent}{line}")
                        }
                    })
                    .collect::<Vec<String>>()
                    .join("\n")
            })
            .collect::<Vec<_>>()
            .join(&format!("{joiner}\n"));
        Ok(result)
    }

    fn operand(
        &self,
        value: &Value,
        bp: u8,
        right: bool,
        op: &str,
        word_names: bool,
    ) -> Result<String> {
        if !brackets(value, bp, right, op) {
            return self.render(value, word_names);
        }
        if let Some(name) = head(value) {
            if callable(name) || (word_names && matches!(name, "in" | "is" | "not")) {
                let a = value.as_array().unwrap();
                return self.call(&a[0], &a[1..], None, word_names);
            }
        }
        Ok(format!("({})", self.render(value, false)?))
    }

    fn call(
        &self,
        op: &Value,
        args: &[Value],
        rendered: Option<Vec<String>>,
        word_names: bool,
    ) -> Result<String> {
        let name = if op.is_array() {
            self.operand(op, 80, false, "(", word_names)?
        } else {
            js_string(op)
        };
        let parts = match rendered {
            Some(parts) => parts,
            None => args
                .iter()
                .enumerate()
                .map(|(i, arg)| {
                    if omitted(arg) {
                        Ok(String::new())
                    } else {
                        self.render(arg, i > 0)
                    }
                })
                .collect::<Result<Vec<_>>>()?,
        };
        let text = self.join(&parts, ",", name.encode_utf16().count() + 1)?;
        Ok(format!("{name}({text})"))
    }

    fn sexpr(&self, a: &[Value], word_names: bool) -> Result<String> {
        let op = a[0].as_str().unwrap_or("");
        let args = &a[1..];
        if op == "\"" || op == "'" {
            let text = args
                .first()
                .and_then(Value::as_str)
                .ok_or_else(|| syntax("String literal requires a string payload."))?;
            let prefix = args
                .get(1)
                .filter(|v| !v.is_null())
                .map(js_string)
                .unwrap_or_default();
            let text = if prefix == "r" {
                text.to_owned()
            } else {
                escaped(text)
            };
            return Ok(format!("{prefix}{op}{text}{op}"));
        }
        if op == "[]" {
            let text = args
                .first()
                .map(js_string)
                .unwrap_or_else(|| "undefined".into());
            let prefix = args
                .get(1)
                .filter(|v| !v.is_null())
                .map(js_string)
                .unwrap_or_default();
            return Ok(format!("{prefix}[{text}]"));
        }
        if matches!(op, "[" | "()" | "tuple") {
            let parts = args
                .iter()
                .map(|v| self.render(v, false))
                .collect::<Result<Vec<_>>>()?;
            let text = if op == "tuple" && args.is_empty() {
                ",".into()
            } else if op == "tuple" && args.len() == 1 {
                format!("{},", parts[0])
            } else {
                parts.join(", ")
            };
            return Ok(if op == "[" {
                format!("[{text}]")
            } else {
                format!("({text})")
            });
        }
        if op == "let*" && args.len() == 2 {
            if let Some(bindings) = args[0].as_array().filter(|b| {
                b.len() > 1
                    && b[0] == "["
                    && b[1..]
                        .iter()
                        .all(|v| v.as_array().is_some_and(|a| a.len() == 3 && a[0] == "["))
            }) {
                let separator = if self.lint { "\n" } else { " " };
                let vars = bindings[1..]
                    .iter()
                    .map(|b| {
                        Ok(format!(
                            "VAR {} = {}",
                            js_string(&b[1]),
                            self.render(&b[2], false)?
                        ))
                    })
                    .collect::<Result<Vec<_>>>()?;
                return Ok(format!(
                    "{}{separator}RETURN {}",
                    vars.join(separator),
                    self.render(&args[1], false)?
                ));
            }
        }
        if a.len() == 2 && matches!(op, "+" | "-" | "#" | "@" | "not") {
            let text = self.operand(&args[0], 70, true, "unary", false)?;
            let operator = if op == "not" { "!" } else { op };
            return Ok(format!(
                "{}{}{}",
                operator,
                if op == "-" && text.starts_with('-') {
                    " "
                } else {
                    ""
                },
                text
            ));
        }
        if word_names && matches!(op, "in" | "is") {
            return self.call(&a[0], args, None, false);
        }
        if let Some(bp) = binding(op) {
            if callable(op)
                && (args.len() != 2
                    || args
                        .iter()
                        .enumerate()
                        .any(|(i, arg)| brackets(arg, bp, i > 0, op)))
            {
                return self.call(&a[0], args, None, false);
            }
            let parts = args
                .iter()
                .enumerate()
                .map(|(i, arg)| self.operand(arg, bp, i > 0, op, i == 0 && word_names))
                .collect::<Result<Vec<_>>>()?;
            if callable(op) && parts.get(1).is_some_and(|s| keyword_start(s)) {
                return self.call(&a[0], args, Some(parts), false);
            }
            if op == "." {
                let mut parts = parts.into_iter();
                let mut text = parts
                    .next()
                    .ok_or_else(|| syntax("Dot expression requires an operand."))?;
                for part in parts {
                    if text.ends_with(|c: char| c.is_ascii_digit()) {
                        text.push(' ');
                    }
                    text.push('.');
                    text.push_str(&part);
                }
                return Ok(text);
            }
            let spelling = match op {
                "and" => "&&",
                "or" => "||",
                "nor" => "\u{2371}",
                "nand" => "\u{2372}",
                "car" => "\u{22a3}",
                "cdr" => "\u{22a2}",
                _ => op,
            };
            return self.join(&parts, &format!(" {spelling}"), 0);
        }
        self.call(&a[0], args, None, word_names)
    }

    fn render(&self, value: &Value, word_names: bool) -> Result<String> {
        let text = match value {
            Value::Array(a) if a.is_empty() => "[]".into(),
            Value::Array(a) => self.sexpr(a, word_names)?,
            _ => js_string(value),
        };
        if text.len() > MAX_OUTPUT {
            return Err(syntax("Deparser output size limit exceeded."));
        }
        Ok(text)
    }
}

/// Render an LPE AST with the same precedence and spelling rules as the JS deparser.
pub fn deparse(ast: &Value) -> Result<String> {
    deparse_with_options(ast, &Value::Null)
}

/// `lint` enables multiline rendering of long argument lists and VAR blocks.
pub fn deparse_with_options(ast: &Value, options: &Value) -> Result<String> {
    // Validate iteratively before recursive rendering, including caller-constructed trees.
    let mut pending = vec![(ast, 0usize)];
    let mut nodes = 0usize;
    let mut bytes = 0usize;
    while let Some((value, depth)) = pending.pop() {
        nodes += 1;
        if depth > MAX_DEPTH || nodes > MAX_NODES {
            return Err(syntax("Deparser AST limit exceeded."));
        }
        match value {
            Value::String(s) => bytes = bytes.saturating_add(s.len()),
            Value::Array(a) => pending.extend(a.iter().map(|v| (v, depth + 1))),
            Value::Object(o) => pending.extend(o.values().map(|v| (v, depth + 1))),
            _ => {}
        }
        if bytes > MAX_OUTPUT || pending.len() > MAX_NODES {
            return Err(syntax("Deparser AST size limit exceeded."));
        }
    }
    let renderer = Renderer {
        lint: options
            .get("lint")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    };
    if let Some(a) = ast.as_array().filter(|a| a.len() > 2 && a[0] == "begin") {
        let args = &a[1..];
        let parts = args
            .iter()
            .map(|arg| renderer.render(arg, false))
            .collect::<Result<Vec<_>>>()?;
        if args.iter().any(omitted) || parts.iter().any(|p| keyword_start(p)) {
            return renderer.call(&a[0], args, None, false);
        }
        let text = parts.join(if renderer.lint { ";\n" } else { "; " });
        if text.len() > MAX_OUTPUT {
            return Err(syntax("Deparser output size limit exceeded."));
        }
        return Ok(text);
    }
    renderer.render(ast, false)
}
