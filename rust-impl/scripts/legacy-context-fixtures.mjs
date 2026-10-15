// Regeneration requires explicit, unmodified 1.6.7 JS artifacts. Rust tests
// consume the checked-in fixture and never load JS or an external checkout.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.join('=') || true];
}));
for (const flag of ['bundle', 'reference', 'version-file']) {
  assert.equal(typeof args[flag], 'string', `Supply --${flag}=PATH`);
}
assert.equal(JSON.parse(readFileSync(args['version-file'], 'utf8')).version, '1.6.7');
const load = path => {
  const source = readFileSync(path, 'utf8');
  const script = new Script(source, {filename: 'legacy-1.6.7.js'});
  return {
    sha256: createHash('sha256').update(source).digest('hex'),
    fresh() {
      const module = {exports: {}};
      script.runInNewContext({module, exports: module.exports, require: createRequire(resolve(path)), console});
      return module.exports;
    },
  };
};
const bundle = load(args.bundle);
const reference = load(args.reference);
const implementations = [bundle.fresh(), reference.fresh()];
const undefinedTag = {$lpe: 'undefined'};
const encode = value => {
  if (value === undefined) return undefinedTag;
  if (typeof value === 'function') return {$lpe: 'function'};
  if (Array.isArray(value)) return Array.from(value, encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  return value;
};
const decode = value => value?.$lpe === 'undefined' ? undefined : value;
const q = value => ['q', value];
const undef = ['get', {}, q('missing')];
const cases = [];
const outcome = run => {
  try { return {value: encode(run())}; }
  catch (error) { return {error: error.message}; }
};
function astCase(id, ast, context = {}, options = {resolveString: true}) {
  const outcomes = implementations.map(impl => outcome(() => impl.eval_lisp(structuredClone(ast), structuredClone(context), options)));
  assert.deepEqual(outcomes[0], outcomes[1], id);
  cases.push({id, kind: 'ast', ast, context, options, expected: outcomes[0]});
}
for (const resolveString of [true, false]) {
  for (const disallowLibFunctionsGetting of [true, false]) {
    const options = {resolveString, disallowLibFunctionsGetting};
    const suffix = `${resolveString}/${disallowLibFunctionsGetting}`;
    for (const name of ['add', 'fn']) {
      astCase(`bare-library/${name}/${suffix}`, name, {}, options);
      astCase(`raw-library/${name}/${suffix}`, ['resolve', name], {}, options);
    }
    astCase(`bare-closure/${suffix}`, ['let', [['f', ['fn', [], 4]]], 'f'], {}, options);
    astCase(`raw-closure/${suffix}`, ['let', [['f', ['fn', [], 4]]], ['resolve', 'f']], {}, options);
    astCase(`call-closure/${suffix}`, ['let', [['f', ['fn', [], 4]]], ['f']], {}, options);
    astCase(`missing/${suffix}`, 'x', {}, options);
    for (const [label, value] of [['number', 2], ['null', null], ['false', false], ['zero', 0]]) {
      for (const argument of ['missing', 'undefined']) {
        const ast = [['fn', ['x'], 'x'], ...(argument === 'missing' ? [] : [undef])];
        astCase(`closure-${argument}/${label}/${suffix}`, ast, {x: value}, options);
      }
      astCase(`let-undefined/${label}/${suffix}`, ['let', [['x', undef]], 'x'], {x: value}, options);
      astCase(`let-null/${label}/${suffix}`, ['let', [['x', null]], 'x'], {x: value}, options);
    }
  }
}
for (const op of ['def', 'assign', ':=']) {
  astCase(`${op}/new`, [op, 'x', 8]);
  astCase(`${op}/new-readback`, ['list', ['begin', [op, 'x', 8]], 'x']);
  for (const value of [2, null, false, 0, 'x']) {
    astCase(`${op}/existing/${JSON.stringify(value)}`, [op, 'x', 8], {x: value});
    astCase(`${op}/undefined-shadow/${JSON.stringify(value)}`,
      ['list', ['let', [['x', undef]], [op, 'x', 8]], 'x'], {x: value});
  }
  astCase(`${op}/rhs-once`, ['list', ['begin', [op, 'x', ['begin', ['assign', 'n', ['+', 'n', 1]], 8]]], 'n'], {x: 2, n: 0});
  astCase(`${op}/rhs-creates-target`, [op, 'x', ['begin', ['def', 'x', 3], 8]]);
  astCase(`${op}/read-sentinel`, [op, 'x', undef], {x: 2});
  astCase(`${op}/missing-rhs`, [op, 'x'], {x: 2});
  astCase(`${op}/missing-rhs-absent`, [op, 'x']);
  astCase(`${op}/function-read`, ['let', [['f', ['fn', [], 4]]], [op, 'f', undef]]);
  astCase(`${op}/function-write`, ['let', [['f', ['fn', [], 4]]], [op, 'f', 8]]);
  astCase(`${op}/function-param-write`, ['list', [['fn', ['x'], [op, 'x', 8]], undef], 'x'], {x: 2});
  astCase(`${op}/override`, ['let', [[op, ['fn', ['a', 'b'], ['+', 'a', 'b']]]], [op, 2, 3]]);
}
astCase('property-assignment', ['let', [['o', {}]], ['list', ['assign', ['.', 'o', q('x')], 8], 'o']]);
astCase('function-setter-via-eval-ast', ['eval_ast', ['list', q('let'),
  ['fn', ['name', 'value'], ['if', ['=', 'name', q('x')], ['if', ['=', 'value', undef], 4, 9], undef]],
  ['`', ['list', ['def', 'x', 8], 'x']]]]);

const hostCases = [];
for (const op of ['def', 'assign', ':=']) {
  for (const [name, config] of Object.entries({
    direct: {},
    nested: {nested: true},
    'undefined-shadow': {shadow: 'undefined'},
    'null-shadow': {shadow: 'null'},
    absent: {getter: [undefinedTag]},
    'absent-nested': {getter: [undefinedTag], nested: true},
    'getter-changes': {getter: [4, undefinedTag], nested: true},
    'rhs-before-getter': {rhsUpdatesGetter: true},
    'undefined-read': {read: true},
    'undefined-read-nested': {read: true, nested: true},
    'missing-rhs': {missingRhs: true},
    'setter-null': {setter: null},
    'setter-false': {setter: false},
    'setter-undefined': {setter: undefinedTag},
    'getter-null': {getter: [null]},
    'getter-false': {getter: [false]},
    'rhs-error': {error: 'rhs'},
    'getter-error': {error: 'get'},
    'setter-error': {error: 'set'},
  })) hostCases.push({id: `${op}/host-${name}`, op, ...config});
}
function observeHost(impl, config) {
  const events = [];
  let reads = 0;
  let written;
  let getter = (config.getter ?? [4]).map(decode);
  const rhs = () => {
    events.push({event: 'rhs'});
    if (config.error === 'rhs') throw new Error('rhs failure');
    if (config.rhsUpdatesGetter) getter = [6];
    return 8;
  };
  const context = (name, value, options) => {
    if (name === 'rhs') return rhs;
    if (name !== 'x') return undefined;
    const event = value === undefined ? 'get' : 'set';
    events.push({event, value: encode(value), options: encode(options)});
    if (config.error === event) throw new Error(`${event} failure`);
    if (event === 'get') return getter[Math.min(reads++, getter.length - 1)];
    written = value;
    return decode(Object.hasOwn(config, 'setter') ? config.setter : 9);
  };
  let ast = [config.op, 'x', ...(config.missingRhs ? [] : [config.read ? undef : ['rhs']])];
  if (config.nested || config.shadow) {
    ast = ['let', [[config.shadow ? 'x' : 'unused', config.shadow === 'null' ? null : undef]], ast];
  }
  const expected = outcome(() => impl.eval_lisp(ast, context));
  return {...expected, events, written: encode(written)};
}
for (const config of hostCases) {
  const outcomes = implementations.map(impl => observeHost(impl, config));
  assert.deepEqual(outcomes[0], outcomes[1], config.id);
  cases.push({...config, kind: 'host', expected: outcomes[0]});
}

// Independent module instances keep library mutation out of every parity case.
const libraryMutation = [bundle.fresh(), reference.fresh()].map(impl => outcome(() =>
  impl.eval_lisp(['list', ['let', [], ['def', 'add', 8]], 'add'])));
assert.deepEqual(libraryMutation[0], libraryMutation[1]);
const listAssignmentAst = ['list', [':=', 'x', 8], 'x'];
const listAssignment = implementations.map(impl => outcome(() => impl.eval_lisp(structuredClone(listAssignmentAst), {})));
assert.deepEqual(listAssignment[0], listAssignment[1]);
// Review the 1.6.7 stream boundary separately, without changing the 218 cases.
function observeStreamAssignment(impl, op) {
  const events = [];
  const source = {stream: true, value: 2};
  const context = {input: source, bound: 0};
  const adapter = {
    isStream: value => value?.stream === true,
    getLastValue: stream => stream.value,
    createStream: value => ({stream: true, value}),
    retain: () => events.push('retain'),
    release: () => events.push('release'),
    subscribe: () => { events.push('subscribe'); return {dispose() {}}; },
    next: (stream, value) => { stream.value = value; },
  };
  const result = impl.eval_lisp([op, 'bound', 'input'], context, {streamAdapter: adapter});
  adapter.next(source, 6);
  return {sameResult: result === source, sameBinding: context.bound === source, value: context.bound.value, events};
}
const streamAssignments = ['def', 'assign', ':='].map(op => {
  const observations = implementations.map(impl => observeStreamAssignment(impl, op));
  assert.deepEqual(observations[0], observations[1], `stream ${op}`);
  return {op, expected: observations[0]};
});
const fixture = {
  provenance: {
    jsVersion: '1.6.7',
    bundle: {label: 'lpe-sql dist/lpe.js', sha256: bundle.sha256},
    reference: {label: '@luxms/lpe 1.6.7 dist/lpe.js', sha256: reference.sha256},
    observations: 'Executed unmodified JS, without rewriting sources. Function/undefined results use portable output tags.',
  },
  libraryMutation: {js: libraryMutation[0], nativePolicy: 'Unsupported; library frames are read-only in this opt-in profile.'},
  streamAssignments,
  boundaries: [{
    id: 'list-leading-assignment', ast: listAssignmentAst, js: listAssignment[0],
    native: {value: [undefinedTag, 8]},
    reason: 'JS list leading := syntax is outside the context profile; ordinary variable assignment is covered separately.',
  }],
  cases,
};
const target = fileURLToPath(new URL('../fixtures/legacy-context.json', import.meta.url));
if (args.write) writeFileSync(target, `${JSON.stringify(fixture, null, 2)}\n`);
else assert.deepEqual(fixture, JSON.parse(readFileSync(target, 'utf8')));
console.log(`${cases.length} JS 1.6.7 observations verified against both artifacts; ${hostCases.length} effect-order cases`);
