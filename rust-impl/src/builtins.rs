use crate::regexp::RegExp;
use crate::{Error, Result, Runtime, Value};
use chrono::{SecondsFormat, TimeZone, Utc};
use futures::{future::LocalBoxFuture, FutureExt};
use indexmap::IndexMap;
use std::cmp::Ordering;

pub fn names() -> &'static [&'static str] {
    &[
        "+",
        "add",
        "plus",
        "-",
        "minus",
        "subtract",
        "*",
        "mul",
        "multiply",
        "/",
        "div",
        "divide",
        "rand",
        "max",
        "min",
        "=",
        "eq",
        "equal",
        "==",
        "===",
        "strictEq",
        "!=",
        "neq",
        "ne",
        "!==",
        "strictNe",
        "not",
        "!",
        "->any",
        "toAny",
        "->bool",
        "toBool",
        "->int",
        "toInt",
        "toNumber",
        "->str",
        "toStr",
        "read-string",
        "jsonParse",
        "json_parse",
        "jsonStringify",
        "isa",
        "type",
        "classOf",
        "null?",
        "isNull",
        "undefined?",
        "isUndef",
        "isUndefined",
        "true?",
        "isTrue",
        "false?",
        "isFalse",
        "bool?",
        "isBool",
        "number?",
        "isNumber",
        "numberlike?",
        "isNumberLike",
        "string?",
        "isString",
        "list?",
        "isArray",
        "hash?",
        "isHash",
        "obj?",
        "isObj",
        "func?",
        "isFunction",
        "pr_str",
        "jsonJoin",
        "str",
        "lower",
        "upper",
        "split",
        "words",
        "indexOf",
        "re_match",
        "trim",
        "trimStart",
        "trimEnd",
        "padStart",
        "padEnd",
        "replace",
        "replaceAll",
        "startsWith",
        "endsWith",
        "includes",
    ]
}

fn arg(args: &[Value], index: usize) -> &Value {
    args.get(index).unwrap_or(&Value::Undefined)
}

fn string_receiver(value: &Value) -> Result<Vec<u16>> {
    match value {
        Value::String(s) => Ok(s.encode_utf16().collect()),
        Value::Utf16(s) => Ok(s.clone()),
        _ => Err(Error::new(
            "TypeError",
            "String method requires a string receiver",
        )),
    }
}

fn primitive(rt: &Runtime, value: &Value, numeric_hint: bool) -> Value {
    match value {
        Value::Date(n) if numeric_hint => Value::Number(*n as f64),
        Value::Array(_)
        | Value::Object(_)
        | Value::Date(_)
        | Value::Promise(_)
        | Value::Stream(_) => rt.string_from_utf16(rt.to_utf16(value)),
        _ if value.is_callable() => Value::String(rt.to_string(value)),
        _ => value.clone(),
    }
}

fn compare(rt: &Runtime, a: &Value, b: &Value) -> Option<Ordering> {
    let a = primitive(rt, a, true);
    let b = primitive(rt, b, true);
    if matches!(a, Value::String(_) | Value::Utf16(_))
        && matches!(b, Value::String(_) | Value::Utf16(_))
    {
        Some(rt.to_utf16(&a).cmp(&rt.to_utf16(&b)))
    } else {
        rt.to_number(&a).partial_cmp(&rt.to_number(&b))
    }
}

fn add(rt: &Runtime, a: &Value, b: &Value) -> Value {
    let a = if a.is_callable() {
        Value::String("undefined".into())
    } else {
        primitive(rt, a, false)
    };
    let b = if b.is_callable() {
        Value::String("undefined".into())
    } else {
        primitive(rt, b, false)
    };
    if matches!(a, Value::String(_) | Value::Utf16(_))
        || matches!(b, Value::String(_) | Value::Utf16(_))
    {
        rt.string_from_utf16([rt.to_utf16(&a), rt.to_utf16(&b)].concat())
    } else {
        Value::Number(rt.to_number(&a) + rt.to_number(&b))
    }
}

