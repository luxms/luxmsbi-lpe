import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureEvidence, groupId, isTestCase, sourceCoverage} from './coverage-analysis.mjs';
import {callName, compatibilityScope, literal, parseFile, testFiles, walk} from './source-analysis.mjs';
import {fixtures, require, root} from './shared.mjs';
import {resolve} from 'node:path';

const inventory = [
  {file: 'test/example.js', line: 1, name: 'suite', kind: 'describe'},
  {file: 'test/example.js', line: 2, name: 'suite / first', kind: 'it', parent: 'test/example.js:1'},
  {file: 'test/example.js', line: 3, name: 'suite / second', kind: 'it', parent: 'test/example.js:1'},
];
const scope = {v8OnlyTestFiles: [], jsOnlyTestGroups: []};
const fixture = (id, groups) => ({id, origin: 'authored.js', group: 'authored', covers: {groups}});
const evidence = (results, mode = 'parity') => ids => fixtureEvidence(ids, new Map(results), mode);

function liveInventory() {
  return testFiles.flatMap(file => {
    const declarations = [];
    walk(parseFile(file), node => {
      if (node.type === 'CallExpression' && /^(describe|it)(\.skip)?$/.test(callName(node.callee))) declarations.push(node);
    });
    return declarations.map(node => {
      const ancestors = declarations.filter(parent => parent.start < node.start && parent.end > node.end);
      const name = [...ancestors, node].map(test => {
        try { return String(literal(test.arguments[0])); } catch { return '<dynamic>'; }
      }).join(' / ');
      return {file, line: node.loc.start.line, endLine: node.loc.end.line, kind: callName(node.callee), name,
        ...(ancestors.length ? {parent: `${file}:${ancestors.at(-1).loc.start.line}`} : {})};
    });
  });
}

test('coverage counts test cases separately and requires every descendant', () => {
  const suite = [fixture('first', ['test/example.js:2']), fixture('parent', ['test/example.js:1'])];
  const report = sourceCoverage(inventory, suite, evidence([['first', {pass: true}], ['parent', {pass: true}]]), scope);
  assert.equal(report.summary.testCases.total, 2);
  assert.equal(report.summary.suites.total, 1);
  assert.equal(report.summary.testCases.parityVerified, 1);
  assert.equal(report.summary.testCases.uncovered, 1);
  assert.equal(report.groups[0].status, 'partially-verified');
  assert.equal(report.groups[2].status, 'uncovered');
  assert.deepEqual(report.groups[0].fixtures, ['parent', 'first']);
});

test('source fixture origins do not need redundant explicit links', () => {
  const suite = [{id: 'first', origin: 'test/example.js:2', group: 'suite / first'}];
  const report = sourceCoverage(inventory, suite, evidence([['first', {pass: true}]]), scope);
  assert.equal(report.groups[1].status, 'parity-passed-fixtures');
  assert.equal(report.groups[2].status, 'uncovered');
});

test('reviewed leaf exclusions never exclude neighboring syntax tests', () => {
  const exclusion = {...inventory[1], reason: 'Native JS receiver binding'};
  const report = sourceCoverage(inventory, [], evidence([]), {...scope, jsOnlyTestGroups: [exclusion]});
  assert.equal(report.groups[1].status, 'excluded');
  assert.equal(report.groups[2].status, 'uncovered');
  assert.equal(report.groups[0].status, 'uncovered');
  assert.equal(report.summary.testCases.excluded, 1);
  assert.equal(report.summary.testCases.unverified, 1);
  assert.deepEqual(report.errors, []);
});

test('all-excluded suites roll up without counting exclusions as passes', () => {
  const exclusions = inventory.slice(1).map(group => ({...group, reason: 'JS-only'}));
  const report = sourceCoverage(inventory, [], evidence([]), {...scope, jsOnlyTestGroups: exclusions});
  assert.equal(report.groups[0].status, 'excluded');
  assert.equal(report.summary.testCases.parityVerified, 0);
  assert.equal(report.summary.testCases.excluded, 2);
  assert.equal(report.summary.suites.excluded, 1);
});

