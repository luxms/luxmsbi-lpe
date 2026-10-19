// One registry preserves public name order and generates direct dispatch
// checks, avoiding repeated linear scans of the standard library names.
macro_rules! builtin_names {
    ($($name:literal => $immediate:literal),* $(,)?) => {
        pub fn names() -> &'static [&'static str] {
            &[$($name),*]
        }
        pub fn supports_sync(name: &str) -> bool {
            match name {
                $($name => $immediate,)*
                _ => false,
            }
        }
    };
}

pub(crate) use builtin_names;
