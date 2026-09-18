const assert = require('assert');
const {parse, deparse} = require('../dist/lpe');

function assertRoundtrip(source, lint) {
  const expected = parse(source);
  const first = deparse(expected, {lint});
  let text = first;
  for (let cycle = 0; cycle < 3; cycle++) {
    const actual = parse(text);
    assert.deepStrictEqual(actual, expected, `${source}: AST changed on cycle ${cycle + 1}`);
    text = deparse(actual, {lint});
    assert.strictEqual(text, first, `${source}: text changed on cycle ${cycle + 1}`);
  }
}

describe('LPE deparse special forms roundtrip', () => {
  const cases = [
    'begin()',
    'begin(x)',
    'begin(x, y)',
    'begin(, x)',
    'begin(begin(x, y), z)',
    'x := 1; print(x); x + 2',
    'a := b := c',
    '$value <- promise(1)',
    'f := x => x + 1',
    'f := (x, y) => x + y; f(2, 3)',
    'f := () => 1',
    '(x => x * x)(5)',
    'f(1)(2)',
    'fn({x}, return(1))(5)',
    'a ? b : c',
    'a ? (b ? c : d) : e',
    'if(a, begin(b, c), d)',
    'define({f, x, "x + 1"}, f(2))',
    'VAR x = 1 RETURN x',
    'VAR x = 1 VAR y = x + 2 RETURN y * 3',
    'f(VAR x = 1 RETURN x + 2)',
    'VAR x = 1 RETURN VAR y = x + 2 RETURN y',
    'f(, 1,)',
    'f(,)',
    'f(1,,3)',
    'not a',
    '!a',
    '!!a',
    'not(a)',
    '!(a = b)',
    'f(not a)',
    `define({f, firstArgument, secondArgument, thirdArgument, "firstArgument + secondArgument + thirdArgument"}, f(${Array.from({length: 20}, (_, i) => i + 1).join(', ')}))`,
  ];

  for (const lint of [false, true]) {
    for (const source of cases) {
      it(`${lint ? 'formatted' : 'compact'}: ${source}`, () => assertRoundtrip(source, lint));
    }
  }

  // Manually constructed ASTs may require grouping nodes that the parser records.
  // Their normalized form must stop changing after the first parse.
  for (const ast of [
    ['*', ['+', 'x', 'y'], 'z'],
    [['=>', 'x', ['+', 'x', 1]], 2],
  ]) {
    for (const lint of [false, true]) {
      it(`normalizes direct AST ${JSON.stringify(ast)} (lint=${lint})`, () => {
        const normalized = parse(deparse(ast, {lint}));
        const text = deparse(normalized, {lint});
        for (let cycle = 0; cycle < 3; cycle++) {
          assert.deepStrictEqual(parse(text), normalized);
          assert.strictEqual(deparse(parse(text), {lint}), text);
        }
      });
    }
  }
});
