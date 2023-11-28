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
import {parse} from './lpep';
import {db_quote_literal, db_quote_ident, get_data_source_info} from './utils/utils';
import {eval_lisp, isString, isArray, isNumber, makeSF} from './lisp';

/*
where - всегда возвращает слово WHERE, а потом условия. На пустом входе вернёт WHERE TRUE
filter - на пустом входе вернёт пустую строку
*/

export function sql_where_context(_vars) {

  // для отслеживания переменных, значения которых отсутствуют для cond
  // cond('col in $(row.var)', [])
  var track_undefined_values_for_cond = [];

  // try to get datasource Ident
  // table lookup queries should be sending us key named sourceId = historical name!
  var srcIdent = _vars["sourceId"]
  if (srcIdent !== undefined) {
    let ds_info = get_data_source_info(srcIdent)
    _vars["_target_database"] = ds_info["flavor"]
  }

  var _context = _vars;

  var try_to_quote_column = function(colname) {
    if (typeof _vars['_columns'] == 'object') {
      var h = _vars['_columns'][colname];
      if (typeof h == "object") {
        h = h['name'].toString();
        // console.log("-: try_to_quote_column " + JSON.stringify(h));
        // console.log("-: try_to_quote_column " + (typeof h));
        if (h.length > 0) {
          // return '"' + h + '"';
          return h;
        }
      }
    }
    return colname.toString();
  };

  var try_to_quote_order_by_column = function(colname) {
    var res = colname.toString();
    if (typeof _vars['_columns'] == 'object') {
      var h = _vars['_columns'][colname];
      if (typeof h == "object") {
        var o = h['order'];
        if (o === undefined) {
          o = h['name'];
        }
        //console.log("-: try_to_quote_order_by_column " + JSON.stringify(o));
        //console.log("-: try_to_quote_order_by_column " + (typeof o));
        if (o !== undefined && o.length > 0) {
          o = o.toString();
          var regExp = new RegExp(/^\w[\w\d]*$/, "i");
          // quote only literals that are not standard!
          var schema_table = o.split('.');
          if (schema_table.length < 4) {
            res = schema_table.map( item => regExp.test(item) ? item : db_quote_ident(item) ).join('.');
          } else {
            throw new Error('Too many dots for column name ' + o);
          }
        }
      }
    }

    return res;
    
  };

  var resolve_literal = function(lit) {
    //console.log('LITERAL ', lit, '  CONTEXT:', _vars[lit]);
    if (_vars[lit] == undefined ) {
      return try_to_quote_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return eval_lisp(lit, _vars);
    }
  };

  var resolve_order_by_literal = function(lit) {
    //console.log('OB LITERAL ', lit, ' CONTEXT:', _vars[lit]);

    if (_vars[lit] === undefined ) {
      return try_to_quote_order_by_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return eval_lisp(lit, _vars);
    }
  };

  /* заполняем контекст функциями и макросами, заточенными на SQL */
  _context['order_by'] = function () {
    var ret = [];
    var ctx = {};

    var get_extra_order = function(colname){
      if (typeof _vars['_columns'] == 'object') {
        var h = _vars['_columns'][colname];
        if (typeof h == "object") {
          var o = h['order_extra'];
          if (o !== undefined) {
            return ` ${o}`;
          }
        }
      }
      return "";
    }

    for(var key in _vars) ctx[key] = _vars[key];
    // так как order_by будет выполнять eval_lisp, когда встретит имя столба с минусом -a, то мы
    // с помощью макросов + и - в этом случае перехватим вызов и сделаем обработку.
    // а вот когда работает обработчик аргументов where - там eval_lisp почти никогда не вызывается...
    ctx['+'] = function (a) {
      return resolve_order_by_literal(eval_lisp(a, _vars)) + get_extra_order(a);
    }
    ctx['+'].ast = [[],{},[],1]; // mark as macro

    ctx['-'] = function (a) {
      return resolve_order_by_literal(eval_lisp(a, _vars)) + ' DESC' + get_extra_order(a);
    }
    ctx['-'].ast = [[],{},[],1]; // mark as macro

    // вот так будет работать: order_by(-short_tp,y)
    // Но у нас может быть ситуация, когда мы столбцы для сотрировки передали в массиве _vars["sort"] 
    // Это koob lookup
    // поэтому делаем разбор этого массива и дописываем аргументы
    // что-то похожее делается прямо в  function eval_sql_where, но там проверяется что _vars["sort"] = строка.
    let args = Array.prototype.slice.call(arguments)
    if (isArray(_vars["sort"])) {
      var extra_args = _vars["sort"].map(el => parse(el))
      args = args.concat(extra_args)
    }

    for(var i = 0; i < args.length; i++) {
      //console.log(`step ${i} ${JSON.stringify(args[i])}`)
        if (args[i] instanceof Array) {
          ret.push(eval_lisp(args[i], ctx) );
        } else {
          // try_to_quote_column берёт текст в двойные кавычки для известных столбцов!!!
          var a = args[i].toString();
          ret.push(resolve_order_by_literal(a) + get_extra_order(a));
        }
    }

    if (ret.length > 0) {
      return 'ORDER BY ' + ret.join(',');
    } else {
      return '';
    }
  };

  _context['order_by'].ast = [[],{},[],1]; // mark as macro

  _context['lpe_pg_tstz_at_time_zone'] = function (timestamp, zone) {
    // FIXME: check quotes !!!
    if (/'/.test(timestamp)) {
      throw('Wrong timestamp: ' + JSON.stringify(timestamp));
    }
    //console.log("lpe_pg_tstz_at_time_zone" + timestamp);
    return "'" + timestamp + "'" + "::timestamptz at time zone '" + zone + "'";
  }

  _context['pg_interval'] = function (cnt, period_type) {
    var pt;
    if (period_type instanceof Object) {
      pt = period_type["unit"];
    } else {
      pt = period_type;
    }

    if (/^\d+$/.test(pt)) {
      // all numbers....
      switch(pt){
        case 1: pt = 'second'; break;
        case 2: pt = 'minute'; break;
        case 3: pt = 'hour'; break;
        case 4: pt = 'day'; break;
        case 5: pt = 'week'; break;
        case 6: pt = 'month'; break;
        case 7: pt = 'quarter'; break;
        case 8: pt = 'year'; break;
        default: throw("wrong period type:" + pt)
      }
    } else {
      var reg = new RegExp("['\"]+","g");
      pt = pt.replace(reg,"");
    }

    var regExp = new RegExp(/quarter/, "i");
    if (regExp.test(pt)){
      return "'" + (cnt * 3) + " month'::interval" ;
    }
    return "'" + cnt + " " + pt + "'::interval";
  }


  _context["ql"] = function(el) {
    // NULL values should not be quoted
    // console.log('QL: ' + JSON.stringify(el))
    return el === null ? null : db_quote_literal(el)
  }

  _context["includes"] = function(col, el) {
    // First arg = column name, second arg = string literal
    return `${col} ? ${el}`
  }

  // required for Oracle Reports
  _context["to_timestamp"] = function(el, fmt, nls) {
    return `to_timestamp(${el})`
  }


  // required for Oracle Reports
  _context["to_char"] = function(el, tp, fmt) {
    return `to_char()`
  }

  // required for Oracle Reports
  _context["to_date"] = function(el, fmt, nls) {
    if (fmt && nls ) {
      return `to_date(${el}, ${fmt}, ${nls})`
    }

    if (fmt) {
      return `to_date(${el}, ${fmt})`
    }

    return `to_date(${el})`
  }

  /*
  _context["'"] = function (expr) {
    // we should eval things in the cond ( a = '$(abs.ext)')
    //console.log('FOUND EXPR: ' + expr)
    if (expr.match(/^\s*\$\(.*\)\s*$/)){
      return `'{eval_lisp(expr, _context)}'`
    }
  }*/

  // table lookup filters with auto-filling
  _context['filters'] = function() {
    // for(var i = 0; i < arguments.length; i++) {
    var a = Array.prototype.slice.call(arguments)

    // нужно включить ВСЕ элементы из _vars.context.row, 
    // "row":{"short_tp":["=","ГКБ"],"y":["=",2021]}
    var row = _vars.context.row;

    if (a.length>0) {
      // возможно есть except???
      var except;
      var args =[];
      for (var i=0; i<a.length; i++){
        var el = a[i]
        if (isArray(el) && el[0]==='except') {
          except = el
        } else {
          args.push(el)
        }
      }
      if (except) {
        // console.log('EXCEPT !!!' + JSON.stringify(except))
        // нужно почистить _vars.context.row от лишних ключей
        // считаем, что в except идут исключительно имена столбцов
        except.slice(1).map(key => delete row[key])
      }

      if (args.length > 0) {
        // есть элементы, которые явно указаны, генерим условия только для них
        // нужно почистить _vars.context.row от лишних ключей
        // args.map( el => console.log("ITER:" + JSON.stringify(el)) )
        var r = {}
        args.map( el => {
          if (isArray(el)) {
            if (el[0] === ':'){
              //ITER:[":","short_tp","tp"]
              if (el[1] in row){
                r[el[2]] = row[el[1]]
              }
            }
          } else {
            if (el in row){
              r[el] = row[el]
            }
          }
        })
        row = r;
      }
    }


    // FIXME: REMOVE el!=='measures' in Sept. 2022
    var expr = Object.keys(row).filter(el=>el!=='measures' && el!=='$measures').map(col => 
      {
        var ar = row[col]
        //console.log("ITERITER:" + col + " " + JSON.stringify(ar))
        if ((ar[0]==='=' || ar[0]==='!=') && ar.length > 2 ) {
          return [ar[0], col, ['['].concat(ar.slice(1).map(el=>["ql", el]))]
        }
        
        return [ar[0], col].concat(ar.slice(1).map(el=>["ql", el]))
      }
    );

    if (expr.length === 0){
      return "1=1"
    }

    if (expr.length>1) {
      expr = ["filter",["and"].concat(expr)]
    } else {
      expr = ["filter", expr[0]];
    }
    
    //console.log("FILTERS:" + JSON.stringify(expr))
    return eval_lisp(expr, _context)
  }
  _context['filters'].ast = [[],{},[],1]; // mark as macro

  // filter
  _context['filter'] = function () {
      var ctx = {};
      for(var key in _vars) ctx[key] = _vars[key];

      var quote_scalar = function(el) {
        if (typeof(el)==="string") {
          return db_quote_literal(el);
        } else if (typeof(el) === "number") {
          return el;
        } else {
          return db_quote_literal(JSON.stringify(el));
        }
      }

      var prnt = function(ar) {
        //console.log("PRNT:" + JSON.stringify(ar))
        if (ar instanceof Array) {
          if (  ar[0] === '$' ||
                ar[0] === '"' ||
                ar[0] === "'" ||
                ar[0] === "str" ||
                ar[0] === "[" ||
                ar[0] === 'parse_kv' ||
                ar[0] === 'parse_cond' ||
                ar[0] === "=" ||
                ar[0] === "!=" ||
                ar[0] === "ql" ||
                ar[0] === "pg_interval" ||
                ar[0] === "lpe_pg_tstz_at_time_zone" ||
                ar[0] === "column" ||
                ar[0] === "cond" ||
                ar[0] === "includes" ||
                ar[0] === "get_in"
                ) {
            return eval_lisp(ar, ctx);
          } else {
              if (ar.length == 2) {
                // unary
                if (ar[0] == "not") {
                  return ar[0] + ' ' + prnt(ar[1]);
                } else if (ar[0] == "()") {
                  return "(" + prnt(ar[1]) + ")";
                } else if (ar[0].match(/^[^\w]+$/)){
                  return ar[0] + prnt(ar[1]);
                } else {
                  return prnt(ar[0]) + "(" + prnt(ar[1]) + ")";
                }
              } else if (ar.length == 3) {
                if (ar[0] == "->") {
                  // наш LPE использует точку, как разделитель вызовов функций и кодирует её как ->
                  // в логических выражениях мы это воспринимаем как ссылку на <ИМЯ СХЕМЫ>.<ИМЯ ТАБЛИЦЫ>
                  //return '"' + ar[1]+ '"."' + ar[2] + '"';
                  return ar[1] + '.' + ar[2];
                } else if (ar[0] == "and" || ar[0] == "or"){
                  return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);

                } else if (ar[0] == "~" ) {
                  //_source_database
                  // Oracle has no ~ operator !!!
                  if (_vars["_target_database"] === 'oracle') {
                    return `REGEXP_LIKE( ${prnt(ar[1])} , ${prnt(ar[2])} )` 
                  } else if (_vars["_target_database"] === 'mysql') {
                    return `${prnt(ar[1])} REGEXP ${prnt(ar[2])}` 
                  } else {
                    return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2])
                  }
              
                } else if (ar[0] == "ilike") {
                  //_source_database
                  // Oracle has no ilike !!!!
                  if (_vars["_target_database"] === 'oracle' ||
                      _vars["_target_database"] === 'sqlserver') {
                    // UPPER(last_name) LIKE 'SM%' 
                    return `UPPER( ${prnt(ar[1])} ) LIKE UPPER(${prnt(ar[2])})` 
                  } else {
                    return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2])
                  }
                } else if ( ar[0] == "like" || ar[0] == "in" || ar[0] == "is" || ar[0].match(/^[^\w]+$/)) {
                   // имя функции не начинается с буквы
                   //console.log("PRNT FUNC x F z " + JSON.stringify(ar))
                   // ["~",["column","vNetwork.folder"],"XXX"]

                   if (Array.isArray(ar[1]) && ar[1][0] === 'column' && 
                       (Array.isArray(ar[2]) && ar[2][0] !== 'column') || !(Array.isArray(ar[2]) )
                      ) {
                        // справа значение, которое нужно квотировать!
                   }
                   return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);                 
                  
                } else {
                  return ar[0] + '(' + prnt(ar[1]) + ',' + prnt(ar[2]) + ')';
                }
              } else if (ar[0] == "and" || ar[0] == "or") {
                // много аргументов для логической функции
                return ar.slice(1).map(prnt).join(' '+ar[0]+' ');
              } else if (ar[0] == "between" ){
                return '(' + prnt(ar[1]) + ' BETWEEN ' + prnt(ar[2]) + ' AND ' + prnt(ar[3]) + ')'; 
                
              } else {
                // это неизвестная функция с неизвестным кол-вом аргументов
                return ar[0] + '(' + ar.slice(1).map(
                  function(argel){return prnt(argel)}
                ).join(',') + ')';
              }
            }
        } else {
            return ar;
        }
      };

      ctx['get_in'] = makeSF((ast, ctx, rs) => {
        // возвращаем переменные, которые в нашем контексте, вызывая стандартный get_in
        // при этом наши переменные фильтруем!!пока что есть только _user_info
        let _v = {"user": _context["user"]};
        return eval_lisp(["get_in"].concat(ast), _v, rs);
      });

      ctx['cond'] = function(expr, ifnull) {
        //console.log('COND MACRO expr: ' + JSON.stringify(expr));
        //console.log('COND MACRO ifnull: ' + JSON.stringify(ifnull));
        //COND MACRO expr: ["\"","myfunc($(period.title1)) = 234"]
        //COND MACRO ifnull: ["["]
        let parsed = expr
        
        //console.log('COND PARSED:' + JSON.stringify(parsed));
        //Мы будем использовать спец флаг, были ли внутри этого cond доступы к переменным,
        // которые дали undefined. через глобальную переменную !!!
        if ( isNumber(ifnull) || 
              ifnull === null ||
             (isArray(ifnull) && ifnull.length === 2 && (ifnull[0] === '"' || ifnull[0] === "'"))) {
          let val = prnt(ifnull)
          track_undefined_values_for_cond.unshift(val)
        } else {
          track_undefined_values_for_cond.unshift(false)
        }
        let evaluated = prnt(parsed);
        let unresolved = track_undefined_values_for_cond.shift()
        //console.log('UNRESOLVED:' + unresolved);
        if (unresolved === true) {
          // не удалось найти значение, результат зависит от второго аргумента!
          /*
          если значение var == null
          cond('col in $(row.var)', []) = значит убрать cond вообще (с учётом or/and)
          cond('col = $(row.var)', ['col is null']) = полная замена col is null
          */
          if (isArray(ifnull) && ifnull[0] === '[') {
            if (ifnull.length === 1) {
              return '1=1'
            } else {
              // надо вычислить значение по умолчанию!!!
              // ["\"","myfunc(1)"]
              let ast = ifnull[1]
              let p = prnt(ast)
              if (isArray(ast) && (ast[0] === '"' || ast[0] === "'")) {
                // убираем кавычки
                p = p.slice(1,-1)
              }
              
              return p
            }
          }
        }
        //console.log('COND1:' + evaluated);
        return evaluated;
      }
      ctx['cond'].ast = [[],{},[],1]; // mark as macro

      ctx['"'] = function (el) {
        return '"' + el.toString() + '"';
      }
      ctx['"'].ast = [[],{},[],1]; // mark as macro

      ctx["'"] = function (expr) {
        // we should eval things in the cond ( a = '$(abs.ext)')
        //console.log("QUOT:" + expr)
        if (expr.match(/^\s*\$\(.*\)\s*$/)){
          var parsed = parse(expr)
          return `'${eval_lisp(parsed, ctx)}'`
        } else {
          return "'" + expr.toString() + "'";
        }
      }
      ctx["'"].ast = [[],{},[],1]; // mark as macro: IF it is not a macro, than '*' is evaled to func body!


      ctx["["] = function (el) {
        return "[" + Array.prototype.slice.call(arguments).join(',') + "]";
      }

      function eq_not_eq(l,r,op){
                // понимаем a = [null] как a is null
        // a = [] просто пропускаем, А кстати почему собственно???
        // a = [null, 1,2] как a in (1,2) or a is null

        // ["=",["column","vNetwork.cluster"],["[","SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
        //console.log('========'+ JSON.stringify(l) + ' <> ' + JSON.stringify(r))
        if (r instanceof Array) {
          if (r.length === 0) {
            return op === 'eq' ? 'TRUE' : 'FALSE';
          }
          if (r[0] === '[') {
            r = ['['].concat(r.slice(1).map(function(el){return eval_lisp(el, _context)}))
            var nonnull = r.filter(function(el){return el !== null});
            if (nonnull.length === r.length) {
              if (nonnull.length === 1) {
                return op === '=' ? 'TRUE' : 'FALSE';
              } else {
                return prnt(l)
                      + (op === '=' ? " IN (" : " NOT IN (")
                      + r.slice(1).map(function(el){return prnt(el)}).join(',')
                      + ")";
              }
            } else {
              var col = prnt(l);
              if (nonnull.length === 1) {
                return col + (op === '=' ? " IS NULL" : " IS NOT NULL");
              } else {
                if (op === '=') {
                  return "(" + col + " IS NULL OR " + col + " IN (" +
                        nonnull.slice(1).map(function(el){return prnt(el)}).join(',')
                        + "))";
                } else {
                  return "(" + col + " IS NOT NULL OR " + col + " NOT IN (" +
                        nonnull.slice(1).map(function(el){return prnt(el)}).join(',')
                        + "))";
                }
              }
            }
          } else {
            //console.log(r[0] + " RESOLVING VAR " + JSON.stringify(r[1]));
            // FIXME: сюда может прилететь ->
            //console.log("RESOLVING VAR " + JSON.stringify(_context));
            var var_expr
            if (r[0] === '$') {
              /* FIXME !!!
              _context contains just hash with defined vars (key/value).
              $(expr) inside sql_where should resolve to vars or generate exception with user refer to not defined var!!!
              it is better than default eval_lisp behavior where undefined var reolves to itself (atom). 
              */
              //var_expr = eval_lisp(r[1], _context);
              var_expr = eval_lisp(r[1], _context); // actually, we might do eval_lisp(r, ctx) but that will quote everything, including numbers!
                      // здесь мы получаем в том числе и массив, хорошо бы понимать, мы находимся в cond или нет
              // ["=","ГКБ"]
              //console.log("RESOLVED $" + JSON.stringify(var_expr) )
              if (isArray(var_expr)) {
                if (var_expr[0] === '=') {
                  if (var_expr.length === 2){
                    // всё хорошо !!! Это похоже на koob lookup
                    var_expr = var_expr[1]
                  } else {
                    throw new Error(`Resolved value is array with length of not 2, which is not yet supported. ${JSON.stringify(var_expr)}`)
                  }
                } else { // array here: pass it to the next logic
                  console.log('array in $ evaluation')
                  // возможно значение переменной резолвится в массив???
                  //throw new Error(`Resolved value is array, with operation different from = which is not yet supported. ${JSON.stringify(var_expr)}`)
                }
              }
            } else {
              var_expr = prnt(r, ctx);
            }

            if (var_expr !== undefined) {
              if (var_expr instanceof Array) {
                //console.log(`EVAL = ${op}` + JSON.stringify(l) + ' ' + JSON.stringify(var_expr));
                return ctx[op](l,['['].concat(var_expr));
              } else {
                //console.log("EVAL = " + JSON.stringify(l) + ' ' + JSON.stringify(var_expr));
                return ctx[op](l,var_expr);
              }
            }
          }
        }

        if (r === null || r === undefined) {
          var defVal = track_undefined_values_for_cond[0]
          //console.log("$ CHECK " + defVal)
          if (isString(defVal) || isNumber(defVal) || defVal === null) {
            return defVal;
          } else {
            // ставим метку, что был резолвинг неопределённого значения
            track_undefined_values_for_cond[0] = true;
          }
          return prnt(l) + (op === '=' ? " IS NULL " : " IS NOT NULL ");
        } else if (r === '') {
          return prnt(l) + ` ${op} ''`;
        } else {
          return prnt(l) + ` ${op} ` + prnt(r);
        }
      }

      ctx['='] = function (l,r) {
        return eq_not_eq(l,r,'=')
      }
      ctx['='].ast = [[],{},[],1]; // mark as macro


      ctx['!='] = function (l,r) {
        return eq_not_eq(l,r,'!=')
      }
      ctx['!='].ast = [[],{},[],1]; // mark as macro


      // $(name) will quote text elements !!! suitable for generating things like WHERE title in ('a','b','c')
      // also, we should evaluate expression, if any.
      ctx['$'] = function(inexpr) {
        //console.log("$$$$$$$$$" + JSON.stringify(inexpr))
        var expr = eval_lisp(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context
        // здесь мы получаем в том числе и массив, хорошо бы понимать, мы находимся в cond или нет
        //console.log("$$$$$$$$$ = " + JSON.stringify(expr))
        // ["=","ГКБ"]
        if (isArray(expr)) {
          if (expr[0] === '=') {
            if (expr.length === 2){
              // всё хорошо !!! Это похоже на koob lookup
              return expr[1]
            }
          }
          //throw new Error(`Resolved value is array, which is not yet supported. ${JSON.stringify(expr)}`)
        }

/* есть возможность определить, что мы внутри cond()
if (track_undefined_values_for_cond.length > 0) {
  console.log('$$$ inside cond!')
}*/
        if (expr instanceof Array) {
          // try to print using quotes, use plv8 !!!
          if (_vars["_quoting"] === 'explicit') {
            return expr.map(function(el){
              return el;
            }).join(',');
          } else {
            return expr.map(function(el){
                return quote_scalar(el);
              }).join(',');
          }
        }
        if (expr === undefined) {
          // значит по этому ключу нет элемента в _vars например !!!
          var defVal = track_undefined_values_for_cond[0]
          //console.log("$ CHECK " + defVal)
          if (isString(defVal) || isNumber(defVal) || defVal === null) {
            return defVal;
          } else {
            // ставим метку, что был резолвинг неопределённого значения
            track_undefined_values_for_cond[0] = true;
          }
          return '';
        }
        // May break compatibility WITH THE OLD templates !!!!!
        if (_vars["_quoting"] === 'explicit') {
          return expr;
        } else {
          // Old style templates, try to auto quote...
          return db_quote_literal(expr);
        }
      }
      ctx['$'].ast = [[],{},[],1]; // mark as macro

      //  пока что считаем что у нас ОДИН аргумент и мы его интерпретируем как таблица.столбец
      ctx['parse_kv'] = function(expr) {
        if (expr instanceof Array) {
          if (expr[0] === '->') {
            var sql = 'select "' + expr[2]+ '" from "'+ expr[1] +'" where id = $1::INT';
            var id_val = resolve_literal(expr[1].replace(/.$/,"_id"));

            //console.log('SQL: ', sql, " val:", id_val);

            var res_json = plv8.execute(sql, [ id_val ] );
            //var res_json = [{"src_id":"$a:Вася:$b:Петя"}];
            var frst = res_json[0];

            //console.log('SQL RES: ', frst);

            if (frst !== undefined && frst[expr[2]] !== null && frst[expr[2]].length > 0) {
                var axis_condition = function(e){
                  var result = e.split(':').map(function(e2){
                      e2 = e2.replace(/\'/g , "''"); //' be safe
                      return (e2.indexOf('$') == 0 ? ' AND '+e2.substr(1)+'=' : "'"+e2+"'");
                  }).join('').substr(5);
                  return result;
                };

                var result =  axis_condition(frst[expr[2]]);
                if(result === undefined || result.length == 0) return '(/*kv not resolved*/ 0=1)';
                return result;
            }
          }
        }
        // return everything, FIXME: is it right thing to do ?
        return '(/*parse_kv EMPTY*/ 1=1)';
      };
      ctx['parse_kv'].ast = [[],{},[],1]; // mark as macro


      // we should parse all logic: & | ! () but we are cheating at the moment....
      // NOTE: it is unrelated to cond func!!!
      ctx['parse_cond'] = function(expr) {
        if (expr instanceof Array) {
          if (expr[0] === '->') {
            var sql = 'select "' + expr[2]+ '" from "'+ expr[1] +'" where id = $1::INT';
            var id_val = resolve_literal(expr[1].replace(/.$/,"_id"));

            //console.log('SQL: ', sql, " val:", id_val);

            var res_json = plv8.execute(sql, [ id_val ] );
            //var res_json = [{"src_id":"dor_id=96&obj_id=64024775"}];
            var frst = res_json[0];

            //console.log('SQL RES: ', frst);

            if (frst !== undefined && frst[expr[2]] !== null && frst[expr[2]].length > 0) {
                var axis_condition = function(e){
                  var result = e.split('&').map(function(e2){
                      return e2
                  }).join(' and ');
                  return result;
                };

                var result =  axis_condition(frst[expr[2]]);
                if(result === undefined || result.length == 0) return '(/*cond not resolved*/ 0=1)';
                return result;
            }
          }
        }
        // return everything, FIXME: is it right thing to do ?
        return '(/*parse_cond EMPTY*/ 1=1)';
      };
      ctx['parse_cond'].ast = [[],{},[],1]; // mark as macro

      var ret = [];
      //console.log("where IN: ", JSON.stringify(Array.prototype.slice.call(arguments)));

      var fts = _vars['fts'];
      var tree = arguments;

      if ( fts !== undefined && fts.length > 0) {
        fts = fts.replace(/\'/g , "''"); //' be safe
        // Full Text Search based on column_list
        if (typeof _vars['_columns'] == 'object') {
          let generator_func = col =>
              col["search"] !== undefined
              ? ["ilike", col["search"], ["'", '%' + fts + '%']]
              : null

          var ilike = Object.values(_vars['_columns']).map(generator_func)
               .filter(el => el !== null).reduce((ac, el) => ac ? ['or',ac,el] : el, null) || [];

          console.log( "FTS PARSED: ",  JSON.stringify(ilike));
          //console.log( "FTS PARSED: ",  JSON.stringify(tree));

          if (ilike !== undefined && ilike.length > 0) {
            // добавляем корень AND с нашим поиском
            if (tree[0]) {
              tree = [["and",tree[0],['()',ilike]]];
            } else {
              tree = [['()',ilike]];
            }
          }
        }
      }

      // Проверяем волшебный ключ в контексте _rls_filters
      let rls = _vars["_rls_filters"];
      if (isArray(rls) && rls.length > 0) {
        // добавляем корень AND с нашими фильтрами
        if (tree[0]) {
          tree = [["and",tree[0],['()',rls]]];
        } else {
          tree = [['()',rls]];
        }
      }

      for(var i = 0; i < tree.length; i++) {
          // console.log("array ", JSON.stringify(Array.prototype.slice.call(tree[i])));
          ret.push(prnt( tree[i], ctx));
      }

      var r = ret[0]; // у нас только один результат должен быть !!!
      if (r == undefined) {
        r = '';
      }
      return r;
    };
    _context['filter'].ast = [[],{},[],1]; // mark as macro


    // where - we should not eval arguments, so we must mark where as macro!!!
    _context['where'] = function () {
      // we should always get ONE argument, for example: ["=",["$",["->","period","title"]],3]
      // BUT if we get two, or more arguments, we eval them one by one, AND combine later with AND operand, skipping empty results...
      var tree = arguments;
      var ret = [];

      if (tree.length > 0) {
        for(var i = 0; i < tree.length; i++) {
          // console.log("array ", JSON.stringify(Array.prototype.slice.call(tree[i])));
          var r = eval_lisp(["filter", tree[i]], _context); // r should be string
          if (r.length > 0) {
            ret.push(r);
          }
        }
      } else {
        var r = eval_lisp(["filter"], _context); // r should be string
        if (r.length > 0) {
          ret.push(r);
        }
      }

      if (ret.length > 0) {
        if (ret.length > 1) {
          return 'WHERE (' + ret.join(') AND (') + ')';
        } else {
          return 'WHERE ' + ret[0];
        }
      } else {
        return 'WHERE TRUE';
      }
    };
    _context['where'].ast = [[],{},[],1]; // mark as macro

  return _context;
}









export function eval_sql_where(_expr, _vars) {
  if (typeof _vars === 'string') _vars = JSON.parse(_vars);

  var sexpr = parse(_expr);

  //console.log('sql_where parse: ', JSON.stringify(sexpr));

  if ((sexpr instanceof Array) && (
      (sexpr[0]==='filter' && (sexpr.length <=2))
     || (sexpr[0]==='order_by') 
     || (sexpr[0]==='if') 
     || (sexpr[0]==='where') 
     || (sexpr[0]==='pluck')
     || (sexpr[0]==='str')
     || (sexpr[0]==='prnt')
     || (sexpr[0]==='cond')
     || (sexpr[0]==='filters')
     || (sexpr[0]==='->') // it is dot operator, FIXME: add correct function call check !
     
  )) {
    // ok
    if (sexpr[0]==='order_by' && isString(_vars['sort']) && _vars['sort'].length > 0) {
      // we should inject content of the sort key, which is coming from the GUI.
      // do it in a safe way
      var extra_srt_expr = parse(`order_by(${_vars['sort']})`)
      //console.log('sql_where ORDER BY MIXED0: ', JSON.stringify(extra_srt_expr));
      //console.log('sql_where ORDER BY MIXED1: ', JSON.stringify(_vars));
      sexpr = sexpr.concat( extra_srt_expr.slice(1))
      //console.log('sql_where ORDER BY MIXED: ', JSON.stringify(sexpr));
    } else {
      if (sexpr[0] === 'cond') {
        sexpr = ["filter",["cond", sexpr[1], sexpr[2]]];
      }
    }
  } else {
    throw("Found unexpected top-level func: " + sexpr[0])
  }


  var _context = sql_where_context(_vars);

  var ret = eval_lisp(sexpr, _context);

  // console.log('ret: ',  JSON.stringify(ret));
  return ret;
}
