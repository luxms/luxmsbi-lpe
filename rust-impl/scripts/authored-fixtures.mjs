import {artifact as writeFileSync} from './artifacts.mjs';
import {resolve} from 'node:path';
import {root, encode} from './shared.mjs';
import {functionMetadata} from './metadata.mjs';
import {addFunctionsCoverage} from './functions-coverage.mjs';
import {addVarargCoverage} from './vararg-coverage.mjs';
import {addSyntaxCalendarCoverage} from './syntax-calendar-coverage.mjs';

const cases = [];
function add(id, request, value, extra = {}) {
  cases.push({id: `authored:${id}`, group: id.split('/')[0], origin: 'rust-impl/scripts/authored-fixtures.mjs', evidence: 'independent-authored', request: encode(request), expected: {ok: true, value: encode(value)}, ...extra});
}
const evalCase = (id, source, value, extra = {}) => add(id, {op: 'eval', source, ...extra}, value);
const astCase = (id, ast, value) => add(id, {op: 'evalAst', ast}, value);
const q = value => ['"', value];

for (const group of functionMetadata().groups) {
  if (!group.hasLpeName) continue;
  for (const name of group.names) {
    add(`function-metadata/${name}/name`, {op: 'evalAst', ast: ['str', name]}, group.canonical, {evidence: 'registry-metadata', covers: {apis: ['STDLIB']}});
    if (name !== group.canonical) add(`function-metadata/${name}/identity`, {op: 'evalAst', ast: ['strictEq', name, group.canonical]}, true,
      {evidence: 'registry-metadata', covers: {apis: ['STDLIB']}});
  }
}
evalCase('function-identity/authored-add-plus', 'equal(add, plus)', true);
evalCase('function-identity/authored-array-list', 'strictEq(array, list)', true);
evalCase('function-identity/authored-unequal', 'strictEq(add, subtract)', false);
evalCase('function-identity/authored-canonical-name', 'str(plus)', 'add');

for (const [name, checks] of [
  ['isString', [['text', true], [42, false], [null, false], ['\ud83d\ude00', true]]],
  ['isArray', [[[1, 2], true], [{a: 1}, false], [null, false]]],
  ['isHash', [[{a: 1}, true], [[], false], [null, false]]],
  ['isFunction', [[42, false], [undefined, false]]],
  ['isNumber', [[42, true], [NaN, true], [Infinity, true], ['42', false]]],
  ['isNumberLike', [[42, true], ['42', true], ['3.14', true], ['-1', false], ['01', false], ['', false], [[], false]]],
]) checks.forEach(([value, expected], index) => add(`api/${name}/${index}`, {op: 'api', name, args: [value]}, expected));
add('api/isFunction/host', {op: 'api', name: 'isFunction', binding: 'counter', hostFixtures: ['counter']}, true);
add('api/EVAL/explicit-value', {op: 'api', name: 'EVAL', args: ['x', {x: 42}], options: {}}, 42);
add('api/EVAL/no-library', {op: 'api', name: 'EVAL', args: ['add', {}], options: {}}, undefined);
for (const [id, name, args, expected] of [
  ['getvar', '$getvar$', [{x: 42}, 'x'], 42],
  ['getvar-missing', '$getvar$', [{}, 'x'], undefined],
  ['setvar', '$setvar$', [{x: 1}, 'x', 2], 2],
  ['var-read', '$var$', [{x: 3}, 'x'], 3],
  ['var-write', '$var$', [{}, 'x', 4], 4],
]) add(`api/${id}`, {op: 'api', name, args}, expected);
add('api/variables/read-write', {op: 'api', name: 'variableAccessors', context: {}, steps: [
  {name: '$var$', key: 'x', value: 1}, {name: '$getvar$', key: 'x'},
  {name: '$setvar$', key: 'x', value: 2}, {name: '$var$', key: 'x'},
]}, {values: [1, 1, 2, 2], context: {x: 2}}, {covers: {apis: ['$var$', '$getvar$', '$setvar$'], groups: ['test/test-host-compat.js:5']}});
add('api/variables/undefined-set', {op: 'api', name: 'variableAccessors', context: {x: 1}, steps: [
  {name: '$setvar$', key: 'x', value: undefined}, {name: '$getvar$', key: 'x'},
]}, {values: [undefined, undefined], context: {x: undefined}}, {covers: {apis: ['$setvar$', '$getvar$']}});
add('host/raw-ast', {op: 'eval', source: 'rawAst(throw("not executed"), x)', hostFixtures: ['host-special']}, [['throw', ['"', 'not executed']], 'x'], {covers: {apis: ['makeSF']}});
add('host/eval-in-context', {op: 'eval', source: 'evalAstHere(x + 2)', context: {x: 40}, hostFixtures: ['host-special']}, 42, {covers: {apis: ['makeSF', 'EVAL']}});
add('host/lookup-value', {op: 'eval', source: 'dynamicValue', hostFixtures: ['host-lookup']}, 42, {covers: {apis: ['$VAR$']}});
add('host/lookup-callable', {op: 'eval', source: 'dynamicFn(41)', hostFixtures: ['host-lookup']}, 42, {covers: {apis: ['$VAR$']}});
add('host/skip-lower', {op: 'eval', source: 'wrapped("x")', hostFixtures: ['host-skip']}, 'outer:base:x', {covers: {apis: ['makeSkipForm']}});
for (const [id, source, expected, options] of [
  ['read', 'libValue', 7, {}],
  ['hidden-function', 'libFn', undefined, {disallowLibFunctionsGetting: true}],
  ['call-hidden-function', 'libFn()', 42, {disallowLibFunctionsGetting: true}],
  ['protected-assignment', 'begin(libValue := 9, {libValue,libraryValue()})', [9, 7], {}],
]) add(`host/library/${id}`, {op: 'eval', source, options, hostFixtures: ['host-library']}, expected, {covers: {apis: ['$IS_LIB$']}});

for (const [id, source, expected, line] of [
  ['bound-month', 'bound("2023-03-15","month")', ['2023-03-01', '2023-03-31'], 231],
  ['bound-quarter', 'bound("2023-04-10","quarter")', ['2023-04-01', '2023-06-30'], 238],
  ['bound-year', 'bound("2023-11-15","year")', ['2023-01-01', '2023-12-31'], 245],
  ['extend-week', 'extend({"2023-01-01","2023-01-07"},1,"w")', ['2023-01-01', '2023-01-14'], 260],
  ['extend-negative-day', 'extend({"2023-01-01","2023-01-07"},-2,"d")', ['2023-01-01', '2023-01-05'], 270],
  ['extend-zero', 'extend("2023-01-01",0,"w")', ['2023-01-01', '2023-01-01'], 281],
  ['extend-month', 'extend("2023-01-01",2,"m")', ['2023-01-01', '2023-03-01'], 287],
  ['extend-year', 'extend("2023-01-01",1,"y")', ['2023-01-01', '2024-01-01'], 293],
  // dateShift has no 'h' branch; unknown units leave the date unchanged.
  ['extend-unknown-unit', 'extend("2023-01-01",1,"h")', ['2023-01-01', '2023-01-01'], 307],
  ['extend-quarter', 'extend("2023-01-01",1,"q")', ['2023-01-01', '2023-04-01'], 313],
  ['extend-negative-month', 'extend("2023-03-15",-1,"m")', ['2023-03-15', '2023-02-15'], 319],
]) add(`calendar-boundaries/${id}`, {op: 'eval', source}, expected, {origin: `test/test-datetime.js:${line}`, covers: {groups: [`test/test-datetime.js:${line}`, `test/test-datetime.js:${id.startsWith('bound') ? 221 : 253}`]}});
for (const [id, source, expected] of [
  ['sort-mutates', 'VAR a = {3,1,2} RETURN begin(sort(a),a)', [1, 2, 3]],
  ['sort-by-key', 'sortBy({{k=3},{k=1},{k=2}}, x => x.k)', [{k: 1}, {k: 2}, {k: 3}]],
  ['hybrid-tuple', 'VAR a = tuple(1,2,x=3) RETURN {a.(0),a.(1),a.x}', [1, 2, 3]],
  ['sample-member', 'containsKey({1,2,3}.frequencies(),sample({1,2,3}))', true],
  ['sample-all', 'sort(sample({1,2,3},9))', [1, 2, 3]],
  ['large-range', 'VAR a = range(1000) RETURN {count(a),first(a),last(a)}', [1000, 0, 999]],
  ['identity-reference', 'VAR a = {x=1} VAR b = ensureThat(a) RETURN begin(b.x := 2,a.x)', 2],
  ['ensure-once', 'ensureThat(counter()); counter()', 2],
]) evalCase(`integration/${id}`, source, expected, id === 'ensure-once' ? {hostFixtures: ['counter']} : {});

