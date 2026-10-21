//! JSON methods use ordinary data, never the tagged transport representation.
use crate::{runtime::EnvId, Error, EvalOptions, Result, Runtime, Value};
use futures::{future::LocalBoxFuture, FutureExt};
use indexmap::IndexMap;
use serde_json::Value as Json;

#[cfg(not(target_arch = "wasm32"))]
mod native {
    use super::*;
    use serde::de::{DeserializeSeed, MapAccess, SeqAccess, Visitor};

    struct Seed<'a> {
        rt: &'a mut Runtime,
        nodes: &'a mut usize,
        created: &'a mut smallvec::SmallVec<[Value; 8]>,
    }
    impl<'de> DeserializeSeed<'de> for Seed<'_> {
        type Value = Value;
        fn deserialize<D: serde::Deserializer<'de>>(
            self,
            deserializer: D,
        ) -> std::result::Result<Value, D::Error> {
            *self.nodes += 1;
            deserializer.deserialize_any(self)
        }
    }
    impl<'de> Visitor<'de> for Seed<'_> {
        type Value = Value;
        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("JSON data")
        }
        fn visit_unit<E: serde::de::Error>(self) -> std::result::Result<Value, E> {
            Ok(Value::Null)
        }
        fn visit_bool<E: serde::de::Error>(self, value: bool) -> std::result::Result<Value, E> {
            Ok(Value::Bool(value))
        }
        fn visit_i64<E: serde::de::Error>(self, value: i64) -> std::result::Result<Value, E> {
            Ok(Value::Number(value as f64))
        }
        fn visit_u64<E: serde::de::Error>(self, value: u64) -> std::result::Result<Value, E> {
            Ok(Value::Number(value as f64))
        }
        fn visit_f64<E: serde::de::Error>(self, value: f64) -> std::result::Result<Value, E> {
            Ok(Value::Number(value))
        }
        fn visit_str<E: serde::de::Error>(self, value: &str) -> std::result::Result<Value, E> {
            Ok(Value::String(value.into()))
        }
        fn visit_string<E: serde::de::Error>(self, value: String) -> std::result::Result<Value, E> {
            Ok(Value::String(value))
        }
        fn visit_seq<A: SeqAccess<'de>>(
            self,
            mut sequence: A,
        ) -> std::result::Result<Value, A::Error> {
            let mut values = Vec::with_capacity(sequence.size_hint().unwrap_or(8));
            while let Some(value) = sequence.next_element_seed(Seed {
                rt: self.rt,
                nodes: self.nodes,
                created: self.created,
            })? {
                values.push(value);
            }
            let value = self.rt.array(values);
            self.created.push(value.clone());
            Ok(value)
        }
        fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> std::result::Result<Value, A::Error> {
            let mut values = IndexMap::with_capacity(map.size_hint().unwrap_or(4));
            while let Some(key) = map.next_key::<String>()? {
                let value = map.next_value_seed(Seed {
                    rt: self.rt,
                    nodes: self.nodes,
                    created: self.created,
                })?;
                values.insert(key, value);
            }
            let value = self.rt.object(values);
            self.created.push(value.clone());
            Ok(value)
        }
    }
    pub(super) fn parse(
        rt: &mut Runtime,
        text: &str,
    ) -> std::result::Result<(Value, usize), sonic_rs::Error> {
        let mut deserializer = sonic_rs::Deserializer::from_str(text);
        let mut nodes = 0;
        let mut created = smallvec::SmallVec::new();
        let result = Seed {
            rt,
            nodes: &mut nodes,
            created: &mut created,
        }
        .deserialize(&mut deserializer)
        .and_then(|value| {
            deserializer.end()?;
            Ok(value)
        });
        match result {
            Ok(value) => Ok((value, nodes)),
            Err(error) => {
                rt.discard_json_values(&created);
                Err(error)
            }
        }
    }
}

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
    // Deserialize directly into runtime values, avoiding a temporary JSON DOM.
    // Charge work only after validation so a parser fallback cannot double-count.
    #[cfg(not(target_arch = "wasm32"))]
    if !rt.controls_active() && !text.contains("-0") {
        if let Ok((value, nodes)) = native::parse(rt, text) {
            for _ in 0..nodes {
                rt.tick()?;
            }
            return Ok(value);
        }
    }
    // sonic-rs normalizes integer -0 and rejects overflow; preserve JS f64
    // behavior with the portable parser for these exceptional inputs.
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

