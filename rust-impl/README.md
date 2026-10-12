# Rust LPE implementation

Status: proposed; design only, no Rust runtime implemented by this change.

Tracking issue: [#72](https://github.com/luxms/luxmsbi-lpe/issues/72).

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
explicitly excluded as host-specific, or marked as Streams deferred. A temporary
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

### Streams deferred

Defer stream adapters, subscriptions, retain/release behavior, reactive updates,
and stream-specific unboxing to a later version. Keep `test/test-streams.js` as
its acceptance reference. Until supported, reject stream requests explicitly
rather than silently using a last value or evaluating only once.

Ordinary asynchronous evaluation is distinct from Streams and remains in scope.
Recreate non-stream promise behavior through Rust futures and host callbacks,
including evaluation order, bindings, and errors. Do not require JavaScript
Promise objects or implicitly choose an executor. A synchronous milestone may
come first, but does not complete the full target.

### Host-specific exclusions

Exclude arbitrary JavaScript execution, native `RegExp()`/JS RegExp objects,
JS prototype/reflection machinery, and arbitrary JavaScript host objects. These
are JavaScript-runtime features, not all literally V8-specific. Record exact
affected APIs and overloads in the coverage matrix; do not drop portable LPE
behavior just because its JavaScript implementation uses native APIs.

- LPE `eval()` in `src/context/std.js` calls `eval_lisp(a)` in STDLIB context;
  it is not JavaScript `eval`. Retain this portable operation, plus `eval_ast`,
  `eval_lpe`, and `rep`, preserving their different context rules.
- Preserve maps, lists, member access, conversions, and registered host callbacks
  on LPE values. Excluding arbitrary JS objects does not exclude these features.
- Preserve datetime functions using native Rust code instead of requiring JS
  `Date` objects.
- Preserve string-pattern functions such as `words` and `re_match`; test their
  pattern/flag semantics and choose a compatible Rust implementation. Overloads
  accepting or returning actual JS RegExp objects are excluded.
- Separate Node-only developer tooling, such as launching an editor for
  localization updates, from the runtime. Retain portable documentation and
  localization data as needed without implicit filesystem/process access.

## Proposed library design

All new Rust code, fixtures, examples, and build metadata belong in `rust-impl/`:

```text
rust-impl/
  README.md
  Cargo.toml             # added when implementation starts
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

## Implementation milestones

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
7. **Library delivery.** Complete all non-excluded, non-stream coverage entries.
   Document embedding, the API matrix, explicit exclusions,
   differences, dependency licenses, and examples. Select a minimum Rust version
   and platform CI matrix.
8. **Later version: Streams.** Implement the adapter protocol and reactive
   behavior against current stream tests; this does not block the first release.

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
special-form evaluation order and non-stream async resolution. Include
Unicode/string behavior and controlled
clock/timezone fixtures for datetime operations. Test both omitted options and
explicit option objects. Compare error categories where exact text is not part
of the agreed public contract.

MAL conformance is not a goal or evidence of LPE parity. Native tests must also
cover memory cleanup after failure and cancellation, and bounded resource use
across repeated evaluations, including cyclic closure graphs and async work.

## Completion criteria and open decisions

The first release is complete when both grammars and every non-excluded,
non-stream runtime entry pass differential tests, embedding runs without
JavaScript, and errors/resource-limit/memory tests pass. Ordinary async behavior
is required. Publish the coverage matrix and excluded/deferred tests. The
synchronous milestone alone does not satisfy this completion gate.

Open decisions include the precise API and crate name, minimum Rust version,
platform matrix, ownership/collection design, regex compatibility implementation,
async host interface, and non-JSON fixture representation. From-scratch code,
no macros, the directory, and the feature boundaries above are decided. Resolve
remaining engineering choices with small tested prototypes, independently of
downstream applications.
