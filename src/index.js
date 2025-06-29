import {parse, LPESyntaxError} from './lpep';
import {deparse} from './lped';
import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, makeSkipForm, isNumber, STDLIB, $VAR$} from './lisp';
import unbox from './lisp.unbox';


function eval_lpe(lpe, ctx, options) {
  const ast = parse(lpe, options);
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
  makeSkipForm,
  STDLIB,
  $VAR$,
  unbox,
};
