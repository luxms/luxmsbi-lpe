//! Native implementation of the JS 1.8 calendar context.
//!
//! `today` and the date/time `now` function use UTC. Week numbers use Gregorian UTC
//! dates, while weekday boundaries and `doty` use the host's local timezone.
//! In particular, `doty` floors elapsed milliseconds since local December 31:
//! it is intentionally NOT the calendar ordinal during daylight saving time.
//! Ambiguous local times select the earlier instant; gaps use the pre-gap
//! offset, matching JavaScript Date construction.
//!
//! Calendar arithmetic retains the source's divisible-by-four leap rule,
//! stepwise month-end retention, permissive digit extraction, calendar year
//! in `isow`, and unpadded ordinal in `isod`. D-tagged literals are strings,
//! not Date objects; quoted AST arrays are accepted as values as well.
//! Infinite shifts return RangeError instead of trapping the evaluator in an
//! unbounded loop; finite shifts honor the Runtime's step/cancellation budget.

use chrono::{Datelike, Duration, Local, LocalResult, NaiveDate, NaiveDateTime, TimeZone};

use crate::{Error, Result, Runtime, Value};

pub fn names() -> &'static [&'static str] {
    &[
        "dateShift",
        "dateTimeShift",
        "extract",
        "today",
        "now",
        "bound",
        "extend",
        "toStart",
        "toEnd",
        "isoy",
        "isoq",
        "isom",
        "isow",
        "isod",
        "year",
        "hoty",
        "qoty",
        "moty",
        "woty",
        "doty",
    ]
}

/// Arguments are already evaluated. Unknown names return `Ok(None)`.
pub async fn call(rt: &mut Runtime, name: &str, args: &[Value]) -> Result<Option<Value>> {
    if !names().contains(&name) {
        return Ok(None);
    }
    if name == "today" {
        return Ok(Some(today(rt)));
    }
    if name == "now" {
        return Ok(Some(now(rt)));
    }
    let one = unwrap(rt, args.first().unwrap_or(&Value::Undefined))?;
    let two = unwrap(rt, args.get(1).unwrap_or(&Value::Undefined))?;
    let three = unwrap(rt, args.get(2).unwrap_or(&Value::Undefined))?;
    let result = match name {
        "dateShift" | "dateTimeShift" | "extend" => {
            let unit = crate::time::unit(
                rt,
                if three == Value::Undefined {
                    &two
                } else {
                    &three
                },
            );
            let timed = crate::time::is_time(&unit) || name == "dateTimeShift";
            let (start, delta) = if three == Value::Undefined {
                (if timed { now(rt) } else { today(rt) }, one)
            } else {
                (one, two)
            };
            if timed {
                let value = if name == "extend" {
                    if matches!(start, Value::Array(_)) {
                        let pair = rt.array_values(&start)?;
                        crate::time::extend(rt, &pair, &delta, &unit)?
                    } else {
                        let end = crate::time::shift(rt, start.clone(), &delta, &unit, 0)?;
                        rt.array(vec![start, end])
                    }
                } else {
                    crate::time::shift(rt, start, &delta, &unit, 0)?
                };
                return Ok(Some(value));
            }
            let unit = Value::String(unit);
            if name == "dateShift" {
                shift(rt, start, &delta, &unit, 0)?
            } else if matches!(start, Value::Array(_)) {
                let pair = rt.array_values(&start)?;
                let s = pair.first().cloned().unwrap_or(Value::Undefined);
                let e = shift(
                    rt,
                    pair.get(1).cloned().unwrap_or(Value::Undefined),
                    &delta,
                    &unit,
                    0,
                )?;
                let a = raw(rt, &s).parse::<u64>().unwrap_or(0);
                let b = raw(rt, &e).parse::<u64>().unwrap_or(0);
                rt.array(vec![
                    formatted(&a.min(b).to_string()),
                    formatted(&a.max(b).to_string()),
                ])
            } else {
                let end = shift(rt, start.clone(), &delta, &unit, 0)?;
                rt.array(vec![start, end])
            }
        }
        "toStart" | "toEnd" | "bound" => {
            let unit = crate::time::unit(rt, if two == Value::Undefined { &one } else { &two });
            let start = if two == Value::Undefined {
                if crate::time::is_time(&unit) {
                    now(rt)
                } else {
                    today(rt)
                }
            } else {
                one
            };
            let unit = Value::String(unit);
            if name == "bound" {
                let first = boundary(rt, &start, &unit, false)?;
                let last = boundary(rt, &start, &unit, true)?;
                rt.array(vec![first, last])
            } else {
                boundary(rt, &start, &unit, name == "toEnd")?
            }
        }
        "extract" => {
            let unit = crate::time::unit(rt, &two);
            let p = raw(rt, &one);
            let (year, month, day) = split(&p);
            match unit.as_str() {
                "y" => Value::Number(year as f64),
                "q" if p.is_empty() => Value::Null,
                "q" => Value::Number((month as f64 / 3.0).ceil()),
                "m" => Value::Number(month as f64),
                "w" => Value::Number(week_number(&p)),
                "d" => Value::Number(day as f64),
                "h" | "n" | "s" => crate::time::extract(rt, &one, &unit)?,
                _ => {
                    return Err(Error::new(
                        "RangeError",
                        format!("Unknown date unit: {unit}"),
                    ))
                }
            }
        }
        _ => {
            let p = raw(rt, &one);
            let (year, month, _) = split(&p);
            let quarter = if p.is_empty() {
                Value::Null
            } else {
                Value::Number((month as f64 / 3.0).ceil())
            };
            match name {
                "year" => Value::Number(year as f64),
                "hoty" => Value::Number(if month > 6 { 2.0 } else { 1.0 }),
                "qoty" => quarter,
                "moty" => Value::Number(month as f64),
                "woty" => Value::Number(week_number(&p)),
                "doty" => Value::Number(day_number(&p)),
                "isoy" => Value::String(year.to_string()),
                "isom" => Value::String(format!("{year}-{}", l2(&month.to_string()))),
                "isoq" => Value::String(format!("{year}-Q{}", rt.to_string(&quarter))),
                "isow" => Value::String(format!("{year}-W{}", l2(&week_number(&p).to_string()))),
                "isod" => Value::String(format!("{year}-{}", day_number(&p))),
                _ => unreachable!(),
            }
        }
    };
    Ok(Some(result))
}

