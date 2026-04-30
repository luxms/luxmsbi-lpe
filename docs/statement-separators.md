# Statement separators

> Top-level statements must be separated by `;` or `\n`. Whitespace adjacency is
> a parse error.

## What changed

Before:

```
a() b()      → parses as ["begin", ["a"], ["b"]]   ← silent thread-firsting
a()b()       → parses as ["begin", ["a"], ["b"]]   ← even worse, no whitespace
```

After:

```
a() b()      → LPESyntaxError: "Statement separator expected (';' or newline)."
a()b()       → LPESyntaxError: same
a(); b()     → ["begin", ["a"], ["b"]]              (still works)
a()
b()          → ["begin", ["a"], ["b"]]              (still works)
```

## Why this matters

Whitespace adjacency was making typos invisible. Two function calls without
a separator have no useful interpretation — they were getting bundled into a
`begin` block by accident. Better to force the user to be explicit.

## How it works

Two-part fix:

1. **Lexer** (`src/lpel.js:182`) — emit an `LF` token for `\n` instead of
   discarding it like other whitespace.
2. **Parser** (`src/lpep.js:202-204`) — `statements()` requires a separator
   token (`;` or `\n`) between consecutive non-end statements, otherwise raises
   `LPESyntaxError("Statement separator expected (';' or newline).")`.

The expression parser already skips `LF` tokens at the start of an expression,
so newlines inside an expression (`a +\nb`) keep working — `\n` only acts as
a separator between *top-level* statements.

## Edge cases

| Source | Result |
|---|---|
| `\na()\nb()\n` (leading/trailing) | `["begin", ["a"], ["b"]]` ✓ |
| `a()\n\nb()` (blank lines) | `["begin", ["a"], ["b"]]` ✓ |
| `a();\nb()` (mixed `;` and `\n`) | `["begin", ["a"], ["b"]]` ✓ |
| `a +\nb` (newline inside expression) | `["+", "a", "b"]` ✓ |
| empty string / only whitespace | `null` (unchanged) |

## Tests

`test/test.js` — `describe('statement separators', …)` covers `;`, `\n`,
mixed forms, leading/trailing whitespace, and the rejection cases.
