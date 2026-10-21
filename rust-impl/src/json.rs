//! JSON methods use ordinary data, never the tagged transport representation.
use crate::{runtime::EnvId, Error, EvalOptions, Result, Runtime, Value};
use futures::{future::LocalBoxFuture, FutureExt};
use indexmap::IndexMap;
use serde_json::Value as Json;

pub(crate) fn parse(rt: &mut Runtime, input: &Value) -> Result<Value> {
    if matches!(input, Value::Utf16(_)) {
        return crate::builtins::parse_json_legacy(rt, input);
    }
    let owned;
    let text = if let Value::String(text) = input {
        text.as_str()
    } else {
        rt.charge_value(input)?;
        owned = rt.to_string(input);
        &owned
    };
    rt.charge_size(text.len().checked_mul(32))?;
    // Native SIMD parsing keeps input immutable. The portable parser also
    // handles numbers beyond the native parser's range (JS converts to f64).
    #[cfg(not(target_arch = "wasm32"))]
    let parsed = if text.contains("-0") {
        // sonic-rs normalizes integer -0 to 0; JS preserves its sign.
        serde_json::from_str::<Json>(text).map_err(|error| error.to_string())
    } else {
        sonic_rs::from_str::<Json>(text)
            .map_err(|error| error.to_string())
            .or_else(|_| serde_json::from_str(text).map_err(|error| error.to_string()))
    };
    #[cfg(target_arch = "wasm32")]
    let parsed = serde_json::from_str::<Json>(text).map_err(|error| error.to_string());
    let parsed = match parsed {
        Ok(value) => value,
        Err(error) => {
            // Preserve JS code units only for the exceptional surrogate path.
            if text.contains("\\u") {
                return crate::builtins::parse_json_legacy(rt, input);
            }
            return Err(Error::new("SyntaxError", error.to_string()));
        }
    };
    fn convert(rt: &mut Runtime, value: Json) -> Result<Value> {
        rt.tick()?;
        Ok(match value {
            Json::Null => Value::Null,
            Json::Bool(value) => Value::Bool(value),
            Json::Number(value) => Value::Number(
                value
                    .as_f64()
                    .or_else(|| value.to_string().parse().ok())
                    .ok_or_else(|| Error::new("SyntaxError", "Invalid JSON number"))?,
            ),
            Json::String(value) => Value::String(value),
            Json::Array(values) => {
                let values = values
                    .into_iter()
                    .map(|value| convert(rt, value))
                    .collect::<Result<_>>()?;
                rt.array(values)
            }
            Json::Object(values) => {
                let values = values
                    .into_iter()
                    .map(|(key, value)| Ok((key, convert(rt, value)?)))
                    .collect::<Result<IndexMap<_, _>>>()?;
                rt.object(values)
            }
        })
    }
    convert(rt, parsed)
}

fn ordered_keys(rt: &Runtime, value: &Value) -> Vec<String> {
    let mut keys = rt.keys(value);
    keys.sort_by_key(|key| {
        key.parse::<u32>()
            .ok()
            .filter(|index| *index != u32::MAX && index.to_string() == *key)
            .map_or((1, 0), |index| (0, index))
    });
    keys
}

fn quote(text: &str) -> Result<String> {
    #[cfg(not(target_arch = "wasm32"))]
    let result = sonic_rs::to_string(text);
    #[cfg(target_arch = "wasm32")]
    let result = serde_json::to_string(text);
    result.map_err(|error| Error::new("TypeError", error.to_string()))
}

struct Serializer {
    output: String,
    gap: String,
    properties: Option<Vec<String>>,
    replacer: Value,
    parents: Vec<(bool, usize)>,
    env: EnvId,
    options: EvalOptions,
}

