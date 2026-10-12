# Shared compatibility fixtures

Run `node rust-impl/scripts/parity.mjs` from any directory after building the
root JavaScript bundle and `rust-impl/target/debug/lpe`. `--js-only` validates
the independent expectations without claiming Rust parity. `--filter TEXT`
selects IDs/groups; `--timeout MS` bounds each request; `--report PATH` writes
machine-readable observations. Missing executables, malformed responses,
timeouts, empty selections, expectation failures and differences fail the run.

Each JSON fixture has `id`, `group`, `origin`, `request`, and `expected`.
Expectations are authored manually or extracted from literal assertions/docs,
never recorded from either implementation. Success expectations use
`{ "ok": true, "value": ... }`. Error expectations use `ok: false` and may
constrain `error.kind`, exact `error.message`, and/or `error.messageIncludes`. The runner compares
successful values exactly (object key order is immaterial). For errors it
compares kinds; wording is checked only when an expectation constrains it.
An unconstrained error expectation alone cannot establish builtin coverage.

Both workers use one JSON request and response per line. Operations are
`parse`, `deparse`, `eval`, `evalAst`, `api`, `stream`. Parse/eval consume `source`; deparse and
evalAst consume `ast`; `context` and `options` are optional. Workers must keep
diagnostics off stdout. Each request has a fresh context. JS evaluation awaits
ordinary Promises; synchronous stream scenarios use the operation below.

Tagged values recursively encode undefined as `{"$lpe":"undefined"}`;
non-finite numbers and negative zero as `{"$lpe":"number","value":"NaN"}`
(also `Infinity`, `-Infinity`, `-0`); functions as `{"$lpe":"function"}`;
dates as `{"$lpe":"date","value":"2024-01-02T00:00:00.000Z"}`.
The wire protocol is UTF-8 only. All strings must be valid Unicode, including
object keys. Lone-surrogate input/output is out of scope, including operations
that split an emoji into isolated surrogate halves. There is no `utf16` wire
tag. Valid Unicode remains in scope, including emoji, JavaScript code-unit
length/index results, and slicing/padding/concatenation that preserve valid
Unicode. Excluded scenarios are counted separately in `scope.json` and the
coverage report; they never count as passing fixtures.
Omitted AST arguments use the same undefined tag, not null. Named properties
on arrays cannot be represented by this protocol: such outputs are explicitly
rejected, not silently dropped. Native RegExp and arbitrary JS host objects
are excluded, not encoded as empty objects. String-pattern regex builtins
remain in scope when their results fit the protocol.

## Portable Stream Operation

`stream` creates a fresh external adapter and named source streams per request:

```json
{"op":"stream","sources":{"a":2,"b":3},"source":"a + b","steps":[{"op":"next","name":"a","value":4},{"op":"release","name":"result"}]}
```

The success response uses the normal envelope and recursive tagged encoding:

```json
{"ok":true,"value":{"snapshots":[
  {"value":5,"sources":{"a":{"value":2,"refs":2,"listeners":1},"b":{"value":3,"refs":2,"listeners":1}},"events":[]},
  {"value":7,"sources":{"a":{"value":4,"refs":2,"listeners":1},"b":{"value":3,"refs":2,"listeners":1}},"events":[7]},
  {"value":7,"sources":{"a":{"value":4,"refs":1,"listeners":0},"b":{"value":3,"refs":1,"listeners":0}},"events":[7]}
]}}
```

`sources` is an object mapping names to initial values. `source` is evaluated
with those stream bindings, STDLIB, and `{streamAdapter: adapter}`. Stream
scenarios do not use the ordinary `context`, `options`, or host fixture bindings.
Alternatively, omit `source` and specify `unboxReturn:"child"`; this calls
`lpe.unbox([sources[request.unboxInput || 'flag']], () => sources[request.unboxReturn], adapter)`
directly. `unboxInput` selects a different source when needed; both names must
exist in `sources`. No host-fixture extension is needed.

`steps` defaults to `[]`. Each step is `{op:"next"|"release"|"retain",name,value?}`.
The name selects a source or the reserved name `result`, which selects the
evaluation result. `next` supplies a new value (omitted means undefined);
`retain` and `release` take no value. A scalar result is valid, but cannot be
the target of a step. Unknown names/step operations, a source named `result`,
invalid request shapes, and supplying both `source` and `unboxReturn` fail with
`ProtocolError`. Evaluation errors use the ordinary error envelope; no partial
snapshots are returned on failure.

The adapter matches `test/test-streams.js` exactly:

* Every created stream, including intermediate/output streams, starts with
  `refs = 1`, an empty listener Set, its initial value, and a disposal callback
  (a no-op for sources). `retain` increments refs; `release` decrements refs
  and calls disposal only when the count becomes zero. There is no additional
  automatic release, clamping, or prohibition on publishing after release.
* `next` assigns the value and invokes a copy of the listener Set in insertion
  order. Notifications are synchronous, not batched or deduplicated. Subscribing
  adds a listener; disposing that subscription removes it, without changing refs.
