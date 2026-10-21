const assert = require('assert');
const lpe = require('../dist/lpe');
const denied = error => error?.code === 'LPE_SECURITY';
const unsafe = (source, context) => lpe.eval_lpe(source, context, {unsafe: true});

describe('Host-controlled unsafe evaluation', () => {
  for (const source of [
    "get_in('', 'constructor', 'constructor')",
    "''.constructor.constructor",
    "'' ~> constructor ~> constructor",
    "'' ~> ('con' + 'structor') ~> constructor",
  ]) {
    it(`permits trusted access only: ${source}`, () => {
      assert.strictEqual(unsafe(source)('return 42')(), 42);
      assert.throws(() => lpe.eval_lpe(source), denied);
      assert.throws(() => lpe.eval_lpe(source, {}, {unsafe: false}), denied);
      assert.throws(() => lpe.eval_lpe(source, {}, {unsafe: 'true'}), denied);
    });
  }

  it('supports globals, accessors, inherited methods and bound callbacks', () => {
    class Service {
      get value() { return 40; }
      add(n) { return this.value + n; }

    }
    const service = new Service();
    assert.strictEqual(unsafe('window', {window: globalThis}), globalThis);
    assert.strictEqual(unsafe('service.value', {service}), 40);
    // Method receiver is a plain instance without implicit whenReady unboxing.
    const method = Object.create({value: 40, add(n) { return this.value + n; }});
    assert.strictEqual(unsafe('service ~> add(2)', {service: method}), 42);
    assert.strictEqual(unsafe('host(2)', {host: service.add.bind(service)}), 42);
    class AsyncService { whenReady() { return Promise.resolve(42); } }
    return unsafe('identity(service)', {service: new AsyncService()}).then(value => assert.strictEqual(value, 42));
  });

  it('allows native compilation in trusted higher-order calls', () => {
    const expression = "map([1], apply(get_in('', 'constructor', 'constructor'), 'return 42'))";
    assert.deepStrictEqual(unsafe(expression), [42]);
    assert.throws(() => lpe.eval_lpe(expression), denied);
    assert.strictEqual(lpe.eval_lisp(lpe.parse('window'), {window: globalThis}, {unsafe: true}), globalThis);
    assert.deepStrictEqual(unsafe('[window]', {window: globalThis}), [globalThis]);
  });

  for (const source of [
    "set_options({unsafe = true}, ''.constructor)",
    "set_options([['unsafe', true]], ''.constructor)",
    "set_options({unsafe = true}, eval_lpe(\"''.constructor\"))",
    "set_options({unsafe = true}, eval_ast(['property', '', 'constructor']))",
    "set_options({unsafe = true}, apply(fn([], ''.constructor)))",
    "set_options({unsafe = true}, map([1], x => ''.constructor))",
    "eval(['set_options', ['makeHash', 'unsafe', true], ['property', '', 'constructor']])",
  ]) {
    it(`cannot enable unsafe from LPE: ${source}`, () => {
      assert.throws(() => lpe.eval_lpe(source), denied);
    });
  }

  it('does not let ordinary calls supply special-form evaluation options', () => {
    let calls = 0;
    const observe = (name, _value, options) => {
      if (name !== 'probe') return undefined;
      calls++;
      return options.unsafe;
    };
    assert.throws(() => lpe.eval_lpe(
      "apply(q, ['probe', '_'], observe, {unsafe = true})", {observe},
    ), denied);
    assert.strictEqual(calls, 0);
    for (const source of [
      "map(['probe'], q)",
      "['probe'] ~> map(q)",
      "apply(eval_ast, [42], {}, {unsafe = true})",
      "apply(vector, [], {}, {unsafe = true})",
      "new(vector, [], {}, {unsafe = true})",
    ]) {
      assert.throws(() => lpe.eval_lpe(source), denied);
    }
    assert.strictEqual(lpe.eval_lisp(['q', 'probe', '_'], observe), false);
    assert.strictEqual(lpe.eval_lisp(['q', 'probe', '_'], observe, {unsafe: true}), true);
  });

  it('ignores a context variable named unsafe and preserves other set_options', () => {
    assert.throws(() => lpe.eval_lpe("''.constructor", {unsafe: true}), denied);
    assert.strictEqual(lpe.eval_lpe('set_options({resolveString = false}, unknown)'), undefined);
    assert.strictEqual(unsafe("set_options({unsafe = false}, ''.constructor)"), String);
  });

  it('retains closure mode and refuses unsafe closures or library functions in safe calls', () => {
    const fn = unsafe("() => window", {window: globalThis});
    assert.strictEqual(fn(), globalThis);
    assert.throws(() => lpe.eval_lpe('fn()', {fn}), denied);
    assert.throws(() => lpe.eval_lpe('map([1], fn)', {fn}), denied);
    const unsafeApply = unsafe('apply');
    assert.throws(() => lpe.eval_lpe('f()', {f: unsafeApply}), denied);
    const safeFn = lpe.eval_lpe("() => ''.constructor");
    assert.throws(() => unsafe('fn()', {fn: safeFn}), denied);
  });

  it('rejects unsafe then callbacks before native promise assimilation', async () => {
    let calls = 0;
    const then = unsafe('(resolve) => begin(tick(), resolve(42))', {tick: () => { calls++; }});
    for (const box of [{then}, Object.create({then})]) {
      await assert.rejects(async () => lpe.eval_lpe('begin(p, box)', {
        p: Promise.resolve(1), box,
      }), denied);
    }
    assert.strictEqual(calls, 0);
    assert.strictEqual(await unsafe('begin(p, box)', {p: Promise.resolve(1), box: {then}}), 42);
    assert.strictEqual(calls, 1);
  });

  it('rejects then accessors without running them and rejects special-form then callbacks', async () => {
    let calls = 0;
    const accessor = Object.defineProperty({}, 'then', {get() { calls++; return () => {}; }});
    for (const box of [accessor, {then: lpe.STDLIB.q}, {then: lpe.STDLIB.vector}]) {
      await assert.rejects(async () => lpe.eval_lpe('begin(p, box)', {p: Promise.resolve(1), box}), denied);
    }
    assert.strictEqual(calls, 0);
  });

  it('preserves ordinary trusted own then callbacks', async () => {
    let calls = 0;
    const box = {then(resolve) { calls++; resolve(42); }};
    assert.strictEqual(await lpe.eval_lpe('begin(p, box)', {p: Promise.resolve(1), box}), 42);
    assert.strictEqual(calls, 1);
  });

  it('isolates interleaved promises and snapshots host options', async () => {
    let resolve;
    const value = new Promise(done => { resolve = done; });
    const safeOptions = {unsafe: false}, unsafeOptions = {unsafe: true};
    const restricted = lpe.eval_lpe('identity(value)', {value}, safeOptions);
    const trusted = lpe.eval_lpe('identity(value)', {value}, unsafeOptions);
    safeOptions.unsafe = true;
    unsafeOptions.unsafe = false;
    const rejected = assert.rejects(restricted, denied);
    resolve(Function);
    await rejected;
    assert.strictEqual(await trusted, Function);
    assert.throws(() => lpe.eval_lpe("''.constructor"), denied);
  });

  it('retains unsafe mode in nested LPE evaluation after a promise', async () => {
    assert.strictEqual(await unsafe('begin(value, eval_lpe("window"))', {
      value: Promise.resolve(1), window: globalThis,
    }), globalThis);
    const value = Promise.resolve({unsafe: true});
    await assert.rejects(lpe.eval_lpe("set_options(value, ''.constructor)", {value}), denied);
  });

  it('does not leak mode into reentrant safe evaluation from a host callback', () => {
    const host = () => lpe.eval_lpe("''.constructor");
    assert.throws(() => unsafe('host()', {host}), denied);
  });
});