impl Serializer {
    fn append(&mut self, rt: &Runtime, text: &str) -> Result<()> {
        rt.charge_intermediate(text.len())?;
        self.output.push_str(text);
        Ok(())
    }
    fn newline(&mut self, rt: &Runtime, depth: usize) -> Result<()> {
        if self.gap.is_empty() {
            return Ok(());
        }
        rt.charge_size(
            self.gap
                .len()
                .checked_mul(depth)
                .and_then(|size| size.checked_add(1)),
        )?;
        self.output.push('\n');
        for _ in 0..depth {
            self.output.push_str(&self.gap);
        }
        Ok(())
    }
    fn value<'a>(
        &'a mut self,
        rt: &'a mut Runtime,
        mut value: Value,
        key: String,
    ) -> LocalBoxFuture<'a, Result<bool>> {
        async move {
            rt.tick()?;
            if self.parents.len() >= 256 {
                return Err(Error::new("RangeError", "JSON nesting limit exceeded"));
            }
            if matches!(value, Value::Object(_) | Value::Array(_)) || value.is_callable() {
                let to_json = rt.get(&value, "toJSON");
                if to_json.is_callable() {
                    value = rt
                        .call_json_callback(
                            to_json,
                            vec![Value::String(key.clone())],
                            self.env,
                            &self.options,
                        )
                        .await?;
                }
            } else if matches!(value, Value::Date(_)) {
                value = Value::String(rt.to_string(&value));
            }
            if self.replacer.is_callable() {
                value = rt
                    .call_json_callback(
                        self.replacer.clone(),
                        vec![Value::String(key), value],
                        self.env,
                        &self.options,
                    )
                    .await?;
            }
            let roots = rt.roots(&Json::Null, self.env);
            roots.retain_task_value(&value);
            match &value {
                Value::Undefined | Value::Builtin(_) | Value::Special(_) | Value::Function(_) => {
                    return Ok(false)
                }
                Value::Null => self.append(rt, "null")?,
                Value::Bool(value) => self.append(rt, if *value { "true" } else { "false" })?,
                Value::Number(value) => {
                    if value.is_finite() {
                        self.append(rt, ryu_js::Buffer::new().format(*value))?;
                    } else {
                        self.append(rt, "null")?;
                    }
                }
                Value::String(value) => {
                    rt.charge_size(
                        value
                            .len()
                            .checked_mul(6)
                            .and_then(|size| size.checked_add(2)),
                    )?;
                    self.append(rt, &quote(value)?)?;
                }
                Value::Utf16(value) => {
                    rt.charge_size(
                        value
                            .len()
                            .checked_mul(6)
                            .and_then(|size| size.checked_add(2)),
                    )?;
                    self.append(rt, &crate::builtins::quote_units(value))?;
                }
                Value::Promise(_) => self.append(rt, "{}")?,
                Value::Stream(_) => {
                    return Err(Error::new("TypeError", "Streams cannot be serialized"))
                }
                Value::Date(_) => self.append(rt, &quote(&rt.to_string(&value))?)?,
                Value::Array(id) | Value::Object(id) => {
                    let identity = (matches!(value, Value::Array(_)), *id);
                    if self.parents.contains(&identity) {
                        return Err(Error::new(
                            "TypeError",
                            "Converting circular structure to JSON",
                        ));
                    }
                    self.parents.push(identity);
                    let depth = self.parents.len();
                    self.append(rt, if identity.0 { "[" } else { "{" })?;
                    let keys = if identity.0 {
                        let length = rt.get(&value, "length");
                        let Value::Number(length) = length else {
                            unreachable!()
                        };
                        rt.charge_items::<String>(length as usize)?;
                        (0..length as usize)
                            .map(|index| index.to_string())
                            .collect()
                    } else {
                        self.properties
                            .clone()
                            .unwrap_or_else(|| ordered_keys(rt, &value))
                    };
                    let mut count = 0;
                    for key in keys {
                        let item = rt.get(&value, &key);
                        let start = self.output.len();
                        if count != 0 {
                            self.append(rt, ",")?;
                        }
                        self.newline(rt, depth)?;
                        if !identity.0 {
                            self.append(rt, &quote(&key)?)?;
                            self.append(rt, if self.gap.is_empty() { ":" } else { ": " })?;
                        }
                        if self.value(rt, item, key).await? {
                            count += 1;
                        } else if identity.0 {
                            self.append(rt, "null")?;
                            count += 1;
                        } else {
                            self.output.truncate(start);
                        }
                    }
                    if count != 0 {
                        self.newline(rt, depth - 1)?;
                    }
                    self.append(rt, if identity.0 { "]" } else { "}" })?;
                    self.parents.pop();
                }
            }
            Ok(true)
        }
        .boxed_local()
    }
}

