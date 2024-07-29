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
});