* Output events are captured inside `adapter.next` when `stream === result`,
  before dispatching listeners. No observer subscription is added. Initialization
  produces no event because `result` is not assigned until evaluation returns.

There is one snapshot after initialization and one after every completed step.
`value` is the current result-stream value, or the scalar result; `sources`
contains each source's current value, ref count, and listener count; `events`
contains all output notifications so far. Values and events are captured at
snapshot/notification time using the existing recursive encoding, so later
mutations do not rewrite earlier observations. Snapshots do not include output
or intermediate-stream counters unless the result aliases a named source.

The independently authored `streams/*` fixtures cover the five original groups
at `test/test-streams.js:33`, `:49`, `:70`, `:82`, and `:94` (and their parent at
`:32`). Direct `unboxReturn` scenarios explicitly cover the `unbox` API.
In particular, updating `a` from 2 to 3 in `a + a` emits both 5 and 6; returning
the same selected child again emits nothing. Releasing `(a + b) * c` removes
the outer subscription, but the intermediate `a + b` keeps its factory owner
reference and its subscriptions to `a` and `b`. These are compatibility
expectations, not corrective ownership rules.

Shared scenarios do not update or retain a source after its final release. The
native API rejects such operations, even though the minimal JS test adapter
does not enforce that lifecycle boundary.

Promise and nested Stream identities are not encoded by this JSON operation.
Native tests in `tests/streams-async.rs` cover them and include opt-in differential
audits against the built JS bundle. The aggregate `test:all` command runs those
audits. Mixed operands retain current JS behavior: the stream branch passes
Promise objects to the resolver without waiting, and settlement alone does not
emit a stream update.

## Named host fixture extension

Optional top-level `hostFixtures: string[]` names deterministic, per-request
host setups. Later fixture bindings override earlier ones. Unknown names
must fail, not fall back to an empty context. Explicit context keys override
fixture bindings. The Rust CLI must install the same fixture:

* `async`: `promise(value)` asynchronously returns its argument;
  `asyncDouble(number)` asynchronously doubles it; `asyncFail()` rejects with
  kind `Error` and message `async failure`. JS uses timers, not synchronous substitutes.
* `async-values`: `v1..v4` are numbers 1..4, `p1..p4` are actual asynchronous
  values resolving to 1..4, and `later(value)` asynchronously returns its argument.
* `vararg-pair`: `testFunc` is `makeVararg(['a','b'], ...)`, returning
  `{a,b,args,kwargs}` including undefined missing arguments.
* `vararg-callback`: `testFunc` is `makeVararg(['a','callback:fn'], ...)`,
  returning `{a,callbackResult:callback()}`.
* `vararg-probe`: `request.vararg.template` is passed to the real `makeVararg`.
  `request.vararg.result` projects arguments, kwargs, callback results, and
  evaluation traces through named selectors. `track`, `counter`/`inc`, and
  `probeFail` observe ordering, repeated lazy evaluation, and errors without
  putting native functions on the JSON wire.
* `source-skip`: reproduces the four nested `toStart` wrappers from
  `test/test-lisp.js`, including a special form that replaces the AST before
  the final standard-library fallback. The original input and replacement
  dates differ, so bypassing replacement cannot pass.
* `counter`: `counter()` increments a per-request counter starting at zero.
* `async-trace`: `traceAsync(label,value)` immediately records `start:LABEL`,
  then records `end:LABEL` when its asynchronous result settles. `trace()`
  returns a copy of the log. Settlement follows invocation order. This tests
  eager argument starts versus sequential awaiting without elapsed-time assertions.

The machine-readable manifest is `host-fixtures.json`.

## Portable API operation

`{"op":"api","name":"isString","args":["text"]}` calls a portable public
helper. The six predicates use their ordinary argument lists. The accessors
`$var$`, `$getvar$`, `$setvar$` accept `[context,key,value?]`. `EVAL` accepts
`[ast,context]` and top-level `options`; it does not inject STDLIB.
For `isFunction`, `binding:"counter"` with `hostFixtures:["counter"]` selects
a real host callable instead of inventing a callable from an output-only tag.

Documentation generation, data, lookup, helpers, `prepareContext`, and localization
tooling are JS/V8-only. They are not portable `api` operations; both parity
workers reject them with `ProtocolError`. `scope.json` lists the excluded APIs
and source test files. The original JS documentation tests still run unchanged.

`name:"variableAccessors"` uses top-level `context` and `steps`, each shaped
`{name:"$var$"|"$getvar$"|"$setvar$",key,value?}`. Its result is
`{values:[...stepResults],context:mutatedContext}`. This tests mutation and
undefined assignment explicitly, not merely accessor return values.

`host-special`, `host-lookup`, and `host-skip` exercise special-form raw AST,
explicit-context evaluation, dynamic variable/callable resolution, and
layered skip dispatch; their exact definitions are in `host-fixtures.json`.

These are behavioral fixtures, not arbitrary JS object interoperability.
Host APIs not reachable through these fixtures remain inventory gaps.

