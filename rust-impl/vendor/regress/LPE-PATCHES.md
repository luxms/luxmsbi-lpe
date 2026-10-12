# LPE compatibility patches

This directory contains the published `regress` 0.12.0 crate, not a new regex
implementation. Its MIT and Apache-2.0 licenses are retained here. Cargo uses
this copy through `[patch.crates-io]` in `rust-impl/Cargo.toml`.

## Provenance

- Upstream: https://github.com/ridiculousfish/regress
- Crate archive: https://static.crates.io/crates/regress/regress-0.12.0.crate
- Archive SHA-256: `32eef8b209c3c1c15dbad02c1f30f9539f00dc7253e0cbcdaae442a50a09d7c1`
- Upstream revision: `aae35dee1596cc9a9caaad2425b088081c09e5d5`
- The archive's nested `Cargo.lock` is omitted; the LPE lockfile pins dependencies.

## Local Changes

1. Use ECMAScript legacy canonicalization without `u`/`v`, consistently for
   classes, literals, and backreferences. Upstream 0.12.0 incorrectly applies
   Unicode folding to legacy classes and simple uppercase mappings where full
   uppercase expands to multiple units. Tests cover positive/negative classes,
   ranges, literals, backreferences, escapes, and mode controls.
2. Add read-only `Match::capture_group_names()`. LPE needs numeric capture names
   to preserve identity between `result.indices.groups.name` and
   `result.indices[n]`, including equal-range captures and duplicate names in
   disjoint alternatives. This avoids reparsing patterns outside the engine.
3. Store capture names by numeric group ID during emission. Lookbehind reverses
   IR traversal, so appending names in traversal order incorrectly associates
   names with another group's value and indices.
4. Gate code-point escapes and escaped-surrogate-pair combination on Unicode
   mode. Restore the complete second escape when an attempted pair fails.
   Group identifiers still decode Unicode in every mode, including actual
   surrogate pairs in a code-unit pattern.

The normalized crate manifest registers the added regression test targets.
Three upstream test groups used braced code-point escapes without `u` while
expecting Unicode semantics. Their flags now explicitly request `u`/`iu`; no
assertions are removed. Added tests verify the distinct legacy behavior.

Remove these patches when an upstream release supplies equivalent behavior and
the native, shared, and upstream tests pass. Do not replace this directory with
an unpatched release solely because the version is unchanged.

## Verification

```sh
cargo test --locked --manifest-path rust-impl/Cargo.toml -p regress
cargo test --locked --manifest-path rust-impl/Cargo.toml
npm run test:all
```

The LPE aggregate suite also runs the upstream engine tests with `utf16` enabled.
Matching uses a backtracking engine without a per-search cancellation/budget
hook; see `../../API.md` for the embedding restriction.
