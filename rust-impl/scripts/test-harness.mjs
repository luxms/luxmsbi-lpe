import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdtempSync, readFileSync, statSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {artifact} from './artifacts.mjs';
import {Worker, expectation, initialExpectation} from './parity.mjs';
import {encode, decode, root, fixtures, require} from './shared.mjs';
import {compatibilityScope} from './source-analysis.mjs';

test('documentation stays available in JS but is excluded from Rust parity', async () => {
  const lpe = require(resolve(root, 'dist/lpe.js'));
  const suite = fixtures();
  const inventory = JSON.parse(readFileSync(resolve(root, 'rust-impl/coverage.json'), 'utf8'));
  const extraction = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/extraction.json'), 'utf8'));
  const worker = new Worker(process.execPath, [resolve(root, 'rust-impl/scripts/js-runner.mjs')], 3000);
  try {
    for (const name of compatibilityScope.v8OnlyApis) {
      assert.ok(Object.hasOwn(lpe, name), `JS export ${name} must remain available`);
      assert.equal(suite.some(f => f.request.name === name || f.covers?.apis?.includes(name)), false, name);
      const entry = inventory.apis.find(api => api.name === name);
      assert.equal(entry?.status, 'excluded', name);
      assert.deepStrictEqual(entry.fixtures, [], name);
      assert.equal((await worker.request({op: 'api', name})).error.kind, 'ProtocolError', name);
    }
    for (const file of compatibilityScope.v8OnlyTestFiles) {
      assert.equal(suite.some(f => f.origin.startsWith(`${file}:`) || f.covers?.groups?.some(g => g.startsWith(`${file}:`))), false, file);
      const groups = inventory.testGroups.filter(group => group.file === file);
      assert.ok(groups.length > 0, file);
      assert.ok(groups.every(group => group.status === 'excluded' && !group.fixtures.length), file);
      assert.ok(extraction.excludedTestFiles.some(entry => entry.file === file), file);
      assert.equal(extraction.skipped.some(entry => entry.origin.startsWith(`${file}:`)), false, file);
    }
    assert.ok(suite.some(f => f.evidence === 'doc-example'), 'Builtin behavior examples remain interpreter tests');
    assert.ok(inventory.knownGaps.every(gap => gap.status !== 'excluded'), 'Runtime gaps must not be hidden');
  } finally { await worker.stop(); }
});

