import {readFileSync} from 'node:fs';
import {artifact as writeFileSync} from './artifacts.mjs';
import {resolve} from 'node:path';
import {root, encode, require, args} from './shared.mjs';
import {parseFile, parseExpression, callName, literal, sourceFiles, testFiles, RequestReference, compatibilityScope} from './source-analysis.mjs';
import {writeMetadata} from './metadata.mjs';

const cli = args(process.argv.slice(2), [], ['--check']);
writeMetadata(cli.check);

const cases = [];
const skipped = [];
const groups = [];
const counts = new Map();
const operation = {parse: 'parse', deparse: 'deparse', eval_lpe: 'eval', eval_lisp: 'evalAst', EVAL: 'evalAst'};

function request(node, env) {
  if (node?.type === 'Identifier' && env.has(node.name)) {
    const saved = env.get(node.name);
    if (saved instanceof RequestReference) return saved.request;
  }
  if (node?.type === 'AwaitExpression') return request(node.argument, env);
  if (node?.type !== 'CallExpression') throw new Error('actual is not a direct API call');
  const name = callName(node.callee).replace(/^lpe\./, '');
  const op = operation[name];
  if (!op) throw new Error(`unsupported API ${name || node.callee.type}`);
  let input;
  if (op === 'evalAst' && (node.arguments[0]?.type === 'CallExpression' || (node.arguments[0]?.type === 'Identifier' && env.get(node.arguments[0].name) instanceof RequestReference))) {
    const inner = request(node.arguments[0], env);
    if (inner.op !== 'parse' || inner.options) throw new Error('nested API/options need manual fixture');
    input = {op: 'eval', source: inner.source};
  } else input = {op, [op === 'parse' || op === 'eval' ? 'source' : 'ast']: literal(node.arguments[0], env)};
  if (op === 'eval' || op === 'evalAst') {
    if (node.arguments.length > 1) input.context = literal(node.arguments[1], env);
    if (node.arguments.length > 2) input.options = literal(node.arguments[2], env);
  } else if (node.arguments.length > 1) input.options = literal(node.arguments[1], env);
  if (input.context === undefined) delete input.context;
  if (input.options === undefined) delete input.options;
  return input;
}

function add(file, node, group, req, expected, evidence = 'upstream-assertion') {
  const location = `${file}:${node.loc.start.line}`;
  const count = (counts.get(location) || 0) + 1;
  counts.set(location, count);
  cases.push({id: `${evidence}:${location}:${count}`, group, origin: location, evidence, request: encode(req), expected: {ok: true, value: encode(expected)}});
}

function visit(node, env, path, file) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Program' || node.type === 'BlockStatement') {
    const local = new Map(env);
    for (const statement of node.body) visit(statement, local, path, file);
    return;
  }
  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      if (decl.id.type !== 'Identifier') continue;
      try { env.set(decl.id.name, literal(decl.init, env)); }
      catch {
        try { env.set(decl.id.name, new RequestReference(request(decl.init, env))); } catch {}
      }
    }
    return;
  }
  if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'MemberExpression') {
    try {
      const object = literal(node.left.object, env);
      const key = node.left.computed ? literal(node.left.property, env) : node.left.property.name;
      const value = literal(node.right, env);
      if (object === null || typeof object !== 'object') throw new Error('assignment target is not a literal object');
      Object.defineProperty(object, key, {value, enumerable: true, writable: true, configurable: true});
    } catch (error) {
      if (node.left.object.type === 'Identifier') env.delete(node.left.object.name);
      skipped.push({origin: `${file}:${node.loc.start.line}`, group: path.join(' / '), reason: `mutation needs manual fixture: ${error.message}`});
    }
    return;
  }
  if (node.type === 'CallExpression') {
    const name = callName(node.callee);
    if (['describe', 'it', 'describe.skip', 'it.skip'].includes(name)) {
      let label;
      try { label = literal(node.arguments[0], env); } catch { label = '<dynamic>'; }
      const next = [...path, label];
      groups.push({file, line: node.loc.start.line, kind: name, name: next.join(' / ')});
      if (name.endsWith('.skip')) return;
      const callback = node.arguments[1];
      if (callback?.body) visit(callback.body, new Map(env), next, file);
      return;
    }
    const wrapper = /^(deepEqual|strictEqual)(Parsed)?$/.exec(name);
    const assertion = /^assert\.(deepEqual|deepStrictEqual|equal|strictEqual)$/.test(name);
    if (name === 'assert.throws' && callName(node.arguments[1]) === 'lpe.LPESyntaxError') {
      try {
        const callback = node.arguments[0];
        if (callback.type !== 'ArrowFunctionExpression' || callback.body.type === 'BlockStatement') throw new Error('error assertion callback requires manual extraction');
        const req = request(callback.body, env);
        add(file, node, path.join(' / '), req, undefined);
        cases.at(-1).expected = {ok: false, error: {kind: 'SyntaxError'}};
        cases.at(-1).covers = {apis: ['LPESyntaxError']};
      } catch (error) { skipped.push({origin: `${file}:${node.loc.start.line}`, group: path.join(' / '), reason: error.message}); }
      return;
    }
    if (assertion || (wrapper && file === 'test/test-lpe-functions.js')) {
      try {
        const req = wrapper
          ? {op: wrapper[2] ? 'evalAst' : 'eval', [wrapper[2] ? 'ast' : 'source']: literal(node.arguments[0], env)}
          : request(node.arguments[0], env);
        add(file, node, path.join(' / '), req, literal(node.arguments[1], env));
      } catch (error) {
        skipped.push({origin: `${file}:${node.loc.start.line}`, group: path.join(' / '), reason: error.message});
      }
      return;
    }
  }
  // Loops need binding expansion and helper functions need host semantics;
  // neither is guessed. Their group remains visible as an inventory gap.
  if (['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'FunctionDeclaration'].includes(node.type)) {
    skipped.push({origin: `${file}:${node.loc.start.line}`, group: path.join(' / '), reason: `manual expansion required: ${node.type}`});
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, env, path, file));
    else if (value && typeof value === 'object') visit(value, env, path, file);
  }
}

