// Runner contracts used below:
// - api/exportType: typeof the named public export (request.export).
// - api/calendarInvariant: evaluate request.source between two host UTC clock
//   reads; compare to either host date's independently computed check result.
//   Checks: utc-date, utc-year-prefix, utc-week (Monday..Sunday), utc-extend-five.
//   Return a boolean. Do not obtain the expected date through LPE's today().
// - api/syntaxDiagnostic: parse and catch a real syntax error; project its JSON
//   diagnostic as {crs, firstCarets: (first || []).map(token => token.crs)}.
//   Keep an absent crs as undefined, and reject successful parses/non-JSON errors.
// - source-skip: the four nested toStart wrappers from test/test-lisp.js:4-29,
//   including the special form's replacement AST and final STDLIB fallback.
// No clocks, LPE evaluation, artifact writes, or Rust-derived expectations here.
export function addSyntaxCalendarCoverage(add) {
  function check(id, file, line, request, value, extra = {}) {
    const origin = `${file}:${line}`;
    add(`syntax-calendar/${id}`, request, value, {
      origin,
      covers: {groups: [origin]},
      ...extra,
    });
  }
  const calendarFile = 'test/test-datetime.js';
  const parserFile = 'test/test.js';
  const calendar = (id, line, source, value) => check(`calendar/${id}`, calendarFile, line, {op: 'eval', source}, value);
  const parse = (id, line, source, ast) => check(`parser/${id}`, parserFile, line, {op: 'parse', source}, ast);

  for (const [id, line, source, invariant] of [
    ['today-current-utc-date', 5, 'today()', 'utc-date'],
    ['today-current-year', 16, 'today()', 'utc-year-prefix'],
    // A single argument is the unit, not a start date. The original tests pass
    // today's unquoted YYYY-MM-DD arithmetic here; it is an unknown unit.
    ['start-no-unit', 182, 'toStart(today())', 'utc-date'],
    ['start-single-date-is-unit', 182, 'toStart("1900-01-01")', 'utc-date'],
    ['end-no-unit', 214, 'toEnd(today())', 'utc-date'],
    ['end-single-date-is-unit', 214, 'toEnd("1900-01-01")', 'utc-date'],
    ['bound-current-week', 222, 'bound(today(), "week")', 'utc-week'],
    ['bound-current-week-short-unit', 222, 'bound(today(), "w")', 'utc-week'],
    ['extend-current-five-days', 254, 'extend(today(), 5, "d")', 'utc-extend-five'],
  ]) {
    check(`calendar/${id}`, calendarFile, line,
      {op: 'api', name: 'calendarInvariant', source, check: invariant}, true);
  }
  calendar('today-shape', 11, '{isString(today()), length(today()), count(re_match(today(), "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", "g"))}', [true, 10, 1]);
  calendar('shift-date-pair', 108, "dateShift(['2023-10-01', '2023-10-15'], 10, 'day')", ['2023-10-11', '2023-10-25']);
  calendar('extend-january-pair', 299, "extend(['2023-01-01', '2023-01-31'], 1, 'm')", ['2023-01-01', '2023-02-28']);
  calendar('extend-leap-january-pair', 299, "extend(['2024-01-01', '2024-01-31'], 1, 'm')", ['2024-01-01', '2024-02-29']);
  calendar('isoy-string', 490, 'isoy("1999-12-31")', '1999');
  calendar('isoy-string-type', 490, 'isString(isoy("1999-12-31"))', true);
  calendar('isom-string', 516, 'isom("1999-12-31")', '1999-12');
  calendar('isom-string-type', 516, 'isString(isom("1999-12-31"))', true);

  check('parser/parse-export', parserFile, 7, {op: 'api', name: 'exportType', export: 'parse'}, 'function');
  parse('parse-export-call', 7, '1 + 2', ['+', 1, 2]);

  // Preserve the original UI inputs, with strict numeric expectations instead
  // of the upstream assertions' coercing assert.deepEqual numeric strings.
  parse('ui-filters', 100,
    'mlp(filter(id=[12,3]||title~"abc"),filter(id=2),filter(id=3241324132))',
    ['mlp',
      ['filter', ['or', ['=', 'id', ['[', 12, 3]], ['~', 'title', ['"', 'abc']]]],
      ['filter', ['=', 'id', 2]],
      ['filter', ['=', 'id', 3241324132]],
    ]);
  parse('ui-filter-method-chain', 100,
    'mlp(filter(id=[12,3]),filter(id=2),filter(pt=7&&qty=1)).ddl(234)',
    ['.', ['mlp',
      ['filter', ['=', 'id', ['[', 12, 3]]],
      ['filter', ['=', 'id', 2]],
      ['filter', ['and', ['=', 'pt', 7], ['=', 'qty', 1]]],
    ], ['ddl', 234]]);
  const title = '\u043f\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f\u043c';
  parse('ui-arrays-large-number-and-title', 100,
    `mlp([1,2,3],[3,4,5],[20,33,4422274183274832676487168124214]).djl(3,title~'${title}')`,
    ['.', ['mlp', ['[', 1, 2, 3], ['[', 3, 4, 5], ['[', 20, 33, 4422274183274832676487168124214]],
      ['djl', 3, ['~', 'title', ["'", title]]]]);

  parse('logical-filters', 108,
    'where(id=[12,3] and title~"abc" or id=2 and id=3241324132)',
    ['where', ['and', ['=', 'id', ['[', 12, 3]],
      ['or', ['~', 'title', ['"', 'abc']], ['and', ['=', 'id', 2], ['=', 'id', 3241324132]]]]]);
  const nestedNot = ['not', ['()', ['or', 3, ['()', ['and', 5, ['not', ['()', ['-', 4, 5]]]]]]]];
  parse('logical-nested-not', 108, 'where( 6 and not (3 or (5 and not (4-5))))',
    ['where', ['and', 6, nestedNot]]);
  parse('logical-nested-and-or-not', 108,
    'where( 6 and not (3 or (5 and not (4-5))) or not (a and (b or c)) and not (x or not y))',
    ['where', ['and', 6, ['or', nestedNot,
      ['and', ['not', ['()', ['and', 'a', ['()', ['or', 'b', 'c']]]]],
        ['not', ['()', ['or', 'x', ['not', 'y']]]]]]]]);
  const logicalCalls = ['where', ['or', ['()', ['and', 'a', ['or', 'b', 'c']]],
    ['or', ['()', ['<', ['avg', 'd'], ['avg', 'e']]],
      ['()', ['and', ['=', 'e', 20], ['parse_kv', ['.', 'locations', 'src_id']]]]]]];
  parse('logical-call-and-property', 108,
    'where((a and b or c) or (avg(d) < avg(e)) or (e = 20 and parse_kv(locations.src_id)))', logicalCalls);
  parse('logical-mixed-symbols-and-words', 108,
    'where((a && b || c) or (avg(d) < avg(e)) || (e = 20 and parse_kv(locations.src_id)))', logicalCalls);

  for (const [id, semicolon, comma, ast] of [
    ['both-empty', 'f(;)', 'f(,)', ['f', undefined, undefined]],
    ['trailing-empty', 'f(a;)', 'f(a,)', ['f', 'a', undefined]],
    ['leading-empty', 'f(;a)', 'f(,a)', ['f', undefined, 'a']],
    ['middle-empty', 'f(a;;b)', 'f(a,,b)', ['f', 'a', undefined, 'b']],
  ]) {
    parse(`missing-args/${id}/semicolon`, 271, semicolon, ast);
    parse(`missing-args/${id}/comma`, 271, comma, ast);
  }

  for (const [id, source, crs, firstCarets] of [
    ['adjacent-calls', 'a()b()', '---^--', []],
    ['tuple-children', 'x ? (1, 2)', '----^-----', ['-----^----', '--------^-']],
    ['end-of-input', 'f(', undefined, []],
  ]) {
    check(`parser/caret/${id}`, parserFile, 306,
      {op: 'api', name: 'syntaxDiagnostic', source}, {crs, firstCarets});
  }

  // All two ASTs x two lint modes at the dynamic upstream it() are represented.
  // The raw AST render, the exact normalized AST, and three stable cycles are
  // separate checks; a source-only roundtrip cannot test the first transition.
  for (const [id, ast, source, normalized] of [
    ['precedence', ['*', ['+', 'x', 'y'], 'z'], '(x + y) * z', ['*', ['()', ['+', 'x', 'y']], 'z']],
    ['lambda-call', [['=>', 'x', ['+', 'x', 1]], 2], '(x => x + 1)(2)', [['()', ['=>', 'x', ['+', 'x', 1]]], 2]],
  ]) {
    for (const lint of [false, true]) {
      const options = {lint};
      const prefix = `deparser/normalize/${id}/${lint ? 'formatted' : 'compact'}`;
      const file = 'test/test-deparse-forms-roundtrip.js';
      check(`${prefix}/render`, file, 65, {op: 'deparse', ast, options}, source);
      check(`${prefix}/normalized-ast`, file, 65, {op: 'parse', source, options}, normalized);
      check(`${prefix}/stable-cycles`, file, 65, {op: 'parse', source, options}, normalized,
        {kind: 'roundtrip', evidence: 'upstream-metamorphic-relation'});
    }
  }

  const skipFile = 'test/test-lisp.js';
  const skipExpected = 'Start1 Ast1 Start2 Ast2 2025-02-03';
  check('fallback/source-skip-ast', skipFile, 137,
    {op: 'evalAst', ast: ['toStart', ["'", '20240203'], ["'", 'w']], hostFixtures: ['source-skip']}, skipExpected);
  check('fallback/source-skip-parsed', skipFile, 137,
    {op: 'eval', source: "toStart('20240203', 'w')", hostFixtures: ['source-skip']}, skipExpected);
}
