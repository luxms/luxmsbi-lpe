const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(require.resolve('../dist/lpe'), 'utf8');
const normalize = value => JSON.parse(JSON.stringify(value));

function fresh() {
  // A separate realm also isolates the native constructors included in STDLIB.
  const exports = {};
  const context = vm.createContext({module: {exports}, exports, console});
  vm.runInContext(`
    globalThis.docScans = 0;
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function () {
      if (this.lpeName !== undefined) docScans++;
      return originalToString.call(this);
    };
  `, context);
  vm.runInContext(source, context, {timeout: 2000});
  return {lpe: context.module.exports, context};
}

function docsWithoutIndices(lpe) {
  const docs = normalize(Object.fromEntries(Object.entries(lpe.STDLIB)
    .filter(([, fn]) => typeof fn === 'function')
    .map(([name, fn]) => [name, {lpeName: fn.lpeName, doc: fn._doc}])));
  for (const entry of Object.values(docs)) {
    for (const doc of Object.values(entry.doc || {})) {
      delete doc.index;
    }
  }
  return docs;
}

describe('Prebuilt function documentation', () => {
  it('loads documentation as data without parsing documented functions on import', () => {
    const {lpe, context} = fresh();
    assert.strictEqual(context.docScans, 0);
    assert.strictEqual(Object.getOwnPropertyDescriptor(lpe.STDLIB.add, '_doc').get, undefined);
    assert.strictEqual(lpe.STDLIB.add._doc, lpe.DOC.STDLIB.add);
    assert.strictEqual(lpe.findDoc('STDLIB', 'add'), lpe.STDLIB.add._doc);
  });

  it('does not initialize docs when evaluating ordinary expressions', () => {
    const {lpe, context} = fresh();
    assert.strictEqual(lpe.eval_lpe('add(1, 2, 3)'), 6);
    assert.strictEqual(context.docScans, 0);
  });

  it('shares embedded documentation between aliases without parsing sources', () => {
    const {lpe, context} = fresh();
    const doc = lpe.STDLIB.add._doc;
    assert.ok(doc.ru.description);
    assert.ok(doc.en.description);
    assert.strictEqual(lpe.STDLIB.plus._doc, doc);
    assert.strictEqual(lpe.STDLIB['+']._doc, doc);
    assert.strictEqual(context.docScans, 0);
    assert.strictEqual(Object.getOwnPropertyDescriptor(lpe.STDLIB.add, '_doc').writable, true);
  });

  it('preserves an explicit assignment before the first read', () => {
    const {lpe, context} = fresh();
    const doc = {ru: {names: ['custom']}};
    lpe.STDLIB.add._doc = doc;
    assert.strictEqual(lpe.STDLIB.plus._doc, doc);
    assert.strictEqual(context.docScans, 0);
  });

  it('allows mutation, replacement and deletion after initialization', () => {
    const {lpe} = fresh();
    lpe.STDLIB.add._doc.ru.names = ['add', 'plus'];
    assert.deepStrictEqual(lpe.STDLIB.plus._doc.ru.names, ['add', 'plus']);
    const replacement = {ru: {description: 'Replacement'}};
    lpe.STDLIB.add._doc = replacement;
    assert.strictEqual(lpe.STDLIB.add._doc, replacement);
    delete lpe.STDLIB.add._doc;
    assert.strictEqual(lpe.STDLIB.add._doc, undefined);
  });

  it('returns fresh documentation from explicit makeDoc without replacing embedded docs', () => {
    const {lpe, context} = fresh();
    const embedded = lpe.STDLIB.add._doc;
    const doc = lpe.makeDoc('STDLIB', lpe.STDLIB.add);
    assert.strictEqual(context.docScans, 1);
    assert.ok(doc.ru.description);
    assert.notStrictEqual(doc, embedded);
    assert.strictEqual(lpe.STDLIB.add._doc, embedded);
  });

  it('does not scan sources for missing documentation', () => {
    const {lpe, context} = fresh();
    const fn = lpe.STDLIB['$$CONTEXT_NAME$$'];
    assert.strictEqual(fn._doc, undefined);
    assert.strictEqual(fn._doc, undefined);
    assert.strictEqual(context.docScans, 0);
    assert.strictEqual(lpe.findDoc('MISSING', 'unknown'), undefined);
    assert.strictEqual(lpe.DOC_WARNINGS.NODOC['STDLIB.$$CONTEXT_NAME$$'], undefined);
  });

  it('preserves content regardless of the first-read order', () => {
    const first = fresh().lpe;
    const second = fresh().lpe;
    for (const fn of Object.values(second.STDLIB).reverse()) {
      if (typeof fn === 'function') void fn._doc;
    }
    assert.deepStrictEqual(docsWithoutIndices(first), docsWithoutIndices(second));
    assert.deepStrictEqual(normalize(first.DOC_WARNINGS), normalize(second.DOC_WARNINGS));
  });

  it('assigns unique indices to parsed documents, shared by aliases', () => {
    const {lpe} = fresh();
    const docs = new Set();
    for (const fn of Object.values(lpe.STDLIB).reverse()) {
      if (typeof fn !== 'function') continue;
      for (const doc of Object.values(fn._doc || {})) {
        if (doc) docs.add(doc);
      }
    }
    assert.strictEqual(new Set([...docs].map(doc => doc.index)).size, docs.size);
  });

  it('does not regenerate build diagnostics when embedded docs are read', () => {
    const {lpe} = fresh();
    assert.strictEqual(Object.keys(lpe.DOC_WARNINGS.NODOC).length, 0);
    docsWithoutIndices(lpe);
    assert.strictEqual(Object.keys(lpe.DOC_WARNINGS.NODOC).length, 0);
  });

  it('preserves SQL metadata and tags when documenting another function', () => {
    const {lpe} = fresh();
    function source() {
      /**
       * SQL metadata test.
       * @support postgresql clickhouse
       * @sqlize (1, 0) => 1
       */
    }
    source.lpeName = 'sqlTest';
    source.__docTags = ['test'];
    const target = () => 42;
    const doc = lpe.makeDoc('TEST', target, source);
    assert.strictEqual(target._doc, undefined);
    assert.deepStrictEqual(normalize(doc.ru.support), ['postgresql', 'clickhouse']);
    assert.deepStrictEqual(normalize(doc.ru.sqlize), [{argsType: [true, false], returnType: true}]);
    assert.deepStrictEqual(normalize(doc.ru.tags), ['test']);
  });
});
