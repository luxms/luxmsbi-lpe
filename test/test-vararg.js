var assert = require('assert');
var lpe = require('../dist/lpe');

describe('makeVararg tests', function () {

  describe('basic positional arguments', function () {
    it('should pass positional arguments in order', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs };
        })
      };

      const result = lpe.eval_lisp(['+', 0], ctx); // dummy to init
      const result2 = lpe.eval_lisp(['testFunc', 3, 4], ctx);

      assert.deepEqual(result2, { a: 3, b: 4, args: [], kwargs: {} });
    });

    it('should evaluate expressions in positional arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b };
        })
      };

      const result = lpe.eval_lisp(['testFunc', ['+', 1, 2], ['*', 3, 4]], ctx);
      assert.deepEqual(result, { a: 3, b: 12 });
    });

    it('should handle extra positional arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 1, 2, 3, 4, 5], ctx);
      assert.deepEqual(result, { a: 1, b: 2, args: [3, 4, 5], kwargs: {} });
    });
  });

  describe('named arguments (kwargs)', function () {
    it('should handle named arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs };
        })
      };

      // b=4, a=3 using AST format ["=", "name", value]
      const result = lpe.eval_lisp(['testFunc', ['=', 'b', 4], ['=', 'a', 3]], ctx);
      assert.deepEqual(result, { a: 3, b: 4, args: [], kwargs: {} });
    });

    it('should handle mixed positional and named arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs };
        })
      };

      // testFunc(b=4, 3) -> a=3, b=4
      const result = lpe.eval_lisp(['testFunc', ['=', 'b', 4], 3], ctx);
      assert.deepEqual(result, { a: 3, b: 4, args: [], kwargs: {} });
    });

    it('should pass extra kwargs not in template', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs };
        })
      };

      // testFunc(b=4, c=5, 3) -> a=3, b=4, kwargs={c: 5}
      const result = lpe.eval_lisp(['testFunc', ['=', 'b', 4], ['=', 'c', 5], 3], ctx);
      assert.deepEqual(result, { a: 3, b: 4, args: [], kwargs: { c: 5 } });
    });

    it('should evaluate expressions in kwargs', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a'], (a, args, kwargs) => {
          return { a, extra: kwargs.extra };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 1, ['=', 'extra', ['+', 10, 20]]], ctx);
      assert.deepEqual(result, { a: 1, extra: 30 });
    });
  });

  describe('fn type arguments (wrapped in JS function)', function () {
    it('should pass fn-type arguments as callable JS functions', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'callback:fn'], (a, callback, args, kwargs) => {
          // callback should be a function, not AST
          return { a, callbackIsFunction: typeof callback === 'function' };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 5, ['+', 1, 2]], ctx);
      assert.strictEqual(result.a, 5);
      assert.strictEqual(result.callbackIsFunction, true);
    });

    it('should evaluate AST when fn-type callback is called', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'callback:fn'], function(a, callback, args, kwargs) {
          // Call the callback to evaluate the AST
          const callbackResult = callback();
          return { a, callbackResult };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 5, ['+', 1, 2]], ctx);
      assert.deepEqual(result, { a: 5, callbackResult: 3 });
    });

    it('should handle mixed evaluated and fn-type arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a:int', 'b:fn', 'c'], (a, b, c, args, kwargs) => {
          return {
            a,
            bIsFunction: typeof b === 'function',
            bResult: b(),
            c
          };
        })
      };

      const result = lpe.eval_lisp(['testFunc', ['+', 1, 1], ['*', 2, 2], ['-', 10, 3]], ctx);
      assert.strictEqual(result.a, 2);              // evaluated: 1+1
      assert.strictEqual(result.bIsFunction, true); // wrapped in function
      assert.strictEqual(result.bResult, 4);        // 2*2 when called
      assert.strictEqual(result.c, 7);              // evaluated: 10-3
    });

    it('should allow multiple calls to fn-type callback', function () {
      let callCount = 0;
      const ctx = {
        counter: () => ++callCount,
        testFunc: lpe.makeVararg(['callback:fn'], (callback, args, kwargs) => {
          return [callback(), callback(), callback()];
        })
      };

      const result = lpe.eval_lisp(['testFunc', ['counter']], ctx);
      assert.deepEqual(result, [1, 2, 3]);
    });
  });

  describe('type patterns (regex matching)', function () {
    it('should match argument names with regex patterns', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['value', 'onClick', 'onHover', { 'on.*': 'fn' }],
          (value, onClick, onHover, args, kwargs) => {
            return {
              value,
              onClickIsFunction: typeof onClick === 'function',
              onHoverIsFunction: typeof onHover === 'function',
              onClickResult: onClick(),
              onHoverResult: onHover()
            };
          })
      };

      const result = lpe.eval_lisp(['testFunc', ['+', 1, 2], ['*', 3, 4], ['-', 5, 6]], ctx);
      assert.strictEqual(result.value, 3);               // evaluated
      assert.strictEqual(result.onClickIsFunction, true); // fn (matches on.*)
      assert.strictEqual(result.onHoverIsFunction, true); // fn (matches on.*)
      assert.strictEqual(result.onClickResult, 12);       // 3*4
      assert.strictEqual(result.onHoverResult, -1);       // 5-6
    });

    it('should apply fn pattern to extra kwargs not in template', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['value', { 'on.*': 'fn' }],
          (value, args, kwargs) => {
            return {
              value,
              onClickIsFunction: typeof kwargs.onClick === 'function',
              onHoverIsFunction: typeof kwargs.onHover === 'function',
              onClickResult: kwargs.onClick(),
              onHoverResult: kwargs.onHover(),
              // regular kwarg should be evaluated
              other: kwargs.other
            };
          })
      };

      // value=5, onClick and onHover match 'on.*' pattern so should be functions
      // other doesn't match so should be evaluated
      const result = lpe.eval_lisp([
        'testFunc',
        5,
        ['=', 'onClick', ['+', 1, 2]],
        ['=', 'onHover', ['*', 3, 4]],
        ['=', 'other', ['-', 10, 3]]
      ], ctx);

      assert.strictEqual(result.value, 5);
      assert.strictEqual(result.onClickIsFunction, true);
      assert.strictEqual(result.onHoverIsFunction, true);
      assert.strictEqual(result.onClickResult, 3);    // 1+2
      assert.strictEqual(result.onHoverResult, 12);   // 3*4
      assert.strictEqual(result.other, 7);            // evaluated: 10-3
    });

    it('should allow calling fn-type kwargs multiple times', function () {
      let counter = 0;
      const ctx = {
        inc: () => ++counter,
        testFunc: lpe.makeVararg([{ 'on.*': 'fn' }],
          (args, kwargs) => {
            return [kwargs.onTick(), kwargs.onTick(), kwargs.onTick()];
          })
      };

      const result = lpe.eval_lisp(['testFunc', ['=', 'onTick', ['inc']]], ctx);
      assert.deepEqual(result, [1, 2, 3]);
    });
  });

  describe('inline type syntax', function () {
    it('should parse inline type from template string', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a:int', 'b:fn'], (a, b, args, kwargs) => {
          return {
            a,
            bIsFunction: typeof b === 'function',
            bResult: b()
          };
        })
      };

      const result = lpe.eval_lisp(['testFunc', ['+', 5, 5], ['*', 2, 3]], ctx);
      assert.strictEqual(result.a, 10);            // evaluated
      assert.strictEqual(result.bIsFunction, true); // wrapped in function
      assert.strictEqual(result.bResult, 6);        // 2*3
    });
  });

  describe('context variable resolution', function () {
    it('should resolve context variables in arguments', function () {
      const ctx = {
        x: 100,
        y: 200,
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 'x', 'y'], ctx);
      assert.deepEqual(result, { a: 100, b: 200 });
    });

    it('should defer evaluation for fn-type arguments until called', function () {
      const ctx = {
        x: 100,
        testFunc: lpe.makeVararg(['a', 'b:fn'], (a, b, args, kwargs) => {
          return { a, bIsFunction: typeof b === 'function', bResult: b() };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 'x', 'x'], ctx);
      assert.strictEqual(result.a, 100);             // evaluated immediately -> 100
      assert.strictEqual(result.bIsFunction, true);  // wrapped in function
      assert.strictEqual(result.bResult, 100);       // evaluated when called -> 100
    });
  });

  describe('evaluation order', function () {
    it('should evaluate arguments in the order they appear in the call', function () {
      const evalOrder = [];
      const ctx = {
        track: (n) => { evalOrder.push(n); return n; },
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b, args, kwargs, evalOrder: [...evalOrder] };
        })
      };

      // Call: testFunc(track(1), b=track(2), track(3), x=track(4))
      // Should evaluate in order: 1, 2, 3, 4
      const result = lpe.eval_lisp([
        'testFunc',
        ['track', 1],
        ['=', 'b', ['track', 2]],
        ['track', 3],
        ['=', 'x', ['track', 4]]
      ], ctx);

      assert.deepEqual(result.evalOrder, [1, 2, 3, 4]);
      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.deepEqual(result.args, [3]);
      assert.deepEqual(result.kwargs, { x: 4 });
    });

    it('should not evaluate fn-type args but still preserve order for others', function () {
      const evalOrder = [];
      const ctx = {
        track: (n) => { evalOrder.push(n); return n; },
        testFunc: lpe.makeVararg(['a', 'b:fn', 'c'], (a, b, c, args, kwargs) => {
          return { a, c, evalOrder: [...evalOrder] };
        })
      };

      // Call: testFunc(track(1), track(2), track(3))
      // b is fn type, so only 1 and 3 should be evaluated, in that order
      const result = lpe.eval_lisp([
        'testFunc',
        ['track', 1],
        ['track', 2],
        ['track', 3]
      ], ctx);

      assert.deepEqual(result.evalOrder, [1, 3]); // 2 skipped (fn type)
      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.c, 3);
    });

    it('should preserve order with mixed positional and kwargs', function () {
      const evalOrder = [];
      const ctx = {
        track: (n) => { evalOrder.push(n); return n; },
        testFunc: lpe.makeVararg(['x'], (x, args, kwargs) => {
          return { evalOrder: [...evalOrder] };
        })
      };

      // Call: testFunc(a=track(1), track(2), b=track(3))
      // Order should be: 1, 2, 3
      const result = lpe.eval_lisp([
        'testFunc',
        ['=', 'a', ['track', 1]],
        ['track', 2],
        ['=', 'b', ['track', 3]]
      ], ctx);

      assert.deepEqual(result.evalOrder, [1, 2, 3]);
    });
  });

  describe('edge cases', function () {
    it('should handle empty template', function () {
      const ctx = {
        testFunc: lpe.makeVararg([], (args, kwargs) => {
          return { args, kwargs };
        })
      };

      const result = lpe.eval_lisp(['testFunc', 1, 2, ['=', 'x', 3]], ctx);
      assert.deepEqual(result, { args: [1, 2], kwargs: { x: 3 } });
    });

    it('should handle undefined/missing arguments', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b', 'c'], (a, b, c, args, kwargs) => {
          return { a, b, c };
        })
      };

      // Only pass 2 args when template expects 3
      const result = lpe.eval_lisp(['testFunc', 1, 2], ctx);
      assert.deepEqual(result, { a: 1, b: 2, c: undefined });
    });

    it('should handle null values', function () {
      const ctx = {
        testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => {
          return { a, b };
        })
      };

      const result = lpe.eval_lisp(['testFunc', null, null], ctx);
      assert.deepEqual(result, { a: null, b: null });
    });
  });

});
