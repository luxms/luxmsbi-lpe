//! Fixed-offset date/time operations shared with the JS 1.8 calendar API.
use crate::{Error, Result, Runtime, Value};
use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, Timelike};

fn range(message: impl Into<String>) -> Error {
    Error::new("RangeError", message)
}
fn year_error() -> Error {
    range("Year must be between 0000 and 9999.")
}
pub(crate) fn unit(rt: &Runtime, value: &Value) -> String {
    let name = rt.to_string(value).trim().to_lowercase();
    match name.as_str() {
        "year" => "y",
        "quarter" => "q",
        "month" => "m",
        "week" | "ww" | "iw" => "w",
        "day" | "dd" => "d",
        "hour" | "hh" | "hh24" => "h",
        "minute" | "min" | "mi" => "n",
        "second" | "sec" | "ss" => "s",
        _ => &name,
    }
    .to_owned()
}
pub(crate) fn is_time(unit: &str) -> bool {
    matches!(unit, "h" | "n" | "s")
}

#[derive(Clone)]
struct Parts {
    date: NaiveDateTime,
    fraction: String,
    zone: String,
    offset: i64,
}
fn digits(input: &mut &str, count: usize) -> Option<u32> {
    let part = input.get(..count)?;
    if !part.bytes().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let n = part.parse().ok()?;
    *input = &input[count..];
    Some(n)
}
fn parse(text: &str) -> Result<Parts> {
    let text = text.trim();
    let read = || -> Option<Parts> {
        let mut input = text;
        let y = digits(&mut input, 4)?;
        if input.starts_with(['-', '.', '/']) {
            input = &input[1..];
        }
        let m = digits(&mut input, 2)?;
        if input.starts_with(['-', '.', '/']) {
            input = &input[1..];
        }
        let d = digits(&mut input, 2)?;
        let (mut h, mut n, mut s) = (0, 0, 0);
        let mut fraction = String::new();
        let mut zone = String::new();
        let mut offset = 0;
        if !input.is_empty() {
            input = input.strip_prefix(['T', 't', ' '])?;
            h = digits(&mut input, 2)?;
            input = input.strip_prefix(':')?;
            n = digits(&mut input, 2)?;
            input = input.strip_prefix(':')?;
            s = digits(&mut input, 2)?;
            if let Some(rest) = input.strip_prefix('.') {
                let count = rest.bytes().take_while(u8::is_ascii_digit).count();
                if !(1..=9).contains(&count) {
                    return None;
                }
                fraction = rest[..count].into();
                input = &rest[count..];
            }
            input = input.trim_start();
            zone = input.to_ascii_uppercase();
            if !input.is_empty() && !input.eq_ignore_ascii_case("z") {
                let negative = input.starts_with('-');
                input = input.strip_prefix(['+', '-'])?;
                let hours = digits(&mut input, 2)?;
                let minutes = if input.is_empty() {
                    0
                } else {
                    input = input.strip_prefix(':').unwrap_or(input);
                    digits(&mut input, 2)?
                };
                if hours > 23 || minutes > 59 || !input.is_empty() {
                    return None;
                }
                offset = i64::from(hours * 60 + minutes) * if negative { -1 } else { 1 };
            }
        }
        Some(Parts {
            date: NaiveDate::from_ymd_opt(y as i32, m, d)?.and_hms_opt(h, n, s)?,
            fraction,
            zone,
            offset,
        })
    };
    read().ok_or_else(|| range(format!("Invalid date and time: {text}")))
}
fn format(parts: &Parts) -> Result<Value> {
    if !(0..=9999).contains(&parts.date.year()) {
        return Err(year_error());
    }
    let mut text = parts.date.format("%Y-%m-%d %H:%M:%S").to_string();
    if !parts.fraction.is_empty() {
        text.push('.');
        text.push_str(&parts.fraction);
    }
    text.push_str(&parts.zone);
    Ok(Value::String(text))
}
fn seconds(parts: &mut Parts, delta: f64) -> Result<()> {
    if !delta.is_finite() {
        return Err(range("Shift in seconds must be a finite number."));
    }
    let whole = delta.trunc();
    if whole.abs() > 400_000_000_000.0 {
        return Err(year_error());
    }
    let remainder = delta - whole;
    let extra = format!("{:.9}", remainder.abs());
    let precision = parts
        .fraction
        .len()
        .max(extra[2..].trim_end_matches('0').len());
    let scale = 10i64.pow(precision as u32);
    let fraction = parts.fraction.parse::<i64>().unwrap_or(0)
        * 10i64.pow((precision - parts.fraction.len()) as u32)
        + (remainder * scale as f64 + 0.5).floor() as i64;
    let carry = fraction.div_euclid(scale);
    parts.date = parts
        .date
        .checked_add_signed(Duration::seconds(whole as i64 + carry))
        .ok_or_else(year_error)?;
    parts.fraction = if precision == 0 {
        String::new()
    } else {
        format!("{:0precision$}", fraction.rem_euclid(scale))
    };
    Ok(())
}
fn last_day(y: i32, m: u32) -> u32 {
    (28..=31)
        .rev()
        .find(|&d| NaiveDate::from_ymd_opt(y, m, d).is_some())
        .unwrap()
}
pub(crate) fn shift(
    rt: &mut Runtime,
    start: Value,
    delta: &Value,
    unit: &str,
    depth: usize,
) -> Result<Value> {
    if !matches!(unit, "y" | "q" | "m" | "w" | "d" | "h" | "n" | "s") {
        return Err(range(format!("Unknown date unit: {unit}")));
    }
    let Value::Number(delta) = delta else {
        return Err(range(
            "Shift must be a finite number and an integer for months, quarters, and years.",
        ));
    };
    if !delta.is_finite() || (matches!(unit, "y" | "q" | "m") && delta.fract() != 0.0) {
        return Err(range(
            "Shift must be a finite number and an integer for months, quarters, and years.",
        ));
    }
    if depth > 128 {
        return Err(Error::new("LimitError", "Date pair nesting limit exceeded"));
    }
    if matches!(start, Value::Array(_)) {
        let pair = rt.array_values(&start)?;
        if matches!(pair.first(), Some(Value::String(s)) if matches!(s.as_str(), "'" | "\"")) {
            if let Some(value @ Value::String(_)) = pair.get(1) {
                return shift(rt, value.clone(), &Value::Number(*delta), unit, depth + 1);
            }
        }
        let a = shift(
            rt,
            pair.first().cloned().unwrap_or(Value::Undefined),
            &Value::Number(*delta),
            unit,
            depth + 1,
        )?;
        let b = shift(
            rt,
            pair.get(1).cloned().unwrap_or(Value::Undefined),
            &Value::Number(*delta),
            unit,
            depth + 1,
        )?;
        return Ok(rt.array(vec![a, b]));
    }
    let mut parts = parse(&rt.to_string(&start))?;
    let multiplier = match unit {
        "w" => 604800.,
        "d" => 86400.,
        "h" => 3600.,
        "n" => 60.,
        "s" => 1.,
        _ => 0.,
    };
    if multiplier != 0. {
        seconds(&mut parts, delta * multiplier)?;
    } else {
        let stride = if unit == "y" { 12 } else { 1 };
        let steps = delta * if unit == "q" { 3. } else { 1. };
        let final_month = f64::from(parts.date.year() * 12 + parts.date.month0() as i32)
            + steps * f64::from(stride);
        if !(0.0..120000.0).contains(&final_month) {
            return Err(year_error());
        }
        for _ in 0..steps.abs() as usize {
            rt.tick()?;
            let date = parts.date.date();
            let last = date.day() == last_day(date.year(), date.month());
            let month =
                date.year() * 12 + date.month0() as i32 + stride * if steps < 0. { -1 } else { 1 };
            let (y, m) = (month.div_euclid(12), month.rem_euclid(12) as u32 + 1);
            let day = if last {
                last_day(y, m)
            } else {
                date.day().min(last_day(y, m))
            };
            parts.date = NaiveDate::from_ymd_opt(y, m, day)
                .ok_or_else(year_error)?
                .and_time(parts.date.time());
        }
    }
    format(&parts)
}
pub(crate) fn boundary(rt: &Runtime, start: &Value, unit: &str, end: bool) -> Result<Value> {
    let mut parts = parse(&rt.to_string(start))?;
    let (h, n, s) = (parts.date.hour(), parts.date.minute(), parts.date.second());
    parts.date = parts
        .date
        .date()
        .and_hms_opt(
            if unit == "d" { 0 } else { h },
            if matches!(unit, "d" | "h") { 0 } else { n },
            if unit == "s" { s } else { 0 },
        )
        .unwrap();
    parts.fraction.clear();
    if end {
        seconds(
            &mut parts,
            match unit {
                "d" => 86399.,
                "h" => 3599.,
                "n" => 59.,
                _ => 0.,
            },
        )?;
    }
    format(&parts)
}
pub(crate) fn extract(rt: &Runtime, start: &Value, unit: &str) -> Result<Value> {
    let p = parse(&rt.to_string(start))?;
    Ok(Value::Number(match unit {
        "h" => p.date.hour(),
        "n" => p.date.minute(),
        _ => p.date.second(),
    } as f64))
}
pub(crate) fn extend(rt: &mut Runtime, pair: &[Value], delta: &Value, unit: &str) -> Result<Value> {
    let a = parse(&rt.to_string(pair.first().unwrap_or(&Value::Undefined)))?;
    let b = shift(
        rt,
        pair.get(1).cloned().unwrap_or(Value::Undefined),
        delta,
        unit,
        0,
    )?;
    let b = parse(&rt.to_string(&b))?;
    let instant = |p: &Parts| {
        (
            p.date.and_utc().timestamp() - p.offset * 60,
            format!("{:0<9}", p.fraction).parse::<u32>().unwrap_or(0),
        )
    };
    let mut values = vec![format(&a)?, format(&b)?];
    if instant(&a) > instant(&b) {
        values.reverse();
    }
    Ok(rt.array(values))
}
