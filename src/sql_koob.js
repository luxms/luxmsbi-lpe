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
import {eval_lisp, isString, isArray, isHash, isFunction} from './lisp';
//import {sql_where_context} from './sql_where';
import {parse} from './lpep';
import {
  reports_get_column_info, 
  reports_get_columns,
  reports_get_table_sql, 
  reports_get_join_path, 
  reports_get_join_conditions, 
  get_source_database
} from './utils/utils';

/* Постановка
На входе имеем структуру данных из браузера:
          { "with":"czt.fot",
              "filters": {
              "dor1": ["=", "ГОРЬК"],
              "dor2": ["=", "ПОДГОРЬК"],
              "dor4": ["=", null],
              "dor5": ["=", null],
              "dt": ["BETWEEN", "2020-01", "2020-12"],
              "sex_name": ["=", "Мужской"],
              "": [">", ["+",["col1", "col2"]], 100]
            },
            "having": {
              "dt": [">","2020-08"],
            },
            "columns": ["dor3", "czt.fot.dor4", "fot.dor5", 'sum((val3+val1)/100):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new":  ["avg", ["+",["column","val2"],["column","val3"]]]} ],
            "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2", "summa"]
          }

Требуется 
1) тексты отпарсить в скоботу и сделать готовые для eval структуры.
2) на основе with сходить в базу и получить всю инфу про столбцы куба, подготовить context для поиска столбцов по короткому и длинному имени.
3) выполнить eval для части columns -> получить массив структур, готовых к построению части SELECT.
   'sum((val3+val1)/100):summa' ===> 
   {
     expr: 'sum((fot.val3+fot.val1)/100)',
     alias: "summa",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true
     cubes: ["czt.fot"]
   }
   можно также в процессе вычисления определить тип столбца из базы, и автоматом навесить agg, например sum
4) на основе columns_struct вычислить group_by, проверить, требуется ли JOIN.
5) при вычислении фильтров, учесть group_by и сделать дополнение для столбцов, у которых в конфиге указано как селектить ALL
6) создать какое-то чудо, которое будет печатать SQL из этих структур.
7) при генерации SQL в ПРОСТОМ случае, когда у нас один единственный куб, генрим КОРОТКИЕ имена столбцов
*/



/***************************************************************
 * Дописывает имена столбцов в структуре _cfg, до полных имён, используя префикс cube_prefix, там, где это очевидно.
 * простые тексты переводит в LPE скоботу
 * Считаем, что любой встреченный литерал является именем столбца.
 * в контексте ctx[_columns] должны быть описания столбцов из базы
 */
