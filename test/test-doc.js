const assert = require('assert');
const {execFileSync} = require('child_process');
const {makeDoc, DOC_WARNINGS} = require('../dist/lpe');

describe('Function documentation', () => {
  it('extracts the leading JSDoc without changing the function', () => {
    function documented() {
      /** Example documentation. */
      return 42;
    }
    documented.lpeName = 'documented';

    assert.strictEqual(makeDoc('TEST', documented), documented);
    assert.strictEqual(documented._doc.ru.description, 'Example documentation.');
    assert.strictEqual(documented(), 42);
  });

  it('skips consecutive Babel var declarations before JSDoc', () => {
    const documented = new Function('var _a, _b;\nvar _c;\n/** Example documentation. */\nreturn 42;');
    documented.lpeName = 'babelDocumented';

    makeDoc('TEST', documented);

    assert.strictEqual(documented._doc.ru.description, 'Example documentation.');
    assert.strictEqual(documented(), 42);
  });

  it('uses documentation and tags from a separate source function', () => {
    const target = () => 42;
    function source() {
      /** Separate documentation. */
    }
    source.lpeName = 'separate';
    source.__docTags = ['test'];

    assert.strictEqual(makeDoc('TEST', target, source), target);
    assert.strictEqual(target._doc.ru.description, 'Separate documentation.');
    assert.deepStrictEqual(target._doc.ru.tags, ['test']);
  });

  it('does not treat a comment after an expression as leading documentation', () => {
    const undocumented = new Function('return 42; /** Not function documentation. */');
    undocumented.lpeName = 'undocumented';

    makeDoc('TEST', undocumented);

    assert.strictEqual(undocumented._doc, undefined);
    assert.strictEqual(DOC_WARNINGS.NODOC['TEST.undocumented'], true);
  });

  it('falls back to the built-in localization when comments have been removed', () => {
    const undocumented = () => 42;
    undocumented.lpeName = 'add';

    makeDoc('STDLIB', undocumented);

    assert.ok(undocumented._doc.ru.description);
    assert.ok(undocumented._doc.en.description);
  });

  it('handles long indentation and var declarations without JSDoc in bounded time', function () {
    this.timeout(5000);
    // Isolate the synchronous regex: a Mocha timeout cannot interrupt backtracking.
    const script = `
      const assert = require('assert');
      const {makeDoc} = require(${JSON.stringify(require.resolve('../dist/lpe'))});
      for (const prefix of [' '.repeat(10000), 'var _a, _b;\\n'.repeat(1000)]) {
        const fn = new Function(prefix + 'return 42;');
        fn.lpeName = 'undocumented';
        assert.strictEqual(makeDoc('TEST', fn), fn);
        assert.strictEqual(fn._doc, undefined);
        assert.strictEqual(fn(), 42);
      }
    `;

    execFileSync(process.execPath, ['-e', script], {timeout: 2000, stdio: 'pipe'});
  });
});
