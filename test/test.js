var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

  it('should export parse function', function() {
    assert(lpe.parse);
    assert(typeof lpe.parse === 'function');
  });

  it('should export parse unary operators', function() {
    assert.deepEqual(lpe.parse('+123'),  ["+", 123] );
    assert.deepEqual(lpe.parse('-123'),  ["-", 123] );
    assert.deepEqual(lpe.parse('#123'),  ["#", 123] );
  });

  it('should parse simple expressions', function() {
    assert.deepEqual(lpe.parse('123'),  '123' );
    assert.deepEqual(lpe.parse('"123"'), [ '"', '123' ]);
    assert.deepEqual(lpe.parse('list'),  'list' );
  });

  it('should parse arithmetics', function() {
    assert.deepEqual(lpe.parse('1+2'), ['+', 1, 2]);
    assert.deepEqual(lpe.parse('1*2'), ['*', 1, 2]);
    assert.deepEqual(lpe.parse('1-2'), ['-', 1, 2]);
    assert.deepEqual(lpe.parse('1/2'), ['/', 1, 2]);
  });

  it('should parse variables', function() {
    assert.deepEqual(lpe.parse('x'), 'x');
    assert.deepEqual(lpe.parse('x2'), 'x2');
    assert.deepEqual(lpe.parse('$2'), '$2');
  });

  it('should parse comparision', function() {
    assert.deepEqual(lpe.parse('x=y'), ['=', 'x', 'y']);
    assert.deepEqual(lpe.parse('x≠y'), ['!=', 'x', 'y']);
    assert.deepEqual(lpe.parse('x!=y'), ['!=', 'x', 'y']);
    assert.deepEqual(lpe.parse('x <> "y"'), ['<>', 'x', ['"', 'y']]);

    assert.deepEqual(lpe.parse('1>2'), ['>', 1, 2]);
    assert.deepEqual(lpe.parse('1>=2'), ['>=', 1, 2]);
    assert.deepEqual(lpe.parse('1<2'), ['<', 1, 2]);
    assert.deepEqual(lpe.parse('1<=2'), ['<=', 1, 2]);
    assert.deepEqual(lpe.parse('1≤2'), ['<=', 1, 2]);
    assert.deepEqual(lpe.parse('1≥2'), ['>=', 1, 2]);
  });

  it('should parse arithmetics priority', function() {
    assert.deepEqual(lpe.parse('1*2+3'), ['+', ['*', 1, 2], 3]);
    assert.deepEqual(lpe.parse('1+2*3'), ['+', 1, ['*', 2, 3]]);
    assert.deepEqual(lpe.parse('1+(2+3)'), ["+", 1, ["()", ["+", 2, 3]]]);
    assert.deepEqual(lpe.parse('1*(2+3)'), ["*", 1, ["()", ["+", 2, 3]]]);
    assert.deepEqual(lpe.parse('(1+2)+3'), ["+", ["()", ["+", 1, 2]], 3]);
    assert.deepEqual(lpe.parse('1/2/3'), ['/', ['/', 1, 2], 3]);
    assert.equal(lpe.eval_lpe('(1+2)*3', {}), 9);
  });

  it('should parse function calls', function() {
    assert.deepEqual(lpe.parse('fn()'), ['fn']);
    assert.deepEqual(lpe.parse('fn(1)'), ['fn', 1]);
    assert.deepEqual(lpe.parse('fn(1,2)'), ['fn', 1, 2]);
  });

  it('should parse function arithmetics', function() {
    assert.deepEqual(lpe.parse('fn1()+1'), ['+', ['fn1'], 1]);
    assert.deepEqual(lpe.parse('1+fn1()'), ['+', 1, ['fn1']]);
    assert.deepEqual(lpe.parse('1+fn1(2)'), ['+', 1, ['fn1', 2]]);
    assert.deepEqual(lpe.parse('fn1()*fn2(2)'), ['*', ['fn1'], ['fn2', 2]]);
    assert.deepEqual(lpe.parse('1+fn1()*fn2(2)'), ['+', 1, ['*', ['fn1'], ['fn2', 2]]]);
  });

  it('should parse arithmetics in arguments', function() {
    assert.deepEqual(lpe.parse('fn(1+1)'), ['fn', ['+', 1, 1]]);
    assert.deepEqual(lpe.parse('fn(1+fn2())'), ['fn', ['+', 1, ['fn2']]]);
    assert.deepEqual(lpe.parse('fn(fn1(x)+fn2())'), ['fn', ['+', ['fn1', 'x'], ['fn2']]]);
  });

  it('should parse logical expressions', function() {
    assert.deepEqual(lpe.parse('!x'), ['not', 'x']);
    assert.deepEqual(lpe.parse('¬x'), ['not', 'x']);
    assert.deepEqual(lpe.parse('x&&y'), ['and', 'x', 'y']);
    assert.deepEqual(lpe.parse('x||y'), ['or', 'x', 'y']);
    assert.deepEqual(lpe.parse('x∧y'), ['and', 'x', 'y']);
    assert.deepEqual(lpe.parse('x∨y'), ['or', 'x', 'y']);
    assert.deepEqual(lpe.parse('1&&3||!0'), ["and", "1", ["or", "3", ["not", "0"]]]);
    assert.deepEqual(lpe.parse('period_type=3'), ['=', 'period_type', 3]);    // or use (eq?) (equals?) (equal?)
  });

  it('should correctly work with resolvString', function () {
    const O = {resolveString: false};
    assert.equal(lpe.eval_lpe('a', {}, O), undefined);
    assert.equal(lpe.eval_lpe('a or b', {}, O), undefined);
    assert.equal(lpe.eval_lpe('a and b', {}, O), undefined);
    assert.equal(lpe.eval_lpe('a and b', {a: true}, O), undefined);
  });

  it('should parse UI stack expressions', function() {
    assert.deepEqual(lpe.parse('mlp(filter(id=[12,3]||title~"abc"),filter(id=2),filter(id=3241324132))'), ["mlp",["filter",["or",["=","id",["[","12","3"]],["~","title",['"',"abc"]]]],["filter",["=","id","2"]],["filter",["=","id","3241324132"]]]);

    assert.deepEqual(lpe.parse('mlp(filter(id=[12,3]),filter(id=2),filter(pt=7&&qty=1)).ddl(234)'), [".",["mlp",["filter",["=","id",["[","12","3"]]],["filter",["=","id","2"]],["filter",["and",["=","pt","7"],["=","qty","1"]]]],["ddl","234"]] );

    assert.deepEqual(lpe.parse("mlp([1,2,3],[3,4,5],[20,33,4422274183274832676487168124214]).djl(3,title~'по названиям')"), [".",["mlp",["[","1","2","3"],["[","3","4","5"],["[","20","33","4422274183274832676487168124214"]],["djl","3",["~","title",["'","по названиям"]]]] );
  });

  it('should parse named logical expressions a.k.a. where expressions', function() {
    assert.deepEqual(lpe.parse('where(id=[12,3] and title~"abc" or id=2 and id=3241324132)'), ["where",["and",["=","id",["[","12","3"]],["or",["~","title",['"',"abc"]],["and",["=","id","2"],["=","id","3241324132"]]]]]);

    assert.deepEqual(lpe.parse('where( 6 and not (3 or (5 and not (4-5))))'), ["where",["and","6",["not",["()",["or","3",["()",["and","5",["not",["()",["-","4","5"]]]]]]]]]]);

    assert.deepEqual(lpe.parse('where( 6 and not (3 or (5 and not (4-5))) or not (a and (b or c)) and not (x or not y))'), ["where",["and","6",["or",["not",["()",["or","3",["()",["and","5",["not",["()",["-","4","5"]]]]]]]],["and",["not",["()",["and","a",["()",["or","b","c"]]]]],["not",["()",["or","x",["not","y"]]]]]]]]);

    assert.deepEqual(lpe.parse('where((a and b or c) or (avg(d) < avg(e)) or (e = 20 and parse_kv(locations.src_id)))'),
    ["where",["or",["()",["and","a",["or","b","c"]]],["or",["()",["<",["avg","d"],["avg","e"]]],["()",["and",["=","e","20"],["parse_kv",[".","locations","src_id"]]]]]]]
    );

    assert.deepEqual(lpe.parse('where((a && b || c) or (avg(d) < avg(e)) || (e = 20 and parse_kv(locations.src_id)))'),
    ["where",["or",["()",["and","a",["or","b","c"]]],["or",["()",["<",["avg","d"],["avg","e"]]],["()",["and",["=","e","20"],["parse_kv",[".","locations","src_id"]]]]]]]
    );
  });

  it('should parse if expressions with grouping', function() {
    // if evaluation works as in LISP !!! Here is just tests for parser
    assert.deepEqual(lpe.parse('if(a=b).yes().no()'), [".", ["if", ["=", "a", "b"]], ["yes"], ["no"]]);
    assert.deepEqual(lpe.parse('if(a=b).(yes()).(no())'), [".", ["if", ["=", "a", "b"]], ["()", ["yes"]], ["()", ["no"]]]);
    assert.deepEqual(lpe.parse('if(a=b).(yes().yes()).(no().no3())'), [".", ["if", ["=", "a", "b"]], ["()", [".", ["yes"], ["yes"]]], ["()", [".", ["no"], ["no3"]]]]);
    assert.deepEqual(lpe.parse('if(a=b).if(x>4).yexx().nox().noab()'), [".", ["if", ["=", "a", "b"]], ["if", [">", "x", "4"]], ["yexx"], ["nox"], ["noab"]]);
    assert.deepEqual(lpe.parse('if(a=b).if(x>4).(yexx().ye2()).(nox().no2()).(noab().noab)'), [".", ["if", ["=", "a", "b"]], ["if", [">", "x", 4]], ["()", [".", ["yexx"], ["ye2"]]], ["()", [".", ["nox"], ["no2"]]], ["()", [".", ["noab"], "noab"]]]);
  });

  it('should parse :', function() {
    assert.deepEqual(lpe.parse('test:__avg__'), [":", "test", "__avg__"]);
    assert.deepEqual(lpe.parse('(min(5) + max(5)) / 2:__avg__'), [":", ["/",["()",["+",["min",5],["max",5]]],2], "__avg__"]);
    assert.deepEqual(lpe.parse('(min(5) + max(5)) + 2:__avg__'), [":", ["+",["()",["+",["min",5],["max",5]]],2], "__avg__"]);
    assert.deepEqual(lpe.parse('(min(5) + max(5)) > 2:__avg__'), [":", [">",["()",["+",["min",5],["max",5]]],2], "__avg__"]);
  });

  it('should eval if expressions', function() {
    assert.equal(lpe.eval_lpe('begin(1,2,3)', {}), '3');

    // lisp evaluate to [1,2,'3'] потому что использует new String(3), который кавычит в одинарные кавычки
    // но JSON.parse  понимает тольео двойные!!!
    assert.deepEqual(JSON.parse(JSON.stringify(eval(lpe.eval_lpe('list(1,2,"3")', {"a": 1, "b": 2})))), [1, 2, "3"]);

    assert.equal(lpe.eval_lpe('if(true,1,2)', {}), '1');

    assert.equal(lpe.eval_lpe('if(count(ar)=3,"count=3","oops")', {"ar": [1, 2, 1]}), 'count=3');
    assert.equal(lpe.eval_lpe('if(count(ar)>5,"count=3",str([1,2,3]))', {"ar": [1, 2, 1]}), '[1,2,3]');

    assert.equal(lpe.eval_lpe('if ( true, "cool".str(yo), "cool"..str(yo) )', {}), 'coolyo');

    assert.equal(lpe.eval_lpe('if ( 0, "cool".str(yo), "cool"..str(yo) )', {}), 'yocool');
  });

  it('should eval Javascript RegExp with context', function() {
    assert.equal(lpe.eval_lisp(['_call_obj_meth_', ['RegExp', 'delete', 'i'], 'test', [".-", "context", "sql"]], {"context": {"sql": "deleTe"}}), true);
    assert.equal(lpe.eval_lisp(['_call_obj_meth_', ['RegExp', 'delete', 'i'], 'test', [".-", "context", "sql"]], {"context": {"sql": "abc\nselect or update or deleTe"}}), true);
    assert.equal(lpe.eval_lisp(['false?', ['_call_obj_meth_', ['RegExp', 'update|drop|truncate|insert|alter|grant|delete', 'i'], 'test', [".-", "context", "sql"]]], {"context": {"sql": "abc\nselect or update or deleTe"}}), false);
    assert.equal(lpe.eval_lisp(['false?', ['_call_obj_meth_', ['RegExp', 'update|drop|truncate|insert|alter|grant|delete', 'i'], 'test', [".-", "context", "sql"]]], {"context": {"sql": "abc\nselect * from table where a is not null"}}), true);
  });

  it('should eval Javascript RegExp with context (LPE)', function() {
    assert.equal(lpe.eval_lisp(lpe.parse('RegExp("delete","i").invoke(test, context.sql)'), {"context": {"sql": "deleTe"}}), true);
    assert.equal(lpe.eval_lisp(lpe.parse('RegExp("delete","i").invoke(test, context.sql).not()'), {"context": {"sql": "deleTe"}}), false);
  });

  it('should parse tuples and arrows', function() {
    assert.deepEqual(lpe.parse('()'),['()']);
    assert.deepEqual(lpe.parse('(,)'),['tuple']);
    assert.deepEqual(lpe.parse('(1)'),['()', 1]);
    assert.deepEqual(lpe.parse('(1,)'),['tuple', 1]);
    assert.deepEqual(lpe.parse('(1+2)'),['()', ['+', 1, 2]]);
    assert.deepEqual(lpe.parse('(1,2)'),['tuple', 1, 2]);
  });

  describe('statement separators', function() {
    it('should accept ; as statement separator', function() {
      assert.deepEqual(lpe.parse('a()'), ['a']);
      assert.deepEqual(lpe.parse('a(); b()'), ['begin', ['a'], ['b']]);
      assert.deepEqual(lpe.parse('a();b()'), ['begin', ['a'], ['b']]);
      assert.deepEqual(lpe.parse('a();b();c()'), ['begin', ['a'], ['b'], ['c']]);
    });

    it('should accept newline as statement separator', function() {
      assert.deepEqual(lpe.parse('a()\nb()'), ['begin', ['a'], ['b']]);
      assert.deepEqual(lpe.parse('a()\nb()\nc()'), ['begin', ['a'], ['b'], ['c']]);
      assert.deepEqual(lpe.parse('a()\n\nb()'), ['begin', ['a'], ['b']]);
      assert.deepEqual(lpe.parse('\na()\nb()\n'), ['begin', ['a'], ['b']]);
      assert.deepEqual(lpe.parse('a()\n;\nb()'), ['begin', ['a'], ['b']]);
    });

    it('should reject space-separated statements', function() {
      assert.throws(() => lpe.parse('a() b()'), lpe.LPESyntaxError);
      assert.throws(() => lpe.parse('a()  b()'), lpe.LPESyntaxError);
      assert.throws(() => lpe.parse('a\tb'), lpe.LPESyntaxError);
    });

    it('should reject adjacent statements with no separator', function() {
      assert.throws(() => lpe.parse('a()b()'), lpe.LPESyntaxError);
      assert.throws(() => lpe.parse('a()b()c()'), lpe.LPESyntaxError);
    });

    it('should still allow whitespace within an expression', function() {
      assert.deepEqual(lpe.parse('1 + 2'), ['+', 1, 2]);
      assert.deepEqual(lpe.parse('a + b'), ['+', 'a', 'b']);
      assert.deepEqual(lpe.parse('fn(1, 2)'), ['fn', 1, 2]);
      assert.deepEqual(lpe.parse('a +\nb'), ['+', 'a', 'b']);
    });
  });

  describe('comments: -- line and /* */ block (DAX/SQL compat)', function () {
    it('-- starts a line comment when preceded by whitespace', function () {
      assert.deepEqual(lpe.parse('1 + 2 -- ignored'),               ['+', 1, 2]);
      assert.deepEqual(lpe.parse('-- top of file\nx + y'),          ['+', 'x', 'y']);
      assert.deepEqual(lpe.parse('a -- one\nb -- two\nc'),          ['begin', 'a', 'b', 'c']);
    });

    it('-- continues an expression across newlines (mid-expression comment)', function () {
      // `1 + -- comment\n2` should parse as 1 + 2; the line comment ends at \n
      // but the + is still pending so expression parsing resumes on next line.
      assert.deepEqual(lpe.parse('1 + -- mid\n2'),                  ['+', 1, 2]);
    });

    it('does NOT treat -- as a comment when it is in arithmetic position (no whitespace before)', function () {
      // Backwards-compat: `1--2` keeps meaning `1 - (-2)`.
      assert.deepEqual(lpe.parse('1--2'),                           ['-', 1, ['-', 2]]);
      assert.deepEqual(lpe.parse('a--b'),                           ['-', 'a', ['-', 'b']]);
      assert.deepEqual(lpe.parse('1 - -2'),                         ['-', 1, ['-', 2]]);   // sanity
    });

    it('/* */ starts and ends a block comment', function () {
      assert.deepEqual(lpe.parse('1 /* mid */ + 2'),                ['+', 1, 2]);
      assert.deepEqual(lpe.parse('/* head */ x + y'),               ['+', 'x', 'y']);
      assert.deepEqual(lpe.parse('x + y /* tail */'),               ['+', 'x', 'y']);
    });

    it('/* */ block comment can span multiple lines', function () {
      assert.deepEqual(lpe.parse('1 /* multi\n  line\n  block */ + 2'), ['+', 1, 2]);
    });

    it('empty /**/ is allowed', function () {
      assert.deepEqual(lpe.parse('1 + /**/ 2'),                     ['+', 1, 2]);
    });

    it('// line comments still work (regression guard)', function () {
      assert.deepEqual(lpe.parse('1 + 2 // ignored'),               ['+', 1, 2]);
    });

    it('comments compose with the ; argument separator', function () {
      assert.deepEqual(
        lpe.parse('IF(/* check */ a > b; -- DAX style\n  1; 2)'),
        ['IF', ['>', 'a', 'b'], 1, 2]
      );
    });
  });

  describe('argument separator: ; accepted (DAX-Euro locale compat)', function () {
    it('parses ; identically to , inside function calls', function () {
      assert.deepEqual(lpe.parse('f(a, b, c)'),  lpe.parse('f(a; b; c)'));
      assert.deepEqual(lpe.parse('IF(a > b, 1, 2)'),  lpe.parse('IF(a > b; 1; 2)'));
      assert.deepEqual(lpe.parse('SUM(x; y)'), ['SUM', 'x', 'y']);
    });

    it('handles mixed , and ; in the same call', function () {
      assert.deepEqual(lpe.parse('f(a, b; c)'), ['f', 'a', 'b', 'c']);
      assert.deepEqual(lpe.parse('f(a; b, c)'), ['f', 'a', 'b', 'c']);
    });

    it('handles missing-arg edge cases like , does', function () {
      // Same shape as f(,), f(a,), etc. — internally the missing slots are
      // pushed with sexpr=undefined; this is the existing , behavior preserved.
      assert.deepEqual(lpe.parse('f(;)'),    lpe.parse('f(,)'));
      assert.deepEqual(lpe.parse('f(a;)'),   lpe.parse('f(a,)'));
      assert.deepEqual(lpe.parse('f(;a)'),   lpe.parse('f(,a)'));
      assert.deepEqual(lpe.parse('f(a;;b)'), lpe.parse('f(a,,b)'));
    });

    it('does not affect ; as a top-level statement separator', function () {
      // Outside (...), ';' still terminates statements as before.
      assert.deepEqual(lpe.parse('a(); b()'), ['begin', ['a'], ['b']]);
    });

    it('does not affect ; inside nested calls', function () {
      // The inner call's ; terminates inner-arg parsing; the outer call continues.
      assert.deepEqual(
        lpe.parse('outer(inner(a; b); c)'),
        ['outer', ['inner', 'a', 'b'], 'c']
      );
    });
  });
});
