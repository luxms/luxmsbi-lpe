# `~>` — JS-style member access and method dispatch

> A separate operator from `.`, dedicated to JavaScript-prototype dispatch.
> `.` keeps its thread-first / property-access semantics unchanged.

## Motivation

LPE's `.` is a thread-first macro — `s.fn(args)` rewrites at parse time to
`fn(s, args)`. That's great for chaining LPE functions (`a.dateShift(-1, 'm').toStart('m')`),
but it means `s.charCodeAt(1)` looks up `charCodeAt` in the LPE namespace and
errors. Adding every JS String/Array method to STDLIB just to dispatch them is
silly.

`~>` is the explicit "this is a JS method on this object" operator. It
compiles to a different AST and never consults the LPE function namespace.

## Forms

| Source | Means | AST |
|---|---|---|
| `obj ~> name`         | property access (`obj.name`); function values come back bound to `obj` | `["_get_obj_meth_", obj, ['"', "name"]]` |
| `obj ~> "name"`       | same — explicit string form | `["_get_obj_meth_", obj, ['"', "name"]]` |
| `obj ~> (expr)`       | **dynamic** — `expr` is evaluated at runtime to get the key | `["_get_obj_meth_", obj, expr_ast]` |
| `obj ~> name(args)`   | call as method with `this = obj` | `["_call_obj_meth_", obj, ['"', "name"], ...args]` |

## Examples

```
"hello world" ~> charCodeAt(1)              →  101
"hello world" ~> slice(1, 4) ~> toUpperCase()  →  "ELL"

# property chain — values pass through, the final fn is bound
window ~> document ~> location ~> replace   →  <bound function>
window ~> document ~> location ~> replace("/x")  →  navigates

# dynamic key
x := 'document'
window ~> (x)                                →  window.document

# computed key
window ~> ("docu" + "ment")                  →  window.document
```

## Semantics

- **Property access** (`obj ~> name`) returns `obj[name]`. If the value is a
  function, it's bound to `obj` (so `let f = s ~> charCodeAt; f(1)` works).
  Non-function values pass through unchanged — important for chains like
  `window ~> document ~> location` where intermediate hops are objects, not
  methods.
- **Method call** (`obj ~> name(args)`) does `obj.name.apply(obj, args)` —
  preserves `this` and forwards arguments verbatim.
- **Missing properties** silently return `undefined` (JS-like). The next `~>`
  step's null-check then catches the actual error point.
- **Null/undefined receiver** throws `~> receiver is null/undefined` at the
  step where it happens — no cryptic `Cannot read properties of null` from
  somewhere downstream.

## Why a fallback model would have been wrong

We considered making `.` itself fall back to method dispatch when the LPE
name lookup fails. Two reasons it was rejected:

1. **Silent semantic drift on 9 names** that exist on both LPE STDLIB and JS
   prototypes (`concat`, `filter`, `join`, `keys`, `length`, `map`, `slice`,
   `sort`, `split`). For some, the two implementations differ subtly — LPE
   `map` handles LPE-fn objects, `Array.prototype.map` doesn't.
2. **Asymmetry between `.x` and `.x()` would persist** — fixing it properly
   means breaking thread-first chaining everywhere.

A separate operator solves both problems: the choice between thread-first and
method dispatch is at the call site, where the author knows what they meant.

## Implementation

- **Lexer** (`src/lpel.js`) — `OPSEQ['~'] = '>'` so `~>` lexes as one token.
  `~` alone (the existing regex-match operator) keeps working.
- **Evaluator** (`src/lisp.js`):
  - `_get_obj_meth_` SF — returns `obj[name]`, bound to `obj` if it's a function.
  - `_call_obj_meth_` SF — already existed (used by `invoke` macro); reused.
- **Parser** (`src/lpep.js`) — `infix("~>", 70, …)` whose led inspects the
  RHS:
  - call form (`right.value === '('`) → emit `_call_obj_meth_` form.
  - bare name (`right.arity === 'name'`) → emit `_get_obj_meth_` with `["'", name]`.
  - string literal → emit `_get_obj_meth_` with the literal as key.
  - parenthesized expression → peeked *before* parsing (because LPE's prefix
    `(` doesn't tag its result for a plain name) → emit `_get_obj_meth_` with
    the inner expression's AST as the key.

## What `~>` does *not* do

- **No property assignment.** `obj ~> name = value` is not supported. Use
  `.-(obj, "name", value)` (the underlying SF) if you really need it.
- **No optional chaining.** A null receiver throws — there's no `~>?` analog.
- **No call-after-dynamic-key.** `obj ~> (key)(args)` errors because LPE's
  call infix only allows certain shapes on its left side. Workaround:
  `f := obj ~> (key); f(args)`.

## Tests

`test/test-lisp.js` — `describe('~> JS method dispatch', …)`: 13 cases
covering call form, bound-method form, dynamic-key form, chains across plain
JS objects, error cases, and a regression guard for the existing `~`
regex-match operator.
