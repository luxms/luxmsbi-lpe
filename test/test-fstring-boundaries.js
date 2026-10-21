const assert = require('assert');
const lpe = require('../dist/lpe');
const denied = error => error?.code === 'LPE_SECURITY';

describe('F-string round trips and evaluation modes', () => {
  for (const source of [
    'f"{"x"}"', "f'{'x'}'", 'f"a{"b"}c"', 'f"{""}{"x"}{1}"',
    'f"{1}{2}"', 'f"{(1 + 2)}"', 'f"value: {-1}"',
    'f"{f\'nested {"x"}\'}"', 'f"{{text}{"{"}"', String.raw`rf"a\n{"x"}"`,
  ]) {
    for (const lint of [false, true]) {
      it(`preserves AST and repeated deparse (lint=${lint}): ${source}`, () => {
        const ast = lpe.parse(source);
        const text = lpe.deparse(ast, {lint});
        let current = text;
        for (let cycle = 0; cycle < 3; cycle++) {
          const next = lpe.parse(current);
          assert.deepStrictEqual(next, ast);
          current = lpe.deparse(next, {lint});
          assert.strictEqual(current, text);
        }
      });
    }
  }

  for (const source of ['f"{window}"', 'EVAL"window"', 'fEVAL"{code}"']) {
    it(`preserves the host mode: ${source}`, () => {
      const context = {window: globalThis, code: 'window'};
      assert.throws(() => lpe.eval_lpe(source, context), denied);
      const result = lpe.eval_lpe(source, context, {unsafe: true});
      assert.strictEqual(result, source === 'f"{window}"' ? String(globalThis) : globalThis);
    });
  }

  it('preserves the mode across asynchronous interpolation', async () => {
    const context = {window: globalThis, code: Promise.resolve('window')};
    await assert.rejects(async () => lpe.eval_lpe('fEVAL"{code}"', context), denied);
    assert.strictEqual(await lpe.eval_lpe('fEVAL"{code}"', context, {unsafe: true}), globalThis);
  });

  it('never executes plain interpolated text as code', () => {
    assert.strictEqual(lpe.eval_lpe('f"{code}"', {code: "''.constructor"}), "''.constructor");
  });

  for (const source of [
    `f"{get_in('', 'constructor', 'constructor')}"`,
    `f"{''.constructor}"`, `f"{'' ~> constructor}"`,
    `f"{set_options({unsafe = true}, ''.constructor)}"`,
    `EVAL"set_options({unsafe = true}, ''.constructor)"`,
    `apply(formatString, [[], 'probe'], {}, {unsafe = true})`,
    `apply(strToEVAL, ['probe'], {}, {unsafe = true})`,
  ]) {
    it(`keeps safe restrictions: ${source}`, () => {
      assert.throws(() => lpe.eval_lpe(source), denied);
    });
  }
});
