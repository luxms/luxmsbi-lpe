# Comments: `//`, `--`, `/* */`

> LPE accepts three comment styles: `//` (existing JS-style), `--` (SQL/DAX
> line), and `/* */` (block). Block comments may span multiple lines. The
> `--` form has one subtlety: it requires whitespace before it, so existing
> arithmetic like `1--2` keeps working.

## Syntax

```
1 + 2  // line comment to end of line       (existing — JS/C style)
1 + 2  -- line comment to end of line       (NEW — DAX/SQL style)
1 + /* block comment */ 2                   (NEW — DAX/JS/C style)
1 /* multi
     line
     block */ + 2                           (block comments span newlines)
```

A comment counts as whitespace for the parser — it doesn't introduce a token,
doesn't break a statement, doesn't end an expression. So:

```
1 + -- DAX comment
    2                  →   ["+", 1, 2]      (the + binds across the comment)

x  -- statement 1
y                      →   ["begin", "x", "y"]   (the \n still terminates the statement)
```

## Why `--` requires whitespace before it

DAX and SQL both treat `--` as "always a comment, no exceptions." But LPE
already gives meaning to `1--2` — it parses as `1 - (-2) = 3` (subtract
a negated literal). Treating `--` as a comment unconditionally would silently
break every expression that subtracts a negative.

The compromise: `--` is a comment **only when preceded by whitespace or at
the start of input**. So:

| Source | Meaning |
|---|---|
| `1 -- comment` | `1`, then comment (DAX-style) |
| `-- top of file` | comment from start |
| `1--2` | `1 - (-2)` (LPE arithmetic, unchanged) |
| `a--b` | `a - (-b)` (LPE arithmetic, unchanged) |
| `f() -- comment` | `f()`, then comment (the `)` is followed by space) |

If you want a comment with no leading space, use `//` or `/* */` instead —
they have no such ambiguity. This rule is what some SQL dialects do too,
and it's the only sensible choice for an existing language with `-` as a
unary operator.

## `/* */` is purely additive

`/*` was never a valid LPE token sequence — it would tokenize as `/` then
`*`, and `*` has no nud, so any expression containing `/*` was a parse
error. So adding `/* */` block comments doesn't change the meaning of any
expression that previously parsed.

Block comments are NOT nestable. The first `*/` closes the comment:

```
/* outer /* inner */ rest of outer */    →  comment ends at first */; "rest of outer */" is parser garbage
```

This matches DAX, SQL, JavaScript, and C. (Rust nests, but that's the
exception.)

## Unterminated comments

Both line and block comments are forgiving:

- `// foo` (no `\n` before EOF) — comment runs to EOF, no error.
- `-- foo` (no `\n` before EOF) — same.
- `/* foo` (no `*/` before EOF) — comment runs to EOF, no error from the lexer.
  The parser then sees an empty token stream and may produce a downstream
  "empty input" issue, but the lexer itself doesn't reject the source.

If we ever want strict unterminated-block-comment errors, that's a small
follow-up — but matching `//`'s leniency was the path of least surprise.

## Implementation

`src/lpel.js` (the lexer), three branches placed before the `OPSEQ`/`PREFIX`
multi-char operator builders. Order matters: comment branches must run
before `-` and `/` are gathered into operator tokens.

```js
} else if (c === '/' && s.charAt(i + 1) === '/') {     // // line comment
  ...
} else if (c === '/' && s.charAt(i + 1) === '*') {     // /* block comment */
  i += 2;
  while (i < length) {
    if (s.charAt(i) === '*' && s.charAt(i + 1) === '/') { i += 2; break; }
    i += 1;
  }
} else if (c === '-' && s.charAt(i + 1) === '-' && (i === 0 || s.charAt(i - 1) <= ' ')) {  // -- line
  // Only when preceded by whitespace or at start, so `1--2` keeps working.
  ...
}
```

The whitespace-prefix check uses the same `<= ' '` test the lexer uses for
generic whitespace skipping — consistent with how the rest of the lexer
recognizes "non-content" characters.

## Tests

`test/test.js` — `describe('comments: -- line and /* */ block (DAX/SQL compat)', …)`:
- `--` from start, mid-expression, between statements.
- `--` mid-expression continues parsing across `\n`.
- Backwards-compat: `1--2`, `a--b`, `1 - -2` all give the same arithmetic AST.
- `/* */` at head, middle, tail of expression.
- Multi-line block comments.
- Empty `/**/`.
- `//` regression guard.
- Composition with the `;` argument separator (DAX-Euro idiom):
  `IF(/* check */ a > b; -- comment\n 1; 2)` parses cleanly.