// Eligibility is read-only: no callbacks, mutations, or budget changes before
// the immediate evaluator has validated every part of its enclosing plan.
pub(crate) fn plain(rt: &Runtime, value: &Value) -> bool {
    fn visit(rt: &Runtime, value: &Value, parents: &mut Vec<(bool, usize)>) -> bool {
        let identity = match value {
            Value::Array(id) => (true, *id),
            Value::Object(id) => (false, *id),
            _ => return true,
        };
        if parents.len() >= 128 || parents.contains(&identity) {
            return false;
        }
        if rt.get(value, "toJSON").is_callable() {
            return false;
        }
        parents.push(identity);
        let result = if identity.0 {
            rt.borrow_array(value)
                .is_ok_and(|values| values.iter().all(|value| visit(rt, value, parents)))
        } else {
            rt.borrow_object(value)
                .is_ok_and(|values| values.values().all(|value| visit(rt, value, parents)))
        };
        parents.pop();
        result
    }
    visit(rt, value, &mut Vec::new())
}

pub(crate) fn stringify_plain(rt: &Runtime, value: &Value) -> Result<Value> {
    struct Writer {
        output: Vec<u8>,
    }
    impl Writer {
        fn append(&mut self, rt: &Runtime, text: &str) -> Result<()> {
            rt.charge_intermediate(text.len())?;
            self.output.extend_from_slice(text.as_bytes());
            Ok(())
        }
        fn string(&mut self, rt: &Runtime, text: &str) -> Result<()> {
            rt.charge_size(
                text.len()
                    .checked_mul(6)
                    .and_then(|size| size.checked_add(2)),
            )?;
            let before = self.output.len();
            #[cfg(not(target_arch = "wasm32"))]
            let result = sonic_rs::to_writer(&mut self.output, text);
            #[cfg(target_arch = "wasm32")]
            let result = serde_json::to_writer(&mut self.output, text);
            result.map_err(|error| Error::new("TypeError", error.to_string()))?;
            rt.charge_intermediate(self.output.len() - before)
        }
        fn entry(
            &mut self,
            rt: &Runtime,
            key: &str,
            value: &Value,
            count: &mut usize,
        ) -> Result<()> {
            if matches!(
                value,
                Value::Undefined | Value::Function(_) | Value::Builtin(_) | Value::Special(_)
            ) {
                rt.tick()?;
                return Ok(());
            }
            if *count != 0 {
                self.append(rt, ",")?;
            }
            self.string(rt, key)?;
            self.append(rt, ":")?;
            self.value(rt, value)?;
            *count += 1;
            Ok(())
        }
        fn value(&mut self, rt: &Runtime, value: &Value) -> Result<bool> {
            rt.tick()?;
            match value {
                Value::Undefined | Value::Function(_) | Value::Builtin(_) | Value::Special(_) => {
                    return Ok(false)
                }
                Value::Null => self.append(rt, "null")?,
                Value::Bool(value) => self.append(rt, if *value { "true" } else { "false" })?,
                Value::Number(value) => {
                    if value.abs() <= 9_007_199_254_740_991.0 && value.fract() == 0.0 {
                        self.append(rt, itoa::Buffer::new().format(*value as i64))?;
                    } else if value.is_finite() {
                        self.append(rt, ryu_js::Buffer::new().format(*value))?;
                    } else {
                        self.append(rt, "null")?;
                    }
                }
                Value::String(value) => self.string(rt, value)?,
                Value::Utf16(value) => self.append(rt, &crate::builtins::quote_units(value))?,
                Value::Promise(_) => self.append(rt, "{}")?,
                Value::Stream(_) => {
                    return Err(Error::new("TypeError", "Streams cannot be serialized"))
                }
                Value::Date(_) => self.string(rt, &rt.to_string(value))?,
                Value::Array(_) => {
                    self.append(rt, "[")?;
                    for (index, value) in rt.borrow_array(value)?.iter().enumerate() {
                        if index != 0 {
                            self.append(rt, ",")?;
                        }
                        if !self.value(rt, value)? {
                            self.append(rt, "null")?;
                        }
                    }
                    self.append(rt, "]")?;
                }
                Value::Object(_) => {
                    self.append(rt, "{")?;
                    let values = rt.borrow_object(value)?;
                    let mut count = 0;
                    if values
                        .keys()
                        .all(|key| !key.as_bytes().first().is_some_and(u8::is_ascii_digit))
                    {
                        for (key, value) in values.iter() {
                            self.entry(rt, key, value, &mut count)?;
                        }
                    } else {
                        let mut entries: smallvec::SmallVec<[(&String, &Value); 8]> =
                            values.iter().collect();
                        entries.sort_by_key(|(key, _)| {
                            key.parse::<u32>()
                                .ok()
                                .filter(|index| *index != u32::MAX && index.to_string() == **key)
                                .map_or((1, 0), |index| (0, index))
                        });
                        for (key, value) in entries {
                            self.entry(rt, key, value, &mut count)?;
                        }
                    }
                    self.append(rt, "}")?;
                }
            }
            Ok(true)
        }
    }
    let mut writer = Writer { output: Vec::new() };
    if writer.value(rt, value)? {
        Ok(Value::String(
            String::from_utf8(writer.output).expect("JSON serializer produces UTF-8"),
        ))
    } else {
        Ok(Value::Undefined)
    }
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

// Source records are needed only when a reviver is supplied. Ordinary parsing
// retains the SIMD path without allocating a second tree of source tokens.
struct ParseRecord {
    original: Value,
    source: Option<String>,
    children: IndexMap<String, ParseRecord>,
}

fn parse_record(rt: &Runtime, text: &str, value: Value) -> Result<ParseRecord> {
    rt.tick()?;
    let error = |error: serde_json::Error| Error::new("SyntaxError", error.to_string());
    let mut children = IndexMap::new();
    let text = text.trim();
    let source = match &value {
        Value::Array(_) => {
            let items: Vec<&serde_json::value::RawValue> =
                serde_json::from_str(text).map_err(error)?;
            for (index, item) in items.into_iter().enumerate() {
                let key = index.to_string();
                children.insert(
                    key.clone(),
                    parse_record(rt, item.get(), rt.get(&value, &key))?,
                );
            }
            None
        }
        Value::Object(_) => {
            let items: std::collections::HashMap<String, &serde_json::value::RawValue> =
                serde_json::from_str(text).map_err(error)?;
            for (key, item) in items {
                children.insert(
                    key.clone(),
                    parse_record(rt, item.get(), rt.get(&value, &key))?,
                );
            }
            None
        }
        _ => Some(text.to_owned()),
    };
    Ok(ParseRecord {
        original: value,
        source,
        children,
    })
}

fn same_value(left: &Value, right: &Value) -> bool {
    match (left, right) {
        (Value::Number(left), Value::Number(right)) => left.to_bits() == right.to_bits(),
        _ => left == right,
    }
}

struct Reviver<'o> {
    callback: Value,
    env: EnvId,
    options: &'o EvalOptions,
}

