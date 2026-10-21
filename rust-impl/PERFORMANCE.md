# Native performance

The comparison runs the public Rust `parse` and `Runtime::eval_ast` APIs against
this checkout's JavaScript `parse` and `eval_lisp`. It measures parsing and
repeated evaluation of a preparsed AST separately. It does not include process
startup, runtime construction, context setup, database work, or UI rendering.

```sh
node rust-impl/scripts/benchmark.mjs
# Acceptance gate for required cases; bulk JSON timings remain informational.
node rust-impl/scripts/benchmark.mjs --require-parity
```

The runner builds the JS reference and release Rust example, checks results
against shared expected values, warms both implementations, runs five samples
sequentially with alternating implementation order, and records medians and
ranges. The suite covers arithmetic, bindings, strings, conditional evaluation,
collections, Unicode strings, closure construction/invocation, and parsing a production layout.
It also covers property/path lookup, mapping/filtering/reduction over rows,
pluck, zip, numeric object-key ordering, string joins, and formatted strings.
These added collection workloads use a 0.1 iteration scale.
Closure cases also isolate construction, repeated calls, lexical captures,
five-argument calls, and nested closure calls. A fixture's optional `setup` map
evaluates named bindings once, before validation, warm-up, and timing in both
implementations. Rust installs them as global roots so repeated calls retain
their captured scopes through garbage collection.
Rust's explicit garbage collection every 256 evaluations is included in elapsed
time; JavaScript's automatic collection is also inside the timed region.

`BENCH_CASES` optionally selects comma-separated case IDs for diagnostics; the
CI release gate runs every case. `BENCH_ITERATIONS` defaults to 20,000,
`BENCH_REPEATS` to 5. The production layout
uses 0.002 times the iteration count. `BENCH_REPORT` chooses the JSON report
path (default `rust-impl/reports/benchmark.json`). `BENCH_SKIP_BUILD=1` is useful
only with an already verified current build; `BENCH_RUST_BINARY` can select a
saved comparison binary. Each command in the pair can also be run individually:

```sh
cargo run --locked --release --manifest-path rust-impl/Cargo.toml --example benchmark -- 20000 arithmetic 10000
node rust-impl/scripts/benchmark-js.cjs 20000 arithmetic 10000
```

Arguments are iterations, case name, and warm-up iterations. Reports include
host, compiler, Node, revision, dirty state, raw samples, and JS time divided by
Rust time. Ratios above one favor Rust. Do not run builds or other benchmarks
alongside an acceptance measurement. Report variation rather than interpreting
a small difference on a busy machine as a universal speed guarantee.

## Safe runtime optimization comparison

CI compares three implementations in the same job: the candidate Rust runtime,
the released `r1.8.0` Rust runtime, and JS 1.8.0. The release baseline is built
with the same compiler, release profile, benchmark driver and expanded fixtures
in a separate Cargo target directory. No candidate runtime source is copied into
that build. All 27 workloads run; the two bulk JSON cases retain their documented
informational status. Measurements rotate execution order across nine samples.

`BENCH_BASELINE_BINARY` enables the third implementation locally;
`BENCH_BASELINE_REVISION` records its source commit. Each phase includes
`baselineMedianUs`, `baselineRangeUs`, and `baselineSpeedup` (released Rust time /
candidate time). The existing `speedup` continues to mean JS time / candidate
time. Keep the raw samples and compare on the same host; release-note timings
from another machine are not a before/after baseline.

The optimization uses existing properties of native safe execution:

- Native data arrays have no getters or prototype lookup. Collection loops
  access numeric slots directly, without formatting and reparsing each index.
  They still read each slot live and distinguish holes from present undefined
  values, preserving mutations made by callbacks.
- Property validation borrows UTF-8 names. Only numeric/UTF-16 conversion or
  storing a key needs owned text. Short data paths keep their validated keys
  inline; every segment is checked before traversal, including segments after
  a missing value. Canonical array-index recognition and object-key ordering
  no longer allocate formatted numbers.
