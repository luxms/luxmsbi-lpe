import console from './console/console';
import {parse, LPESyntaxError} from './lpep';
import {eval_lisp} from './lisp';
import {sql_where_context, eval_sql_where} from './sql_where';
import {sql_context, eval_sql_expr, parse_sql_expr, generate_report_sql} from './sql_context';


// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = eval_lisp(ast, []);
// console.log(res);


var logo = [
'\x1b[0;100m \x1b[48;5;0m',
'\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m',
'\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m',
'\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;0m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m',
'\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;32m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;200m  \x1b[48;5;0m',
'\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;32m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;200m  \x1b[48;5;0m',
'\x1b[38;5;15m\x1b[48;5;16m Luxms BI \x1b[0m',
'\x1b[0m'].join('\n');

console.log(logo);

// example
// global helper: should not use it so
plv8.console = console;

console.log('LPE initialised!');


// var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);


function eval_lpe(lpe, ctx) {
  const ast = parse(lpe);
  return eval_lisp(ast, ctx);
}


// exports to plv8.lpe due to webpack config
export {
  // lpe
  parse,
  LPESyntaxError,
  eval_lisp,
  eval_lpe,
  // sql_where
  sql_where_context,
  eval_sql_where,
  // sql_context
  sql_context,
  eval_sql_expr,
  parse_sql_expr,
  generate_report_sql
};



/*
CREATE OR REPLACE FUNCTION
lpe.init_parser()
RETURNS VOID
*/



/*
CREATE OR REPLACE FUNCTION
lpe.eval(ast JSONB, context JSONB DEFAULT '{}')
RETURNS JSONB
*/
// lpe.eval = function (ast, context) {


/*
CREATE OR REPLACE FUNCTION
lpe.eval_sql_where(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
*/

/*
CREATE OR REPLACE FUNCTION
lpe.init_sql_where()
RETURNS VOID
*/
// lpe.init_sql_where = function() {
//   plv8.lpe.sql_where_context = sql_where_context;
// }


/*
CREATE OR REPLACE FUNCTION
lpe.init_sql_context()
RETURNS VOID
*/



/*
CREATE OR REPLACE FUNCTION
lpe.parse_sql_expr(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
*/