fn number_like(value: &Value) -> bool {
    match value {
        Value::Number(_) => true,
        Value::Utf16(units) => {
            String::from_utf16(units).is_ok_and(|s| number_like(&Value::String(s)))
        }
        Value::String(s) => {
            let (whole, fraction) = s
                .split_once('.')
                .map_or((s.as_str(), None), |(a, b)| (a, Some(b)));
            !whole.is_empty()
                && whole.bytes().all(|b| b.is_ascii_digit())
                && (whole == "0" || !whole.starts_with('0'))
                && fraction.is_none_or(|s| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit()))
        }
        _ => false,
    }
}

fn class_name(value: &Value) -> &'static str {
    match value {
        Value::Undefined => "Undefined",
        Value::Null => "Null",
        Value::Bool(_) => "Boolean",
        Value::Number(_) => "Number",
        Value::String(_) | Value::Utf16(_) => "String",
        Value::Array(_) => "Array",
        Value::Object(_) => "Object",
        Value::Stream(_) => "Object",
        Value::Date(_) => "Date",
        Value::Promise(_) => "Promise",
        _ => "Function",
    }
}

fn instance_of(value: &Value, constructor: &Value) -> Result<bool> {
    match constructor {
        Value::Builtin(name) => match name.as_str() {
            "Array" => Ok(matches!(value, Value::Array(_))),
            "Object" => Ok(matches!(
                value,
                Value::Array(_)
                    | Value::Object(_)
                    | Value::Date(_)
                    | Value::Promise(_)
                    | Value::Stream(_)
            ) || value.is_callable()),
            "Date" => Ok(matches!(value, Value::Date(_))),
            "Function" => Ok(value.is_callable()),
            "String" | "Number" | "Boolean" => Ok(false),
            _ => Err(Error::new(
                "TypeError",
                "Right-hand side of instanceof is not a constructor",
            )),
        },
        Value::Function(_) => Err(Error::new(
            "Unsupported",
            "Custom constructor prototypes are not portable LPE values",
        )),
        _ => Err(Error::new(
            "TypeError",
            "Right-hand side of instanceof is not a constructor",
        )),
    }
}

// Runtime JSON is tagged interchange; these functions implement JSON.stringify instead.
fn json_value<'a>(
    rt: &'a mut Runtime,
    mut value: Value,
    key: String,
    parents: &'a mut Vec<(bool, usize)>,
) -> LocalBoxFuture<'a, Result<Option<serde_json::Value>>> {
    async move {
        use serde_json::Value as J;
        rt.tick()?;
        if parents.len() >= 256 {
            return Err(Error::new("RangeError", "JSON nesting limit exceeded"));
        }
        if matches!(
            value,
            Value::Array(_) | Value::Object(_) | Value::Date(_) | Value::Promise(_)
        ) || value.is_callable()
        {
            let method = rt.get(&value, "toJSON");
            if method.is_callable() {
                let env = rt.global_env();
                value = rt.call_value(method, vec![Value::String(key)], env).await?;
            }
        }
        Ok(Some(match &value {
            Value::Undefined | Value::Function(_) | Value::Builtin(_) | Value::Special(_) => {
                return Ok(None)
            }
            Value::Null => J::Null,
            Value::Bool(b) => J::Bool(*b),
            Value::Number(n) => serde_json::Number::from_f64(*n)
                .map(J::Number)
                .unwrap_or(J::Null),
            Value::String(_) | Value::Utf16(_) => {
                J::String(encode_units(&rt.to_utf16(&value), false, 0xf0000))
            }
            Value::Promise(_) => J::Object(serde_json::Map::new()),
            Value::Stream(_) => {
                return Err(Error::new(
                    "TypeError",
                    "Streams cannot be serialized; read the current value explicitly",
                ))
            }
            Value::Date(ms) => match Utc.timestamp_millis_opt(*ms).single() {
                Some(date) => J::String(date.to_rfc3339_opts(SecondsFormat::Millis, true)),
                None => J::Null,
            },
            Value::Array(id) | Value::Object(id) => {
                let key = (matches!(value, Value::Array(_)), *id);
                if parents.contains(&key) {
                    return Err(Error::new(
                        "TypeError",
                        "Converting circular structure to JSON",
                    ));
                }
                parents.push(key);
                let result = if key.0 {
                    let mut values = Vec::new();
                    let length = rt.array_values(&value)?.len();
                    for index in 0..length {
                        let key = index.to_string();
                        let item = rt.get(&value, &key);
                        values.push(json_value(rt, item, key, parents).await?.unwrap_or(J::Null));
                    }
                    J::Array(values)
                } else {
                    let mut values = serde_json::Map::new();
                    for key in ordered_keys(rt, &value) {
                        let item = rt.get(&value, &key);
                        if let Some(item) = json_value(rt, item, key.clone(), parents).await? {
                            values.insert(key, item);
                        }
                    }
                    J::Object(values)
                };
                parents.pop();
                result
            }
        }))
    }
    .boxed_local()
}

