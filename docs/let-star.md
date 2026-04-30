# `let*` — sequential bindings

> Like `let`, but each binding's RHS sees the bindings introduced before it.
> Promise/stream-aware via `unbox`. Used as the compile target for
> [`VAR … RETURN`](./var-return.md).

## What it does

```
let*([[x, 10], [y, x * 2]], y)         →  20
let*([[a, 1], [b, a + 1], [c, b + 1]], c)  →  3
```

Compare with parallel `let`:

```
let([[x, 10], [y, x * 2]], y)          →  "x2"   (y's RHS sees no x)
```

Mirrors the conventional Scheme split between `let` (parallel) and `let*`
(sequential).

## Why a separate special form

`let` evaluates *all* bindings' RHS expressions in the outer context, then
opens one new context frame containing all of them at once. That's correct
for parallel bindings — but means `[y, x * 2]` doesn't see `x`.

`let*` walks the bindings recursively. For each one:

1. Evaluate the value in the current context.
2. **Unbox** it (so a `Promise`/stream resolves before downstream sees it).
3. Push a tiny `{[name]: resolved}` frame on top of the current context.
4. Recurse to the next binding with that extended context.

When all bindings are done, eval the body in the fully-built context.

## Why recursive (not iterative with a mutable frame)

The first version used an iterative `step(i)` closure that mutated a shared
frame. That worked, but the recursive form is closer to how `ifSF` and
`beginSF` are written elsewhere in the codebase, and — critically — it
threads `unbox` properly: a stream emitting a new value re-enters the resolve
callback and re-runs subsequent bindings + body cleanly, with no shared
mutable state in the way.

## Implementation

`src/lisp.js` (~line 418, `letStarSF`):

```js
const letStarSF = (ast, ctx, rs) => {
  let bindings = ast[0];
  if (!isArray(bindings)) throw …;
  if (isString(bindings[0]) && isArrayFunction(bindings[0])) {           // strip outer "[" wrapper
    return letStarSF([bindings.slice(1), ...ast.slice(1)], ctx, rs);
  }
  if (bindings.length > 0 && isString(bindings[0])) {                    // single-pair shape
    return letStarSF([[bindings], ...ast.slice(1)], ctx, rs);
  }
  if (bindings.length === 0) {
    return EVAL(['begin', ...ast.slice(1)], ctx, rs);
  }
  let pair = bindings[0];
  if (isArray(pair) && isString(pair[0]) && isArrayFunction(pair[0])) {  // strip "[" wrapper on pair
    pair = pair.slice(1);
  }
  const [name, valueAst] = pair;
  const value = EVAL(valueAst, ctx, rs);
  return unbox(
    [value],
    ([resolved]) => letStarSF(
      [bindings.slice(1), ...ast.slice(1)],
      [{[name]: resolved}, ctx],
      rs),
    rs?.streamAdapter);
};
```

Each recursion handles **one** transformation:
1. Strip the outer `[` array-constructor wrapper, if present.
2. Wrap a single-pair shape (`["x", 10]`) into list-of-pairs form.
3. Empty bindings → eval body.
4. Process first pair: evaluate, unbox, push a fresh frame, recurse with one fewer binding.

## Accepted binding shapes

`makeLetBindings` for `let` accepts several shapes; `let*` follows suit:

| Source / AST | Meaning |
|---|---|
| `["let*", ["[", ["[", "x", 10], ["[", "y", 20]], …]` | LPE-array-of-pairs (what the parser emits for `let*([[x,10],[y,20]], …)`) |
| `["let*", [["x", 10], ["y", 20]], …]` | bare array of pairs (no `[` wrappers) |
| `["let*", ["[", "x", 10], …]` | single-pair, with `[` wrapper |
| `["let*", ["x", 10], …]` | single-pair, bare |

All four resolve to the same evaluation.

## Promise / stream semantics

If a binding's value is a `Promise`, `unbox` waits for it before the next
recursion runs. So the next binding's RHS sees the *resolved* value, not the
Promise.

```js
const ctx = { p2: Promise.resolve(2) };
eval_lpe('VAR x = p2\nVAR y = x * 10\nRETURN y', ctx)   // returns Promise<20>
```

If a binding's value is a stream, the stream's resolve callback re-runs the
remaining bindings + body each time the stream emits — same composition rule
as `ifSF` and `beginSF`.

## Tests

`test/test-lisp.js`:
- `describe('let* (sequential bindings, …)', …)` — 3 cases for the SF directly.
- `describe('VAR ... RETURN', …)` — covers the parser side end-to-end.

`test/test-async.js` — `describe('VAR ... RETURN with promises', …)` covers
the unboxed path.