add('unicode/parse-emoji', {op: 'parse', source: '"\\ud83d\\ude00"'}, ['"', '\ud83d\ude00']);
add('unicode/deparse-emoji', {op: 'deparse', ast: ['"', '\ud83d\ude00']}, '"\ud83d\ude00"');
evalCase('unicode/eval-emoji', '"\\ud83d\\ude00"', '\ud83d\ude00');
evalCase('unicode/emoji-codeunit-length', 'length("\\ud83d\\ude00")', 2);
evalCase('unicode/slice-whole-emoji', 'slice("a\\ud83d\\ude00b",1,3)', '\ud83d\ude00');
evalCase('unicode/emoji-codeunit-index', 'indexOf("\\ud83d\\ude00x","x")', 2);
evalCase('unicode/split-valid-separator', 'split("\\ud83d\\ude00,x",",")', ['\ud83d\ude00', 'x']);
evalCase('unicode/pad-whole-emoji', 'padStart("x",3,"\\ud83d\\ude00")', '\ud83d\ude00x');
evalCase('unicode/concat-valid-strings', 'str("\\ud83d\\ude00","x")', '\ud83d\ude00x');

for (const [name, ast, expected] of [
  ['$$CONTEXT_NAME$$', ['$$CONTEXT_NAME$$'], 'STDLIB'],
  ...['&&', 'logical_and'].map(n => [n, [n, true, false], false]),
  ...['||', 'logical_or'].map(n => [n, [n, false, true], true]),
  ...['->', 'threadFirst'].map(n => [n, [n, 3, ['add', 4], ['multiply', 2]], 14]),
  ...['..', 'threadLast'].map(n => [n, [n, 2, ['subtract', 10]], 8]),
  ...['->fn', 'defFn'].map(n => [n, ['apply', [n, ['*', 'x', 2], 'x'], 3], 6]),
  ['lambda', ['apply', ['lambda', 'x', ['+', 'x', 1]], 4], 5],
  ['letstar', ['letstar', ['[', ['[', 'x', 2], ['[', 'y', ['+', 'x', 3]]], 'y'], 5],
  ['contains?', ['contains?', {a: 1}, q('a')], true],
  ['empty?', ['empty?', ['[']], true],
  ['pushStart', ['pushStart', 1, ['[', 2, 3]], [1, 2, 3]],
  ['q', ['q', 'hello'], 'hello'],
  ['values', ['values', {a: 1, b: 2}], [1, 2]],
  ['{', ['{', ['=', 'a', 1], ['=', 'b', 2]], {a: 1, b: 2}],
  ['reshape-symbol', ['\u2374', 5, 1, 2], [1, 2, 1, 2, 1]],
  ['true', 'true', true], ['false', 'false', false], ['null', 'null', null],
]) astCase(`additional-aliases/${name}`, ast, expected);
evalCase('options/default-string-resolution', 'unknownFixtureVariable', 'unknownFixtureVariable');
evalCase('options/explicit-empty-options', 'unknownFixtureVariable', undefined, {options: {}});
evalCase('options/explicit-resolve-string', 'unknownFixtureVariable', 'unknownFixtureVariable', {options: {resolveString: true}});
evalCase('options/set-options', 'set_options({resolveString = true}, unknownFixtureVariable)', 'unknownFixtureVariable', {options: {resolveString: false}});
for (const name of ['today', 'now']) evalCase(`dates/${name}-iso-shape`, `count(re_match(${name}(), "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", "g"))`, 1);
for (const name of ['print', 'prn', 'println']) evalCase(`output/${name}-return`, `${name}("fixture output")`, undefined);

for (const [name, values, expected] of [
  ...['+', 'add', 'plus'].map(n => [n, [2, 3, 4], 9]),
  ...['-', 'minus', 'subtract'].map(n => [n, [12, 3, 2], 7]),
  ...['*', 'mul', 'multiply'].map(n => [n, [2, 3, 4], 24]),
  ...['/', 'div', 'divide'].map(n => [n, [24, 3, 2], 4]),
  ...['=', 'eq', 'equal', '=='].map(n => [n, [2, q('2')], true]),
  ...['===', 'strictEq'].map(n => [n, [2, q('2')], false]),
  ...['!=', 'neq', 'ne'].map(n => [n, [2, 3], true]),
  ...['!==', 'strictNe'].map(n => [n, [2, q('2')], true]),
  ...['<', 'lt', 'less'].map(n => [n, [1, 2, 3], true]),
  ...['<=', 'le', 'lte'].map(n => [n, [2, 2, 3], true]),
  ...['>', 'gt', 'greater'].map(n => [n, [3, 2, 1], true]),
  ...['>=', 'ge', 'gte'].map(n => [n, [3, 2, 2], true]),
  ...['not', '!'].map(n => [n, [false], true]),
  ...['->any', 'toAny'].map(n => [n, [42], 42]),
  ...['->bool', 'toBool'].map(n => [n, [0], false]),
  ...['->int', 'toInt', 'toNumber'].map(n => [n, [q('42')], 42]),
  ...['->str', 'toStr'].map(n => [n, [42], '42']),
  ...['null?', 'isNull'].map(n => [n, [null], true]),
  ...['undefined?', 'isUndef', 'isUndefined'].map(n => [n, [undefined], true]),
  ...['true?', 'isTrue'].map(n => [n, [true], true]),
  ...['false?', 'isFalse'].map(n => [n, [false], true]),
  ...['bool?', 'isBool'].map(n => [n, [false], true]),
  ...['number?', 'isNumber'].map(n => [n, [42], true]),
  ...['numberlike?', 'isNumberLike'].map(n => [n, [q('42')], true]),
  ...['string?', 'isString'].map(n => [n, [q('x')], true]),
  ...['list?', 'isArray'].map(n => [n, [['[', 1]], true]),
  ...['hash?', 'isHash', 'obj?', 'isObj'].map(n => [n, [{a: 1}], true]),
  ...['func?', 'isFunction'].map(n => [n, [['fn', ['[', 'x'], 'x']], true]),
  ...['read-string', 'jsonParse', 'json_parse'].map(n => [n, [q('{"a":1}')], {a: 1}]),
  ...['pr_str', 'jsonJoin'].map(n => [n, [1, q('a')], '1 "a"']),
  ...['[]', 'astToString'].map(n => [n, [123], '123']),
  ...['nvl', 'coalesce'].map(n => [n, [null, undefined, 0], 0]),
  ...['()', 'identity', 'ensureThat'].map(n => [n, [false], false]),
  ...['`', '$AST$'].map(n => [n, [['+', 1, 2]], ['+', 1, 2]]),
]) astCase(`aliases/${name}`, [name, ...values], expected);

for (const [id, source, value] of [
  ['undefined', 'undefined', undefined], ['nan', '0 / 0', NaN],
  ['positive-infinity', '1 / 0', Infinity], ['negative-infinity', '-1 / 0', -Infinity],
  ['negative-zero', '-0', -0], ['function', 'fn({x}, x)', {$lpe: 'function'}],
  ['nested-undefined', '{a = undefined, b = {undefined, null}}', {a: undefined, b: [undefined, null]}],
]) evalCase(`encoding/${id}`, source, value);
add('encoding/context-date', {op: 'eval', source: 'value', context: {value: new Date('2024-01-02T00:00:00.000Z')}}, new Date('2024-01-02T00:00:00.000Z'));