fn ordered_keys(rt: &Runtime, value: &Value) -> Vec<String> {
    let mut keys = rt.keys(value);
    keys.sort_by_key(|key| {
        key.parse::<u32>()
            .ok()
            .filter(|n| *n != u32::MAX && n.to_string() == *key)
            .map_or((1, 0), |n| (0, n))
    });
    keys
}

fn write_json(rt: &Runtime, value: &serde_json::Value, out: &mut String) -> Result<()> {
    use serde_json::Value as J;
    match value {
        J::String(text) => out.push_str(&quote_units(&decode_units(text, 0xf0000))),
        J::Number(n) => out.push_str(&rt.to_string(&Value::Number(n.as_f64().unwrap_or(f64::NAN)))),
        J::Array(values) => {
            out.push('[');
            for (i, value) in values.iter().enumerate() {
                if i != 0 {
                    out.push(',');
                }
                write_json(rt, value, out)?;
            }
            out.push(']');
        }
        J::Object(values) => {
            out.push('{');
            for (i, (key, value)) in values.iter().enumerate() {
                if i != 0 {
                    out.push(',');
                }
                out.push_str(
                    &serde_json::to_string(key)
                        .map_err(|e| Error::new("TypeError", e.to_string()))?,
                );
                out.push(':');
                write_json(rt, value, out)?;
            }
            out.push('}');
        }
        _ => out.push_str(
            &serde_json::to_string(value).map_err(|e| Error::new("TypeError", e.to_string()))?,
        ),
    }
    Ok(())
}

async fn stringify(rt: &mut Runtime, value: &Value) -> Result<Option<String>> {
    let Some(value) = json_value(rt, value.clone(), String::new(), &mut Vec::new()).await? else {
        return Ok(None);
    };
    let mut text = String::new();
    write_json(rt, &value, &mut text)?;
    Ok(Some(text))
}

fn parse_json(rt: &mut Runtime, value: &Value) -> Result<Value> {
    let source = prepare_json(&rt.to_utf16(value))?;
    let json: serde_json::Value = serde_json::from_str(&source).map_err(|e| {
        let message = e.to_string();
        Error::new(
            if message.contains("surrogate") {
                "UnicodeError"
            } else {
                "SyntaxError"
            },
            message,
        )
    })?;
    // Do not interpret runtime interchange tags in user JSON objects.
    fn convert(rt: &mut Runtime, value: serde_json::Value) -> Result<Value> {
        rt.tick()?;
        Ok(match value {
            serde_json::Value::Null => Value::Null,
            serde_json::Value::Bool(b) => Value::Bool(b),
            serde_json::Value::Number(n) => Value::Number(
                n.as_f64()
                    .or_else(|| n.to_string().parse().ok())
                    .ok_or_else(|| Error::new("SyntaxError", "Invalid JSON number"))?,
            ),
            serde_json::Value::String(s) => rt.string_from_utf16(decode_units(&s, 0xf0000)),
            serde_json::Value::Array(a) => {
                let values = a
                    .into_iter()
                    .map(|v| convert(rt, v))
                    .collect::<Result<Vec<_>>>()?;
                rt.array(values)
            }
            serde_json::Value::Object(o) => {
                let values = o
                    .into_iter()
                    .map(|(k, v)| Ok((from_utf16(&decode_units(&k, 0xf0000))?, convert(rt, v)?)))
                    .collect::<Result<IndexMap<_, _>>>()?;
                rt.object(values)
            }
        })
    }
    convert(rt, json)
}

fn js_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\x0b' | '\x0c' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
    )
}

fn from_utf16(units: &[u16]) -> Result<String> {
    String::from_utf16(units).map_err(|_| {
        Error::new(
            "UnicodeError",
            "Object key contains an unpaired UTF-16 surrogate",
        )
    })
}

