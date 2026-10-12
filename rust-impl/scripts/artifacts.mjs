import {existsSync, readFileSync, writeFileSync} from 'node:fs';

// Generation and checking use the identical serialization path.
export function artifact(path, contents, check = process.argv.includes('--check')) {
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== contents) {
      throw new Error(`Stale generated artifact: ${path}. Run generate-fixtures.mjs without --check.`);
    }
  } else writeFileSync(path, contents);
}
