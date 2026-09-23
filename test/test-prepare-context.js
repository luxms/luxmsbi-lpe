const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

describe('prepareContext isolation', () => {
  it('preserves native functions on import and in custom contexts, including associated functions', () => {
    const exports = {};
    const context = vm.createContext({module: {exports}, exports, console});
    vm.runInContext(`
      const natives = [Array, Object, Date, Math.max];
      const before = natives.map(fn => Object.getOwnPropertyDescriptors(fn));
    `, context);
    vm.runInContext(fs.readFileSync(require.resolve('../dist/lpe'), 'utf8'), context);
    vm.runInContext(`
      function own() { return 42; }
      function associated() { return 43; }
      own.__associatedFunctions = [[associated, 'WRAPPED'], [Math.max, 'NATIVE']];
      const ctx = {$$CONTEXT_NAME$$: () => 'TEST', own, Array, Object, Date, max: Math.max};
      module.exports.prepareContext(ctx);
      module.exports.prepareContext(ctx);
      globalThis.result = {
        before, after: natives.map(fn => Object.getOwnPropertyDescriptors(fn)),
        ownName: own.name, associatedName: associated.name,
        ownValue: own(), associatedValue: associated(),
        library: ctx[module.exports.$IS_LIB$],
      };
    `, context);
    const result = context.result;
    assert.deepStrictEqual(result.after, result.before);
    assert.strictEqual(result.ownName, 'LISP_own');
    assert.strictEqual(result.associatedName, 'LISP_WRAPPED_own');
    assert.strictEqual(result.ownValue, 42);
    assert.strictEqual(result.associatedValue, 43);
    assert.strictEqual(result.library, true);
  });
});
