import {readFileSync} from 'node:fs';
import {artifact as writeFileSync} from './artifacts.mjs';
import {resolve} from 'node:path';
import {root, encode, require, args} from './shared.mjs';
import {parseFile, parseExpression, callName, literal, walk, sourceFiles, testFiles, RequestReference, StaticCallback, compatibilityScope} from './source-analysis.mjs';
import {writeMetadata} from './metadata.mjs';

const cli = args(process.argv.slice(2), [], ['--check']);
writeMetadata(cli.check);

const lpe = require(resolve(root, 'dist/lpe.js'));
const cases = [];
const skipped = [];
const groups = [];
const counts = new Map();
const operation = {parse: 'parse', deparse: 'deparse', eval_lpe: 'eval', evaluate: 'eval', eval_lisp: 'evalAst', EVAL: 'evalAst'};

function request(node, env) {
  if (node?.type === 'Identifier' && env.has(node.name)) {
    const saved = env.get(node.name);
    if (saved instanceof RequestReference) return saved.request;
  }
  if (node?.type === 'AwaitExpression') return request(node.argument, env);
  if (node?.type !== 'CallExpression') throw new Error('actual is not a direct API call');
  const name = callName(node.callee).replace(/^lpe\./, '');
  const callback = env.get(name);
  if (callback instanceof StaticCallback && node.arguments.length === 0) return request(callback.body, callback.env);
  let calendarName = /^(calendar|time)\.(\w+)$/.exec(name)?.[2];
  calendarName = ({toStartTime:'toStart', toEndTime:'toEnd', extractTime:'extract', extendTimeRange:'extend'})[calendarName] || calendarName;
  if (node.callee.type === 'MemberExpression' && node.callee.computed && node.callee.object.name === 'calendar')
    calendarName = literal(node.callee.property, env);
  if (calendarName && typeof lpe.STDLIB[calendarName] === 'function') {
    return {op: 'evalAst', ast: [calendarName, ...node.arguments.map(argument => ['$AST$', literal(argument, env)])], ...(env.has('fixedClock') ? {clockMillis: env.get('fixedClock')} : {})};
  }
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
  if (env.has('fixedClock')) input.clockMillis = env.get('fixedClock');
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
  if (node.type === 'ForOfStatement') {
    try {
      const values = literal(node.right, env);
      if (!Array.isArray(values) || values.length > 1000) throw new Error('loop requires a bounded literal table');
      const pattern = node.left.declarations?.[0]?.id;
      function bind(pattern, value, local) {
        if (pattern?.type === 'Identifier') local.set(pattern.name, value);
        else if (pattern?.type === 'ArrayPattern' && Array.isArray(value))
          pattern.elements.forEach((part, index) => { if (part) bind(part, value[index], local); });
        else throw new Error('unsupported loop binding');
      }
      for (const value of values) {
        const local = new Map(env);
        bind(pattern, value, local);
        visit(node.body, local, path, file);
      }
    } catch (error) { skipped.push({origin:`${file}:${node.loc.start.line}`,group:path.join(' / '),reason:error.message}); }
    return;
  }
  if (node.type === 'AssignmentExpression' && callName(node.left) === 'global.Date') {
    if (node.right.type === 'ClassExpression') {
      const timestamps = [];
      walk(node.right, child => {
        if (child.type === 'StringLiteral' && /^\d{4}-\d\d-\d\dT/.test(child.value)) timestamps.push(Date.parse(child.value));
      });
      if (timestamps.length !== 1 || !Number.isFinite(timestamps[0])) throw new Error('Unsupported mocked clock');
      env.set('fixedClock', timestamps[0]);
    } else env.delete('fixedClock');
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
      try { label = literal(node.arguments[0]); } catch { label = '<dynamic>'; }
      const next = [...path, label];
      if (!groups.some(group => group.file === file && group.line === node.loc.start.line))
        groups.push({file, line: node.loc.start.line, kind: name, name: next.join(' / ')});
      if (name.endsWith('.skip')) return;
      const callback = node.arguments[1];
      if (callback?.body) visit(callback.body, new Map(env), next, file);
      return;
    }
    const wrapper = /^(deepEqual|strictEqual)(Parsed)?$/.exec(name);
    const assertion = /^assert\.(deepEqual|deepStrictEqual|equal|strictEqual)$/.test(name);
    if (name === 'assert.throws') {
      try {
        const expectedError = node.arguments[1];
        const kind = callName(expectedError) === 'lpe.LPESyntaxError' ? 'SyntaxError'
          : ['RangeError','TypeError'].includes(callName(expectedError)) ? callName(expectedError)
          : expectedError?.type === 'ObjectExpression' ? literal(expectedError, env).name
          : callName(expectedError) === 'denied' ? 'LPESecurityError' : undefined;
        if (!kind) throw new Error('error predicate requires manual fixture');
        let callback = node.arguments[0];
        if (callback.type === 'Identifier' && env.get(callback.name) instanceof StaticCallback) callback = {type:'ArrowFunctionExpression',body:env.get(callback.name).body};
        if (callback.type !== 'ArrowFunctionExpression' || callback.body.type === 'BlockStatement') throw new Error('error assertion callback requires manual extraction');
        const req = request(callback.body, env);
        add(file, node, path.join(' / '), req, undefined);
        cases.at(-1).expected = {ok: false, error: {kind}};
        if (kind === 'SyntaxError') cases.at(-1).covers = {apis: ['LPESyntaxError']};
      } catch (error) { skipped.push({origin: `${file}:${node.loc.start.line}`, group: path.join(' / '), reason: error.message}); }
      return;
    }
    if (wrapper && file === 'test/test-deparse-lpe-functions.js') {
      try {
        const input = literal(node.arguments[0], env);
        const source = wrapper[2] ? lpe.deparse(input) : input;
        add(file, node, path.join(' / '), {op:'parse',source}, undefined, 'upstream-roundtrip');
        Object.assign(cases.at(-1), {kind:'roundtrip', expected:{ok:true,relation:'three stable parse/deparse cycles'}});
      } catch (error) { skipped.push({origin:`${file}:${node.loc.start.line}`,group:path.join(' / '),reason:error.message}); }
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

const reviewed = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/reviewed-exclusions.json'), 'utf8'));
const exclusions = new Map(reviewed.flatMap(entry => entry.origins.map(origin => [origin, entry.reason])));
const nativeCalls = new Set(['RegExp', 'invoke', '_call_obj_meth_', '_get_obj_meth_', '~>', 'new', 'Array', 'Object', 'Date']);
function nativeInterop(ast) {
  if (!Array.isArray(ast)) return false;
  if (['invoke', '_call_obj_meth_', '_get_obj_meth_', '~>'].includes(ast[0]) && ast[1] === 'JSON') return ast.slice(2).some(nativeInterop);
  if (nativeCalls.has(ast[0])) return true;
  if (['.', '->'].includes(ast[0]) && ['Object', 'Array', 'Date', 'console'].includes(ast[1])) return true;
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
await import('./release180-fixtures.mjs');
await import('./json-fixtures.mjs');
console.log(cli.check ? 'Generated artifacts are current (read-only check).' : 'Generated artifacts updated.');