Three test-only `api` probes expose otherwise non-JSON observations without
adding corresponding public interpreter exports:

* `exportType` checks the `parse` export only; arbitrary JS exports are rejected.
* `calendarInvariant` evaluates `source` between two host UTC clock reads and
  checks `utc-date`, `utc-year-prefix`, `utc-week`, or `utc-extend-five` against
  independent host-calendar calculations. Either clock read may match, avoiding
  a midnight rollover race. Wrong dates return false, not a learned expectation.
* `syntaxDiagnostic` requires a real parse failure and projects its caret
  location and direct child carets as `{crs, firstCarets}`. Successful parses and
  errors without structured syntax diagnostics are rejected.

`generate-fixtures.mjs` uses the root build dependency `@babel/parser` to
extract only statically understood assertions from `test/*.js` and literal
builtin behavior examples from comments. Documentation-only test files are
excluded by scope, not counted as extraction gaps. `fixtures/extraction.json`
records omissions, source locations, and excluded files. Generated files are reproducible; rejected or stale upstream
expectations remain visible as JS failures until explicitly reviewed.
Run `node rust-impl/scripts/generate-fixtures.mjs --check` to recompute and
compare every generated fixture artifact without writing. Missing or stale
artifacts and unknown flags fail nonzero. Omit `--check` to regenerate.

The `authored:regex-gap/*` regression fixtures retain the identifiers of earlier
implementation gaps and carry independently authored JS expectations for valid
string-pattern operations. They must pass with `regress`, without expected-failure
annotations or skips. Match arrays are projected through
`slice` to preserve capture values without unrepresentable named properties.
These cover Unicode sets (`v`), variable lookbehind, repeated capture reset,
legacy case folding, and scoped modifier groups. Run these with current Node
(Node 26 supports the scoped-modifier syntax used here).

Additional regex fixtures project named groups and match indices explicitly and
check their alias identity, global/sticky behavior, empty matches, emoji patterns,
and regex-based object keys and vararg types. Original JS tests remain unchanged.

`coverage.mjs` inventories all runtime STDLIB names, their identity aliases,
public exports, source declarations, and nested existing test groups. Its
default statuses describe fixture evidence, never implementation support.
Pass `--report PATH` to distinguish observed successes/failures. `--check`
detects inventory drift; `--require-complete` fails on uncovered in-scope
names/APIs/groups. Counting declarations is not coverage.

Coverage report schema version 2 separates `sourceTestSummary.testCases` (source
`it` declarations) from `sourceTestSummary.suites` (`describe` containers).
Parents roll up all descendant cases; one passing child or a fixture linked
only to a suite cannot cover its unlinked siblings. Dynamic test declarations
can represent several executions and still count as one source declaration.
This is traceability to behavioral comparisons, not statement/branch coverage
or proof that every assertion in every source test was extracted.

Authored fixtures identify the exact source test through `covers.groups` using
`file:line` references and preserve independently specified expected results.
Unknown references fail validation. Random behavior is compared using range,
membership, and permutation invariants rather than exact random samples.
Captures, object identity, and named array properties are checked inside the
interpreter before their results cross the plain-array JSON boundary.

`scope.json` records agreed JS-only runtime names in `jsOnlyBuiltins` and
individual runtime tests in `jsOnlyTestGroups`. Each test has its file, line,
full name, and reason; stale, duplicate, blanket-suite, or contradictory fixture
links fail validation. Native JS `RegExp`, constructors, and receiver/prototype
dispatch are excluded; portable regex, collections, datetime functions, host
callbacks, and parser/deparser behavior remain in scope. Documentation-only
files remain a separate exclusion. Excluded tests are counted separately from
passes and still run in the unchanged original JavaScript suite.

`metadata.mjs` writes the deterministic alias-to-canonical-name map in
`aliases.json`; `--check` detects drift, and fixture generation refreshes it.
The registry metadata fixtures are reported separately from independently
authored value/error expectations. They check runtime function stringification
and alias identity, not documentation metadata or `prepareContext` support.

`roundtrip-fixtures.mjs` captures the source strings and formatting options
already enumerated by the three upstream round-trip suites, replacing only
their assertion helpers with capture. These cases assert three stable
parse/deparse cycles in each implementation and differential AST/rendering
equality. They have no recorded JS-output oracle and are labelled
`upstream-metamorphic-relation`, not independent expected-value assertions.
Direct-AST normalization is intentionally omitted from that extractor and tested
separately by `syntax-calendar-coverage.mjs`: both direct ASTs and both formatting
modes have independent render and normalized-AST expectations plus three stable
cycles. Round-trip fixtures with an explicit expected AST must also match that
AST; stability alone cannot override an independent expectation.

`test-js.cjs` runs the original test corpus through Mocha's programmatic API,
avoiding the old yargs CLI's incompatibility with newer Node. Run
`node --test rust-impl/scripts/test-harness.mjs` to verify transport framing,
timeouts, failed workers, tag handling, and expectation strictness.
