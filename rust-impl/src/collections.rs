//! Ordinary collection functions. Evaluation and special forms live in Runtime.
use crate::builtins::registry::builtin_names;
use crate::{Error, Result, Runtime, Value};
use futures::future::LocalBoxFuture;
use indexmap::{IndexMap, IndexSet};
use rand::Rng;
use std::collections::HashMap;

builtin_names! {
    "list" => true,
    "array" => true,
    "[" => true,
    "range" => true,
    "reshape" => true,
    "\u{2374}" => true,
    "zip" => true,
    "count" => true,
    "length" => true,
    "empty?" => true,
    "empty" => true,
    "reverse" => true,
    "slice" => true,
    "concat" => true,
    "first" => true,
    "last" => true,
    "rest" => true,
    "cons" => true,
    "pushStart" => true,
    "find" => false,
    "findIndex" => false,
    "map" => false,
    "mapArr" => false,
    "filter" => false,
    "filterArr" => false,
    "reduce" => false,
    "reduceArr" => false,
    "sort" => false,
    "sortBy" => false,
    "some" => false,
    "every" => false,
    "flat" => true,
    "frequencies" => true,
    "counter" => true,
    "partition" => true,
    "distinct" => false,
    "union" => false,
    "intersect" => false,
    "difference" => false,
    "uniques" => false,
    "shuffle" => true,
    "sample" => true,
    "pluck" => true,
    "join" => true,
    "joinObj" => false,
    "contains?" => true,
    "containsKey" => true,
    "get" => true,
    "nth" => true,
    "set" => true,
    "del" => true,
    "keys" => true,
    "vals" => true,
    "values" => true,
    "entries" => true,
    "fromEntries" => true,
    "select" => true,
    "omit" => true,
    "compact" => true,
    "update_in" => false,
    "merge" => false,
    "mergeDeep" => false,
    "makeStruct" => true,
}

fn arg(args: &[Value], n: usize) -> Value {
    args.get(n).cloned().unwrap_or(Value::Undefined)
}

fn is_array(v: &Value) -> bool {
    matches!(v, Value::Array(_))
}
fn is_collection(v: &Value) -> bool {
    matches!(v, Value::Array(_) | Value::Object(_))
}
fn number(n: usize) -> Value {
    Value::Number(n as f64)
}
fn invalid(message: &str) -> Error {
    Error::new("LPE_FUNC_WRONG_ARG_TYPE", message)
}

fn depth_guard(depth: usize) -> Result<()> {
    if depth > 256 {
        Err(Error::new(
            "LimitError",
            "Collection nesting limit exceeded",
        ))
    } else {
        Ok(())
    }
}

fn numeric_key(_rt: &Runtime, key: &str) -> bool {
    let (whole, fraction) = key
        .split_once('.')
        .map_or((key, None), |(a, b)| (a, Some(b)));
    !whole.is_empty()
        && whole.bytes().all(|b| b.is_ascii_digit())
        && (whole == "0" || !whole.starts_with('0'))
        && fraction.is_none_or(|s| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit()))
}

fn has(rt: &Runtime, value: &Value, key: &str) -> bool {
    rt.has_own(value, key)
}

fn property_key(rt: &Runtime, value: &Value) -> Result<String> {
    // Runtime object keys are UTF-8; reject unpaired UTF-16 instead of conflating
    // distinct JS keys with the replacement character. String values are lossless.
    String::from_utf16(&rt.to_utf16(value)).map_err(|_| {
        Error::new(
            "UnsupportedFeature",
            "Object keys containing unpaired UTF-16 surrogates are not supported",
        )
    })
}

fn length(rt: &Runtime, value: &Value) -> usize {
    rt.to_number(&rt.get(value, "length")).max(0.0) as usize
}

fn blank(rt: &mut Runtime, array: bool) -> Value {
    if array {
        rt.array(Vec::new())
    } else {
        rt.object(IndexMap::new())
    }
}

fn array_or_empty(rt: &Runtime, v: &Value) -> Result<Vec<Value>> {
    if is_array(v) {
        rt.array_values(v)
    } else {
        Ok(Vec::new())
    }
}

fn slice_index(n: f64, len: usize) -> usize {
    if n.is_nan() {
        0
    } else if n < 0.0 {
        ((len as f64 + n.trunc()).max(0.0) as usize).min(len)
    } else {
        (n.trunc() as usize).min(len)
    }
}

fn append_joined(
    rt: &Runtime,
    output: &mut Vec<u16>,
    part: &[u16],
    separator: &[u16],
    first: bool,
) -> Result<()> {
    // Bound multiplicative growth from a long separator or repeated string values.
    const MAX_STRING_BYTES: usize = 16 * 1024 * 1024;
    let extra = part
        .len()
        .checked_add(if first { 0 } else { separator.len() });
    if extra
        .and_then(|n| output.len().checked_add(n))
        .is_none_or(|n| n > MAX_STRING_BYTES / 2)
    {
        return Err(Error::new(
            "LimitError",
            "Joined string allocation limit exceeded",
        ));
    }
    if !first {
        rt.append_units(output, separator)?;
    }
    rt.append_units(output, part)?;
    Ok(())
}

