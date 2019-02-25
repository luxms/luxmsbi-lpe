var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    it('should export parse function', function() {
        assert(lpe.parse);
        assert(typeof lpe.parse === 'function');
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
      assert.deepEqual(lpe.parse('x <> "y"'), ['<>', 'x', ['"','y']]);

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
      assert.deepEqual(lpe.parse('1+(2+3)'), ['+', 1, ['+', 2, 3]]);
      assert.deepEqual(lpe.parse('1*(2+3)'), ['*', 1, ['+', 2, 3]]);
      assert.deepEqual(lpe.parse('(1+2)+3'), ['+', ['+', 1, 2], 3]);
      assert.deepEqual(lpe.parse('1/2/3'), ['/', ['/', 1, 2], 3]);
    });

    it('should parse function calls', function() {
        assert.deepEqual(lpe.parse('fn()'), ['fn']);
        assert.deepEqual(lpe.parse('fn(1)'), ['fn', 1]);
        assert.deepEqual(lpe.parse('fn(1,2)'), ['fn', 1, 2]);
        assert.deepEqual(lpe.parse('fn(s,)'), ['fn', 's', null]);
        assert.deepEqual(lpe.parse('fn(,s)'), ['fn', null, 's']);
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
      assert.deepEqual(lpe.parse('1&&3||!0'), ["and","1",["or","3",["not","0"]]]);
      assert.deepEqual(lpe.parse('period_type=3'), ['=', 'period_type', 3]);    // or use (eq?) (equals?) (equal?)
    });

    it('should parse UI stack expressions', function() {
      assert.deepEqual(lpe.parse('mlp(filter(id=[12,3]||title~"abc"),filter(id=2),filter(id=3241324132))'), ["mlp",["filter",["or",["=","id",["[","12","3"]],["~","title",['"',"abc"]]]],["filter",["=","id","2"]],["filter",["=","id","3241324132"]]]);

      assert.deepEqual(lpe.parse('mlp(filter(id=[12,3]),filter(id=2),filter(pt=7&&qty=1)).ddl(234)'), ["->",["mlp",["filter",["=","id",["[","12","3"]]],["filter",["=","id","2"]],["filter",["and",["=","pt","7"],["=","qty","1"]]]],["ddl","234"]] );

      assert.deepEqual(lpe.parse("mlp([1,2,3],[3,4,5],[20,33,4422274183274832676487168124214]).djl(3,title~'по названиям')"), ["->",["mlp",["[","1","2","3"],["[","3","4","5"],["[","20","33","4422274183274832676487168124214"]],["djl","3",["~","title",["'","по названиям"]]]] );
    });

    it('should parse named logical expressions a.k.a. where expressions', function() {
      assert.deepEqual(lpe.parse('where(id=[12,3] and title~"abc" or id=2 and id=3241324132)'), ["where",["and",["=","id",["[","12","3"]],["or",["~","title",['"',"abc"]],["and",["=","id","2"],["=","id","3241324132"]]]]]);

      assert.deepEqual(lpe.parse('where( 6 and not (3 or (5 and not (4-5))))'), ["where",["and","6",["not",["()",["or","3",["()",["and","5",["not",["()",["-","4","5"]]]]]]]]]]);

      assert.deepEqual(lpe.parse('where( 6 and not (3 or (5 and not (4-5))) or not (a and (b or c)) and not (x or not y))'), ["where",["and","6",["or",["not",["()",["or","3",["()",["and","5",["not",["()",["-","4","5"]]]]]]]],["and",["not",["()",["and","a",["()",["or","b","c"]]]]],["not",["()",["or","x",["not","y"]]]]]]]]);

      assert.deepEqual(lpe.parse('where((a and b or c) or (avg(d) < avg(e)) or (e = 20 and parse_kv(locations.src_id)))'),
      ["where",["or",["()",["and","a",["or","b","c"]]],["or",["()",["<",["avg","d"],["avg","e"]]],["()",["and",["=","e","20"],["parse_kv",["->","locations","src_id"]]]]]]]
      );
    });

    it('should parse if expressions with grouping', function() {
        // if evaluation works as in LISP !!! Here is just tests for parser
        assert.deepEqual(lpe.parse('if(a=b).yes().no()'), ["->",["if",["=","a","b"]],["yes"],["no"]]);
        assert.deepEqual(lpe.parse('if(a=b).(yes()).(no())'), ["->",["if",["=","a","b"]],["yes"],["no"]]);
        assert.deepEqual(lpe.parse('if(a=b).(yes().yes()).(no().no3())'), ["->",["if",["=","a","b"]],["->",["yes"],["yes"]],["->",["no"],["no3"]]]);
        assert.deepEqual(lpe.parse('if(a=b).if(x>4).yexx().nox().noab()'), ["->",["if",["=","a","b"]],["if",[">","x","4"]],["yexx"],["nox"],["noab"]]);
        assert.deepEqual(lpe.parse('if(a=b).if(x>4).(yexx().ye2()).(nox().no2()).(noab().noab)'), ["->",["if",["=","a","b"]],["if",[">","x","4"]],["->",["yexx"],["ye2"]],["->",["nox"],["no2"]],["->",["noab"],"noab"]]);
    });

    it('should eval if expressions', function() {
        assert.equal(lpe.eval_lpe('begin(1,2,3)', {}), '3');

        // lisp evaluate to [1,2,'3'] потому что использует new String(3), который кавычит в одинарные кавычки
        // но JSON.parse  понимает тольео двойные!!!
        assert.deepEqual(JSON.parse(JSON.stringify(eval(lpe.eval_lpe('list(1,2,"3")', {"a":1,"b":2})))), [1,2,"3"]);

        assert.equal(lpe.eval_lpe('if(true,1,2)', {}), '1');

        assert.equal(lpe.eval_lpe('if(count(ar)=3,"count=3","oops")', {"ar":[1,2,1]}), 'count=3');
        assert.equal(lpe.eval_lpe('if(count(ar)>5,"count=3",str([1,2,3]))', {"ar":[1,2,1]}), '[1,2,3]');

        assert.equal(lpe.eval_lpe('if ( true, "cool".str(yo), "cool"..str(yo) )', {}), 'coolyo');

        assert.equal(lpe.eval_lpe('if ( 0, "cool".str(yo), "cool"..str(yo) )', {}), 'yocool');
    });

    it('should eval Javascript RegExp with context', function() {
        assert.equal(lpe.eval_lisp( ['.', ['RegExp', 'delete','i'], 'test', [".-","context","sql"]]  ,{"context":{"sql":"deleTe"}}), true);
        assert.equal(lpe.eval_lisp( ['.', ['RegExp', 'delete','i'], 'test', [".-","context","sql"]]  ,{"context":{"sql":"abc\nselect or update or deleTe"}}), true);
        assert.equal(lpe.eval_lisp( ['false?', ['.', ['RegExp', 'update|drop|truncate|insert|alter|grant|delete','i'], 'test', [".-","context","sql"]]], {"context":{"sql":"abc\nselect or update or deleTe"}}), false);
        assert.equal(lpe.eval_lisp( ['false?', ['.', ['RegExp', 'update|drop|truncate|insert|alter|grant|delete','i'], 'test', [".-","context","sql"]]], {"context":{"sql":"abc\nselect * from table where a is not null"}}), true);
    });

    it('should eval Javascript RegExp with context (LPE)', function() {
        assert.equal(lpe.eval_lisp(lpe.parse('RegExp("delete","i").invoke(test, context.sql)')  ,{"context":{"sql":"deleTe"}}), true);
        assert.equal(lpe.eval_lisp(lpe.parse('RegExp("delete","i").invoke(test, context.sql).not()')  ,{"context":{"sql":"deleTe"}}), false);
    });

    it('should eval SQL where expressions', function() {
        assert.equal( lpe.eval_sql_where(
            'if(count(period_type_list)>5,count(period_type_list), where( $(period.title) =3))',
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "WHERE 'Noyabr' = 3"
        );

        assert.equal( lpe.eval_sql_where(
            'if(count(period_type_list)=5,count(period_type_list), where( $(period.title) =3))',
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "5"
        );

        assert.equal( lpe.eval_sql_where( 'where( )',{}),"WHERE TRUE");

        assert.equal( lpe.eval_sql_where(
            ' where( tp in ($(period_type_list)))',
            {"period_type_list":[-1, 1, 3,0, 345667]}),
            "WHERE tp in (-1,1,3,0,345667)"
        );

        assert.equal( lpe.eval_sql_where(
            ' where( title in ($(period_type_list)) and ($(period.title) = title or $(period.title) = period.title))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr"}}),
            "WHERE title in ('1','qwerty','0','null') and ('Noyabr' = title or 'Noyabr' = period.title)"
        );

        assert.equal( lpe.eval_sql_where(
            ' where( title in ($(period_type_list)) and ($(period.title) = title or $(period.id)::INT = period.id))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr","id":2131}}),
            "WHERE title in ('1','qwerty','0','null') and ('Noyabr' = title or '2131' :: INT = period.id)"
        );

        // do not evaluate code, unless $() escape is used
        assert.equal( lpe.eval_sql_where(
            'where( vector(str) = if("90",[0,0,0],\'9\'))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr","id":2131}}),
            "WHERE vector(str) = if(\"90\",[0,0,0],'9')"
        );

        // evaluate code in $()
        assert.equal( lpe.eval_sql_where(
            'where(title = $(str(first([11,2,3,4]),last([1,2,3,-1999]))))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr","id":2131}}),
            "WHERE title = '11-1999'"
        );

        // if false
        assert.equal( lpe.eval_sql_where(
            'if(count(period_type_list), where(a = $(first(period_type_list)))  , where (title is not null))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr","id":2131}, "period_type_list": []}),
            "WHERE title is not null"
        );

        // if true
        assert.equal( lpe.eval_sql_where(
            'if(count(period_type_list), where(a = $(first(period_type_list)))  , where (title is not null))',
            {"period_type_list":['1','qwerty','0','null'], "period": {"title":"Noyabr","id":2131}, "period_type_list": [4,5,6]}),
            "WHERE a = '4'"
        );

        // if pluck
        assert.equal( lpe.eval_sql_where(
            'if(periods.count(), where (ctime in ($(periods.pluck(start_time)))), where())',
            {"periods":[{"start_time":"2018-01-01","id":2324342},{"id":9890798,"start_time":"2017-01-01"}], "period": {"title":"Noyabr","id":2131}}),
            "WHERE ctime in ('2018-01-01','2017-01-01')"
        );

        // combine several arguments with AND
        assert.equal( lpe.eval_sql_where(
            'where (ctime in ($(periods.pluck(start_time))), cnt = $(periods.count()) )',
            {"periods":[{"start_time":"2018-01-01","id":2324342},{"id":9890798,"start_time":"2017-01-01"}], "period": {"title":"Noyabr","id":2131}}),
            "WHERE (ctime in ('2018-01-01','2017-01-01')) AND (cnt = '2')"
        );

        // combine several arguments with AND 2
        assert.equal( lpe.eval_sql_where(
            'where (ctime in ($(periods.pluck(start_time))), cnt = $(periods.count()) )',
            {"periods":[{"start_time":"2018-01-01","id":2324342},{"id":9890798,"start_time":"2017-01-01"}], "period": {"title":"Noyabr","id":2131}}),
            "WHERE (ctime in ('2018-01-01','2017-01-01')) AND (cnt = '2')"
        );

        // + interval generation from period_type
        assert.equal( lpe.eval_sql_where(
            'where(pg_interval(1,7) or pg_interval(2,"day") or pg_interval(3,period_type))',
            {"period_type": {"unit":"day"},"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE '3 month'::interval or '2 day'::interval or '3 day'::interval"
        );

        // Works with nested JSON structs
        assert.equal( lpe.eval_sql_where(
            'where(ctime >= $(period_range.start.start_time) and ctime <= $(period_range.end.start_time))',
            {"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE ctime >= '2018-09-10T18:16:00+03:00' and ctime <= '2018-12-10T18:16:00+03:00'"
        );

        // if object false
        assert.equal( lpe.eval_sql_where(
            'if(period_range, where(ctime >= $(period_range.start.start_time) and ctime <= $(period_range.end.start_time)), str())',
            {"period_range":null}),
            ""
        );

        // if object true
        assert.equal( lpe.eval_sql_where(
            'if(period_range, where(ctime >= $(period_range.start.start_time) and ctime <= $(period_range.end.start_time)), str())',
            {"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE ctime >= '2018-09-10T18:16:00+03:00' and ctime <= '2018-12-10T18:16:00+03:00'"
        );

        // + interval handling... THIS IS WRONG SINGLE QOUTES
        assert.equal( lpe.eval_sql_where(
            'if(period_range, where(ctime >= $(period_range.start.start_time) and ctime <= $(period_range.end.start_time) + $(str(interval," 1 ", period_type.unit)) ), str())',
            {"period_type": {"unit":"day"},"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE ctime >= '2018-09-10T18:16:00+03:00' and ctime <= '2018-12-10T18:16:00+03:00' + 'interval 1 day'"
        );

        // + interval handling... THIS IS NICE
        assert.equal( lpe.eval_sql_where(
            'if(period_range, where(ctime >= $(period_range.start.start_time) and ctime <= $(period_range.end.start_time) + $(str("1 ", period_type.unit)) :: interval ), str())',
            {"period_type": {"unit":"day"},"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE ctime >= '2018-09-10T18:16:00+03:00' and ctime <= '2018-12-10T18:16:00+03:00' + '1 day' :: interval"
        );

        // + interval generation from period_type
        assert.equal( lpe.eval_sql_where(
            'where(pg_interval(1,7) or pg_interval(2,"day") or pg_interval(3,period_type))',
            {"period_type": {"unit":"day"},"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
            "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
            "WHERE '3 month'::interval or '2 day'::interval or '3 day'::interval"
        );

       // lpe_pg_tstz_at_time_zone
       assert.equal( lpe.eval_sql_where(
           'where(ctime > lpe_pg_tstz_at_time_zone(period_range.start.start_time,GMT))',
           {"period_type": {"unit":"day"},"period_range":{"start": {"qty": 1, "start_time": "2018-09-10T18:16:00+03:00", "period_type": 1},
           "end": {"qty": 1, "start_time": "2018-12-10T18:16:00+03:00", "period_type": 1}}}),
           "WHERE ctime > '2018-09-10T18:16:00+03:00'::timestamptz at time zone 'GMT'"
       );

        // support nulls in arrays for IN () SQL clause
        assert.equal( lpe.eval_sql_where(
            'where(a = [null])',
            {}),
            "WHERE a IS NULL"
        );

        assert.equal( lpe.eval_sql_where(
            'where(a = [1,2,3])',
            {}),
            "WHERE a IN (1,2,3)"
        );

        assert.equal( lpe.eval_sql_where(
            'where(a = [null,1,2,null,3,null])',
            {}),
            "WHERE (a IS NULL OR a IN (1,2,3))"
        );

        assert.equal( lpe.eval_sql_where(
            'where(a = [])',
            {}),
            "WHERE TRUE"
        );

    });

/* NOT YET READY !!!
    it('should eval full SQL expressions', function() {
        assert.equal( lpe.eval_sql_apidb_expr(
            'from(bm.tbl).select(department_code.alias, no::TEXT:textual, max(credits)).where(a>1).from(final.tbl).order_by(a,-b).select(select(last).from(test)):subselect.where(\'b\'+3 <3)',
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "WHERE 'Noyabr' = 3"
        );

    });
*/

});
