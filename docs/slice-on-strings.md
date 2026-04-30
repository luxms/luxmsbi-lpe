# `slice` on strings

> `slice` was array-only and silently returned `[]` for strings.
> Now it works on both arrays and strings — matching JS.

## Before

```
slice("hello world", 1, 4)              →  []         (silently wrong)
s := 'hello'; s.slice(1, 2)             →  []         (silently wrong)
slice({1, 2, 3, 4}, 1, 3)               →  [2, 3]     (worked)
```

The body was:

```js
return isArray(a) ? a.slice(b, end.length > 0 ? end[0] : a.length) : [];
```

For non-array inputs it fell through to `[]`. No error — just a useless empty
array, which downstream code then had to special-case (or didn't, and got
a confusing bug far from the cause).

## After

```js
if (!isArray(a) && !isString(a)) return [];
return a.slice(b, end.length > 0 ? end[0] : a.length);
```

`String.prototype.slice` and `Array.prototype.slice` have identical
signatures, so a single call site handles both.

```
slice("hello world", 0, 5)              →  "hello"
slice("hello", 1, 2)                    →  "e"
slice("hello", 1)                       →  "ello"
slice({1, 2, 3, 4}, 1, 3)               →  [2, 3]              (unchanged)
slice(42, 0, 2)                         →  []                  (unsupported types still get [])
```

## Localization update

This change touched the docstring (added two example lines and the "or substring"
phrasing). That changed the docstring's hash, which would have triggered an
"outdated" warning — so the matching `"slice"` entry in
`src/localization/localization.js` was refreshed (RU + EN + new hash).

Pattern to remember: when a STDLIB function gains real new behavior,
document it in the source docstring AND update the localization. When fixing
a bug without semantic changes (like the [datetime D-string fix](./datetime-d-strings.md)),
keep the docstring untouched so the localization stays valid.

## Tests

`test/test-lisp.js` — `describe('slice', …)`:
- Array slicing (regression guard).
- String slicing (the bug).
- Dot-notation form (`s.slice(1, 2)` — `slice(s, 1, 2)` thread-first).
- Non-supported types still return `[]`.
