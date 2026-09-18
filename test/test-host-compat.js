const assert = require('assert');
const lpe = require('../dist/lpe');

describe('Host compatibility', () => {
  it('exports variable accessors used by host special forms', () => {
    const ctx = {};
    assert.strictEqual(lpe.$var$(ctx, 'x', 1), 1);
    assert.strictEqual(lpe.$getvar$(ctx, 'x'), 1);
    assert.strictEqual(lpe.$setvar$(ctx, 'x', 2), 2);
    assert.strictEqual(lpe.$var$(ctx, 'x'), 2);
  });

  it('define supports recursive functions', () => {
    assert.strictEqual(lpe.eval_lpe('define({factorial, n, "if(n < 2, 1, n * factorial(n - 1))"}, factorial(4))'), 24);
  });

  it('define preserves static variables across calls', () => {
    assert.strictEqual(lpe.eval_lpe('define({incr, $inc = 0, "this.inc := this.inc + 1"}, incr(), incr(), incr())'), 3);
  });

  it('define supports default arguments', () => {
    assert.strictEqual(lpe.eval_lpe('define({func, a, b = 5 * 2, "a + b"}, func(1, 2) + func(3))'), 16);
  });

  it('define retains the layered host context', () => {
    assert.strictEqual(lpe.eval_lpe('define({f, x, "x + offset"}, f(2))', [{offset: 40}]), 42);
  });

  it('define keeps its functions local', () => {
    const ctx = {};
    assert.strictEqual(lpe.eval_lpe('define({f, "42"}, f())', ctx), 42);
    assert.strictEqual(ctx.f, undefined);
  });
});
