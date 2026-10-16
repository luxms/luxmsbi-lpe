// Differential source oracle. Legacy artifacts are explicit and read-only;
// modern JS comes from this worktree's normal build. Rust consumes only JSON.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.join('=') || true];
}));
for (const flag of ['bundle', 'reference', 'version-file']) {
  assert.equal(typeof args[flag], 'string', `Supply --${flag}=PATH`);
}
assert.equal(JSON.parse(readFileSync(args['version-file'], 'utf8')).version, '1.6.7');
const root = fileURLToPath(new URL('../../', import.meta.url));
assert.equal(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version, '1.7.3');
const require = createRequire(import.meta.url);
const load = path => ({
  impl: require(resolve(path)),
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
});
const bundle = load(args.bundle);
const reference = load(args.reference);
const modern = load(resolve(root, 'dist/lpe.js'));
const encode = value => {
  if (value === undefined) return {$lpe: 'undefined'};
  if (typeof value === 'function') return {$lpe: 'function'};
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [key, encode(value)]));
  assert.ok(typeof value !== 'number' || Number.isFinite(value));
  return value;
};
const q = value => ['q', value];
const fn = (body, params = []) => ['fn', params, body];
const closure = (name, body, params = []) => name === 'fn' ? fn(body, params)
  : ['=>', 'lambda'].includes(name) ? [name, ['tuple', ...params], body]
    : [name, body, ...params];
function observe(impl, ast, options) {
  const events = [];
  const context = {mark: value => { events.push(encode(value)); return value; }};
  try {
    return {value: encode(impl.eval_lisp(structuredClone(ast), context, options)), events};
  } catch (error) {
    // JS prefixes noncallable messages with "Error: "; native uses its kind.
    const message = String(error?.message ?? error).replace(/^Error: (?=.* is not a function$)/, '');
    return {error: message, events};
  }
}
const cases = [];
function add(id, ast, options) {
  const legacy = observe(bundle.impl, ast, options);
  assert.deepEqual(legacy, observe(reference.impl, ast, options), `${id}: legacy artifacts disagree`);
  cases.push({id, ast, options, legacy, modern: observe(modern.impl, ast, options)});
}
for (const resolveString of [true, false]) {
  const options = {resolveString, disallowLibFunctionsGetting: true, maxLoopIterations: 100};
  for (const name of ['fn', '->fn', 'toFn', 'defFn', '=>', 'lambda']) {
    const make = (body, params) => closure(name, body, params);
    const variants = {
      scalar: [make(['+', 2, 3])],
      'returned-fn': [make(fn(7))],
      'forwarded-arguments': [make(fn('n', ['n'])), 9],
      'captured-scope': [make(fn(['+', 'x', 1]), ['x']), 4],
      'explicit-second-call': [[make(fn(7))]],
      'outer-error': [make(['throw', q('outer failure')])],
      'deferred-error': [make(fn(['throw', q('inner failure')]))],
      'effect-order': [make(['begin', ['mark', q('outer')],
        fn(['begin', ['mark', q('inner')], 7])])],
      'argument-once': [make(fn(['mark', 'x']), ['x']), ['mark', 4]],
      'returned-library': [make(['resolve', '+']), 2, 3],
      'returned-host': [make(['resolve', 'mark']), 9],
      'nested-functions': [make(fn(fn(7)))],
    };
    for (const [variant, ast] of Object.entries(variants)) {
      add(`${name}/${variant}/resolve-${resolveString}`, ast, options);
    }
  }
  const sum = fn(['+', 'a', 'b'], ['a', 'b']);
  add(`lexical-AST-parameter/resolve-${resolveString}`,
    [[fn(fn(['$AST$', 2, 3]), ['$AST$']), sum]], options);
  add(`quoted-factory/resolve-${resolveString}`, ['`', [fn(fn(7))]], options);
  add(`returned-function-in-container/resolve-${resolveString}`, ['list', [fn(fn(7))], 9], options);
}
const result = {
  provenance: {
    legacyVersion: '1.6.7', modernVersion: '1.7.3',
    baseRevision: 'e8320de1a86aaaebe218a4f467aba44dc58daab7',
    bundleSha256: bundle.sha256, referenceSha256: reference.sha256, modernSha256: modern.sha256,
  },
  contract: 'Only legacy fn returns callable results directly; aliases and the modern profile auto-call.',
  cases,
};
const fixture = new URL('../fixtures/closure-return.json', import.meta.url);
if (args.write) writeFileSync(fixture, `${JSON.stringify(result, null, 2)}\n`);
else assert.deepEqual(result, JSON.parse(readFileSync(fixture, 'utf8')));
console.log(`${cases.length} cases; ${cases.length * 2} legacy/modern outcomes verified`);
