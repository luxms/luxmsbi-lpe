// One registry preserves public name order and generates direct dispatch
// checks, avoiding repeated linear scans of the standard library names.
macro_rules! builtin_names {
    ($($name:literal => $immediate:literal),* $(,)?) => {
        pub fn names() -> &'static [&'static str] {
            &[$($name),*]
        }
        pub fn supports_sync(name: &str) -> bool {
            sync_name(name).is_some()
        }
        pub(crate) fn sync_name(name: &str) -> Option<&'static str> {
            match name {
                $($name => if $immediate { Some($name) } else { None },)*
                _ => None,
            }
        }
    };
}

pub(crate) use builtin_names;
