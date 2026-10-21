# Lux Path Expressions

**A JavaScript engine for parsing and evaluating expressions.**

LPE turns formulas into Lisp-style abstract syntax trees (ASTs), evaluates them with your data and functions, and converts ASTs back into expression text.

Property access and callable dispatch follow the
[evaluator integration contract](SECURITY.md). Review it when supplying
application data and callbacks.

[![JavaScript](https://img.shields.io/badge/JavaScript-UMD-F7DF1E?style=flat-square&logo=javascript&logoColor=F7DF1E&labelColor=202938)](https://github.com/luxms/luxmsbi-lpe/blob/master/src/index.js)
[![Type declarations](https://img.shields.io/badge/TypeScript-declarations-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://github.com/luxms/luxmsbi-lpe/blob/master/src/index.d.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-86D5BD?style=flat-square)](https://github.com/luxms/luxmsbi-lpe/blob/master/LICENSE)

**English** · [Русский](README.ru.md)

[Quick start](#quick-start) · [Examples](#examples) · [Syntax](#syntax-at-a-glance) · [API](#api) · [Development](#development) · [Documentation](#documentation)

## What you can do

- **Parse and inspect formulas.** Work with nested arrays that represent function calls, operators and literals.
- **Evaluate against a context.** Supply application data and JavaScript functions alongside the standard library.
- **Compose expressions.** Use function chains, arrays, objects and local variables with `VAR … RETURN`.
- **Use asynchronous values.** Promise arguments are resolved during evaluation; reactive streams can be integrated through a `streamAdapter`.
- **Generate expression text.** Convert ASTs back into LPE with `deparse`.

## Quick start

Build from source with Node.js and npm. These examples describe the current `master` branch.

```sh
git clone https://github.com/luxms/luxmsbi-lpe.git
cd luxmsbi-lpe
npm ci
npm run build
```

The build creates `dist/lpe.js`. Run this command from the repository root:

```sh
node -e "console.log(require('./dist/lpe').eval_lpe('2 + 3 * 4'))"
```

Output: `14`.

The package is named `@luxms/lpe`. The examples below load the local build directly. The bundle supports CommonJS, AMD and the browser global `lpe`; [TypeScript declarations](https://github.com/luxms/luxmsbi-lpe/blob/master/src/index.d.ts) are also included.

## Examples

### Parse, evaluate and deparse

```js
const { parse, eval_lpe, eval_lisp, deparse } = require('./dist/lpe');

const context = { price: 120, quantity: 3 };

eval_lpe('price * quantity', context); // 360

const ast = parse('price * quantity');
// ['*', 'price', 'quantity']

eval_lisp(ast, context); // 360
deparse(ast);           // 'price * quantity'
```

`parse` builds an AST without running the expression. Use `eval_lisp` to evaluate an existing AST, or `eval_lpe` to parse and evaluate in one call. `deparse` generates expression text; it does not preserve the original formatting or comments.

### Add your own functions

```js
const { eval_lpe } = require('./dist/lpe');

eval_lpe('amount.double()', {
  amount: 21,
  double: value => value * 2,
}); // 42
```

The dot passes the value on its left as the first argument: `amount.double()` calls `double(amount)`. For JavaScript method calls on an object, use `~>` instead.

### Calculate with local variables

```js
const { eval_lpe } = require('./dist/lpe');

eval_lpe(`
  VAR subtotal = price * quantity
  VAR discount = subtotal * 0.1
  RETURN subtotal - discount
`, { price: 120, quantity: 3 }); // 324
```

Bindings are evaluated in order, so each variable can use the ones declared before it. `VAR` and `RETURN` are uppercase keywords.

### Work with promises

```js
const { eval_lpe } = require('./dist/lpe');

const result = eval_lpe('price * quantity', {
  price: Promise.resolve(120),
  quantity: 3,
});

result.then(value => console.log(value)); // 360
```

## Syntax at a glance

| Feature | Expression | Result |
| --- | --- | --- |
| Arithmetic | `2 + 3 * 4` | `14` |
| Logic | `(3 > 2) and not false` | `true` |
| Array | `[1, 2, 3]` | `[1, 2, 3]` |
| Object | `{name = "Ada", score = 42}` | `{name: "Ada", score: 42}` |
| Property access | `{score = 42}.score` | `42` |
| Empty object | `{=}` | `{}` |
| Empty array | `{}` | `[]` |
| JavaScript method | `"hello" ~> toUpperCase()` | `"HELLO"` |
| Sequential statements | `x := 2; x + 3` | `5` |

Separate top-level statements with `;` or a newline. Function arguments accept `,` or `;`. Comments use `//`, `--` or `/* … */`.

When mixing `and` and `or`, use parentheses to make grouping explicit: the parser gives both operators the same precedence.

<details>
<summary>How expressions map to ASTs</summary>

The first element of an AST array identifies the operation or function. Numbers remain numbers; bare names are strings. String literals have an explicit quote node.

| Source | AST |
| --- | --- |
| `2 + 3 * 4` | `["+", 2, ["*", 3, 4]]` |
| `double(21)` | `["double", 21]` |
| `"hello"` | `["\"", "hello"]` |
| `[1, 2, 3]` | `["[", 1, 2, 3]` |
| `a.b()` | `[".", "a", ["b"]]` |
| `a(); b()` | `["begin", ["a"], ["b"]]` |

</details>

## API

| Function | Purpose |
| --- | --- |
| `parse(source, options?)` | Parse LPE source into an AST. |
| `eval_lpe(source, context?, options?)` | Parse and evaluate an expression. |
| `eval_lisp(ast, context?, options?)` | Evaluate an AST with a context and the standard library. |
| `deparse(ast, options?)` | Convert an AST into LPE source. |

The module also exports `LPESyntaxError`, `STDLIB` and helpers for custom forms, variables, documentation and localization. See [runtime exports](https://github.com/luxms/luxmsbi-lpe/blob/master/src/index.js) and [option types](https://github.com/luxms/luxmsbi-lpe/blob/master/src/index.d.ts).

## Development

Build before running tests: the test suite imports `dist/lpe.js`.

```sh
npm ci
npm run build
npm test
```

| Command | Purpose |
| --- | --- |
| `npm run watch` | Rebuild when source files change. |
| `npm run t` | Run the parser tests in `test/test.js`. |
| `npm run test-lisp` | Run the evaluator tests in `test/test-lisp.js`. |

For a command-line AST preview on systems with `/dev/stdin`:

```sh
echo "2 + 3 * 4" | npm run cli
```

Use `npm run eval` in place of `npm run cli` to evaluate the expression. Both scripts read `/dev/stdin`; on Windows, use the `node -e` command from [Quick start](#quick-start).

## Documentation

- [Language and engine notes](https://github.com/luxms/luxmsbi-lpe/blob/master/docs/README.md) — syntax, evaluation rules and implementation details.
- [Standard library reference](https://github.com/luxms/luxmsbi-lpe/blob/master/src/context/README.md) — built-in functions and examples, in Russian.
- [Changelog](https://github.com/luxms/luxmsbi-lpe/blob/master/CHANGELOG.md) — release history.
- [Browser and AMD examples](https://github.com/luxms/luxmsbi-lpe/tree/master/demo) — sample integrations.

For bug reports, include the expression, context and expected result in a [GitHub issue](https://github.com/luxms/luxmsbi-lpe/issues). For code changes, add a regression test and run the build and test suite before opening a pull request.

## License

[MIT](https://github.com/luxms/luxmsbi-lpe/blob/master/LICENSE) · Copyright (c) 2019 Luxms Inc.