fn quote_units(units: &[u16]) -> String {
    let mut output = String::from("\"");
    for decoded in char::decode_utf16(units.iter().copied()) {
        match decoded {
            Err(e) => output.push_str(&format!("\\u{:04x}", e.unpaired_surrogate())),
            Ok('"') => output.push_str("\\\""),
            Ok('\\') => output.push_str("\\\\"),
            Ok('\n') => output.push_str("\\n"),
            Ok('\r') => output.push_str("\\r"),
            Ok('\t') => output.push_str("\\t"),
            Ok('\x08') => output.push_str("\\b"),
            Ok('\x0c') => output.push_str("\\f"),
            Ok(c) if c < ' ' => output.push_str(&format!("\\u{:04x}", c as u32)),
            Ok(c) => output.push(c),
        }
    }
    output.push('"');
    output
}

// Encode only JSON string tokens before serde parses the structure. This keeps
// serde's grammar/number validation while preserving all JS UTF-16 strings.
fn prepare_json(units: &[u16]) -> Result<String> {
    let mut output = String::new();
    let mut index = 0;
    while index < units.len() {
        let unit = units[index];
        index += 1;
        if unit != u16::from(b'"') {
            let c = char::from_u32(u32::from(unit))
                .ok_or_else(|| Error::new("SyntaxError", "Invalid JSON token"))?;
            output.push(c);
            continue;
        }
        let mut content = Vec::new();
        let mut closed = false;
        while index < units.len() {
            let unit = units[index];
            index += 1;
            if unit == u16::from(b'"') {
                closed = true;
                break;
            }
            if unit == u16::from(b'\\') {
                let escaped = *units
                    .get(index)
                    .ok_or_else(|| Error::new("SyntaxError", "Unterminated JSON escape"))?;
                index += 1;
                content.push(match escaped {
                    34 | 47 | 92 => escaped,
                    98 => 8,
                    102 => 12,
                    110 => 10,
                    114 => 13,
                    116 => 9,
                    117 => {
                        let mut value = 0u16;
                        for _ in 0..4 {
                            let unit = *units.get(index).ok_or_else(|| {
                                Error::new("SyntaxError", "Invalid JSON Unicode escape")
                            })?;
                            let digit = char::from_u32(u32::from(unit))
                                .and_then(|c| c.to_digit(16))
                                .ok_or_else(|| {
                                    Error::new("SyntaxError", "Invalid JSON Unicode escape")
                                })?;
                            index += 1;
                            value = value * 16 + digit as u16;
                        }
                        value
                    }
                    _ => return Err(Error::new("SyntaxError", "Invalid JSON escape")),
                });
            } else if unit < 32 {
                return Err(Error::new(
                    "SyntaxError",
                    "Control character in JSON string",
                ));
            } else {
                content.push(unit);
            }
        }
        if !closed {
            return Err(Error::new("SyntaxError", "Unterminated JSON string"));
        }
        output.push_str(
            &serde_json::to_string(&encode_units(&content, false, 0xf0000))
                .map_err(|e| Error::new("SyntaxError", e.to_string()))?,
        );
    }
    Ok(output)
}

fn change_case(units: &[u16], upper: bool) -> Vec<u16> {
    let mut output = Vec::new();
    let mut text = String::new();
    for decoded in char::decode_utf16(units.iter().copied()) {
        match decoded {
            Ok(c) => text.push(c),
            Err(e) => {
                output.extend(
                    if upper {
                        text.to_uppercase()
                    } else {
                        text.to_lowercase()
                    }
                    .encode_utf16(),
                );
                text.clear();
                output.push(e.unpaired_surrogate());
            }
        }
    }
    output.extend(
        if upper {
            text.to_uppercase()
        } else {
            text.to_lowercase()
        }
        .encode_utf16(),
    );
    output
}

fn index_of(rt: &Runtime, text: &[u16], search: &Value, start: &Value) -> f64 {
    let search = rt.to_utf16(search);
    let start = rt.to_number(start).max(0.0).min(text.len() as f64) as usize;
    if search.is_empty() {
        return start as f64;
    }
    text[start..]
        .windows(search.len())
        .position(|s| s == search)
        .map_or(-1.0, |i| (start + i) as f64)
}

