import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from './shared.mjs';

const wasmtime = process.env.WASMTIME || 'wasmtime';
const wasm = resolve(root, 'rust-impl/target/wasm32-wasip3/release/lpe.wasm');
const lines = requests => requests.map(request => JSON.stringify(request) + '\n').join('');

function requests(input, zone = 'UTC') {
  const result = spawnSync(wasmtime, ['run', '--env', `TZ=${zone}`, wasm], {
    cwd: root, input, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(result.stdout.endsWith('\n'), 'Responses must end with a newline');
  return result.stdout.trimEnd().split('\n').map(line => JSON.parse(line));
}

test('WASI command preserves UTF-8 and isolates repeated requests', () => {
  const text = '\u041f\u0440\u0438\u0432\u0435\u0442, \u{1f600}';
  assert.deepStrictEqual(requests(lines([
    {op: 'eval', source: JSON.stringify(text)},
    {source: 'counter()', hostFixtures: ['counter']},
    {source: 'counter()', hostFixtures: ['counter']},
    {source: 'asyncDouble(21)', hostFixtures: ['async']},
  ])), [text, 1, 1, 42].map(value => ({ok: true, value})));
});

test('WASI command recovers from malformed JSON and invalid UTF-8', () => {
  const result = requests(Buffer.concat([
    Buffer.from('not json\n[]\n{"source":"'), Buffer.from([0xff]),
    Buffer.from('"}\n' + lines([{source: 'add(20,22)'}])),
  ]));
  assert.equal(result.length, 4);
  for (const response of result.slice(0, 3)) {
    assert.equal(response.ok, false);
    assert.equal(response.error.kind, 'ProtocolError');
  }
  assert.deepStrictEqual(result[3], {ok: true, value: 42});
});

test('WASI command retains size limits and excludes JS documentation APIs', () => {
  const oversized = requests(Buffer.alloc(4 * 1024 * 1024 + 1, ' '));
  assert.equal(oversized.length, 1);
  assert.equal(oversized[0].ok, false);
  assert.equal(oversized[0].error.kind, 'LimitError');
  const scope = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/scope.json'), 'utf8'));
  const result = requests(lines(scope.v8OnlyApis.map(name => ({op: 'api', name}))));
  assert.equal(result.length, scope.v8OnlyApis.length);
  for (const response of result) {
    assert.equal(response.ok, false);
    assert.equal(response.error.kind, 'ProtocolError');
  }
});

test('WASI calendar operations use UTC even when the guest receives TZ', () => {
  const input = lines([{source: 'doty("2024-06-15")'}, {source: 'isod("2024-03-11")'}]);
  const expected = [167, '2024-71'].map(value => ({ok: true, value}));
  assert.deepStrictEqual(requests(input), expected);
  assert.deepStrictEqual(requests(input, 'America/New_York'), expected);
});