test('stale names, broad suite exclusions, and unknown coverage links are errors', () => {
  for (const exclusion of [
    {...inventory[1], name: 'old name', reason: 'JS-only'},
    {...inventory[1], line: 99, reason: 'JS-only'},
    {...inventory[0], reason: 'Do not blanket-exclude mixed suites'},
    {...inventory[1], reason: ''},
    {...inventory[1], reason: '   '},
  ]) {
    const report = sourceCoverage(inventory, [], evidence([]), {...scope, jsOnlyTestGroups: [exclusion]});
    assert.equal(report.errors.length, 1);
    assert.equal(report.summary.testCases.excluded, 0);
  }
  const report = sourceCoverage(inventory, [fixture('bad', ['test/example.js:99'])], evidence([]), scope);
  assert.match(report.errors[0].reason, /Unknown source-test reference/);
});

test('an exclusion cannot hide linked fixture failures or be duplicated', () => {
  const exclusion = {...inventory[1], reason: 'JS-only'};
  const report = sourceCoverage(inventory, [fixture('first', ['test/example.js:2'])], evidence([['first', {pass: false}]]), {...scope, jsOnlyTestGroups: [exclusion, exclusion]});
  assert.equal(report.errors.length, 2);
  assert.equal(report.groups[1].status, 'observed-failure');
  assert.equal(report.groups[0].status, 'observed-failure');
});

test('fixture evidence requires complete parity observations and deduplicates links', () => {
  const results = new Map([['ok', {pass: true}], ['bad', {pass: false}]]);
  assert.deepEqual(fixtureEvidence(['ok', 'ok'], results, 'parity'), {status: 'parity-passed-fixtures', fixtures: ['ok'], observed: 1, passed: 1});
  assert.equal(fixtureEvidence(['missing'], results, 'parity').status, 'fixtures-present-unverified');
  assert.equal(fixtureEvidence(['ok', 'missing'], results, 'parity').status, 'partially-verified');
  assert.equal(fixtureEvidence(['ok', 'bad'], results, 'parity').status, 'observed-failure');
  assert.equal(fixtureEvidence(['ok'], results, 'js-only').status, 'js-passed-rust-unverified');
});

test('JS-only runtime exclusions preserve live parser and portable data coverage without a report', () => {
  const suite = fixtures();
  const inventory = liveInventory();
  const report = sourceCoverage(inventory, suite, evidence([]), compatibilityScope);
  assert.deepEqual(report.errors, []);
  for (const exclusion of compatibilityScope.jsOnlyTestGroups) {
    const id = `${exclusion.file}:${exclusion.line}`;
    const group = report.groups.find(g => groupId(g) === id);
    assert.equal(group?.name, exclusion.name, id);
    assert.equal(group.status, 'excluded', id);
    assert.deepEqual(group.fixtures, [], id);
    assert.ok(group.reason, id);
  }
  for (const file of compatibilityScope.v8OnlyTestFiles) {
    const excluded = report.groups.filter(group => group.file === file);
    assert.ok(excluded.length, file);
    assert.ok(excluded.every(group => group.status === 'excluded' && !group.fixtures.length), file);
  }
  for (const line of [550, 605]) {
    const syntax = report.groups.find(g => g.file === 'test/test-lisp.js' && g.line === line);
    assert.ok(syntax, `syntax declaration ${line}`);
    assert.notEqual(syntax.status, 'excluded');
    assert.ok(syntax.fixtures.length);
  }
  assert.ok(suite.some(f => f.id.startsWith('authored:regex-')));
  for (const line of [64, 403, 419, 917, 978, 993, 1059]) {
    const leaf = report.groups.find(g => g.file === 'test/test-lpe-functions.js' && g.line === line);
    assert.ok(leaf && isTestCase(leaf), `portable declaration ${line} exists`);
    assert.equal(leaf.status, 'fixtures-present-unverified', leaf.name);
    assert.ok(leaf.fixtures.length, leaf.name);
  }
  assert.equal(report.summary.testCases.parityVerified, 0);
  assert.equal(report.summary.suites.parityVerified, 0);
});