// Scalar UTF-8 joins cannot create surrogate halves. Keep the code-unit
// allocation limit while avoiding a UTF-16 vector for every element.
fn join_utf8(rt: &Runtime, value: &Value, separator: &Value) -> Result<Option<Value>> {
    if rt.controls_active() {
        return Ok(None);
    }
    let separator = match separator {
        Value::Undefined => ",",
        Value::String(s) => s.as_str(),
        _ => return Ok(None),
    };
    let values = if is_array(value) {
        Some(rt.borrow_array(value)?)
    } else {
        None
    };
    let values = values.as_deref().unwrap_or(&[]);
    if !values.iter().all(|v| {
        matches!(
            v,
            Value::String(_) | Value::Number(_) | Value::Bool(_) | Value::Null | Value::Undefined
        )
    }) {
        return Ok(None);
    }
    let mut output = String::with_capacity(values.len().min(8192));
    let unit_len = |s: &str| {
        if s.is_ascii() {
            s.len()
        } else {
            s.encode_utf16().count()
        }
    };
    let separator_len = unit_len(separator);
    let mut output_len = 0usize;
    let mut buffer = ryu_js::Buffer::new();
    for (i, value) in values.iter().enumerate() {
        rt.tick()?;
        let part = match value {
            Value::String(s) => s.as_str(),
            Value::Number(n) => buffer.format(*n),
            Value::Bool(true) => "true",
            Value::Bool(false) => "false",
            Value::Null | Value::Undefined => "",
            _ => unreachable!("validated scalar join"),
        };
        let extra = unit_len(part).checked_add(if i == 0 { 0 } else { separator_len });
        let next_len = extra.and_then(|n| output_len.checked_add(n));
        if next_len.is_none_or(|n| n > 8 * 1024 * 1024) {
            return Err(Error::new(
                "LimitError",
                "Joined string allocation limit exceeded",
            ));
        }
        output_len = next_len.expect("validated length");
        if i != 0 {
            output.push_str(separator);
        }
        output.push_str(part);
    }
    Ok(Some(Value::String(output)))
}

fn check_reshape_allocation(rt: &mut Runtime, values: &[Value], count: usize) -> Result<()> {
    const MAX_BYTES: usize = 64 * 1024 * 1024;
    let limit = || Error::new("LimitError", "Reshape allocation limit exceeded");
    let mut bytes = count
        .checked_mul(std::mem::size_of::<Value>())
        .ok_or_else(limit)?;
    if bytes > MAX_BYTES {
        return Err(limit());
    }
    // Strings are owned values, unlike arena-backed objects. Charge repeated
    // payloads before cloning so even a small count cannot amplify a large input.
    for (i, value) in values.iter().enumerate() {
        rt.tick()?;
        let payload = match value {
            Value::String(s) => s.len(),
            Value::Utf16(s) => s.len().saturating_mul(2),
            _ => 0,
        };
        let copies = count / values.len() + usize::from(i < count % values.len());
        bytes = payload
            .checked_mul(copies)
            .and_then(|n| bytes.checked_add(n))
            .ok_or_else(limit)?;
        if bytes > MAX_BYTES {
            return Err(limit());
        }
    }
    rt.charge_intermediate(bytes)?;
    Ok(())
}

async fn invoke(rt: &mut Runtime, f: &Value, args: Vec<Value>) -> Result<Value> {
    rt.tick()?;
    let env = rt.global_env();
    rt.call_value(f.clone(), args, env).await
}

async fn compare(rt: &mut Runtime, f: &Value, a: &Value, b: &Value) -> Result<bool> {
    rt.tick()?;
    if f.is_nullish() {
        Ok(rt.equal(a, b, false))
    } else {
        Ok(invoke(rt, f, vec![a.clone(), b.clone()]).await?.truthy())
    }
}

async fn first_match(
    rt: &mut Runtime,
    f: &Value,
    values: &[Value],
    item: &Value,
    reverse: bool,
) -> Result<Option<usize>> {
    for (i, v) in values.iter().enumerate() {
        let found = if reverse {
            compare(rt, f, v, item).await?
        } else {
            compare(rt, f, item, v).await?
        };
        if found {
            return Ok(Some(i));
        }
    }
    Ok(None)
}

// Allocate shells before their children so cycles and repeated handles survive cloning.
fn clone_graph(rt: &mut Runtime, root: &Value) -> Result<Value> {
    fn shell(
        rt: &mut Runtime,
        v: &Value,
        seen: &mut HashMap<(bool, usize), Value>,
        work: &mut Vec<(Value, Value)>,
    ) -> Result<Value> {
        let key = match v {
            Value::Array(id) => (true, *id),
            Value::Object(id) => (false, *id),
            v if v.is_callable() => return Err(invalid("Cannot clone a function")),
            _ => return Ok(v.clone()),
        };
        if let Some(copy) = seen.get(&key) {
            return Ok(copy.clone());
        }
        rt.tick()?;
        let copy = blank(rt, key.0);
        seen.insert(key, copy.clone());
        work.push((v.clone(), copy.clone()));
        Ok(copy)
    }
    let mut seen = HashMap::new();
    let mut work = Vec::new();
    let result = shell(rt, root, &mut seen, &mut work)?;
    while let Some((source, target)) = work.pop() {
        rt.tick()?;
        if is_array(&source) {
            let len = rt.get(&source, "length");
            rt.set(&target, "length", len)?;
        }
        for key in rt.keys(&source) {
            rt.tick()?;
            let child = rt.get(&source, &key);
            let copy = shell(rt, &child, &mut seen, &mut work)?;
            rt.set(&target, &key, copy)?;
        }
    }
    Ok(result)
}

