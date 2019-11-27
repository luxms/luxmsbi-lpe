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
import {
  reports_get_column_info, 
  reports_get_table_sql, 
  reports_get_join_path, 
  reports_get_join_conditions, 
  get_source_database
} from './utils/utils';

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

    // use sql-struct!
    var command = ["sql-struct"].concat(args)
    var struct = eval_lisp(command, _context )

    q = `${struct["select"]} ${struct["from"]}`

    if ( struct["where"] !== undefined ) {
      q = `${q} WHERE ${struct["where"]}`
    }

    if ( struct["group_by"] !== undefined ) {
      q = `${q} ${struct["group_by"]}`
    }

    if ( struct["order_by"] !== undefined ) {
      q = `${q} ${struct["order_by"]}`
    }
    
    if ( struct["limit_offset"] !== undefined ) {
      if (_vars["_target_database"] === 'oracle') {
        q = `SELECT * FROM (
          ${q}
        ) WHERE ${struct["limit_offset"]}`
      } else {
        q = `${q} ${struct["limit_offset"]}`
      }
    }

    return q

  };
  _context['sql'].ast = [[],{},[],1]; // mark as macro


  /* возвращает структуру запроса, при этом все элементы уже превращены в TEXT */
  _context['sql-struct'] = function() {
    var q = {
      "select": undefined,
      "from": undefined,
      "where": undefined,
      "order_by": undefined,
      "limit_offset": undefined,
      "group_by": undefined
    }; // resulting sql

    var args = Array.prototype.slice.call(arguments);
    console.log('SQL-STRUCT IN: ', args);

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

    var grp = find_part('group_by');
    console.log('FOUND group_by: ', grp);
    if (grp instanceof Array && grp.length > 1) {
      q.group_by = eval_lisp( grp, _context );
    }

    var srt = find_part('order_by');
    console.log('FOUND sort: ', srt);
    if (srt instanceof Array && srt.length > 1) {
      q.order_by = eval_lisp( srt, _context );
    }

    //slice(offset, pageItemsNum)
    var s = find_part('slice');
    console.log("FOUND slice: ", s);
    if (s instanceof Array && s.length > 1) {
      q.limit_offset = eval_lisp(s, _context );
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
        } else if (a[0] === "->") {
          // наш LPE использует точку, как разделитель вызовов функций и кодирует её как ->
          // в логических выражениях мы это воспринимаем как ссылку на <ИМЯ СХЕМЫ>.<ИМЯ ТАБЛИЦЫ>
          // return '"' + a[1] + '"."' + a[2] + '"';
          return eval_lisp(a, _context);
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

  // table.column 
  _context['->'] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log("->   " + JSON.stringify(a));
    return a.map( a => '"'+ a + '"').join('.');
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
      return "FROM " + a.map(prnt).join(', ');
    }
  }
  _context['from'].ast = [[],{},[],1]; // mark as macro

  _context['slice'] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log('slice IN: ', a);
    if (a.length < 1) {
      return "";
    } else {
      if (_vars["_target_database"] === 'oracle') {
        if (parseInt(a[0]) === 0) {
          return `ROWNUM <= ${parseInt(a[1])}`
        } else {
          return `ROWNUM > ${parseInt(a[0])} AND ROWNUM <= ${parseInt(a[1]) + parseInt(a[0])}`
        }
      } else {
        return "LIMIT " + parseInt(a[1]) + " OFFSET " + parseInt(a[0])
      }
    }
  }
  _context['slice'].ast = [[],{},[],1]; // mark as macro

  _context['group_by'] = function() {
    var a = Array.prototype.slice.call(arguments);
    if (a.length === 0) {
      return ""
    } else {
      return "GROUP BY " + a.join(' , ')
    }
  }

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

  _context['sql->entrypoint'] = function() {
    console.log("++++++++++++++++++");
    var ret = [];
    for (var i = 0; i < arguments.length; i++) {
      ret.push(eval_lisp( arguments[i], _context));
      console.log(JSON.stringify(ret));
    }

    return ret.join(',');
  }
  _context['sql->entrypoint'].ast = [[],{},[],1]; // mark as macro

  var sexpr = parse(_expr);
  console.log("parsed eval_sql_expr IN: ", sexpr);

  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */

  // точка входа всегда должна быть sql->entrypoint, так как мы определили sql->entrypoint как макроc чтобы иметь возможность
  // перекодировать имена таблиц в вызов .from()
  // а parse возвращает нам ->, так что меняем!
  if (sexpr[0] === '->') {
    sexpr[0] = 'sql->entrypoint';
  }

  if (sexpr[0] !== 'sql->entrypoint') {
    sexpr = ['sql->entrypoint',sexpr];
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
      if (expr[0] === 'where') {expr[0]='filter'};
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


/* returns struct, which is suitable to build full SQL text:
            {
                from: undefined,
                limit_offset: undefined,
                order_by: undefined,
                select: 'SELECT *',
                where: undefined,
                group_by: undefined
              }
*/
export function parse_sql_expr(_expr, _vars, _forced_table, _forced_where) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  // for(var key in _vars) _context[key] = _vars[key];

  if (_expr === null || _expr === '' || typeof _expr === "undefined") {
    _expr = 'filter()'; // that should generate empty struct
  }

  var sexpr = parse(_expr);

  if (sexpr[0] === '->') {
    sexpr[0] = 'sql->entrypoint';
  }

  if (sexpr[0] !== 'sql->entrypoint') {
    // это значит, что на входе у нас всего один вызов функции, мы его обернём в ->
    sexpr = ['sql->entrypoint', sexpr];
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


export function generate_report_sql(_cfg, _vars) {
  var ctx = sql_context(_vars);
  var _context = ctx;
   /* Для генерации SELECT запросов из конфигов, созданных для Reports */



  /* while we wrapping aggregate functions around columns, we should keep track of the free columns, so we will be able to
     generate correct group by !!!!
  */
 var group_by = _cfg["columns"].map(h => h["id"])

 var wrap_aggregate_functions = (col, cfg, col_id) => {
   ret = col;
   if (Array.isArray(cfg["agg"]) && cfg["agg"].length > 0) {
     group_by = group_by.filter( id => id !== col_id )
     return cfg["agg"].reduce( (a, currentFunc) => `${currentFunc}( ${a} )` , ret)
   }
   return ret
 }

_context["column"] = function(col) {
  var col_info = reports_get_column_info(_cfg["sourceId"], col)
  var col_sql = col_info["sql_query"]
  if ( col_sql.match( /^\S+$/ ) === null ) {
    // we have whitespace here, so it is complex expression :-()
    return `${col_sql}`
  }
  // we have just column name, prepend table alias !
  var parts = col.split('.')
  return `"${parts[1]}"."${col_sql}"`
}

_context['generate_sql_struct_for_report'] = function(cfg) {
  console.log(JSON.stringify(cfg))
  if (typeof cfg === 'object' && Array.isArray(cfg)) {
    throw new Error("reports_sql expected {...} as argument")
  }

  /* нужно сгенерить что-то типа такого:
[  'sql-struct',
  [
    'select',
    'a',
    'b',
    [ '->', 'department_code', 'alias' ],
    [ '::', 'no', 'TEXT' ],
    [ 'max', 'credits' ]
  ],
  [ 'from', [ '->', 'bm', 'tbl' ] ],
  [ 'order_by', 'a', [ '-', 'b' ] ],
  [ 'filter', [ '()', [Array] ] ]
]
*/
/*
  var convert_in_to_eq = function(in_lpe){
    if (in_lpe[0] === 'in'){
      in_lpe[0] = '=';
    }
     in_lpe.map(el => {
       if (Array.isArray(el)) {
        convert_in_to_eq(el)
       }      
      })
    return in_lpe;
  }*/

  const convert_in_to_eq = (in_lpe) => {
    if (!Array.isArray(in_lpe) || in_lpe.length === 0) return in_lpe;
    return [
      in_lpe[0] === 'in' ? '=' : in_lpe[0],
      ...in_lpe.slice(1).map(convert_in_to_eq)
    ]
  }

  // на входе вложенная структура из конфига.
  // расчитываем, что структура создана в GUI и порядок следования элементов стандартный
  var quote_text_constants = (in_lpe) => {
    if (!Array.isArray(in_lpe)) return in_lpe;

    //console.log("quote_text_constants" + JSON.stringify(in_lpe))
    if (in_lpe[0] === 'in') {
      if (Array.isArray(in_lpe[1])) {
        if (in_lpe[1][0] === 'column') {
          if (Array.isArray(in_lpe[2]) && in_lpe[2][0] === '[') {
            // ["=",["column","vNetwork.cluster"],["[","SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
            var info = reports_get_column_info(_cfg["sourceId"], in_lpe[1][1])
            if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
              in_lpe[2] = ['['].concat(in_lpe[2].slice(1).map(el => ["to_date", ["ql", el], "'YYYY-MM-DD'"]))
            } else {
              in_lpe[2] = ['['].concat(in_lpe[2].slice(1).map(el => ["ql", el]))
            }
          }
        }
      }
    } else {
      if (in_lpe.length > 2 && in_lpe[0] !== 'not') {
        if (Array.isArray(in_lpe[1])) {
          if (in_lpe[1][0] === 'column') {
            if (!Array.isArray(in_lpe[2])) {
              // ANY OPERATOR
              // ["~",["column","vNetwork.cluster"],"SPB99-DMZ02"]
              var info = reports_get_column_info(_cfg["sourceId"], in_lpe[1][1])
              if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
                in_lpe[2] = ["to_date", ["ql", in_lpe[2]], "'YYYY-MM-DD'" ]
              } else {
                in_lpe[2] = ["ql", in_lpe[2]]
              }              
            }
            if (in_lpe.length === 4) {
              // between
              if (!Array.isArray(in_lpe[3])) {
                //["between",["column","vNetwork.period_month"],"2019-09-10","2019-09-20"]
                var info = reports_get_column_info(_cfg["sourceId"], in_lpe[1][1])
                if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
                  in_lpe[3] = ["to_date",["ql", in_lpe[3]], "'YYYY-MM-DD'" ]
                  in_lpe[4] = ["to_date",["ql", in_lpe[4]], "'YYYY-MM-DD'" ]
                } else {
                  in_lpe[3] = ["ql", in_lpe[3]]
                  in_lpe[4] = ["ql", in_lpe[4]]
                }
              }
            }
          }
        }
      }
    }
    in_lpe.map(el => {
        //console.log("RECURS" + JSON.stringify(el))
        quote_text_constants(el)     
     })
    return in_lpe;
  }

  var struct = ['sql'];

  var allSources = cfg["columns"].map(h => h["id"].split('.')[0]);
  var uniq = [...new Set(allSources)];
  if (uniq.length != 1) {
    throw new Error("We support select from one source only, joins are not supported! Sources detected: " + JSON.stringify(uniq));
  }

  var allTables = cfg["columns"].map(h => h["id"].split('.').slice(0,2).join('.') );
  // !!!!!!!!!!!!! uniq will be used later in from!!!
  var uniqTables = [...new Set(allTables)];

  var join_struct = reports_get_join_path(uniqTables); 

  if (join_struct.nodes.length === 0) {
    throw new Error("Can not find path to JOIN tables: " + JSON.stringify(uniqTables));
  }

  // HACK as we miss _cfg["sourceId"]
  var srcIdent = _cfg["sourceId"]
  if (srcIdent === undefined) {
    srcIdent = join_struct.nodes[0].split('.')[0]
  }
  var target_db_type = get_source_database(srcIdent)
  _context["_target_database"] = target_db_type

  // column should always be represented as full path source.cube.ciolumn
  // for aggregates we should add func names as suffix ! like source.cube.column.max_avg
  var sel = ['select'].concat(cfg["columns"].map(h => {
    var col_info = reports_get_column_info(cfg["sourceId"], h["id"])
    var col_sql = col_info["sql_query"]

    var parts = h.id.split('.')
    //if ( col_sql.match( /^\S+$/ ) !== null ) {
    if (col_sql === parts[2]) {
      // we have just column name, prepend table alias !
      col_sql = `"${parts[1]}"."${col_sql}"`
    }

    var wrapped_column_sql = wrap_aggregate_functions(col_sql, h, h["id"]);
    var as = `"${h.id}"`
    if (Array.isArray(h["agg"])) {
      as = `"${h.id}.${h["agg"].join('.')}"`
    }

    //return `${wrapped_column_sql} AS ${as}`
    // oracle has limit 30 chars in identifier!
    // we can skip it for now.
    return `${wrapped_column_sql}`
  }))

  if (group_by.length === cfg["columns"].length) {
    group_by = ["group_by"]
  } else {
    // we should provide group_by!
    group_by = ["group_by"].concat(group_by.map( c => ["column",c]))
  }

  // will return something like     (select * from abc) AS a
  var from = ['from'].concat(join_struct.nodes.map( t => reports_get_table_sql(target_db_type, t) ))            

  var order_by = ['order_by'].concat(cfg["columns"].map(h=> {
                                                        if (h["sort"] == 1) {
                                                          return ["+", ["column", h["id"] ] ]
                                                        } else if (h["sort"] == 2) {
                                                          return ["-", ["column", h["id"] ] ]
                                                        }
                                                      }));
  order_by = order_by.filter(function(el){return el !== undefined})

  var filt = cfg["filters"]
             .map(h => { return h["lpe"] ? convert_in_to_eq(quote_text_constants(h["lpe"])) : null} )
             .filter(function(el){return el !== null});

  console.log("========= reports_get_join_conditions " + JSON.stringify(join_struct))
  if (join_struct.nodes.length > 1) {
    filt = filt.concat( reports_get_join_conditions(join_struct) )
  }

  if (filt.length > 1) {
    filt = ['and'].concat(filt);
  } else if (filt.length == 1) {
    filt = filt[0]
  }
  if (filt.length > 0) {
    filt = ["filter", filt]
  } else {
    filt = ["filter"]
  }

  struct.push(sel, from, order_by, filt, group_by)

  if (cfg["limit"] !== undefined) {
    var offset = cfg["offset"] || 0
    struct.push( ["slice", offset, cfg["limit"]])
  }
  console.log(JSON.stringify(struct))

  console.log(`USING ${target_db_type} as target database`)
  var ret = eval_lisp(struct, _context);

  return ret;
}

// по хорошему, надо столбцы засунуть в _context в _columns и подгрузить их тип из базы!!!
// но мы типы столбцов будем определять здесь (в этой функции) и пытаться закавычить константы заранее....
var ret = eval_lisp(["generate_sql_struct_for_report", _cfg], _context);

return ret;

}