test('missing observations never produce verified cases or suites', () => {
  const suite = [fixture('first', ['test/example.js:2']), fixture('second', ['test/example.js:3'])];
  const report = sourceCoverage(inventory, suite, ids => fixtureEvidence(ids, new Map(), undefined), scope);
  assert.ok(report.groups.every(group => group.status === 'fixtures-present-unverified'));
  assert.equal(report.summary.testCases.unverified, 2);
  assert.equal(report.summary.suites.unverified, 1);
  assert.equal(report.summary.testCases.parityVerified, 0);
  assert.equal(report.summary.suites.parityVerified, 0);
});

test('suite-owned evidence cannot hide missing descendants, failures, or missing observations', () => {
  const suite = [fixture('parent', ['test/example.js:1']), fixture('first', ['test/example.js:2']), fixture('second', ['test/example.js:3'])];
  for (const [results, expected] of [
    [[['parent', {pass: false}], ['first', {pass: true}], ['second', {pass: true}]], 'observed-failure'],
    [[['first', {pass: true}], ['second', {pass: true}]], 'partially-verified'],
    [[['parent', {pass: true}], ['first', {pass: true}], ['second', {pass: true}]], 'parity-passed-fixtures'],
  ]) {
    const report = sourceCoverage(inventory, suite, evidence(results), scope);
    assert.equal(report.groups[0].status, expected);
    assert.deepEqual(report.groups[0].fixtures, ['parent', 'first', 'second']);
  }
  const report = sourceCoverage(inventory, [suite[0]], evidence([['parent', {pass: true}]]), scope);
  assert.equal(report.groups[0].status, 'partially-verified');
  assert.equal(report.groups[0].uncoveredCaseCount, 2);
  assert.equal(report.summary.testCases.parityVerified, 0);
});

test('same-named and dynamic declarations are matched by location, not title alone', () => {
  for (const name of ['suite / repeated', 'suite / <dynamic>']) {
    const repeated = [inventory[0], {...inventory[1], name}, {...inventory[2], name}];
    const suite = [{id: 'first', origin: 'test/example.js:2', group: name}];
    const report = sourceCoverage(repeated, suite, evidence([['first', {pass: true}]]), scope);
    assert.equal(report.groups[1].status, 'parity-passed-fixtures');
    assert.equal(report.groups[2].status, 'uncovered');
    assert.equal(report.groups[0].status, 'partially-verified');
  }
});

test('source origins respect declaration boundaries, filenames, titles, and end lines', () => {
  const bounds = [
    {...inventory[0], endLine: 40},
    {...inventory[1], line: 10, endLine: 15},
    {...inventory[2], line: 20, endLine: 25},
  ];
  for (const [origin, group, expectedIndex] of [
    ['test/example.js:9', bounds[1].name, -1],
    ['test/example.js:10', bounds[1].name, 1],
    ['test/example.js:15', bounds[1].name, 1],
    ['test/example.js:16', bounds[1].name, -1],
    ['test/example.js:20', bounds[1].name, -1],
    ['test/example.js:20', bounds[2].name, 2],
    ['test/example.js:26', bounds[2].name, -1],
    ['test/example.js:999', bounds[2].name, -1],
    ['test/example.js:20suffix', bounds[2].name, -1],
    ['test/example.js.extra:20', bounds[2].name, -1],
    ['test/example.js:20', `${bounds[2].name} / child`, -1],
  ]) {
    const report = sourceCoverage(bounds, [{id: 'source', origin, group}], evidence([['source', {pass: true}]]), scope);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.groups.filter(isTestCase).filter(g => g.fixtures.includes('source')).map(groupId),
      expectedIndex < 0 ? [] : [groupId(bounds[expectedIndex])], `${origin} (${group})`);
  }
  const suiteAssertion = {id: 'suite-assertion', origin: 'test/example.js:30', group: bounds[0].name};
  const report = sourceCoverage(bounds, [suiteAssertion], evidence([['suite-assertion', {pass: false}]]), scope);
  assert.equal(report.groups[0].status, 'observed-failure');
  assert.deepEqual(report.groups[0].fixtures, ['suite-assertion']);
  assert.ok(report.groups.filter(isTestCase).every(group => group.status === 'uncovered'));
});

