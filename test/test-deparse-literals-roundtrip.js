const assert = require('assert');
const {parse, deparse} = require('../dist/lpe');

function assertRoundTrip(source, parseOptions, lint) {
  const expected = parse(source, parseOptions);
  let rendered = deparse(expected, {...parseOptions, lint});
  for (let cycle = 0; cycle < 3; cycle++) {
    const reparsed = parse(rendered, parseOptions);
    assert.deepStrictEqual(reparsed, expected, `AST changed for ${JSON.stringify(source)}: ${rendered}`);
    const next = deparse(reparsed, {...parseOptions, lint});
    assert.strictEqual(next, rendered, `Rendering changed for ${JSON.stringify(source)}, cycle ${cycle + 1}`);
    rendered = next;
  }
}

const literals = [
  String.raw`'\t'`, String.raw`'\b'`, String.raw`'\f'`,
  String.raw`'\n\r'`, String.raw`'\u0000'`, String.raw`'\u001f'`,
  String.raw`"\t\b\f\u0000"`,
  String.raw`'a\\b'`, String.raw`'a\'b'`, String.raw`"a\"b"`,
  String.raw`'\u2028\u2029'`, `'Россия φ'`,
  String.raw`r'\d+'`, String.raw`r'\n'`, String.raw`r'\'`,
  String.raw`r'a"b'`, String.raw`r"a'b"`, String.raw`r"\w+\s"`,
  `D'2020-01-01'`, String.raw`D'\t'`,
  'null', 'true', 'false', 'undefined', 'φ', '$φ',
  '0', '-0', '1.25', '1e21', '1e-7', '2e-324', '0e-1000',
  '1.7976931348623157e308', '5e-324',
  'f(,1)', 'f(1,,2)', 'f(1,)', 'f(,,)', 'f(g(,1),,h(1,))',
  '{}', '{=}', '{a=1,b=2}', '{a={b=3}}', '[1,2,[3]]',
  '(,)', '(1,)', '(1,2)', '()',
  `{text = ${String.raw`r'\d+'`}, nested = {${String.raw`'\t'`}, null}}`,
  `f('${'a'.repeat(125)}', ${String.raw`r'\d+'`},, ${String.raw`'\t'`})`,
];

const bracketNames = [
  String.raw`[a\b]`, `[a'b]`, '[a"b]', '[city name]', '[φ]',
  `f(${String.raw`[a\b]`}, [a'b], [a"b])`,
];

describe('LPE deparse literal round trips', function () {
  for (const lint of [false, true]) {
    describe(`lint=${lint}`, function () {
      for (const source of literals) {
        it(`preserves ${JSON.stringify(source)}`, function () {
          assertRoundTrip(source, {}, lint);
        });
      }
      for (const source of bracketNames) {
        it(`preserves SQL column ${JSON.stringify(source)}`, function () {
          assertRoundTrip(source, {squareBrackets: true}, lint);
        });
      }
    });
  }
});
