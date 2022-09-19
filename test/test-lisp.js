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

  it('should allow hash changes declared with let', function() {
    assert.deepEqual(lpe.eval_lisp(["let", ["foo", {"a":33}], ['begin', [".-", "foo","a", ["*", 10, [".-","foo","a"]]], "foo"]]), {"a":330});    
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(a . 3 . 1)'), {"a":{"3":[300,600]}}), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(set(a . 3 , 2, "Hoy"), a)'), {"a":{"3":[300,600]}}), 
    {
      '3': [
        300,
        600,
        'Hoy'
      ]
    });
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

  it('arrays', function() {
    assert.deepEqual(lpe.eval_lisp(["sort", ["[", 3, 2, 1]]), [1,2,3]);
    assert.deepEqual(lpe.eval_lisp(["min", ["[", 3, 2, 1]]), 1);
    assert.deepEqual(lpe.eval_lisp(["max", ["[", 3, 2, 1]]), 3);
  });

  it('get-in', function() {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(a . 3 . 1)'), {"a":{"3":[300,600]}}), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, ["3",1])'), {"a":{"3":[300,600]}}), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in("a", ["3",1])'), {"a":{"3":[300,600]}}), undefined);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, [3,1])'), {"a":{"3":[300,600]}}), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, [3,1,0,"j"])'), {"a":{"3":[300,600]}}), undefined);
  });


  it('assoc_in', function() {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["4"], 100),a)'), {"a":{"3":[300,600],"4":1}}), 
    {
      '3': [
        300,
        600,
      ],
      "4": 100
    });
  });

});
