const assert = require('assert');
const {parse, deparse} = require('../dist/lpe');

function assertRoundtrip(source) {
  const expected = parse(source);
  for (const lint of [false, true]) {
    let printed = deparse(expected, {lint});
    for (let cycle = 0; cycle < 3; cycle++) {
      const label = `${source}; lint=${lint}; cycle=${cycle}; output=${printed}`;
      const reparsed = parse(printed);
      assert.deepStrictEqual(reparsed, expected, label);
      const next = deparse(reparsed, {lint});
      assert.strictEqual(next, printed, label);
      printed = next;
    }
  }
}

describe('LPE deparse operator roundtrips', function () {
  this.timeout(20000);

  it('preserves every infix operator and its aliases', function () {
    for (const operator of [
      ':', ':=', '<-', '=>', '&&', 'and', '∧', '||', 'or', '∨',
      '⍱', '⍲', '⊣', '⊢', '⍴', 'in', 'is', '~', '=', '≠',
      '==', '===', '!==', '!=', '<', '<=', '≤', '>', '>=', '≥',
      '<>', '@', '+', '-', '#', '*', '/', '.', '..', '->', '->>', '::',
    ]) {
      assertRoundtrip(`a ${operator} b`);
      assertRoundtrip(`a ${operator} b ${operator} c`);
      assertRoundtrip(`(a ${operator} b) ${operator} c`);
      assertRoundtrip(`a ${operator} (b ${operator} c)`);
    }
  });

  it('preserves mixed precedence and associativity without adding AST parentheses', function () {
    const operators = [':', ':=', '<-', '=>', '&&', '||', 'in', '=', '<', '@', '+', '-', '#', '*', '/', '::'];
    for (const left of operators) {
      for (const right of operators) {
        assertRoundtrip(`a ${left} b ${right} c`);
        assertRoundtrip(`(a ${left} b) ${right} c`);
        assertRoundtrip(`a ${left} (b ${right} c)`);
      }
    }
  });

  it('distinguishes unary operators from binary operators and explicit parentheses', function () {
    for (const unary of ['+', '-', '#', '!', '¬', 'not ']) {
      for (const operand of ['a', '1', '(a)', '(a + b)', '(a * b)', 'f(a)', 'a.b', '(-a)']) {
        assertRoundtrip(`${unary}${operand}`);
        assertRoundtrip(`${unary}${operand} * c`);
        assertRoundtrip(`f(${unary}${operand})`);
      }
    }
    for (const source of ['not(a)', 'not((a))', 'not not a', 'not(a && b)', 'not(not(a))', '- -a']) {
      assertRoundtrip(source);
    }
  });

  it('preserves computed callees, member access, method calls and pipes', function () {
    for (const source of [
      'f(1)(2)', '(f)(1)', '(a + b)(c)', 'f()(x)(y)',
      'a.b.c', 'a.b(1)', '(a.b)(1)', '(a + b).c', '(-a).b', '-a.b',
      'a.(b + c)', 'a.not(b)', 'a.not(b + c)', 'a.(b.c)',
      'a -> f(1) -> g(2)', 'a ->> f(1) ->> g(2)',
      'a ~> b', 'a ~> b(1)', 'a ~> (key)', 'a ~> "b"',
      'a ~> b ~> c', 'a.b ~> c(1)', '(a ~> b)(1)',
      'a ~> f(not(a))', 'f(a, !(a))', 'f(a, !b)', 'f(a, !((b)))',
      'and(a,b)::c', 'a::and(b,c)', 'a::f(b)', 'not a::b', 'a::not b',
    ]) assertRoundtrip(source);
  });

  it('preserves functional logical forms that cannot be rendered as an infix chain', function () {
    for (const source of [
      'and()', 'or()', 'and(a)', 'or(a)', 'and(a,b,c)', 'or(a,b,c)',
      'and(and(a,b),c)', 'or(or(a,b),c)', 'and(or(a,b),c)',
      'or(and(a,b),c)', 'and(a,or(b,c))', 'or(a,and(b,c))',
      'and(a,b,c,d)', 'and(not a, b)', 'or(not(a), b)',
      'and(a := b,c)', 'or(a,b:c)', 'car(a=>b,c)', 'nor(a<-b,c)',
      'or(a, not + b)', 'or(a, in)', 'and(a, is)',
    ]) assertRoundtrip(source);
  });

  it('preserves explicit grouping in function arguments and multiline formatting', function () {
    for (const source of [
      'f(a + b = c, a && b || c, -a * b)',
      'f((a + b), ((c)))',
      'a ? b + c : d * e',
      'f(veryLongIdentifierRepeatedToExerciseMultilineFormatting + anotherLongIdentifierRepeatedToExerciseMultilineFormatting, thirdLongIdentifierRepeatedToExerciseMultilineFormatting)',
    ]) assertRoundtrip(source);
  });

  it('preserves keyword function names after an argument separator', function () {
    for (const name of ['in', 'is']) {
      for (const args of ['', '1', '1,2', '1,2,3']) {
        for (const tail of ['', '=x', '.x', '(x)', ' + x', '::x']) {
          assertRoundtrip(`f(a,${name}(${args})${tail})`);
        }
      }
    }
    for (const source of [
      'f(a,not(1)(x))', 'f(a,not(1)::x)', 'f(a,and()(x))', 'f(a,or()(x))',
      'begin(1,not)', 'begin(1,in)', 'begin(1,is)', 'begin(1,not(1,2))', 'begin(1,not+b)',
    ]) assertRoundtrip(source);
  });
});
