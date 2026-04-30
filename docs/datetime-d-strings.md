# Datetime functions and D-tagged strings

> All public datetime functions now accept the D-tagged string AST shape
> `["'", "2024-01-15", "D"]` as input, not just plain strings.

## Background — what is a D-string?

LPE-side BI configs sometimes need to mark a date literal so the SQL builder
can emit Oracle-friendly `DATE 'YYYY-MM-DD'` literals (Oracle rejects bare
strings in date comparisons). The syntax is:

```
date >= D'2024-01-15'
```

The parser produces an AST node with a third "tag" slot:

```
"hello"           → ['"', "hello"]              (plain double-quoted)
'hello'           → ["'", "hello"]              (plain single-quoted)
D'2024-01-15'     → ["'", "2024-01-15", "D"]   (D-tagged date)
```

## The bug we fixed

When a D-tagged AST array reaches a JS function as a *value* (e.g., bound to
a context variable), `dateShift` and `extend` mistakenly treated it as a
`[start, end]` date pair (their `Array.isArray(start)` branch):

```js
const ctx = { d: ["'", "2024-01-15", "D"] };

eval_lisp(['dateShift', 'd', 5, ["'", 'd']], ctx)
// Old:  ["1001-01-03", "2024-01-20"]   ← junk: dateShift("'", 5, 'd') and dateShift("2024-01-15", 5, 'd')
// New:  "2024-01-20"                   ← correct
```

When does a D-tagged AST end up as a context value? Common path: web client
parses a saved filter (`date >= D'2024-01-15'`), the resulting AST is sent to
the server, the server stuffs values into a context for `eval_lisp`. Anything
that crossed that boundary as a value-typed AST instead of a fully-evaluated
string would hit the bug.

## Why `dateShift` and `extend` and not the rest

The other datetime functions (`toStart`, `toEnd`, `bound`, `year`, `qoty`,
`moty`, `isom`, …) all funnel through `getRawPeriod`, which strips
non-digits:

```js
function getRawPeriod(period = '') {
  const p = String(period);
  return p.replace(/[^0-9]/g, '').slice(0, 8);
}
```

`String(["'", "2024-01-15", "D"])` is `"',2024-01-15,D"`; strip non-digits
and slice → `"20240115"`. Accidentally correct.

`dateShift` and `extend` both have an `Array.isArray(start)` check **before**
calling `getRawPeriod` — so the D-tag array hit the `[start, end]` branch
before the strip-non-digits accident could rescue it.

## The fix

Single helper at the top of `src/lib/datetime.js`:

```js
function unwrapQuotedString(v) {
  if (Array.isArray(v) && (v[0] === "'" || v[0] === '"') && typeof v[1] === 'string') {
    return v[1];
  }
  return v;
}
```

Detects the LPE quoted-string AST shape unambiguously. A real `[start, end]`
date pair starts with a date string like `"2024-01-01"` — its first element
is *never* `"'"` or `"\""`, so the check can't misfire.

Applied at the entry of every public datetime function — to both date and
unit args:

- `dateShift`, `toStart`, `toEnd`, `bound`, `extend`
- `year`, `hoty`, `qoty`, `moty`, `woty`, `doty`

(The `iso*` functions chain through these, so they're covered transitively.)

## What works now

| Path | Source | Result |
|---|---|---|
| Via `parse` | `dateShift(D'2024-01-15', 5, 'd')` | `"2024-01-20"` (always worked — the `'` SF unwraps before fn sees it) |
| Via context (was broken) | `eval_lisp(['dateShift', 'd', 5, ["'", 'd']], { d: ["'", "2024-01-15", "D"] })` | `"2024-01-20"` |
| Plain string in context | `eval_lisp(..., { d: '2024-01-15' })` | `"2024-01-20"` |
| Real `[start, end]` pair (regression guard) | `eval_lisp(..., { r: ['2024-01-01', '2024-01-31'] })` | `["2024-02-01", "2024-02-29"]` |

## Tests

`test/test-datetime.js` — `describe('Datetime functions accept D-tagged strings', …)`:
- 4 via-parse tests (sanity).
- 6 via-context tests (the actual bug).
- 2 regression guards that legitimate `[start, end]` pairs are still treated
  as ranges, not unwrapped.

## Note on docstrings

The `unwrapQuotedString` calls were placed *below* the JSDoc-style docstrings
in each function (which is where source comments are extracted from for the
localization hash check). So no docstring text changed → no localization
hashes drift → no manual `localization.js` updates required. Keep this
pattern when fixing future bugs in documented STDLIB functions.
