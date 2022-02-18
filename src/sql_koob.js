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
import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, isNumber} from './lisp';
//import {sql_where_context} from './sql_where';
import {parse} from './lpep';
import {
  reports_get_column_info, 
  reports_get_columns,
  reports_get_table_sql, 
  reports_get_join_path, 
  reports_get_join_conditions, 
  get_source_database,
  db_quote_literal
} from './utils/utils';
import { isObject } from 'core-js/fn/object';
import { has } from 'core-js/fn/dict';

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
            "return": "count", // возможно такое!!!
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

function quot_as_expression(db, src, alias) {
  if (db === 'mysql'){
    return `${src} as ` + "`" + `${alias}` + "`"
  } else {
    return `${src} as "${alias}"`
  }
}


function any_db_quote_literal(el) {
  return "'" + el.toString().replace(/'/g, "''") + "'";
}

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
  var ret = {
    "ds":ds, "cube":cube, "filters":{}, "having":{}, "columns":[], "sort": [], 
    "limit": _cfg["limit"], "offset": _cfg["offset"], "subtotals": _cfg["subtotals"],
    "options": isArray(_cfg["options"]) ? _cfg["options"] : [],
    "return": _cfg["return"]
  }
  var aliases = {}

  if (_cfg["distinct"]) ret["distinct"]=[]

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
  if (isHash(_cfg["filters"])) {
    Object.keys(_cfg["filters"]).filter(k => k !== "").map( 
      key => {ret["filters"][expand_column(key)] = _cfg["filters"][key]} )
    ret["filters"][""] = _cfg["filters"][""]
  }

  // для фильтров заменяем ключи на полные имена, но у нас может быть массив [{},{}]
  if (isArray(_cfg["filters"])) {
    var processed = _cfg["filters"].map(obj => {
        var result = {}
        if (isHash(obj)) {
          Object.keys(obj).filter(k => k !== "").map( 
              key => {result[expand_column(key)] = obj[key]})
          result[""] = obj[""]
        }
        return result
        }
    )
    ret["filters"] = processed; // [{},{}]
  }


  // probably we should use aliased columns a AS b!!
  if (isArray(_cfg["having"])) {
    Object.keys(_cfg["having"]).filter(k => k !== "").map( 
      key => ret["having"][expand_column(key)] = _cfg["having"][key] )
  }



  // "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2", ["-",["column","val3"]]]
  // FIXME: нужна поддержка "sort": [1,3,-2]
  // FIXME: может быть лучше перейти на ORDER BY 2, 1 DESC, 4 ???? 
  if (isArray(_cfg["sort"])) {
    ret["sort"] = _cfg["sort"].map(el => {
      if(Array.isArray(el)){
        if (el.length === 2){
          if (el[0] === "-" || el[0] === "+"){
            if (Array.isArray(el[1])){
              if (el[1][0] === "column") {
                return [el[0], ["column", expand_column(el[1][1])]]
              }
            } else {
              return [el[0], ["colref", el[1]]]
            }
          }
        }
      } else if (el && typeof el === 'string') {
        // тут может быть ссылка как на столбец, так и на alias, надо бы научиться отличать одно от другого
        // чтобы отличить alias от столбца - не делаем expand_column сейчас, и используем вызов colref!
        // FIXME: colref сейчас объявлен только для контекста sort!
        // FIXME: мы теряем имя куба: cube_prefix
        if (el.startsWith("-")) {
          return ["-", ["colref", el.substring(1)]]
        } else if (el.startsWith("+")) {
          return ["+", ["colref", el.substring(1)]]
        } else {
          return ["+", ["colref", el]]
        }
      }
    })
  }

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
      var ast = parse(`expr(${el})`)
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

  // пытается определить тип аргумента, если это похоже на столбец, то ищет про него инфу в кэше и определяет тип,
  // а по типу можно уже думать, квотировать значения или нет.
  var shouldQuote = function(col, v) {
    if (isArray(col) && col[0] === 'column') {
      //try to detect column type
      var c = _context["_columns"][col[1]]
      if (c) {
        return (c.type !== 'NUMBER')
      }
      return isString(v);
    }

    // это формула над какими-то столбцами...
    // смотрим на тип выражения v, если это текст, то возвращаем true,
    // но сначала проверим, вдруг это alias???
    if (_context["_aliases"][v]) {
      return false;
    }


    // left and right side looks like a column names, don't quote
    if ( isString(col) && isString(v) &&
         (col.match(/^[A-Za-z_]+\w*$/) || col.match(/^[A-Za-z_]+\w*\.[A-Za-z_]+\w*$/))
         &&
         (v.match(/^[A-Za-z_]+\w*$/) || v.match(/^[A-Za-z_]+\w*\.[A-Za-z_]+\w*$/))
    ) {
      return false
    }

    return isString(v);
  }
  
  var quoteLiteral = function (lit) {
    if (isString(lit) || isNumber(lit) || (isArray(lit) && lit[0] !== "ql")) {
      return ["ql", lit]
    }
    return lit
  }

  // функция, которая резолвит имена столбцов для случаев, когда имя функции не определено в явном виде в _vars/_context
  _ctx.push(
    (key, val, resolveOptions) => {
      // console.log(`WANT to resolve ${key} ${val}`, JSON.stringify(resolveOptions));
      // вызываем функцию column(ПолноеИмяСтолбца) если нашли столбец в дефолтном кубе
      if (_context["_columns"][key]) return _context["column"](key)
      if (_context["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
      // reference to alias!
      //console.log("DO WE HAVE SUCH ALIAS?" , JSON.stringify(_context["_aliases"]))
      if (_context["_aliases"][key]) {
        if (!isArray(_context["_result"]["columns"])){
          _context["_result"]["columns"] = []
        }
        // remeber reference to alias as column name!
        _context["_result"]["columns"].push(key)
        // mark our expression same as target
        // FIXME: setting window will result in BUGS
        //_context["_result"]["window"] = _context["_aliases"][key]["window"]
        _context["_result"]["agg"] = _context["_aliases"][key]["agg"]

        // Mark agg function to display expr as is
        _context["_result"]["outerVerbatim"] = true 

        return key;
      }

      if (resolveOptions && resolveOptions.wantCallable){
        if (key.match(/^\w+$/) ) {
          if (_context["_result"]){
            if (['sum','avg','min','max','count'].find(el => el === key) ){
              _context["_result"]["agg"] = true
            }
          }

          return function() {
            var a = Array.prototype.slice.call(arguments);
            //console.log(`FUNC RESOLV ${key}`, JSON.stringify(a))
            if (key.match(/^between$/i)) {
              //console.log(`between(${a.join(',')})`)
              var e = eval_lisp(["between"].concat(a),_ctx)
              return e
            }

            if (key === 'count') {
              if (_context._target_database == 'clickhouse') {
                // console.log('COUNT:' + JSON.stringify(a))
                // у нас всегда должен быть один аргумент и он уже прошёл eval !!!
                // Это БАГ в тыкдоме = отдаёт текстом значения, если count делать Ж-()
                return `toUInt32(count(${a[0]}))`
              }
            }
            return `${key}(${a.join(',')})`
          }
        } else {
          // -> ~ > < != <> and so on,
          //  FIXME: мы должны вернуть более умный макрос, который будет искать вызовы column в левой и правой части и делать ql при необходимости
          return makeSF((ast,ctx) => {
            //console.log(`ANY FUNC ${key}`, JSON.stringify(ast))
            var k = key
            var col = ast[0]
            var c = eval_lisp(col,ctx)

            var v = ast[1]
            if (shouldQuote(col,v)) v = quoteLiteral(v)
            v = eval_lisp(v,ctx)

            return `${c} ${k} ${v}`
          })
        }
      }

      // We may have references to yet unresolved aliases....
      if (isHash(_context["_result"])){
        if (key.match(/^[A-Za-z_]+\w*$/)) {
          if (!isArray(_context["_result"]["unresolved_aliases"])){
            _context["_result"]["unresolved_aliases"] = []
          }
          _context["_result"]["unresolved_aliases"].push(key)
        }
      }

      //console.log(`DID NOT resolved ${key}`);

      return key
    }
  )

  _context["_sequence"] = 0;
  
  _context["column"] = function(col) {
    // считаем, что сюда приходят только полностью резолвенные имена с двумя точками...
    var c = _context["_columns"][col]
    if (c) {
      // side-effect to return structure (one per call)
      if (_context["_result"]){
        _context["_result"]["columns"].push(col)
        if (c["type"] === "AGGFN") {
          _context["_result"]["agg"] = true
        }
      }
      var parts = col.split('.')
      if (parts[2].localeCompare(c.sql_query, undefined, { sensitivity: 'accent' }) === 0 ) {
        // we have just column name, prepend table alias !
        return `${c.sql_query}`
        // temporarily disabled by DIMA FIXME
        //return `${parts[1]}.${c.sql_query}`
      } else {
        //console.log(`OPANKI: ${c.sql_query}`)
        // FIXME: WE JSUT TRY TO match getDict, if ANY. there should be a better way!!!
        // dictGet('gpn.group_pay_dict', some_real_field, tuple(pay_code))
        //console.log(`OPANKI: ${c.sql_query}`, JSON.stringify(_context))
        if (_context._target_database == 'clickhouse') {
          // for the SELECT part make sure we produce different things for INNER and OUTER SQL
          // SELECT part is denoted by _context["_result"]
          if (_context["_result"] && c.sql_query.match(/dictGet\(/)){
            //console.log(`OPANKI1: ${c.sql_query}`)
            _context["_result"]["outer_expr"] = c.sql_query
            _context["_result"]["outer_alias"] = parts[2]
            var m = c.sql_query.match(/,[^,]+,(.*)/)
            if (m) {
              m = m[1]
              //console.log(`OPANKI11: ${m}`)
              // ' tuple(pay_code))'
              var t = m.match(/tuple\((\w+)\)/)
              if (t) {
                //console.log(`OPANKI22: ${c.sql_query}  ${t[1]}`)
                _context["_result"]["alias"] = t[1]
                return t[1]
              } else {
                t = m.match(/(\w+)/)
                if (t) {
                  _context["_result"]["alias"] = t[1]
                  return t[1]
                }
              }
            }
          }
        }
        return `(${c.sql_query})`
      }
    }
    //console.log("COL FAIL", col)
    // возможно кто-то вызовет нас с коротким именем - нужно знать дефолт куб!!!
    //if (_context["_columns"][default_ds][default_cube][key]) return `${default_cube}.${key}`;
    return col;
  }

  /*
     expr: "initializeAggregation('sumState',sum(s2.deb_cre_lc )) as mnt",
     alias: "mnt",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true,
     window: true,
     outer_expr: "runningAccumulate(mnt, (comp_code,gl_account)) as col1",
     outer_alias: 'col1'
  */

  _context["running"] = function() {
    _context["_result"]["agg"] = true // mark that we are aggregate function for correct 'group by'
    _context["_result"]["window"] = true

    var a = Array.prototype.slice.call(arguments)
    //console.log("RUNNING" , JSON.stringify(a))
    //console.log("Flavor" , JSON.stringify(_context._target_database))

    if (_context._target_database !== 'clickhouse') {
      throw Error('running function is only supported for clickhouse SQL flavour')
    }

    //
    // we have 3 args ["sum","v_main",["-","hcode_name"]]
    // or we have 2 args: ["lead","rs"]
    // and should generate: initializeAggregation('sumState',sum(s2.deb_cre_lc )) as mnt 
    var fname = a[0];
    var colname = a[1];

    var order_by = ''
    var expr = ''
    if (fname === 'sum') {
      order_by = a[2]; // array!
      order_by = order_by[1]; // FIXME! may crash on wrong input!!! use eval !!!
      // We have 2 phases, inner and outer.
      // For inner phase we should generate init:
      expr = `initializeAggregation('${fname}State',${fname}(${colname}))`;

      // For outer phase we should generate 
      // runningAccumulate(wf1, (comp_code,gl_account)) AS end_lc,
      // BUT WIITHOUT AS end_lc
      var alias = '_w_f_' + ++_context["_sequence"]
      _context["_result"]["expr"] = expr
      _context["_result"]["columns"] = [colname]
      _context["_result"]["inner_order_by_excl"] = order_by
      _context["_result"]["outer_expr"] = `runningAccumulate(${alias}, partition_columns())` //it should not be used as is
      _context["_result"]["outer_expr_eval"] = true // please eval outer_expr !!!
      _context["_result"]["outer_alias"] = alias
    } else if (fname === 'lead'){
      // or we have 2 args: ["lead","rs"]
      // if this column is placed BEFORE referenced column, we can not create correct outer_expr
      // in this case we provide placeholder...

      var init = _context["_aliases"][colname]
      if (isHash(init) && init["alias"]) {
        _context["_result"]["outer_expr"] = `finalizeAggregation(${init["alias"]})`
      } else {
        _context["_result"]["outer_expr"] = `finalizeAggregation(resolve_alias())`
        _context["_result"]["outer_expr_eval"] = true 
        _context["_result"]["eval_reference_to"] = colname
      } 
      expr = null // no inner expr for this func!
    }
      return expr
  }
  _context['running'].ast = [[],{},[],1]; // mark as macro


  // сюда должны попадать только хитрые варианты вызова функций с указанием схемы типа utils.smap()
  _context["->"] = function() {
    var a = Array.prototype.slice.call(arguments);
    //console.log("-> !" , JSON.stringify(a))
    return a.map(el => isArray(el) ? eval_lisp(el, _ctx) : el).join('.');
  }
  _context['->'].ast = [[],{},[],1]; // mark as macro

  _context[':'] = function(o, n) {
    //var a = Array.prototype.slice.call(arguments);
    //console.log(":   " + JSON.stringify(o) + ` ${JSON.stringify(n)}`);
    //return a[0] + ' as ' + a[1].replace(/"/,'\\"');


    // если нам придёт вот такое "count(v_rel_pp):'АХТУНГ'",
    var al = n
    if (isArray(n) && n[0] == "'" || n[0] == '"') {
      al= n[1]
    }
    //console.log("AS   " + JSON.stringify(_ctx));
    var otext = eval_lisp(o, _ctx)
    if (_context["_result"]){
      // мы кидаем значение alias в _result, это подходит для столбцов
      // для TABLE as alias не надо вызывать _result

      // также есть outer_alias для оконных функций, мы его поменяем!!!
      if (_context["_result"]["outer_alias"]) {
        _context["_result"]["alias"] = _context["_result"]["outer_alias"]
        _context["_result"]["outer_alias"] = al
      } else {
        _context["_result"]["alias"] = al
      }
      return otext
    }
    
    return quot_as_expression(_context["_target_database"], otext, n)
  }
  _context[':'].ast = [[],{},[],1]; // mark as macro


  _context['toString'] = makeSF( (ast,ctx) => {
    // понимаем a = [null] как a is null
    // a = [] просто пропускаем, А кстати почему собственно???
    // a = [null, 1,2] как a in (1,2) or a is null

    // ["=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    //console.log(JSON.stringify(ast))
    var col = ast[0]
    var c = eval_lisp(col,_context)
    return `toString(${c})`

  })

  // Clickhouse way.... will create extra dataset
  // range(end), range([start, ] end [, step])
  // Returns an array of UInt numbers from start to end - 1 by step.
  // either 1 or 3 args !!!
  _context['range'] = function(from, to, step) {
    if (_context._target_database === 'clickhouse'){
      if (to === undefined) {
        return `arrayJoin(range(${from}))`
      } else {
        if (step === undefined){
          return `arrayJoin(range(${from},${to}))`
        } else {
          return `arrayJoin(range(${from},${to}, ${step}))`
        }
      }
    } else if (_context._target_database === 'postgresql'){
      if (to === undefined) {
        return `generate_series(0, ${from}-1)`
      } else {
        if (step === undefined){
          return `generate_series(${from}, ${to}-1)`
        } else {
          return `generate_series(${from}, ${to}-1, ${step})`
        }
      }
    } else {
      throw Error(`pointInPolygon is not supported in ${_context._target_database}`)
    }
  }

  _context['pointInPolygon'] = makeSF( (ast,ctx) => {
    //console.log(JSON.stringify(ast))
    // [["tuple","lat","lng"],["[",["tuple",0,0],["tuple",0,1],["tuple",1,0],["tuple",1,1]]]
    var point = ast[0]

    var pnt = eval_lisp(point,_context) // point as first argument
    
    var poly = eval_lisp(ast[1],_context)
    if (_context._target_database === 'clickhouse'){
      return `pointInPolygon(${pnt}, [${poly}])`
    } else if (_context._target_database === 'postgresql'){
      // circle '((0,0),2)' @> point '(1,1)'        	polygon '((0,0),(1,1))'
      return `polygon '(${poly})' @> point${pnt}`
    } else {
      throw Error(`pointInPolygon is not supported in ${_context._target_database}`)
    }
  })

  _context['pointInEllipses'] = function() {
    if (_context._target_database !== 'clickhouse'){
      throw Error(`pointInEllipses is not supported in ${_context._target_database}`)
    }

    var a = Array.prototype.slice.call(arguments)
    if ( (a.length - 2) % 4 != 0) {
      throw Error(`pointInEllipses should contain correct number of coordinates!`)
    }
    return `pointInEllipses(${a.join(',')})`
  }

  _context['pointInCircle'] = makeSF( (ast,ctx) => {
    // ["lat","lng", 0,0,R]
    var point = ast[0]

    var x = eval_lisp(ast[0],ctx) // point x
    var y = eval_lisp(ast[1],ctx)
    var cx = eval_lisp(ast[2],ctx) // center of circle 
    var cy = eval_lisp(ast[3],ctx) // center of circle 
    var R = eval_lisp(ast[4],ctx) 
    if (_context._target_database === 'clickhouse'){
      return `pointInEllipses(${x},${y},${cx},${cy},${R},${R})`
    } else if (_context._target_database === 'postgresql'){
      return `circle(point(${cx},${cy}),${R}) @> point(${x},${y})`
    } else {
      throw Error(`pointInPolygon is not supported in ${_context._target_database}`)
    }
  })

  _context['()'] = function(a) {
    return `(${a})`
  }

  _context['tuple'] = function(first, second) {
    if (_context._target_database === 'clickhouse'){
      return `tuple(${first},${second})`
    } else {
      return `(${first},${second})`
    }
  }

  _context['expr'] = function(a) {
    // Just placeholder for logical expressions, which should keep ()
    return a
  }

  _context['and'] = function() {
    var a = Array.prototype.slice.call(arguments)
    return `(${a.join(') AND (')})`
  }

  _context['or'] = function() {
    var a = Array.prototype.slice.call(arguments)
    return `(${a.join(') OR (')})`
  }

  _context["'"] = function(a) {
    return any_db_quote_literal(a)
  }

  // overwrite STDLIB! or we will treat (a = 'null') as (a = null) which is wrong in SQL !
  _context['null'] = 'null'
  _context['true'] = 'true'
  _context['false'] = 'false'

  _context["ql"] = function(el) {
    // NULL values should not be quoted
    // plv8 version of db_quote_literal returns E'\\d\\d' for '\d\d' which is not supported in ClickHose :-()
    // so we created our own version...
    return el === null ? null : any_db_quote_literal(el)
  }

  /* тут мы не пометили AGG !!!
  _context['count'] = makeSF( (ast,ctx) => {
    var a;
    if (ast.length == 1) {
      a = ast[0]
    } else {
      a = ast
    }
    if (_context._target_database == 'clickhouse') {
      // Это БАГ в тыкдоме = отдаёт текстом значения, если count делать Ж-()
      return `toUInt32(count(${eval_lisp(a, ctx)}))`
    } else {
      return `count(${eval_lisp(a, ctx)})`
    }
  });*/

  _context['between'] = function(col, var1, var2) {
    if (shouldQuote(col,var1)) var1 = quoteLiteral(var1)
    if (shouldQuote(col,var2)) var2 = quoteLiteral(var2)

    var l = eval_lisp(var1,_context);
    var r = eval_lisp(var2,_context);

    if (l === null || (isString(l) && (l.length === 0 || l === "''"))) {
      if (r === null || (isString(r) && (r.length === 0 || r === "''"))) {
        // both are empty, we should not generate any conditions!
        // FIXME: Should we return null?
        return '1=1'
      } else {
        // l is null, r is real
        return `${eval_lisp(col,_context)} <= ${r}`
      }
    } else {
      if (r === null || (isString(r) && (r.length === 0 || r === "''"))) {
        // l is real, r is null
        return `${eval_lisp(col,_context)} >= ${l}`
      } else {
        // both l and r is real
        return `${eval_lisp(col,_context)} BETWEEN ${l} AND ${r}`
      }
    }
    
  }
  _context['between'].ast = [[],{},[],1]; // mark as macro

  _context['~'] = function(col, tmpl) {
    if (shouldQuote(col,tmpl)) tmpl = quoteLiteral(tmpl)
    // в каждой базе свои regexp
    if (_vars["_target_database"] === 'oracle') {
      return `REGEXP_LIKE( ${eval_lisp(col,_context)} , ${eval_lisp(tmpl,_context)} )` 
    } else if (_vars["_target_database"] === 'mysql') {
      return `${eval_lisp(col,_context)} REGEXP ${eval_lisp(tmpl,_context)}` 
    } else if (_vars["_target_database"] === 'clickhouse') {
      // case is important !!!
      return `match( ${eval_lisp(col,_context)} , ${eval_lisp(tmpl,_context)} )` 
    } else {
      return `${eval_lisp(col,_context)} ~ ${eval_lisp(tmpl,_context)}`
    }
  }
  _context['~'].ast = [[],{},[],1]; // mark as macro


  _context['~*'] = function(col, tmpl) {
    if (shouldQuote(col,tmpl)) tmpl = quoteLiteral(tmpl)
    // в каждой базе свои regexp
    if (_vars["_target_database"] === 'oracle') {
      return `REGEXP_LIKE( ${eval_lisp(col,_context)} , ${eval_lisp(tmpl,_context)}, 'i')` 
    } else if (_vars["_target_database"] === 'mysql') {
      return `REGEXP_LIKE( ${eval_lisp(col,_context)}, ${eval_lisp(tmpl,_context)}, 'i')` 
    } else if (_vars["_target_database"] === 'clickhouse') {
      // case is not important !!!
      var pattern = eval_lisp(tmpl,_context); // should be in quotes! 'ddff'
      pattern = `(?i:${pattern.slice(1,-1)})` 
      return `match( ${eval_lisp(col,_context)} , '${pattern}' )` 
    } else {
      return `${eval_lisp(col,_context)} ~* ${eval_lisp(tmpl,_context)}`
    }
  }
  _context['~*'].ast = [[],{},[],1]; // mark as macro


  _context['!~'] = makeSF( (ast,ctx) => {
    return "NOT " + eval_lisp(["~"].concat(ast), ctx);
  });

  _context['!~*'] = makeSF( (ast,ctx) => {
    return "NOT " + eval_lisp(["~*"].concat(ast), ctx);
  });


  _context['like'] = function(col, tmpl) {
    if (shouldQuote(col,tmpl)) tmpl = quoteLiteral(tmpl)
    return `${eval_lisp(col,_context)} LIKE ${eval_lisp(tmpl,_context)}` 
  }
  _context['like'].ast = [[],{},[],1]; // mark as macro

  _context['ilike'] = function(col, tmpl) {
    if (shouldQuote(col,tmpl)) tmpl = quoteLiteral(tmpl)
    if (_vars["_target_database"] === 'clickhouse') {
      // FIXME: detect column type !!!
      return `toString(${eval_lisp(col,_context)}) ILIKE ${eval_lisp(tmpl,_context)}`
    } else {
      return `${eval_lisp(col,_context)} ILIKE ${eval_lisp(tmpl,_context)}`
    } 
  }
  _context['ilike'].ast = [[],{},[],1]; // mark as macro

  


  /*
  f1 / lpe_total(sum, f2)
  We should make subselect with full aggregation, but using our local WHERE!!!
  local WHERE is not Yet known, so we should post=pone execution???

  But we probably can inject EVAL part into _context["_result"]["expr"] ??
  if (_context["_result"]){

  */
  _context['lpe_subtotal'] = makeSF( (ast,ctx) => {
    if (_context["_result"]){
      var seq = ++_context["_sequence"]
      if (!isHash(_context["_result"]["lpe_subtotals"])){
        _context["_result"]["lpe_subtotals"] = {}
      }
      //console.log("AST: ", ast)
      // FIXME: pleaqse check that we have agg func in the AST, overwise we will get SQL errors from the DB
      //AST:  [ [ 'sum', 'v_rel_pp' ] ]
      //AST:  [ [ '+', [ 'avg', 'v_rel_pp' ], 99 ] ]
      _context["_result"]["lpe_subtotals"][`lpe_subtotal_${seq}`] = {"ast": ast, "expr": `${eval_lisp(ast[0], ctx)}`}
      // in simple cases we wil have this: {"lpe_totals":{
      // "lpe_total_2":{"ast":[["avg", "v_rel_pp"]],"expr":"avg(fot_out.v_rel_pp)"}}

      _context["_result"]["eval_expr"] = true
    }
    // naive!!!
    return `lpe_subtotal_${seq}()` // ${ast[0]}, ${ast[1]}
  });

  _context['='] = makeSF( (ast,ctx) => {
    // понимаем a = [null] как a is null
    // a = [] просто пропускаем, А кстати почему собственно???
    // a = [null, 1,2] как a in (1,2) or a is null

    // ["=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    //console.log(JSON.stringify(ast))
    var col = ast[0]
    var c = eval_lisp(col,_context)
    var resolveValue = function(v) {

      if (shouldQuote(col, v)) v = quoteLiteral(v)
      return eval_lisp(v,_context)
    }
    if (ast.length === 1) {
      return '1=1'
    } else if (ast.length === 2) {
      var v = resolveValue(ast[1])
      return v === null 
      ? `${c} IS NULL` 
      : `${c} = ${v}`
    } else {
      // check if we have null in the array of values...
      
      var resolvedV = ast.slice(1).map(el => resolveValue(el)).filter(el => el !== null)
      const hasNull = resolvedV.length < ast.length - 1;
      var ret = `${c} IN (${resolvedV.join(', ')})`
      if(hasNull) ret = `${ret} OR ${c} IS NULL`
      return ret
    }
  })


  _context['!='] = makeSF( (ast,ctx) => {
    // понимаем a != [null] как a is not null
    // a != [] просто пропускаем, А кстати почему собственно???
    // a != [null, 1,2] как a not in (1,2) and a is not null

    // ["!=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    //console.log(JSON.stringify(ast))
    var col = ast[0]
    var c = eval_lisp(col,_context)
    var resolveValue = function(v) {

      if (shouldQuote(col, v)) v = quoteLiteral(v)
      return eval_lisp(v,_context)
    }
    if (ast.length === 1) {
      return '1=1'
    } else if (ast.length === 2) {
      var v = resolveValue(ast[1])
      return v === null 
      ? `${c} IS NOT NULL` 
      : `${c} != ${v}`
    } else {
      // check if we have null in the array of values...
      
      var resolvedV = ast.slice(1).map(el => resolveValue(el)).filter(el => el !== null)
      const hasNull = resolvedV.length < ast.length - 1;
      var ret = `${c} NOT IN (${resolvedV.join(', ')})`
      if(hasNull) ret = `${ret} AND ${c} IS NOT NULL`
      return ret
    }
  })

  //console.log('CONTEXT!', _context['()'])
  return _ctx;
} 

function extend_context_for_order_by(_context, _cfg) {
  
  // создаём контекст с двумя макросами + и -, а они вызовут обычный контекст....
  // можно пробовать переопределить реализацию функции column и поиска литералов/алиасов
  // но пока что будет так 

  var aliasContext = [
    // 
    {
      "colref": makeSF((col) => {
        /* col[0] содержит ровно то, что было в изначальном конфиге на входе!
        */
          //console.log("NEW COLREF!!!:", JSON.stringify(col))
          if (col[0] in _cfg["_aliases"]) {
            return col[0]
          }
  
          var parts = col[0].split('.')
  
          if (parts.length === 3) {
            return `${parts[1]}.${parts[2]}`
            //return parts[2]
          } else {
            return col[0]
          }
  
  
          /*
          if (_context[0]["_columns"][key]) return _context["column"](key)
          if (_context[0]["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
          
        return col*/
      }),
      "column": makeSF((col) => {
      /* примерно на 222 строке есть обработчик-резолвер литералов, там хардкодный вызов функции 
        if (_context["_columns"][key]) return _context["column"](key)
        то есть вызывается функция column в явном виде, а тут мы просто печатаем, что нам прислали.

        FIXME: ИМЕЕТ смысл сделать функцию colref() и типа ссылаться на какой-то столбец.
        И тут мы можем умно резолвить имена столбцов и алиасы и подставлять то, что нам надо.
        ЛИБО объявить тут функцию как МАКРОС и тогда уже правильно отработать column
        NEW COL: ["ch.fot_out.dor1"]
        console.log("NEW COL", col)

        _context[0]["_columns"] содержит описания из БД
      */
        var parts = col[0].split('.')

        if (parts.length === 3) {
          return `${parts[1]}.${parts[2]}`
          //return parts[2]
        } else {
          return col[0]
        }


        /*
        if (_context[0]["_columns"][key]) return _context["column"](key)
        if (_context[0]["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
        
      return col*/
    })
    },
    ... _context
  ]

  var _ctx = {}
  _ctx["+"] = makeSF( (ast) => {
    return eval_lisp(ast[0], aliasContext)
  })

  _ctx["-"] = makeSF( (ast) => {
    return `${eval_lisp(ast[0], aliasContext)} DESC`
  })

  return _ctx;
}


  /* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
   Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
   Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !

   Также можно считать агрегаты на лету, но для этого требуется ИСКЛЮЧИТЬ memberALL из агрегирования!!!

   Для указанных явно дименшенов доп. условий не требуется, клиент сам должен задать фильтры и понимать последствия.
   В любом случае по group by столбцам не будет удвоения, memberAll будет явно представлен отдельно в результатах
  */

function  inject_all_member_filters(_cfg, columns) {
  /* _cfg.filters может быть {} а может быть [{},{}] и тут у нас дикий код */

  var processed = {}
  if (isHash(_cfg["filters"])){
    _cfg["filters"] = get_all_member_filters(_cfg, columns, _cfg["filters"]);
  } else if (isArray(_cfg["filters"])){
    _cfg["filters"] = _cfg["filters"].map(obj => get_all_member_filters(_cfg, columns, obj))
  }
  return _cfg;
}

function inject_parallel_hierarchy_filters(_cfg, columns) {
  /* _cfg.filters может быть {} а может быть [{},{}] и тут у нас дикий код */
  var processed = {}
  if (isHash(_cfg["filters"])){
    _cfg["filters"] = get_parallel_hierarchy_filters(_cfg, columns, _cfg["filters"]);
  } else if (isArray(_cfg["filters"])){
    _cfg["filters"] = _cfg["filters"].map(obj => get_parallel_hierarchy_filters(_cfg, columns, obj))
  }
  return _cfg;
}


function get_parallel_hierarchy_filters(_cfg, columns, _filters) {

//console.log("FILTERS", JSON.stringify(_filters))
//console.log("columns", JSON.stringify(columns))
  // Ищем dimensions, у которых тип parallel и они ещё не указаны в фильтрах
  // ПО ВСЕМ СТОЛБАМ!!!
  Object.values(columns).map(el => {
    if (isHash(el.config)) {
      // если это параллельный дименшн и нет явно фильтра по нему
      //if (el.config.hierarchyType === 'parallel' && !isArray(_filters[el.id])){
      // если есть значение по умолчанию, и не было явно указано фильтров, то ставим значение по умолчанию

      if (el.config.defaultValue !== undefined && !isArray(_filters[el.id])){
        _filters[el.id] = ["=",el.config.defaultValue]
      }
    }
  })
  return _filters;
}


/*
Если у нас есть group by, то используем memeberALL,

Потом, к тем фильтрам, которые получились, добавляем фильтры по столбцам, где есть ключ "hierarchy_type":"parallel"
и делаем фильтр "default_value", НО ТОЛЬКО ЕСЛИ В ЗАПРОСЕ НЕТУ КЛЮЧА "distinct": "force"

*/

function get_all_member_filters(_cfg, columns, _filters) {
  var processed = {} // лучше его использовать как аккумулятор для накопления ответа, это вам не Clojure!
  var h = {};
  // заполняем хэш h длинными именами столбцов, по которым явно есть GROUP BY
  _cfg["_group_by"].map(el => {
    el.columns.map(e => h[e] = true)
  })
//console.log("FILTERS", JSON.stringify(_filters))
//console.log("columns", JSON.stringify(columns))
  // Ищем dimensions, по которым явно указан memeber ALL, и которых НЕТ в нашем явном списке...
  // ПО ВСЕМ СТОЛБАМ!!!
  Object.values(columns).map(el => {
    if (h[el.id] === true) {
      return // столбец уже есть в списке group by!
    }
    if (isHash(el.config)) {
      // Если для столбца прописано в конфиге follow=[], и нашего столбца ещё нет в списке фильтров, то надо добавить фильтр
      if ( isArray(el.config.follow) && !isArray(_filters[el.id])) {
        for( let alt of el.config.follow) {
          // names should skip datasource
          let altId = `${_cfg.ds}.${alt}`
          //console.log(`###checking ${el.config.follow} ${altId}`, JSON.stringify(_filters[el.id]) )
          // По столбцу за которым мы следуем есть условие
          if (isArray(_filters[altId])) {
            if ((_filters[altId]).length == 2) {
              // у столбца описан memberAll
              if (columns[altId].config.memberALL === null || 
                  isString(columns[altId].config.memberALL) || 
                  isNumber(columns[altId].config.memberALL)
                ) {
                var f = _filters[altId];
                if (f[1]==columns[altId].config.memberALL) {
                  // Есть условие по столбцу, которому мы должны следовать, надо добавить такое же условие!
                  _filters[el.id] = [f[0],f[1]];
                  break;
                }
              }
            }
            // так как есть условие по основному столбцу, мы не знаем точно, какое наше значение ему соответствует, 
            // и чтобы не добавлялся memberALL ниже, мы пропускаем наш столбец
            return;
          }
        }
      }


      if (el.config.memberALL === null ||
         isString(el.config.memberALL) ||
         isNumber(el.config.memberALL)
         ) {
        // есть значение для члена ALL, и оно в виде строки или IS NULL
        // добавляем фильтр, но только если по этому столбцу нет другого фильтра (который задали в конфиге)!!!
        // NOTE: по ключу filters ещё не было нормализации !!! 

        if (!isArray(_filters[el.id])){
          // Также нужно проверить нет ли уже фильтра по столбцу, который является altId
          if ( isArray(el.config.altDimensions) ) {
            for( let alt of el.config.altDimensions) {
              // names must skip datasource, but may skip cube, let's add our cube if it is missed...
              let altId = ''
              if (alt.includes('.')) {
                altId = `${_cfg.ds}.${alt}`
              } else {
                altId = `${_cfg.ds}.${_cfg.cube}.${alt}`
              }
              //console.log("ALT", JSON.stringify(altId))
              if (isArray(_filters[altId]) || h[altId] === true) {
                // уже есть условие по столбцу из altId, не добавляем новое условие
                // но только в том случае, если у нас явно просят этот столбец в выдачу
                // if ( h[])
                return
              }
            }
          }
          //console.log(`!!!!checking  ${el.id} children`, JSON.stringify(el.config.children) )
          // Если есть дочерние столбцы, то надо проверить нет ли их в GROUP BY или В Фильтрах
          if ( isArray(el.config.children) ) {
            for( let alt of el.config.children) {
              let altId = ''
              if (alt.includes('.')) {
                altId = `${_cfg.ds}.${alt}`
              } else {
                altId = `${_cfg.ds}.${_cfg.cube}.${alt}`
              }
              if (isArray(_filters[altId]) || h[altId] === true) {
                // children уже специфицированы, не надо добавлять меня!
                return
              }
            }
          }
          _filters[el.id] = ["=",el.config.memberALL]
        }
      }
    }
  })
  //console.log("FILTERS AFTER", JSON.stringify(_filters))

  return _filters;
}

/* возвращает все или некоторые фильтры в виде массива
если указаны required_columns и negate == falsy, то возвращает фильтры, соответсвующие required_columns
если указаны required_columns и negate == trufy, то возвращает все, кроме указанных в required_columns фильтров
Это спец. функционал для апробации
*/
function get_filters_array(context, filters_array, cube, required_columns, negate) {

  var comparator = function(k) {
    return k !== ""
  }

  var second_time = false;
  if (isArray(required_columns) && required_columns.length > 0) {
    second_time = true; // for templates, which will process _cfg second time!!!
    required_columns = required_columns.map(el => cube + '.' + el)
    if (negate) {
      comparator = function(k) {
        return (k !== "") && !required_columns.includes(k)
      } 
    } else {
      comparator = function(k) {
        return (k !== "") && required_columns.includes(k)
      }
    }
  }

  var ret = filters_array.map(_filters => {
      var part_where = null
      var pw = Object.keys(_filters).filter(k => comparator(k)).map( 
        key => {
                  if (!second_time) {
                    var a = _filters[key].splice(1,0,["column",key])
                  }
                  return _filters[key]
                });
      // условия по пустому ключу "" подставляем только если у нас генерация полного условия WHERE,
      // а если это filter(col1,col2) то не надо
      if (required_columns === undefined || negate === true) {
        if (isArray(_filters[""])) {
          if (isArray(pw)){
            pw.push(_filters[""])
          } else {
            pw = _filters[""]
          }
        }
      }

      if (pw.length > 0) {
        var wh = ["and"].concat(pw)
        //console.log("WHERE", wh)        
        part_where = eval_lisp(wh, context)
      }
      return part_where
    }).filter(el => el !== null && el.length > 0)

  return ret
}

/* Добавляем ключ "_aliases", чтобы можно было легко найти столбец по алиасу */
function cache_alias_keys(_cfg) {
  /*
  "_columns":[{"columns":["ch.fot_out.dt"],"expr":"(NOW() - INERVAL '1 DAY')"},
   {"columns":["ch.fot_out.branch4"],"expr":"fot_out.branch4"},{"columns":[],"expr":"fot_out.ss1"},{"columns":
   ["ch.fot_out.v_main","ch.fot_out.v_rel_fzp"],"agg":true,"alias":"summa","expr":"sum((fot_out.v_main + utils.func(fot_out.v_rel_fzp)) / 100)"},
   {"columns":["ch.fot_out.obj_name"],"alias":"new","expr":"fot_out.obj_name"},{"columns":["ch.fot_out.v_rel_pp"],"agg":true,"expr":
   "sum(fot_out.v_rel_pp)"},{"columns":["ch.fot_out.indicator_v","ch.fot_out.v_main"],"agg":true,"alias":"new","expr":
   "avg(fot_out.indicator_v + fot_out.v_main)"}]
   */

  _cfg["_aliases"] = {}
  _cfg["_columns"].map( el => {
    var k = el["alias"]

    if (k && k.length > 0) {
      // включаем это в кэш
      if (_cfg["_aliases"][k]) {
        // EXCEPTION, duplicate aliases
        throw Error(`Duplicate alias ${k} for ${JSON.stringify(el)}`)
      }
      _cfg["_aliases"][k] = el
    } else {
      // SKIPPED, no Alias found !!!
    }
  })
  //console.log("######", JSON.stringify(_cfg))
  return _cfg

}


/* в _vars могут быть доп. настройки для контекста. Например объявленные переменные.
Вообще говоря это должен быть настоящий контекст! с помощью init_koob_context() мы дописываем в этот 
контекст новые ключи, типа _columns, _aliases и т.д. Снаружи мы можем получить доп. фильтры. в ключе
_access_filters
*/
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

  if (isHash(_vars["_data_source"]) && isString(_vars["_data_source"]["url"]) ) {
    var url = _vars["_data_source"]["url"]
    var matched = url.match(/^jdbc\:([^:]+)\:/)
    //console.log(`JSON DATA SOURCE URL MATCHED ${JSON.stringify(matched)}`)
    if (matched != null && matched.length > 1) {
      _context["_target_database"] = matched[1]
    } else {
      _context["_target_database"] = 'postgresql'
    }
  }

  var target_db_type = null
  if ( isString( _cfg["with"]) ) {
    var w = _cfg["with"]
    _context["_columns"] = reports_get_columns(w)
    _context["_aliases"] = {} // will be filled while we are parsing columns

    // это корректный префикс: "дс.перв"."куб.2"  так что тупой подсчёт точек не катит.
    if ( w.match( /^("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)$/) !== null ) {
      _cfg = normalize_koob_config(_cfg, w, _context);
      if ( _context["_target_database"] === undefined) {
        target_db_type = get_source_database(w.split('.')[0])
        _context["_target_database"] = target_db_type
      }
    } else {
      // это строка, но она не поддерживается, так как либо точек слишком много, либо они не там, либо их нет
      throw new Error(`Request contains with key, but it has the wrong format: ${w} Should be datasource.cube with exactly one dot in between.`)
    }
  } else {
    throw new Error(`Default cube must be specified in with key`)
  }

  _context = init_koob_context(_context, _cfg["ds"], _cfg["cube"])
  
  //console.log("NORMALIZED CONFIG FILTERS: ", JSON.stringify(_cfg))
  //console.log("NORMALIZED CONFIG COLUMNS: ", JSON.stringify(_cfg["columns"]))
  /*
    while we evaluating each column, koob_context will fill JSON structure in the context like this:
   {
     expr: "sum((fot.val3+fot.val1)/100) as summa",
     alias: "summa",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true
   }

   For window func clickhouse flavor we may get this inner/outer SQL:
  {
     expr: "runningAccumulate(mnt, (comp_code,gl_account)) as col1",
     alias: "col1",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true,
     window: true,
     inner_expr: "initializeAggregation('sumState',sum(s2.deb_cre_lc )) as mnt",
     inner_alias: 'mnt'

  } 
  */

  var columns_s = [];
  var columns = _cfg["columns"].map(el => {
                                      // eval should fill in _context[0]["_result"] object
                                      // hackers way to get results!!!!
                                      _context[0]["_result"] = {"columns":[]}
                                      var r = eval_lisp(el, _context)
                                      var col = _context[0]["_result"]
                                      columns_s.push(col)
                                      if (col["alias"]) {
                                        _context[0]["_aliases"][col["alias"]] = col
                                      }
                                      //FIXME: we should have nested settings for inner/outer 
                                      // Hope aliases will not collide!
                                      if (col["outer_alias"]) {
                                        _context[0]["_aliases"][col["outer_alias"]] = col
                                      }

                                      return r})
  _context[0]["_result"] = null
  _cfg["_aliases"] = _context[0]["_aliases"]

  //console.log("ALIASES" + JSON.stringify(_cfg["_aliases"]))
  var has_window = null
  for (var i=0; i<columns.length; i++){
    columns_s[i]["expr"] = columns[i]
    if (!has_window && columns_s[i]["window"]) {
      //FIXME: for now store here usefull info about order by !!!
      // it will be used later on the SQL generation stage
      has_window = columns_s[i]["inner_order_by_excl"]
    }
  }

  for (var i=0; i<columns_s.length; i++){
    // Also, try to resolve unresolved aliases
    //console.log("ITER0 " + JSON.stringify(columns_s[i]))
    if (isArray(columns_s[i]["unresolved_aliases"])) {
      for (var al of columns_s[i]["unresolved_aliases"]) {
        var col = _cfg["_aliases"][al]
        //console.log("ITER1 " + JSON.stringify(col))
        if (col) {
          if ( col.agg ) {
            // we have alias to the agg func, do the magic
            columns_s[i]["agg"] = true
            columns_s[i]["outer_expr"] = columns_s[i]["expr"] // so we can skip it in the inner select...
            columns_s[i]["expr"] = null
            break
          }
        }
      }
    }
  }

  // try to make transitive agg
  // FIXME: try to resolve full column names as well!
  for (var el of columns_s){
    if (el["agg"] !== true){
      for (var al of el["columns"]) {
        var col = _cfg["_aliases"][al]
        if (col) {
          if ( col.agg ) {
            el["agg"] = true
            break
          }
        }
      }
    }
  }

  // ищем кандидатов для GROUP BY и заполняем оригинальную структуру служебными полями
  _cfg["_group_by"] = []
  _cfg["_measures"] = []
  columns_s.map(el => 
    (el["agg"] === true)
       ? _cfg["_measures"].push(el) 
       : _cfg["_group_by"].push(el))
  _cfg["_columns"] = columns_s

  //console.log("RES ", JSON.stringify(_cfg["_columns"]))

  if (_cfg["_measures"].length === 0) {
    // do not group if we have no aggregates !!!
    _cfg["_group_by"] = []
  }
  //console.log("GBY ", JSON.stringify(_cfg["_group_by"]))

  /* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
   Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
   Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !

   Для указанных явно дименшенов доп. условий не требуется, клиент сам будет разбираться с результатом
  */


  var cube_query_template = reports_get_table_sql(target_db_type, `${_cfg["ds"]}.${_cfg["cube"]}`)

  /* Если есть хотя бы один явный столбец group_by, а иначе, если просто считаем агрегаты по всей таблице без группировки по столбцам */
  
  if (_cfg["options"].includes('!MemberALL') === false && (_cfg["_group_by"].length > 0 || _cfg["_measures"].length > 0)) {
    _cfg = inject_all_member_filters(_cfg, _context[0]["_columns"])
  }

  if (_cfg["options"].includes('!ParallelHierarchyFilters') === false) {
    _cfg = inject_parallel_hierarchy_filters(_cfg, _context[0]["_columns"])
  }

  // at this point we will have something like this:
  /*
   {"ds":"ch",
   "cube":"fot_out",
   "filters":{"ch.fot_out.dor1":["=","ГОРЬК"],"ch.fot_out.dor2":["=","ПОДГОРЬК"],"ch.fot_out.dor4":["=",null],
   "ch.fot_out.dor5":["=",null],"ch.fot_out.dt":["BETWEEN","2020-01","2020-12"],"ch.fot_out.sex_name":["=","Мужской"],"ch.fot_out.pay_name":
   ["=",null]},
   "having":{"ch.fot_out.dt":[">","2020-08"]},
   "columns":[["column","ch.fot_out.dt"],["column","ch.fot_out.branch4"],
   ["column","fot_out.ss1"],[":",["sum",["/",["()",["+","v_main",["->","utils",["func","v_rel_fzp"]]]],100]],"summa"],[":",
   ["column","ch.fot_out.obj_name"],"new"],["sum",["column","v_rel_pp"]],[":",["avg",["+",["column","ch.fot_out.indicator_v"],["column","v_main"]]],
   "new"]],"sort":[["-",["column","ch.fot_out.dor1"]],["+",["column","val1"]],["-",["column","val2"]],["-",["column","czt.fot.dor2"]],
   ["+",["column","summa"]]],
   "_group_by":[{"columns":["ch.fot_out.dt"],"expr":"(NOW() - INERVAL '1 DAY')"},{"columns":["ch.fot_out.branch4"],
   "expr":"fot_out.branch4"},{"columns":[],"expr":"fot_out.ss1"},{"columns":["ch.fot_out.obj_name"],"alias":"new","expr":"fot_out.obj_name"}],
   "_measures":[{"columns":["ch.fot_out.v_main","ch.fot_out.v_rel_fzp"],"agg":true,"alias":"summa","expr":
   "sum((fot_out.v_main + utils.func(fot_out.v_rel_fzp)) / 100)"},{"columns":["ch.fot_out.v_rel_pp"],"agg":true,"expr":
   "sum(fot_out.v_rel_pp)"},{"columns":["ch.fot_out.indicator_v","ch.fot_out.v_main"],"agg":true,"alias":"new","expr":
   "avg(fot_out.indicator_v + fot_out.v_main)"}],
   "_columns":[{"columns":["ch.fot_out.dt"],"expr":"(NOW() - INERVAL '1 DAY')"},
   {"columns":["ch.fot_out.branch4"],"expr":"fot_out.branch4"},{"columns":[],"expr":"fot_out.ss1"},{"columns":
   ["ch.fot_out.v_main","ch.fot_out.v_rel_fzp"],"agg":true,"alias":"summa","expr":"sum((fot_out.v_main + utils.func(fot_out.v_rel_fzp)) / 100)"},
   {"columns":["ch.fot_out.obj_name"],"alias":"new","expr":"fot_out.obj_name"},{"columns":["ch.fot_out.v_rel_pp"],"agg":true,"expr":
   "sum(fot_out.v_rel_pp)"},{"columns":["ch.fot_out.indicator_v","ch.fot_out.v_main"],"agg":true,"alias":"new","expr":
   "avg(fot_out.indicator_v + fot_out.v_main)"}]}
  */

  // we populate it dynamically now!
  //_cfg = cache_alias_keys(_cfg)
  
  // let's get SQL from it! BUT what about window functions ???

  if (has_window) {
    if (_context[0]["_target_database"] != 'clickhouse'){
      throw Error(`No Window functions support for flavor: ${_context[0]["_target_database"]}`)
    }
    // Try to replace column func to return short names!
    _context[0]["column"] = function(col) {
      // считаем, что сюда приходят только полностью резолвенные имена с двумя точками...
      var c = _context[0]["_columns"][col]
      if (c) {
        var parts = col.split('.')
        if (parts[2].localeCompare(c.sql_query, undefined, { sensitivity: 'accent' }) === 0 ) {
          // we have just column name, prepend table alias !
          return `${c.sql_query}`
          //return `${parts[1]}.${c.sql_query}`
        } else {
          return `(${c.sql_query})`
        }
      }
      //console.log("COL FAIL", col)
      // возможно кто-то вызовет нас с коротким именем - нужно знать дефолт куб!!!
      //if (_context["_columns"][default_ds][default_cube][key]) return `${default_cube}.${key}`;
      return col;
    }
  }  

  var where = '';
  var part_where = '1=1';

  var filters_array = _cfg["filters"];
  if (isHash(filters_array)) {
    filters_array = [filters_array]
  }

  //_context[0]["column"] - это функция для резолва столбца в его текстовое представление
  filters_array = get_filters_array(_context, filters_array, '');

  // access filters
  var filters = _context[0]["_access_filters"]
  var ast = []
  //console.log("WHERE access filters: ", JSON.stringify(filters))
  if (isString(filters) && filters.length > 0) {
    var ast = parse(`expr(${filters})`)
    ast.splice(0, 1, '()') // replace expr with ()
  } else if (isArray(filters) && filters.length > 0){
    if (filters[0] === 'expr') {
      filters[0] = '()'
      ast = filters
    } else if (filters[0] !== '()') {
      ast = ['()',filters]
    }
  } else {
    //warning
    //console.log('Access filters are missed.')
  }
  //console.log("WHERE access filters AST", JSON.stringify(ast))

  var access_where = ''
  if (ast.length > 0) { // array
    access_where = eval_lisp(ast, _context)
  }

  var fw = ''
  if (filters_array.length == 1){
    fw = filters_array[0]
  } else if (filters_array.length > 1){
    fw = `(${filters_array.join(")\n   OR (")})`
  }

  if (fw.length > 0) {
    if (access_where.length > 0) {
      fw = `(${fw})\n   AND\n   ${access_where}`
    }
  } else {
    if (access_where.length > 0) {
      fw = access_where
    }
  }

  if (fw.length > 0) {
    where = `\nWHERE ${fw}`
    part_where = fw
  }
  
  

  var group_by = _cfg["_group_by"].map(el => el.expr)

  // нужно дополнить контекст для +,- и суметь сослатся на алиасы!
  var order_by_context = extend_context_for_order_by(_context, _cfg)
  //console.log("SORT:", JSON.stringify(_cfg["sort"]))
  var order_by = _cfg["sort"].map(el => eval_lisp(el, order_by_context))

  //console.log("SQL:", JSON.stringify(cube_query_template))
  var from = cube_query_template.query

  // FIXME: USE FLAVORS FOR Oracle & MS SQL
  var limit = isNumber(_cfg["limit"]) ? ` LIMIT ${_cfg["limit"]}` : ''
  var offset = isNumber(_cfg["offset"]) ? ` OFFSET ${_cfg["offset"]}` : ''

  var ending = ''
  if (_context[0]["_target_database"] === 'clickhouse'){
    ending = "\nSETTINGS max_threads = 1"
  }

  var expand_outer_expr = function(el) {
    if (el["eval_expr"]===true) {
      //console.log("FOUND EVAL", JSON.stringify(el))
      // only one kind of expressions for now...
      // {"lpe_totals":{
      // "lpe_total_2":{"ast":["avg","v_rel_pp"],"expr":"avg(fot_out.v_rel_pp)"}}
      var expr = el.expr;
      for (var total in el.lpe_subtotals) {
        var hash = el.lpe_subtotals[total]
        expr = expr.replace(`${total}()`, `(SELECT ${hash["expr"]} FROM ${from}${where})`)
      }
      return expr;
    } else {
      return el.expr
    }
  }

  if (has_window) {
    // assuming we are working for clickhouse only....
    // we should generate correct order_by, even though each window func may require it's own order by
    // FIXME: we use only ONE SUCH FUNC FOR NOW, IGNORING ALL OTHERS

    // skip all columns which are references to window funcs!
    var innerSelect = "SELECT "
    // могут быть ньюансы квотации столбцов, обозначения AS и т.д. поэтому каждый участок приводим к LPE и вызываем SQLPE функции с адаптацией под конкретные базы
    innerSelect = innerSelect.concat(_cfg["_columns"].map(el => {
      //console.log('1: ' + JSON.stringify(el) + " alias:" + el.alias)
      if (el.expr === null) {
        return null
      }
      if (el.alias){
        for (var part of el.columns) {
          //console.log('2 part:' + part)
          // if we reference some known alias
          var target = _cfg["_aliases"][part]
          if (target && target.window) {
            // if we reference window function, skip such column from inner select!
            return null;
          }
        }
        return quot_as_expression(_context[0]["_target_database"], el.expr, el.alias)
      } else {
        if (el.columns.length === 1) {
          var parts = el.columns[0].split('.')
          return quot_as_expression(_context[0]["_target_database"], el.expr, parts[2])
        }
        return el.expr
      } 
    }).filter(el=> el !== null).join(', '))

    var expand_column = (col) => {
      var cube_prefix = `${_cfg["ds"]}.${_cfg["cube"]}`
      return col.match(/("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)/) === null
        ? (_context[0]._columns[`${cube_prefix}.${col}`] ? `${_cfg["cube"]}.${col}` : col )
        : col
    }
    var excl_col = expand_column(has_window)
    //console.log(`${_cfg["ds"]}.${_cfg["cube"]}` + " EXPANDING " + has_window + " to " + excl_col)
    //console.log(JSON.stringify(_context[0]["_columns"]))

    // Put excl_col to the last position, so running window will accumulate data over it!


    var inner_order_by = []
    if (group_by.find(el => el === excl_col)) {
      inner_order_by = group_by.filter(el => el !== excl_col).concat(excl_col)
    }

    

    inner_order_by = inner_order_by.length ? "\nORDER BY ".concat(inner_order_by.join(', ')) : ''

    var having = where.replace("WHERE","HAVING")

    var inner_group_by = group_by.length ? "\nGROUP BY ".concat(group_by.join(', ')) : ''
    var inner = `${innerSelect}\nFROM ${from}${inner_group_by}${having}${inner_order_by}`

    // NOW WE NEED OUTER !

    function get_outer_expr(el) {
      if (el.outer_expr) {
        if (el.outer_expr_eval) {
          if (el.eval_reference_to) {
            // resolve_reference!!
            var init = _cfg["_aliases"][el.eval_reference_to]
            return el.outer_expr.replace('resolve_alias()', init["alias"])
          } else {
            // FIXME, currently we just do simple replace! love LISP: do eval!!!
            var part_columns = group_by.filter( el => el != excl_col)
            part_columns = part_columns.length ? part_columns.map(el=>{
                var p = el.split('.')
                return p[p.length-1]
                }).join(', ') : ''
            if (part_columns === '') {
              part_columns = 'tuple(null)'
            } else {
              part_columns = `(${part_columns})`
            }
            return el.outer_expr.replace('partition_columns()', part_columns)
          }
        } else {
          var parts = el.outer_expr.match(/^("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)$/)
          if (parts) {
            return parts[2]
          }
          return el.outer_expr
        }
      } else {
        // FIXME: stupid Javascript IF
        if ((el.agg === true) && (el.outerVerbatim !== true)) {
          // try to just use alias or column name!!!
          //console.log("DEPARSE " + JSON.stringify(el))
          if (el.alias) {
            return el.alias
          } else {
            var parts = el.columns[0].match(/^("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)$/)
            if (parts) {
              return parts[3]
            }
          }
        } else {
          var parts = el.expr.match(/^("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)$/)
          if (parts) {
            return parts[2]
          }
        }
        return el.expr
      }
    }

    var select = isArray(_cfg["distinct"]) ? "SELECT DISTINCT " : "SELECT "
    select = select.concat(_cfg["_columns"].map(el => {
      //console.log('outer1: ' + JSON.stringify(el) + " alias:" + el.alias)
      if (el.outer_alias) {
          return quot_as_expression(_context[0]["_target_database"], get_outer_expr(el), el.outer_alias)
      } else if (el.alias) {
          return quot_as_expression(_context[0]["_target_database"], get_outer_expr(el), el.alias)
      } else {
        if (el.columns.length === 1) {
          var parts = el.columns[0].match(/^("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)\.("[^"]+"|[A-Za-z_][\w]*)$/)
          //console.log(`outer2: ${get_outer_expr(el)}` + JSON.stringify(parts))
          if (parts) {
            return quot_as_expression(_context[0]["_target_database"], get_outer_expr(el), parts[3])
          }
          return `${get_outer_expr(el)}`
        }
        return `${get_outer_expr(el)}`
      } 
    }).filter(el=> el !== null).join(', '))

    order_by = order_by.length ? "\nORDER BY ".concat(order_by.join(', ')) : ''
    return `${select}\nFROM (\n${inner}\n)${order_by}${limit}${offset}${ending}`
  } else {
    var select = isArray(_cfg["distinct"]) ? "SELECT DISTINCT " : "SELECT "
    // могут быть ньюансы квотации столбцов, обозначения AS и т.д. поэтому каждый участок приводим к LPE и вызываем SQLPE функции с адаптацией под конкретные базы
    select = select.concat(_cfg["_columns"].map(el => {

      // It is only to support dictionaries for Clickhouse!!!
      // FIXME: switch to stacked SELECT idea
      if (el.outer_alias) {
        el.alias = el.outer_alias
      }

      if (el.outer_expr) {
        el.expr = el.outer_expr
      }
      /////////////////////////////////////////////////////
      //console.log("COLUMN:", JSON.stringify(el))
      if (el.alias){
        return quot_as_expression(_context[0]["_target_database"], expand_outer_expr(el), el.alias)
      } else {
        if (el.columns.length === 1) {
          var parts = el.columns[0].split('.')
          return quot_as_expression(_context[0]["_target_database"], expand_outer_expr(el), parts[2])
        }
        return expand_outer_expr(el)
      } 
    }).join(', '))

    order_by = order_by.length ? "\nORDER BY ".concat(order_by.join(', ')) : ''

    if (group_by.length == 0) {
      group_by = ''
    } else {
      if (_cfg["subtotals"] === 'cube') {
        if (_context[0]["_target_database"]==='clickhouse') {
          group_by =`\nGROUP BY ${group_by.join(', ')} WITH CUBE`
        } else {
          // postgresql
          group_by =`\nGROUP BY CUBE (${group_by.join(', ')})`
        }

      } else {
        group_by ="\nGROUP BY ".concat(group_by.join(', '))
      }
    }

    var final_sql = ''
    if (cube_query_template.config.is_template) {
      // надо подставить WHERE аккуратно, это уже посчитано, заменяем ${filters} и ${filters()}
      var re = /\$\{filters(?:\(\))?\}/gi;
      var processed_from = from.replace(re, part_where);


      // access_filters
      if (access_where.length == 0) {
        access_where = '1=1'
      }
      var re = /\$\{access_filters(?:\(\))?\}/gi;
      var processed_from = processed_from.replace(re, access_where);

      // ищем except()
      re = /\$\{filters\(except\(([^\)]*)\)\)\}/gi
      
      function except_replacer(match, columns_text, offset, string) {
        var columns = columns_text.split(',')
        var filters_array = _cfg["filters"];
        if (isHash(filters_array)) {
          filters_array = [filters_array]
        } else {
          throw new Error(`Can not split OR SQL WHERE into template parts filters(except(...))). Sorry.`)
        }
        //console.log(JSON.stringify(_cfg["filters"]))
        var subst = get_filters_array(_context, filters_array, _cfg.ds + '.' + _cfg.cube, columns, true)
        if (subst.length == 0) {
          return "1=1"
        }
        return subst;
      }
      processed_from = processed_from.replace(re, except_replacer);

      // ищем filters(a,v,c)
      // FIXME: не делаем access_filters :()
      re = /\$\{filters\(([^\)]+)\)\}/gi
      
      function inclusive_replacer(match, columns_text, offset, string) {
        var columns = columns_text.split(',')
        var filters_array = _cfg["filters"];
        if (isHash(filters_array)) {
          filters_array = [filters_array]
        } else {
          throw new Error(`Can not split OR SQL WHERE into template parts filters(...). Sorry.`)
        }
        //console.log(JSON.stringify(_cfg["filters"]))
        var subst = get_filters_array(_context, filters_array, _cfg.ds + '.' + _cfg.cube, columns, false)
        if (subst.length == 0) {
          return "1=1"
        }
        return subst;
      }
      processed_from = processed_from.replace(re, inclusive_replacer);
       
      final_sql = `${select}\nFROM ${processed_from}${group_by}${order_by}${limit}${offset}${ending}`
    } else {
      final_sql = `${select}\nFROM ${from}${where}${group_by}${order_by}${limit}${offset}${ending}`
    }

    if (_cfg["return"] === "count") {
      if (_context[0]["_target_database"] === 'clickhouse'){
        final_sql = `select toUInt32(count(300)) as count from (${final_sql})`
      } else {
        final_sql = `select count(300) as count from (${final_sql})`
      }
    }
    return final_sql
  }

}
