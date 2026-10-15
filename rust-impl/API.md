# Native API mapping

The Rust crate implements LPE behavior with native values and callbacks. It is
not a JavaScript object-model compatibility layer. The current differential
evidence and remaining coverage gaps are recorded in `coverage.json`.

| JavaScript entry point | Rust entry point |
| --- | --- |
| `parse` | `parse`, `parser::parse_with_options` |
| `deparse` | `deparse`, `deparser::deparse_with_options` |
| `eval_lpe` | `Runtime::eval`, `eval_with_options` |
| `eval_lisp` | `Runtime::eval_ast`, `eval_async` |
| `EVAL` | `Runtime::eval_in` with an explicit environment |
| `STDLIB` | Standard-library environment installed by `Runtime::new` |
| `$getvar$`, `$setvar$`, `$var$` | `lookup`, `lookup_async`, `assign`, `undefine` |
| `makeSF` | `register_special` with raw AST arguments |
| `makeVararg` | `register_vararg`, `register_vararg_host` |
| `makeSkipForm` | `skip_form` |
| `$VAR$` | `set_lookup_hook`, function-backed environments |
| `$IS_LIB$` | `mark_library` |
| `unbox` | `Runtime::unbox`, `StreamContext`, `StreamResolver` |
| Stream adapter protocol | `create_stream`, `stream_value`, `stream_next`, `stream_subscribe`, `stream_retain`, `stream_release` |
| `isString`, `isArray`, `isHash`, `isFunction`, `isNumber`, `isNumberLike` | Standard-library functions through `call_value` or expressions |
| `LPESyntaxError` | `Error` with `kind`/`message`; opt-in `parser::parse_with_diagnostics` for token/caret metadata |

Parser options and evaluator options are separate. For logical-grammar input,
call `parser::parse_with_options` first, then evaluate the returned AST. A
Rust `EvalOptions::default()` matches omitted JavaScript evaluation options;
`EvalOptions::from_json` preserves the different JS behavior of explicitly
passing an empty options object.

`parser::parse_with_diagnostics(source, options)` preserves the ordinary parse
result and error while returning `ParseError { error, diagnostic }` on failure.
The optional JSON diagnostic includes token spans, carets (`crs`), and direct
grouping/tuple/array children (`first`). End-of-input has no token span or caret;
lexer/resource errors may have no diagnostic. This is not a reconstruction of
the complete JS error tree or all diagnostic wording. UTF-16 span indices match
JS internally; source and JSON input/output remain UTF-8. Ordinary `parse` and
`parse_with_options` retain their existing error interface.

## Host functions

- `register`: synchronous callback returning an LPE value or error.
- `register_async`: callback returning a detached local future.
- `register_host`: callback with runtime access while constructing a detached
  future. Allocate any returned objects before returning the future.
- `register_special`: callback with raw AST arguments, context, options, and
  evaluator access. The callback controls which expressions are evaluated.
- `register_vararg_host`: template-based positional/named/typed argument
  processing followed by a callback with runtime access.

Ordinary asynchronous evaluation and reactive streams are in scope.
The core uses local futures and does not require Tokio or an implicit executor.
Host callbacks may perform effects, but the core has no database, filesystem,
process-execution, or network integration. Output functions append to
`Runtime::output`, which the host may consume.

## Streams

`create_stream` returns `Value::Stream` with one creator reference. Hosts push
updates through `stream_next` or `stream_next_async`; `stream_value` reads the
current value. `stream_subscribe` returns an explicit `StreamSubscription` for
`stream_unsubscribe`. `stream_subscribe_host` also passes an immutable runtime
for inspecting compound values. Unsubscribing is idempotent; subscriptions do
not retain their source. `stream_retain` and `stream_release` manage ownership;
the final release detaches dependencies and invokes the optional disposer from
`create_stream_with_dispose`. Disposers also run when the owning runtime drops.
`stream_stats` exposes reference/listener counts and disposal state.

`unbox` lifts a `StreamResolver` over input streams. `StreamContext` roots the
lexical environment, AST literals (`with_asts`) and captured values (`with_values`)
for GC. Never capture a Runtime inside a resolver. Input occurrences each get
their own subscription, so `a+a` emits intermediate values on one update, as JS
does. The same selected child is reused without duplicate retains or emissions.

Stream payloads can be ordinary values, `Value::Promise`, or `Value::Stream`.
Unboxing streams does not await Promise arguments or results. It forwards a
selected child's values without recursively flattening their types. Promise-only
unboxing awaits arguments without a second Stream-detection pass. Final top-level
evaluation awaits a returned Promise, but never implicitly reads a returned
Stream. Use `resolve_value` explicitly to await a Promise-valued payload. Rust
futures require host polling; there is no background scheduler.