fn revive<'a>(
    rt: &'a mut Runtime,
    holder: Value,
    key: String,
    callback: Value,
    env: EnvId,
    options: &'a EvalOptions,
    depth: usize,
) -> LocalBoxFuture<'a, Result<Value>> {
    async move {
        rt.tick()?;
        if depth >= 256 {
            return Err(Error::new("RangeError", "JSON nesting limit exceeded"));
        }
        let value = rt.get(&holder, &key);
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            for child_key in ordered_keys(rt, &value) {
                let child = revive(
                    rt,
                    value.clone(),
                    child_key.clone(),
                    callback.clone(),
                    env,
                    options,
                    depth + 1,
                )
                .await?;
                rt.replace_json_field(&value, &child_key, child)?;
            }
        }
        rt.call_json_callback(callback, vec![Value::String(key), value], env, options)
            .await
    }
    .boxed_local()
}

pub(crate) async fn call(
    rt: &mut Runtime,
    name: &str,
    args: &[Value],
    env: EnvId,
    options: &EvalOptions,
) -> Result<Value> {
    let input = args.first().cloned().unwrap_or(Value::Undefined);
    if name == "JSON.parse" {
        let value = parse(rt, &input)?;
        if let Some(callback) = args.get(1).filter(|value| value.is_callable()) {
            let holder = rt.object(IndexMap::from([(String::new(), value)]));
            // Root the partially revived tree through callbacks that may collect.
            let roots = rt.roots(&Json::Null, env);
            roots.retain_task_value(&holder);
            let result = revive(rt, holder, String::new(), callback.clone(), env, options, 0).await;
            drop(roots);
            return result;
        }
        return Ok(value);
    }
    let replacer = args.get(1).cloned().unwrap_or(Value::Undefined);
    let properties = if matches!(replacer, Value::Array(_)) {
        let mut keys = Vec::new();
        for value in rt.array_values(&replacer)? {
            if matches!(value, Value::String(_) | Value::Utf16(_) | Value::Number(_)) {
                rt.charge_value(&value)?;
                let key = if let Value::Utf16(units) = &value {
                    String::from_utf16(units).map_err(|_| {
                        Error::new("UnicodeError", "JSON property key is not valid UTF-8")
                    })?
                } else {
                    rt.to_string(&value)
                };
                if !keys.contains(&key) {
                    keys.push(key);
                }
            }
        }
        Some(keys)
    } else {
        None
    };
    let gap = match args.get(2) {
        Some(Value::Number(value)) => " ".repeat(if value.is_nan() {
            0
        } else {
            value.clamp(0.0, 10.0) as usize
        }),
        Some(Value::String(value)) => {
            let units: Vec<_> = value.encode_utf16().take(10).collect();
            String::from_utf16(&units)
                .map_err(|_| Error::new("UnicodeError", "JSON indentation is not valid UTF-8"))?
        }
        _ => String::new(),
    };
    let mut serializer = Serializer {
        output: String::new(),
        gap,
        properties,
        replacer,
        parents: vec![],
        env,
        options: options.clone(),
    };
    if serializer.value(rt, input, String::new()).await? {
        Ok(Value::String(serializer.output))
    } else {
        Ok(Value::Undefined)
    }
}
