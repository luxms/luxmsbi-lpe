var assert = require('assert');
const {deparse} = require('../dist/lpe');


describe('LPE deparse', function() {

  it('should deparse primitives', function () {
    assert.equal(deparse(null),  'null');
    assert.equal(deparse('x'),  'x');
    assert.equal(deparse(true),  'true');
    assert.equal(deparse(1),  '1');
    assert.equal(deparse(['-', 1]),  '-1');
    assert.equal(deparse(['+', 1]),  '+1');
    assert.equal(deparse(['-', 'x']),  '-x');
    assert.equal(deparse(['+', 'x']),  '+x');
  });

  it('should deparse binary operators', function () {
    assert.equal(deparse(['+', 'x', 'y']),  'x + y');
    assert.equal(deparse(['-', 'x', 'y']),  'x - y');
    assert.equal(deparse(['+', 'x', ['*', 'y', 'z']]), 'x + y * z');
    assert.equal(deparse(["*", ["+", "x", "y"], "z"]), '(x + y) * z');
    assert.equal(deparse(["or",["+","x","y"],"z"]), 'x + y || z');

  });

  it('should deparse complex expressions', function () {
    assert.equal(deparse(
      ['between',
        ['->',
          ['dateShift', ['-', 1], ['"', 'm']],
          ['toStart', ['"', 'm']]],
        ['->',
          ['dateShift', ['-', 1], ['"', 'm']],
          ['toEnd', ['"', 'm']]]]),
      'between(dateShift(-1, "m").toStart("m"), dateShift(-1, "m").toEnd("m"))')
  });

});