fn pad(rt: &mut Runtime, text: &[u16], length: &Value, fill: &Value, start: bool) -> Result<Value> {
    let length = rt.to_number(length).max(0.0).floor();
    let text_units = text.to_vec();
    let fill = if matches!(fill, Value::Undefined) {
        vec![32]
    } else {
        rt.to_utf16(fill)
    };
    if length <= text_units.len() as f64 || fill.is_empty() {
        return Ok(rt.string_from_utf16(text.into()));
    }
    if length > usize::MAX as f64 {
        return Err(Error::new("RangeError", "Invalid string length"));
    }
    let mut padding = Vec::new();
    for i in 0..(length as usize - text_units.len()) {
        rt.tick()?;
        padding.push(fill[i % fill.len()]);
    }
    let units = if start {
        [padding, text_units].concat()
    } else {
        [text_units, padding].concat()
    };
    Ok(rt.string_from_utf16(units))
}

fn substitution(replacement: &[u16], matched: &[u16], prefix: &[u16], suffix: &[u16]) -> Vec<u16> {
    let mut output = Vec::new();
    let mut chars = replacement.iter().copied().peekable();
    while let Some(c) = chars.next() {
        if c == 36 {
            let subst = match chars.peek() {
                Some(36) => Some(&[36][..]),
                Some(38) => Some(matched),
                Some(96) => Some(prefix),
                Some(39) => Some(suffix),
                _ => None,
            };
            if let Some(subst) = subst {
                chars.next();
                output.extend_from_slice(subst);
                continue;
            }
        }
        output.push(c);
    }
    output
}

async fn replace(
    rt: &mut Runtime,
    text: &[u16],
    search: &Value,
    replacement: &Value,
    all: bool,
) -> Result<Value> {
    let search = rt.to_utf16(search);
    let template = if replacement.is_callable() {
        None
    } else {
        Some(rt.to_utf16(replacement))
    };
    let units = text;
    let needle = &search;
    let mut output = Vec::new();
    let mut cursor = 0;
    let mut next = 0;
    while next <= units.len() {
        rt.tick()?;
        let position = if needle.is_empty() {
            Some(next)
        } else {
            units[next..]
                .windows(needle.len())
                .position(|s| s == needle.as_slice())
                .map(|i| next + i)
        };
        let Some(position) = position else { break };
        let end = position + needle.len();
        output.extend_from_slice(&units[cursor..position]);
        let replacement = if let Some(template) = &template {
            substitution(template, &search, &units[..position], &units[end..])
        } else {
            let env = rt.global_env();
            let value = rt
                .call_value(
                    replacement.clone(),
                    vec![
                        rt.string_from_utf16(search.clone()),
                        Value::Number(position as f64),
                        rt.string_from_utf16(text.into()),
                    ],
                    env,
                )
                .await?;
            rt.to_utf16(&value)
        };
        output.extend(replacement);
        cursor = end;
        if !all {
            break;
        }
        next = if needle.is_empty() { end + 1 } else { end };
    }
    output.extend_from_slice(&units[cursor..]);
    Ok(rt.string_from_utf16(output))
}

// Preserve code units while passing JSON strings through serde_json.
fn encode_units(units: &[u16], unicode: bool, base: u32) -> String {
    let scalars = if unicode {
        char::decode_utf16(units.iter().copied())
            .map(|c| match c {
                Ok(c) => c as u32,
                Err(e) => base + u32::from(e.unpaired_surrogate() - 0xd800),
            })
            .collect::<Vec<_>>()
    } else {
        units
            .iter()
            .map(|unit| {
                if (0xd800..=0xdfff).contains(unit) {
                    base + u32::from(*unit - 0xd800)
                } else {
                    u32::from(*unit)
                }
            })
            .collect()
    };
    scalars.into_iter().filter_map(char::from_u32).collect()
}

fn decode_units(text: &str, base: u32) -> Vec<u16> {
    let mut units = Vec::new();
    for c in text.chars() {
        if (base..base + 2048).contains(&(c as u32)) {
            units.push((c as u32 - base + 0xd800) as u16);
        } else {
            units.extend(c.encode_utf16(&mut [0; 2]).iter().copied());
        }
    }
    units
}