fn now(rt: &Runtime) -> Value {
    Value::String(rt.utc_now().format("%Y-%m-%d %H:%M:%S").to_string())
}

fn today(rt: &Runtime) -> Value {
    Value::String(rt.utc_now().format("%Y-%m-%d").to_string())
}

fn unwrap(rt: &Runtime, value: &Value) -> Result<Value> {
    if matches!(value, Value::Array(_)) {
        let values = rt.array_values(value)?;
        if matches!(values.first(), Some(Value::String(s)) if s == "'" || s == "\"") {
            if let Some(Value::String(s)) = values.get(1) {
                return Ok(Value::String(s.clone()));
            }
        }
    }
    Ok(value.clone())
}

fn digits(s: &str) -> String {
    s.chars().filter(char::is_ascii_digit).take(8).collect()
}

fn raw(rt: &Runtime, value: &Value) -> String {
    digits(&rt.to_string(value))
}

fn slice(s: &str, start: usize, end: usize) -> &str {
    &s[start.min(s.len())..end.min(s.len())]
}

fn split(s: &str) -> (i32, i32, i32) {
    (
        slice(s, 0, 4).parse().unwrap_or(0),
        slice(s, 4, 6).parse().unwrap_or(0),
        slice(s, 6, 8).parse().unwrap_or(0),
    )
}

fn formatted(s: &str) -> Value {
    let p = digits(s);
    Value::String(format!(
        "{}-{}-{}",
        slice(&p, 0, 4),
        slice(&p, 4, 6),
        slice(&p, 6, 8)
    ))
}

fn l2(s: &str) -> String {
    let s = format!("00{s}");
    s[s.len() - 2..].to_owned()
}

fn make_period(y: i32, m: i32, d: Option<i32>) -> String {
    format!(
        "{y}{}{}",
        l2(&m.to_string()),
        l2(&d
            .map(|v| v.to_string())
            .unwrap_or_else(|| "undefined".into()))
    )
}

