const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const lpe = require('../../dist/lpe');
const fixture = require('../fixtures/closure-return.json');

function encode(value) {
  if (value === undefined) return {$lpe: 'undefined'};
  if (typeof value === 'function') return {$lpe: 'function'};
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [key, encode(value)]));
  return value;
}

describe('Closure return contract in JS 1.7.3', () => {
  for (const test of fixture.cases) {
    it(test.id, () => {
      const events = [];
      const context = {mark: value => { events.push(encode(value)); return value; }};
      let actual;
      try {
        actual = {value: encode(lpe.eval_lisp(test.ast, context, test.options)), events};
      } catch (error) {
        actual = {error: String(error?.message ?? error)
          .replace(/^Error: (?=.* is not a function$)/, ''), events};
      }
      assert.deepEqual(actual, test.modern);
    });
  }
});
