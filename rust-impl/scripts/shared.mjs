import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const require = createRequire(resolve(root, 'package.json'));
export const undefinedTag = {$lpe: 'undefined'};
export const fingerprint = fixture => createHash('sha256').update(JSON.stringify([fixture.request, fixture.expected, fixture.kind || 'value'])).digest('hex');

export async function* jsonLines(stream) {
  stream.setEncoding('utf8');
  let buffered = '';
  for await (const chunk of stream) {
    buffered += chunk;
    let end;
    while ((end = buffered.indexOf('\n')) !== -1) {
      yield buffered.slice(0, end);
      buffered = buffered.slice(end + 1);
    }
  }
  if (buffered.trim()) throw new Error('Unterminated JSON request');
}

export function encode(value, seen = new Set()) {
  if (value === undefined) return undefinedTag;
  if (typeof value === 'string') {
    let lone = false;
    for (let i = 0; i < value.length; i++) {
      const unit = value.charCodeAt(i);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) i++;
        else lone = true;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) lone = true;
    }
    if (lone) throw Object.assign(new Error('Lone surrogate input/output is outside the UTF-8 protocol'), {name: 'UnsupportedEncoding'});
    return value;
  }
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
    return {$lpe: 'number', value: Object.is(value, -0) ? '-0' : String(value)};
  }
  if (typeof value === 'function') return {$lpe: 'function'};
  if (value instanceof Date) return {$lpe: 'date', value: value.toISOString()};
  if (value === null || typeof value !== 'object') {
    if (['symbol', 'bigint'].includes(typeof value)) throw new Error('Unrepresentable value');
    return value;
  }
  if (seen.has(value)) throw new Error('Cyclic value is outside tagged JSON');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Native host object is outside tagged JSON');
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.keys(value).some(k => !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= value.length)) {
      throw new Error('Named array properties are outside tagged JSON');
    }
    result = Array.from(value, item => encode(item, seen));
  } else {
    result = Object.fromEntries(Object.entries(value).map(([k, v]) => [encode(k), encode(v, seen)]));
  }
  seen.delete(value);
  return result;
}

export function decode(value) {
  if (typeof value === 'string') return encode(value);
  if (value === null || typeof value !== 'object') return value;
  if (value.$lpe === 'undefined') return undefined;
  if (value.$lpe === 'number') {
    if (!['NaN', 'Infinity', '-Infinity', '-0'].includes(value.value)) throw new Error('Invalid number tag');
    return Number(value.value);
  }
  if (value.$lpe === 'date') return new Date(value.value);
  if (value.$lpe === 'utf16') throw new Error('Unsupported tag: utf16; protocol is UTF-8 only');
  if (value.$lpe === 'function') throw new Error('Function tags are output-only');
  if (Array.isArray(value)) return value.map(decode);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [encode(k), decode(v)]));
}

export function fixtures() {
  const dir = resolve(root, 'rust-impl/fixtures');
  const cases = readdirSync(dir).filter(n => n.endsWith('.cases.json')).sort()
    .flatMap(n => JSON.parse(readFileSync(resolve(dir, n), 'utf8')));
  const ids = new Set();
  for (const fixture of cases) {
    if (!fixture.id || ids.has(fixture.id)) throw new Error(`Missing/duplicate fixture ID: ${fixture.id}`);
    ids.add(fixture.id);
    if (!fixture.origin || !fixture.group || !fixture.request || typeof fixture.expected?.ok !== 'boolean') {
      throw new Error(`Invalid fixture: ${fixture.id}`);
    }
    if (fixture.expected.ok && !Object.hasOwn(fixture.expected, 'value') && fixture.kind !== 'roundtrip') throw new Error(`Missing expectation: ${fixture.id}`);
  }
  return cases;
}

export function args(argv, valueFlags, booleanFlags = []) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (booleanFlags.includes(key)) result[key.slice(2)] = true;
    else if (valueFlags.includes(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) result[key.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${key}`);
  }
  return result;
}
