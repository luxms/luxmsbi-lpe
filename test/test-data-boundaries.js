const assert = require('assert');
const lpe = require('../dist/lpe');
const denied = error => error.name === 'LPESecurityError' && error.code === 'LPE_SECURITY';

describe('Data access and binding boundaries', () => {
  for (const key of ['constructor', 'prototype', '__proto__', 'caller', 'callee', 'arguments',
    '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']) {
    it(`validates the complete path before changing data: ${key}`, () => {
      for (const source of ['assoc_in(obj, ["new", key], 1)', 'update_in(obj, ["new", key], tick)']) {
        const obj = {};
        let calls = 0;
        assert.throws(() => lpe.eval_lpe(source, {obj, key, tick() { calls++; return 1; }}), denied);
        assert.deepStrictEqual(obj, {});
        assert.strictEqual(calls, 0);
      }
      assert.throws(() => lpe.eval_lpe('get_in(obj, ["missing", key])', {obj: {}, key}), denied);
    });
  }

  for (const key of [true, false, null, undefined, {}, [1]]) {
    it(`rejects a non-string/non-number key without coercion: ${JSON.stringify(key)}`, () => {
      for (const source of ['get(obj, key)', 'get_in(obj, [key])', 'set(obj, key, 1)', 'del(obj, key)']) {
        const obj = {};
        assert.throws(() => lpe.eval_lpe(source, {obj, key}), denied);
        assert.deepStrictEqual(obj, {});
      }
    });
  }

  it('evaluates a computed path once and keeps it unchanged', () => {
    const path = ['a', 0, 'answer'];
    const obj = {a: [{answer: 42}]};
    let calls = 0;
    assert.strictEqual(lpe.eval_lpe('get_in(obj, path())', {obj, path() { calls++; return path; }}), 42);
    assert.strictEqual(calls, 1);
    assert.deepStrictEqual(path, ['a', 0, 'answer']);
  });

  it('rejects empty update paths before invoking the callback', () => {
    const obj = {answer: 42};
    let calls = 0;
    assert.throws(() => lpe.eval_lpe('assoc_in(obj, [], 1)', {obj}), TypeError);
    assert.throws(() => lpe.eval_lpe('update_in(obj, [], tick)', {obj, tick() { calls++; }}), TypeError);
    assert.deepStrictEqual(obj, {answer: 42});
    assert.strictEqual(calls, 0);
  });

  it('checks parameter bindings when the closure is called', () => {
    let calls = 0;
    const fn = lpe.eval_lpe('fn([constructor], tick())', {tick() { calls++; return 42; }});
    assert.strictEqual(typeof fn, 'function');
    assert.strictEqual(calls, 0);
    assert.throws(() => fn(1), denied);
    assert.strictEqual(calls, 0);
  });
});
