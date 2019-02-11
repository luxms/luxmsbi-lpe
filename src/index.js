import console from './console/console';
import {parse, LPESyntaxError} from './lpep';
import {eval_lisp, evaluate} from './lisp';
import {sql_where_context, eval_sql_where} from './sql_where';
import {sql_context, parse_sql_expr, parse_sql_apidb_expr} from './sql_context';


export {
  parse,
  LPESyntaxError,
  eval_sql_where,
  parse_sql_expr,
  parse_sql_apidb_expr,
  evaluate,                         // deprecated
  eval_lisp,
};



// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = evaluate(ast, []);
// console.log(res);

// test:
// var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);