fn regex_match(
    rt: &mut Runtime,
    text: &[u16],
    pattern: &Value,
    flags: &Value,
    words: bool,
) -> Result<Value> {
    let pattern = if matches!(pattern, Value::Undefined) {
        if words {
            "-*[a-zA-Z\u{430}-\u{44f}\u{410}-\u{42f}\u{451}\u{401}_0-9][a-zA-Z\u{430}-\u{44f}\u{410}-\u{42f}\u{451}\u{401}_0-9-]*".encode_utf16().collect()
        } else {
            Vec::new()
        }
    } else {
        rt.to_utf16(pattern)
    };
    let flags = if words {
        "g".into()
    } else if matches!(flags, Value::Undefined) {
        String::new()
    } else {
        rt.to_string(flags)
    };
    let regex = RegExp::from_utf16(&pattern, &flags)?;
    let mut values = Vec::new();
    let mut offset = 0;
    while offset <= text.len() {
        rt.tick()?;
        let Some(found) = regex.find(text, offset) else {
            break;
        };
        if regex.global {
            values.push(rt.string_from_utf16(text[found.range()].into()));
        } else {
            let mut capture_values = Vec::new();
            let mut index_values = Vec::new();
            for capture in found.groups() {
                rt.tick()?;
                capture_values.push(match &capture {
                    Some(range) => rt.string_from_utf16(text[range.clone()].into()),
                    None => Value::Undefined,
                });
                if regex.indices {
                    index_values.push(match capture {
                        Some(range) => rt.array(vec![
                            Value::Number(range.start as f64),
                            Value::Number(range.end as f64),
                        ]),
                        None => Value::Undefined,
                    });
                }
            }
            let mut groups = IndexMap::new();
            let mut group_indices = IndexMap::new();
            for (index, name) in found.capture_group_names().iter().enumerate() {
                rt.tick()?;
                if name.is_empty() {
                    continue;
                }
                let value = &capture_values[index + 1];
                // Duplicate names may occur in disjoint alternatives. Retain the
                // participating capture and share the numbered indices array.
                if !groups.contains_key(name.as_ref()) || !matches!(value, Value::Undefined) {
                    groups.insert(name.to_string(), value.clone());
                    if regex.indices {
                        group_indices.insert(name.to_string(), index_values[index + 1].clone());
                    }
                }
            }
            let result = rt.array(capture_values);
            rt.set(&result, "index", Value::Number(found.start() as f64))?;
            rt.set(&result, "input", rt.string_from_utf16(text.into()))?;
            let groups = if groups.is_empty() {
                Value::Undefined
            } else {
                rt.object(groups)
            };
            rt.set(&result, "groups", groups)?;
            if regex.indices {
                let indices = rt.array(index_values);
                let groups = if group_indices.is_empty() {
                    Value::Undefined
                } else {
                    rt.object(group_indices)
                };
                rt.set(&indices, "groups", groups)?;
                rt.set(&result, "indices", indices)?;
            }
            return Ok(result);
        }
        offset = found.end();
        if found.start() == found.end() {
            offset = regex.advance_index(text, offset);
        }
    }
    Ok(if values.is_empty() && !words {
        Value::Null
    } else {
        rt.array(values)
    })
}

