import console from './console/console';
import {parse, LPESyntaxError} from './lpep';
import {deparse} from './lped';
import {eval_lisp} from './lisp';
import {sql_where_context, eval_sql_where} from './sql_where';
import {sql_context, eval_sql_expr, parse_sql_expr} from './sql_context';


function eval_lpe(lpe, ctx) {
  const ast = parse(lpe);
  return eval_lisp(ast, ctx);
}


export {
  parse,
  deparse,
  LPESyntaxError,
  eval_lisp,
  eval_lpe,
  eval_sql_where,
  eval_sql_expr,
  parse_sql_expr,
};



// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = eval_lisp(ast, []);
// console.log(res);

// test:
// var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);

