use regress::{Flags, Regex};

#[test]
fn capture_names_follow_numeric_order_inside_lookbehind() {
    for no_opt in [false, true] {
        let re = Regex::with_flags(
            r"(?<=(?<left>[ab]+)(?<right>[bc]+))$",
            Flags {
                no_opt,
                ..Flags::default()
            },
        )
        .unwrap();
        let found = re.find("abc").unwrap();
        assert_eq!(found.captures, [Some(0..1), Some(1..3)]);
        assert_eq!(
            found
                .capture_group_names()
                .iter()
                .map(AsRef::as_ref)
                .collect::<Vec<&str>>(),
            ["left", "right"]
        );
        assert_eq!(
            found.named_groups().collect::<Vec<_>>(),
            [("left", Some(0..1)), ("right", Some(1..3))]
        );
    }
}

#[test]
fn capture_names_retain_unnamed_slots_and_duplicates() {
    for (pattern, text, expected) in [
        (r"((?<named>a))", "a", vec!["", "named"]),
        (r"(?<outer>(?<inner>a))", "a", vec!["outer", "inner"]),
        (r"(?<x>a)|(?<x>b)", "b", vec!["x", "x"]),
    ] {
        let found = Regex::new(pattern).unwrap().find(text).unwrap();
        assert_eq!(
            found
                .capture_group_names()
                .iter()
                .map(AsRef::as_ref)
                .collect::<Vec<&str>>(),
            expected
        );
    }
    assert!(
        Regex::new("(a)")
            .unwrap()
            .find("a")
            .unwrap()
            .capture_group_names()
            .is_empty()
    );
}
