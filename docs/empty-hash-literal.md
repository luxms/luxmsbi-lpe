# `{=}` empty-hash literal

> The empty-hash literal. Distinct from `{}` (empty array). Compiles to
> `["hash"]` and uses the new `hash(...)` STDLIB function.

## The problem

LPE's `{...}` operator does double duty:

| Source | AST | Value |
|---|---|---|
| `{a=1}` | `["vector", ["=", "a", 1]]` | `{a: 1}` (hash) |
| `{1, 2}` | `["vector", 1, 2]` | `[1, 2]` (array) |
| `{a=1, 2}` | `["vector", ["=", "a", 1], 2]` | `[2]` with side-property `a:1` |
| `{}` | `["vector"]` | `[]` (empty **array**) |

The `vector` builtin decides between hash, array, and hybrid based on whether
any kwargs are present. With no args at all, it defaults to an empty array —
**there is no source-level way to construct an empty hash.**

## The fix

Two pieces:

1. **A `hash(...kwargs)` STDLIB builtin** that always returns its kwargs as a
   hashmap (and `hash()` returns `{}`).
2. **Parser sugar:** the prefix `{` recognizes the literal three-token
   sequence `{ = }` and emits `["hash"]` directly.

`{}` stays an empty array — no behavior change there.

## Forms

```
{=}                  →  ["hash"]                          →  {}
{}                   →  ["vector"]                        →  []
{a = 1}              →  ["vector", ["=", "a", 1]]         →  {a: 1}    (unchanged)
{1, 2}               →  ["vector", 1, 2]                  →  [1, 2]    (unchanged)
hash()               →  ["hash"]                          →  {}        (explicit form)
hash(a = 1, b = 2)   →  ["hash", ["=","a",1], ["=","b",2]] →  {a:1,b:2}
```

`{=}` is *just sugar* for `hash()` — same AST, same evaluation. Anyone
consuming the AST (lpe-sql, deparse, the future Blockly editor) only needs to
recognize one form: `["hash", ...]`.

## Why `{=}` and not, say, `{:}` or `{,}`

`=` is what LPE uses inside `{...}` to introduce kwargs (`{a=1}`). `{=}`
reads as "the kwargs-only form, with no kwargs" — internally consistent.
Other candidates (`{:}`, `{,}`) would have introduced new tokens that only
mean something in this exact spot.

## Implementation

- **Parser** (`src/lpep.js:763-771`) — at the top of the `prefix('{', …)`
  handler, peek for `{=}`:

  ```js
  if (m_token.value === '=' && m_tokens[m_token_nr]?.value === '}') {
    advance();   // past =
    advance('}');
    this.arity = "unary";
    this.sexpr = ["hash"];
    return this;
  }
  ```

  The peek (`m_tokens[m_token_nr]`) is direct token-stream access — necessary
  because by the time `expression(0)` would parse `=`, the `=` symbol's `nud`
  has already errored ("Undefined").

- **Evaluator** (`src/lisp.js`, near `vector`) — `hash` is a `makeVararg`
  that returns `kwargs` directly:

  ```js
  'hash': makeVararg([], (args, kwargs) => {
    return kwargs;
  })
  ```

  Positional args are ignored — for mixed structures (`{a=1, 2}`) `vector` is
  still the right tool.

## Tests

`test/test-lisp.js` — `describe('hash and {=} empty-hash literal', …)`:
- `{=}` produces `{}` (and is not an array).
- `{}` still produces `[]` (regression guard).
- `{=}` parses to `["hash"]`.
- `hash()` and `hash(a=1, b=2)` work as expected.
- Existing `{a=1}`, `{1,2}`, `{a=1, 2}` shapes are untouched (regression guard).
