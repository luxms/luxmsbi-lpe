/**
    Copyright (c) 2019 Luxms Inc.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import console from './console/console';
import {eval_lisp} from './lisp';
import {sql_where_context} from './sql_where';
import {parse} from './lpep';

// polyfill = remove in 2020 !!!

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}


export function sql_context(_vars) {
  var _context = sql_where_context(_vars);

  /* заполняем контекст функциями и макросами, заточенными на SQL */
  _context['sql'] = function() {
    var q; // resulting sql
    var args = Array.prototype.slice.call(arguments);
    console.log('SQL IN: ', args);

    var find_part = function(p) {
      return args.find((el) => p == el[0]);
    };

    var sel = find_part('select');
    console.log('FOUND select: ', sel);
    q = eval_lisp(sel, _context);

    var from = find_part('from');
    console.log('FOUND from: ', from);
    q = q + ' ' + eval_lisp(from, _context);

    var where = find_part('where');
    console.log("FOUND where: ", where);
    if (where instanceof Array && where.length > 1) {
      q = q + ' ' + eval_lisp(where, _context );
    }

    //slice(offset, pageItemsNum)
    var s = find_part('slice');
    console.log("FOUND slice: ", s);
    if (s instanceof Array && s.length > 1) {
      q = q + ' ' + eval_lisp(s, _context );
    }

    var srt = find_part('order_by');
    console.log('FOUND sort: ', srt);
    if (srt instanceof Array && srt.length > 1) {
      q = q + ' ' + eval_lisp( srt, _context );
    }

    return q;
  };
  _context['sql'].ast = [[],{},[],1]; // mark as macro


  /* возвращает структуру запроса, при этом все элементы уже превращены в TEXT */
  _context['sql-struct'] = function() {
    var q = {
      "select": undefined,
      "from": undefined,
      "where": undefined,
      "order_by": undefined,
      "limit_offset": undefined
    }; // resulting sql

    var args = Array.prototype.slice.call(arguments);
    console.log('SQL IN: ', args);

    var find_part = function(p) {
      return args.find((el) => p == el[0]);
    };

    var sel = find_part('select');
    console.log('FOUND select: ', sel);
    q.select = eval_lisp(sel, _context);

    var from = find_part('from');
    console.log('FOUND from: ', from);
    q.from = eval_lisp(from, _context);

    var where = find_part('filter');
    console.log("FOUND where: ", where);
    if (where instanceof Array && where.length > 1) {
      q.where = eval_lisp(where, _context );
    }

    //slice(offset, pageItemsNum)
    var s = find_part('slice');
    console.log("FOUND slice: ", s);
    if (s instanceof Array && s.length > 1) {
      q.limit_offset = eval_lisp(s, _context );
    }

    var srt = find_part('order_by');
    console.log('FOUND sort: ', srt);
    if (srt instanceof Array && srt.length > 1) {
      q.order_by = eval_lisp( srt, _context );
    }

    return q;
  };
  _context['sql-struct'].ast = [[],{},[],1]; // mark as macro



  function prnt(a) {
    console.log('prnt IN: ', a);
    if (a instanceof Array){
      if (a.length > 0) {
        if (a[0] === '::' && a.length == 3) {
          return a[1] + '::' + a[2];
        } else if (a[0] === ':') {
          return prnt(a[1]) + ' as "' + a[2].replace(/"/,'\\"') + '"';
        } else {
          return a[0] + '(' + a.slice(1).map(
            function(argel) { return prnt(argel) }
          ).join(',') + ')';
        }
      } else {
        return '';
      }
    } else {
      return a;
    }
  }

    // должен вернуть СТРОКУ
  _context['select'] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log("select IN: ",  JSON.stringify(a));
    if (a.length < 1) {
      return "SELECT *";
    } else {
      return "SELECT " + a.map(prnt).join(',');
    }
  }
  _context['select'].ast = [[],{},[],1]; // mark as macro

  _context['from'] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log('from IN: ', a);
    if (a.length < 1) {
      return "";
    } else {
      return "FROM " + a.map(prnt).join(',');
    }
  }
  _context['from'].ast = [[],{},[],1]; // mark as macro

  _context['slice'] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log('slice IN: ', a);
    if (a.length < 1) {
      return "";
    } else {
      return "LIMIT " + parseInt(a[1]) + " OFFSET " + parseInt(a[0]);
    }
  }
  _context['from'].ast = [[],{},[],1]; // mark as macro

  return _context;
}