fn splice_one(rt: &mut Runtime, array: &Value, key: &str) -> Result<()> {
    let len = length(rt, array);
    let start = slice_index(rt.to_number(&Value::String(key.to_owned())), len);
    if start >= len {
        return Ok(());
    }
    for i in start..len - 1 {
        rt.tick()?;
        let next = (i + 1).to_string();
        if has(rt, array, &next) {
            let v = rt.get(array, &next);
            rt.set(array, &i.to_string(), v)?;
        } else {
            rt.delete(array, &i.to_string())?;
        }
    }
    rt.set(array, "length", number(len - 1))?;
    Ok(())
}

fn selections(rt: &mut Runtime, spec: &Value) -> Result<IndexMap<String, Value>> {
    let mut result = IndexMap::new();
    for key in rt.keys(spec) {
        rt.tick()?;
        let v = rt.get(spec, &key);
        if is_array(spec) && numeric_key(rt, &key) {
            result.insert(property_key(rt, &v)?, Value::Bool(true));
        } else {
            result.insert(key, v);
        }
    }
    Ok(result)
}

fn selection(
    rt: &mut Runtime,
    obj: &Value,
    spec: &Value,
    omit: bool,
    depth: usize,
) -> Result<Value> {
    depth_guard(depth)?;
    rt.tick()?;
    let result = if omit {
        obj.clone()
    } else {
        blank(rt, !matches!(obj, Value::Object(_)))
    };
    let mut entries: Vec<_> = selections(rt, spec)?.into_iter().collect();
    if omit {
        entries.reverse();
    }
    for (key, need) in entries {
        rt.tick()?;
        if !has(rt, obj, &key) {
            continue;
        }
        let old = rt.get(obj, &key);
        if is_collection(&need) && !is_collection(&old) {
            continue;
        }
        if omit && !is_collection(&need) {
            if is_array(obj) && numeric_key(rt, &key) {
                splice_one(rt, obj, &key)?;
            } else {
                rt.delete(obj, &key)?;
            }
        } else {
            let value = if is_collection(&need) {
                selection(rt, &old, &need, omit, depth + 1)?
            } else {
                old
            };
            let dest = if !omit && is_array(&result) && numeric_key(rt, &key) {
                length(rt, &result).to_string()
            } else {
                key
            };
            rt.set(&result, &dest, value)?;
        }
    }
    Ok(result)
}

fn compact(rt: &mut Runtime, obj: &Value, depth: f64, nesting: usize) -> Result<()> {
    if depth <= 0.0 {
        return Ok(());
    }
    depth_guard(nesting)?;
    rt.tick()?;
    for key in rt.keys(obj).into_iter().rev() {
        rt.tick()?;
        let value = rt.get(obj, &key);
        if value.is_nullish() {
            if is_array(obj) && numeric_key(rt, &key) {
                splice_one(rt, obj, &key)?;
            } else {
                rt.delete(obj, &key)?;
            }
        } else if is_collection(&value) {
            compact(rt, &value, depth - 1.0, nesting + 1)?;
        }
    }
    Ok(())
}

fn make_struct(rt: &mut Runtime, from: &Value, spec: &Value, depth: usize) -> Result<Value> {
    depth_guard(depth)?;
    rt.tick()?;
    if !is_collection(from) {
        return clone_graph(rt, spec);
    }
    let result = blank(rt, is_array(from) || is_array(spec));
    let mut keys: IndexSet<_> = rt.keys(spec).into_iter().collect();
    for key in rt.keys(from) {
        rt.tick()?;
        keys.insert(key);
    }
    for key in keys {
        rt.tick()?;
        let default = rt.get(spec, &key);
        let old = rt.get(from, &key);
        let value = if is_collection(&default) {
            make_struct(rt, &old, &default, depth + 1)?
        } else if has(rt, from, &key) {
            old
        } else {
            default
        };
        rt.set(&result, &key, value)?;
    }
    Ok(result)
}

fn merge_deep<'a>(
    rt: &'a mut Runtime,
    a: Value,
    b: Value,
    f: Value,
    manual: bool,
    path: Vec<Value>,
) -> LocalBoxFuture<'a, Result<Value>> {
    Box::pin(async move {
        depth_guard(path.len())?;
        rt.tick()?;
        let result = blank(rt, is_array(&a) || is_array(&b));
        let mut keys: IndexSet<_> = rt.keys(&a).into_iter().collect();
        for key in rt.keys(&b) {
            rt.tick()?;
            keys.insert(key);
        }
        for key in keys {
            rt.tick()?;
            let av = rt.get(&a, &key);
            let bv = rt.get(&b, &key);
            let mut next = path.clone();
            next.push(Value::String(key.clone()));
            let value = if is_collection(&av) && is_collection(&bv) {
                merge_deep(rt, av, bv, f.clone(), manual, next).await?
            } else if !manual && !(has(rt, &a, &key) && has(rt, &b, &key)) {
                if av.is_nullish() {
                    bv
                } else {
                    av
                }
            } else if f.is_callable() {
                let path_value = rt.array(next);
                invoke(rt, &f, vec![path_value, av, bv]).await?
            } else {
                bv
            };
            rt.set(&result, &key, value)?;
        }
        Ok(result)
    })
}

