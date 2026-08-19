import {parse, LPESyntaxError} from './lpep';
import {deparse} from './lped';
import makeVararg from './lisp.vararg';
import { eval_lisp, EVAL, STDLIB, $VAR$, $IS_LIB$ } from './lisp';
import { isString, isArray, isHash, isFunction, makeSF, makeSkipForm, isNumber } from './lib/utils';
import { $var$, $getvar$, $setvar$ } from './context/variables';
import {makeDoc, selectPerfectFunctionName, generateSimpleHash, DOC_WARNINGS} from './lib/doc'
import {LOCALE_DOC} from './localization/localization'
import unbox from './lisp.unbox';


/**
 * Парсит и выполняет LPE код
 * @param {string} lpe
 * @param {Context=} ctx
 * @param {EvalOptions=} rs
 */
function eval_lpe(lpe, ctx, rs) {
  const ast = parse(lpe, rs || {});
  return eval_lisp(ast, ctx, rs);
}

export {
  parse,
  deparse,
  eval_lisp,
  EVAL,
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
  $IS_LIB$,
  unbox,
  makeDoc,
  selectPerfectFunctionName,
  generateSimpleHash,
  LOCALE_DOC,
  DOC_WARNINGS,
};
