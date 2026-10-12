import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {root, require, fixtures, args, decode, fingerprint} from './shared.mjs';
import {declarations, parseFile, callName, literal, testFiles, compatibilityScope} from './source-analysis.mjs';
import {writeMetadata} from './metadata.mjs';
import {fixtureEvidence, groupId, isTestCase, sourceCoverage} from './coverage-analysis.mjs';

const cli = args(process.argv.slice(2), ['--report'], ['--check', '--require-complete', '--help']);
if (cli.help) {
  console.log('node rust-impl/scripts/coverage.mjs [--check] [--report PATH] [--require-complete]');
  process.exit(0);
}
const lpe = require(resolve(root, 'dist/lpe.js'));
writeMetadata(true);
const suite = fixtures();
const observed = cli.report ? JSON.parse(readFileSync(resolve(cli.report), 'utf8')) : null;
const results = new Map((observed?.results || []).map(r => [r.id, r]));
const staleObservations = [];
for (const fixture of suite) {
  const result = results.get(fixture.id);
  if (result && result.fingerprint !== fingerprint(fixture)) {
    staleObservations.push(fixture.id);
    results.delete(fixture.id);
  }
}
const excluded = new Set(compatibilityScope.jsOnlyBuiltins);
const excludedApis = new Set(compatibilityScope.v8OnlyApis);
const builtins = new Set(Object.keys(lpe.STDLIB));
const declarationsByName = declarations();
const refs = new Map([...builtins].map(name => [name, []]));
const apiRefs = new Map(Object.keys(lpe).map(name => [name, []]));
const apiForOp = {parse: 'parse', deparse: 'deparse', eval: 'eval_lpe', evalAst: 'eval_lisp'};
const errors = [];

function references(ast, names = new Set()) {
  if (typeof ast === 'string') {
    if (builtins.has(ast)) names.add(ast);
  } else if (Array.isArray(ast) && ast.length) {
    if (typeof ast[0] === 'string' && builtins.has(ast[0])) names.add(ast[0]);
    // Literal strings and quoted AST are data, not calls.
    if (!['"', "'", 'q', '$AST$', '`'].includes(ast[0])) ast.slice(1).forEach(x => references(x, names));
  }
  return names;
}

for (const fixture of suite) {
  apiRefs.get(apiForOp[fixture.request.op])?.push(fixture.id);
  if (fixture.request.op === 'stream' && typeof fixture.request.source === 'string') apiRefs.get('eval_lpe').push(fixture.id);
  if (fixture.request.op === 'api') apiRefs.get(fixture.request.name)?.push(fixture.id);
  for (const api of fixture.covers?.apis || []) apiRefs.get(api)?.push(fixture.id);
  if (!['eval', 'evalAst', 'stream'].includes(fixture.request.op) || !fixture.expected.ok) continue;
  if (fixture.request.op === 'stream' && fixture.request.source === undefined) continue;
  try {
    const request = decode(fixture.request);
    const ast = request.op === 'eval' || request.op === 'stream' ? lpe.parse(request.source, request.options) : request.ast;
    for (const name of references(ast)) refs.get(name)?.push(fixture.id);
  } catch (error) { errors.push({id: fixture.id, reason: `Cannot analyze fixture AST: ${error.message}`}); }
}

const evidence = ids => fixtureEvidence(ids, results, observed?.mode);

const names = [...new Set([...builtins, ...declarationsByName.keys()])].sort().map(name => {
  const value = lpe.STDLIB[name];
  const aliases = typeof value === 'function' ? [...builtins].filter(n => n !== name && lpe.STDLIB[n] === value).sort() : [];
  return {
    name, kind: typeof value === 'function' ? 'function' : 'constant', aliases,
    declarations: declarationsByName.get(name) || [],
    ...evidence(refs.get(name) || []),
    ...(excluded.has(name) ? {status: 'excluded', reason: 'Native RegExp or JavaScript host-object interoperability; syntax remains independently testable.'} : {}),
  };
});

