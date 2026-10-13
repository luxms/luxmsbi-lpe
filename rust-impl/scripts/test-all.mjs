import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const report = 'rust-impl/reports/parity.json';
mkdirSync(new URL('../reports/', import.meta.url), {recursive: true});

const commands = [
  [process.execPath, ['node_modules/webpack-cli/bin/cli.js'], true],
  [process.execPath, ['rust-impl/scripts/test-js.cjs']],
  [process.execPath, ['--test', 'rust-impl/scripts/test-harness.mjs', 'rust-impl/scripts/test-coverage.mjs', 'rust-impl/scripts/test-production-layout.mjs']],
  ['cargo', ['test', '--locked', '--no-fail-fast', '--manifest-path', 'rust-impl/Cargo.toml', '-p', 'regress']],
  ['cargo', ['test', '--locked', '--no-fail-fast', '--manifest-path', 'rust-impl/Cargo.toml']],
  ['cargo', ['test', '--locked', '--manifest-path', 'rust-impl/Cargo.toml', '--test', 'parser', '--', '--ignored']],
  ['cargo', ['test', '--locked', '--manifest-path', 'rust-impl/Cargo.toml', '--test', 'builtins', 'regex_audit_against_current_javascript', '--', '--ignored']],
  ['cargo', ['test', '--locked', '--manifest-path', 'rust-impl/Cargo.toml', '--test', 'streams-async', '--', '--ignored']],
  ['cargo', ['run', '--locked', '--manifest-path', 'rust-impl/Cargo.toml', '--example', 'embedding']],
  ['cargo', ['build', '--locked', '--manifest-path', 'rust-impl/Cargo.toml', '--bin', 'lpe'], true],
  [process.execPath, ['rust-impl/scripts/metadata.mjs', '--check']],
  [process.execPath, ['rust-impl/scripts/generate-fixtures.mjs', '--check']],
  [process.execPath, ['rust-impl/scripts/parity.mjs', '--report', report]],
  [process.execPath, ['rust-impl/scripts/coverage.mjs', '--report', report, '--require-complete']],
];

let failed = false;
for (const [command, args, prerequisite] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit'});
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) {
    failed = true;
    if (prerequisite) break;
  }
  if (result.signal) break;
}
process.exitCode = failed ? 1 : 0;