test('empty nested suites block parent verification and all-excluded rollups', () => {
  const empty = {file: 'test/example.js', line: 4, name: 'suite / empty', kind: 'describe', parent: 'test/example.js:1'};
  const groups = [...inventory, empty];
  const suite = [fixture('first', ['test/example.js:2']), fixture('second', ['test/example.js:3'])];
  const observed = evidence([['first', {pass: true}], ['second', {pass: true}]]);
  const report = sourceCoverage(groups, suite, observed, scope);
  assert.equal(report.groups[0].status, 'partially-verified');
  assert.equal(report.groups[0].caseCount, 2);
  assert.equal(report.groups[3].status, 'uncovered');
  const exclusions = inventory.slice(1).map(group => ({...group, reason: 'JS-only'}));
  const excluded = sourceCoverage(groups, [], evidence([]), {...scope, jsOnlyTestGroups: exclusions});
  assert.equal(excluded.groups[0].status, 'uncovered');
  assert.equal(excluded.groups[3].status, 'uncovered');
  const linked = sourceCoverage([{...empty, parent: undefined}], [fixture('empty', ['test/example.js:4'])], evidence([['empty', {pass: true}]]), scope);
  assert.deepEqual(linked.errors, []);
  assert.notEqual(linked.groups[0].status, 'parity-passed-fixtures');
});

test('nested suite aggregation is independent of inventory order and counts each leaf once', () => {
  const nested = [inventory[0], inventory[1],
    {file: 'test/example.js', line: 3, name: 'suite / nested', kind: 'describe.skip', parent: 'test/example.js:1'},
    {file: 'test/example.js', line: 4, name: 'suite / nested / leaf', kind: 'it.skip', parent: 'test/example.js:3'},
  ];
  const suite = [fixture('first', ['test/example.js:2', 'test/example.js:2']), fixture('nested', ['test/example.js:4'])];
  for (const groups of [nested, [...nested].reverse()]) {
    const report = sourceCoverage(groups, suite, evidence([['first', {pass: true}], ['nested', {pass: true}]]), scope);
    assert.deepEqual(report.errors, []);
    assert.ok(report.groups.every(group => group.status === 'parity-passed-fixtures'));
    assert.equal(report.summary.testCases.total, 2);
    assert.equal(report.summary.suites.total, 2);
    assert.equal(report.groups.find(g => g.line === 1).caseCount, 2);
    assert.equal(report.groups.find(g => g.line === 1).observed, 2);
  }
});