/*
Это не дописано!!! Идея была сделать синтаксис, похожий на htSQL. типа +table(col1,col2).where(col1>3)
но например, как указать схему? сейчас парсер фигню выдаёт, так как точка не всегда корректно отрабатывает +sch.table(col1,col2)
Тщательнее надо....

select lpe.eval_sql_expr($$metrics(id).where(id='abcd')$$);


Примеры htSQL:
/course.filter(credits<3).select(department_code, no, title)
/course.sort(credits-).limit(10){department_code, no, credits}
/course.limit(10).sort(credits-){department_code, no, credits}

То есть, у нас имя таблицы идёт первым в любом случае. В LuxPath предлагаю использовать
комюинацию htSQL select и список столбцов {} в одном макросе +имя_таблицы(...)
мы будем использовать + вместо / Но слэш в htSQL не является частью синтаксиса, имя таблицы просто всегда идёт первым!!!

*/

export function eval_sql_expr(_expr, _vars) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  // for(var key in _vars) _context[key] = _vars[key];

  _context['->'] = function() {
    var ret = [];

    for (var i = 0; i < arguments.length; i++) {
      ret.push(eval_lisp( arguments[i], _context));
    }

    return ret.join(',');
  }
  _context['->'].ast = [[],{},[],1]; // mark as macro

  var sexpr = parse(_expr);
  console.log("IN: ", sexpr);

  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */

  // точка входа всегда должна быть ->, так как мы определили -> как макроc чтобы иметь возможность
  // перекодировать имена таблиц в вызов .from()
  if (sexpr[0] !== '->') {
    sexpr = ['->',sexpr];
  }

  // теперь нужно пройтись по списку вызовов и привести к нормальной форме.
  // в нормальной форме всё выглядит вот так: (seq sql(select() from()) sql(...) sql(...) )
  // ["seq",["metrics","a","d",["max","c"]],["where"]]
  // ["seq",["+",["metrics","a","d",["max","c"]]],["where"]]

  /* на вход прилетает IN:
    metrics(a,d,max(c)).where(a>1 and i < 4).periods.where(a>4)
    ["seq",["metrics","a","d",["max","c"]],["where",["and",[">","a","1"],["<","i","4"]]],"periods",["where",[">","a","4"]]]
    ["seq",["sql",["select","a","d",["max","c"]],["from","metrics"],["filter",["and",[">","a","1"],["<","i","4"]]]],["sql",["select"],["from","periods"],["filter",[">","a","4"]]]]
  */

  var sql = ['sql'];
  var do_select_from = function(sel) {
    if (!(sel instanceof Array)) {
      sel = [sel];
    }
    var fr = sel[0];
    var p = false;
    if (fr != 'where' && fr != 'select' && fr != 'sort' && fr != 'filter' && fr != 'from' && fr != 'slice') {
      sel[0] = 'select';
      p = true;
    }
    sql.push(sel);
    if (p) {
      sql.push(["from",fr]);
    }
    console.log("parse do_select_from: ", sql);
  };

  for (var i=1; i<sexpr.length; i++){
    var expr = sexpr[i];
    if (expr instanceof Array) {
      // expr: ["metrics","a","d",["max","c"]]
      // if (expr[0] === 'order_by') {expr[0]='sort'};
      if (expr[0] === 'where') {expr[0]='where'};
      if ( expr[0] === '+' ){
        // expr: ["+",["metrics","a","d",["max","c"]]]
        do_select_from(expr[1]);
      } else if (_context[expr[0].toString()] === undefined) {
        // это имя таблицы... так как мы проверили на ключевые слова,
        // распознаваемые нашим интерпретатором
        // expr: ["metrics","a","d",["max","c"]]
        do_select_from(expr);
      } else {
        sql.push(sexpr[i]);
      }
    } else if (_context[expr.toString()] === undefined) {
      // это литерал = имя таблицы...
      // expr: "metrics"
      do_select_from(expr);
    } else {
      throw('unexpected call: ' + JSON.stringify(expr));
    }
  }

  console.log('parse: ', sql);

  var ret = eval_lisp(sql, _context);
  // console.log("parse: ", ret);

  return ret;
}


