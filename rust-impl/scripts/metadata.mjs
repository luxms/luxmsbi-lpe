import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {root, require, args} from './shared.mjs';

export function functionMetadata() {
  const {STDLIB} = require(resolve(root, 'dist/lpe.js'));
  const groups = new Map();
  for (const [name, fn] of Object.entries(STDLIB)) {
    if (typeof fn !== 'function') continue;
    if (!groups.has(fn)) groups.set(fn, {canonical: fn.lpeName || name, hasLpeName: fn.lpeName !== undefined, names: []});
    groups.get(fn).names.push(name);
  }
  const list = [...groups.values()].map(group => ({...group, names: group.names.sort()})).sort((a, b) => a.canonical < b.canonical ? -1 : a.canonical > b.canonical ? 1 : 0);
  const aliases = Object.fromEntries(list.flatMap(group => group.names.map(name => [name, group.canonical])).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  return {aliases, groups: list};
}

export function writeMetadata(check = false) {
  const metadata = functionMetadata();
  const output = `${JSON.stringify(metadata.aliases, null, 2)}\n`;
  const destination = resolve(root, 'rust-impl/fixtures/aliases.json');
  if (check) {
    if (!existsSync(destination) || readFileSync(destination, 'utf8') !== output) throw new Error('Alias metadata is stale; run metadata.mjs');
  } else writeFileSync(destination, output);
  return metadata;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(root, 'rust-impl/scripts/metadata.mjs')) {
  try {
    const cli = args(process.argv.slice(2), [], ['--check']);
    const metadata = writeMetadata(cli.check);
    console.log(`${Object.keys(metadata.aliases).length} function names in ${metadata.groups.length} identity groups.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