for (const [id, source, value] of [
  ['sum', 'promise(2) + promise(3)', 5],
  ['sequential-bindings', 'VAR x = promise(2)\nVAR y = x * 10\nRETURN y', 20],
  ['multiple-bindings', 'VAR a = promise(1)\nVAR b = promise(2)\nVAR c = a + b\nRETURN c * 10', 30],
  ['return-body', 'VAR x = 7\nRETURN promise(3) + x', 10],
  ['nested-call', 'promise(promise(4)) + 1', 5],
  ['condition', 'if(promise(false), 10, promise(3))', 3],
  ['identity', 'ensureThat(promise(false))', false],
  ['begin-order', 'begin(x := promise(3), x + 4)', 7],
  ['double', 'asyncDouble(promise(21))', 42],
  ['short-circuit', 'if(promise(true), 42, asyncFail())', 42],
]) add(`async/${id}`, {op: 'eval', source, hostFixtures: ['async']}, value,
  {covers: {groups: ['test/test-async.js:25'], apis: ['unbox']}});
for (const [id, source, value, line] of [
  ['global-sum', 'p2 + p3', 5, 26],
  ['global-sequential-binding', 'VAR x = p2\nVAR y = x * 10\nRETURN y', 20, 34],
  ['global-multiple-binding', 'VAR a = p1\nVAR b = p2\nVAR c = a + b\nRETURN c * 10', 30, 39],
  ['global-return', 'VAR x = 7\nRETURN p3 + x', 10, 46],
]) add(`async/${id}`, {op: 'eval', source, hostFixtures: ['async-values']}, value,
  {origin: `test/test-async.js:${line}`, group: 'async tests', covers: {groups: [`test/test-async.js:${line}`, ...(line > 26 ? ['test/test-async.js:33'] : [])]}});
evalCase('async/eager-argument-start', 'begin(add(traceAsync("a",1),traceAsync("b",2)),trace())', ['start:a', 'start:b', 'end:a', 'end:b'], {hostFixtures: ['async-trace']});
evalCase('async/sequential-begin', 'begin(traceAsync("a",1),traceAsync("b",2),trace())', ['start:a', 'end:a', 'start:b', 'end:b'], {hostFixtures: ['async-trace']});
evalCase('async/lazy-branch-trace', 'begin(if(true,traceAsync("yes",1),traceAsync("no",2)),trace())', ['start:yes', 'end:yes'], {hostFixtures: ['async-trace']});

