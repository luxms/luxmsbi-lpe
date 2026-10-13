import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {root} from './shared.mjs';

const wasmtime = process.env.WASMTIME || 'wasmtime';
const target = 'wasm32-wasip3';
const wasm = `rust-impl/target/${target}/release/lpe.wasm`;
const report = 'rust-impl/reports/wasm-parity.json';
mkdirSync(new URL('../reports/', import.meta.url), {recursive: true});

const commands = [
  [wasmtime, ['--version']],
  [process.execPath, ['node_modules/webpack-cli/bin/cli.js']],
  [process.execPath, ['rust-impl/scripts/generate-fixtures.mjs', '--check']],
  [process.execPath, ['--test', 'rust-impl/scripts/test-production-layout.mjs']],
  ['npm', ['run', 'build:wasm']],
  [wasmtime, ['run', `rust-impl/target/${target}/release/examples/embedding.wasm`]],
  [process.execPath, ['--test', 'rust-impl/scripts/test-wasm-protocol.mjs']],
  [process.execPath, ['rust-impl/scripts/parity.mjs', '--wasm', wasm, '--wasmtime', wasmtime, '--timeout', '15000', '--report', report]],
  [process.execPath, ['rust-impl/scripts/coverage.mjs', '--report', report, '--require-complete']],
];

for (const [command, argv] of commands) {
  console.log(`\n> ${command} ${argv.join(' ')}`);
  const result = spawnSync(command, argv, {cwd: root, stdio: 'inherit'});
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
