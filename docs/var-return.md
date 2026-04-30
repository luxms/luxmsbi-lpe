# `VAR … RETURN`

> DAX-style block syntax for sequential local bindings. Compiles to `let*`.

## Syntax

```
VAR x = 10
VAR y = x * 2
RETURN x + y
```

`VAR` and `RETURN` are reserved keywords (uppercase only). Both `=` and `:=`
are accepted as the binding operator. Bindings can be separated by `\n` or `;`.

## Semantics

Each `VAR` binding is evaluated **in order**, and each binding sees the
previous ones. This is the key difference from LPE's existing `let`:

```
let([[x, 10], [y, x + 5]], y)        →  "x5"   (parallel — y sees no x)

VAR x = 10
VAR y = x + 5
RETURN y                              →  15    (sequential — y sees x = 10)
```

That's why the compile target is `let*`, not `let`. See
[`let*` sequential bindings](./let-star.md) for the runtime side.

## AST

```
VAR x = 10
VAR y = x * 2
RETURN x + y
```

parses to:

```json
["let*",
  ["[",
    ["[", "x", 10],
    ["[", "y", ["*", "x", 2]]],
  ["+", "x", "y"]]
```

The bindings list uses LPE's array-constructor shape (`["[", ...]`), matching
the format used by `let`. The body is a single expression — to emit multiple
statements use `begin(...)` (or just multiple expressions to `let*` directly,
which it splices into a `begin`).

## Where it works

`VAR` is registered as a *prefix* operator in the parser, so it works at any
expression position — top-level **and** nested:

```
top-level:
  VAR x = 5
  RETURN x * 3                                   →  15

nested in expression:
  1 + (VAR x = 5
       RETURN x * 3)                             →  16

inside another VAR's body — fine, because nested  let* shadows correctly:
  VAR a = 1
  RETURN (VAR a = 100
          RETURN a + 1)                          →  101
```

## Errors

| Source | Message |
|---|---|
| `RETURN x` | `RETURN without preceding VAR.` |
| `VAR x = 10` (no `RETURN`) | `Expected VAR or RETURN.` |
| `VAR x 10\nRETURN x` (no `=`) | `Expected '=' or ':=' after VAR x.` |
| `VAR = 10\nRETURN 1` (no name) | `Variable name expected after VAR.` |

## Implementation

- **Parser** (`src/lpep.js`):
  - `advance()` routes `VAR` and `RETURN` names to the symbol table (alongside
    `or`/`and`/`not`/etc.) so they hit the prefix definition rather than being
    treated as regular names.
  - `prefix("VAR", …)` parses `name (= | :=) expr` repeatedly, separated by
    `\n` or `;`, until it hits `RETURN`, then parses one body expression.
  - `symbol("RETURN").nud` errors out — catches stray `RETURN` outside a `VAR`
    block.

- **Evaluator** — handled by `let*` (see its page).

## Tests

`test/test-lisp.js` — `describe('VAR ... RETURN', …)`:
- 4 parse-shape tests (single VAR, multiple, `;` separator, `:=` operator).
- 5 eval tests covering sequential semantics and nesting.
- 4 error cases.

Plus `test/test-async.js` — `describe('VAR ... RETURN with promises', …)`
covers the unboxed/streaming path.