fn update_in<'a>(
    rt: &'a mut Runtime,
    obj: Value,
    path: &'a [Value],
    f: &'a Value,
    regex_enabled: bool,
    was: Vec<Value>,
) -> LocalBoxFuture<'a, Result<()>> {
    Box::pin(async move {
        depth_guard(was.len())?;
        rt.tick()?;
        if path.is_empty() || !is_collection(&obj) {
            return Ok(());
        }
        let key = property_key(rt, &path[0])?;
        let keys = if regex_enabled && key.len() >= 2 && key.starts_with('/') && key.ends_with('/')
        {
            let re = crate::regexp::RegExp::new(rt, &key[1..key.len() - 1], "")?;
            let mut keys = Vec::new();
            for k in rt.keys(&obj) {
                rt.tick()?;
                if re.is_match(rt, &k)? {
                    keys.push(k);
                }
            }
            keys
        } else {
            if !has(rt, &obj, &key) && path.len() > 1 {
                let child = rt.object(IndexMap::new());
                rt.set(&obj, &key, child)?;
            }
            vec![key]
        };
        for key in keys {
            rt.tick()?;
            let value = rt.get(&obj, &key);
            let mut next = was.clone();
            if path.len() == 1 {
                // The source passes the original final path expression, even for regex keys.
                next.push(path[0].clone());
                let path_value = rt.array(next);
                let value = invoke(rt, f, vec![value, path_value]).await?;
                rt.set(&obj, &key, value)?;
            } else if is_collection(&value) {
                next.push(Value::String(key));
                update_in(rt, value, &path[1..], f, regex_enabled, next).await?;
            }
        }
        Ok(())
    })
}