const apis = [...apiRefs].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, ids]) => ({
  name, ...evidence(ids),
  ...(!ids.length ? {reason: 'No portable API operation or named host fixture exercises this API yet.'} : {}),
  ...(excludedApis.has(name) ? {status: 'excluded', reason: compatibilityScope.v8OnlyReason} : {}),
}));

const inventory = [];
function scan(node, path, file, parent) {
  if (!node || typeof node !== 'object') return;
  let next = path;
  if (node.type === 'CallExpression' && /^(describe|it)(\.skip)?$/.test(callName(node.callee))) {
    let name;
    try { name = String(literal(node.arguments[0])); } catch { name = '<dynamic>'; }
    next = [...path, name];
    const fullName = next.join(' / ');
    inventory.push({file, line: node.loc.start.line, endLine: node.loc.end.line, kind: callName(node.callee), name: fullName, ...(parent ? {parent} : {})});
    parent = `${file}:${node.loc.start.line}`;
  }
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(n => scan(n, next, file, parent));
    else if (value && typeof value === 'object') scan(value, next, file, parent);
  }
}
testFiles.forEach(file => scan(parseFile(file).program, [], file));
const {groups, summary, errors: sourceErrors} = sourceCoverage(inventory, suite, evidence, compatibilityScope);
errors.push(...sourceErrors);
const uncovered = {builtins: names.filter(n => n.status === 'uncovered').map(n => n.name), apis: apis.filter(n => n.status === 'uncovered').map(n => n.name), testCases: groups.filter(n => isTestCase(n) && n.status === 'uncovered').map(groupId), suites: groups.filter(n => !isTestCase(n) && n.status === 'uncovered').map(groupId)};
const report = {
  schemaVersion: 2,
  semantics: 'Inventory and fixture evidence, not a declaration of full implementation coverage. Builtin references are syntactic: passing cases do not prove every branch, overload, alias, or host behavior. Alias evidence is not inherited.',
  observationMode: observed?.mode || 'not-run',
  exclusions: [...compatibilityScope.otherExclusions, 'Lone-surrogate input/output (UTF-8-only scope)'],
  stringScope: compatibilityScope,
  knownGaps: suite.filter(f => f.knownGap).map(f => ({id: f.id, reason: f.knownGap, ...evidence([f.id])})),
  deferred: compatibilityScope.deferred,
  fixtureCount: suite.length, builtins: names, apis, testGroups: groups, sourceTestSummary: summary, uncovered, analysisErrors: errors, staleObservations,
};
const output = `${JSON.stringify(report, null, 2)}\n`;
const destination = resolve(root, 'rust-impl/coverage.json');
if (cli.check) {
  if (!existsSync(destination) || readFileSync(destination, 'utf8') !== output) {
    console.error('Coverage inventory is stale; regenerate with coverage.mjs using the same --report setting.');
    process.exitCode = 1;
  }
} else writeFileSync(destination, output);
console.log(`${suite.length} fixtures; ${names.length} builtin names; ${apis.length} APIs; ${summary.testCases.total} source tests and ${summary.suites.total} suites. Uncovered: ${uncovered.builtins.length} names, ${uncovered.apis.length} APIs, ${uncovered.testCases.length} source tests. Excluded source tests: ${summary.testCases.excluded}.`);
const incomplete = entry => !['parity-passed-fixtures', 'excluded', 'deferred'].includes(entry.status);
if (cli['require-complete'] && [...names, ...apis, ...groups].some(incomplete)) {
  console.error(`Strict coverage failed. Unverified/failing APIs: ${apis.filter(incomplete).map(api => api.name).join(', ') || 'none'}; builtin entries: ${names.filter(incomplete).length}; source tests: ${summary.testCases.unverified}; suite rollups: ${summary.suites.unverified}.`);
  process.exitCode = 1;
}
if (errors.length) process.exitCode = 1;
