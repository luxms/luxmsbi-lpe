/**
 Copyright (c) 2022 Luxms Inc.

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
import {db_quote_literal, db_quote_ident} from './utils/utils';
import {eval_lisp, isString, isArray, isHash, makeSF, isNumber} from './lisp';


let postgresql_typemap = {
  'INT': ['INT', 'utils.safe_convert_to_int'],
  'FLOAT': ['FLOAT','utils.safe_convert_to_float8'],
  'DOUBLE': ['FLOAT', 'utils.safe_convert_to_float8'],
  'STRING' : ['TEXT', 'utils.safe_convert_to_text'],
  'DATE': ['DATE', 'utils.safe_convert_to_date'],
  'DATETIME': ['TIMESTAMP','utils.safe_convert_to_timestamp'],
}


function sql_macros_context(_vars) {
  let global_current_column
  var _ctx = [] // это контекст где будет сначала список переменных, включая _columns, и функции
  if (isHash(_vars)){
    _ctx = [_vars]
  }
  var _context = {}
  
  // добавляем наш контекст, как имеющий более высокий приоритет над существующим
  _ctx.unshift(_context)

  _context["cast"] = function(column, typeTo, optional_default) {
    // utils.convert_softly('foo', /*new type*/ 'INT', /* default*/ NULL);
    let def_val
    let dbType = postgresql_typemap[typeTo]

    if (dbType === undefined) {
      throw Error(`Conversion to ${typeTo} is not supported`)
    }
    if (optional_default === null ) {
      def_val = `NULL::${dbType[0]}`
    } else {
      def_val = optional_default === undefined ? `NULL::${dbType[0]}` : `${db_quote_literal(optional_default)}::${dbType[0]}`
    }

    let sql = `    ALTER COLUMN ${db_quote_ident(column)} SET DATA TYPE ${dbType[0]}
    USING ${dbType[1]}(${db_quote_ident(column)}, ${def_val})`
    return sql
  }

  _context["regexp"] = function(first, second) {
    if (second === undefined){
      return `(regexp_match(${db_quote_ident(global_current_column)}, '${first}'))[1]`
    } else {
      return `(regexp_match(${first}, '${second}'))[1]`
    }
  }

  _context["to_date"] = function(first, second) {
    if (second === undefined){
      return `to_date(${db_quote_ident(global_current_column)}, ${db_quote_literal(first)})`
    } else {
      return `to_date(${first}, ${db_quote_literal(second)})`
    }
  }

  _context["to_datetime"] = function(first, second) {
    if (second === undefined){
      return `to_timestamp(${db_quote_ident(global_current_column)}, ${db_quote_literal(first)})::TIMESTAMP`
    } else {
      return `to_timestamp(${first}, ${db_quote_literal(second)})::TIMESTAMP`
    }
  }

  _context["left"] = function(first, second) {
    if (second === undefined){
      //console.log(`isNumber ${first}: ${isNumber(first)}`)
      return `left(${db_quote_ident(global_current_column)}, ${db_quote_literal(first)})`
    } else {
      //console.log(`isNumber ${second}: ${isNumber(second)}`)
      return `left(${first}, ${db_quote_literal(second)})`
    }
  }

  _context["castWithExpr"] = makeSF((ast,ctx) => {
    // column, typeTo, expr, optional_default
    let column = eval_lisp(ast[0],ctx)
    let typeTo = eval_lisp(ast[1],ctx)
    let dbType = postgresql_typemap[typeTo]

    if (dbType === undefined) {
      throw Error(`Conversion to ${typeTo} is not supported`)
    }

    // remember for use in other functions
    global_current_column = column

    let def_val, optional_default
    if (ast[3] === null ) {
      def_val = `NULL::${dbType[0]}`
    } else {
      if (ast[3] === undefined) {
        def_val = `NULL::${dbType[0]}`
      } else {
        optional_default = eval_lisp(ast[3],ctx)
        def_val = `${db_quote_literal(optional_default)}::${dbType[0]}`
      } 
    }

    if ((dbType[0] === 'DATE' && ast[2][0] === 'to_date') ||
    (dbType[0] === 'TIMESTAMP' && ast[2][0] === 'to_datetime')
    ) {
      // делаем быстрый хэк 
      let arg = eval_lisp(ast[2][1],ctx)
      let sql = `    ALTER COLUMN ${db_quote_ident(column)} SET DATA TYPE ${dbType[0]}
    USING ${dbType[1]}(${db_quote_ident(column)}, ${db_quote_literal(arg)}, ${def_val})`
      return sql
    }
    //console.log(JSON.stringify(ast[2]))
    let expr = eval_lisp(ast[2],ctx)
    //console.log(expr)


    let sql = `    ALTER COLUMN ${db_quote_ident(column)} SET DATA TYPE ${dbType[0]}
    USING ${dbType[1]}(${expr}, ${def_val})`
    return sql
  })

  return _ctx;

}


export function eval_sql_macros(_sexpr, _vars) {
  if (typeof _vars === 'string') _vars = JSON.parse(_vars);

  //console.log('sql_where parse: ', JSON.stringify(sexpr));

  var _context = sql_macros_context(_vars);

  var ret = eval_lisp(_sexpr, _context);

  // console.log('ret: ',  JSON.stringify(ret));
  return ret;
}