// Independently derived snapshots: each source tuple is [value, refs, listeners].
function streamCase(id, request, snapshots, lines = []) {
  add(`streams/${id}`, {op: 'stream', ...request}, {snapshots: snapshots.map(([value, sources, events = []]) => ({
    value, sources: Object.fromEntries(Object.entries(sources).map(([name, [value, refs, listeners]]) => [name, {value, refs, listeners}])), events,
  }))}, {covers: {
    groups: [32, ...lines].map(line => `test/test-streams.js:${line}`),
    ...(request.unboxReturn !== undefined ? {apis: ['unbox']} : {}),
  }});
}
streamCase('combine-and-dispose', {sources: {a: 2, b: 3}, source: 'a + b', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'next', name: 'b', value: 8},
  {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 9},
]}, [
  [5, {a: [2, 2, 1], b: [3, 2, 1]}],
  [7, {a: [4, 2, 1], b: [3, 2, 1]}, [7]],
  [12, {a: [4, 2, 1], b: [8, 2, 1]}, [7, 12]],
  [12, {a: [4, 1, 0], b: [8, 1, 0]}, [7, 12]],
  [12, {a: [9, 1, 0], b: [8, 1, 0]}, [7, 12]],
], [33]);
streamCase('switch-and-unsubscribe', {sources: {flag: true, a: 2, b: 3}, source: 'if(flag, a, b)', steps: [
  {op: 'next', name: 'flag', value: false}, {op: 'next', name: 'a', value: 100},
  {op: 'next', name: 'b', value: 4}, {op: 'release', name: 'result'},
]}, [
  [2, {flag: [true, 2, 1], a: [2, 2, 1], b: [3, 1, 0]}],
  [3, {flag: [false, 2, 1], a: [2, 1, 0], b: [3, 2, 1]}, [3]],
  [3, {flag: [false, 2, 1], a: [100, 1, 0], b: [3, 2, 1]}, [3]],
  [4, {flag: [false, 2, 1], a: [100, 1, 0], b: [4, 2, 1]}, [3, 4]],
  [4, {flag: [false, 1, 0], a: [100, 1, 0], b: [4, 1, 0]}, [3, 4]],
], [49]);
streamCase('unbox-reuses-child', {sources: {flag: 1, child: 2}, unboxReturn: 'child', steps: [
  {op: 'next', name: 'flag', value: 2}, {op: 'next', name: 'child', value: 7},
  {op: 'next', name: 'flag', value: 3}, {op: 'release', name: 'result'},
]}, [
  [2, {flag: [1, 2, 1], child: [2, 2, 1]}],
  [2, {flag: [2, 2, 1], child: [2, 2, 1]}],
  [7, {flag: [2, 2, 1], child: [7, 2, 1]}, [7]],
  [7, {flag: [3, 2, 1], child: [7, 2, 1]}, [7]],
  [7, {flag: [3, 1, 0], child: [7, 1, 0]}, [7]],
], [70]);
streamCase('stream-scalar-stream', {sources: {flag: true, child: 2}, source: 'if(flag, child, 42)', steps: [
  {op: 'next', name: 'flag', value: false}, {op: 'next', name: 'child', value: 9},
  {op: 'next', name: 'flag', value: true}, {op: 'next', name: 'flag', value: false},
  {op: 'release', name: 'result'},
]}, [
  [2, {flag: [true, 2, 1], child: [2, 2, 1]}],
  [42, {flag: [false, 2, 1], child: [2, 1, 0]}, [42]],
  [42, {flag: [false, 2, 1], child: [9, 1, 0]}, [42]],
  [9, {flag: [true, 2, 1], child: [9, 2, 1]}, [42, 9]],
  [42, {flag: [false, 2, 1], child: [9, 1, 0]}, [42, 9, 42]],
  [42, {flag: [false, 1, 0], child: [9, 1, 0]}, [42, 9, 42]],
], [82]);
streamCase('duplicate-argument-emissions', {sources: {a: 2}, source: 'a + a', steps: [
  {op: 'next', name: 'a', value: 3}, {op: 'next', name: 'a', value: 3}, {op: 'release', name: 'result'},
]}, [
  [4, {a: [2, 3, 2]}],
  [6, {a: [3, 3, 2]}, [5, 6]],
  [6, {a: [3, 3, 2]}, [5, 6, 6, 6]],
  [6, {a: [3, 1, 0]}, [5, 6, 6, 6]],
], [94]);
// The intermediate a + b starts with its own ref; releasing its consumer leaves it live.
streamCase('nested-expression-ownership', {sources: {a: 2, b: 3, c: 4}, source: '(a + b) * c', steps: [
  {op: 'next', name: 'a', value: 5}, {op: 'next', name: 'c', value: 2},
  {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 7},
]}, [
  [20, {a: [2, 2, 1], b: [3, 2, 1], c: [4, 2, 1]}],
  [32, {a: [5, 2, 1], b: [3, 2, 1], c: [4, 2, 1]}, [32]],
  [16, {a: [5, 2, 1], b: [3, 2, 1], c: [2, 2, 1]}, [32, 16]],
  [16, {a: [5, 2, 1], b: [3, 2, 1], c: [2, 1, 0]}, [32, 16]],
  [16, {a: [7, 2, 1], b: [3, 2, 1], c: [2, 1, 0]}, [32, 16]],
], [33]);
streamCase('nonselected-branch-effects', {sources: {flag: true, a: 2, b: 3}, source: 'if(flag, a, begin(throw("unselected branch"), b))', steps: [
  {op: 'next', name: 'b', value: 10}, {op: 'next', name: 'a', value: 5},
  {op: 'next', name: 'flag', value: true}, {op: 'release', name: 'result'},
  {op: 'next', name: 'flag', value: false},
]}, [
  [2, {flag: [true, 2, 1], a: [2, 2, 1], b: [3, 1, 0]}],
  [2, {flag: [true, 2, 1], a: [2, 2, 1], b: [10, 1, 0]}],
  [5, {flag: [true, 2, 1], a: [5, 2, 1], b: [10, 1, 0]}, [5]],
  [5, {flag: [true, 2, 1], a: [5, 2, 1], b: [10, 1, 0]}, [5]],
  [5, {flag: [true, 1, 0], a: [5, 1, 0], b: [10, 1, 0]}, [5]],
  [5, {flag: [false, 1, 0], a: [5, 1, 0], b: [10, 1, 0]}, [5]],
], [49]);
streamCase('repeated-switching', {sources: {flag: true, a: 2, b: 3}, source: 'if(flag, a, b)', steps: [
  {op: 'next', name: 'flag', value: true}, {op: 'next', name: 'flag', value: false},
  {op: 'next', name: 'flag', value: false}, {op: 'next', name: 'a', value: 10},
  {op: 'next', name: 'flag', value: true}, {op: 'next', name: 'b', value: 20},
  {op: 'next', name: 'flag', value: false}, {op: 'next', name: 'flag', value: true},
  {op: 'release', name: 'result'},
]}, [
  [2, {flag: [true, 2, 1], a: [2, 2, 1], b: [3, 1, 0]}],
  [2, {flag: [true, 2, 1], a: [2, 2, 1], b: [3, 1, 0]}],
  [3, {flag: [false, 2, 1], a: [2, 1, 0], b: [3, 2, 1]}, [3]],
  [3, {flag: [false, 2, 1], a: [2, 1, 0], b: [3, 2, 1]}, [3]],
  [3, {flag: [false, 2, 1], a: [10, 1, 0], b: [3, 2, 1]}, [3]],
  [10, {flag: [true, 2, 1], a: [10, 2, 1], b: [3, 1, 0]}, [3, 10]],
  [10, {flag: [true, 2, 1], a: [10, 2, 1], b: [20, 1, 0]}, [3, 10]],
  [20, {flag: [false, 2, 1], a: [10, 1, 0], b: [20, 2, 1]}, [3, 10, 20]],
  [10, {flag: [true, 2, 1], a: [10, 2, 1], b: [20, 1, 0]}, [3, 10, 20, 10]],
  [10, {flag: [true, 1, 0], a: [10, 1, 0], b: [20, 1, 0]}, [3, 10, 20, 10]],
], [49]);
streamCase('retain-result-delays-disposal', {sources: {a: 2, b: 3}, source: 'a + b', steps: [
  {op: 'retain', name: 'result'}, {op: 'release', name: 'result'},
  {op: 'next', name: 'a', value: 4}, {op: 'release', name: 'result'}, {op: 'next', name: 'b', value: 9},
]}, [
  [5, {a: [2, 2, 1], b: [3, 2, 1]}],
  [5, {a: [2, 2, 1], b: [3, 2, 1]}],
  [5, {a: [2, 2, 1], b: [3, 2, 1]}],
  [7, {a: [4, 2, 1], b: [3, 2, 1]}, [7]],
  [7, {a: [4, 1, 0], b: [3, 1, 0]}, [7]],
  [7, {a: [4, 1, 0], b: [9, 1, 0]}, [7]],
], [33]);
streamCase('source-owner-release', {sources: {a: 2}, source: 'a + 1', steps: [
  {op: 'retain', name: 'a'}, {op: 'release', name: 'a'}, {op: 'release', name: 'a'},
  {op: 'next', name: 'a', value: 3}, {op: 'release', name: 'result'},
]}, [
  [3, {a: [2, 2, 1]}], [3, {a: [2, 3, 1]}], [3, {a: [2, 2, 1]}], [3, {a: [2, 1, 1]}],
  [4, {a: [3, 1, 1]}, [4]], [4, {a: [3, 0, 0]}, [4]],
], [33]);
streamCase('result-aliases-source', {sources: {a: 2}, source: 'a', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'next', name: 'result', value: 8},
  {op: 'retain', name: 'result'}, {op: 'release', name: 'result'}, {op: 'release', name: 'a'},
]}, [
  [2, {a: [2, 1, 0]}], [4, {a: [4, 1, 0]}, [4]], [8, {a: [8, 1, 0]}, [4, 8]],
  [8, {a: [8, 2, 0]}, [4, 8]], [8, {a: [8, 1, 0]}, [4, 8]], [8, {a: [8, 0, 0]}, [4, 8]],
]);
streamCase('unbox-custom-input', {sources: {tick: 0, child: 9}, unboxInput: 'tick', unboxReturn: 'child', steps: [
  {op: 'next', name: 'tick', value: 1}, {op: 'release', name: 'result'},
]}, [
  [9, {tick: [0, 2, 1], child: [9, 2, 1]}], [9, {tick: [1, 2, 1], child: [9, 2, 1]}],
  [9, {tick: [1, 1, 0], child: [9, 1, 0]}],
], [70]);
streamCase('unbox-input-is-child', {sources: {child: 2}, unboxInput: 'child', unboxReturn: 'child', steps: [
  {op: 'next', name: 'child', value: 5}, {op: 'release', name: 'result'},
]}, [
  [2, {child: [2, 3, 2]}], [5, {child: [5, 3, 2]}, [5]], [5, {child: [5, 1, 0]}, [5]],
], [70, 94]);
// VAR's body runs through begin, whose wrapper retains the twice(a) stream.
streamCase('source-defined-lambda', {sources: {a: 2}, source: 'VAR twice = x => x * 2 RETURN twice(a)', steps: [
  {op: 'next', name: 'a', value: 3}, {op: 'release', name: 'result'},
]}, [[4, {a: [2, 2, 1]}], [6, {a: [3, 2, 1]}, [6]], [6, {a: [3, 2, 1]}, [6]]]);
streamCase('scalar-result', {sources: {a: 2}, source: '42', steps: [{op: 'next', name: 'a', value: 4}]}, [
  [42, {a: [2, 1, 0]}], [42, {a: [4, 1, 0]}],
]);
streamCase('undefined-result', {sources: {}, source: 'undefined'}, [[undefined, {}]]);
const streamTaggedValue = {values: [undefined, NaN, -0, Infinity, -Infinity], date: new Date('2024-01-02T00:00:00.000Z')};
streamCase('recursive-tags', {sources: {flag: 1, child: streamTaggedValue}, unboxReturn: 'child', steps: [
  {op: 'next', name: 'child'}, {op: 'next', name: 'child', value: streamTaggedValue}, {op: 'release', name: 'result'},
]}, [
  [streamTaggedValue, {flag: [1, 2, 1], child: [streamTaggedValue, 2, 1]}],
  [undefined, {flag: [1, 2, 1], child: [undefined, 2, 1]}, [undefined]],
  [streamTaggedValue, {flag: [1, 2, 1], child: [streamTaggedValue, 2, 1]}, [undefined, streamTaggedValue]],
  [streamTaggedValue, {flag: [1, 1, 0], child: [streamTaggedValue, 1, 0]}, [undefined, streamTaggedValue]],
], [70]);

