const {performance} = require('node:perf_hooks');
const {parse, eval_lisp} = require('../../dist/lpe.js');

const iterations = Number(process.argv[2] || 10_000);
if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1_000_000) {
  throw new Error('iterations must be between 1 and 1000000');
}
const source = 'add(mul(3,7),div(8,2))';
const ast = parse(source);
if (eval_lisp(ast) !== 25) throw new Error('Benchmark result mismatch');

let start = performance.now();
for (let i = 0; i < iterations; i++) parse(source);
const parseSeconds = (performance.now() - start) / 1000;
start = performance.now();
for (let i = 0; i < iterations; i++) eval_lisp(ast);
const evalSeconds = (performance.now() - start) / 1000;
console.log(JSON.stringify({iterations, source, parseSeconds, evalSeconds,
  parsePerSecond: iterations / parseSeconds, evalPerSecond: iterations / evalSeconds}));