pub async fn call(rt: &mut Runtime, name: &str, args: &[Value]) -> Result<Option<Value>> {
    if !names().contains(&name) {
        return Ok(None);
    }
    rt.tick()?;
    let a = arg(args, 0);
    let b = arg(args, 1);
    let c = arg(args, 2);
    let value = match name {
        "+" | "add" | "plus" | "-" | "minus" | "subtract" | "*" | "mul" | "multiply" | "/"
        | "div" | "divide" => {
            let mut value = args.first().cloned().ok_or_else(|| {
                Error::new("TypeError", "Reduce of empty array with no initial value")
            })?;
            let op = match name {
                "+" | "add" | "plus" => '+',
                "-" | "minus" | "subtract" => '-',
                "*" | "mul" | "multiply" => '*',
                _ => '/',
            };
            if args.len() == 1 && op == '-' {
                value = Value::Number(-rt.to_number(&value));
            }
            if args.len() == 1 && op == '/' {
                value = Value::Number(1.0 / rt.to_number(&value));
            }
            for next in &args[1..] {
                rt.tick()?;
                value = match op {
                    '+' => add(rt, &value, next),
                    '-' => Value::Number(rt.to_number(&value) - rt.to_number(next)),
                    '*' => Value::Number(rt.to_number(&value) * rt.to_number(next)),
                    _ => Value::Number(rt.to_number(&value) / rt.to_number(next)),
                };
            }
            value
        }
        "rand" => Value::Number(rand::random::<f64>()),
        "max" | "min" => {
            if matches!(a, Value::Array(_)) {
                let present = rt
                    .keys(a)
                    .into_iter()
                    .collect::<std::collections::HashSet<_>>();
                let values = rt
                    .array_values(a)?
                    .into_iter()
                    .enumerate()
                    .filter_map(|(i, value)| present.contains(&i.to_string()).then_some(value))
                    .collect::<Vec<_>>();
                let mut value = values.first().cloned().ok_or_else(|| {
                    Error::new("TypeError", "Reduce of empty array with no initial value")
                })?;
                let keep = if name == "max" {
                    Some(Ordering::Greater)
                } else {
                    Some(Ordering::Less)
                };
                for next in &values[1..] {
                    rt.tick()?;
                    if compare(rt, &value, next) != keep {
                        value = next.clone();
                    }
                }
                value
            } else {
                rt.array(Vec::new())
            }
        }
        "=" | "eq" | "equal" | "==" | "===" | "strictEq" | "!=" | "neq" | "ne" | "!=="
        | "strictNe" => {
            let strict = matches!(name, "===" | "strictEq" | "!==" | "strictNe");
            let invert = matches!(name, "!=" | "neq" | "ne" | "!==" | "strictNe");
            let mut equal = true;
            for value in args {
                rt.tick()?;
                if !rt.equal(value, a, strict) {
                    equal = false;
                    break;
                }
            }
            Value::Bool(equal != invert)
        }
        "not" | "!" => Value::Bool(!a.truthy()),
        "->any" | "toAny" => a.clone(),
        "->bool" | "toBool" => Value::Bool(a.truthy()),
        "->int" | "toInt" | "toNumber" => Value::Number(rt.to_number(a)),
        "->str" | "toStr" => rt.string_from_utf16(rt.to_utf16(a)),
        "read-string" | "jsonParse" | "json_parse" => parse_json(rt, a)?,
        "jsonStringify" => stringify(rt, a)
            .await?
            .map(Value::String)
            .unwrap_or(Value::Undefined),
        "isa" => Value::Bool(instance_of(a, b)?),
        "type" => Value::String(a.type_name().into()),
        "classOf" => Value::String(format!("[object {}]", class_name(a))),
        "null?" | "isNull" => Value::Bool(a.is_nullish()),
        "undefined?" | "isUndef" | "isUndefined" => Value::Bool(matches!(a, Value::Undefined)),
        "true?" | "isTrue" => Value::Bool(matches!(a, Value::Bool(true))),
        "false?" | "isFalse" => Value::Bool(matches!(a, Value::Bool(false))),
        "bool?" | "isBool" => Value::Bool(matches!(a, Value::Bool(_))),
        "number?" | "isNumber" => Value::Bool(matches!(a, Value::Number(_))),
        "numberlike?" | "isNumberLike" => Value::Bool(number_like(a)),
        "string?" | "isString" => Value::Bool(matches!(a, Value::String(_) | Value::Utf16(_))),
        "list?" | "isArray" => Value::Bool(matches!(a, Value::Array(_))),
        "hash?" | "isHash" => Value::Bool(matches!(
            a,
            Value::Object(_) | Value::Date(_) | Value::Promise(_) | Value::Stream(_)
        )),
        "obj?" | "isObj" => Value::Bool(matches!(
            a,
            Value::Array(_)
                | Value::Object(_)
                | Value::Date(_)
                | Value::Promise(_)
                | Value::Stream(_)
        )),
        "func?" | "isFunction" => Value::Bool(a.is_callable()),
        "str" | "pr_str" | "jsonJoin" => {
            let mut output = Vec::new();
            for (i, value) in args.iter().enumerate() {
                rt.tick()?;
                if i != 0 && name != "str" {
                    output.push(32);
                }
                let part = if name == "str" {
                    match value {
                        Value::String(_) | Value::Utf16(_) => rt.to_utf16(value),
                        value if value.is_callable() => {
                            let name = rt.get(value, "lpeName");
                            if name.is_nullish() {
                                Vec::new()
                            } else {
                                rt.to_utf16(&name)
                            }
                        }
                        _ => stringify(rt, value)
                            .await?
                            .unwrap_or_default()
                            .encode_utf16()
                            .collect(),
                    }
                } else {
                    stringify(rt, value)
                        .await?
                        .unwrap_or_default()
                        .encode_utf16()
                        .collect()
                };
                output.extend(part);
            }
            rt.string_from_utf16(output)
        }
        "lower" | "upper" => {
            rt.string_from_utf16(change_case(&string_receiver(a)?, name == "upper"))
        }
        "trim" | "trimStart" | "trimEnd" => {
            let text = string_receiver(a)?;
            let mut start = 0;
            let mut end = text.len();
            if name != "trimEnd" {
                while start < end && char::from_u32(u32::from(text[start])).is_some_and(js_space) {
                    start += 1;
                }
            }
            if name != "trimStart" {
                while start < end && char::from_u32(u32::from(text[end - 1])).is_some_and(js_space)
                {
                    end -= 1;
                }
            }
            rt.string_from_utf16(text[start..end].to_vec())
        }
        "split" => {
            let text = string_receiver(a)?;
            let mut values = Vec::new();
            if matches!(b, Value::Undefined) {
                values.push(a.clone());
            } else {
                let sep = rt.to_utf16(b);
                if sep.is_empty() {
                    for unit in text {
                        rt.tick()?;
                        values.push(rt.string_from_utf16(vec![unit]));
                    }
                } else {
                    let mut cursor = 0;
                    while let Some(position) =
                        text[cursor..].windows(sep.len()).position(|s| s == sep)
                    {
                        rt.tick()?;
                        values.push(rt.string_from_utf16(text[cursor..cursor + position].to_vec()));
                        cursor += position + sep.len();
                    }
                    values.push(rt.string_from_utf16(text[cursor..].to_vec()));
                }
            }
            rt.array(values)
        }
        "indexOf" => match a {
            Value::Array(_) => {
                let values = rt.array_values(a)?;
                let present = rt
                    .keys(a)
                    .into_iter()
                    .collect::<std::collections::HashSet<_>>();
                let start = rt.to_number(c);
                let start = if start < 0.0 {
                    (values.len() as f64 + start.trunc()).max(0.0)
                } else {
                    start.max(0.0)
                }
                .min(values.len() as f64) as usize;
                let mut result = -1.0;
                for (i, item) in values.iter().enumerate().skip(start) {
                    rt.tick()?;
                    if present.contains(&i.to_string()) && rt.equal(item, b, true) {
                        result = i as f64;
                        break;
                    }
                }
                Value::Number(result)
            }
            _ => Value::Number(index_of(rt, &string_receiver(a)?, b, c)),
        },
        "includes" if matches!(a, Value::Array(_)) => {
            let mut found = false;
            for item in rt.array_values(a)? {
                rt.tick()?;
                if rt.equal(&item, b, true)
                    || matches!((&item, b), (Value::Number(x), Value::Number(y)) if x.is_nan() && y.is_nan())
                {
                    found = true;
                    break;
                }
            }
            Value::Bool(found)
        }
        "startsWith" => Value::Bool(string_receiver(a)?.starts_with(&rt.to_utf16(b))),
        "endsWith" => Value::Bool(string_receiver(a)?.ends_with(&rt.to_utf16(b))),
        "includes" => {
            Value::Bool(index_of(rt, &string_receiver(a)?, b, &Value::Number(0.0)) >= 0.0)
        }
        "padStart" | "padEnd" => pad(rt, &string_receiver(a)?, b, c, name == "padStart")?,
        "replace" | "replaceAll" => {
            replace(rt, &string_receiver(a)?, b, c, name == "replaceAll").await?
        }
        "words" | "re_match" => regex_match(rt, &string_receiver(a)?, b, c, name == "words")?,
        _ => return Ok(None),
    };
    Ok(Some(value))
}
