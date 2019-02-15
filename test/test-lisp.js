var assert = require('assert');
var lpe = require('../dist/lpe');

describe('LISP tests', function() {
  it('should resolve js-constants', function() {
    assert.deepEqual(lpe.eval_lisp(1), 1);
    assert.deepEqual(lpe.eval_lisp(false), false);
    assert.deepEqual(lpe.eval_lisp(true), true);
    assert.deepEqual(lpe.eval_lisp("Hello World"), "Hello World");
    assert.deepEqual(lpe.eval_lisp([]), null);
    assert.deepEqual(lpe.eval_lisp(null), null);
  });

  it('should resolve built-in lisp constants', function() {
    assert.deepEqual(lpe.eval_lisp("#t"), true);
    assert.deepEqual(lpe.eval_lisp("#f"), false);
    assert.deepEqual(lpe.eval_lisp("NIL"), null);
  });

  it('should run let special form', function() {
    assert.deepEqual(lpe.eval_lisp(["let", {"foo": 2}, "foo"]), 2);
    assert.deepEqual(lpe.eval_lisp(["let", [["foo", 2]], "foo"]), 2);
    assert.deepEqual(lpe.eval_lisp(["let", ["foo", 2], "foo"]), 2);
  });

  it('operator =', function() {
    assert.deepEqual(lpe.eval_lisp(["=", 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, ["-", 2, 1]]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 2]), false);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, 2]), false);
    assert.deepEqual(lpe.eval_lisp(["=", 0]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 0, null]), false);
  });

  it('if', function() {
    assert.deepEqual(lpe.eval_lisp(["if", true, 1, 2]), 1);
    assert.deepEqual(lpe.eval_lisp(["if", false, 1, 2]), 2);
    assert.deepEqual(lpe.eval_lisp(["if", "a", 1, 2], {a: true}), 1);
    assert.deepEqual(lpe.eval_lisp(["if", "a", 1, 2], {}), 2);
    assert.deepEqual(lpe.eval_lisp(["if", ["=", "a", ["'", "a"]], 1, 2], {a: "a"}), 1);
  });
});
