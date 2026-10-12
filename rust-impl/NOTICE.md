# Sources and dependencies

The Rust interpreter is new code under the repository's [MIT license](../LICENSE).
Its behavioral reference is Luxms LPE 1.7.3 at
`f90b5062a8edfef0c8d8a3da6cbcd30a86028af5`. Existing JavaScript source notices,
including the miniMAL/Joel Martin attribution in `src/lisp.js`, are unchanged.
No MAL or miniMAL implementation is copied, vendored, or linked into this crate.

The shared test corpus is derived from this repository's tests and documented
examples. Extracted cases record their source origin. These are interpreter
behavior tests; Rust does not ship documentation data or a documentation API.

Direct Rust dependencies currently declare these license alternatives:

| Dependency | Declared license |
| --- | --- |
| `serde`, `serde_json`, `indexmap` | MIT OR Apache-2.0 |
| `futures`, `chrono`, `regress`, `rand` | MIT OR Apache-2.0 |
| `ryu-js` | Apache-2.0 OR BSL-1.0 |

`Cargo.lock` pins direct and transitive dependency versions. Transitive packages
have their own notices, including Unicode data and platform-specific libraries;
this table is not a replacement for those notices. Inspect the resolved target's
metadata and dependency license files when distributing a compiled artifact:

```sh
cargo metadata --locked --format-version 1 --manifest-path rust-impl/Cargo.toml
cargo tree --locked --manifest-path rust-impl/Cargo.toml
```

`regress` 0.12.0 is vendored with local compatibility patches, its upstream
tests, and both license texts. [vendor/regress/LPE-PATCHES.md](vendor/regress/LPE-PATCHES.md)
records the exact source archive, changes, and verification commands.
