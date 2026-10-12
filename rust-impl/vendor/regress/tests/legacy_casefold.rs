#[allow(dead_code)]
mod common;

use common::{StringTestHelpers, test_with_configs};

#[test]
fn legacy_class_does_not_use_unicode_case_folding() {
    test_with_configs(|tc| {
        let text = "\u{212a}\u{017f}\u{1e9e}";
        tc.test_match_fails(r"[a-z\u00df]+", "i", text);
        tc.test_match_succeeds(r"^[^a-z\u00df]+$", "i", text);
        for flags in ["iu", "iv"] {
            tc.compilef(r"[a-z\u00df]+", flags)
                .match1f(text)
                .test_eq(text);
            tc.test_match_fails(r"[^a-z\u00df]", flags, text);
        }
    });
}

#[test]
fn legacy_classes_split_unicode_equivalence_sets() {
    test_with_configs(|tc| {
        for (left, right) in [
            ('k', '\u{212a}'),
            ('s', '\u{017f}'),
            ('\u{00df}', '\u{1e9e}'),
            ('\u{03c9}', '\u{2126}'),
            ('\u{00e5}', '\u{212b}'),
            ('\u{1f80}', '\u{1f88}'),
            ('\u{1fb3}', '\u{1fbc}'),
        ] {
            for (source, other) in [(left, right), (right, left)] {
                let pattern = format!(r"^[\u{:04x}]$", source as u32);
                let negated = format!(r"^[^\u{:04x}]$", source as u32);
                let text = other.to_string();
                tc.test_match_succeeds(&pattern, "i", &source.to_string());
                tc.test_match_fails(&pattern, "i", &text);
                tc.test_match_succeeds(&negated, "i", &text);
                for flags in ["iu", "iv"] {
                    tc.test_match_succeeds(&pattern, flags, &text);
                    tc.test_match_fails(&negated, flags, &text);
                }
            }
        }
    });
}

#[test]
fn legacy_classes_keep_valid_case_equivalents() {
    test_with_configs(|tc| {
        for flags in ["i", "iu", "iv"] {
            for (pattern, text) in [
                (r"^[a-z]+$", "aAZz"),
                (r"^[\u00e0-\u00f6]+$", "\u{00c0}\u{00d6}"),
                (r"^[\u03c3]+$", "\u{03a3}\u{03c2}\u{03c3}"),
                (r"^[\u00b5]+$", "\u{00b5}\u{039c}\u{03bc}"),
            ] {
                tc.test_match_succeeds(pattern, flags, text);
            }
            tc.test_match_fails(r"^[a-z]$", flags, "\u{0131}");
            tc.test_match_fails(r"^[\u0131]$", flags, "I");
            tc.test_match_fails(r"^[\u00df]$", flags, "SS");
            tc.test_match_fails(r"^[]$", flags, "a");
            tc.test_match_succeeds(r"^[^]$", flags, "\u{212a}");
        }
        for flags in ["", "u", "v"] {
            tc.test_match_fails(r"^[a-z]$", flags, "A");
            tc.test_match_fails(r"^[a-z]$", flags, "\u{212a}");
        }
    });
}

#[test]
fn legacy_word_classes_remain_ascii() {
    test_with_configs(|tc| {
        for text in ["\u{212a}", "\u{017f}", "\u{0131}"] {
            for pattern in [r"^\w$", r"^[\w]$", r"^[^\W]$"] {
                tc.test_match_fails(pattern, "i", text);
            }
            for pattern in [r"^\W$", r"^[\W]$", r"^[^\w]$"] {
                tc.test_match_succeeds(pattern, "i", text);
            }
        }
        for pattern in [r"^\W$", r"^[\W]$", r"^[^\w]$"] {
            tc.test_match_fails(pattern, "i", "k");
            tc.test_match_fails(pattern, "i", "s");
        }
        for flags in ["iu", "iv"] {
            for text in ["\u{212a}", "\u{017f}"] {
                tc.test_match_succeeds(r"^\w$", flags, text);
                tc.test_match_fails(r"^\W$", flags, text);
            }
        }
    });
}

#[test]
fn class_case_folding_respects_scoped_modifiers() {
    test_with_configs(|tc| {
        for flags in ["", "u", "v"] {
            tc.test_match_succeeds(r"^(?i:[a-z])(?-i:[a-z])$", flags, "Ab");
            tc.test_match_fails(r"^(?i:[a-z])(?-i:[a-z])$", flags, "AB");
        }
        tc.test_match_fails(r"^(?i:[a-z])$", "", "\u{212a}");
        tc.test_match_fails(r"^(?i:\w)$", "", "\u{212a}");
        for flags in ["u", "v"] {
            tc.test_match_succeeds(r"^(?i:[a-z])$", flags, "\u{212a}");
            tc.test_match_succeeds(r"^(?i:\w)$", flags, "\u{212a}");
        }
    });
}

