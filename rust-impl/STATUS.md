# Implementation status

Compatibility target: **JavaScript LPE 1.8.1, safe evaluation only**.
Release verification is tracked by the Rust CI checks and attached release
reports; local results alone do not mark a release complete.

The parser, deparser, interpreter, environments, special forms, closures,
standard library, JSON methods, ordinary futures, reactive streams, host
callbacks, and tracing collection run without a JavaScript engine. New 1.8
behavior includes formatted strings and UTC/fixed-offset time operations.
`unsafe: true` is rejected; the native API exposes no unsafe switch.

JS 1.8.1 adds `getStdlib(options)` for host custom-form delegation. Its
default returns the existing safe standard context, so portable safe evaluation
semantics are unchanged. Native Rust continues to reject unsafe evaluation;
the three new JS tests exercise JS context identity and unsafe host function
objects and are explicitly tracked in `fixtures/scope.json`.

Local Linux validation on 2026-11-05 uses Node 24.22.2 and Rust 1.97.1.
The JS reference passes 1,551 tests; the harness passes 362 tests; all 7,228
shared fixtures match JS 1.8.1 and the strict coverage gate passes. The default
Rust suite, formatting and strict all-target Clippy pass. These are native local
results, not hosted CI or a fresh WASI run.

## Verification and scope

The recursive JavaScript suite contains 1,551 tests. Shared fixtures exercise
native Rust and WASI against that reference, including the newly nested date
tests, fixed-clock calendar cases, invalid-input boundaries, safe data access,
and JSON. The fixture inventory tracks 1,047 source-test declarations and 370
suites, with 85 individually documented exclusions in `fixtures/scope.json`.
The strict gate rejects missing observations, stale exclusions, and unlinked
source tests. Fixture totals and observations are recorded in `coverage.json`
and the generated parity reports, rather than inferred from a passing suite.

The suite includes independent value/error expectations, registry metadata,
source-derived assertions, and metamorphic round trips. These are different
kinds of evidence; fixture counts are not counts of independent features and
do not prove every branch or possible input. JavaScript object descriptors,
prototypes, arbitrary native constructors, unsafe-mode propagation, private JS
date helper representations, and documentation-generation APIs are explicitly
outside the portable Rust object model. Portable JSON is in scope.

CI checks formatting/Clippy, Linux stable, Rust 1.92 MSRV, macOS stable, native
JS parity, WASI parity, and warmed repeated performance comparisons. The WASI
job pins Rust `beta-2026-10-05` and Wasmtime 49.0.2. Node is used only by the
reference tooling, not by the native or WASI interpreter.

## Runtime boundaries

Cooperative controls preserve their documented accounting and interrupt
behavior. They are not hard process-heap or wall-clock isolation; see
[RUNTIME-CONTROLS.md](RUNTIME-CONTROLS.md). The regex engine is `regress` 0.12.0
with compatibility changes documented in `vendor/regress/LPE-PATCHES.md`.
Passing the corpus is not a claim of complete ECMAScript or V8 conformance.

Streams retain shallow Promise/Stream semantics: a Stream operand leaves
Promise operands unawaited, and Promise settlement alone does not emit an
update. Reference tests compare values, events, subscriptions, and ownership.
Nested computed streams retain creator references as in the JS baseline;
dropping the runtime disposes the graph. Direct stream JSON serialization is
unsupported. Source and transport use UTF-8, while observable JavaScript string
code-unit behavior is preserved internally where needed.

## Reproduce

```sh
npm ci
npm run test:all
cargo fmt --manifest-path rust-impl/Cargo.toml --check
cargo clippy --locked --manifest-path rust-impl/Cargo.toml --all-targets -- -D warnings
npm run test:wasm
BENCH_ITERATIONS=100000 BENCH_REPEATS=9 node rust-impl/scripts/benchmark.mjs --require-parity
```

Reports under `rust-impl/reports/` are ignored by Git. Generated fixture checks
are read-only; intentional corpus changes require regeneration and review.
See [PERFORMANCE.md](PERFORMANCE.md) for measurement rules and
[RELEASING.md](RELEASING.md) for release provenance.
