const {performance} = require('node:perf_hooks');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {parse, eval_lisp} = require('../../dist/lpe.js');
const cases = require('../fixtures/benchmark-inputs.json');
const iterations = Number(process.argv[2] || 10_000);
const name = process.argv[3] || 'arithmetic';
const warmup = Number(process.argv[4] ?? Math.min(iterations, 10_000));
if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1_000_000 ||
    !Number.isSafeInteger(warmup) || warmup < 0 || warmup > 1_000_000) {
  throw new Error('iterations must be 1..1000000 and warmup 0..1000000');
}
const fixture = cases.find(c => c.id === name);
if (!fixture) throw new Error('unknown benchmark case');
const source = fixture.sourceFile ? readFileSync(path.join(__dirname, '../fixtures', fixture.sourceFile), 'utf8') : fixture.source;
const ast = parse(source);
// Match Rust's untimed setup for reusable closures and lexical captures.
for (const [name, source] of Object.entries(fixture.setup || {})) {
  fixture.context[name] = eval_lisp(parse(source), fixture.context);
}
if (!fixture.parseOnly) assert.deepEqual(eval_lisp(ast, fixture.context), fixture.expected);
for (let i = 0; i < warmup; i++) {
  parse(source);
  if (!fixture.parseOnly) eval_lisp(ast, fixture.context);
}
let parsed;
let start = performance.now();
for (let i = 0; i < iterations; i++) parsed = parse(source);
const parseSeconds = (performance.now() - start) / 1000;
assert.deepEqual(parsed, ast);
const report = {case: name, iterations, warmup, parseSeconds, parsePerSecond: iterations / parseSeconds};
if (!fixture.parseOnly) {
  let value;
  start = performance.now();
  for (let i = 0; i < iterations; i++) value = eval_lisp(ast, fixture.context);
  const evalSeconds = (performance.now() - start) / 1000;
  assert.deepEqual(value, fixture.expected);
  Object.assign(report, {value, evalSeconds, evalPerSecond: iterations / evalSeconds});
}
console.log(JSON.stringify(report));
