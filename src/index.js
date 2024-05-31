import {parse, LPESyntaxError} from './lpep';
import {deparse} from './lped';
import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, isNumber, STDLIB} from './lisp';

function eval_lpe(lpe, ctx, options) {
  const ast = parse(lpe);
  return eval_lisp(ast, ctx, options);
}

export {
  parse,
  deparse,
  eval_lisp,
  eval_lpe,
  LPESyntaxError,
  isString,
  isArray,
  isHash,
  isFunction,
  isNumber,
  makeSF,
  STDLIB,
};


// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = eval_lisp(ast, []);
// console.log(res);
