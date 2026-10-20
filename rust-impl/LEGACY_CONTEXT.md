# Bounded 1.6.7 context profile

This opt-in profile covers selected context behavior from `@luxms/lpe` 1.6.7.
It is not a full evaluator replacement, a JavaScript fallback, or a change to
the default native profile. The implementation is based on
`e642db3f0be756bb75da687193551ed148371ddb`.

## API

```rust,ignore
pub fn set_legacy_context(&mut self, enabled: bool);

pub fn assign_async<'a>(
    &'a mut self,
    env: EnvId,
    name: &'a str,
    value: Value,
    options: &'a EvalOptions,
) -> LocalBoxFuture<'a, Result<Value>>;
```

- `Runtime::new()` and `Runtime::default()` start with the profile disabled.
- Set the profile before evaluation. Task facades copy it; changing it does not
  retroactively reconfigure already-created asynchronous or reactive tasks.
- The `value` argument is an already-evaluated RHS. Do not evaluate it twice or
  preflight the assignment with a lookup: context getters can have effects.
- `assign_async` uses the existing execution budget, cancellation checks, and
  call limits. It roots the RHS and environment while callbacks run. Recursive
  assignment descent is also bounded by `EvalOptions::max_depth`.
- Like `eval_in` and `call_with_options`, direct `assign_async` is a low-level
  operation; it does not start or reset a top-level budget. `eval_async` supplies
  the outer cancellation check while a host future is pending.
