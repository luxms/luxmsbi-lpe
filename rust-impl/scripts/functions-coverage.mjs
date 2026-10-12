import {callName, literal, parseFile, walk} from './source-analysis.mjs';

const sourceFile = 'test/test-lpe-functions.js';

// Read names, not expectations, from the source so origin/group identify the exact leaf.
function sourceLeaves() {
  const describes = [];
  const leaves = new Map();
  walk(parseFile(sourceFile), node => {
    if (node.type !== 'CallExpression') return;
    const kind = callName(node.callee);
    if (kind === 'describe') describes.push(node);
    if (kind !== 'it') return;
    const parents = describes.filter(parent => parent.start < node.start && parent.end > node.end);
    leaves.set(node.loc.start.line, [...parents, node].map(test => literal(test.arguments[0])).join(' / '));
  });
  return leaves;
}

export function addFunctionsCoverage(add) {
  const leaves = sourceLeaves();
  const leaf = (id, line, request, value, extra = {}) => {
    const group = leaves.get(line);
    if (!group) throw new Error(`Expected an it leaf at ${sourceFile}:${line}`);
    add(`functions-coverage/${id}`, request, value, {
      ...extra, origin: `${sourceFile}:${line}`, group,
      covers: {groups: [`${sourceFile}:${line}`]},
    });
  };
  const evaluate = (id, line, source, value, request = {}) => leaf(id, line, {op: 'eval', source, ...request}, value);

  // The source checks both the type and bounds of each of 100 independent draws.
  evaluate('rand', 349,
    'map(range(100), fn({}, VAR r = rand() RETURN {isNumber(r), r >= 0 and r < 1}))',
    Array.from({length: 100}, () => [true, true]));

  // Tagged JSON cannot encode named array properties. Check type, indexed values,
  // all enumerable keys, and the named value before crossing that boundary.
  for (const [id, source, values, keys, named] of [
    ['positional', 'tuple(1, 2, 3)', [1, 2, 3], ['0', '1', '2'], undefined],
    ['named', 'tuple(a = 32)', [], ['a'], 32],
    ['mixed', 'tuple(1, 2, a = 32)', [1, 2], ['0', '1', 'a'], 32],
  ]) evaluate(`tuple/${id}`, 411,
    `VAR t = ${source} RETURN {isArray(t), slice(t, 0), keys(t), t.a}`,
    [true, values, keys, named]);

  evaluate('sort-mutation', 686, 'VAR res = sort(arr) RETURN {res, arr}',
    [[1, 2, 3], [1, 2, 3]], {context: {arr: [3, 1, 2]}});
  evaluate('sort-by-name', 695, 'map(sortBy(arr, fn({o}, o.name)), fn({x}, x.name))',
    ['Alice', 'Ben', 'Duncan'], {context: {arr: [{name: 'Ben'}, {name: 'Alice'}, {name: 'Duncan'}]}});
  evaluate('shuffle-invariants', 769,
    'VAR res = shuffle(arr) RETURN {res.length, sort(res, fn({a, b}, a - b))}',
    [5, [1, 2, 3, 4, 5]], {context: {arr: [1, 2, 3, 4, 5]}});
  for (const [id, count] of [['default', ''], ['one', ', 1']]) {
    evaluate(`sample/${id}`, 778,
      `VAR res = sample({1, 2, 3, 4, 5}${count}) RETURN some({1, 2, 3, 4, 5}, fn({x}, strictEq(x, res)))`, true);
  }
  evaluate('sample/three', 782, 'sample({1, 2, 3, 4, 5}, 3).length', 3);
  evaluate('sample/over-length', 786, 'sample({1, 2, 3, 4, 5}, 10).length', 5);

  evaluate('update-in-regex-keys', 917,
    'VAR res = update_in({Ivan = {id = 1}, Bob = {id = 2}}, {"/.+/", "name"}, fn({x, path}, nvl(x, path.(0))), true) RETURN {res.Ivan.name, res.Bob.name}',
    ['Ivan', 'Bob']);
  evaluate('merge-full', 938,
    'merge({{a = 1}, {a = 3, b = 2}}, fn({k, vals, has}, vals), "full").a', [1, 3]);

  for (const [id, line, source] of [
    ['raw', 993, String.raw`re_match("test(aaa)", r"\((.*)\)")`],
    ['plain', 999, String.raw`re_match("test(aaa)", "\\((.*)\\)")`],
  ]) evaluate(`re-match/${id}`, line,
    `VAR res = ${source} RETURN {toBool(res), res.(0), res.(1)}`, [true, '(aaa)', 'aaa']);

  evaluate('assign/named-array', 1135,
    'VAR res = begin(obj := {}, obj.a := 20, obj) RETURN {isArray(res), slice(res, 0), keys(res), res.a}',
    [true, [], ['a'], 20]);
  for (const [id, source, value] of [
    ['nested-array', 'begin(obj := {{}}, obj.(0).(0) := 20, obj)', [[20]]],
    ['object', 'begin(obj := {=}, obj.a := 20, obj)', {a: 20}],
    ['nested-object', 'begin(obj := {=}, obj.a.b.c := 20, obj)', {a: {b: {c: 20}}}],
  ]) evaluate(`assign/${id}`, 1135, source, value);
  evaluate('property-write', 1209, '{property(obj, "b", 2), obj.b}', [2, 2], {context: {obj: {a: 1}}});

  const loopAst = ['begin', [':=', 'x', 0], ['do', true, [':=', 'x', ['+', 'x', 1]]]];
  for (const [id, limit, options] of [['explicit', 10, {maxLoopIterations: 10}], ['default', 100, undefined]]) {
    leaf(`do-guard/${id}`, 1251, {op: 'evalAst', ast: loopAst, ...(options ? {options} : {})}, undefined, {
      expected: {ok: false, error: {kind: 'Error',
        messageIncludes: `The maximum number of iterations (${limit}) is exceeded. Check the condition or change the limit in the settings.`}},
    });
  }
  leaf('throw', 1297, {op: 'eval', source: 'throw("err")'}, undefined,
    {expected: {ok: false, error: {kind: 'Error', messageIncludes: 'err'}}});

  // Compare identities inside the evaluator, not JSON copies of the returned values.
  for (const [id, value] of [['object', {id: 42}], ['array', [1, 2, 3]]]) {
    evaluate(`ensure-that/identity-${id}`, 1377, 'strictEq(ensureThat(value), value)', true, {context: {value}});
  }
  evaluate('ensure-that/single-evaluation', 1383,
    'VAR state = {calls = 0} VAR next = fn({}, state.calls := state.calls + 1) RETURN {ensureThat(next()), state.calls}', [1, 1]);
  // LPE closures supply the original custom-context behavior without new host hooks.
  evaluate('ensure-that/sql-context', 1397,
    'let({{"=", fn({column, value}, str(column, " = ", value))}}, ensureThat(id = 42))', 'id = 42');
  evaluate('ensure-that/wrapper-override', 1402,
    'let({{"ensureThat", fn({value}, str("WHERE ", value))}}, ensureThat("id = 42"))', 'WHERE id = 42');
  // A lookup function yields a pending promise; eager let bindings would resolve it first.
  evaluate('ensure-that/async-argument', 1407,
    'let(key => if(key = "value", promise(false)), ensureThat(value))', false, {hostFixtures: ['async']});

  evaluate('pipeline-hash', 1477, `
    VAR res = begin(
      h := hash(),
      h := set(h, "name", "Alice"),
      h := set(h, "age", 30),
      h := assoc_in(h, {"addr", "city"}, "NYC"),
      merge({h, {active = true}})
    ) RETURN {res.name, res.active, res.addr.city}
  `, ['Alice', true, 'NYC']);
  evaluate('large-range', 1520, 'VAR arr = range(1000) RETURN {arr.length, arr.(0), arr.(999)}', [1000, 0, 999]);
  evaluate('distinct-objects', 1549, `
    distinct(
      {{id = 1, name = "A"}, {id = 2, name = "B"}, {id = 1, name = "C"}},
      fn({x, y}, x.id = y.id)
    ).length
  `, 2);
}
