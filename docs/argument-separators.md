# Argument separators: `,` and `;` inside function calls

> Inside `(...)`, both `,` and `;` are accepted as argument separators.
> DAX (and Excel/Power BI) uses `;` in locales where `,` is the decimal
> separator — most of Europe, Russia, Latin America. This change makes the
> LPE parser accept either, with no impact on `;`'s role as a top-level
> statement separator.

## What changed

Before:

```
IF(a > b; 1; 2)            → LPESyntaxError: "Got ; but expected ')'"
SUM(x; y)                  → LPESyntaxError
CALCULATE(SUM(x); y = 2)   → LPESyntaxError
```

After:

```
IF(a > b; 1; 2)            → ["IF", [">", "a", "b"], 1, 2]
SUM(x; y)                  → ["SUM", "x", "y"]
CALCULATE(SUM(x); y = 2)   → ["CALCULATE", ["SUM", "x"], ["=", "y", 2]]
```

The AST is **identical** to what the comma form produces — `;` is purely a
syntactic alternative to `,` inside function calls. There's no separate
"DAX mode" flag or AST shape.

## Why this is safe

Every case that now succeeds was previously a parse error. No valid LPE
expression ever had `;` inside `(...)` — the parser rejected it with `"Got ;
but expected ')'"`. So the change is purely additive: nothing that compiled
before compiles differently now.

`;` outside `(...)` keeps its original role as a top-level statement
separator:

```
a(); b()                   → ["begin", ["a"], ["b"]]            (unchanged)
outer(inner(a; b); c)      → ["outer", ["inner", "a", "b"], "c"] (each ; resolves to its own scope)
```

The inner `;` separates `inner`'s arguments; once `inner(a; b)` finishes the
outer `;` separates `outer`'s arguments. Lexical scoping handles the rest.

## Why DAX cares

DAX is the expression language behind Power BI, Excel measures, and SSAS.
DAX inherits Excel's regional list separator: in US/UK it's `,`, in most of
Europe (`,` is the decimal separator there) it's `;`. The DAX engine
internally uses one representation and just accepts whichever the source
spells. Without this change, half the DAX corpus on the Internet wouldn't
parse in LPE — every Russian/German/French Power BI tutorial uses `;`.

## Implementation

`src/lpep.js` — the `(` infix's argument-list loop now uses a small helper:

```js
const isArgSep = (id) => id === ',' || id === ';';
```

Two checks updated: the leading-`,` "missing first arg" branch and the
post-arg separator check. `advance(",")` (which validates that the consumed
token equals `,`) is replaced with bare `advance()` — we already verified
it's a separator the line before.

The change is contained to function-call argument parsing. Tuple-prefix
`(...)`, array `[...]`, and hash/array `{...}` constructors still accept
only `,`. If a future need arises (e.g. DAX `{1; 2; 3}` table literals),
extending the same helper there is a one-line change.

## Edge cases

| Source | AST | Notes |
|---|---|---|
| `f(;)` | `["f", undefined, undefined]` | identical to `f(,)` — two missing args |
| `f(a;)` | `["f", "a", undefined]` | trailing-separator → trailing missing arg |
| `f(;a)` | `["f", undefined, "a"]` | leading-separator → leading missing arg |
| `f(a;;b)` | `["f", "a", undefined, "b"]` | double-separator → middle missing arg |
| `f(a, b; c)` | `["f", "a", "b", "c"]` | mixed `,`/`;` is allowed (ugly but consistent) |

In every case, the AST is identical to what you'd get with `,`. Mixing the
two separators in one call is technically allowed but stylistically a code
smell — pick one and stick with it.

## Tests

`test/test.js` — `describe('argument separator: ; accepted (DAX-Euro locale compat)', …)`:
- `;` produces an identical AST to `,` for several function-call shapes.
- Mixed `,`/`;` in the same call.
- Missing-arg edge cases (compared directly to the `,` equivalents).
- Regression guard: `;` between top-level statements is still a statement separator.
- Regression guard: nested calls scope `;` correctly.
