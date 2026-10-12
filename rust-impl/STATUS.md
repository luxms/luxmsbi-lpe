# Implementation status

**Not release-ready.** Local verification snapshot: 2026-10-12.

The parser, deparser, interpreter, environments, special forms, closures,
standard library, ordinary futures, reactive streams, host callbacks, and explicit tracing
collection are implemented without a JS runtime. In-scope source-test coverage
passes; this is not proof of complete compatibility with every JS behavior.

## Verification

| Check | Result |
| --- | --- |
| Original JavaScript suite | 681 passing |
| Shared fixture transport/coverage harness | 27 passing |
| Rust native tests | 263 passing; 5 opt-in JS reference tests separate |
| Opt-in parser, regex, and stream-reference tests | 5 passing |
| Patched `regress` suite | 558 passing; 1 upstream nightly-only doctest ignored |
| Shared JS/Rust cases | 4,477 of 4,477 passing |
| Shared regex cases | 169 of 169 passing |
| Shared stream cases | 39 of 39 passing |
| Mixed Stream/Promise operand audit | 26 JS/Rust cases, 142 matching snapshots |
| Strict coverage gate | Passing: 467 in-scope source tests verified; 36 JS-only tests excluded |

The shared corpus consists of 1,603 independent value/error expectations,
340 registry-metadata cases, and 2,534 metamorphic round-trip cases. These are
different kinds of evidence, not 4,477 independently specified features.
The 264 in-scope standard-library names have passing fixture references; 11
native-JS names are excluded. This does not prove all branches, overloads, or
aliases behave correctly.

Native interpreter tests have been checked with Rust 1.92 and 1.99 on Intel macOS.
The patched engine suite was run with Rust 1.99 and the `utf16` feature.
The aggregate JS checks use Node 26.11.1. No Linux/Windows CI result or live
PostgreSQL integration is claimed.

## Source-test accounting

The old "100 unverified groups" counted 81 individual source-test declarations
plus 19 parent suites. Eighteen of those tests exercise previously agreed
JS-only host behavior; the other 63 now have shared behavioral comparisons.
There are 503 source-test declarations overall: 467 in scope, 18 documentation
tests excluded, and 18 individually reviewed native-JS runtime tests excluded.
The 188 suites are separate rollups, not additional features: 182 verified and
6 excluded. Excluded cases are never counted as Rust passes.

The new 127 comparisons cover vararg order/laziness/templates, random invariants,
collection identity and mutation, custom contexts, parser syntax and caret
locations, direct-AST normalization, current UTC dates, and calendar boundaries.
They also exposed and fixed vararg template validation/type parsing and added
opt-in parser caret diagnostics. The original JS source, tests, and bundle are
unchanged. See `API.md` for diagnostic limitations and `fixtures/scope.json` for
the exact exclusions and reasons.

Coverage counts source declarations, including dynamic declarations only once.
It is traceability to passing comparisons, not line/branch coverage or proof
that every original assertion or possible input has been checked. The strict
gate rejects stale exclusions, unlinked descendants, missing observations, and
failing fixtures rather than inferring coverage from a passing sibling suite.

## Required follow-up

1. Add interruptible regex compilation/search or enforce external execution
   limits before accepting unrestricted untrusted patterns. Runtime budget
   checks occur between matches, not inside `regress` backtracking. Broader
   ECMAScript/Unicode edge-case auditing remains necessary; the passing corpus
   is not a claim of complete V8 conformance.
2. Add target-platform CI and broader sustained-workload memory/performance
   measurements before treating this as a release-ready replacement. Current
   ownership tests check reachability and arena reclamation, not a complete
   process-heap profile.

String patterns use `regress` 0.12.0 with documented local compatibility patches
in `vendor/regress/LPE-PATCHES.md`. The eight former failures now pass as ordinary
regressions, together with additional flag, capture/metadata, lookbehind,
case-folding, escape, and emoji tests. Named `d` indices retain their numeric
capture array identity. `update_in` and vararg type patterns use the same engine.
The JavaScript implementation and its original tests are unchanged.

Streams are now in scope, including mixed Promise/Stream payloads. JS does not
await Promise operands when a Stream is present; Rust preserves this
behavior, including object coercion in `stream() + promise()` and no emission on
Promise settlement alone. Promise-only expressions still await their arguments.
The baseline retains creator references on nested computed streams; such graphs can remain
subscribed after an outer release. Dropping the runtime disposes the graph.
Native JS objects, JS execution and
reflection, and isolated-surrogate input/output remain explicit scope exclusions.
Input/output uses UTF-8; there is no UTF-16 wire protocol.

Documentation generation, context preparation, static docs, lookup, documentation
warnings/helpers, and localization tooling remain JS/V8-only by agreement.
Rust has no documentation module or embedded documentation data. These APIs and
their dedicated source tests are excluded from Rust parity, not outstanding
implementation tasks. The original JS documentation tests still run unchanged.

## Reproduce

```sh
npm run test:all
cargo fmt --manifest-path rust-impl/Cargo.toml --check
cargo clippy --locked --manifest-path rust-impl/Cargo.toml --all-targets -- -D warnings
```

`test:all` passes, including its strict coverage gate.
Its report is `rust-impl/reports/parity.json`; runtime reports are
ignored by Git. Fixture generation checks are nonmutating. The source-derived
inventory and explicit scope decisions are checked in alongside the fixtures.
