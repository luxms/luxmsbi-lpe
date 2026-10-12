import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {root, fixtures, args, fingerprint} from './shared.mjs';

export class Worker {
  constructor(command, argv, timeout) {
    this.timeout = timeout;
    this.stderr = '';
    this.child = spawn(command, argv, {cwd: root, env: {...process.env, TZ: 'UTC'}, stdio: ['pipe', 'pipe', 'pipe']});
    this.closed = new Promise(done => this.child.once('close', done));
    this.child.stderr.on('data', chunk => { this.stderr = (this.stderr + chunk).slice(-4000); });
    this.child.on('error', error => this.fail(error));
    this.child.stdin.on('error', error => this.fail(error));
    this.child.on('exit', (code, signal) => {
      if (!(this.stopping && code === 0 && !this.pending)) this.fail(new Error(`Worker exited (${code ?? signal}): ${this.stderr}`));
    });
    let buffered = '';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', chunk => {
      buffered += chunk;
      if (buffered.length > 16 * 1024 * 1024) { this.fail(new Error('Worker response exceeds 16 MiB')); this.child.kill('SIGKILL'); return; }
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        const line = buffered.slice(0, end);
        buffered = buffered.slice(end + 1);
        this.response(line);
      }
    });
  }
  response(line) {
    if (!this.pending) return this.fail(new Error(`Unsolicited stdout: ${line.slice(0, 200)}`));
    try {
      const value = JSON.parse(line);
      if (typeof value?.ok !== 'boolean' || (value.ok ? !Object.hasOwn(value, 'value') : typeof value.error?.kind !== 'string' || typeof value.error?.message !== 'string')) {
        throw new Error('Malformed response envelope');
      }
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      pending.resolve(value);
    } catch (error) { this.fail(new Error(`Invalid worker response: ${error.message}; ${line.slice(0, 200)}`)); }
  }
  fail(error) {
    this.error ||= error;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
  }
  request(request) {
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error(`Worker timeout after ${this.timeout}ms`));
        this.child.kill('SIGKILL');
      }, this.timeout);
      this.pending = {resolve, reject, timer};
      this.child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }
  async stop() {
    this.stopping = true;
    this.child.stdin.end();
    const timer = setTimeout(() => this.child.kill('SIGKILL'), 500);
    await this.closed;
    clearTimeout(timer);
  }
}

export function expectation(actual, expected) {
  if (actual.ok !== expected.ok) return false;
  if (expected.ok) return isDeepStrictEqual(actual.value, expected.value);
  return (!expected.error?.kind || actual.error.kind === expected.error.kind) &&
    (!Object.hasOwn(expected.error || {}, 'message') || actual.error.message === expected.error.message) &&
    (!expected.error?.messageIncludes || actual.error.message.includes(expected.error.messageIncludes));
}

export function initialExpectation(actual, fixture) {
  return fixture.kind === 'roundtrip' && !Object.hasOwn(fixture.expected, 'value')
    ? actual.ok : expectation(actual, fixture.expected);
}

export function rustWorkerCommand(cli = {}) {
  if (cli.wasm && cli.rust) throw new Error('--wasm and --rust are mutually exclusive');
  if (cli.wasmtime && !cli.wasm) throw new Error('--wasmtime requires --wasm');
  if (cli['js-only'] && (cli.wasm || cli.rust)) throw new Error('--js-only cannot select a Rust worker');
  return cli.wasm
    ? [cli.wasmtime || 'wasmtime', ['run', '--env', 'TZ=UTC', resolve(cli.wasm)]]
    : [resolve(cli.rust || resolve(root, 'rust-impl/target/debug/lpe')), []];
}

async function roundtrip(worker, fixture, initial) {
  if (!initial.ok) return {pass: false, error: 'Initial parse failed'};
  let ast = initial.value;
  let first;
  for (let cycle = 0; cycle < 3; cycle++) {
    const printed = await worker.request({op: 'deparse', ast, options: fixture.request.options});
    if (!printed.ok) return {pass: false, cycle, stage: 'deparse', actual: printed};
    if (cycle && !isDeepStrictEqual(printed.value, first)) return {pass: false, cycle, stage: 'render-stability', expected: first, actual: printed.value};
    first = printed.value;
    const parsed = await worker.request({op: 'parse', source: printed.value, options: fixture.request.options});
    if (!parsed.ok || !isDeepStrictEqual(parsed.value, initial.value)) return {pass: false, cycle, stage: 'ast-stability', expected: initial.value, actual: parsed};
    ast = parsed.value;
  }
  return {pass: true, rendered: first};
}