const excludedTestFiles = [];
for (const file of testFiles) {
  if (compatibilityScope.v8OnlyTestFiles.includes(file)) {
    excludedTestFiles.push({file, reason: compatibilityScope.v8OnlyReason});
    continue;
  }
  visit(parseFile(file).program, new Map(), [], file);
}

for (const file of sourceFiles) {
  const lines = readFileSync(resolve(root, file), 'utf8').split('\n');
  let inExample = false;
  for (let i = 0; i < lines.length; i++) {
    let text = lines[i].replace(/^\s*\*\s?/, '').trim();
    if (text.startsWith('@example ')) { inExample = true; text = text.slice(9).trim(); }
    else if (/^@|^\*\//.test(text)) inExample = false;
    if (!inExample || !text.includes(' => ')) continue;
    const split = text.lastIndexOf(' => ');
    const source = text.slice(0, split).trim();
    const expectedText = text.slice(split + 4).split(' ##')[0].trim();
    if (source.startsWith('|') || source.includes('\\')) {
      skipped.push({origin: `${file}:${i + 1}`, reason: 'multiline doc example requires manual fixture'});
      continue;
    }
    try {
      const expected = literal(parseExpression(expectedText));
      add(file, {loc: {start: {line: i + 1}}}, `docs / ${file}`, {op: 'eval', source}, expected, 'doc-example');
    } catch (error) {
      skipped.push({origin: `${file}:${i + 1}`, reason: `nonliteral doc expectation: ${error.message}`});
    }
  }
}

const lpe = require(resolve(root, 'dist/lpe.js'));
const reviewed = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/reviewed-exclusions.json'), 'utf8'));
const exclusions = new Map(reviewed.flatMap(entry => entry.origins.map(origin => [origin, entry.reason])));
const nativeCalls = new Set(['RegExp', 'invoke', '_call_obj_meth_', '_get_obj_meth_', '~>', 'new', 'Array', 'Object', 'Date']);
function nativeInterop(ast) {
  if (!Array.isArray(ast)) return false;
  if (nativeCalls.has(ast[0])) return true;
  if (['"', "'", 'q', '$AST$', '`'].includes(ast[0])) return false;
  return ast.some(nativeInterop);
}
const quarantine = [];
const accepted = cases.filter(fixture => {
  let reason = exclusions.get(fixture.origin);
  if (['eval', 'evalAst'].includes(fixture.request.op)) {
    try {
      const ast = fixture.request.op === 'eval' ? lpe.parse(fixture.request.source, fixture.request.options) : fixture.request.ast;
      if (nativeInterop(ast)) reason = 'Excluded native RegExp or JavaScript object/method interop.';
    } catch {}
  }
  if (!reason) return true;
  quarantine.push({...fixture, reason});
  return false;
});
writeFileSync(resolve(root, 'rust-impl/fixtures/upstream.cases.json'), `${JSON.stringify(accepted, null, 2)}\n`);
writeFileSync(resolve(root, 'rust-impl/fixtures/quarantined.json'), `${JSON.stringify(quarantine, null, 2)}\n`);
writeFileSync(resolve(root, 'rust-impl/fixtures/extraction.json'), `${JSON.stringify({groups, skipped, excludedTestFiles}, null, 2)}\n`);
console.log(`Extracted ${accepted.length} independent assertions/examples; quarantined ${quarantine.length}; recorded ${skipped.length} omissions across ${groups.length} test groups.`);
await import('./authored-fixtures.mjs');
await import('./roundtrip-fixtures.mjs');
await import('./production-layout-fixtures.mjs');
console.log(cli.check ? 'Generated artifacts are current (read-only check).' : 'Generated artifacts updated.');