fn days_in_month(y: i32, m: i32) -> Option<i32> {
    if m == 2 && split(&y.to_string()).0 % 4 == 0 {
        return Some(29);
    }
    [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        .get(m as usize)
        .copied()
}

#[derive(Clone, Copy)]
enum Unit {
    Day,
    Month,
    Year,
}

fn step(p: &str, unit: Unit, forward: bool) -> String {
    let (mut y, mut m, mut d) = split(p);
    let direction = if forward { 1 } else { -1 };
    if matches!(unit, Unit::Day) {
        d += direction;
        if forward {
            if days_in_month(y, m).is_some_and(|last| d <= last) {
                return make_period(y, m, Some(d));
            }
            m += 1;
            if m > 12 {
                y += 1;
                m = 1;
            }
            return make_period(y, m, Some(1));
        }
        if d != 0 {
            return make_period(y, m, Some(d));
        }
        m -= 1;
        if m == 0 {
            y -= 1;
            m = 12;
        }
        return make_period(y, m, days_in_month(y, m));
    }
    if forward && matches!(unit, Unit::Month) && p.is_empty() {
        return String::new();
    }
    let last_day = days_in_month(y, m) == Some(d);
    match unit {
        Unit::Month => {
            m += direction;
            if forward && m > 12 {
                y += 1;
                m = 1;
            }
            if !forward && m == 0 {
                y -= 1;
                m = 12;
            }
        }
        Unit::Year => y += direction,
        Unit::Day => unreachable!(),
    }
    let last = days_in_month(y, m);
    make_period(
        y,
        m,
        if last_day || last.is_some_and(|last| d > last) {
            last
        } else {
            Some(d)
        },
    )
}

fn shift(
    rt: &mut Runtime,
    start: Value,
    delta: &Value,
    unit: &Value,
    depth: usize,
) -> Result<Value> {
    rt.tick()?;
    if depth > 256 {
        return Err(Error::new(
            "RangeError",
            "Date pair nesting exceeds 256 levels",
        ));
    }
    let start = unwrap(rt, &start)?;
    if matches!(start, Value::Array(_)) {
        let pair = rt.array_values(&start)?;
        let first = shift(
            rt,
            pair.first().cloned().unwrap_or(Value::Undefined),
            delta,
            unit,
            depth + 1,
        )?;
        let last = shift(
            rt,
            pair.get(1).cloned().unwrap_or(Value::Undefined),
            delta,
            unit,
            depth + 1,
        )?;
        return Ok(rt.array(vec![first, last]));
    }
    let (kind, multiplier) = match unit {
        Value::String(s) => match s.as_str() {
            "d" | "day" => (Unit::Day, 1.0),
            "w" | "week" => (Unit::Day, 7.0),
            "m" | "month" => (Unit::Month, 1.0),
            "q" | "quarter" => (Unit::Month, 3.0),
            "y" | "year" => (Unit::Year, 1.0),
            _ => return Ok(start),
        },
        _ => return Ok(start),
    };
    let delta = if multiplier == 1.0 {
        match delta {
            Value::Number(n) => *n,
            _ => f64::NAN,
        }
    } else {
        rt.to_number(delta) * multiplier
    };
    let mut period = raw(rt, &start);
    // JS's comparisons with NaN both fail, so it behaves like a zero shift.
    if !delta.is_finite() {
        return Err(Error::new("RangeError", "Date shift must be finite"));
    }
    for _ in 0..delta.abs().ceil() as usize {
        rt.tick()?;
        period = step(&period, kind, delta > 0.0);
        // Month/year helpers re-extract digits before each step, unlike day helpers.
        if !matches!(kind, Unit::Day) {
            period = digits(&period);
        }
    }
    Ok(formatted(&period))
}

fn boundary(rt: &Runtime, start: &Value, unit: &Value, end: bool) -> Result<Value> {
    let p = raw(rt, start);
    let (y, m, _) = split(&p);
    let unit = match unit {
        Value::String(s) => s.as_str(),
        _ => return Ok(start.clone()),
    };
    if crate::time::is_time(unit) || (end && unit == "d") {
        return crate::time::boundary(rt, start, unit, end);
    }
    let result = match unit {
        "d" => return Ok(formatted(&p)),
        "w" | "week" => {
            if p.is_empty() {
                return Ok(formatted(""));
            }
            let dow = normalized_date(&p)
                .and_then(|d| {
                    local_midnight(d).and_then(|ms| Local.timestamp_millis_opt(ms).single())
                })
                .map(|d| d.weekday().number_from_monday());
            let Some(dow) = dow else {
                return Ok(formatted(&p));
            };
            let mut p = p;
            for _ in 0..if end { 7 - dow } else { dow - 1 } {
                p = step(&p, Unit::Day, end);
            }
            p
        }
        "m" | "month" => make_period(y, m, if end { days_in_month(y, m) } else { Some(1) }),
        "q" | "quarter" => {
            let q = (m as f64 / 3.0).ceil() as i32;
            if !(1..=4).contains(&q) {
                // Source quarter helpers return null, whose l2 representation is "ll".
                return Ok(formatted(&format!(
                    "{y}ll{}",
                    if end { "ed" } else { "01" }
                )));
            }
            let m = if end { q * 3 } else { q * 3 - 2 };
            make_period(y, m, if end { days_in_month(y, m) } else { Some(1) })
        }
        "y" | "year" => make_period(y, if end { 12 } else { 1 }, Some(if end { 31 } else { 1 })),
        _ => return Ok(start.clone()),
    };
    Ok(formatted(&result))
}

// JavaScript Date/Date.UTC normalize overflowing components and map 0..99 to 1900..1999.
fn normalized_date(p: &str) -> Option<NaiveDate> {
    let (y, m, d) = split(p);
    date_components(y, m, d)
}

fn date_components(mut y: i32, m: i32, d: i32) -> Option<NaiveDate> {
    if (0..=99).contains(&y) {
        y += 1900;
    }
    y += (m - 1).div_euclid(12);
    let m = (m - 1).rem_euclid(12) as u32 + 1;
    NaiveDate::from_ymd_opt(y, m, 1)?.checked_add_signed(Duration::days(d as i64 - 1))
}

fn week_number(p: &str) -> f64 {
    if p.is_empty() {
        return -1.0;
    }
    // The source uses ceil, including for dates normalized across year 100.
    let calculate = || {
        let date = normalized_date(p)?;
        let thursday = date.checked_add_signed(Duration::days(
            4 - i64::from(date.weekday().number_from_monday()),
        ))?;
        let start = date_components(thursday.year(), 1, 1)?;
        Some((((thursday - start).num_days() as f64 + 1.0) / 7.0).ceil())
    };
    calculate().unwrap_or(f64::NAN)
}

fn local_timestamp(date: NaiveDateTime) -> Option<i64> {
    match Local.from_local_datetime(&date) {
        LocalResult::Single(d) => Some(d.timestamp_millis()),
        LocalResult::Ambiguous(a, b) => Some(a.timestamp_millis().min(b.timestamp_millis())),
        LocalResult::None => {
            // Midnight can be skipped by DST or an international date-line change.
            for hours in 1..=48 {
                let before = date.checked_sub_signed(Duration::hours(hours))?;
                if let Some(before) = Local.from_local_datetime(&before).earliest() {
                    return Some(
                        date.and_utc().timestamp_millis()
                            - i64::from(before.offset().local_minus_utc()) * 1000,
                    );
                }
            }
            None
        }
    }
}

fn local_midnight(date: NaiveDate) -> Option<i64> {
    local_timestamp(date.and_hms_opt(0, 0, 0)?)
}

fn day_number(p: &str) -> f64 {
    if p.is_empty() {
        return -1.0;
    }
    let calculate = || {
        let now = local_midnight(normalized_date(p)?)?;
        let year = Local.timestamp_millis_opt(now).single()?.year();
        let start = local_midnight(date_components(year, 1, 0)?)?;
        Some(((now - start) as f64 / 86_400_000.0).floor())
    };
    calculate().unwrap_or(f64::NAN)
}