pub async fn call(rt: &mut Runtime, name: &str, args: &[Value]) -> Result<Option<Value>> {
    if supports_sync(name) {
        return call_sync(rt, name, args);
    }
    let a = arg(args, 0);
    let b = arg(args, 1);
    let c = arg(args, 2);
    let value = match name {
        "map" | "mapArr" | "filter" | "filterArr" | "reduce" | "reduceArr" | "find"
        | "findIndex" | "some" | "every" => {
            if is_array(&a)
                && matches!(name, "mapArr" | "filterArr" | "reduceArr")
                && !b.is_callable()
            {
                return Err(invalid("Array callback must be callable"));
            }
            let mut result = Vec::new();
            let mut holes = Vec::new();
            let mut acc = c;
            let len = if is_array(&a) { length(rt, &a) } else { 0 };
            for i in 0..len {
                rt.tick()?;
                let key = i.to_string();
                if !matches!(name, "find" | "findIndex") && !has(rt, &a, &key) {
                    if matches!(name, "map" | "mapArr") {
                        rt.charge_items::<Value>(1)?;
                        result.push(Value::Undefined);
                        holes.push(i);
                    }
                    continue;
                }
                // Read live values: callbacks can mutate later slots, but not the iteration length.
                let item = rt.get(&a, &key);
                let mut argv = match name {
                    "reduce" | "reduceArr" => vec![acc.clone(), item.clone()],
                    _ => vec![item.clone()],
                };
                if matches!(
                    name,
                    "mapArr" | "filterArr" | "reduceArr" | "find" | "findIndex" | "some" | "every"
                ) {
                    argv.push(number(i));
                    argv.push(a.clone());
                }
                let out = if matches!(name, "find" | "findIndex" | "some" | "every")
                    && !b.is_callable()
                {
                    Value::Bool(rt.equal(&item, &b, false))
                } else {
                    invoke(rt, &b, argv).await?
                };
                match name {
                    "map" | "mapArr" => {
                        rt.charge_value(&out)?;
                        result.push(out);
                    }
                    "filter" | "filterArr" => {
                        if out.truthy() {
                            rt.charge_value(&item)?;
                            result.push(item);
                        }
                    }
                    "reduce" | "reduceArr" => acc = out,
                    "find" if out.truthy() => return Ok(Some(item)),
                    "findIndex" if out.truthy() => return Ok(Some(number(i))),
                    "some" if out.truthy() => return Ok(Some(Value::Bool(true))),
                    "every" if !out.truthy() => return Ok(Some(Value::Bool(false))),
                    _ => (),
                }
            }
            match name {
                "reduce" | "reduceArr" => acc,
                "find" => Value::Undefined,
                "findIndex" => Value::Number(-1.0),
                "some" => Value::Bool(false),
                "every" => Value::Bool(is_array(&a)),
                _ => {
                    let array = rt.array(result);
                    for i in holes {
                        rt.tick()?;
                        rt.delete(&array, &i.to_string())?;
                    }
                    array
                }
            }
        }
        "sort" | "sortBy" => {
            if !is_array(&a) {
                return Ok(Some(rt.array(Vec::new())));
            }
            if name == "sort" && !matches!(b, Value::Undefined) && !b.is_callable() {
                return Err(invalid("sort comparator must be callable"));
            }
            let len = length(rt, &a);
            let mut values = Vec::new();
            let mut undefined = 0;
            for i in 0..len {
                rt.tick()?;
                if has(rt, &a, &i.to_string()) {
                    let v = rt.get(&a, &i.to_string());
                    if matches!(v, Value::Undefined) {
                        undefined += 1;
                    } else {
                        values.push(v);
                    }
                }
            }
            // Bottom-up merge sort permits awaited comparators without recursive Rust futures.
            let mut width = 1;
            while width < values.len() {
                let mut sorted = Vec::new();
                for start in (0..values.len()).step_by(width * 2) {
                    let mid = (start + width).min(values.len());
                    let end = (mid + width).min(values.len());
                    let (mut l, mut r) = (start, mid);
                    while l < mid || r < end {
                        rt.tick()?;
                        let left = if r == end {
                            true
                        } else if l == mid {
                            false
                        } else if name == "sortBy" {
                            let lv = invoke(rt, &b, vec![values[l].clone()]).await?;
                            let rv = invoke(rt, &b, vec![values[r].clone()]).await?;
                            // The source comparator returns -1, not 0, on equal keys.
                            greater(rt, &rv, &lv)
                        } else if b.is_callable() {
                            let v =
                                invoke(rt, &b, vec![values[l].clone(), values[r].clone()]).await?;
                            rt.to_number(&v).partial_cmp(&0.0) != Some(std::cmp::Ordering::Greater)
                        } else {
                            rt.to_utf16(&values[l]) <= rt.to_utf16(&values[r])
                        };
                        let i = if left {
                            let i = l;
                            l += 1;
                            i
                        } else {
                            let i = r;
                            r += 1;
                            i
                        };
                        rt.charge_value(&values[i])?;
                        sorted.push(values[i].clone());
                    }
                }
                values = sorted;
                width *= 2;
            }
            let count = values.len();
            for (i, value) in values.into_iter().enumerate() {
                rt.tick()?;
                rt.set(&a, &i.to_string(), value)?;
            }
            for i in count..count + undefined {
                rt.tick()?;
                rt.set(&a, &i.to_string(), Value::Undefined)?;
            }
            for i in count + undefined..len {
                rt.tick()?;
                rt.delete(&a, &i.to_string())?;
            }
            a
        }
        "distinct" | "union" | "intersect" | "difference" | "uniques" => {
            if name == "distinct" && !is_array(&a) {
                return Ok(Some(a));
            }
            let outer = array_or_empty(rt, &a)?;
            let mut arrays = Vec::new();
            if name == "distinct" {
                arrays.push((a.clone(), outer));
            } else {
                for v in outer {
                    rt.tick()?;
                    if is_array(&v) {
                        let values = rt.array_values(&v)?;
                        arrays.push((v, values));
                    }
                }
            }
            let mut result = Vec::new();
            if name == "union" {
                let mut all = Vec::new();
                for (source, array) in &arrays {
                    for (i, v) in array.iter().enumerate() {
                        rt.tick()?;
                        if has(rt, source, &i.to_string()) {
                            all.push(v.clone());
                        }
                    }
                }
                for (i, item) in all.iter().enumerate() {
                    if first_match(rt, &b, &all, item, false).await? == Some(i) {
                        result.push(item.clone());
                    }
                }
            } else if name == "uniques" {
                let mut all = Vec::new();
                for (source, array) in &arrays {
                    for (i, item) in array.iter().enumerate() {
                        rt.tick()?;
                        if !has(rt, source, &i.to_string()) {
                            continue;
                        }
                        if first_match(rt, &b, array, item, false).await? == Some(i) {
                            all.push(item.clone());
                        }
                    }
                }
                for (i, item) in all.iter().enumerate() {
                    let mut unique = true;
                    for (j, other) in all.iter().enumerate() {
                        rt.tick()?;
                        if i != j && compare(rt, &b, item, other).await? {
                            unique = false;
                            break;
                        }
                    }
                    if unique {
                        result.push(item.clone());
                    }
                }
            } else if let Some((source, first)) = arrays.first() {
                for (i, item) in first.iter().enumerate() {
                    rt.tick()?;
                    if !has(rt, source, &i.to_string()) {
                        continue;
                    }
                    if name != "difference"
                        && first_match(rt, &b, first, item, name == "distinct").await? != Some(i)
                    {
                        continue;
                    }
                    let mut keep = true;
                    for (source, other) in arrays.iter().skip(1) {
                        let mut found = false;
                        for (j, v) in other.iter().enumerate() {
                            rt.tick()?;
                            if has(rt, source, &j.to_string()) && compare(rt, &b, item, v).await? {
                                found = true;
                                break;
                            }
                        }
                        if (name == "difference" && found) || (name == "intersect" && !found) {
                            keep = false;
                            break;
                        }
                    }
                    if keep {
                        result.push(item.clone());
                    }
                }
            }
            rt.array(result)
        }
        "joinObj" => {
            let sep = if matches!(b, Value::Undefined) {
                vec![b',' as u16]
            } else {
                rt.checked_to_utf16(&b)?
            };
            let mut output = Vec::new();
            let mut first = true;
            if is_collection(&a) {
                for key in rt.keys(&a) {
                    rt.tick()?;
                    let v = rt.get(&a, &key);
                    let part = if c.is_callable() {
                        let v = invoke(rt, &c, vec![Value::String(key), v]).await?;
                        if v.is_nullish() {
                            Vec::new()
                        } else {
                            rt.checked_to_utf16(&v)?
                        }
                    } else {
                        rt.checked_to_utf16(&v)?
                    };
                    append_joined(rt, &mut output, &part, &sep, first)?;
                    first = false;
                }
            }
            rt.checked_string_from_utf16(output)?
        }
        "update_in" => {
            let path = array_or_empty(rt, &b)?;
            update_in(rt, a.clone(), &path, &c, arg(args, 3).truthy(), Vec::new()).await?;
            a
        }
        "merge" => {
            let hashes = array_or_empty(rt, &a)?;
            let result = blank(rt, hashes.iter().any(is_array));
            let mode = rt.to_string(&c);
            if mode == "full" && b.is_callable() {
                let mut keys = IndexSet::new();
                for hash in &hashes {
                    for key in rt.keys(hash) {
                        rt.tick()?;
                        keys.insert(key);
                    }
                }
                for key in keys {
                    rt.tick()?;
                    let mut values = Vec::new();
                    let mut present = Vec::new();
                    for hash in &hashes {
                        rt.tick()?;
                        values.push(rt.get(hash, &key));
                        present.push(Value::Bool(has(rt, hash, &key)));
                    }
                    let values = rt.array(values);
                    let present = rt.array(present);
                    let value =
                        invoke(rt, &b, vec![Value::String(key.clone()), values, present]).await?;
                    rt.set(&result, &key, value)?;
                }
            } else {
                for hash in hashes {
                    for key in rt.keys(&hash) {
                        rt.tick()?;
                        let next = rt.get(&hash, &key);
                        let first = !has(rt, &result, &key);
                        let value = if b.is_callable() && (!first || mode == "sequenceWithFirst") {
                            let old = rt.get(&result, &key);
                            let mut argv = vec![Value::String(key.clone()), old, next];
                            if mode == "sequenceWithFirst" {
                                argv.push(Value::Bool(first));
                            }
                            invoke(rt, &b, argv).await?
                        } else {
                            next
                        };
                        rt.set(&result, &key, value)?;
                    }
                }
            }
            result
        }
        "mergeDeep" => {
            if !is_collection(&a) || !is_collection(&b) {
                return Err(invalid("mergeDeep expects two arrays or objects"));
            }
            merge_deep(rt, a, b, c, arg(args, 3).truthy(), Vec::new()).await?
        }
        _ => return Ok(None),
    };
    Ok(Some(value))
}

