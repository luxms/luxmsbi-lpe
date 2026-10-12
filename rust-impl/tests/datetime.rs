use chrono::{Datelike, Local, TimeZone, Utc};
use futures::executor::block_on;
use serde_json::{json, Value as Json};

// The production dispatcher keeps this module private. Exercise its public
// contract directly with the real Runtime, without widening the library API.
use lpe::{Error, Result, Runtime, Value};
#[path = "../src/datetime.rs"]
mod datetime;

fn invoke(rt: &mut Runtime, name: &str, args: &[Json]) -> Json {
    let args: Vec<_> = args.iter().map(|v| rt.from_json(v)).collect();
    let value = block_on(datetime::call(rt, name, &args)).unwrap().unwrap();
    rt.to_json(&value).unwrap()
}

fn check(name: &str, args: Json, expected: Json) {
    let mut rt = Runtime::new();
    let expected = rt.from_json(&expected);
    let expected = rt.to_json(&expected).unwrap();
    assert_eq!(
        invoke(&mut rt, name, args.as_array().unwrap()),
        expected,
        "{name}({args})"
    );
}

#[test]
fn all_source_names_and_aliases_are_registered() {
    assert_eq!(
        datetime::names(),
        &[
            "dateShift",
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
    );
    let mut rt = Runtime::new();
    for name in datetime::names() {
        assert!(
            block_on(datetime::call(&mut rt, name, &[]))
                .unwrap()
                .is_some(),
            "{name}"
        );
    }
    for name in ["getDoW", "TODAY", "date", "not_a_datetime_builtin"] {
        assert_eq!(block_on(datetime::call(&mut rt, name, &[])).unwrap(), None);
    }
}

#[test]
fn today_and_now_are_utc_date_strings() {
    let mut rt = Runtime::new();
    for name in ["today", "now"] {
        let before = Utc::now().format("%Y-%m-%d").to_string();
        let value = invoke(&mut rt, name, &[json!("ignored")]);
        let after = Utc::now().format("%Y-%m-%d").to_string();
        assert!(value == before || value == after);
        assert_eq!(value.as_str().unwrap().len(), 10);
    }
}

#[test]
fn shift_source_cases_and_every_unit_alias() {
    for (date, delta, unit, expected) in [
        ("2023-10-15", 0, "day", "2023-10-15"),
        ("2023-10-15", 0, "month", "2023-10-15"),
        ("2023-10-15", 0, "year", "2023-10-15"),
        ("2023-10-15", 5, "day", "2023-10-20"),
        ("2023-10-15", -5, "d", "2023-10-10"),
        ("2023-10-15", 1, "month", "2023-11-15"),
        ("2023-10-15", -1, "m", "2023-09-15"),
        ("2023-01-31", 1, "m", "2023-02-28"),
        ("2024-02-28", 1, "d", "2024-02-29"),
        ("2024-02-29", 1, "year", "2025-02-28"),
        ("2023-10-15", 1, "y", "2024-10-15"),
        ("2023-10-15", -1, "year", "2022-10-15"),
        ("2023-10-15", 1, "week", "2023-10-22"),
        ("2023-10-15", -1, "w", "2023-10-08"),
        ("2023-12-31", 1, "d", "2024-01-01"),
        ("2024-01-01", -1, "d", "2023-12-31"),
        ("2023-11-15", 5, "month", "2024-04-15"),
        ("2023-10-15", 50, "year", "2073-10-15"),
        ("2023-01-15", -13, "m", "2021-12-15"),
        ("2023-11-15", 1, "q", "2024-02-15"),
        ("2023-11-15", -1, "quarter", "2023-08-15"),
    ] {
        check("dateShift", json!([date, delta, unit]), json!(expected));
    }
}

#[test]
fn shifts_preserve_stepwise_month_end_and_source_leap_rule() {
    for (date, delta, unit, expected) in [
        ("2023-01-30", 2, "m", "2023-03-31"),
        ("2023-03-30", -2, "m", "2023-01-31"),
        ("2023-02-28", 1, "m", "2023-03-31"),
        ("2023-02-28", 1, "y", "2024-02-29"),
        ("2024-02-28", 4, "y", "2028-02-29"),
        ("2024-02-29", -4, "y", "2020-02-29"),
        ("2023-01-30", 1, "q", "2023-04-30"),
        ("2100-02-28", 1, "d", "2100-02-29"),
        ("1900-03-01", -1, "d", "1900-02-29"),
        ("2000-02-28", 1, "d", "2000-02-29"),
    ] {
        check("dateShift", json!([date, delta, unit]), json!(expected));
    }
    check("toEnd", json!(["2100-02-10", "m"]), json!("2100-02-29"));
    // Week/day-of-year use JS Date's Gregorian calendar, not the arithmetic rule.
    check("woty", json!(["2100-02-29"]), json!(9));
}

#[test]
fn fractional_deltas_and_numeric_coercion_match_source_loops() {
    for (delta, unit, expected) in [
        (json!(0.1), "d", "2024-01-16"),
        (json!(-0.1), "d", "2024-01-14"),
        (json!(1.1), "d", "2024-01-17"),
        (json!(-1.1), "d", "2024-01-13"),
        (json!(0.5), "w", "2024-01-19"),
        (json!(0.5), "q", "2024-03-15"),
        (json!("2"), "m", "2024-03-15"),
        (json!(true), "y", "2025-01-15"),
        (Json::Null, "d", "2024-01-15"),
        (json!("not a number"), "d", "2024-01-15"),
    ] {
        check(
            "dateShift",
            json!(["2024-01-15", delta, unit]),
            json!(expected),
        );
    }
    let mut rt = Runtime::new();
    let nan_args = [
        Value::String("2024-01-15".into()),
        Value::Number(f64::NAN),
        Value::String("d".into()),
    ];
    assert_eq!(
        block_on(datetime::call(&mut rt, "dateShift", &nan_args)).unwrap(),
        Some(Value::String("2024-01-15".into()))
    );
    for delta in [f64::INFINITY, f64::NEG_INFINITY] {
        let mut args = nan_args.clone();
        args[1] = Value::Number(delta);
        assert_eq!(
            block_on(datetime::call(&mut rt, "dateShift", &args))
                .unwrap_err()
                .kind,
            "RangeError"
        );
    }
    rt.cancellation_token()
        .store(true, std::sync::atomic::Ordering::Relaxed);
    let mut args = nan_args;
    args[1] = Value::Number(1.0);
    assert_eq!(
        block_on(datetime::call(&mut rt, "dateShift", &args))
            .unwrap_err()
            .kind,
        "Cancelled"
    );
}

#[test]
fn period_boundaries_and_aliases() {
    for (unit, first, last) in [
        ("w", "2023-11-13", "2023-11-19"),
        ("week", "2023-11-13", "2023-11-19"),
        ("m", "2023-11-01", "2023-11-30"),
        ("month", "2023-11-01", "2023-11-30"),
        ("q", "2023-10-01", "2023-12-31"),
        ("quarter", "2023-10-01", "2023-12-31"),
        ("y", "2023-01-01", "2023-12-31"),
        ("year", "2023-01-01", "2023-12-31"),
    ] {
        check("toStart", json!(["2023-11-15", unit]), json!(first));
        check("toEnd", json!(["2023-11-15", unit]), json!(last));
        check("bound", json!(["2023-11-15", unit]), json!([first, last]));
    }
    check(
        "bound",
        json!(["2021-01-01", "w"]),
        json!(["2020-12-28", "2021-01-03"]),
    );
    check(
        "bound",
        json!(["2024-02-29", "m"]),
        json!(["2024-02-01", "2024-02-29"]),
    );
    check(
        "bound",
        json!(["2023-09-18", "week"]),
        json!(["2023-09-18", "2023-09-24"]),
    );
    check(
        "bound",
        json!(["2023-09-24", "week"]),
        json!(["2023-09-18", "2023-09-24"]),
    );
    check("toStart", json!(["2100-11-15", "y"]), json!("2100-01-01"));
}

#[test]
fn date_pairs_extend_ordering_and_scalar_direction() {
    check(
        "dateShift",
        json!([["2023-10-01", "2023-10-15"], 10, "d"]),
        json!(["2023-10-11", "2023-10-25"]),
    );
    check(
        "dateShift",
        json!([["2024-01-01", "2024-01-31"], 1, "m"]),
        json!(["2024-02-01", "2024-02-29"]),
    );
    check(
        "extend",
        json!([["2024-01-01", "2024-01-31"], 1, "m"]),
        json!(["2024-01-01", "2024-02-29"]),
    );
    check(
        "extend",
        json!([["2024-01-01", "2024-01-07"], -2, "d"]),
        json!(["2024-01-01", "2024-01-05"]),
    );
    check(
        "extend",
        json!([["2024-01-01", "2024-01-07"], -10, "d"]),
        json!(["2023-12-28", "2024-01-01"]),
    );
    check(
        "extend",
        json!(["2024-01-15", -5, "d"]),
        json!(["2024-01-15", "2024-01-10"]),
    );
    check(
        "extend",
        json!(["2024-01-15", 0, "m"]),
        json!(["2024-01-15", "2024-01-15"]),
    );
    check(
        "dateShift",
        json!([["2024-01-01", "2024-01-02", "ignored"], 1, "d"]),
        json!(["2024-01-02", "2024-01-03"]),
    );
}

#[test]
fn extractors_and_iso_formats_preserve_source_quirks() {
    for (date, y, m, q, h) in [
        ("2023-01-01", 2023, 1, 1, 1),
        ("2023-05-10", 2023, 5, 2, 1),
        ("2023-06-30", 2023, 6, 2, 1),
        ("2023-07-01", 2023, 7, 3, 2),
        ("2023-08-22", 2023, 8, 3, 2),
        ("2023-12-31", 2023, 12, 4, 2),
        ("2000-02-29", 2000, 2, 1, 1),
        ("2400-02-29", 2400, 2, 1, 1),
    ] {
        for (name, expected) in [("year", y), ("moty", m), ("qoty", q), ("hoty", h)] {
            check(name, json!([date]), json!(expected));
        }
        check("isoy", json!([date]), json!(y.to_string()));
        check("isom", json!([date]), json!(format!("{y}-{m:02}")));
        check("isoq", json!([date]), json!(format!("{y}-Q{q}")));
    }
    for (date, week, label) in [
        ("2021-01-01", 53, "2021-W53"),
        ("2022-01-03", 1, "2022-W01"),
        ("2022-03-07", 10, "2022-W10"),
        ("2022-12-31", 52, "2022-W52"),
        ("2023-02-15", 7, "2023-W07"),
        ("2023-01-08", 1, "2023-W01"),
        ("2018-12-31", 1, "2018-W01"),
        ("2024-01-01", 1, "2024-W01"),
    ] {
        check("woty", json!([date]), json!(week));
        check("isow", json!([date]), json!(label));
    }
    check("isod", json!(["2023-01-01"]), json!("2023-1"));
}

#[test]
fn raw_periods_are_digit_extraction_not_strict_date_parsing() {
    for value in [
        json!(20240115),
        json!("2024.01.15"),
        json!("2024/01/15"),
        json!("x2024-01-15T23:59:59Z"),
    ] {
        check("year", json!([value]), json!(2024));
        check("moty", json!([value]), json!(1));
        check("dateShift", json!([value, 1, "d"]), json!("2024-01-16"));
    }
    for value in [json!(""), json!("nonsense"), Json::Null, json!(false)] {
        for (name, expected) in [
            ("year", json!(0)),
            ("moty", json!(0)),
            ("hoty", json!(1)),
            ("qoty", Json::Null),
            ("woty", json!(-1)),
            ("doty", json!(-1)),
            ("isoq", json!("0-Qnull")),
            ("isow", json!("0-W-1")),
            ("isod", json!("0--1")),
        ] {
            check(name, json!([value]), expected);
        }
        check("dateShift", json!([value, 0, "d"]), json!("--"));
    }
    check("year", json!(["0099-01-01"]), json!(99));
    // Date.UTC(99, 0, 1) constructs 1999, not year 99.
    check("woty", json!(["0099-01-01"]), json!(53));
    check("woty", json!(["2024-13-01"]), json!(1));
    check("toStart", json!(["2024-99-40", "q"]), json!("2024-01-"));
    check("toEnd", json!(["2024-99-40", "q"]), json!("2024--"));
}

#[test]
fn runtime_dispatches_d_literals_and_quoted_context_values() {
    let mut rt = Runtime::new();
    for (source, expected) in [
        ("dateShift(D'2024-01-15', 5, 'd')", json!("2024-01-20")),
        ("toStart(D'2024-01-15', 'm')", json!("2024-01-01")),
        ("year(D'2024-01-15')", json!(2024)),
        ("isom(D'2024-01-15')", json!("2024-01")),
        (
            "dateShift(['2024-01-01', '2024-01-31'], 1, 'm')",
            json!(["2024-02-01", "2024-02-29"]),
        ),
    ] {
        let value = rt.eval(source).unwrap();
        let expected = rt.from_json(&expected);
        let expected = rt.to_json(&expected).unwrap();
        assert_eq!(rt.to_json(&value).unwrap(), expected, "{source}");
    }
    rt.set_context(&json!({"d": ["'", "2024-01-15", "D"], "u": ["'", "m"]}))
        .unwrap();
    let value = rt.eval("bound(d, u)").unwrap();
    assert_eq!(
        rt.to_json(&value).unwrap(),
        json!(["2024-01-01", "2024-01-31"])
    );
}

#[test]
fn quoted_values_and_units_unwrap_without_confusing_pairs() {
    for date in [
        json!(["'", "2024-01-15", "D"]),
        json!(["'", "2024-01-15"]),
        json!(["\"", "2024-01-15"]),
    ] {
        check(
            "dateShift",
            json!([date, ["'", "5"], ["'", "d"]]),
            json!("2024-01-20"),
        );
        check(
            "extend",
            json!([date, 5, "d"]),
            json!(["2024-01-15", "2024-01-20"]),
        );
        check("toStart", json!([date, "m"]), json!("2024-01-01"));
        check("toEnd", json!([date, "m"]), json!("2024-01-31"));
        check(
            "bound",
            json!([date, ["\"", "m"]]),
            json!(["2024-01-01", "2024-01-31"]),
        );
        for (name, expected) in [
            ("year", json!(2024)),
            ("hoty", json!(1)),
            ("qoty", json!(1)),
            ("moty", json!(1)),
            ("woty", json!(3)),
            ("doty", json!(15)),
            ("isoy", json!("2024")),
            ("isoq", json!("2024-Q1")),
            ("isom", json!("2024-01")),
            ("isow", json!("2024-W03")),
            ("isod", json!("2024-15")),
        ] {
            check(name, json!([date]), expected);
        }
    }
    check(
        "dateShift",
        json!([[["'", "2024-01-01", "D"], ["'", "2024-01-31", "D"]], 1, "m"]),
        json!(["2024-02-01", "2024-02-29"]),
    );
}

#[test]
fn unknown_units_preserve_values_without_coercion() {
    for unit in [
        json!("h"),
        json!("DAY"),
        json!("days"),
        Json::Null,
        json!(1),
    ] {
        for start in [
            json!("2024.01.15"),
            json!(20240115),
            Json::Null,
            json!({"x": 1}),
        ] {
            for name in ["dateShift", "toStart", "toEnd"] {
                let args = if name == "dateShift" {
                    json!([start, 1, unit])
                } else {
                    json!([start, unit])
                };
                check(name, args, start.clone());
            }
            check("bound", json!([start, unit]), json!([start, start]));
            check("extend", json!([start, 1, unit]), json!([start, start]));
        }
    }
    let mut rt = Runtime::new();
    let object = rt.from_json(&json!({"x": 1}));
    assert_eq!(
        block_on(datetime::call(
            &mut rt,
            "toStart",
            &[object.clone(), Value::Null]
        ))
        .unwrap(),
        Some(object)
    );
}

#[test]
fn omitted_and_explicit_undefined_arguments_use_today() {
    let mut rt = Runtime::new();
    let before = invoke(&mut rt, "today", &[]);
    for (name, args) in [
        ("dateShift", vec![json!(0), json!("d")]),
        ("toStart", vec![json!("unknown")]),
        ("toEnd", vec![json!("unknown")]),
    ] {
        let result = invoke(&mut rt, name, &args);
        let after = invoke(&mut rt, "today", &[]);
        assert!(result == before || result == after);
    }
    for (name, args) in [
        ("extend", vec![json!(0), json!("d")]),
        ("bound", vec![json!("unknown")]),
    ] {
        let result = invoke(&mut rt, name, &args);
        let after = invoke(&mut rt, "today", &[]);
        assert!(result == json!([before, before]) || result == json!([after, after]));
    }
    let result = block_on(datetime::call(
        &mut rt,
        "dateShift",
        &[
            Value::Number(0.0),
            Value::String("d".into()),
            Value::Undefined,
        ],
    ))
    .unwrap()
    .unwrap();
    let result = rt.to_json(&result).unwrap();
    let after = invoke(&mut rt, "today", &[]);
    assert!(result == before || result == after);
}

#[test]
fn doty_uses_elapsed_local_midnights_not_naive_ordinal() {
    for (y, m, d) in [
        (2023, 1, 1),
        (2023, 6, 15),
        (2023, 12, 31),
        (2024, 2, 29),
        (2024, 12, 31),
    ] {
        let now = Local.with_ymd_and_hms(y, m, d, 0, 0, 0).earliest().unwrap();
        let start = Local
            .with_ymd_and_hms(y - 1, 12, 31, 0, 0, 0)
            .earliest()
            .unwrap();
        let expected = ((now.timestamp_millis() - start.timestamp_millis()) as f64 / 86_400_000.0)
            .floor() as i64;
        let date = format!("{y}-{m:02}-{d:02}");
        check("doty", json!([date]), json!(expected));
        check("isod", json!([date]), json!(format!("{y}-{expected}")));
        assert!((expected - i64::from(now.ordinal())).abs() <= 1);
    }
}

#[test]
fn local_timezone_contract_in_fresh_processes() {
    // Do not mutate TZ in the multithreaded test process or rely on timezone caches.
    for zone in [
        "UTC",
        "America/New_York",
        "Australia/Sydney",
        "Pacific/Apia",
        "America/Sao_Paulo",
    ] {
        let output = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "datetime_timezone_fixture", "--nocapture"])
            .env("TZ", zone)
            .env("LPE_DATETIME_TEST_ZONE", zone)
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{zone}: {}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[test]
fn datetime_timezone_fixture() {
    let Ok(zone) = std::env::var("LPE_DATETIME_TEST_ZONE") else {
        return;
    };
    today_and_now_are_utc_date_strings();
    let (summer_ordinal, march_ordinal) = if zone == "America/New_York" {
        (166, 70)
    } else {
        (167, 71)
    };
    check("doty", json!(["2024-06-15"]), json!(summer_ordinal));
    check("doty", json!(["2024-03-11"]), json!(march_ordinal));
    check(
        "isod",
        json!(["2024-03-11"]),
        json!(format!("2024-{march_ordinal}")),
    );
    check("doty", json!(["2024-11-04"]), json!(309));
    check(
        "bound",
        json!(["2024-03-10", "w"]),
        json!(["2024-03-04", "2024-03-10"]),
    );
    check(
        "dateShift",
        json!(["2024-03-10", 1, "d"]),
        json!("2024-03-11"),
    );
    check("isow", json!(["2021-01-01"]), json!("2021-W53"));
    if zone == "Pacific/Apia" {
        // Local 2011-12-30 was skipped entirely; JS normalizes it to Saturday.
        check("doty", json!(["2011-12-30"]), json!(364));
        check("toStart", json!(["2011-12-30", "w"]), json!("2011-12-25"));
    }
    if zone == "America/Sao_Paulo" {
        // DST skipped midnight; Date construction advances it to 01:00.
        check("doty", json!(["2018-11-04"]), json!(308));
        check("toStart", json!(["2018-11-04", "w"]), json!("2018-10-29"));
    }
}
