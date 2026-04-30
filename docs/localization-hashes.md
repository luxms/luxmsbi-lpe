# Localization hashes — the CRLF gotcha

> "All 114 STDLIB functions show outdated localization warnings on Windows
> checkouts" was a single-character bug in the hash normalizer.

## The system, briefly

Every STDLIB function has a Russian JSDoc-style docstring in its body and a
mirror entry in `src/localization/localization.js` containing RU + EN +
`hash:`. At module load, `makeDoc` (`src/doc.js:447`) hashes the *current*
docstring and compares it with the stored `hash:`. Mismatch → console warning.

The hash is a **review tripwire**, not a correctness check. When a developer
edits the Russian text, the hash changes; the alarm only stops once a human
re-reads the EN translation, edits it if needed, and copies the new hash
into the entry. The hash bump is the human's signature of "I've reviewed
this pair; they're consistent again."

See [the auto-bump-is-an-anti-pattern note](#why-auto-bumping-the-hashes-was-the-wrong-idea) below.

## The bug

On a fresh Windows checkout (`git config core.autocrlf=true`, no
`.gitattributes`), every single function fired:

```
DOC: WARNING: localization for STDLIB.toAny was outdated. Current hash: 894125899
... (114 of these)
```

Yet a side-by-side compare of the source RU and the stored RU was
**byte-identical**.

The cause: `makeDoc`'s normalizer:

```js
generateSimpleHash(ruDocValue[1].replaceAll(/\n\s+/g, "\n"))
```

`\n\s+` strips indentation *after* a newline. But on a Windows checkout, line
endings are `\r\n`. The regex matches `\n` at byte position N, leaves the
`\r` at position N-1 untouched. Result: a string that's structurally the same
RU text but littered with `\r` bytes that the hash function then folds into a
totally different number.

Verified directly:

```
hash of source-extracted RU:   894125899   (CRLF — what runtime computes)
hash of stored RU:             894125899   (CRLF — would match runtime)
hash with CR stripped first:   179809716   (LF — what was originally stored)
```

So the original developer committed entries with hashes computed on a LF
checkout; on Windows everything looks "outdated" because the bytes really
are different (`\r` is real data), but the *meaning* is the same.

## The fix

One line in `src/doc.js:459`:

```diff
- generateSimpleHash(ruDocValue[1].replaceAll(/\n\s+/g, "\n"))
+ generateSimpleHash(ruDocValue[1].replaceAll(/\r\n/g, "\n").replaceAll(/\n\s+/g, "\n"))
```

Strip `\r` first, *then* strip indentation. Result is the same on every
platform regardless of `core.autocrlf` setting. All 114 warnings vanished
immediately — without any localization-file changes, because no translation
ever actually drifted.

## Why this fix is the right one

- It addresses the root cause. The hash should represent *meaning*, not
  *line-ending bytes*. CRLF vs LF is an artifact of git checkout settings,
  not a real change.
- It works for every platform without needing per-machine git config or a
  `.gitattributes` file.
- It does not undermine the review tripwire. Real translation drift (someone
  rewords a docstring) still fires the warning.

A `.gitattributes` (`*.js text eol=lf`) is *also* good hygiene to add — but
on its own it's only defense in depth. The doc.js fix is the load-bearing
one.

## Why auto-bumping the hashes was the wrong idea

The original "let's just patch the hashes the runtime tells us" plan would
have silenced the alarm without any human reviewing whether the EN
translation still describes the new RU. That converts a noisy-but-meaningful
warning into a quiet bug. The alarm exists *exactly* to prevent EN drift
during RU edits — auto-bumping defeats the system the previous developer put
in place.

When real RU text changes (a docstring is genuinely rewritten), do it
manually: read the new RU, decide whether EN still matches, edit EN if
needed, then bump `hash:`. That's the dev's signature.

## When you'll touch this in the future

- **Adding a new STDLIB function with a docstring:** add a matching
  `localization.js` entry (or you'll get an "undefined" warning). Compute the
  hash with `generateSimpleHash` on the normalized docstring (see
  `src/doc.js:118-132`).
- **Bug-fixing existing STDLIB code:** keep the docstring untouched and put
  your fix code below it. No localization changes needed. (The
  [D-string fix](./datetime-d-strings.md) follows this pattern.)
- **Adding new behavior to an existing function:** document it in the source
  docstring AND update both RU + EN translations + bump the hash. (The
  [slice-on-strings change](./slice-on-strings.md) follows this pattern.)
