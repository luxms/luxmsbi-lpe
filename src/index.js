import {parse, LPESyntaxError} from './lpep';
import {deparse} from './lped';
import makeVararg from './lisp.vararg';
import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, makeSkipForm, isNumber, $var$, STDLIB, $VAR$, $VAR_SCOPE$, $getvar$, $setvar$} from './lisp';
import {makeDoc, selectPerfectFunctionName, generateSimpleHash} from './doc'
import {LOCALE_DOC} from './localization/localization'
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
  $var$,
  $getvar$,
  $setvar$,
  makeSF,
  makeVararg,
  makeSkipForm,
  STDLIB,
  $VAR$,
  $VAR_SCOPE$,
  unbox,
  makeDoc,
  selectPerfectFunctionName,
  generateSimpleHash,
  LOCALE_DOC,
};