// currently works only for bi_path part of the URL in the DBAPI
export function parse_sql_expr(_expr, _vars, _forced_table, _forced_where) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  // for(var key in _vars) _context[key] = _vars[key];

  if (_expr === null || _expr === '' || typeof _expr === "undefined") {
    _expr = 'filter()'; // that should generate empty struct
  }

  var sexpr = parse(_expr);

  if (sexpr[0] !== '->') {
    // это значит, что на входе у нас всего один вызов функции, мы его оберём в ->
    sexpr = ['->', sexpr];
  }
  console.log("DBAPI IN: ", sexpr);

  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */


  // теперь нужно пройтись по списку вызовов и привести к нормальной форме.
  // в нормальной форме у нас должен быть один вызов sql() а внутри select().from().where()
  // причём 
  // select(a,b) === select(a).select(b)
  // order_by(a,b) === order_by(a).order_by(b)
  // where(a>1).where(b<1) === where(a>1 and b<1)
  // from(a).from(b).from(c) === from(c)
  // в последнем случае берётся последний from, а все первые игнорятся, но см. test.js = там есть другой пример !!!!

  var sql = ['sql-struct']; // wrapped by sql call...
  var cache = {"filter":[], "select":[], "order_by":[],"from":[], "slice":[]};
  for (var i=1; i<sexpr.length; i++){
    var expr = sexpr[i];
    if (expr instanceof Array) {
      var fr = expr[0];
      if (fr != 'where' && fr != 'select' && fr != 'order_by' && fr != 'from' && fr != ':' && fr != 'slice' && fr != 'filter') {
        throw('unexpected func: ' + JSON.stringify(fr));
      }
      // have no idea how to support aliases for selects...
      if (fr === ':' && expr[1][0] === 'select') {
        cache["select"].push(expr[1]);
      } else {
        if (fr === 'where') {
          fr = 'filter';
        }
        cache[fr].push(expr);
      }
    } else {
      throw('unexpected literal: ' + JSON.stringify(expr));
    }
  }

  if (_forced_table !== undefined) {
    cache[fr].push(["from", _forced_table]);
  }

  console.log("DEBUG", JSON.stringify(cache));


  var args = cache["select"].map(ar => ar.slice(1));
  var sel = [].concat.apply(["select"], args); //flat
  sql.push(sel);

  var f = cache["from"].pop();
  if ( f ) {
    sql.push( f );
  }

  f = cache["order_by"].pop();
  if ( f ) {
    sql.push( f );
  }

  f = cache["slice"].pop();
  if ( f ) {
    sql.push( f );
  }

  args = cache["filter"].map(ar => ar.slice(1));
  args = [].concat.apply([], args); //flat

  if (args.length > 0) {
    var w = ["()", args[0]];
    if (args.length > 1) {
      for (var i=1; i<args.length; i++){
        w = ["and", w, ["()", args[i]]];
      }
    }
    sql.push(["filter", w]);
  }



  console.log("WHERE", JSON.stringify(w));

  console.log('DBAPI parse: ', sql);

  var ret = eval_lisp(sql, _context);

  return ret;
}