pub(crate) fn make_list(rt: &mut Runtime, values: Vec<Value>) -> Result<Value> {
    for value in &values {
        rt.tick()?;
        rt.charge_value(value)?;
    }
    Ok(rt.array(values))
}

pub fn call_sync(rt: &mut Runtime, name: &str, args: &[Value]) -> Result<Option<Value>> {
    if matches!(name, "list" | "array" | "[") {
        return make_list(rt, args.to_vec()).map(Some);
    }
    let a = arg(args, 0);
    let b = arg(args, 1);
    let c = arg(args, 2);
    let value = match name {
        "range" => {
            let (mut start, end) = if matches!(b, Value::Undefined) {
                (0.0, rt.to_number(&a))
            } else {
                (rt.to_number(&a), rt.to_number(&b))
            };
            let mut step = rt.to_number(&c);
            if matches!(c, Value::Undefined) || step == 0.0 {
                step = 1.0;
            }
            let mut result = Vec::new();
            while if step > 0.0 { start < end } else { start > end } {
                rt.tick()?;
                rt.charge_items::<Value>(1)?;
                result.push(Value::Number(start));
                start += step;
            }
            rt.array(result)
        }
        "reshape" | "\u{2374}" => {
            let n = if let Value::Number(n) = a { n } else { 1.0 };
            if !n.is_finite() || n < 0.0 || n.fract() != 0.0 || n > u32::MAX as f64 {
                return Err(invalid(
                    "reshape requires a finite nonnegative integer length",
                ));
            }
            let mut result = Vec::new();
            check_reshape_allocation(rt, args.get(1..).unwrap_or(&[]), n as usize)?;
            for i in 0..n as usize {
                rt.tick()?;
                result.push(if args.len() <= 1 {
                    Value::Undefined
                } else {
                    args[1 + i % (args.len() - 1)].clone()
                });
            }
            rt.array(result)
        }
        "zip" => {
            let arrays = array_or_empty(rt, &a)?;
            let mut rows = Vec::new();
            let mut len = if b.truthy() && !arrays.is_empty() {
                usize::MAX
            } else {
                0
            };
            for array in &arrays {
                rt.tick()?;
                let n = length(rt, array);
                len = if b.truthy() { len.min(n) } else { len.max(n) };
            }
            for i in 0..len {
                rt.tick()?;
                rt.charge_items::<Value>(1)?;
                let mut row = Vec::new();
                for array in &arrays {
                    rt.tick()?;
                    let value = rt.get(array, &i.to_string());
                    rt.charge_value(&value)?;
                    row.push(value);
                }
                rows.push(rt.array(row));
            }
            rt.array(rows)
        }
        "count" | "length" => rt.get(&a, "length"),
        "empty" | "empty?" => Value::Bool(is_array(&a) && length(rt, &a) == 0),
        "reverse" => {
            if !rt.controls_active() {
                if let Some(mut values) = rt.dense_array_values(&a) {
                    for _ in &values {
                        rt.tick()?;
                    }
                    values.reverse();
                    return Ok(Some(rt.array(values)));
                }
            }
            let result = rt.array(Vec::new());
            for key in rt.keys(&a).into_iter().rev() {
                rt.tick()?;
                let value = rt.get(&a, &key);
                let dest = if numeric_key(rt, &key) {
                    length(rt, &result).to_string()
                } else {
                    key
                };
                rt.set(&result, &dest, value)?;
            }
            result
        }
        "slice" | "rest" => {
            let start = if name == "rest" {
                1.0
            } else {
                rt.to_number(&b)
            };
            if matches!(&a, Value::String(_) | Value::Utf16(_)) {
                let units = rt.checked_to_utf16(&a)?;
                let lo = slice_index(start, units.len());
                let hi = if name == "rest" || matches!(c, Value::Undefined) {
                    units.len()
                } else {
                    slice_index(rt.to_number(&c), units.len())
                };
                rt.copy_units_value(&units[lo..hi.max(lo)])?
            } else if is_array(&a) {
                let len = length(rt, &a);
                let lo = slice_index(start, len);
                let hi = if name == "rest" || matches!(c, Value::Undefined) {
                    len
                } else {
                    slice_index(rt.to_number(&c), len)
                };
                let result = rt.array(Vec::new());
                for i in lo..hi {
                    rt.tick()?;
                    if has(rt, &a, &i.to_string()) {
                        let value = rt.get(&a, &i.to_string());
                        rt.set(&result, &(i - lo).to_string(), value)?;
                    }
                }
                rt.set(&result, "length", number(hi.saturating_sub(lo)))?;
                result
            } else {
                rt.array(Vec::new())
            }
        }
        "concat" | "cons" | "pushStart" => {
            let result = rt.array(Vec::new());
            let mut offset = 0;
            if name != "concat" {
                rt.set(&result, "0", a.clone())?;
                offset = 1;
            }
            let inputs = if name == "concat" {
                args
            } else {
                std::slice::from_ref(&b)
            };
            for input in inputs {
                rt.tick()?;
                if is_array(input) {
                    let len = length(rt, input);
                    for i in 0..len {
                        rt.tick()?;
                        if has(rt, input, &i.to_string()) {
                            let value = rt.get(input, &i.to_string());
                            rt.set(&result, &(offset + i).to_string(), value)?;
                        }
                    }
                    offset += len;
                } else {
                    rt.set(&result, &offset.to_string(), input.clone())?;
                    offset += 1;
                }
            }
            rt.set(&result, "length", number(offset))?;
            result
        }
        "first" => {
            if length(rt, &a) > 0 {
                rt.get(&a, "0")
            } else {
                Value::Null
            }
        }
        "last" => {
            let len = length(rt, &a);
            rt.get(
                &a,
                &if len == 0 {
                    "-1".to_owned()
                } else {
                    (len - 1).to_string()
                },
            )
        }
        "flat" => {
            if !is_array(&a) {
                return Ok(Some(a));
            }
            let depth = if b.is_nullish() {
                1.0
            } else {
                rt.to_number(&b).trunc().max(0.0)
            };
            let mut stack = vec![(a, 0usize, depth)];
            let mut result = Vec::new();
            while let Some((array, index, depth)) = stack.pop() {
                rt.tick()?;
                if index >= length(rt, &array) {
                    continue;
                }
                stack.push((array.clone(), index + 1, depth));
                if !has(rt, &array, &index.to_string()) {
                    continue;
                }
                let value = rt.get(&array, &index.to_string());
                if depth > 0.0 && is_array(&value) {
                    stack.push((value, 0, depth - 1.0));
                } else {
                    result.push(value);
                }
            }
            rt.array(result)
        }
        "frequencies" | "counter" => {
            let mut result = IndexMap::new();
            for i in 0..if is_array(&a) { length(rt, &a) } else { 0 } {
                rt.tick()?;
                if !has(rt, &a, &i.to_string()) {
                    continue;
                }
                let key = property_key(rt, &rt.get(&a, &i.to_string()))?;
                let count = match result.get(&key) {
                    Some(Value::Number(n)) => *n,
                    _ => 0.0,
                };
                result.insert(key, Value::Number(count + 1.0));
            }
            rt.object(result)
        }
        "partition" => {
            let values = array_or_empty(rt, &a)?;
            let n = rt.to_number(&b);
            let mut groups = Vec::new();
            let mut group: Option<Vec<Value>> = None;
            for (i, item) in values.into_iter().enumerate() {
                rt.tick()?;
                if !has(rt, &a, &i.to_string()) {
                    continue;
                }
                if (i as f64) % n == 0.0 {
                    if let Some(previous) = group.take() {
                        groups.push(rt.array(previous));
                    }
                    group = Some(Vec::new());
                }
                group
                    .as_mut()
                    .ok_or_else(|| {
                        invalid("partition has no initial group for this size and sparse input")
                    })?
                    .push(item);
            }
            if let Some(group) = group {
                groups.push(rt.array(group));
            }
            rt.array(groups)
        }
        "shuffle" | "sample" => {
            let len = if is_array(&a) { length(rt, &a) } else { 0 };
            let mut values = Vec::new();
            for i in 0..len {
                rt.tick()?;
                if has(rt, &a, &i.to_string()) {
                    values.push(rt.get(&a, &i.to_string()));
                }
            }
            let mut rng = rand::thread_rng();
            for i in (1..values.len()).rev() {
                rt.tick()?;
                values.swap(i, rng.gen_range(0..=i));
            }
            if name == "shuffle" {
                let result = rt.array(values);
                rt.set(&result, "length", number(len))?;
                result
            } else {
                let n = if let Value::Number(n) = b { n } else { 1.0 };
                if n == 1.0 {
                    values.into_iter().next().unwrap_or(Value::Undefined)
                } else {
                    let count = slice_index(n, len);
                    values.truncate(count);
                    let result = rt.array(values);
                    rt.set(&result, "length", number(count))?;
                    result
                }
            }
        }
        "pluck" => {
            let key = property_key(rt, &b)?;
            let result = rt.array(Vec::new());
            let len = if is_array(&a) { length(rt, &a) } else { 0 };
            for i in 0..len {
                rt.tick()?;
                if has(rt, &a, &i.to_string()) {
                    let v = rt.get(&rt.get(&a, &i.to_string()), &key);
                    rt.set(&result, &i.to_string(), v)?;
                }
            }
            rt.set(&result, "length", number(len))?;
            result
        }
        "join" => {
            if let Some(value) = join_utf8(rt, &a, &b)? {
                return Ok(Some(value));
            }
            let sep = if matches!(b, Value::Undefined) {
                vec![b',' as u16]
            } else {
                rt.checked_to_utf16(&b)?
            };
            let mut output = Vec::new();
            let mut first = true;
            for v in array_or_empty(rt, &a)? {
                rt.tick()?;
                let part = if v.is_nullish() {
                    Vec::new()
                } else {
                    rt.checked_to_utf16(&v)?
                };
                append_joined(rt, &mut output, &part, &sep, first)?;
                first = false;
            }
            rt.checked_string_from_utf16(output)?
        }
        "contains?" | "containsKey" => Value::Bool(has(rt, &a, &property_key(rt, &b)?)),
        "get" | "nth" => {
            let key = property_key(rt, &b)?;
            if has(rt, &a, &key) {
                rt.get(&a, &key)
            } else {
                c
            }
        }
        "set" => {
            let key = property_key(rt, &b)?;
            rt.set(&a, &key, c)?;
            a
        }
        "del" => {
            let key = property_key(rt, &b)?;
            Value::Bool(rt.delete(&a, &key)?)
        }
        "keys" | "vals" | "values" | "entries" => {
            let mut result = Vec::new();
            for key in rt.keys(&a) {
                rt.tick()?;
                let value = rt.get(&a, &key);
                result.push(match name {
                    "keys" => Value::String(key),
                    "entries" => rt.array(vec![Value::String(key), value]),
                    _ => value,
                });
            }
            rt.array(result)
        }
        "fromEntries" => {
            let mut result = IndexMap::new();
            for pair in array_or_empty(rt, &a)? {
                rt.tick()?;
                if !is_collection(&pair) {
                    return Err(invalid("fromEntries expects object or array entries"));
                }
                let key = property_key(rt, &rt.get(&pair, "0"))?;
                result.insert(key, rt.get(&pair, "1"));
            }
            rt.object(result)
        }
        "select" => selection(rt, &a, &b, false, 0)?,
        "omit" => {
            let copy = clone_graph(rt, &a)?;
            selection(rt, &copy, &b, true, 0)?
        }
        "compact" => {
            let copy = clone_graph(rt, &a)?;
            let depth = if let Value::Number(n) = b { n } else { 1.0 };
            compact(rt, &copy, depth, 0)?;
            copy
        }
        "makeStruct" => {
            if !is_collection(&b) {
                return Err(invalid("makeStruct expects an array or object schema"));
            }
            make_struct(rt, &a, &b, 0)?
        }
        _ => return Ok(None),
    };
    Ok(Some(value))
}

fn greater(rt: &Runtime, a: &Value, b: &Value) -> bool {
    let primitive = |v: &Value| match v {
        Value::Array(_) | Value::Object(_) => rt.string_from_utf16(rt.to_utf16(v)),
        _ => v.clone(),
    };
    let (a, b) = (primitive(a), primitive(b));
    match (&a, &b) {
        (Value::String(_) | Value::Utf16(_), Value::String(_) | Value::Utf16(_)) => {
            rt.to_utf16(&a) > rt.to_utf16(&b)
        }
        _ => rt.to_number(&a) > rt.to_number(&b),
    }
}