// Special-form boundaries, derived from their unbox calls rather than JS recordings.
streamCase('boundaries/and-selected-stream', {sources: {flag: 0, child: 5}, source: 'and(flag, child)', steps: [
  {op: 'next', name: 'child', value: 6}, {op: 'next', name: 'flag', value: 1},
  {op: 'next', name: 'child', value: 7}, {op: 'next', name: 'flag', value: 0}, {op: 'release', name: 'result'},
]}, [
  [0, {flag: [0, 2, 1], child: [5, 1, 0]}],
  [0, {flag: [0, 2, 1], child: [6, 1, 0]}],
  [6, {flag: [1, 2, 1], child: [6, 2, 1]}, [6]],
  [7, {flag: [1, 2, 1], child: [7, 2, 1]}, [6, 7]],
  [0, {flag: [0, 2, 1], child: [7, 1, 0]}, [6, 7, 0]],
  [0, {flag: [0, 1, 0], child: [7, 1, 0]}, [6, 7, 0]],
]);
// logicalOr creates toBool streams. Each selected child wrapper keeps its factory ref.
streamCase('boundaries/logical-or-coercion', {sources: {flag: 0, child: 0}, source: 'logicalOr(flag, child)', steps: [
  {op: 'next', name: 'child', value: 3}, {op: 'next', name: 'flag', value: 1},
  {op: 'next', name: 'child', value: 0}, {op: 'next', name: 'flag', value: 0}, {op: 'release', name: 'result'},
]}, [
  [false, {flag: [0, 2, 1], child: [0, 2, 1]}],
  [true, {flag: [0, 2, 1], child: [3, 2, 1]}, [true]],
  [true, {flag: [1, 2, 1], child: [3, 2, 1]}, [true, true]],
  [true, {flag: [1, 2, 1], child: [0, 2, 1]}, [true, true]],
  [false, {flag: [0, 2, 1], child: [0, 3, 2]}, [true, true, false]],
  [false, {flag: [0, 2, 1], child: [0, 3, 2]}, [true, true, false]],
]);
// A passing first comparison creates a new tail stream; switching does not dispose its owner ref.
streamCase('boundaries/chained-comparison-tail', {sources: {a: 5, b: 3, c: 4}, source: 'a < b <= c', steps: [
  {op: 'next', name: 'a', value: 2}, {op: 'next', name: 'c', value: 2},
  {op: 'next', name: 'b', value: 4}, {op: 'next', name: 'a', value: 6},
  {op: 'next', name: 'c', value: 9}, {op: 'release', name: 'result'},
]}, [
  [false, {a: [5, 2, 1], b: [3, 2, 1], c: [4, 1, 0]}],
  [true, {a: [2, 2, 1], b: [3, 2, 1], c: [4, 2, 1]}, [true]],
  [false, {a: [2, 2, 1], b: [3, 2, 1], c: [2, 2, 1]}, [true, false]],
  [false, {a: [2, 2, 1], b: [4, 2, 1], c: [2, 3, 2]}, [true, false, false]],
  [false, {a: [6, 2, 1], b: [4, 2, 1], c: [2, 3, 2]}, [true, false, false, false]],
  [false, {a: [6, 2, 1], b: [4, 2, 1], c: [9, 3, 2]}, [true, false, false, false]],
  [false, {a: [6, 1, 0], b: [4, 1, 0], c: [9, 3, 2]}, [true, false, false, false]],
]);
streamCase('boundaries/property-read', {sources: {record: {score: 2}}, source: 'record.score', steps: [
  {op: 'next', name: 'record', value: {score: 5}}, {op: 'next', name: 'record', value: {}},
  {op: 'release', name: 'result'}, {op: 'next', name: 'record', value: {score: 9}},
]}, [
  [2, {record: [{score: 2}, 2, 1]}], [5, {record: [{score: 5}, 2, 1]}, [5]],
  [undefined, {record: [{}, 2, 1]}, [5, undefined]], [undefined, {record: [{}, 1, 0]}, [5, undefined]],
  [undefined, {record: [{score: 9}, 1, 0]}, [5, undefined]],
]);
// Assignment unboxes both the root object and RHS, creates the path, and mutates the current root.
streamCase('boundaries/property-write', {sources: {record: {}, input: 2}, source: 'record.child.score := input', steps: [
  {op: 'next', name: 'input', value: 5}, {op: 'next', name: 'record', value: {child: {score: 100}, keep: 1}},
  {op: 'release', name: 'result'}, {op: 'next', name: 'input', value: 7},
]}, [
  [2, {record: [{child: {score: 2}}, 2, 1], input: [2, 2, 1]}],
  [5, {record: [{child: {score: 5}}, 2, 1], input: [5, 2, 1]}, [5]],
  [5, {record: [{child: {score: 5}, keep: 1}, 2, 1], input: [5, 2, 1]}, [5, 5]],
  [5, {record: [{child: {score: 5}, keep: 1}, 1, 0], input: [5, 1, 0]}, [5, 5]],
  [5, {record: [{child: {score: 5}, keep: 1}, 1, 0], input: [7, 1, 0]}, [5, 5]],
]);
// def assigns resolved scalars and returns its own stream; bare assignment aliases the source.
streamCase('boundaries/def-unboxes', {sources: {a: 2}, source: 'def(saved, a)', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 5},
]}, [[2, {a: [2, 2, 1]}], [4, {a: [4, 2, 1]}, [4]], [4, {a: [4, 1, 0]}, [4]], [4, {a: [5, 1, 0]}, [4]]]);
streamCase('boundaries/bare-assignment-alias', {sources: {a: 2}, source: 'saved := a', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'release', name: 'result'},
]}, [[2, {a: [2, 1, 0]}], [4, {a: [4, 1, 0]}, [4]], [4, {a: [4, 0, 0]}, [4]]]);
// coalesce checks the Stream object, not its null/undefined payload, and never evaluates fallback.
streamCase('boundaries/coalesce-stream-object', {sources: {a: null}, source: 'coalesce(a, throw("fallback"))', steps: [
  {op: 'next', name: 'a'}, {op: 'next', name: 'a', value: 0}, {op: 'release', name: 'result'},
]}, [
  [null, {a: [null, 1, 0]}], [undefined, {a: [undefined, 1, 0]}, [undefined]],
  [0, {a: [0, 1, 0]}, [undefined, 0]], [0, {a: [0, 0, 0]}, [undefined, 0]],
]);
// let resolves the binding expression's stream; its identity wrapper retains the source after release.
streamCase('boundaries/let-dynamic-bindings', {sources: {bindings: {x: 2}}, source: 'let(identity(bindings), x + 1)', steps: [
  {op: 'next', name: 'bindings', value: {x: 4}}, {op: 'release', name: 'result'},
  {op: 'next', name: 'bindings', value: {x: 5}},
]}, [
  [3, {bindings: [{x: 2}, 2, 1]}], [5, {bindings: [{x: 4}, 2, 1]}, [5]],
  [5, {bindings: [{x: 4}, 2, 1]}, [5]], [5, {bindings: [{x: 5}, 2, 1]}, [5]],
]);
// let* resolves a before evaluating later bindings, so y and the body are scalars on each update.
streamCase('boundaries/let-star-sequential', {sources: {a: 2}, source: 'VAR x = a VAR y = x * 2 RETURN y + 1', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 5},
]}, [[5, {a: [2, 2, 1]}], [9, {a: [4, 2, 1]}, [9]], [9, {a: [4, 1, 0]}, [9]], [9, {a: [5, 1, 0]}, [9]]]);
// Project hybrid tuples before encoding; the tuple/hash intermediates keep their owner references.
streamCase('boundaries/tuple-reconstruction', {sources: {a: 2, b: 3}, source: '(t => {t.(0), t.label})(tuple(a, label = b))', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'next', name: 'b', value: 8},
  {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 6},
]}, [
  [[2, 3], {a: [2, 2, 1], b: [3, 2, 1]}], [[4, 3], {a: [4, 2, 1], b: [3, 2, 1]}, [[4, 3]]],
  [[4, 8], {a: [4, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
  [[4, 8], {a: [4, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
  [[4, 8], {a: [6, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
]);
streamCase('boundaries/hash-reconstruction', {sources: {a: 2, b: 3}, source: 'values(hash(left = a, right = b))', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'next', name: 'b', value: 8},
  {op: 'release', name: 'result'}, {op: 'next', name: 'a', value: 6},
]}, [
  [[2, 3], {a: [2, 2, 1], b: [3, 2, 1]}], [[4, 3], {a: [4, 2, 1], b: [3, 2, 1]}, [[4, 3]]],
  [[4, 8], {a: [4, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
  [[4, 8], {a: [4, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
  [[4, 8], {a: [6, 2, 1], b: [8, 2, 1]}, [[4, 3], [4, 8]]],
]);
// repeat retains one a per element; shrinking n leaves the previous inner stream's subscriptions live.
streamCase('boundaries/repeat-resizes', {sources: {n: 2, a: 3}, source: 'repeat(n, a)', steps: [
  {op: 'next', name: 'a', value: 4}, {op: 'next', name: 'n', value: 1}, {op: 'next', name: 'a', value: 5},
  {op: 'next', name: 'n', value: 0}, {op: 'next', name: 'a', value: 6}, {op: 'release', name: 'result'},
]}, [
  [[3, 3], {n: [2, 2, 1], a: [3, 3, 2]}],
  [[4, 4], {n: [2, 2, 1], a: [4, 3, 2]}, [[4, 3], [4, 4]]],
  [[4], {n: [1, 2, 1], a: [4, 4, 3]}, [[4, 3], [4, 4], [4]]],
  [[5], {n: [1, 2, 1], a: [5, 4, 3]}, [[4, 3], [4, 4], [4], [5]]],
  [[], {n: [0, 2, 1], a: [5, 4, 3]}, [[4, 3], [4, 4], [4], [5], []]],
  [[], {n: [0, 2, 1], a: [6, 4, 3]}, [[4, 3], [4, 4], [4], [5], []]],
  [[], {n: [0, 1, 0], a: [6, 4, 3]}, [[4, 3], [4, 4], [4], [5], []]],
]);
// Each mapped element has its own offset subscription; aggregation publishes each intermediate array.
streamCase('boundaries/mapit-inner-streams', {sources: {items: [1, 2], offset: 10}, source: 'mapit(items, it + offset)', steps: [
  {op: 'next', name: 'offset', value: 20}, {op: 'next', name: 'items', value: [3]},
  {op: 'next', name: 'offset', value: 1}, {op: 'release', name: 'result'}, {op: 'next', name: 'offset', value: 2},
]}, [
  [[11, 12], {items: [[1, 2], 2, 1], offset: [10, 3, 2]}],
  [[21, 22], {items: [[1, 2], 2, 1], offset: [20, 3, 2]}, [[21, 12], [21, 22]]],
  [[23], {items: [[3], 2, 1], offset: [20, 4, 3]}, [[21, 12], [21, 22], [23]]],
  [[4], {items: [[3], 2, 1], offset: [1, 4, 3]}, [[21, 12], [21, 22], [23], [4]]],
  [[4], {items: [[3], 1, 0], offset: [1, 4, 3]}, [[21, 12], [21, 22], [23], [4]]],
  [[4], {items: [[3], 1, 0], offset: [2, 4, 3]}, [[21, 12], [21, 22], [23], [4]]],
]);
// filterit's !!EVAL sees truthy Stream objects, not their boolean payloads; only items drives output.
streamCase('boundaries/filterit-stream-predicates', {sources: {items: [1, 3], cutoff: 2}, source: 'filterit(items, it > cutoff)', steps: [
  {op: 'next', name: 'cutoff', value: 9}, {op: 'next', name: 'items', value: [4]},
  {op: 'next', name: 'items', value: []}, {op: 'next', name: 'cutoff', value: 0}, {op: 'release', name: 'result'},
]}, [
  [[1, 3], {items: [[1, 3], 2, 1], cutoff: [2, 3, 2]}],
  [[1, 3], {items: [[1, 3], 2, 1], cutoff: [9, 3, 2]}],
  [[4], {items: [[4], 2, 1], cutoff: [9, 4, 3]}, [[4]]],
  [[], {items: [[], 2, 1], cutoff: [9, 4, 3]}, [[4], []]],
  [[], {items: [[], 2, 1], cutoff: [0, 4, 3]}, [[4], []]],
  [[], {items: [[], 1, 0], cutoff: [0, 4, 3]}, [[4], []]],
]);
for (const [id, request] of [
  ['unknown-source', {sources: {a: 2}, source: 'a', steps: [{op: 'next', name: 'missing', value: 3}]}],
  ['unknown-step', {sources: {a: 2}, source: 'a', steps: [{op: 'subscribe', name: 'a'}]}],
  ['scalar-step-target', {sources: {}, source: '42', steps: [{op: 'release', name: 'result'}]}],
  ['reserved-source-name', {sources: {result: 2}, source: 'result'}],
  ['missing-unbox-child', {sources: {flag: 1}, unboxReturn: 'missing'}],
  ['missing-unbox-input', {sources: {child: 2}, unboxReturn: 'child'}],
  ['ambiguous-expression', {sources: {flag: 1, child: 2}, source: 'child', unboxReturn: 'child'}],
]) cases.push({id: `authored:streams/errors/${id}`, group: 'streams', origin: 'rust-impl/scripts/authored-fixtures.mjs', evidence: 'independent-authored',
  request: {op: 'stream', ...request}, expected: {ok: false, error: {kind: 'ProtocolError'}}});

for (const [id, ast, value] of [
  ['positional', ['testFunc', 3, 4], {a: 3, b: 4, args: [], kwargs: {}}],
  ['expressions', ['testFunc', ['+', 1, 2], ['*', 3, 4]], {a: 3, b: 12, args: [], kwargs: {}}],
  ['extra-positional', ['testFunc', 1, 2, 3, 4], {a: 1, b: 2, args: [3, 4], kwargs: {}}],
  ['named', ['testFunc', ['=', 'b', 4], ['=', 'a', 3]], {a: 3, b: 4, args: [], kwargs: {}}],
  ['mixed', ['testFunc', ['=', 'b', 4], 3], {a: 3, b: 4, args: [], kwargs: {}}],
  ['extra-named', ['testFunc', ['=', 'b', 4], ['=', 'c', 5], 3], {a: 3, b: 4, args: [], kwargs: {c: 5}}],
  ['missing', ['testFunc', 1], {a: 1, b: undefined, args: [], kwargs: {}}],
  ['null', ['testFunc', null, null], {a: null, b: null, args: [], kwargs: {}}],
]) add(`vararg/${id}`, {op: 'evalAst', ast, hostFixtures: ['vararg-pair']}, value, {covers: {apis: ['makeVararg']}});
add('vararg/callback', {op: 'evalAst', ast: ['testFunc', 5, ['+', 1, 2]], hostFixtures: ['vararg-callback']}, {a: 5, callbackResult: 3}, {covers: {apis: ['makeVararg']}});
for (const [id, name, input, expected] of [
  ['backreference', 'aa', '42', 42],
  ['lookbehind', 'aaab', '42', 42],
  ['alternation-start', 'prefix', '42', 42],
  ['alternation-end', 'xpost', '42', 42],
  ['nonmatch', 'xy', '42', '42'],
  ['legacy-dot-emoji', '\ud83d\ude00', '42', '42'],
  ['legacy-dot-ascii', 'x', '', false],
]) add(`regex-vararg/${id}`, {op: 'evalAst', ast: ['testFunc', ['=', name, q(input)]], hostFixtures: ['vararg-regex']}, {[name]: expected}, {covers: {apis: ['makeVararg']}});
evalCase('control/counter-sequence', 'begin(counter(), counter(), counter())', 3, {hostFixtures: ['counter']});
evalCase('control/lazy-if', 'if(false, counter(), counter())', 1, {hostFixtures: ['counter']});
evalCase('control/lazy-coalesce', 'coalesce(0, counter()); counter()', 1, {hostFixtures: ['counter']});

for (const [id, source, expected] of [
  ['omitted-first', 'f(,1)', ['f', undefined, 1]],
  ['omitted-middle', 'f(1,,3)', ['f', 1, undefined, 3]],
  ['omitted-two', 'f(,)', ['f', undefined, undefined]],
  ['precedence', '1 + 2 * 3', ['+', 1, ['*', 2, 3]]],
  ['sequential-var', 'VAR x = 1 VAR y = x + 2 RETURN y * 3', ['let*', ['[', ['[', 'x', 1], ['[', 'y', ['+', 'x', 2]]], ['*', 'y', 3]]],
]) add(`parse/${id}`, {op: 'parse', source}, expected);
for (const [id, ast, expected] of [
  ['omitted-first', ['f', undefined, 1], 'f(, 1)'],
  ['precedence', ['+', 1, ['*', 2, 3]], '1 + 2 * 3'],
  ['grouping', ['*', ['+', 'x', 'y'], 'z'], '(x + y) * z'],
  ['lambda', ['=>', 'x', ['+', 'x', 1]], 'x => x + 1'],
]) add(`deparse/${id}`, {op: 'deparse', ast}, expected);

for (const [id, request, message] of [
  ['missing-close', {op: 'parse', source: 'f(1'}, undefined],
  ['unterminated-string', {op: 'parse', source: '"hello'}, undefined],
  ['explicit-throw', {op: 'eval', source: 'throw("fixture failure")'}, 'fixture failure'],
  ['async-rejection', {op: 'eval', source: 'asyncFail()', hostFixtures: ['async']}, 'async failure'],
  ['loop-limit', {op: 'eval', source: 'do(true, 1)', options: {maxLoopIterations: 3}}, 'maximum number of iterations'],
]) cases.push({id: `authored:errors/${id}`, group: 'errors', origin: 'rust-impl/scripts/authored-fixtures.mjs', evidence: 'independent-authored', request,
  expected: {ok: false, error: {kind: request.op === 'parse' ? 'SyntaxError' : 'Error', ...(message ? {messageIncludes: message} : {})}}});

// Nondeterministic operations are tested through deterministic invariants.
evalCase('random/range', 'VAR x = rand() RETURN x >= 0 and x < 1', true);
evalCase('random/shuffle-permutation', 'sort(shuffle({1,2,3,4}))', [1, 2, 3, 4]);
evalCase('random/sample-size', 'count(sample({1,2,3,4}, 2))', 2);
// Keep the former gap IDs as ordinary JS-behavior regressions.
for (const [id, text, pattern, flags, expected] of [
  ['v-flag', 'abc', 'a', 'v', ['a']],
  ['v-intersection', 'abc', '[[a-z]&&[^aeiou]]', 'v', ['b']],
  ['variable-lookbehind', 'aaab', '(?<=a+)b', '', ['b']],
  ['capture-reset', 'ba', '(a|(b))+', '', ['ba', 'a', undefined]],
  ['quantified-optional-capture', 'y', '(?:(x)?y){2}', '', null],
  ['legacy-casefold-class', '\u212a\u017f\u1e9e', '[a-z\u00df]+', 'i', null],
  ['legacy-casefold-escape', 'k', '\\u212a', 'i', null],
  ['modifier-group', 'A', '(?i:a)', '', ['A']],
]) {
  const match = ['re_match', q(text), q(pattern), q(flags)];
  add(`regex-gap/${id}`, {op: 'evalAst', ast: expected === null ? match : ['slice', match, 0]}, expected,
    {origin: 'rust-impl/tests/builtins.rs'});
}
for (const [id, text, pattern, flags, expected] of [
  ['capture-reset-after-match', 'xyy', '(?:(x)?y){2}', '', ['xyy', undefined]],
  ['legacy-casefold-positive', 'KkSs\u00df\u212a\u017f\u1e9e', '[a-z\u00df]+', 'gi', ['KkSs\u00df']],
  ['unicode-casefold-escape', 'k', '\\u212a', 'iu', ['k']],
  ['scoped-i', 'Ab AB', '(?i:a)b', 'g', ['Ab']],
  ['scoped-disable-i', 'aB Ab AB', '(?-i:a)b', 'gi', ['aB']],
  ['scoped-nested-i', 'AbC ABC abc', '(?i:a(?-i:b)c)', 'g', ['AbC', 'abc']],
  ['scoped-m', 'x\rA\u2028B', '(?m:^[AB]$)', 'g', ['A', 'B']],
  ['scoped-disable-m', 'x\nA', '(?-m:^A)', 'm', null],
  ['scoped-s', 'a\nb a\rX', '(?s:a.b).', 'g', ['a\nb ']],
  ['scoped-disable-s', 'a\nb aXb', '(?-s:a.b)', 'gs', ['aXb']],
  ['v-subtraction', 'abcXYZ', '[[a-z]--[aeiou]]+', 'gv', ['bc']],
  ['v-property-intersection', 'A\u03b1B\u03b2', '[\\p{Letter}&&\\p{Script=Greek}]+', 'gv', ['\u03b1', '\u03b2']],
  ['v-strings', 'ab cd a', '[\\q{ab|cd}]', 'gv', ['ab', 'cd']],
  ['lookbehind-direction', 'abc', '(?<=([ab]+)([bc]+))$', '', ['', 'a', 'bc']],
  ['lookbehind-backreference', 'aab', '(?<=\\1(a))b', '', ['b', 'a']],
  ['sticky-emoji', '\ud83d\ude00\ud83d\ude00x\ud83d\ude00', '\ud83d\ude00', 'gyu', ['\ud83d\ude00', '\ud83d\ude00']],
  ['global-emoji', '\ud83d\ude00\ud83d\ude00x\ud83d\ude00', '\ud83d\ude00', 'gu', ['\ud83d\ude00', '\ud83d\ude00', '\ud83d\ude00']],
  ['empty-sticky-legacy', '\ud83d\ude00', '', 'gy', ['', '', '']],
  ['empty-sticky-unicode', '\ud83d\ude00', '', 'gyu', ['', '']],
  ['empty-sticky-v', '\ud83d\ude00', '', 'gyv', ['', '']],
  ['sticky-empty-stops-at-gap', 'ab', '(?=a)', 'gy', ['']],
  ['global-unmatched', 'z', 'a', 'g', null],
  ['literal-emoji-quantifier-legacy', '\ud83d\ude00\ud83d\ude00', '^\ud83d\ude00{2}$', '', null],
  ['literal-emoji-grouped-legacy', '\ud83d\ude00\ud83d\ude00', '^(?:\ud83d\ude00){2}$', '', ['\ud83d\ude00\ud83d\ude00']],
  ['literal-emoji-quantifier-u', '\ud83d\ude00\ud83d\ude00', '^\ud83d\ude00{2}$', 'u', ['\ud83d\ude00\ud83d\ude00']],
  ['literal-emoji-quantifier-v', '\ud83d\ude00\ud83d\ude00', '^\ud83d\ude00{2}$', 'v', ['\ud83d\ude00\ud83d\ude00']],
  ['escaped-emoji-legacy', '\ud83d\ude00', '\\ud83d\\ude00', '', ['\ud83d\ude00']],
  ['escaped-emoji-u', '\ud83d\ude00', '\\ud83d\\ude00', 'u', ['\ud83d\ude00']],
  ['escaped-emoji-v', '\ud83d\ude00', '\\ud83d\\ude00', 'v', ['\ud83d\ude00']],
  ['codepoint-escape-legacy', 'u'.repeat(61), '\\u{61}', '', ['u'.repeat(61)]],
  ['codepoint-escape-legacy-not-a', 'a', '\\u{61}', '', null],
  ['codepoint-escape-u', 'a', '\\u{61}', 'u', ['a']],
  ['codepoint-escape-v', 'a', '\\u{61}', 'v', ['a']],
  ['escaped-group-name-legacy', 'aa', '(?<\\u0061>a)\\k<a>', '', ['aa', 'a']],
  ['codepoint-group-name-legacy', 'aa', '(?<\\u{61}>a)\\k<a>', '', ['aa', 'a']],
  ['unpaired-escape-not-emoji-legacy', '\ud83d\ude00a', '\\ud83d\\u0061', '', null],
  ['unpaired-escape-not-emoji-u', '\ud83d\ude00a', '\\ud83d\\u0061', 'u', null],
  ['unpaired-escape-not-emoji-v', '\ud83d\ude00a', '\\ud83d\\u0061', 'v', null],
]) {
  const match = ['re_match', q(text), q(pattern), q(flags)];
  astCase(`regex-behavior/${id}`, expected === null ? match : ['slice', match, 0], expected);
}
for (const flags of ['', 'u', 'v']) evalCase(`regex-behavior/unpaired-escape-${flags || 'legacy'}`,
  `VAR text = str(slice("\\ud83d\\ude00",0,1),"a") VAR m = re_match(text,"\\\\ud83d\\\\u0061",${JSON.stringify(flags)}) RETURN {strictEq(m.(0),text),m.index,length(m.(0))}`, [true, 0, 2]);
for (const [id, left, right] of [
  ['kelvin', 'k', '\u212a'], ['long-s', 's', '\u017f'], ['sharp-s', '\u00df', '\u1e9e'],
  ['ohm', '\u03c9', '\u2126'], ['angstrom', '\u00e5', '\u212b'], ['greek-expansion', '\u1f80', '\u1f88'],
]) for (const flags of ['i', 'iu', 'iv']) {
  const unicode = flags.length > 1;
  for (const [kind, text, pattern, matched] of [
    ['class', right, `[${left}]`, [right]],
    ['literal', right, left, [right]],
    ['backreference', left + right, `^(${left})\\1$`, [left + right, left]],
  ]) {
    const match = ['re_match', q(text), q(pattern), q(flags)];
    astCase(`regex-canonicalization/${id}-${kind}-${flags}`, unicode ? ['slice', match, 0] : match, unicode ? matched : null);
  }
}
for (const flags of ['', 'u', 'v']) for (const [id, name] of [
  ['literal', '\ud801\udc00'], ['escaped', '\\uD801\\uDC00'], ['codepoint', '\\u{10400}'],
]) astCase(`regex-group-name/${id}-${flags || 'legacy'}`,
  ['slice', ['re_match', q('aa'), q(`(?<${name}>a)\\k<${name}>`), q(flags)], 0], ['aa', 'a']);
// Project named array properties explicitly: the shared wire format only carries plain arrays.
for (const [id, text, pattern, flags, expected] of [
  ['no-flags', 'a', '(a)', '', [['a', 'a'], 0, 'a', undefined, undefined, undefined]],
  ['named-unmatched-emoji', '\ud83d\ude00b', '(?<face>\ud83d\ude00)(?<missing>a)?(?<tail>b)', 'du',
    [['\ud83d\ude00b', '\ud83d\ude00', undefined, 'b'], 0, '\ud83d\ude00b', {face: '\ud83d\ude00', missing: undefined, tail: 'b'}, [[0, 3], [0, 2], undefined, [2, 3]], {face: [0, 2], missing: undefined, tail: [2, 3]}]],
  ['legacy-utf16-offset', '\ud83d\ude00a', '(?<letter>a)(b)?', 'd',
    [['a', 'a', undefined], 2, '\ud83d\ude00a', {letter: 'a'}, [[2, 3], [2, 3], undefined], {letter: [2, 3]}]],
  ['empty-versus-unmatched', 'b', '(?<empty>a*)(?<missing>x)?b', 'd',
    [['b', '', undefined], 0, 'b', {empty: '', missing: undefined}, [[0, 1], [0, 0], undefined], {empty: [0, 0], missing: undefined}]],
  ['unnamed', 'b', '(a)?b', 'd', [['b', undefined], 0, 'b', undefined, [[0, 1], undefined], undefined]],
  ['capture-reset', 'ba', '(?<last>a|(?<inner>b))+', 'd',
    [['ba', 'a', undefined], 0, 'ba', {last: 'a', inner: undefined}, [[0, 2], [1, 2], undefined], {last: [1, 2], inner: undefined}]],
  ['lookbehind-direction', 'abc', '(?<=(?<left>[ab]+)(?<right>[bc]+))$', 'd',
    [['', 'a', 'bc'], 3, 'abc', {left: 'a', right: 'bc'}, [[3, 3], [0, 1], [1, 3]], {left: [0, 1], right: [1, 3]}]],
  ['lookbehind-repeated-capture', 'abc', '(?<=([abc])+)$', 'd', [['', 'a'], 3, 'abc', undefined, [[3, 3], [0, 1]], undefined]],
  ['global-d-has-no-metadata', '\ud83d\ude00\ud83d\ude00x\ud83d\ude00', '(?<face>\ud83d\ude00)', 'dgyu',
    [['\ud83d\ude00', '\ud83d\ude00'], undefined, undefined, undefined, undefined, undefined]],
  ['sticky-unicode', '\ud83d\ude00x', '(?<face>.)', 'duy',
    [['\ud83d\ude00', '\ud83d\ude00'], 0, '\ud83d\ude00x', {face: '\ud83d\ude00'}, [[0, 2], [0, 2]], {face: [0, 2]}]],
  ['unicode-sets', '\ud83d\ude00x', '(?<face>.)', 'dv',
    [['\ud83d\ude00', '\ud83d\ude00'], 0, '\ud83d\ude00x', {face: '\ud83d\ude00'}, [[0, 2], [0, 2]], {face: [0, 2]}]],
  ['duplicate-name-first', 'a', '(?<x>a)|(?<x>b)', 'd', [['a', 'a', undefined], 0, 'a', {x: 'a'}, [[0, 1], [0, 1], undefined], {x: [0, 1]}]],
  ['duplicate-name-second', 'b', '(?<x>a)|(?<x>b)', 'd', [['b', undefined, 'b'], 0, 'b', {x: 'b'}, [[0, 1], undefined, [0, 1]], {x: [0, 1]}]],
]) evalCase(`regex-metadata/${id}`,
  `VAR m = re_match(${[text, pattern, flags].map(value => JSON.stringify(value)).join(',')}) RETURN {slice(m,0),m.index,m.input,m.groups,if(isUndefined(m.indices),m.indices,slice(m.indices,0)),m.indices.groups}`, expected);
for (const [id, text, pattern, name, capture] of [
  ['unnamed-same-range', 'a', '((?<named>a))', 'named', 2],
  ['nested-outer-same-range', 'a', '(?<outer>(?<inner>a))', 'outer', 1],
  ['nested-inner-same-range', 'a', '(?<outer>(?<inner>a))', 'inner', 2],
  ['duplicate-name-first', 'a', '(?<x>a)|(?<x>b)', 'x', 1],
  ['duplicate-name-second', 'b', '(?<x>a)|(?<x>b)', 'x', 2],
]) evalCase(`regex-indices-identity/${id}`,
  `VAR m = re_match(${JSON.stringify(text)},${JSON.stringify(pattern)},"d") VAR named = m.indices.groups.${name} RETURN {strictEq(named,m.indices.(0)),strictEq(named,m.indices.(1)),strictEq(named,m.indices.(2)),begin(named.(0) := 99,m.indices.(${capture}).(0)),m.indices.(0).(0)}`,
  [false, capture === 1, capture === 2, 99, 0]);
for (const [id, pattern, flags] of [
  ['exclusive-unicode-flags', 'a', 'uv'], ['duplicate-v', 'a', 'vv'], ['unknown-flag', 'a', 'z'],
  ['duplicate-d', 'a', 'dd'], ['duplicate-y', 'a', 'yy'], ['uppercase-flag', 'a', 'U'],
  ['unclosed-class', '[', ''], ['unclosed-group', '(', ''], ['reversed-quantifier', 'a{2,1}', ''],
  ['incomplete-hex', '\\x', 'u'], ['unicode-identity-escape', '\\!', 'u'], ['unknown-property', '\\p{NotAProperty}', 'u'],
  ['atomic-group', '(?>a)', ''], ['unscoped-modifier', '(?i)a', ''], ['overlapping-modifier', '(?i-i:a)', ''],
  ['duplicate-modifier', '(?ii:a)', ''], ['global-modifier', '(?g:a)', ''], ['empty-modifier', '(?-:a)', ''],
  ['missing-intersection-operand', '[a&&]', 'v'], ['missing-subtraction-operand', '[a--]', 'v'],
  ['duplicate-name-same-alternative', '(?<a>x)(?<a>y)', ''], ['invalid-name', '(?<1>x)', ''], ['unknown-backreference', '(?<a>x)\\k<b>', ''],
]) cases.push({id: `authored:regex-errors/${id}`, group: 'regex-errors', origin: 'rust-impl/scripts/authored-fixtures.mjs', evidence: 'independent-authored',
  request: {op: 'evalAst', ast: ['re_match', q('a'), q(pattern), q(flags)]}, expected: {ok: false, error: {kind: 'SyntaxError'}}});
for (const [id, object, pattern, expected] of [
  ['lookbehind', {ab: 1, aaab: 2, b: 3}, '/(?<=a+)b$/', {ab: 11, aaab: 12, b: 3}],
  ['backreference', {aa: 1, ab: 2, bb: 3}, '/^(.)\\1$/', {aa: 11, ab: 2, bb: 13}],
  ['non-unicode-dot', {a: 1, '\ud83d\ude00': 2}, '/^.$/', {a: 11, '\ud83d\ude00': 2}],
  ['non-unicode-two-dots', {a: 1, '\ud83d\ude00': 2}, '/^..$/', {a: 1, '\ud83d\ude00': 12}],
]) add(`regex-update-in/${id}`, {op: 'evalAst', context: {object}, ast: ['update_in', 'object', ['[', q(pattern)], ['=>', 'value', ['+', 'value', 10]], true]}, expected);
addFunctionsCoverage(add);
addVarargCoverage(add);
addSyntaxCalendarCoverage(add);
writeFileSync(resolve(root, 'rust-impl/fixtures/authored.cases.json'), `${JSON.stringify(cases, null, 2)}\n`);
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Wrote'} ${cases.length} authored cases.`);