- Scalar/name evaluation and registered synchronous builtins use small futures,
  avoiding the general dispatcher's continuation state. Dispatch only classifies
  immutable AST/function kinds. Validation, limits, depth changes, and GC roots
  remain at poll time; no code is executed when a future is merely created.
- Argument lists consisting entirely of direct reads and primitive quotes can
  pass native data handles without per-argument evaluator tasks. Every argument
  is checked before execution. Mixed expressions retain the original planning
  and async paths, so an earlier mutation cannot stale a later binding.
- Uncontrolled `pluck` builds its result directly, preserving sparse slots;
  `zip` bounds its initial buffer reservations. Formatted scalar strings borrow
  UTF-8 parts and evaluate eligible parts without continuation tasks. Surrogate
  values, general coercion, flags, and controlled allocation retain their
  existing behavior.

This does not assume all LPE calls are synchronous: host callbacks, promises,
streams, special forms, and asynchronous collection functions retain their
existing execution rules. General immediate plans still reject compound bindings;
only complete lists of effect-free leaf arguments accept data handles. Boundary
tests cover sparse/live arrays, canonical property names, complete path validation,
lazy calls, rejected values, formatted Unicode and every tested step/depth boundary; the full
native/WASI corpus and controlled/legacy/async tests remain required.

The allocation approach follows the [Rust Performance Book](https://nnethercote.github.io/perf-book/heap-allocations.html)
and uses standard [`Cow`](https://doc.rust-lang.org/std/borrow/enum.Cow.html)
borrowing. A local `sample` profile of `array-map` on the released runtime showed
the nested `eval_in`/`call_with_options` dispatch paths and allocator activity;
performance acceptance uses the paired CI measurements, not profiling samples.

## Release 1.8.0 measurements

The CI performance job runs 100,000 iterations and nine alternating samples
against the merged JS 1.8.0 safe evaluator. JSON parsing/stringification cases
include both a small object and 32 rows (the latter use a 0.02 iteration scale).
The job uploads `rust-performance-report` and fails if any required phase has
a Rust median above the JavaScript median. The two bulk JSON row cases are
explicitly informational (`performanceGate: false`); their measured results
remain in the report and release notes. Small JSON calls and all pre-existing
language/closure workloads remain required. Release notes link the exact run
and attach its raw report; results must not be inferred from older revisions.

The 2026-10-21 local host reported a 33% CPU speed limit and substantial
background load. Its incomplete diagnostic run is not an acceptance result.
Use the isolated CI run for this release's table and retain the sample ranges.

## Historical result (2026-10-19, lower-load rerun)

The implementation at commit `612b38a` passed the performance gate on an Intel Core
i9-8950HK (macOS), Rust 1.99.0 (Homebrew), and Node 26.12.0. Nine alternating
samples used 100,000 iterations and 10,000 warm-ups per ordinary case; the
production parser case used 200 iterations and 200 warm-ups. Builds finished
before timing. Release builds include ThinLTO and one code-generation unit.
Every measured phase had a lower Rust median.

These measurements precede integration of the newer `rustaple` runtime controls
and legacy context profile for release 1.8.0. Those opt-in modes use the full
evaluator and retain their control accounting and lookup/callable-return rules;
the default profile retains the immediate evaluator. The table is evidence for
the measured revision, not a performance measurement of either opt-in mode.

```sh
BENCH_ITERATIONS=100000 BENCH_REPEATS=9 node rust-impl/scripts/benchmark.mjs --require-parity
```

| Case | Rust eval, microseconds | JS eval, microseconds | Eval speedup | Parse speedup |
| --- | ---: | ---: | ---: | ---: |
| arithmetic | 1.028 | 1.642 | 1.60x | 4.03x |
| bindings | 1.152 | 2.178 | 1.89x | 8.22x |
| strings | 1.136 | 1.899 | 1.67x | 4.89x |
| unicode-strings | 5.144 | 6.574 | 1.28x | 4.20x |
| conditional | 1.476 | 2.917 | 1.98x | 6.37x |
| collections | 2.461 | 3.568 | 1.45x | 2.82x |
| closure | 5.460 | 5.709 | 1.05x | 5.69x |
| production-layout | — | — | — | 2.65x |

Speedup is JS time / Rust time. Rust won all nine paired evaluation samples in
each case except closures, where it won eight. Closure evaluation ranged from
4.588–5.745 microseconds in Rust and 4.949–6.109 in JS; its median advantage is
4.6%, with overlapping sample ranges.

Host load was lower than the earlier run: the one-minute load average ranged
from 4.81 to 7.69 (median 6.42). CPU idle readings were 84.63% before timing and
76.82% afterward. However, `pmset -g therm` reported `CPU_Speed_Limit` of 60
before timing and 47 afterward, despite the earlier preflight reading 100.
**This is not an unthrottled baseline.** It passes the local median-based gate,
but the small closure advantage needs confirmation on a stable, unrestricted
CPU. It does not establish an advantage for every expression, async workload,
runtime, or embedding host.

The generated, Git-ignored reports retain all nine samples; none were discarded:

- `rust-impl/reports/benchmark-clean-20261019T093228Z.json`: raw timings and medians.
- `rust-impl/reports/benchmark-clean-20261019T093228Z-host.json`: host readings,
  periodic load measurements, and input/binary SHA-256 fingerprints. All measured
  inputs were unchanged through the run.
- `rust-impl/reports/benchmark.json`: a copy of this latest result.

The earlier five-sample result is preserved as
`rust-impl/reports/benchmark-previous-20261019T091315547Z.json`.

## Changes and constraints

- Parse native JSON directly into runtime values through sonic-rs's Serde
  visitor, avoiding a temporary JSON tree. Retain numeric/Unicode fallbacks.
  Serialize ordinary JSON data synchronously through borrowed collections and
  a single output buffer. Eligible resolved JSON calls skip async task setup;
  calls with callbacks, dynamic arguments, custom limits, and lookup hooks keep
  their guarded evaluator path. Eligibility checks have no user-visible effects.

- Borrow environment and collection data for lookup instead of cloning whole
  maps/arrays. Cache immutable scope traversal order; read current bindings,
  lookup hooks, and backing objects on every resolution.
- Borrow ordinary expression ASTs; own replacements only when a skip form
  supplies a new AST. Share immutable closure bodies and parameter lists, and
  inspect function kinds without copying their payloads.
- Dispatch closures into a dedicated, smaller future while preserving lazy
  polling, call limits, captured binding policies, and the async fallback.
  Repeated constructors share owned body data using at most eight weak entries.
  Addresses are only lookup hints: each hit compares the entire AST, so edits
  and reused storage remain visible. Every closure still gets its own handle,
  parameters, environment, and options. Weak entries do not retain captures or
  become garbage-collection roots; evaluation plans and results are not cached.
- Resolve immediate builtin operators to static names from the shared registry
  without cloning their strings. Lookup still observes current aliases, hooks,
  and shadowing. Plan all eligible arguments before evaluating any, then run
  synchronous arguments without creating async task facades. Unsupported,
  promise/stream, legacy, and controlled arguments retain their existing path.
- Register GC roots without constructing a complete runtime facade for every
  synchronous frame. Avoid duplicate roots and scalar values that own no arena
  references. Trace borrowed collections during GC instead of cloning payloads.
  Suspended branches still own independent runtime facades.
- Plan eligible immediate expressions before executing any operation, then run
  them without per-node futures. Plans borrow ASTs and use current bindings;
  they are not a cache of evaluation results. Dynamic callbacks, Promise/Stream
  inputs, and unsupported forms retain the asynchronous evaluator. A rejected
  plan has performed no user-visible effects.
- Keep short plans, argument/root buffers, AST traversal stacks, and single-parent
  scope links inline using `smallvec`. Larger inputs spill to the heap. Move
  evaluated list elements into their result rather than cloning them again.
  Keep large special-form futures out of ordinary expression frames, and use
  stack pinning and direct async lookup where separate heap allocations add no
  lifetime benefit. Immediate closure bodies register roots only on fallback.
- Share synchronous builtin implementations between the immediate and async
  evaluators, including collection operations that do not invoke callbacks.
  Generate direct name-dispatch checks from the same registry as public names.
  Keep cancellation, work limits, nesting checks, lazy branches, and scope
  semantics. Closure construction shares its implementation as well.
- Evaluate eligible `let` bindings immediately and bypass stream setup for
  resolved bindings. Keep pair-binding maps directly in their lexical scope;
  object/function contexts retain their live backing values. Borrow binding
  pairs and parameter ASTs during scope/closure construction. Leaf closure
  bodies borrow call bindings directly; bodies that capture locals in nested
  closures or require host callbacks materialize an ordinary lexical scope.
  Construct shared parameter slices directly from the AST iterator.
- Move lexer tokens rather than cloning them; reserve AST capacity and use an
  ASCII identifier path while retaining Unicode behavior.
- Use UTF-8 directly for valid-string case changes, trimming, equality,
  concatenation, nonempty-separator splitting, prefix/suffix/containment checks,
  and scalar joins. Count/index JavaScript code units without allocating a
  whole UTF-16 buffer. Joins read borrowed array elements. Preserve code-unit
  lengths, surrogate halves, regex
  positions, and allocation limits; UTF-16 fallbacks remain where required.
- Reverse dense arrays directly; retain property/hole handling for sparse or
  extended arrays.
- Enable ThinLTO and one release code-generation unit so LLVM can optimize
  calls across crate boundaries, at the cost of longer release builds.
  Debug/test build settings remain unchanged.

These optimizations do not establish that every expression or asynchronous
workload is as fast as JavaScript. Use the per-case acceptance result and the
full compatibility suite, not language-level assumptions.

## Compatibility verification

`npm run test:all` runs the recursive JS corpus, native and vendored regex
tests, parser/regex/stream reference comparisons, embedding, shared fixtures,
and strict source coverage. JSON and safe callback cases run alongside closure
regressions. See [STATUS.md](STATUS.md) and the release's native/WASI reports
for the current corpus and verification results.

The focused closure and immediate-evaluator tests cover lazy planning,
side-effect order, changing bindings, shadowing, captured scopes, callbacks
that trigger collection, omitted and duplicate parameters, cancellation, and
work/depth limits. A lookup hook forces equivalent tests through the full
evaluator. Performance changes must keep these paths equivalent; a faster
benchmark alone is insufficient.

## References consulted

[MAL's Rust evaluator](https://github.com/kanaka/mal/blob/master/impls/rust/stepA_mal.rs)
and [environment implementation](https://github.com/kanaka/mal/blob/master/impls/rust/env.rs)
illustrate borrowed AST/environment access, shared ownership, ordinary direct
calls, and a tail-position evaluation loop. These are design references; no MAL
code or language semantics are copied. LPE's host callbacks, Promise/Stream
ordering, and collection lifetime requirements remain its own.

The [Rust Performance Book on heap allocations](https://nnethercote.github.io/perf-book/heap-allocations.html)
recommends investigating allocation costs and avoiding unnecessary cloning.
A local macOS `sample` of the closure workload confirmed allocation/free routines
as dominant sampled leaf functions. Its [build configuration guidance](https://nnethercote.github.io/perf-book/build-configuration.html)
and [Cargo's profile documentation](https://doc.rust-lang.org/cargo/reference/profiles.html)
explain why release builds and measured comparisons are necessary. No
CPU-specific compiler flags or process-wide allocator replacement are required.
The [SmallVec documentation](https://docs.rs/smallvec/latest/smallvec/) describes
the inline-storage and heap-fallback behavior used for temporary buffers.
