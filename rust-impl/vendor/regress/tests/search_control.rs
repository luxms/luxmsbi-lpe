#![cfg(feature = "utf16")]

use regress::Regex;

fn stopped(pattern: &str, flags: &str, text: &str, start: usize, limit: usize) {
    let regex = Regex::with_flags(pattern, flags).unwrap();
    let text: Vec<_> = text.encode_utf16().collect();
    for unicode in [false, true] {
        let mut work = 0;
        let poll = || {
            work += 1;
            if work == limit {
                Err("host stop")
            } else {
                Ok(())
            }
        };
        let result = if unicode {
            regex.find_from_utf16_with_control(&text, start, poll)
        } else {
            regex.find_from_ucs2_with_control(&text, start, poll)
        };
        assert_eq!(result.unwrap_err(), "host stop", "{pattern}");
        assert_eq!(work, limit, "callback must not be called again after error");
    }
}

#[test]
fn cancels_inside_exponential_backtracking_without_a_timer() {
    stopped("^(a+)+$", "", &format!("{}!", "a".repeat(24)), 0, 2048);
    stopped("^(?!(a+)+$)", "", &format!("{}!", "a".repeat(24)), 0, 2048);
}

#[test]
fn polls_optimized_greedy_lazy_and_unanchored_scans() {
    for pattern in ["a*", "a*?b", "[a]*", ".*", "z"] {
        stopped(pattern, "", &"a".repeat(10000), 0, 100);
    }
}

#[test]
fn polls_long_backreferences_in_both_directions_and_case_modes() {
    for flags in ["", "i"] {
        stopped("^(a{10000})\\1$", flags, &"a".repeat(20000), 0, 10100);
        stopped(
            "(?<=\\1(a{10000}))$",
            flags,
            &"a".repeat(20000),
            20000,
            10100,
        );
    }
}

#[test]
fn controls_preserve_ranges_captures_and_unicode_offsets() {
    for (pattern, flags, text, start) in [
        ("(?<name>a+)(b)?", "d", "aab", 0),
        ("(?<=x)y", "", "xyxy", 1),
        (".", "u", "\u{1f600}a", 0),
        ("(a)\\1", "i", "aA", 0),
        ("(?!a)b", "", "ab", 0),
        ("z", "", "abc", 0),
        ("a", "", "a", 99),
    ] {
        let regex = Regex::with_flags(pattern, flags).unwrap();
        let text: Vec<_> = text.encode_utf16().collect();
        let controlled = regex
            .find_from_utf16_with_control(&text, start, || Ok::<_, ()>(()))
            .unwrap();
        let ordinary = regex.find_from_utf16(&text, start).next();
        assert_eq!(format!("{controlled:?}"), format!("{ordinary:?}"));
        let controlled = regex
            .find_from_ucs2_with_control(&text, start, || Ok::<_, ()>(()))
            .unwrap();
        let ordinary = regex.find_from_ucs2(&text, start).next();
        assert_eq!(format!("{controlled:?}"), format!("{ordinary:?}"));
    }
}

#[test]
fn an_aborted_search_does_not_poison_the_compiled_regex() {
    let regex = Regex::new("a+").unwrap();
    let text = [97; 100];
    assert_eq!(
        regex
            .find_from_ucs2_with_control(&text, 0, || Err(42))
            .unwrap_err(),
        42
    );
    assert_eq!(
        regex
            .find_from_ucs2_with_control(&text, 0, || Ok::<_, ()>(()))
            .unwrap()
            .unwrap()
            .range(),
        0..100
    );
}

#[test]
fn raw_unit_backreferences_preserve_surrogates_boundaries_and_failure_fallback() {
    let mut texts = vec![
        vec![0xd800, 0xd800],
        vec![0xdc00, 0xdc00],
        vec![0xd83d, 0xde00, 0xd83d, 0xde00],
        vec![0xd83d, 0xde00, 0xd83d, 0xde01],
        vec![0xd800, 97, 0xd800, 97, 120],
        vec![0xd800, 0xdc00, 0xd800, 0xdc01, 89],
        vec![65, 97, 120],
        vec![97, 98, 89],
        vec![97, 97, 88],
        vec![],
    ];
    // The pair straddles the raw comparison's 64-unit checkpoint boundary.
    let mut chunk = vec![97; 63];
    chunk.extend([0xd83d, 0xde00, 98]);
    let mut doubled = chunk.clone();
    doubled.extend(&chunk);
    texts.push(doubled.clone());
    doubled[130] = 0xde01;
    doubled.push(89);
    texts.push(doubled);
    for flags in ["", "i", "u", "iu"] {
        for pattern in [
            r"(.)\1",
            r"([\s\S])\1",
            r"(\uD800)\1",
            r"(\uD83D)\1",
            r"(.{2})\1|(.+)",
            r"(?<=\1(.))x",
            r"(?<=(.)\1)x",
            r"(?!(.)\1)(.)",
            r"(?:(.)(?:\1X|.Y))",
            r"(?<x>.)\k<x>",
            r"^(.*)\1$",
            r"^(.{65})\1X|^.*Y$",
            r"(?<=\1(.*))$",
        ] {
            let regex = Regex::with_flags(pattern, flags).unwrap();
            for text in &texts {
                for start in [
                    0,
                    1,
                    text.len().saturating_sub(1),
                    text.len(),
                    text.len() + 1,
                ] {
                    let mut work = 0;
                    let mut poll = || {
                        work += 1;
                        assert!(work < 1_000_000, "unexpected unbounded test case");
                        Ok::<_, ()>(())
                    };
                    // The baseline engine can underflow on variable lookbehind
                    // starting inside a pair. Do not disguise that upstream bug
                    // as a control regression; UCS-2 still tests every offset.
                    let splits_pair = start > 0
                        && start < text.len()
                        && (0xd800..=0xdbff).contains(&text[start - 1])
                        && (0xdc00..=0xdfff).contains(&text[start]);
                    if !splits_pair {
                        let b = regex.find_from_utf16(text, start).next();
                        let a = regex
                            .find_from_utf16_with_control(text, start, &mut poll)
                            .unwrap();
                        assert_eq!(
                            format!("{a:?}"),
                            format!("{b:?}"),
                            "UTF16 /{pattern}/{flags}, start={start}, {text:?}"
                        );
                    }
                    let a = regex
                        .find_from_ucs2_with_control(text, start, &mut poll)
                        .unwrap();
                    let b = regex.find_from_ucs2(text, start).next();
                    assert_eq!(
                        format!("{a:?}"),
                        format!("{b:?}"),
                        "UCS2 /{pattern}/{flags}, start={start}, {text:?}"
                    );
                }
            }
        }
    }
}