#[cfg(feature = "utf16")]
#[test]
fn legacy_class_preserves_lone_surrogates() {
    for no_opt in [false, true] {
        let regex = regress::Regex::with_flags(
            r"^[\uD800-\uDFFF]$",
            regress::Flags {
                icase: true,
                no_opt,
                ..regress::Flags::default()
            },
        )
        .unwrap();
        for unit in [0xd800, 0xdbff, 0xdc00, 0xdfff] {
            let units = [unit];
            assert_eq!(
                regex.find_from_ucs2(&units, 0).next().unwrap().range(),
                0..1
            );
            assert_eq!(
                regex.find_from_utf16(&units, 0).next().unwrap().range(),
                0..1
            );
        }
    }
}

#[test]
fn legacy_literals_and_backreferences_use_the_same_canonicalization() {
    test_with_configs(|tc| {
        for (source, other) in [
            ('s', '\u{017f}'),
            ('i', '\u{0131}'),
            ('\u{1f80}', '\u{1f88}'),
            ('\u{1fb3}', '\u{1fbc}'),
        ] {
            for (left, right) in [(source, other), (other, source)] {
                let literal = format!(r"^\u{:04x}$", left as u32);
                let backref = format!(r"^(\u{:04x})\1$", left as u32);
                tc.test_match_fails(&literal, "i", &right.to_string());
                tc.test_match_fails(&backref, "i", &format!("{left}{right}"));
                tc.test_match_succeeds(&literal, "i", &left.to_string());
                tc.test_match_succeeds(&backref, "i", &format!("{left}{left}"));
            }
        }
        tc.test_match_succeeds(r"^(\u03c3)\1$", "i", "\u{03c3}\u{03c2}");
        tc.test_match_succeeds(r"^(\u1f80)\1$", "iu", "\u{1f80}\u{1f88}");
    });
}

#[cfg(feature = "utf16")]
#[test]
fn legacy_unicode_escapes_are_code_units() {
    let text: Vec<_> = "\u{1f600}".encode_utf16().collect();
    for no_opt in [false, true] {
        let flags = regress::Flags {
            no_opt,
            ..regress::Flags::default()
        };
        for pattern in [r"^\ud83d\ude00$", r"^[\ud83d\ude00]{2}$"] {
            let re = regress::Regex::with_flags(pattern, flags).unwrap();
            assert_eq!(re.find_from_ucs2(&text, 0).next().unwrap().range(), 0..2);
        }
        for mode in ["u", "v"] {
            let flags = regress::Flags {
                no_opt,
                ..regress::Flags::from(mode)
            };
            let re = regress::Regex::with_flags(r"^\ud83d\ude00$", flags).unwrap();
            assert_eq!(re.find_from_utf16(&text, 0).next().unwrap().range(), 0..2);
            let re = regress::Regex::with_flags(r"^[\ud83d\ude00]{2}$", flags).unwrap();
            assert!(re.find_from_utf16(&text, 0).next().is_none());
            // A non-low-surrogate escape following a high surrogate must not be consumed.
            let re = regress::Regex::with_flags(r"^\ud800\u0041$", flags).unwrap();
            assert_eq!(
                re.find_from_utf16(&[0xd800, 0x41], 0)
                    .next()
                    .unwrap()
                    .range(),
                0..2
            );
        }
    }
}

#[test]
fn legacy_braced_unicode_escape_is_an_identity_escape() {
    test_with_configs(|tc| {
        tc.test_match_succeeds(r"^\u{61}$", "", &"u".repeat(61));
        tc.test_match_fails(r"^\u{61}$", "", "a");
        tc.test_match_succeeds(r"^\u{1f600}$", "", "u{1f600}");
        for flags in ["u", "v"] {
            tc.test_match_succeeds(r"^\u{61}$", flags, "a");
            tc.test_match_fails(r"^\u{61}$", flags, &"u".repeat(61));
        }
    });
}

#[test]
fn group_names_always_decode_unicode() {
    for no_opt in [false, true] {
        for mode in ["", "u", "v"] {
            for (pattern, name) in [
                (r"^(?<\u{61}>x)\k<a>$", "a"),
                (r"^(?<\ud801\udc00>x)\k<\u{10400}>$", "\u{10400}"),
                ("^(?<\u{10400}>x)\\k<\u{10400}>$", "\u{10400}"),
                ("^(?<a\u{10400}>x)\\k<a\u{10400}>$", "a\u{10400}"),
            ] {
                let flags = regress::Flags {
                    no_opt,
                    ..regress::Flags::from(mode)
                };
                // The legacy wrapper supplies UTF-16 code units even for group names.
                let regex =
                    regress::Regex::from_unicode(pattern.encode_utf16().map(u32::from), flags)
                        .unwrap();
                let found = regex.find("xx").unwrap();
                assert_eq!(found.named_group(name), Some(0..1));
                assert_eq!(found.range(), 0..2);
            }
        }
    }
}
