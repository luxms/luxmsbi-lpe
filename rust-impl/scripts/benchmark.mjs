import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import os from 'node:os';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('../fixtures/benchmark-inputs.json', import.meta.url)));
const iterations = Number(process.env.BENCH_ITERATIONS || 20000);
const repeats = Number(process.env.BENCH_REPEATS || 5);
if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1_000_000 ||
    !Number.isSafeInteger(repeats) || repeats < 1 || repeats > 30) throw new Error('Invalid benchmark limits');
function run(command, args, inherit = false) {
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe'});
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error || result.stderr || result.status}`);
  return result.stdout?.trim();
}
if (!process.env.BENCH_SKIP_BUILD) {
  run(process.execPath, ['node_modules/webpack-cli/bin/cli.js'], true);
  run('cargo', ['build', '--locked', '--release', '--manifest-path', 'rust-impl/Cargo.toml', '--example', 'benchmark'], true);
}
const report = {date: new Date().toISOString(), revision: run('git', ['rev-parse', 'HEAD']),
  dirty: Boolean(run('git', ['status', '--porcelain'])), platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model, rust: run('rustc', ['--version']), node: process.version,
  profile: 'release', iterations, repeats, cases: []};
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
for (const fixture of cases) {
  const count = Math.max(1, Math.floor(iterations * (fixture.scale || 1)));
  const warmup = Math.min(count, 10000);
  const samples = {rust: [], js: []};
  for (let sample = 0; sample < repeats; sample++) {
    // Sequential measurements; alternate order to reduce temperature/load bias.
    for (const implementation of sample % 2 ? ['js','rust'] : ['rust','js']) {
      const args = [String(count), fixture.id, String(warmup)];
      const raw = implementation === 'rust'
        ? run(process.env.BENCH_RUST_BINARY || 'rust-impl/target/release/examples/benchmark', args)
        : run(process.execPath, ['rust-impl/scripts/benchmark-js.cjs', ...args]);
      samples[implementation].push(JSON.parse(raw));
    }
  }
  const result = {id: fixture.id, iterations: count, warmup, samples};
  for (const phase of fixture.parseOnly ? ['parse'] : ['parse','eval']) {
    const rust = samples.rust.map(s => s[`${phase}Seconds`] / count * 1e6);
    const js = samples.js.map(s => s[`${phase}Seconds`] / count * 1e6);
    result[phase] = {rustMedianUs: median(rust), jsMedianUs: median(js), speedup: median(js)/median(rust),
      rustRangeUs: [Math.min(...rust),Math.max(...rust)], jsRangeUs: [Math.min(...js),Math.max(...js)]};
  }
  report.cases.push(result);
  console.log(`${fixture.id}: parse ${result.parse.speedup.toFixed(2)}x${result.eval ? `, eval ${result.eval.speedup.toFixed(2)}x` : ''} (JS time / Rust time)`);
}
mkdirSync(new URL('../reports/', import.meta.url), {recursive: true});
const destination = process.env.BENCH_REPORT || 'rust-impl/reports/benchmark.json';
writeFileSync(new URL(destination, new URL('../../', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
console.log(`Report: ${destination}`);
if (process.argv.includes('--require-parity') && report.cases.some(c => c.parse.speedup < 1 || (c.eval && c.eval.speedup < 1))) {
  process.exitCode = 1;
}
