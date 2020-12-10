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
  var ret = {"ds":ds, "cube":cube, "filters":{}, "having":{}, "columns":[], "sort": [], "limit": _cfg["limit"], "offset": _cfg["offset"]}
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
  }

  // для фильтров заменяем ключи на полные имена, но у нас может быть массив [{},{}]
  if (isArray(_cfg["filters"])) {
    var processed = _cfg["filters"].map(obj => {
        var result = {}
        if (isHash(obj)) {
          Object.keys(obj).filter(k => k !== "").map( 
              key => {result[expand_column(key)] = obj[key]})
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
      //console.log(`WANT to resolve ${key}`, JSON.stringify(resolveOptions));
      // вызываем функцию column(ПолноеИмяСтолбца) если нашли столбец в дефолтном кубе
      if (_context["_columns"][key]) return _context["column"](key)
      if (_context["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
      
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
      var parts = col.split('.')
      if (c.sql_query.match( /^\S+$/ ) === null) {
        // we have whitespace here, so it is complex expression :-()
        return `(${c.sql_query})`
      } else {
        // we have just column name, prepend table alias !
        return `${parts[1]}.${parts[2]}`
      }
    }
    //console.log("COL FAIL", col)
    // возможно кто-то вызовет нас с коротким именем - нужно знать дефолт куб!!!
    //if (_context["_columns"][default_ds][default_cube][key]) return `${default_cube}.${key}`;
    return col;
  }

  // сюда должны попадать только хитрые варианты вызова функций с указанием схемы типа utils.smap()
  _context["->"] = function() {
    var a = Array.prototype.slice.call(arguments);
    //console.log("-> !" , JSON.stringify(a))
    return a.map(el => isArray(el) ? eval_lisp(el, _ctx) : el).join('.');
  }
  _context['->'].ast = [[],{},[],1]; // mark as macro

  _context[':'] = function(o, n) {
    //var a = Array.prototype.slice.call(arguments);
    //console.log(":   " + JSON.stringify(o));
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

  _context['and'] = function() {
    var a = Array.prototype.slice.call(arguments)
    return `(${a.join(') AND (')})`
  }

  _context['or'] = function() {
    var a = Array.prototype.slice.call(arguments)
    return `(${a.join(') OR (')})`
  }


  // overwrite STDLIB! or we will treat (a = 'null') as (a = null) which is wrong in SQL !
  _context['null'] = 'null'
  _context['true'] = 'true'
  _context['false'] = 'false'

  _context["ql"] = function(el) {
    // NULL values should not be quoted
    return el === null ? null : db_quote_literal(el)
  }

  _context['between'] = function(col, var1, var2) {
    if (shouldQuote(col,var1)) var1 = quoteLiteral(var1)
    if (shouldQuote(col,var2)) var2 = quoteLiteral(var2)

    return `${eval_lisp(col,_context)} BETWEEN ${eval_lisp(var1,_context)} AND ${eval_lisp(var2,_context)}`
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



  _context['='] = makeSF( (ast,ctx) => {
    // понимаем a = [null] как a is null
    // a = [] просто пропускаем, А кстати почему собственно???
    // a = [null, 1,2] как a in (1,2) or a is null

    // ["=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    console.log(JSON.stringify(ast))
    var col = ast[0]
    var c = eval_lisp(col,_context)
    var resolveValue = function(v) {

      if (shouldQuote(col, v)) v = quoteLiteral(v)
      return eval_lisp(v,_context)
    }
    if (ast.length === 1) {
      return 'TRUE'
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
    console.log(JSON.stringify(ast))
    var col = ast[0]
    var c = eval_lisp(col,_context)
    var resolveValue = function(v) {

      if (shouldQuote(col, v)) v = quoteLiteral(v)
      return eval_lisp(v,_context)
    }
    if (ast.length === 1) {
      return 'TRUE'
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
  
  return _ctx;
} 

function extend_context_for_order_by(_context, _cfg) {
  
  // создаём контекст с двумя макросами + и -, а они вызовут обычный контекст....
  // можно пробовать переопределить реализацию функции column и поиска литералов/алиасов
  // но пока что будет так 

  var aliasContext = [
    // 
    {
      "column": makeSF((col) => {
      /* примерно на 222 строке есть обработчик-резолвер литералов, там хардкодный вызов функции 
        if (_context["_columns"][key]) return _context["column"](key)
        то есть вызывается функция column в явном виде, а тут мы просто печатаем, что нам прислали.

        FIXME: ИМЕЕТ смысл сделать функцию colref() и типа ссылаться на какой-то столбец.
        И тут мы можем умно резолвить имена столбцов и алиасы и подставлять то, что нам надо.
        ЛИБО объявить тут функцию как МАКРОС и тогда уже правильно отработать column
        NEW COL: ["ch.fot_out.dor1"]
        console.log("NEW COLUMN", col)
      */
        //console.log("NEW COL:", JSON.stringify(col))
        var parts = col[0].split('.')
        if (parts.length === 3) {
          return `${parts[1]}.${parts[2]}`
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

   Также можно считать ашрегаты на лету, но для этого требуется ИСКЛЮЧИТЬ memberALL из агрегирования!!!

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



function get_all_member_filters(_cfg, columns, _filters) {
  var processed = {} // лучше его использовать как аккумулятор для накопления ответа, это вам не Clojure!
  var h = {};
  // заполняем хэш h длинными именами столбцов, по которым явно есть GROUP BY
  _cfg["_group_by"].map(el => {
    el.columns.map(e => h[e] = true)
  })
console.log("FILTERS", JSON.stringify(_filters))
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
          console.log(`###checking ${el.config.follow} ${altId}`, JSON.stringify(_filters[el.id]) )
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
              console.log("ALT", JSON.stringify(altId))
              if (isArray(_filters[altId]) || h[altId] === true) {
                // уже есть условие по столбцу из altId, не добавляем новое условие
                // но только в том случае, если у нас явно просят этот столбец в выдачу
                // if ( h[])
                return
              }
            }
          }
          console.log(`!!!!checking  ${el.id} children`, JSON.stringify(el.config.children) )
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
  console.log("FILTERS AFTER", JSON.stringify(_filters))

  return _filters;
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
  var target_db_type = null
  if ( isString( _cfg["with"]) ) {
    var w = _cfg["with"]
    _context["_columns"] = reports_get_columns(w)

    // это корректный префикс: "дс.перв"."куб.2"  так что тупой подсчёт точек не катит.
    if ( w.match( /^("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)$/) !== null ) {
      _cfg = normalize_koob_config(_cfg, w, _context);
      target_db_type = get_source_database(w.split('.')[0])
      _context["_target_database"] = target_db_type
    } else {
      // это строка, но она не поддерживается, так как либо точек слишком много, либо они не там, либо их нет
      throw new Error(`Request contains with key, but it has the wrong format: ${w} Should be datasource.cube with exactly one dot in between.`)
    }
  } else {
    throw new Error(`Default cube must be specified in with key`)
  }

  _context = init_koob_context(_context, _cfg["ds"], _cfg["cube"])
  
  console.log("NORMALIZED CONFIG: ", JSON.stringify(_cfg["filters"]))

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

  //console.log("RES ", JSON.stringify(columns_s))

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
  if (_cfg["_group_by"].length > 0) {
    _cfg = inject_all_member_filters(_cfg, _context[0]["_columns"])
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
  
  // let's get SQL from it!
  var select = isArray(_cfg["distinct"]) ? "SELECT DISTINCT " : "SELECT "
  // могут быть ньюансы квотации столбцов, обозначения AS и т.д. поэтому каждый участок приводим к LPE и вызываем SQLPE функции с адаптацией под конкретные базы
  select = select.concat(_cfg["_columns"].map(el => {
    if (el.alias){
      return `${el.expr} AS ${el.alias}`
    } else {
      if (el.columns.length === 1) {
        var parts = el.columns[0].split('.')
        return `${el.expr} AS ${parts[2]}`
      }
      return el.expr
    } 
  }).join(', '))
  

  var where = '';
  var filters_array = _cfg["filters"];
  if (isHash(filters_array)) {
    filters_array = [filters_array]
  }
  filters_array = filters_array.map(_filters => {
      var part_where = null
      var pw = Object.keys(_filters).filter(k => k !== "").map( 
        key => {
                  var a = _filters[key].splice(1,0,["column",key])
                  return _filters[key]
                });

      if (pw.length > 0) {
        var wh = ["and"].concat(pw)

        //console.log("WHERE", JSON.stringify(wh))
        part_where = eval_lisp(wh, _context)
      }
      return part_where
  }).filter(el => el !== null && el.length > 0)

  if (filters_array.length == 1){
    where = "\nWHERE ".concat( filters_array[0] )
  } else if (filters_array.length > 1){
    where = "\nWHERE ".concat( `(${filters_array.join(")\n   OR (")})` )
  }
  
  

  var group_by = _cfg["_group_by"].map(el => el.expr).join(', ')
  group_by = group_by ? "\nGROUP BY ".concat(group_by) : ''

  // нужно дополнить контекст для +,- и суметь сослатья на алиасы!
  var order_by_context = extend_context_for_order_by(_context, _cfg)
  //console.log("SORT:", JSON.stringify(_cfg["sort"]))
  var order_by = _cfg["sort"].map(el => eval_lisp(el, order_by_context)).join(', ')
  order_by = order_by ? "\nORDER BY ".concat(order_by) : ''

  var from = reports_get_table_sql(target_db_type, `${_cfg["ds"]}.${_cfg["cube"]}`)

  return `${select}\nFROM ${from}${where}${group_by}${order_by}`;

}
