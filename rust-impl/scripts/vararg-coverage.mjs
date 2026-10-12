// Expectations are authored from the source assertions, never captured from a runner.
export function addVarargCoverage(add) {
  const arg = (index, action, count) => [ 'arg', index, ...(action ? [action] : []), ...(count === undefined ? [] : [count]) ];
  const kwarg = (name, action, count) => [ 'kwarg', name, ...(action ? [action] : []), ...(count === undefined ? [] : [count]) ];
  const pair = {a: arg(0), b: arg(1)};
  const fullPair = {...pair, args: ['args'], kwargs: ['kwargs']};
  const callback = {a: arg(0), bIsFunction: arg(1, 'isFunction'), bResult: arg(1, 'call')};
  const track = n => ['track', n];
  const q = value => ['"', value];
  function leaf(line, section, title, id, template, ast, result, value, request = {}) {
    const origin = `test/test-vararg.js:${line}`;
    add(`vararg-source/${id}`, {op: 'evalAst', ast, hostFixtures: ['vararg-probe'], vararg: {template, result}, ...request}, value,
      {origin, group: `makeVararg tests / ${section} / ${title}`, covers: {groups: [origin], apis: ['makeVararg']}});
  }
  const positional = 'basic positional arguments';
  leaf(7, positional, 'should pass positional arguments in order', 'positional', ['a', 'b'],
    ['testFunc', 3, 4], fullPair, {a: 3, b: 4, args: [], kwargs: {}});
  leaf(20, positional, 'should evaluate expressions in positional arguments', 'positional-expressions', ['a', 'b'],
    ['testFunc', ['+', 1, 2], ['*', 3, 4]], pair, {a: 3, b: 12});
  leaf(31, positional, 'should handle extra positional arguments', 'extra-positional', ['a', 'b'],
    ['testFunc', 1, 2, 3, 4, 5], fullPair, {a: 1, b: 2, args: [3, 4, 5], kwargs: {}});

  const named = 'named arguments (kwargs)';
  leaf(44, named, 'should handle named arguments', 'named', ['a', 'b'],
    ['testFunc', ['=', 'b', 4], ['=', 'a', 3]], fullPair, {a: 3, b: 4, args: [], kwargs: {}});
  leaf(56, named, 'should handle mixed positional and named arguments', 'mixed', ['a', 'b'],
    ['testFunc', ['=', 'b', 4], 3], fullPair, {a: 3, b: 4, args: [], kwargs: {}});
  leaf(68, named, 'should pass extra kwargs not in template', 'extra-named', ['a', 'b'],
    ['testFunc', ['=', 'b', 4], ['=', 'c', 5], 3], fullPair, {a: 3, b: 4, args: [], kwargs: {c: 5}});
  leaf(80, named, 'should evaluate expressions in kwargs', 'named-expressions', ['a'],
    ['testFunc', 1, ['=', 'extra', ['+', 10, 20]]], {a: arg(0), extra: kwarg('extra')}, {a: 1, extra: 30});

  const fn = 'fn type arguments (wrapped in JS function)';
  leaf(93, fn, 'should pass fn-type arguments as callable JS functions', 'callable', ['a', 'callback:fn'],
    ['testFunc', 5, ['+', 1, 2]], {a: arg(0), callbackIsFunction: arg(1, 'isFunction')}, {a: 5, callbackIsFunction: true});
  leaf(106, fn, 'should evaluate AST when fn-type callback is called', 'callback', ['a', 'callback:fn'],
    ['testFunc', 5, ['+', 1, 2]], {a: arg(0), callbackResult: arg(1, 'call')}, {a: 5, callbackResult: 3});
  leaf(119, fn, 'should handle mixed evaluated and fn-type arguments', 'mixed-lazy', ['a:int', 'b:fn', 'c'],
    ['testFunc', ['+', 1, 1], ['*', 2, 2], ['-', 10, 3]], {...callback, c: arg(2)}, {a: 2, bIsFunction: true, bResult: 4, c: 7});
  leaf(138, fn, 'should allow multiple calls to fn-type callback', 'repeated-callback', ['callback:fn'],
    ['testFunc', ['counter']], arg(0, 'calls', 3), [1, 2, 3]);

  const patterns = 'type patterns (regex matching)';
  leaf(153, patterns, 'should match argument names with regex patterns', 'patterns', ['value', 'onClick', 'onHover', {'on.*': 'fn'}],
    ['testFunc', ['+', 1, 2], ['*', 3, 4], ['-', 5, 6]],
    {value: arg(0), onClickIsFunction: arg(1, 'isFunction'), onHoverIsFunction: arg(2, 'isFunction'), onClickResult: arg(1, 'call'), onHoverResult: arg(2, 'call')},
    {value: 3, onClickIsFunction: true, onHoverIsFunction: true, onClickResult: 12, onHoverResult: -1});
  leaf(175, patterns, 'should apply fn pattern to extra kwargs not in template', 'extra-patterns', ['value', {'on.*': 'fn'}],
    ['testFunc', 5, ['=', 'onClick', ['+', 1, 2]], ['=', 'onHover', ['*', 3, 4]], ['=', 'other', ['-', 10, 3]]],
    {value: arg(0), onClickIsFunction: kwarg('onClick', 'isFunction'), onHoverIsFunction: kwarg('onHover', 'isFunction'), onClickResult: kwarg('onClick', 'call'), onHoverResult: kwarg('onHover', 'call'), other: kwarg('other')},
    {value: 5, onClickIsFunction: true, onHoverIsFunction: true, onClickResult: 3, onHoverResult: 12, other: 7});
  leaf(209, patterns, 'should allow calling fn-type kwargs multiple times', 'repeated-kwarg', [{'on.*': 'fn'}],
    ['testFunc', ['=', 'onTick', ['inc']]], kwarg('onTick', 'calls', 3), [1, 2, 3]);
  leaf(225, 'inline type syntax', 'should parse inline type from template string', 'inline', ['a:int', 'b:fn'],
    ['testFunc', ['+', 5, 5], ['*', 2, 3]], callback, {a: 10, bIsFunction: true, bResult: 6});

  const context = 'context variable resolution';
  leaf(244, context, 'should resolve context variables in arguments', 'context', ['a', 'b'],
    ['testFunc', 'x', 'y'], pair, {a: 100, b: 200}, {context: {x: 100, y: 200}});
  leaf(257, context, 'should defer evaluation for fn-type arguments until called', 'lazy-context', ['a', 'b:fn'],
    ['testFunc', 'x', 'x'], callback, {a: 100, bIsFunction: true, bResult: 100}, {context: {x: 100}});

  const order = 'evaluation order';
  leaf(273, order, 'should evaluate arguments in the order they appear in the call', 'order', ['a', 'b'],
    ['testFunc', track(1), ['=', 'b', track(2)], track(3), ['=', 'x', track(4)]], {...fullPair, evalOrder: ['trace']},
    {a: 1, b: 2, args: [3], kwargs: {x: 4}, evalOrder: [1, 2, 3, 4]});
  leaf(299, order, 'should not evaluate fn-type args but still preserve order for others', 'lazy-order', ['a', 'b:fn', 'c'],
    ['testFunc', track(1), track(2), track(3)], {a: arg(0), c: arg(2), evalOrder: ['trace']}, {a: 1, c: 3, evalOrder: [1, 3]});
  leaf(322, order, 'should preserve order with mixed positional and kwargs', 'mixed-order', ['x'],
    ['testFunc', ['=', 'a', track(1)], track(2), ['=', 'b', track(3)]], {evalOrder: ['trace']}, {evalOrder: [1, 2, 3]});

  const edge = 'edge cases';
  leaf(345, edge, 'should handle empty template', 'empty-template', [],
    ['testFunc', 1, 2, ['=', 'x', 3]], {args: ['args'], kwargs: ['kwargs']}, {args: [1, 2], kwargs: {x: 3}});
  leaf(356, edge, 'should handle undefined/missing arguments', 'missing', ['a', 'b', 'c'],
    ['testFunc', 1, 2], {...pair, c: arg(2)}, {a: 1, b: 2, c: undefined});
  leaf(368, edge, 'should handle null values', 'null', ['a', 'b'],
    ['testFunc', null, null], pair, {a: null, b: null});

  // Additional boundaries are API coverage, not claims about source-test leaves.
  function boundary(id, template, ast, result, value, extra = {}, request = {}) {
    add(`vararg-boundary/${id}`, {op: 'evalAst', ast, hostFixtures: ['vararg-probe'], vararg: {template, result}, ...request}, value,
      {origin: 'rust-impl/scripts/vararg-coverage.mjs', group: 'makeVararg boundaries', covers: {apis: ['makeVararg']}, ...extra});
  }
  boundary('named-lazy-order', ['a', 'b:fn', 'c'], ['testFunc', ['=', 'b', track(2)], track(1), track(3)],
    {before: ['trace'], results: arg(1, 'calls', 3), after: ['trace']}, {before: [1, 3], results: [2, 2, 2], after: [1, 3, 2, 2, 2]});
  boundary('scope-capture', ['callback:fn'], ['let', {x: 41}, ['testFunc', ['+', 'x', 1]]],
    arg(0, 'calls', 3), [42, 42, 42], {}, {context: {x: 999}});
  boundary('captured-options', ['callback:fn'], ['testFunc', 'unbound'], arg(0, 'call'), undefined, {}, {options: {resolveString: false}});
  boundary('duplicate-keywords-evaluate-all', ['a'], ['testFunc', ['=', 'a', track(1)], ['=', 'a', track(2)]],
    {a: arg(0), evalOrder: ['trace']}, {a: 2, evalOrder: [1, 2]});
  boundary('explicit-undefined', ['a', 'b', 'c'], ['testFunc', undefined, null], {...pair, c: arg(2)}, {a: undefined, b: null, c: undefined});
  boundary('inline-cast', ['a: INT', 'b:bool'], ['testFunc', q('12.8'), 0], pair, {a: 12.8, b: false});
  boundary('exact-type-over-pattern', ['onClick:fn', {'on.*': 'int'}], ['testFunc', ['counter']], arg(0, 'calls', 3), [1, 2, 3]);
  boundary('type-object-over-inline', ['a:fn', {a: 'int'}], ['testFunc', q('12')], arg(0), 12);
  boundary('array-type-declaration', [['fn']], ['testFunc', ['=', '0', ['counter']]], kwarg('0', 'calls', 3), [1, 2, 3]);
  boundary('empty-array-type-declaration', [[]], ['testFunc', 1, 2], ['args'], [1, 2]);
  boundary('unrecognized-inline-suffix-is-name', ['a:fn '], ['testFunc', ['=', 'a:fn ', 7]], arg(0), 7);
  boundary('unused-lazy-error', ['callback:fn'], ['testFunc', ['probeFail']], arg(0, 'isFunction'), true);
  const failure = messageIncludes => ({expected: {ok: false, error: {kind: 'Error', messageIncludes}}});
  boundary('lazy-error-on-call', ['callback:fn'], ['testFunc', ['probeFail']], arg(0, 'call'), undefined, failure('vararg probe failure'));
  boundary('eager-error', ['a'], ['testFunc', ['probeFail']], arg(0), undefined, failure('vararg probe failure'));
  boundary('template-not-array', null, ['testFunc'], ['args'], undefined, failure('LPE vararg template must be array'));
  boundary('template-after-types', [{}, 'a'], ['testFunc'], ['args'], undefined, failure('LPE vararg template definition error: must be no arguments after type declaration'));
  boundary('template-after-array-types', [[], 'a'], ['testFunc'], ['args'], undefined, failure('LPE vararg template definition error: must be no arguments after type declaration'));
  for (const [id, entry, type] of [['number', 1, 'number'], ['null', null, 'object'], ['boolean', true, 'boolean']]) {
    boundary(`template-${id}`, [entry], ['testFunc'], ['args'], undefined, failure(`LPE vararg template definition error: type ${type} is not supported`));
  }
}
