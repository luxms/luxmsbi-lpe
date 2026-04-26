var assert = require('assert');
var {eval_lpe} = require('../dist/lpe');

function later(v) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(v), 500 * (1 + Math.random() / 10));
  });
}


function createCtx() {
  return {
    v1: 1,
    v2: 2,
    v3: 3,
    v4: 4,
    p1: later(1),
    p2: later(2),
    p3: later(3),
    p4: later(4),
  };
}


describe('async tests', function () {
  it('Promise in add arguments returns promise', async function() {
    const pr = eval_lpe('p2 + p3', createCtx());
    assert.equal(pr.constructor, Promise);
    const r = await pr;
    assert.equal(r, 5);
  });

  describe('VAR ... RETURN with promises', function () {
    it('unboxes a promise binding before later VARs see it', async function () {
      const r = await eval_lpe('VAR x = p2\nVAR y = x * 10\nRETURN y', createCtx());
      assert.equal(r, 20);
    });

    it('chains multiple promise bindings sequentially', async function () {
      const r = await eval_lpe(
        'VAR a = p1\nVAR b = p2\nVAR c = a + b\nRETURN c * 10',
        createCtx());
      assert.equal(r, 30);
    });

    it('handles a promise in the RETURN body', async function () {
      const r = await eval_lpe('VAR x = 7\nRETURN p3 + x', createCtx());
      assert.equal(r, 10);
    });
  });
});
