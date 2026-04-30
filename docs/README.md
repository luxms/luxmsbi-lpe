# LPE documentation

Developer-facing notes for changes to the LPE engine. Each page is a focused
explanation of *one* change — what it does, why it's that way, what the AST
looks like, and what tests cover it. Read these alongside `../CHANGELOG.md`
(release notes) and `../README.md` (the language overview).

## Table of contents

### Syntax & parsing

- [Statement separators](./statement-separators.md) — `;` and `\n` are now required between top-level statements; adjacency (`a() b()`) is rejected.
- [Argument separators](./argument-separators.md) — `;` is also accepted as an argument separator inside `(...)`, for DAX-Euro-locale compat.
- [Comments: `//`, `--`, `/* */`](./comments.md) — DAX/SQL line and block comments accepted.
- [VAR … RETURN](./var-return.md) — DAX-style block syntax that compiles to `let*`.
- [`~>` operator](./tilde-arrow-operator.md) — JS-style member access and method dispatch, separate from `.`.
- [`{=}` empty-hash literal](./empty-hash-literal.md) — the literal you reach for when `{}` (empty array) won't do.

### Standard library

- [`let*` sequential bindings](./let-star.md) — like `let` but each binding sees the previous ones; promise/stream-aware via `unbox`.
- [Datetime functions and D-tagged strings](./datetime-d-strings.md) — how `D'2024-01-15'` flows through `dateShift`, `extend`, etc.
- [`slice` on strings](./slice-on-strings.md) — array-only before, now also works on strings (matches JS).

### Engine

- [Localization hashes — the CRLF gotcha](./localization-hashes.md) — why all 114 "outdated" warnings on Windows checkouts were a line-endings artifact, and the fix.

## Conventions used in these docs

- **AST shape tables** show source on the left, parsed AST on the right. Strings in JSON form, numbers as numbers.
- **"Why this design" sections** are the most important part — they explain trade-offs the code can't.
- File:line references point into `../src/` and `../test/` so you can jump straight to the implementation or its tests.
