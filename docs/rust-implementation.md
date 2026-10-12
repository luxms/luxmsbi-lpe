# Rust LPE implementation proposal

Status: proposed; design only, no Rust runtime implemented by this change.

Tracking issue: [#72](https://github.com/luxms/luxmsbi-lpe/issues/72).

## Scope

Implement this repository's LPE parser, deparser, and interpreter as an
embeddable Rust library with no JavaScript runtime dependency. Preserve the
JavaScript implementation and its consumers while developing the Rust version.

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

Inventory all public exports and classify them as supported in the first
synchronous milestone, deferred, or intentionally unsupported. Async and stream
behavior exists in current LPE; the first synchronous milestone must not be
presented as complete compatibility with every JavaScript API.

## MAL and miniMAL reuse

The interpreter header credits miniMAL and Joel Martin under MPL-2.0. LPE has
since acquired its own semantics and host protocol.

- [MAL's official Rust implementation](https://github.com/kanaka/mal/tree/master/impls/rust)
  provides an evaluator, lexical environments, closures, macros, and tail-call
  handling. It is organized as tutorial executables rather than an embedding
  library. Evaluate selective reuse, not adoption as a drop-in dependency.
- [miniMAL](https://github.com/kanaka/miniMAL) is a closer conceptual reference
  for JSON-shaped expressions and JavaScript semantics. Its official documented
  implementations are JavaScript, Python, and ClojureScript, not Rust.
- LPE source and tests, not MAL conformance, determine compatibility.

Important upstream Rust MAL differences to account for:

| Area | Rust MAL | Required LPE work |
| --- | --- | --- |
| Numbers | Integer value representation and arithmetic | Specify floating-point behavior, coercion, and numeric boundaries |
| Truthiness | Only nil and false are false | Preserve LPE behavior for zero, empty strings, null, and undefined |
| Name lookup | Unbound symbols produce errors | Preserve context order, lookup hooks, and `resolveString` options |
| Host functions | Ordinary callbacks receive evaluated arguments | Support ordinary callbacks and special forms with AST/context access |
| Ownership | Reference-counted environments and values; cycles are possible | Define bounded ownership or collection for closures and mutable values |
| Invalid input | Some argument paths index without arity validation | Return controlled errors instead of input-triggered panics |

If code is reused, pin its revision, preserve attribution, and review MPL-2.0
covered-file obligations. Do not assume upstream code can be relicensed under
this package's MIT metadata. See the
[Mozilla MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).

## Proposed library design

Keep the core independent of any particular host. Prefer a small crate until
actual module boundaries justify splitting it. Initial modules should cover:

- Lexer, standard/logical grammar parser, and deparser with structured errors.
- AST and runtime values, preserving the existing JSON-shaped expression format.
- Evaluation state, environments, bindings, closures, and standard library.
- Host callback registration for ordinary functions, special forms, and variable
  lookup hooks, with explicit context and evaluation-option access.
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
   asynchronous features, streams, and JavaScript interop. Approve the first
   synchronous subset and record exclusions.
2. **Core foundation.** Add the Rust crate, AST/runtime value distinction,
   ownership rules, errors, execution budget, and callback protocol. Include
   tests for closure lifetimes, aliases, invalid input, and cancellation.
3. **Parsing and deparsing.** Implement both LPE grammars, operators, comments,
   literals, separators, and the pinned baseline's newer syntax. Compare ASTs
   and parse/deparse round trips against JavaScript fixtures.
4. **Interpreter.** Implement bindings, context search and lookup hooks,
   special forms, functions, mutation, and the agreed standard library.
   Validate ordinary and unevaluated host callbacks in standalone tests.
5. **Compatibility and hardening.** Run differential tests, fuzz malformed
   inputs, exercise execution limits, and measure repeated-call retained memory.
   Publish reproducible latency and throughput benchmarks without assuming
   a speedup over JavaScript.
6. **Library delivery.** Document embedding, the supported API matrix, known
   differences, dependency licenses, and examples. Select a minimum Rust version
   and platform CI matrix. Keep deferred compatibility work visible.

## Validation strategy

Build the pinned JavaScript bundle before collecting reference results. Existing
JavaScript tests remain authoritative for the features they cover, and should
continue to run unchanged alongside the new Rust checks.

Use a language-neutral fixture format that records the operation, input, context
fixture identifier, explicit options, expected value, or expected error category.
Host callback fixtures need equivalent implementations in both languages; they
cannot be serialized as JSON functions. Use tagged results for undefined,
non-finite numbers, and other non-JSON values instead of lossy JSON serialization.

Cover numeric coercion, division, NaN/infinities, truthiness, null versus
undefined, lookup fallback, shadowing, varargs, closure capture, mutation, and
special-form evaluation order. Include Unicode/string behavior and controlled
clock/timezone fixtures for datetime operations. Test both omitted options and
explicit option objects. Compare error categories where exact text is not part
of the agreed public contract.

MAL tests can exercise reused algorithms, but do not establish LPE compatibility.
Native tests must also cover memory cleanup after failure and bounded resource
use across repeated evaluations, including cyclic closure graphs.

## Completion criteria and open decisions

The first milestone set is complete when the agreed synchronous API matrix and
both grammars pass differential tests, embedding examples run without JavaScript,
invalid inputs fail in a controlled way, and resource-limit and memory tests
pass. Documentation must state any remaining incompatibilities; this is not a
claim of full async/stream or arbitrary JavaScript-object interoperability.

Open decisions include the precise API and crate name, minimum Rust version,
platform matrix, ownership/collection design, amount of MAL code to reuse,
non-JSON interchange conventions, and the coverage schedule for async, streams,
and host-specific objects. Resolve these with small tested prototypes rather
than coupling the core to a downstream application.