async function main() {
  const cli = args(process.argv.slice(2), ['--filter', '--timeout', '--rust', '--wasm', '--wasmtime', '--report', '--limit'], ['--js-only', '--help']);
  if (cli.help) {
    console.log('node rust-impl/scripts/parity.mjs [--js-only] [--filter TEXT] [--timeout MS] [--rust PATH | --wasm PATH [--wasmtime PATH]] [--report PATH] [--limit N]');
    return;
  }
  const [rustCommand, rustArgs] = rustWorkerCommand(cli);
  const timeout = Number(cli.timeout || 3000);
  if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error('Timeout must be a positive integer');
  let cases = fixtures().filter(f => !cli.filter || `${f.id} ${f.group}`.includes(cli.filter));
  if (cli.limit) {
    const limit = Number(cli.limit);
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Limit must be a positive integer');
    cases = cases.slice(0, limit);
  }
  if (!cases.length) throw new Error('No matching fixtures');
  const js = new Worker(process.execPath, [resolve(root, 'rust-impl/scripts/js-runner.mjs')], timeout);
  const rust = cli['js-only'] ? null : new Worker(rustCommand, rustArgs, timeout);
  const results = [];
  try {
    for (const fixture of cases) {
      const result = {id: fixture.id, fingerprint: fingerprint(fixture), expected: fixture.expected,
        ...(fixture.knownGap ? {knownGap: fixture.knownGap} : {})};
      try {
        result.js = await js.request(fixture.request);
        result.jsExpected = initialExpectation(result.js, fixture);
        if (fixture.kind === 'roundtrip') {
          result.jsRoundtrip = await roundtrip(js, fixture, result.js);
          result.jsExpected &&= result.jsRoundtrip.pass;
        }
        if (rust) {
          result.rust = await rust.request(fixture.request);
          result.rustExpected = initialExpectation(result.rust, fixture);
          if (fixture.kind === 'roundtrip') {
            result.rustRoundtrip = await roundtrip(rust, fixture, result.rust);
            result.rustExpected &&= result.rustRoundtrip.pass;
          }
          result.differential = result.js.ok === result.rust.ok && (result.js.ok
            ? isDeepStrictEqual(result.js.value, result.rust.value)
            : result.js.error.kind === result.rust.error.kind);
          if (fixture.kind === 'roundtrip') result.differential &&= isDeepStrictEqual(result.jsRoundtrip.rendered, result.rustRoundtrip.rendered);
        }
        result.pass = result.jsExpected && (!rust || (result.rustExpected && result.differential));
      } catch (error) {
        result.pass = false;
        result.infrastructureError = error.message;
      }
      results.push(result);
      if (!result.pass) console.error(`FAIL ${fixture.id}: ${JSON.stringify(result)}`);
      if (result.infrastructureError) break;
    }
  } finally {
    await js.stop();
    if (rust) await rust.stop();
  }
  const terminalError = js.error || rust?.error;
  if (terminalError && results.at(-1)?.pass) {
    results.at(-1).pass = false;
    results.at(-1).infrastructureError = terminalError.message;
    console.error(`Worker protocol failure: ${terminalError.message}`);
  }
  const passed = results.filter(r => r.pass).length;
  const report = {mode: rust ? 'parity' : 'js-only', rustTarget: rust ? (cli.wasm ? 'wasm32-wasip3' : 'native') : null,
    selected: cases.length, executed: results.length, passed, failed: results.length - passed,
    fixtureKinds: {valueOrError: cases.filter(f => f.kind !== 'roundtrip' && f.evidence !== 'registry-metadata').length, registryMetadata: cases.filter(f => f.evidence === 'registry-metadata').length, metamorphicRoundtrip: cases.filter(f => f.kind === 'roundtrip').length}, results};
  if (cli.report) writeFileSync(resolve(cli.report), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.mode}: ${passed}/${cases.length} passed; ${report.failed} failed; ${cases.length - results.length} not run`);
  if (passed !== cases.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(root, 'rust-impl/scripts/parity.mjs')) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