test('tagged JSON preserves undefined, exceptional numbers, nested keys and dates', () => {
  const input = {u: undefined, a: [undefined, null, NaN, Infinity, -Infinity, -0], d: new Date('2024-01-02T00:00:00.000Z')};
  assert.deepStrictEqual(decode(encode(input)), input);
  assert.deepStrictEqual(encode(() => 1), {$lpe: 'function'});
  assert.notDeepStrictEqual(encode(undefined), encode(null));
  assert.notDeepStrictEqual(encode(-0), encode(0));
  assert.throws(() => encode('\ud800'), /outside the UTF-8 protocol/);
  assert.equal(encode('\ud83d\ude00'), '\ud83d\ude00');
  assert.throws(() => decode('x\ud800y'), /outside the UTF-8 protocol/);
  assert.throws(() => decode({$lpe: 'utf16', value: [55296]}), /Unsupported tag/);
  assert.throws(() => encode({['\ud800']: 1}), /outside the UTF-8 protocol/);
  assert.throws(() => decode({['\ud800']: 1}), /outside the UTF-8 protocol/);
});
test('artifact check never writes and rejects stale or missing output', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'lpe-artifacts-'));
  const path = resolve(directory, 'artifact.json');
  try {
    assert.throws(() => artifact(path, 'expected', true), /Stale generated artifact/);
    artifact(path, 'expected', false);
    const before = statSync(path).mtimeMs;
    artifact(path, 'expected', true);
    assert.throws(() => artifact(path, 'changed', true), /Stale generated artifact/);
    assert.equal(readFileSync(path, 'utf8'), 'expected');
    assert.equal(statSync(path).mtimeMs, before);
  } finally { rmSync(directory, {recursive: true}); }
});
test('serialization refuses to hide unsupported host values and array properties', () => {
  assert.throws(() => encode(/x/), /host object/);
  assert.throws(() => encode(Object.assign([1], {x: 2})), /Named array/);
  const circular = {}; circular.self = circular;
  assert.throws(() => encode(circular), /Cyclic/);
});
test('expectations do not coerce types or conflate undefined with null', () => {
  assert.equal(expectation({ok: true, value: 1}, {ok: true, value: '1'}), false);
  assert.equal(expectation({ok: true, value: null}, {ok: true, value: {$lpe: 'undefined'}}), false);
  assert.equal(expectation({ok: false, error: {kind: 'Error', message: 'boom'}}, {ok: false, error: {kind: 'SyntaxError'}}), false);
  assert.equal(expectation({ok: false, error: {kind: 'Error', message: 'boom'}}, {ok: false, error: {messageIncludes: 'different'}}), false);
  assert.equal(expectation({ok: false, error: {kind: 'Error', message: 'boom'}}, {ok: false, error: {kind: 'Error', message: 'different'}}), false);
  assert.equal(expectation({ok: false, error: {kind: 'Error', message: 'boom'}}, {ok: false, error: {kind: 'Error', message: 'boom'}}), true);
});
test('roundtrip checks retain independent AST expectations when supplied', () => {
  const actual = {ok: true, value: ['+', 1, 2]};
  assert.equal(initialExpectation(actual, {kind: 'roundtrip', expected: {ok: true, relation: 'stable cycles'}}), true);
  assert.equal(initialExpectation(actual, {kind: 'roundtrip', expected: {ok: true, value: ['+', 1, 2]}}), true);
  assert.equal(initialExpectation(actual, {kind: 'roundtrip', expected: {ok: true, value: ['-', 1, 2]}}), false);
  assert.equal(initialExpectation({ok: false}, {kind: 'roundtrip', expected: {ok: true, relation: 'stable cycles'}}), false);
});
test('coverage probes reject wrong calendar results and invalid requests', async () => {
  const worker = new Worker(process.execPath, [resolve(root, 'rust-impl/scripts/js-runner.mjs')], 3000);
  try {
    for (const [check, source] of [
      ['utc-date', '"1900-01-01"'], ['utc-year-prefix', '"1900-01-01"'],
      ['utc-week', '{"1900-01-01", "1900-01-07"}'], ['utc-extend-five', '{"1900-01-01", "1900-01-06"}'],
    ]) assert.deepStrictEqual(await worker.request({op: 'api', name: 'calendarInvariant', check, source}), {ok: true, value: false});
    for (const request of [
      {op: 'api', name: 'calendarInvariant', check: 'unknown', source: 'today()'},
      {op: 'api', name: 'syntaxDiagnostic', source: '1 + 2'},
      {op: 'api', name: 'exportType', export: 'makeDoc'},
      {op: 'evalAst', ast: ['testFunc', 1], hostFixtures: ['vararg-probe'], vararg: {template: ['a'], result: ['arg', 0, 'calls', 101]}},
    ]) assert.equal((await worker.request(request)).error?.kind, 'ProtocolError');
  } finally { await worker.stop(); }
});
test('worker rejects malformed output, crashes, missing executables and hangs', async () => {
  for (const [command, argv, pattern] of [
    [process.execPath, ['-e', 'process.stdin.on("data",()=>console.log("not-json"))'], /Invalid worker response/],
    [process.execPath, ['-e', 'process.stdin.on("data",()=>console.log("{}"))'], /Malformed response/],
    [process.execPath, ['-e', 'process.exit(3)'], /Worker exited/],
    [process.execPath, ['-e', 'setInterval(()=>{},1000)'], /timeout/],
    [resolve(root, 'rust-impl/no-such-executable'), [], /ENOENT/],
  ]) {
    const worker = new Worker(command, argv, 500);
    try { await assert.rejects(worker.request({op: 'parse', source: '1'}), pattern); }
    finally { await worker.stop(); }
  }
});
test('JS worker preserves omitted options, undefined arguments and repeated requests', async () => {
  const worker = new Worker(process.execPath, [resolve(root, 'rust-impl/scripts/js-runner.mjs')], 3000);
  try {
    assert.deepStrictEqual(await worker.request({op: 'eval', source: 'missing'}), {ok: true, value: 'missing'});
    assert.deepStrictEqual(await worker.request({op: 'eval', source: 'missing', options: {}}), {ok: true, value: {$lpe: 'undefined'}});
    assert.deepStrictEqual(await worker.request({op: 'parse', source: 'f(,1)'}), {ok: true, value: ['f', {$lpe: 'undefined'}, 1]});
    assert.deepStrictEqual(await worker.request({op: 'parse', source: "'\\u2028\\u2029'"}), {ok: true, value: ["'", '\u2028\u2029']});
    for (let n = 0; n < 2; n++) assert.deepStrictEqual(await worker.request({op: 'eval', source: 'counter()', hostFixtures: ['counter']}), {ok: true, value: 1});
    assert.deepStrictEqual(await worker.request({op: 'eval', source: 'asyncDouble(21)', hostFixtures: ['async']}), {ok: true, value: 42});
    assert.equal((await worker.request({op: 'eval', source: '1', hostFixtures: ['unknown']})).error.kind, 'ProtocolError');
  } finally { await worker.stop(); }
});