- With the profile disabled, `assign_async` follows current JS function-context
  assignment; see [API.md](API.md#assignment-and-call-dispatch). The synchronous
  `assign` remains an object-only embedding helper.
  The synchronous `assign` itself never opts into legacy behavior.

## Contract

| Operation | Legacy behavior |
| --- | --- |
| Lookup of own `Undefined` | Continue to parent frames, including undefined or omitted closure parameters. Do not remove the slot. |
| Lookup of null, false, zero | Stop at that binding; these are not missing. |
| Bare nonliteral callable expression | Return its identifier string, including with `resolveString: false`. |
| Callable result of a legacy `fn` body | Return the function itself; do not invoke it. This result-call policy is captured when the closure is created. |
| Explicit `resolve`, `lookup`, `lookup_async` | Return the actual callable, not its identifier. Legacy lookup does not filter library callables using `disallowLibFunctionsGetting`. |
| Defined RHS, existing binding | Write the matched frame; return its assigned value or function setter's result. |
| Defined RHS, missing binding | Write the head frame and return `Undefined`, ignoring a function setter's result. |
| Undefined or omitted RHS | Read the binding; do not write. A missing name returns `Undefined`, independent of string resolution. |
| Direct function context write | Evaluate RHS, call getter once, then call setter. |
| Nested function context write | A matched parent is re-entered for writing, reproducing the additional getter in nested JS contexts. |
| Function getter/setter options during assignment | The third callback argument is `{}`, as in 1.6.7. Native execution limits remain active. |

Getter and setter errors propagate. A rejected RHS starts no getter, and a
rejected getter starts no setter. Changes made by the RHS affect subsequent
binding selection. Nested getter results may change between probes; the second
result determines the nested write's return behavior.

Native hooks keep their existing authoritative-mask convention:
`Some(Value::Undefined)` stops lookup; `None` falls through. This is deliberately
different from undefined own properties and from JS `$VAR$` hooks. It allows an
embedding to mask native-only names without exposing a library fallback.

Use `lookup_async` for function-backed environments; synchronous `lookup` does
not execute function contexts. Existing Array/Object/Date literal-callable
handling is preserved, not expanded into JavaScript host constructors.

## Closure result policy

The pinned JS 1.7.3 implementation deliberately routes `fn` through `->fn`:
`src/context/objects.js` delegates at the end of `fn`, and `->fn` invokes a
callable body result with the outer call's arguments. Original JS 1.6.7 differs:
its `fn` directly returns `EVAL(body, ...)`, while `->fn`, `toFn`, `defFn`, `=>`,
and `lambda` still perform the automatic call. This is a versioned contract,
not a suspected JS bug.

| Constructor | Default native / JS 1.7.3 | Legacy profile / JS 1.6.7 |
| --- | --- | --- |
| `fn` | Auto-call a callable body result | Return the callable unchanged |
| `->fn`, `toFn`, `defFn`, `=>`, `lambda` | Auto-call | Auto-call |
| Host API `Runtime::closure` | Existing auto-call behavior | Existing auto-call behavior |

For `[["fn", [], ["fn", [], 7]]]`, the default profile returns 7; legacy returns
a callable that produces 7 only when explicitly invoked. This also prevents
premature effects and exceptions in the returned function. Ordinary scalar
results and errors from the outer body retain their existing handling.

The private per-closure `call_result` flag records the constructor's policy.
Changing `set_legacy_context` after creation does not change that flag in either
direction. This does not freeze every lookup/profile behavior of an existing
closure; the existing runtime/task profile rules still apply. Captured options,
environment rooting, cancellation, and budgets remain on the existing paths.
There is no new public API, macro behavior, V8 facility, or serialization marker.

`fixtures/closure-return.json` records 150 source cases and 300 profile outcomes
from the unchanged 1.6.7 bundle/reference and this checkout's normal 1.7.3 build.
It includes aliases, scopes, explicit later calls, errors, effect order,
argument evaluation, returned host/library functions, and nested returns in
both string-resolution modes. JS error strings are retained; only the extra
`Error: ` prefix on noncallable messages is normalized to match native messages.
Function and undefined values use the existing fixture tags, not SQL JSONB.

Regenerate/check with explicit read-only legacy artifacts, from `rust-impl`:

```sh
node scripts/closure-return-fixtures.mjs \
  --bundle="$LPE_SQL_BUNDLE" \
  --reference="$LPE_167_BUNDLE" \
  --version-file="$LPE_167_PACKAGE_JSON"
```

Add `--write` only to refresh after reviewing source changes. Normal tests need
no external legacy checkout: `tests/closure-return.rs` replays both profiles,
and `scripts/closure-return-js.test.cjs` verifies the 1.7.3 side as part of
`npm run test:all`. Eight focused Rust tests also cover profile toggling, host
API compatibility, GC-retained lexical scope, deferred errors/effects, budget
enforcement, suspended task propagation, and cancellation. This follow-up
does not claim complete historical closure, macro, Promise/Stream, or evaluator
compatibility, and does not change the existing remaining boundaries below.

## Library policy

Legacy variable writes to frames marked as libraries fail with kind
`Unsupported` and message `Legacy assignment cannot mutate library binding NAME`.
The profile neither changes a library binding nor silently shadows it in a user
frame. Tests cover `add`, `null`, and synthesized `Hashmap`, a subsequent normal
library call, an undefined read sentinel, and an explicit user shadow.

This is an intentional difference: the original JS permits
`["list", ["let", [], ["def", "add", 8]], "add"]` and returns `[8, 8]`.
The checked-in fixture records that evidence separately from passing parity
cases. An already-present user shadow remains writable. This guard applies to
variable assignment, not a deep immutability policy for objects reachable from
library values or a restriction on low-level host mutation APIs.

## Streams and default semantics

The original 1.6.7 `def` implementation evaluates the RHS and passes it directly
to `$var$`; it does not call `unbox`. The same holds for variable `assign`/`:=`.
Three supplemental original-bundle probes confirm that each stores and returns
the source stream itself for an existing binding, without retain/subscription
effects. The native legacy profile follows that identity behavior.

The default native `def` path remains unchanged: it unboxes the stream and
updates the scalar binding on emissions. Default variable `assign`/`:=` still
store the stream itself. The focused regression checks both profiles, stream
identity, updates, references, and listeners. Property assignment is unchanged.
This is not a claim of 1.6.7 parity for every Promise/Stream/context combination.

## Evidence and verification

`fixtures/legacy-context.json` contains 218 passing observations: 161 AST cases
and 57 getter/setter effect-order cases. It also records three supplemental
stream-assignment probes and the explicit library/list boundaries. Both
unmodified original artifacts must agree before the generator writes anything:

| Artifact | SHA-256 |
| --- | --- |
| lpe-sql `dist/lpe.js` | `ce5658d90caea7715d59ba44d86dad1263693e9147ca7c8c9781573dc9ac4ad2` |
| `@luxms/lpe` 1.6.7 `dist/lpe.js` | `4b1df77caf5257447969c734f2702aa125e7b7c8030cf42cfea1e8eb269abbb9` |

In the recorded dependency artifact, `$var$` begins at line 6657, `def` at
7109, variable `:=` ends at 7557, and bare-name EVAL lookup is near 8763.
Sources are executed without rewrites. Functions and undefined results use
portable tagged values; numbers compare as JS Numbers, not JSON storage types.
Normal Rust tests load only this fixture and need no JS checkout, Node, or
absolute external path.

To verify the fixture with explicitly supplied artifacts, from `rust-impl`:

```sh
node scripts/legacy-context-fixtures.mjs \
  --bundle="$LPE_SQL_BUNDLE" \
  --reference="$LPE_167_BUNDLE" \
  --version-file="$LPE_167_PACKAGE_JSON"
```

Add `--write` only to intentionally regenerate. The version file must report
1.6.7. The original 12 focused tests are retained; a thirteenth tests the stream
distinction. Native tests additionally exercise suspended RHS/getter/setter
order, errors, cancellation, GC roots, budget continuity, and bounded descent.

Validation commands:

```sh
cargo test --locked --quiet
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
```

The normal suite passed 279 tests with five pre-existing optional JS audits
ignored. Those audits require Node and/or a current upstream JS build; they are
not part of the portable 1.6.7 fixture tests.

## Adapter integration

1. In the embedding's runtime factory, immediately after `Runtime::new()`, call
   `runtime.set_legacy_context(legacy)`. Leave other native consumers false.
2. In custom variable `def`/`assign`/`:=` forms, preserve the existing RHS
   evaluation, target coercion, and separate property-assignment branch.
   Replace the existence lookup, undefined branch, synchronous assignment, and
   manual return selection with:

   ```rust,ignore
   runtime.assign_async(env, &name, value, &options).await
   ```

3. Do not retain the preliminary lookup: it adds an observable getter call and
   can select a different frame. Do not pass callable bindings through bare
   expression evaluation when raw lookup is needed.
4. Keep adapter-specific aliases, name masks, JSON conversion, and old binding
   syntax support. This profile does not replace those adapters. Use real
   environment layers when preserving a context chain; `set_context` retains its
   existing flattening behavior for JSON context arrays.
5. Combine the runtime-control changes at `Runtime` fields, `new`, and `task`
   without dropping either profile/control propagation. No `EvalOptions` fields,
   dependencies, lockfile, or regex code changed here. Re-run the combined Rust
   suites and the embedding's native/SQL parity cohorts after integration.

No PostgreSQL integration or installed-SQL results are claimed by this worktree.
The adapter and runtime-controls changes are reviewed and integrated separately.

## Remaining boundaries

- Leading `:=` inside `list` still differs. With an empty user context,
  `["list", [":=", "x", 8], "x"]` returns `[[":=", "x", 8], "x"]` in
  original JS, but `[undefined, 8]` here. A regression records both results;
  it is not counted as a parity pass.
- Library mutation remains unsupported as described above.
- JS macro dispatch, dynamic `sf:` metadata/wrapping, custom literal-function
  markers, host constructors, and host objects are not implemented by this
  profile. Existing native facilities remain as before.
- The tested context topology is ordinary lexical/object/function layering.
  Arbitrary host-built environment DAGs and full JS context-array identity are
  not certified; this profile does not change the context-construction APIs.
- General getter option-object identity, arbitrary async JS getter Promise
  identity, and all mixed reactive cases are not certified. The async tests
  establish native suspension/order/resource contracts, not a new JS engine.

These boundaries must not be relabeled as full replacement coverage.
