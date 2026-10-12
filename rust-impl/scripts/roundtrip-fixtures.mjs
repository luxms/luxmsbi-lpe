import {artifact as writeFileSync} from './artifacts.mjs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {root, require} from './shared.mjs';
import {parseFile, walk, callName} from './source-analysis.mjs';

const generate = require('@babel/generator').default;
const parser = require('@babel/parser');
const suite = new Map();
const omissions = [];
for (const file of ['test/test-deparse-forms-roundtrip.js', 'test/test-deparse-literals-roundtrip.js', 'test/test-deparse-operators-roundtrip.js']) {
  const ast = parseFile(file);
  walk(ast, node => {
    if (node.type === 'FunctionDeclaration' && /^assertRound[Tt]rip$/.test(node.id.name)) {
      const body = file.includes('literals') ? '__capture(source, {...parseOptions, lint});'
        : file.includes('forms') ? '__capture(source, {lint});'
          : '__capture(source, {lint:false}); __capture(source, {lint:true});';
      node.body = parser.parse(`function captured(){${body}}`).program.body[0].body;
    }
    if (node.type === 'CallExpression' && ['it', 'describe'].includes(callName(node.callee))) node.arguments.push({type: 'NumericLiteral', value: node.loc.start.line});
  });
  const stack = [];
  const context = vm.createContext({
    require: name => name === '../dist/lpe' ? require(resolve(root, 'dist/lpe.js')) : name === 'assert' ? require('node:assert') : (() => { throw new Error(`Unexpected roundtrip import ${name}`); })(),
    describe: (name, callback, line) => {
      stack.push({name, line}); callback.call({timeout() {}}); stack.pop();
    },
    it: (name, callback, line) => {
      // Direct AST normalization is covered by the separately authored
      // syntax-calendar fixtures, not the source-preserving extractor.
      if (String(name).startsWith('normalizes direct AST')) { omissions.push({origin: `${file}:${line}`, reason: 'Direct AST normalization is tested separately in syntax-calendar-coverage.mjs with independent render/AST expectations and stable cycles.'}); return; }
      stack.push({name, line}); callback.call({timeout() {}}); stack.pop();
    },
    __capture: (source, options) => {
      const hash = createHash('sha256').update(JSON.stringify([source, options])).digest('hex').slice(0, 16);
      const id = `roundtrip:${hash}`;
      const groups = stack.map(group => `${file}:${group.line}`);
      if (suite.has(id)) { suite.get(id).covers.groups = [...new Set([...suite.get(id).covers.groups, ...groups])]; return; }
      suite.set(id, {id, kind: 'roundtrip', evidence: 'upstream-metamorphic-relation', origin: `${file}:${stack.at(-1).line}`,
        group: stack.map(group => group.name).join(' / '), request: {op: 'parse', source, options}, expected: {ok: true, relation: 'three stable parse/deparse cycles'}, covers: {apis: ['parse', 'deparse'], groups}});
    },
  });
  // Only the checked-in round-trip test corpus is evaluated, with assertion
  // helpers replaced by capture. No LPE result is recorded as an expectation.
  vm.runInContext(generate(ast).code, context, {filename: file, timeout: 5000});
}
writeFileSync(resolve(root, 'rust-impl/fixtures/roundtrip.cases.json'), `${JSON.stringify([...suite.values()], null, 2)}\n`);
writeFileSync(resolve(root, 'rust-impl/fixtures/roundtrip-omissions.json'), `${JSON.stringify(omissions, null, 2)}\n`);
console.log(`Captured ${suite.size} distinct source/format round-trip relations from the existing test corpus.`);