This preserves the current JS limitation for mixed operands: `stream() + promise()`
with current stream value `2` produces `"2[object Promise]"` immediately, even
when that Promise later resolves to `3`. Promise settlement alone does not
recompute the stream. Only the Promise-only path waits before calling the resolver.

The resolver's Rust future runs interpreter work; a language-visible asynchronous
result must be represented as `Value::Promise`, not implicitly awaited by the
resolver. Registered async callbacks preserve that representation once a stream
has been created. `call_value` applies callbacks directly; expression evaluation
and explicit `unbox` provide reactive argument handling.

Creation references are not implicitly transferred. Nested computed streams can
therefore remain subscribed after an outer release, matching the JS baseline.
Use a bounded runtime lifetime to dispose such graphs; GC traces live subscription
edges and cannot collect an active graph still reachable from a global source.
Initial construction failures do roll back retains. Disposed-stream operations
and direct JSON serialization of stream handles fail explicitly.
Host-specific stream object layouts are not reproduced: `toStr` uses ordinary
object coercion, while `str`/`jsonStringify` cannot serialize nested stream handles.

## Values and interchange

`Ast` is JSON-shaped syntax. `Value` additionally represents undefined, special
numbers, functions, dates, promises, and shared mutable collections. Values
referencing an arena belong to exactly one runtime; cloning a handle preserves
identity, not a deep copy. Hosts must not move handles between runtimes.

JSON interchange uses UTF-8. The test protocol reserves `$lpe` tagged objects
for values not representable in JSON, such as undefined and non-finite numbers.
These tagged objects are not ordinary application objects in that protocol.
Rust callers can construct ordinary objects directly through `Runtime::object`.

Cycles are supported in runtime graphs but cannot be serialized as JSON.
Serialization returns an error for cycles. Collection is explicit: retain
external values by passing them as roots to `collect_garbage`. Native closure
captures and pending futures are opaque to the tracer and require host roots.

## Regular expressions

String patterns in `re_match`, `words`, `update_in`, and vararg type matching
use the pure-Rust `regress` ECMAScript engine, without V8. `re_match` validates
flags and preserves global/sticky matching, captures, named groups, and `d`
indices. Unicode `u`/`v` matching and legacy code-unit matching are distinct;
the public input/output contract remains UTF-8.

Without opt-in controls, the historical checks remain between matches.
`RuntimeControls` adds same-thread host polling and deterministic work accounting
inside UTF-16/UCS-2 searches, plus bounded compiler input and compiler-input
polling. This is cooperative, not a hard time or heap quota. See
[Runtime controls](RUNTIME-CONTROLS.md) for the API, accounting coverage and gaps.

## Explicit exclusions

- Arbitrary JavaScript execution, prototypes, reflection, and native host objects.
- Native JavaScript `RegExp` objects. Portable string-pattern operations remain
  in scope and must be tested independently of this exclusion.
- Documentation APIs and data remain JS/V8-only: `makeDoc`,
  `makeDocForContextes`, `prepareContext`, `DOC`, `LOCALE_DOC`, `DOC_WARNINGS`,
  and `findDoc`. Rust provides neither these exports nor documentation metadata.
- Documentation helpers `generateSimpleHash` and `selectPerfectFunctionName`,
  and localization tooling `localizationUpdate`/`LOCALIZATION_OPTIONS`.
- Isolated surrogate input/output, which is outside the UTF-8 contract.

The JS-only runtime surface is specific, not a blanket exclusion of objects or
regular expressions:

| JS-only surface | Portable Rust behavior retained |
| --- | --- |
| `RegExp()` objects and native `.test()`/`.exec()` methods | String patterns in `re_match`, `words`, `update_in`, and vararg types, using `regress` |
| JS `new`, native `Array`/`Object`/`Date` constructors and prototypes | LPE arrays, hashes, tuples, dates, conversions, and datetime functions |
| `invoke`, `_call_obj_meth_`, `_get_obj_meth_`, and `~>` receiver dispatch with JS `this` binding | LPE member access, assignment, registered Rust callbacks, and parsing/deparsing that syntax |
| Native `console`/`JSON` host objects and arbitrary JS execution/reflection | Portable JSON functions and LPE AST evaluation (`eval`, `eval_ast`, `eval_lpe`, `rep`) |

`fixtures/scope.json` lists excluded runtime names and reviewed source-test
declarations with reasons. The coverage checker validates each runtime test's
file, line, and full name; a moved or renamed exclusion fails validation.
Only runtime tests are excluded: parser tests in the same suite remain active.
Documentation-only files are excluded separately. All original JavaScript tests
still run, including JS-only cases; an exclusion is never counted as a Rust pass.

Runtime behavior, regex, or diagnostic differences are implementation gaps, not additional
scope exclusions. See the coverage inventory and regression tests before
treating the implementation as a drop-in replacement.
