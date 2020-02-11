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
import {db_quote_literal, db_quote_ident, get_source_database} from './utils/utils';
import {eval_lisp} from './lisp';


/*
where - всегда возвращает слово WHERE, а потом условия. На пустом входе вернёт WHERE TRUE
filter - на пустом входе вернёт пустую строку
*/

export function sql_where_context(_vars) {

  // try to get datasource Ident
  // table lookup queries should be sending us key named sourceId = historical name!
  var srcIdent = _vars["sourceId"]
  if (srcIdent !== undefined) {
    var target_db_type = get_source_database(srcIdent)
    _vars["_target_database"] = target_db_type
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
        console.log("-: try_to_quote_order_by_column " + JSON.stringify(o));
        console.log("-: try_to_quote_order_by_column " + (typeof o));
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
    console.log('LITERAL ', lit, '  CONTEXT:', _vars[lit]);
    if (_vars[lit] == undefined ) {
      return try_to_quote_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return eval_lisp(lit, _vars);
    }
  };

  var resolve_order_by_literal = function(lit) {
    console.log('OB LITERAL ', lit, ' CONTEXT:', _vars[lit]);

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
    // так как order_by будет выполнять eval_lisp, когда встретит имя стольба с минусом -a, то мы
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

    for(var i = 0; i < arguments.length; i++) {
        if (arguments[i] instanceof Array) {
          ret.push(eval_lisp(arguments[i], ctx) );
        } else {
          // try_to_quote_column берёт текст в двойные кавычки для известных столбцов!!!
          var a = arguments[i].toString();
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
    console.log("lpe_pg_tstz_at_time_zone" + timestamp);
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
    return el === null ? null : db_quote_literal(el)
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
        console.log("PRNT:" + JSON.stringify(ar))
        if (ar instanceof Array) {
          if (  ar[0] === '$' ||
                ar[0] === '"' ||
                ar[0] === "'" ||
                ar[0] === "str" ||
                ar[0] === "[" ||
                ar[0] === 'parse_kv' ||
                ar[0] === "=" ||
                ar[0] === "ql" ||
                ar[0] === "pg_interval" ||
                ar[0] === "lpe_pg_tstz_at_time_zone" ||
                ar[0] === "column") {
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
                  if (_vars["_target_database"] === 'oracle') {
                    // UPPER(last_name) LIKE 'SM%' 
                    return `UPPER( ${prnt(ar[1])} ) LIKE ${prnt(ar[2])}` 
                  } else if (_vars["_target_database"] === 'sqlserver') {
                    return `UPPER( ${prnt(ar[1])} ) LIKE ${prnt(ar[2])}`
                  } else {
                    return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2])
                  }
                } else if ( ar[0] == "like" || ar[0] == "in" || ar[0] == "is" || ar[0].match(/^[^\w]+$/)) {
                   // имя функции не начинается с буквы
                   console.log("PRNT FUNC x F z " + JSON.stringify(ar))
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

      ctx['"'] = function (el) {
        return '"' + el.toString() + '"';
      }

      ctx["'"] = function (el) {
        return "'" + el.toString() + "'";
      }

      ctx["["] = function (el) {
        return "[" + Array.prototype.slice.call(arguments).join(',') + "]";
      }

      ctx['='] = function (l,r) {
        // понимаем a = [null] как a is null
        // a = [] просто пропускаем
        // a = [null, 1,2] как a in (1,2) or a is null

        // ["=",["column","vNetwork.cluster"],["[","SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
        // console.log('========'+ JSON.stringify(l) + ' ' + JSON.stringify(r))
        if (r instanceof Array) {
          if (r.length === 0) {
            return 'TRUE';
          }
          if (r[0] === '[') {
            r = ['['].concat(r.slice(1).map(function(el){return eval_lisp(el, _context)}))
            var nonnull = r.filter(function(el){return el !== null});
            if (nonnull.length === r.length) {
              if (nonnull.length === 1) {
                  return "TRUE";
              } else {
                return prnt(l)
                      + " IN ("
                      + r.slice(1).map(function(el){return prnt(el)}).join(',')
                      + ")";
              }
            } else {
              var col = prnt(l);
              if (nonnull.length === 1) {
                return col + " IS NULL";
              } else {
                return "(" + col + " IS NULL OR " + col + " IN (" +
                      nonnull.slice(1).map(function(el){return prnt(el)}).join(',')
                      + "))";
              }
            }
          } else {
            //console.log("RESOLVING VAR " + JSON.stringify(r));
            //console.log("RESOLVING VAR " + JSON.stringify(_context));
            var var_expr
            if (r[0] === '$') {
              /* FIXME !!!
              _context contains just hash with defined vars (key/value).
              $(expr) inside sql_where should resolve to vars or generate exception with user refer to not defioned var!!!
              it is better than default eval_lisp behavior where undefined var reolves to itself (atom). 
              */
              //var_expr = eval_lisp(r[1], _context);
              var_expr = eval_lisp(r[1], _context); // actually, we might do eval_lisp(r, ctx) but that will quote everything, including numbers!
            } else {
              var_expr = prnt(r, ctx);
            }
            //console.log("EVAL" + JSON.stringify(var_expr));
            if (var_expr instanceof Array) {
              return ctx['='](l,['['].concat(var_expr));
            } else {
              return ctx['='](l,var_expr);
            }
          }
        }

        if (r == null) {
          return prnt(l) + " IS NULL ";
        } else if (r === '') {
          return prnt(l) + " = ''";
        } else {
          return prnt(l) + " = " + prnt(r);
        }
      }
      ctx['='].ast = [[],{},[],1]; // mark as macro

      // $(name) will quote text elements !!! suitable for generating things like WHERE title in ('a','b','c')
      // also, we should evaluate expression, if any.
      ctx['$'] = function(inexpr) {
        var expr = eval_lisp(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context

        if (expr instanceof Array) {
          // try to print using quotes, use plv8 !!!
          return expr.map(function(el){
              return quote_scalar(el);
            }).join(',');
        }
        return db_quote_literal(expr);
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

      var ret = [];
      //console.log("where IN: ", JSON.stringify(Array.prototype.slice.call(arguments)));

      var fts = _vars['fts'];
      var tree = arguments;

      if ( fts !== undefined && fts.length > 0) {
        fts = fts.replace(/\'/g , "''"); //' be safe
        // Full Text Search based on column_list
        if (typeof _vars['_columns'] == 'object') {
          var ilike = Object.values(_vars['_columns']).map(col =>
              col["search"] !== undefined
              ? ["ilike", col["search"], ["'", '%' + fts + '%']]
              : null
            ).filter(el => el !== null).reduce((ac, el) => ['or',ac,el]);

          //console.log( "FTS PARSED: ",  JSON.stringify(ilike));
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


  console.log('sql_where parse: ', JSON.stringify(sexpr));

  if ((sexpr instanceof Array) && (
      (sexpr[0]==='filter' && (sexpr.length <=2))
     || (sexpr[0]==='order_by') 
     || (sexpr[0]==='if') 
     || (sexpr[0]==='where') 
     || (sexpr[0]==='pluck')
     || (sexpr[0]==='str')
     || (sexpr[0]==='prnt')
     || (sexpr[0]==='->') // it is dot operator, FIXME: add correct function call check !
     
  )) {
    // ok
  } else {
    throw("only single where() or order_by() could be evaluated. Found: " + sexpr[0])
  }


  var _context = sql_where_context(_vars);

  var ret = eval_lisp(sexpr, _context);

  // console.log('ret: ',  JSON.stringify(ret));
  return ret;
}
