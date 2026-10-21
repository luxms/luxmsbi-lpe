const assert = require('assert');
const vm = require('vm');
const {execFileSync} = require('child_process');
const lpe = require('../dist/lpe');

const denied = error => error && error.code === 'LPE_SECURITY';
const evaluate = (source, context) => lpe.eval_lpe(source, context);

describe('LPE execution boundary', function () {
  it('loads and evaluates LPE when native string compilation is disabled', function () {
    const script = `
      const assert = require('assert');
      const lpe = require(${JSON.stringify(require.resolve('../dist/lpe'))});
      assert.strictEqual(lpe.eval_lpe('apply((x, y) => x + y, 20, 22)'), 42);
      assert.throws(() => lpe.eval_lpe('get(value, key)', {value: {}, key: '__proto__'}),
        error => error.code === 'LPE_SECURITY');
    `;
    execFileSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', script],
      {timeout: 5000, stdio: 'pipe'});
  });

  for (const source of [
    'get_in(value, key)',
    'get_in(value, path)',
    'get(value, key)',
    'property(value, identity(key))',
    'value ~> (key)',
    'identity(get_in(value, key))',
    'map([value], item => get_in(item, key))',
    'apply(reader, value, key)',
    'eval(expression)',
    'let([["item", value]], get_in(item, key))',
    'if(true, get(value, key), 0)',
    'get_in(value, "missing", key)',
  ]) {
    it(`checks property access in composed expressions: ${source}`, function () {
      const key = '__proto__';
      const context = {value: {}, key, path: [key], reader: lpe.STDLIB.get,
        expression: ['get', ['$AST$', {}], ['q', key]]};
      assert.throws(() => evaluate(source, context), denied);
    });
  }

  const restricted = {
    Function,
    AsyncFunction: Object.getPrototypeOf(async function () {}).constructor,
    GeneratorFunction: Object.getPrototypeOf(function* () {}).constructor,
    AsyncGeneratorFunction: Object.getPrototypeOf(async function* () {}).constructor,
    eval,
    boundFunction: Function.bind(null),
    foreignFunction: vm.runInNewContext('Function'),
    foreignAsyncFunction: vm.runInNewContext('(async function () {}).constructor'),
    reflectApply: Reflect.apply,
    reflectConstruct: Reflect.construct,
    functionApply: Function.prototype.apply,
    functionCall: Function.prototype.call,
    functionBind: Function.prototype.bind,
    getPrototypeOf: Object.getPrototypeOf,
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
    defineProperty: Object.defineProperty,
    setPrototypeOf: Object.setPrototypeOf,
    create: Object.create,
    assign: Object.assign,
  };
  for (const [name, capability] of Object.entries(restricted)) {
    it(`checks ${name} through context and direct calls`, function () {
      assert.throws(() => evaluate("apply(callback)", {callback: capability}), denied);
      assert.throws(() => lpe.STDLIB.apply(capability), denied);
      assert.throws(() => lpe.eval_lisp(['$AST$', capability]), denied);
    });
  }

  for (const key of ['constructor', 'prototype', '__proto__', 'caller', 'callee', 'arguments',
    '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']) {
    for (const form of ['get_in(obj, key)', 'get(obj, key)', 'property(obj, identity(key))', 'obj ~> (key)']) {
      it(`rejects ${key} via ${form}`, function () {
        assert.throws(() => evaluate(form, {obj: {}, key}), denied);
      });
    }
  }

  it('does not use a target-controlled apply method or accept a duck-typed callable', function () {
    let called = false;
    const fn = x => x + 1;
    fn.apply = () => { called = true; throw new Error('forged apply'); };
    assert.strictEqual(evaluate('apply(fn, 41)', {fn}), 42);
    assert.strictEqual(evaluate('fn(41)', {fn}), 42);
    assert.throws(() => lpe.STDLIB.apply({apply() { called = true; }}), TypeError);
    assert.strictEqual(called, false);
  });

  it('rejects coercible property keys without calling their conversion hook', function () {
    let conversions = 0;
    const key = {toString() { conversions++; return 'constructor'; }};
    for (const form of ['get_in(obj, key)', 'get(obj, key)', 'obj ~> (key)', 'set(obj, key, 1)']) {
      assert.throws(() => evaluate(form, {obj: {}, key}), denied);
    }
    assert.strictEqual(conversions, 0);
  });

  it('never invokes an own getter while traversing data', function () {
    let called = 0;
    const obj = Object.defineProperty({}, 'x', {enumerable: true, get() { called++; return Function; }});
    for (const form of ['get_in(obj, "x")', 'get(obj, "x")', 'obj.x', 'obj ~> x',
      'values(obj)', 'Object ~> values(obj)', 'Object ~> entries(obj)']) {
      assert.throws(() => evaluate(form, {obj}), denied);
    }
    assert.strictEqual(called, 0);
  });

  it('does not consult inherited data, getters, or shadowed hasOwnProperty', function () {
    let called = 0;
    const parent = Object.defineProperty({inherited: 7}, 'x', {get() { called++; return 8; }});
    const obj = Object.assign(Object.create(parent), {own: 42, hasOwnProperty() { called++; return true; }});
    assert.strictEqual(evaluate('get_in(obj, "inherited")', {obj}), undefined);
    assert.strictEqual(evaluate('get_in(obj, "x")', {obj}), undefined);
    assert.strictEqual(evaluate('get(obj, "own")', {obj}), 42);
    assert.strictEqual(called, 0);
  });

  it('traverses arrays and strings as data, without a second evaluation', function () {
    let calls = 0;
    const context = {items: ['probe', 42], text: 'other', other: ['wrong'], probe() { calls++; }};
    assert.strictEqual(evaluate('get_in(items, 1)', context), 42);
    assert.strictEqual(evaluate('get_in(text, 0)', context), 'o');
    assert.strictEqual(calls, 0);
    assert.throws(() => lpe.eval_lisp(['get_in', 'items', ['$AST$', [['probe']]]], context), denied);
    assert.strictEqual(calls, 0);
  });

  it('preserves quoted context names, computed paths, own undefined, and Unicode indexing', function () {
    const context = {obj: {a: [null, {b: 42}]}, path: ['a', 1, 'b']};
    assert.strictEqual(evaluate('get_in(obj, path)', context), 42);
    assert.strictEqual(evaluate('get_in("obj", ["a", 1, "b"])', context), 42);
    assert.strictEqual(evaluate('get_in(obj, "missing", "x")', context), undefined);
    assert.strictEqual(evaluate('get(obj, "present", 9)', {obj: {present: undefined}}), undefined);
    assert.strictEqual(evaluate('get(obj, "missing", 9)', {obj: Object.create(null)}), 9);
    assert.strictEqual(evaluate('get_in("hello", 1)'), 'e');
    assert.strictEqual(evaluate('get_in("😀", "length")'), 2);
  });

  for (const source of [
    'set(obj, "__proto__", value)',
    'property(obj, "__proto__", value)',
    'obj.__proto__.__lpePolluted := 1',
    'assoc_in(obj, ["a", "__proto__", "__lpePolluted"], 1)',
    'update_in(obj, ["__proto__", "__lpePolluted"], x => 1)',
    'merge([obj, value])',
    'mergeDeep(obj, value)',
    'fromEntries([["__proto__", value]])',
    'Object ~> fromEntries([["__proto__", value]])',
    'Object ~> assign(obj, value)',
  ]) {
    it(`checks reserved keys during updates: ${source}`, function () {
      const obj = {};
      const value = JSON.parse('{"__proto__":{"__lpePolluted":1}}');
      assert.throws(() => evaluate(source, {obj, value}), denied);
      assert.strictEqual(Object.prototype.__lpePolluted, undefined);
      assert.deepStrictEqual(obj, {});
    });
  }

  for (const source of ['set(fn, "__isSpecialForm", true)', 'fn.__ast := [1]',
    'get(fn, "__docFunction")', 'values(fn)', 'Object ~> values(fn)',
    'map([fn], Object.values)', '[fn] ~> map(Object.values)',
    'Object ~> getOwnPropertyDescriptor(fn, "__docFunction")']) {
    it(`protects interpreter function internals: ${source}`, function () {
      assert.throws(() => evaluate(source, {fn: lpe.STDLIB.vector}), denied);
    });
  }

  it('checks callback values in exported higher-order functions', function () {
    assert.throws(() => lpe.STDLIB.map([1], Function), denied);
    assert.throws(() => lpe.STDLIB.mapArr([1], Function), denied);
    assert.throws(() => lpe.STDLIB.reduce([1], Function, 0), denied);
  });

  it('rejects code-generating functions returned by host callbacks, including promises', async function () {
    assert.throws(() => evaluate('factory()', {factory: () => Function}), denied);
    await assert.rejects(async () => evaluate('factory()', {factory: async () => Function}), denied);
    await assert.rejects(async () => evaluate('factory()', {
      factory: () => vm.runInNewContext('Promise.resolve(Function)'),
    }), denied);
    assert.strictEqual(await evaluate('identity(value) + 1', {
      value: vm.runInNewContext('Promise.resolve(41)'),
    }), 42);
  });

  it('checks implicit whenReady callbacks and their resolved values', async function () {
    let getters = 0;
    const accessor = Object.defineProperty({}, 'whenReady', {get() { getters++; return Function; }});
    assert.throws(() => evaluate('identity(value)', {value: accessor}), denied);
    assert.strictEqual(getters, 0);
    assert.throws(() => evaluate('identity(value)', {value: {whenReady: Function}}), denied);
    await assert.rejects(async () => evaluate('identity(value)', {
      value: {whenReady: () => Promise.resolve(Function)},
    }), denied);
    assert.strictEqual(await evaluate('identity(value)', {
      value: {whenReady() { return Promise.resolve(this.answer); }, answer: 42},
    }), 42);
  });

  it('does not trust a callable\'s own toString override', function () {
    const danger = Function.bind(null);
    danger.toString = () => 'function harmless() {}';
    assert.throws(() => evaluate('apply(danger)', {danger}), denied);
    assert.strictEqual(evaluate('host()', {host: () => '{ [native code] }'}), '{ [native code] }');
  });

  for (const value of [globalThis, Reflect, Function.prototype, Object.prototype,
    Array.prototype, String.prototype, Promise.prototype]) {
    it('rejects host globals and intrinsic prototypes supplied under an alias', function () {
      assert.throws(() => evaluate('value', {value}), denied);
    });
  }

  it('prevents prototype keys in bindings, parameters and object literals', function () {
    for (const source of ['{__proto__ = {x = 1}}', '{constructor = 1}',
      'apply(fn({__proto__}, 42), {})', 'let([["__proto__", obj]], 42)',
      'constructor := 42', 'undef("constructor")']) {
      assert.throws(() => evaluate(source, {obj: {}}), denied, source);
    }
  });

  it('preserves LPE closures, higher-order operations, and trusted host callbacks', function () {
    assert.strictEqual(evaluate('apply((x, y) => x + y, 20, 22)'), 42);
    assert.deepStrictEqual(evaluate('map([1, 2, 3], x => x * 2)'), [2, 4, 6]);
    assert.strictEqual(evaluate('apply(host, 21)', {host: n => n * 2}), 42);
    assert.strictEqual(evaluate('apply(factory(), 21)', {factory: () => n => n * 2}), 42);
    assert.deepStrictEqual(evaluate('[1, 2] ~> map(x => x * 2)'), [2, 4]);
    assert.strictEqual(evaluate("' abc ' ~> trim() ~> toUpperCase()"), 'ABC');
    assert.strictEqual(evaluate('obj ~> add(2)', {obj: {x: 40, add(n) { return this.x + n; }}}), 42);
    assert.deepStrictEqual(evaluate('Object ~> entries({a = 1})'), [['a', 1]]);
    assert.deepStrictEqual(evaluate('new(Array, 1, 2)'), [1, 2]);
  });

  it('keeps assoc_in paths unchanged and preserves array containers', function () {
    const obj = {}, path = ['items', 0, 'value'];
    evaluate('assoc_in(obj, path, 42)', {obj, path});
    assert.deepStrictEqual(obj, {items: [{value: 42}]});
    assert.deepStrictEqual(path, ['items', 0, 'value']);
  });

  it('copies array data without interpreting it or resolving path strings as variables', function () {
    let calls = 0;
    const context = {source: ['probe', 42], target: [], sourceKey: 1, targetKey: 'value',
      value: 'wrong', probe() { calls++; }};
    evaluate('cp([source, sourceKey], [target, targetKey])', context);
    assert.strictEqual(context.target.value, 42);
    assert.strictEqual(calls, 0);
  });

  it('preserves primitive frequency labels without object coercion', function () {
    assert.deepStrictEqual(evaluate('frequencies([true, false, true, null, undefined])'),
      {true: 2, false: 1, null: 1, undefined: 1});
    assert.throws(() => evaluate('frequencies(["__proto__"])'), denied);
  });
});
