# Rust LPE implementation

Status: implementation and compatibility testing in progress. The native crate
and shared JS/Rust test harness are implemented. Do not interpret passing fixture
counts as complete compatibility; `coverage.json` records the remaining gaps.
See [STATUS.md](STATUS.md) for verified results and the outstanding work.

Tracking issue: [#72](https://github.com/luxms/luxmsbi-lpe/issues/72).

## Build and test

From the repository root:

Native builds require Rust 1.92 or newer. The experimental WASM build uses its
own pinned Rust 1.100 toolchain (see below). Node is required only for the
JavaScript reference and shared test tooling.

```sh
npm ci
npm run test:all
```

The aggregate command builds the JS reference, runs its original tests, checks
the harness, runs Rust tests, compares both implementations on shared fixtures,
and enforces the strict coverage gate. It exits unsuccessfully while required
coverage or behavior remains incomplete. Reports are written under
`rust-impl/reports/`, which is ignored by Git.

Individual commands:

```sh
npm run test:rust
npm run test:parity
cargo run --locked --manifest-path rust-impl/Cargo.toml --example embedding
cargo build --locked --release --manifest-path rust-impl/Cargo.toml
```

The Rust library and executable do not need Node or a JS engine. Node and the
original JS bundle are used only by development-time reference tests. The test
runner invokes Mocha programmatically to avoid the old CLI's incompatibility
with newer Node releases. Existing JS sources and tests remain unchanged.

The [production layout fixture](fixtures/production/README.md) adds full-script
parser/deparser regressions and context-independent title/color evaluation
checks from a real application layout. It runs in the native and WASI shared
compatibility suites; application rendering and event handlers are not mocked.

The `lpe` binary accepts newline-delimited UTF-8 JSON requests, with one response
per line. See [fixtures/protocol.md](fixtures/protocol.md) for the test protocol.
Each request uses a fresh interpreter; embedding the library allows reuse.

```json
{"op":"eval","source":"add(20,22)"}
```

The response is `{"ok":true,"value":42.0}` (JSON numeric formatting may vary).

## WASI 0.3

The experimental `wasm32-wasip3` target builds the same interpreter as a WASI
command component. Only WASM uses Rust 1.100: currently `1.100.0-beta.4`, pinned
as `beta-2026-10-05` until the stable release. Native builds keep their existing
toolchains and Rust 1.92 minimum. There is no repository-wide toolchain override.

Install the WASM toolchain and Wasmtime 49.0.2, then run from the repository root:

```sh
rustup toolchain install beta-2026-10-05 --profile minimal --target wasm32-wasip3
npm run build:wasm
printf '%s\n' '{"op":"eval","source":"add(20,22)"}' | \
  wasmtime run rust-impl/target/wasm32-wasip3/release/lpe.wasm
```

Use rustup-managed Cargo and rustc on `PATH`; a separate system Rust installation
must not override the compiler selected by `rustup run`. No JavaScript engine is
needed to execute the component. It uses the same UTF-8 JSON-lines protocol and
fresh interpreter per request as the native CLI. This is a `wasi:cli/run@0.3.0`
command, not browser bindings or a typed LPE WIT library. LPE Promises and Streams
retain their interpreter semantics; they are not exported as WASI stream/future
APIs.

For the complete WASM check, install the JS reference dependencies first:

```sh
npm ci
npm run test:wasm
```

`test:wasm` builds the JS reference, checks generated fixture freshness and the
production layout's JS regressions, then builds the release WASM command, runs
the embedding example inside Wasmtime, checks protocol boundaries, and compares
every shared fixture against JS before enforcing the strict coverage gate.
`WASMTIME` may point to a specific Wasmtime executable. Results are written to
`rust-impl/reports/wasm-parity.json`, with `rustTarget: "wasm32-wasip3"`.
Native subprocess tests and non-UTC timezone tests remain in the native jobs;
this command does not run the native Rust test binaries inside WASM.

Current limits:

- The pinned toolchain and runtime are experimental for this target. Update them
  deliberately and rerun compatibility checks, rather than following beta/latest.
- The component uses WASI 0.3 for its CLI entry point, stdio, and clocks, but the
  dependency stack also imports WASI 0.2 compatibility interfaces for random
  bytes and stderr/streams. The host must supply both, as Wasmtime 49.0.2 does;
  this is not a WASI-0.3-only artifact.
- Local-calendar operations use UTC on WASI, even if `TZ` is supplied. Native
  host timezone behavior is unchanged.
- No host filesystem directories, network permissions, or inherited environment
  are granted by the test commands. Threads, subprocesses, and arbitrary
  asynchronous host integrations are not established by these checks.

## GitHub CI

[Rust CI](../.github/workflows/rust.yml) runs on every pull request targeting
`rustaple` and every push to that branch. There are no path filters: changes to
the JavaScript reference must also pass compatibility checks. Pushes to
`ci/rust-*` branches also run the workflow, allowing CI changes to be tested
in a fork before merging.

- Linux and macOS: release library/CLI builds, native tests, and the embedding
  example on stable Rust.
- Linux: the same build and native checks on Rust 1.92.0, the minimum supported
  Rust version. Formatting and Clippy run on stable Rust with warnings treated
  as errors.
- Linux with Node 26 and stable Rust: `npm ci` followed by `npm run test:all`,
  including the original JS suite, native and vendored regex tests, opt-in JS
  reference tests, fixture freshness, shared parity, and the strict coverage gate.
- WASI 0.3: a separate Linux job with pinned Rust 1.100.0-beta.4, Wasmtime 49.0.2,
  and Node 26 runs `npm run test:wasm`. Only after all checks pass, it uploads the
  release component as `lpe-wasm32-wasip3` for download from the Actions run.

Compatibility reports are uploaded for 14 days, including after failures when
available. The tracked coverage inventory may be unchanged if the suite fails
before generating a fresh report; consult the job log and parity report together.
The workflow uses read-only repository permissions and pinned action revisions.
The component and diagnostic artifacts are retained for 14 days. The workflow
does not publish crates, create releases, or deploy to an external environment.

## Embedding and ownership

See [examples/embedding.rs](examples/embedding.rs) for parsing, evaluation, context
variables, synchronous and asynchronous callbacks, and explicit collection.
Use `Runtime::eval_async` with a host-provided executor for asynchronous work.
`Runtime::eval` and `eval_ast` are synchronous convenience entry points and block
until all required futures resolve.

Runtime values are distinct from JSON ASTs. Arrays, objects, functions, and
environments use runtime-owned arena handles, preserving aliases and cycles.
Handles must not be used with another runtime. `collect_garbage` traces context
bindings and explicit host roots; hosts must pass any retained values as roots,
including values captured inside opaque native callbacks or pending futures.
Dropping a runtime releases its arenas. Collection is explicit, not automatic.

`EvalOptions` provides work, nesting, and loop limits. Cancellation is checked
during evaluation and when a pending evaluation is polled. A host that sets the
cancellation flag must also arrange for its executor to poll the future again.
Blocking native callbacks cannot be interrupted by the interpreter. Resource
limits are safeguards, not a sandbox for untrusted native callbacks.

Hosts can opt in to `RuntimeControls` for same-thread interrupt polling inside
evaluation and regex searches, cumulative intermediate-byte reservations, and
non-relaxable nested work/depth ceilings. See
[RUNTIME-CONTROLS.md](RUNTIME-CONTROLS.md) for integration and coverage limits.
No new controls are installed by the CLI or WASI entry point by default.

## Legacy embedding profile

Hosts targeting JS 1.6.7 can opt in with `Runtime::set_legacy_context(true)`.
Legacy `fn` binds only arguments actually supplied: a missing duplicate parameter
does not overwrite an earlier value, while an explicitly supplied `undefined`
still participates in binding. This policy and deferred callable returns are
captured when the closure is created. Modern `fn`, other closure constructors,
and host-created closures retain their existing behavior.

Standalone parsing can opt in with
`parser::parse_with_options(source, &serde_json::json!({"legacyLineBreaks": true}))`.
In this mode a top-level newline before a dot starts a new statement, matching
JS 1.6.7; newlines after a dot and within grouped expressions retain their normal
handling. `parse_with_diagnostics` accepts the same option. Runtime source
evaluation and `eval_lpe` select it when the legacy context profile is enabled.
Default parsing continues to join multiline dot chains.

This is a bounded compatibility profile, not a complete JS 1.6.7 interpreter.
Hosts remain responsible for their JSON conversion and callable API boundaries.

## Unicode boundary

Input, output, source code, and JSON interchange use UTF-8. Valid Unicode text,
including non-BMP characters, is supported. Valid strings stay in Rust UTF-8
storage, and operations use it directly wherever results match JavaScript.
JavaScript-compatible operations may count or slice UTF-16 code units internally;
for example, `"😀"` has length two and indexing can produce a surrogate half.
This is a compatibility detail, not an alternate input encoding. Isolated surrogate input or a result containing an
isolated surrogate is outside the UTF-8 contract and must produce an error at
the boundary, not a separate UTF-16 wire representation.

## Measurement

The benchmark suite separates parsing from repeated evaluation of a preparsed
AST and compares release Rust with warmed JavaScript on shared cases:

```sh
node rust-impl/scripts/benchmark.mjs
node rust-impl/scripts/benchmark.mjs --require-parity
```

See [PERFORMANCE.md](PERFORMANCE.md) for methodology, individual commands,
optimization references, and limitations. Reports include medians, ranges,
compiler/Node versions, and host details. The explicit acceptance gate fails
when any measured phase is slower than JavaScript; this is a local benchmark,
not a claim about database, UI, or all asynchronous application workloads.

## Scope

Implement this repository's LPE parser, deparser, and interpreter from scratch
in Rust under `rust-impl/`, without a JavaScript runtime dependency. Recreate
current JavaScript behavior fully except for the explicit exclusions below.
Preserve the JavaScript implementation and its consumers during development.

SQL/MDX generators, database adapters, PostgreSQL integration, and downstream
application migration are explicitly outside this proposal. They are not
milestones or acceptance criteria for this work.

## Compatibility reference

Use the JavaScript implementation at commit
`f90b5062a8edfef0c8d8a3da6cbcd30a86028af5` (`@luxms/lpe` 1.7.3) as the initial
behavioral reference. Record deliberate deviations and later baseline updates
explicitly. Do not assume parity based only on matching function names.

Relevant implementation areas:

- `src/lpel.js`, `src/lpep.js`: lexer and parser.
- `src/lped.js`: deparser.
- `src/lisp.js`: evaluation, contexts, and public interpreter entry points.
- `src/lisp.var.js`, `src/lisp.vararg.js`, `src/lisp.unbox.js`: variable lookup,
  argument handling, and asynchronous/stream result handling.
- `src/context/` and `src/lib/datetime.js`: standard-library behavior.
- `src/index.js`, `src/index.d.ts`: public exports and declarations.
- `test/`: compatibility cases, including host behavior and round trips.

Inventory all public exports, built-ins, aliases, syntax, options, and observable
errors in a checked-in coverage matrix. Each entry must be implemented,
explicitly excluded by the agreed scope, or recorded as an implementation gap. A temporary
incomplete implementation milestone is not an additional exclusion.

## From-scratch implementation

Write new Rust code following current LPE JavaScript source and tests. MAL and
miniMAL may be consulted only as references if required. Do not copy, translate,
vendor, or depend on their implementations, and do not adopt their language
semantics. LPE parity, not MAL conformance, is the acceptance criterion.

The existing interpreter header credits miniMAL and Joel Martin under MPL-2.0.
Retain existing notices and record attribution/dependency licensing as
appropriate. New Rust code is not permission to remove existing source notices.

## Confirmed feature boundaries

### No macro system

Current `EVAL_IMPLEMENTATION` in `src/lisp.js` dispatches ordinary functions and
special forms; it has no MAL-style macro-expansion mechanism. Macro descriptions
in `src/types.js` and commented-out code in `src/context/objects.js` are legacy
material, not requirements. Do not implement `defmacro`, `macroexpand`, or MAL
quasiquotation absent from current LPE.

Preserve active special forms, quotation, AST manipulation, and thread-first /
thread-last behavior. Threading comments use the word macro, but the operations
execute as `makeSF` special forms and remain in scope.

### Streams

Reactive Streams are in scope, including current values, ordered notifications,
subscriptions, retain/release, and selected-child switching. The original
`test/test-streams.js` suite and new shared scenarios are behavioral references.
Native hosts bridge their sources using `Runtime::create_stream`, `stream_next`,
`stream_subscribe`, `stream_value`, `stream_retain`, and `stream_release`.
No JavaScript adapter object is required or accepted through JSON options.

Streams may emit scalar values, Promises, or other Streams intermixed. Unboxing
stream inputs passes their current values directly, without awaiting Promise
arguments. A selected child stream is forwarded one layer deep; its emitted
Promises or Streams are not recursively flattened. Promise-only unboxing awaits
its arguments, but does not redetect a Stream produced by a Promise. Native
`Value::Promise` and `Value::Stream` preserve these distinctions. Hosts explicitly
poll asynchronous work through Rust futures; the core has no implicit executor.

Compatibility follows the checked-in JS, including its mixed-operand limitation:
with a stream holding `2` and a Promise resolving to `3`, `stream() + promise()`
produces a stream holding `"2[object Promise]"`, not `5`. Settling the Promise
does not trigger a new emission. Rust does not add implicit waiting or recursive
flattening that is absent from `src/lisp.unbox.js`.

Ownership follows the JS adapter: creating a stream gives its creator one
reference, and each dependency adds one. Release balances subscriptions but
does not implicitly consume a creator's reference. Thus nested computed streams
can retain upstream subscriptions after an outer stream is released, exactly
as in the JS baseline. Use a bounded runtime lifetime for such graphs; dropping
the runtime disposes them. This upstream ownership limitation is not evidence
of automatic graph cleanup. Native initialization failures roll back retained
dependencies, and operations on disposed streams report errors.

### Host-specific exclusions

Exclude arbitrary JavaScript execution, native `RegExp()`/JS RegExp objects,
JS prototype/reflection machinery, and arbitrary JavaScript host objects. These
are JavaScript-runtime features, not all literally V8-specific. Record exact
affected APIs and overloads in the coverage matrix; do not drop portable LPE
behavior just because its JavaScript implementation uses native APIs.

The concrete runtime exclusions include native constructors (`new`, `Array`,
`Object`, `Date`), `RegExp` objects, native `console`/`JSON` objects, and JS receiver
dispatch (`invoke`, `_call_obj_meth_`, `_get_obj_meth_`, `~>`). Their source-test
exclusions are reviewed individually in `fixtures/scope.json`; neighboring
parser tests are not excluded. See [API.md](API.md#explicit-exclusions) for the
portable equivalents and the separate documentation-only exclusions.

- LPE `eval()` in `src/context/std.js` calls `eval_lisp(a)` in STDLIB context;
  it is not JavaScript `eval`. Retain this portable operation, plus `eval_ast`,
  `eval_lpe`, and `rep`, preserving their different context rules.
- Preserve maps, lists, member access, conversions, and registered host callbacks
  on LPE values. Excluding arbitrary JS objects does not exclude these features.
- Preserve datetime functions using native Rust code instead of requiring JS
  `Date` objects.
- Preserve string-pattern functions such as `words` and `re_match`; test their
  pattern/flag semantics using `regress`. Overloads
  accepting or returning actual JS RegExp objects are excluded.

### Documentation remains JS/V8-only

Do not implement documentation generation, lookup, embedded documentation or
localization data, or documentation-oriented context preparation in Rust. This
excludes `makeDoc`, `makeDocForContextes`, `prepareContext`, `DOC`, `LOCALE_DOC`,
`DOC_WARNINGS`, `findDoc`, the documentation helpers `generateSimpleHash` and
`selectPerfectFunctionName`, and `localizationUpdate`/`LOCALIZATION_OPTIONS`.
There is no Rust documentation module, generated data bundle, or runtime fallback.

Keep the existing JS/V8 implementation and its documentation tests unchanged.
The coverage inventory records these APIs and their dedicated source test groups
as excluded, not missing or passing Rust features. Runtime function names,
aliases, host registration, and interpreter examples extracted from JS comments
remain in scope; they do not require a documentation subsystem.

## Library design

All new Rust code, fixtures, examples, and build metadata belong in `rust-impl/`:

```text
rust-impl/
  README.md
  Cargo.toml             # standalone native crate
  src/                   # lexer, parser, deparser, values, evaluator, built-ins
  tests/                 # native and differential tests
  fixtures/              # inputs and tagged reference results
  examples/              # standalone library embedding
```

Keep the core independent of any particular host. Prefer a small crate until
actual module boundaries justify splitting it. Initial modules should cover:

- Lexer, standard/logical grammar parser, and deparser with structured errors.
- AST and runtime values, preserving the existing JSON-shaped expression format.
- Evaluation state, environments, bindings, closures, and standard library,
  preserving LPE numeric coercion and truthiness rather than Rust defaults.
- Host callback registration for ordinary functions, special forms, and variable
  lookup hooks and skip forms, with explicit context and evaluation-option access.
- Non-stream async evaluation with Rust futures and explicit host integration.
- Execution budget, cancellation checks, and host-independent error reporting.

AST interchange and runtime values are different contracts: runtime values may
include functions, undefined, non-finite numbers, and shared mutable objects.
Define these explicitly rather than mapping all values to `serde_json::Value`.
Handle cycles and aliases without silently copying away observable mutation.

Decide ownership before implementing closures. A call-scoped arena with handles
is a candidate only if escaping values and references have a defined lifetime.
Tracing collection is another candidate. Reference-counting alone does not
collect closure/environment cycles; dropping a top-level context is insufficient.

Avoid implicit process-global environments, REPL dependencies, filesystem
access, and process exit calls. Expose output and other host effects only via
explicit host APIs. Define nesting and work limits, including parser and
deparser limits, and clarify that cancellation of a blocking host callback is
the host's responsibility.

## Acceptance milestones

1. **Behavior inventory and fixtures.** Pin the JavaScript reference; inventory
   APIs, both grammars, contexts, mutation, error behavior, datetime behavior,
   asynchronous features, streams, and JavaScript interop. Create the complete
   coverage matrix with only the stated exceptions; no arbitrary subset target.
2. **Core foundation.** Add the Rust crate under `rust-impl/`, implemented from
   scratch, with the AST/runtime value distinction,
   ownership rules, errors, execution budget, and callback protocol. Include
   tests for closure lifetimes, aliases, invalid input, and cancellation.
3. **Parsing and deparsing.** Implement both LPE grammars, operators, comments,
   literals, separators, and the pinned baseline's newer syntax. Compare ASTs
   and parse/deparse round trips against JavaScript fixtures.
4. **Synchronous interpreter.** Recreate bindings, context search, lookup hooks,
   special/skip forms, quotation, functions, closures, varargs, mutation, errors,
   and the portable standard library including datetime operations. Preserve
   aliases and callback behavior. Do not add a macro subsystem.
5. **Asynchronous evaluation.** Recreate non-stream promise behavior with Rust
   futures, including arguments, bindings, errors, and cancellation. Test against
   current async fixtures with equivalent host functions.
6. **Compatibility and hardening.** Run differential tests, fuzz malformed
   inputs, exercise execution limits, and measure repeated-call retained memory.
   Publish reproducible latency and throughput benchmarks without assuming
   a speedup over JavaScript.
7. **Library delivery.** Complete all non-excluded coverage entries.
   Document embedding, the API matrix, explicit exclusions,
   differences, dependency licenses, and examples. Select a minimum Rust version
   and platform CI matrix.
8. **Streams.** Implement reactive unboxing and host stream lifecycle against
   current stream tests, including mixed Promise/Stream payloads and ownership.

## Validation strategy

Build the pinned JavaScript bundle before collecting reference results. Existing
JavaScript tests remain authoritative for the features they cover, and should
continue to run unchanged alongside the new Rust checks. New tooling belongs
under `rust-impl/`; keep repository-level integration changes minimal.

Use a language-neutral fixture format that records the operation, input, context
fixture identifier, explicit options, expected value, or expected error category.
Host callback fixtures need equivalent implementations in both languages; they
cannot be serialized as JSON functions. Use tagged results for undefined,
non-finite numbers, and other non-JSON values instead of lossy JSON serialization.

Cover numeric coercion, division, NaN/infinities, truthiness, null versus
undefined, lookup fallback, shadowing, varargs, closure capture, mutation, and
special-form evaluation order, async resolution, and reactive updates. Include
Unicode/string behavior and controlled
clock/timezone fixtures for datetime operations. Test both omitted options and
explicit option objects. Compare error categories where exact text is not part
of the agreed public contract.

MAL conformance is not a goal or evidence of LPE parity. Native tests must also
cover memory cleanup after failure and cancellation, and bounded resource use
across repeated evaluations, including cyclic closure graphs and async work.

## Completion criteria and open decisions

The first release is complete when both grammars and every non-excluded,
runtime entry pass differential tests, embedding runs without
JavaScript, and errors/resource-limit/memory tests pass. Ordinary async behavior
is required. Publish the coverage matrix and excluded/deferred tests. The
synchronous milestone alone does not satisfy this completion gate.

Open decisions include the precise API and crate name, minimum Rust version,
platform matrix, ownership/collection design, regex execution limits,
async host interface, and non-JSON fixture representation. From-scratch code,
no macros, the directory, and the feature boundaries above are decided. Resolve
remaining engineering choices with small tested prototypes, independently of
downstream applications.

String-pattern regex matching uses `regress`, a standalone Rust ECMAScript
engine. See [API.md](API.md#regular-expressions) for matching semantics and
execution-limit caveats, and [STATUS.md](STATUS.md) for the verified parity scope.