test('ambiguous declarations and invalid parent links fail closed without recursion', () => {
  for (const groups of [
    [...inventory, {...inventory[1], name: 'same-line declaration'}],
    [inventory[0], {...inventory[1], parent: 'test/example.js:99'}],
    [inventory[0], {...inventory[1], parent: 'test/example.js:2'}],
    [inventory[0], {...inventory[1], file: 'test/other.js'}],
    [inventory[0], inventory[1], {...inventory[2], parent: 'test/example.js:2'}],
    [{...inventory[0], parent: 'test/example.js:3'}, {...inventory[2], kind: 'describe'}],
    [{...inventory[0], endLine: 1}, inventory[1]],
    [inventory[0], {...inventory[1], endLine: 1}],
    [inventory[0], {...inventory[1], kind: 'unknown'}],
    [
      {file: 'test/example.js', line: 4, name: 'invalid / nested / leaf', kind: 'it', parent: 'test/example.js:3'},
      {...inventory[2], kind: 'describe', parent: 'test/example.js:2'},
      {...inventory[1], kind: 'describe', parent: 'test/example.js:99'},
      inventory[0],
    ],
  ]) {
    const report = sourceCoverage(groups, [fixture('bad', groups.map(groupId))], evidence([['bad', {pass: true}]]), scope);
    assert.ok(report.errors.length, JSON.stringify(groups));
    const invalid = new Set(report.errors.map(error => error.id));
    assert.ok(report.groups.filter(group => invalid.has(groupId(group))).every(group => group.status === 'uncovered'));
  }
});

test('file exclusions require known exact filenames and reasons and cannot hide failures', () => {
  for (const overrides of [
    {v8OnlyTestFiles: ['test/missing.js'], v8OnlyReason: 'JS-only'},
    {v8OnlyTestFiles: ['test/example.js']},
    {v8OnlyTestFiles: ['test/example.js'], v8OnlyReason: '   '},
  ]) {
    const report = sourceCoverage(inventory, [], evidence([]), {...scope, ...overrides});
    assert.ok(report.errors.length);
    assert.equal(report.summary.testCases.excluded, 0);
  }
  const excluded = {...scope, v8OnlyTestFiles: ['test/example.js'], v8OnlyReason: 'JS-only'};
  const duplicate = sourceCoverage(inventory, [], evidence([]), {...excluded, v8OnlyTestFiles: ['test/example.js', 'test/example.js']});
  assert.equal(duplicate.errors.length, 1);
  const conflict = sourceCoverage(inventory, [fixture('bad', ['test/example.js:2'])], evidence([['bad', {pass: false}]]), excluded);
  assert.equal(conflict.errors.length, 1);
  assert.equal(conflict.groups[1].status, 'observed-failure');
  assert.equal(conflict.groups[0].status, 'observed-failure');
  assert.equal(conflict.summary.testCases.excluded, 1);
  const neighbor = {...inventory[1], file: 'test/example.js.other', parent: undefined};
  const report = sourceCoverage([...inventory, neighbor], [], evidence([]), excluded);
  assert.equal(report.groups.at(-1).status, 'uncovered');
});

test('only boolean true observations can count as passing evidence', () => {
  for (const pass of ['true', 'false', 1, {}, [], false, null, undefined]) {
    const result = fixtureEvidence(['bad'], new Map([['bad', {pass}]]), 'parity');
    assert.equal(result.status, 'observed-failure');
    assert.equal(result.passed, 0);
  }
});

test('excluded builtin names do not exclude portable uses or imply runtime rejection', () => {
  const lpe = require(resolve(root, 'dist/lpe.js'));
  const suite = fixtures();
  const portable = suite.find(f => f.request.op === 'eval' && f.request.source === 'isa({1,2,3}, Array)');
  assert.ok(portable, 'Array constructor marker still has an independent portable fixture');
  assert.ok(compatibilityScope.jsOnlyBuiltins.includes('Array'));
  assert.equal(lpe.eval_lpe(portable.request.source), true);
  assert.deepEqual(portable.expected, {ok: true, value: true});
  for (const name of compatibilityScope.jsOnlyBuiltins) {
    const leaf = {...inventory[1], name: `suite / ${name}`};
    const linked = {...fixture('portable', ['test/example.js:2']), request: {op: 'parse', source: `${name}(value)`}};
    const report = sourceCoverage([inventory[0], leaf], [linked], evidence([['portable', {pass: true}]]), {...scope, jsOnlyBuiltins: [name]});
    assert.equal(report.groups[1].status, 'parity-passed-fixtures', name);
    assert.deepEqual(report.errors, [], name);
  }
});