impl Reviver<'_> {
    fn value<'a>(
        &'a self,
        rt: &'a mut Runtime,
        holder: Value,
        key: String,
        depth: usize,
        record: Option<&'a ParseRecord>,
    ) -> LocalBoxFuture<'a, Result<Value>> {
        async move {
            rt.tick()?;
            if depth >= 256 {
                return Err(Error::new("RangeError", "JSON nesting limit exceeded"));
            }
            let value = rt.get(&holder, &key);
            if matches!(value, Value::Object(_) | Value::Array(_)) {
                let keys = if matches!(value, Value::Array(_)) {
                    (0..rt.array_values(&value)?.len())
                        .map(|index| index.to_string())
                        .collect()
                } else {
                    ordered_keys(rt, &value)
                };
                for child_key in keys {
                    let child = self
                        .value(
                            rt,
                            value.clone(),
                            child_key.clone(),
                            depth + 1,
                            record
                                .filter(|record| same_value(&record.original, &value))
                                .and_then(|record| record.children.get(&child_key)),
                        )
                        .await?;
                    rt.replace_json_field(&value, &child_key, child)?;
                }
            }
            let mut context = IndexMap::new();
            if let Some(source) = record
                .filter(|record| same_value(&record.original, &value))
                .and_then(|record| record.source.as_ref())
            {
                context.insert("source".into(), Value::String(source.clone()));
            }
            let context = rt.object(context);
            rt.call_json_callback(
                self.callback.clone(),
                vec![Value::String(key), value, context],
                self.env,
                self.options,
            )
            .await
        }
        .boxed_local()
    }
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
            let text = rt.to_string(&input);
            rt.charge_size(text.len().checked_mul(32))?;
            let record = parse_record(rt, &text, value.clone())?;
            let holder = rt.object(IndexMap::from([(String::new(), value)]));
            // Root the partially revived tree through callbacks that may collect.
            let roots = rt.roots(&Json::Null, env);
            roots.retain_task_value(&holder);
            let reviver = Reviver {
                callback: callback.clone(),
                env,
                options,
            };
            let result = reviver
                .value(rt, holder, String::new(), 0, Some(&record))
                .await;
            drop(roots);
            return result;
        }
        return Ok(value);
    }
    if args.len() == 1 && !rt.controls_active() && plain(rt, &input) {
        return stringify_plain(rt, &input);
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