function normalize_koob_config(_cfg, cube_prefix, ctx) {
  var parts = cube_prefix.split('.')
  var ds = parts[0]
  var cube = parts[1]
  var ret = {"ds":ds, "cube":cube, "filters":{}, "having":{}, "columns":[], "limit": _cfg["limit"], "offset": _cfg["offset"]}
  var aliases = {}

  /* expand_column также будем делать в процессе выполнения LPE, там будет вся инфа про куб, и про его дименшены. 
     мы будем точно знать, является ли суффикс именем столбца из куба или нет.
     То есть нужна правильная реализация функции column и правильная реализация для неизвестного литерала, с учётом алиасов !!!
  */

  var expand_column = (col) => {
    return col.match(/("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)/) === null
      ? (ctx._columns[`${cube_prefix}.${col}`] ? `${cube_prefix}.${col}` : col )
      : col
  }


  // для фильтров заменяем ключи на полные имена
  Object.keys(_cfg["filters"]).filter(k => k !== "").map( 
    key => {ret["filters"][expand_column(key)] = _cfg["filters"][key]} )

  // probably we should use aliased columns a AS b!!
  Object.keys(_cfg["having"]).filter(k => k !== "").map( 
    key => ret["having"][expand_column(key)] = _cfg["having"][key] )



  // "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2", ["-",["column","val3"]]]
  // FIXME: нужна поддержка "sort": [1,3,-2]
  // FIXME: может быть лучше перейти на ORDER BY 2, 1 DESC, 4 ???? 
  ret["sort"] = _cfg["sort"].map(el => {
    if(Array.isArray(el)){
      if (el.length === 2){
        if (el[0] === "-" || el[0] === "+"){
          if (Array.isArray(el[1])){
            if (el[1][0] === "column") {
              return [el[0], ["column", expand_column(el[1][1])]]
            }
          } else {
            return [el[0], ["column", expand_column(el[1])]]
          }
        }
      }
    } else if (el && typeof el === 'string') {
      // тут может быть ссылка как на столбец, так и на alias, надо бы научиться отличать одно от другого
      if (el.startsWith("-")) {
        return ["-", ["column", expand_column( el.substring(1))]]
      } else if (el.startsWith("+")) {
        return ["+", ["column", expand_column( el.substring(1))]]
      } else {
        return ["+", ["column", expand_column( el )]]
      }
    }
  })

  // "columns": ["dor3", "src.cube.dor4", "cube.col", 'sum((val3+val1)/100):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new":  ["avg", ["+",["column","val2"],["column","val3"]]]} ],
  /* возвращает примерно вот такое:
  [["column","ch.fot_out.dor3"],["->","src","cube","dor4"],["->","cube","col"],[":",["sum",["/",["()",["+","val3","val1"]],100]],"summa"],[":",["column","ch.fot_out.old"],"new"],["sum",["column","val2"]],[":",["avg",["+",["column","val2"],["column","val3"]]],"new"]]
  простые случаи раскладывает в скоботу сразу, чтобы не запускать eval_lisp
  */
  var expand_column_expression = function(el) {
    if (isString(el)) {
      // do not call parse on simple strings, which looks like column names !!!
      if (el.match(/^[a-zA-Z_]\w+$/) !== null) {
        return ["column", expand_column( el )]
      }

      // exactly full column name, но может быть лучше это скинуть в ->
      if (el.match(/^([a-zA-Z_]\w+\.){1,2}[a-zA-Z_]\w+$/) !== null) {
        return ["column",  el]
      }
      var ast = parse(el)
      if (typeof ast === 'string') {
        // but if it was string, try to expand
        return ["column", expand_column( ast )]
      }
      return ast
    } else if (Array.isArray(el)){
      return el
    } else {
      throw new Error(`Wrong element in the columns array: ${el.toString()}`)
    }
  } 

  // turn text lpe representations into AST, keep AST as is...
  ret["columns"] = _cfg["columns"].map(el => {
    if (isHash(el)) {
      return [":", expand_column_expression(Object.values(el)[0]), Object.keys(el)[0]]
    } else {
      return expand_column_expression(el)
    }
  })

  //console.log(`COLUMNS: ${JSON.stringify(ret)}`)

  return ret;
}

/*********************************
 * 
 * init_koob_context
 * на входе контекст может быть массивом, а может быть хэшем. Стало сложнее с этим работать!
 * Cчитаем, что на входе может быть только хэш с уже прочитанными именами столбцов!!
 */

function init_koob_context(_vars, default_ds, default_cube) {
  var _ctx = [] // это контекст где будет сначала список переменных, включая _columns, и функции
  if (isHash(_vars)){
    _ctx = [_vars]
  }
  var _context = _ctx[0];

  // функция, которая резолвит имена столбцов для случаев, когда имя функции не определено в явном виде в _vars/_context
  _ctx.push(
    (key, val, resolveOptions) => {
      //console.log(`WANT to resolve ${key}`, JSON.stringify(resolveOptions));
      // вызываем функцию column(ПолноеИмяСтолбца) если нашли столбец в дефолтном кубе
      if (_context["_columns"][key]) return _context["column"](key)
      if (_context["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
      
      if (key.match(/^\w+$/) && resolveOptions && resolveOptions.wantCallable) {
        if (_context["_result"]){
          if (['sum','avg','min','max','count'].find(el => el === key) ){
            _context["_result"]["agg"] = true
          }
        }

        return function() {
          var a = Array.prototype.slice.call(arguments);
          //console.log(`FUNC RESOLV ${key}`, JSON.stringify(a))
          return `${key}(${a.join(',')})`
        }
      } else if (resolveOptions && resolveOptions.wantCallable) {
        return function() {
          var a = Array.prototype.slice.call(arguments);
          return `${a[0]} ${key} ${a[1]}`
        }
      }

      //console.log(`DID NOT resolved ${key}`);

      return key
    }
  )

  
  _context["column"] = function(col) {
    // считаем, что сюда приходят только полностью резолвенные имена с двумя точками...
    var c = _context["_columns"][col]
    if (c) {
      if (_context["_result"]){
        _context["_result"]["columns"].push(col)
      }
      if (c.sql_query.match( /^\S+$/ ) === null) {
        // we have whitespace here, so it is complex expression :-()
        return `(${c.sql_query})`
      } else {
        // we have just column name, prepend table alias !
        var parts = col.split('.')
        return `${parts[1]}.${parts[2]}`
      }
    }
    // возможно кто-то вызовет нас с коротким именем - нужно знать дефолт куб!!!
    //if (_context["_columns"][default_ds][default_cube][key]) return `${default_cube}.${key}`;
    return col;
  }

  // сюда должны попадать только хитрые варианты вызова функций с указанием схемы типа utils.smap()
  _context["->"] = function() {
    var a = Array.prototype.slice.call(arguments);
    console.log("-> !" , JSON.stringify(a))
    return a.map(el => isArray(el) ? eval_lisp(el, _ctx) : el).join('.');
  }
  _context['->'].ast = [[],{},[],1]; // mark as macro

  _context[':'] = function(o, n) {
    //var a = Array.prototype.slice.call(arguments);
    //console.log("->   " + JSON.stringify(a));
    //return a[0] + ' as ' + a[1].replace(/"/,'\\"');

    //console.log("AS   " + JSON.stringify(_ctx));
    var otext = eval_lisp(o, _ctx)
    if (_context["_result"]){
      // мы кидаем значение alias в _result, это подходит для столбцов
      // для TABLE as alias не надо вызывать _result
      _context["_result"]["alias"] = n
      return otext
    }
  
    return `${otext} as ${n}`
  }
  _context[':'].ast = [[],{},[],1]; // mark as macro


  _context['()'] = function(a) {
    return `(${a})`
  }
  return _ctx;
} 


  /* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
   Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
   Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !

   Для указанных явно дименшенов доп. условий не требуется, клиент сам будет разбираться с результатом
  */

function  inject_all_member_filters(_cfg, columns) {
  var h = {};
  // заполняем хэш h длинными именами столбцов, по которым явно есть GROUP BY
  _cfg["_group_by"].map(el => {
    el.columns.map(e => h[e] = true)
  })

  // Ищем dimensions, по которым явно указан memeber ALL, и которых НЕТ в нашем явном списке...
  Object.values(columns).map(el => {
    if (h[el.id] === true) return // столбец уже есть в списке group by!
    if (isHash(el.config)) {
      if (el.config.memberALL === null || isString(el.config.memberALL)) {
         // есть значение для члена ALL, и оно в виде строки или IS NULL
         // добавляем фильтр, но только если по этому столбцу нет другого фильтра!!!
         // по ключу filters ещё не было нормализации !!! 
         if (!isArray(_cfg["filters"][el.id])){
          _cfg["filters"][el.id] = ["=",el.config.memberALL]
         }
      }
    }
  })

  return _cfg;
}

export function generate_koob_sql(_cfg, _vars) {

  var _context = _vars;
/*
{
"with":"czt.fot",
  "filters": {
  "dor1": ["=", "ГОРЬК"],
  "dor2": ["=", "ПОДГОРЬК"],
  "dor4": ["=", null],
  "dor5": ["=", null],
  "dt": ["BETWEEN", "2020-01", "2020-12"],
  "sex_name": ["=", "Мужской"],
  "": [">", ["+",["col1", "col2"]], 100]
},
"having": {
  "dt": [">","2020-08"],
},
"columns": ["dor3", 'sum(val3):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new",  ["avg", ["+",["column","val2"],["column","val3"]]} ],
"sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2"] 
}
*/

  if ( isString( _cfg["with"]) ) {
    var w = _cfg["with"]
    _context["_columns"] = reports_get_columns(w)

    // это корректный префикс: "дс.перв"."куб.2"  так что тупой подсчёт точек не катит.
    if ( w.match( /^("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)$/) !== null ) {
      _cfg = normalize_koob_config(_cfg, w, _context);
      var target_db_type = get_source_database(w.split('.')[0])
      _context["_target_database"] = target_db_type
    } else {
      // это строка, но она не поддерживается, так как либо точек слишком много, либо они не там, либо их нет
      throw new Error(`Request contains with key, but it has the wrong format: ${w} Should be datasource.cube with exactly one dot in between.`)
    }
  } else {
    throw new Error(`Default cube must be specified in with key`)
  }

  _context = init_koob_context(_context, _cfg["ds"], _cfg["cube"])
  
  console.log("NORMALIZED CONFIG: ", JSON.stringify(_cfg))

  /*
    while we evaluating each column, koob_context will fill JSON structure in the context like this:
   {
     expr: "sum((fot.val3+fot.val1)/100) as summa",
     alias: "summa",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true
   }
  */

  var columns_s = [];
  var columns = _cfg["columns"].map(el => {
                                      _context[0]["_result"] = {"columns":[]}
                                      var r = eval_lisp(el, _context)
                                      columns_s.push(_context[0]["_result"])
                                      return r})
  _context[0]["_result"] = null
  for (var i=0; i<columns.length; i++){
    columns_s[i]["expr"] = columns[i]
  }

  // ищем кандидатов для GROUP BY и заполняем оригинальную структуру служебными полями
  _cfg["_group_by"] = []
  _cfg["_measures"] = []
  columns_s.map(el => (el["agg"] === true) ? _cfg["_measures"].push(el) : _cfg["_group_by"].push(el))
  _cfg["_columns"] = columns_s

  /* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
   Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
   Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !

   Для указанных явно дименшенов доп. условий не требуется, клиент сам будет разбираться с результатом
  */

  //console.log("CONTEXT", JSON.stringify(_context))
  _cfg = inject_all_member_filters(_cfg, _context[0]["_columns"])

  console.log(JSON.stringify(_cfg))
  return _cfg;

  /* while we wrapping aggregate functions around columns, we should keep track of the free columns, so we will be able to
     generate correct group by !!!!
  */
 var group_by = _cfg["columns"].map(h => h["id"])

 var wrap_aggregate_functions = (col, cfg, col_id) => {
   ret = col;
   // Empty agg arrays can be used for AGGFN type ! We happily support it
   if (Array.isArray(cfg["agg"])) {
     group_by = group_by.filter( id => id !== col_id )
     var r = cfg["agg"].reduce( (a, currentFunc) => `${currentFunc}( ${a} )` , ret)

     /* it is a special default formatter, which should be implemented per column with LPE!!!! DISABLED
     if (_context["_target_database"] === 'oracle' || _context["_target_database"] === 'postgresql') {
       // automatically format number
       r = `to_char( ${r}, '999G999G999G999G990D00')`
     }
     */
     return r;
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
  return `${parts[1]}.${col_sql}`
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

    if (in_lpe[0] === 'IN') {
      // example: ["IN",["column","vNetwork.cluster"],["SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
      // Transform to AST form
      in_lpe[0] = 'in';
      in_lpe[2] = ['['].concat(in_lpe[2]);
      // and process further
    }

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

  // column should always be represented as full path source.cube.column
  // for aggregates we should add func names as suffix ! like source.cube.column.max_avg
  var sel = ['select'].concat(cfg["columns"].map(h => {
    var col_info = reports_get_column_info(cfg["sourceId"], h["id"])
    var col_sql = col_info["sql_query"]

    var parts = h.id.split('.')
    //if ( col_sql.match( /^\S+$/ ) !== null ) {
    if (col_sql === parts[2]) {
      // we have just column name, prepend table alias !
      col_sql = `${parts[1]}.${col_sql}`
    }

    // This is hack to implement AGGFN type !
    if (col_info["config"]["aggFormula"]) {
      // We should remove column from GROUP BY
      // group_by is global, it is sad
      group_by = group_by.filter( id => id !== h["id"] )
    }

    var wrapped_column_sql = wrap_aggregate_functions(col_sql, h, h["id"]);
    var as = `${h.id}`
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
