/**
 *  miniMAL lisp interpreter
 *  Copyright (C) 2014 Joel Martin
 *  Licensed under MPL 2.0
 *  https://github.com/kanaka/mal
 *
 */
/**
 *  The code has been reworked to suite LuxmsBI needs
 *  by esix & Dmitry Dorofeev
 *  2017-2019
 */


/**
 * Этот символ используется как ключ для хэшмапов-контекстов определения контекста.
 * Еслди переменная не была найдена в хэшмаповом контексте, будет произведена попытка вызвать функцию
 * с этим ключом.
 * Функция может вернуть undefined (значение не найдено), либо действительное значение
 */
export const $VAR$ = Symbol.for('__getitem__');
export const $IS_LIB$ = Symbol.for('__islib__');


import unbox from "./lisp.unbox";
import { varGetter } from './lisp.var';
import { except } from './lib/exception';
import CONTEXT_STD, { createContext as createStdContext } from './context/std';
import CONTEXT_TYPES from './context/types';
import CONTEXT_VARIABLES, { createContext as createVariablesContext } from './context/variables';
import CONTEXT_LOGICAL from './context/logical';
import CONTEXT_MATH from './context/math';
import CONTEXT_STRINGS, { createContext as createStringsContext } from './context/strings';
import CONTEXT_OBJECTS, { createContext as createObjectsContext } from './context/objects';
import { DATE_FUNCTIONS } from "./lib/date/date";
import { TIME_FUNCTIONS } from "./lib/date/time";
import { findDoc, makeDoc, selectPerfectFunctionName } from "./lib/doc";
import { isArray, isArrayFunction, isFunction, isHash, isSF, isSkip, isString } from "./lib/utils";
import { isNativeFunction } from './lib/security';
import { evaluationPolicy } from './lib/evaluation-policy';




// @deprecated? Не экспортируется и не используется в этой библиотеке
export const __call__ = Symbol.for('__call__');
export const __getitem__ = Symbol.for('__getitem__');



/** @type {ContextObject} */
export const STDLIB = {
  [$IS_LIB$]: true,

  // $$CONTEXT_NAME$$ Должен совпадать с именем в LOCALE_DOC объекте
  "$$CONTEXT_NAME$$": () => "STDLIB",

  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,                                                                // js specific
  'undefined': undefined,
  'true': true,
  'false': false,
  'NaN': NaN,
  'Infinity': Infinity,

  // TODO: consider removing these properties
  'Array': Array,
  'Object': Object,
  get Hashmap() { return {}; },
  'Date': Date,

  'console': console,
  'JSON': JSON,

  // datetime fn
  ...CONTEXT_STD,
  ...CONTEXT_TYPES,
  ...CONTEXT_VARIABLES,
  ...CONTEXT_LOGICAL,
  ...CONTEXT_MATH,
  ...CONTEXT_STRINGS,
  ...CONTEXT_OBJECTS,
  ...DATE_FUNCTIONS,
  ...TIME_FUNCTIONS,

};

prepareContext(STDLIB);

const UNSAFE_STDLIB = {
  ...STDLIB,
  get Hashmap() { return {}; },
  ...createStdContext(true), ...createVariablesContext(true), ...createStringsContext(true), ...createObjectsContext(true),
};


/**
 * Подготавливает контекст для выполнения Lisp-выражений.
 *
 * Задаёт всем функциям контекстное имя и подготавливает документацию.
 * @param {ContextFunctionsObject} ctx
 */
export function prepareContext(ctx) {
  const ctxName = isFunction(ctx["$$CONTEXT_NAME$$"]) ? ctx["$$CONTEXT_NAME$$"]() : undefined;
  // Native-функции могут быть общими с хостом: нельзя менять ни имя, ни метаданные.
  const canPrepare = fn => isFunction(fn) && !isNativeFunction(fn);

  // Находим лучшее имя для каждой функции
  for (const [key, val] of Object.entries(ctx)) {
    if (canPrepare(val) && canPrepare(val.__docFunction || val)) {
      const docFunction = val.__docFunction || val;
      docFunction.lpeName = val.lpeName = selectPerfectFunctionName(val.lpeName, key);
    }
  }


  // Даем имена всем связанным функциям
  for (const [key, val] of Object.entries(ctx)) {
    if (canPrepare(val) && canPrepare(val.__docFunction || val)) {
      const docFunction = val.__docFunction || val;
      const assoc = [[docFunction, ""], ...(docFunction.__associatedFunctions || [])];
      assoc.forEach(([fn, prefix]) => {
        if (!canPrepare(fn)) return;
        // @ts-ignore
        fn.lpeName = val.lpeName;
        Object.defineProperty(fn, 'name', {
          value: "LISP_" + (prefix == "" ? val.lpeName : `${prefix}_${val.lpeName}`),
          configurable: true,
        });
      });
    }
  }


  if (ctxName === undefined) {
    console.log(except("CONTEXT_NAME_UNDEFINED"));
    return;
  }

  // Находим документацию для каждой функции
  for (const [key, val] of Object.entries(ctx)) {
    if (canPrepare(val) && canPrepare(val.__docFunction || val) && val._doc === undefined) {
      const docFunction = val.__docFunction || val;
      docFunction._doc = val._doc = findDoc(ctxName, val.lpeName);
    }
  }


  // @ts-ignore Обозначаем, что это библиотека
  ctx[$IS_LIB$] = true;
}





/**
 * Выполняет AST в указанном контексте.
 *
 * Для внешнего вызова рекомендуется использовать {@link eval_lisp}.
 * Эту функцию рекомендуется использовать из Spetial Forms для сохранения контекста в том же виде.
 *
 * @param {AST} ast
 * @param {Context} ctx
 * @param {EvalOptions=} rs
 * @returns {Promise<Awaited<unknown>[] | void>|*|null|undefined}
 */
export function EVAL(ast, ctx, rs) {
  // Snapshot host options so delayed work cannot change privilege later.
  if (!rs || !Object.isFrozen(rs)) rs = Object.freeze({...rs, unsafe: rs?.unsafe === true});
  const {safeApply} = evaluationPolicy(rs);
  // В этой функции задаем параметры поиска и обрабатываем skip результат
  // после чего перенаправляем в исходную функцию, которая теперь называется EVAL_IMPLEMENTATION
  /** @type {VarSearchOptions} */
  let evalOptions = { evalFrom: 0, currentCtxElement: 0 }
  let skippedForms = []
  let result = EVAL_IMPLEMENTATION(ast, ctx, rs || {}, evalOptions);
  while (isSkip(result)) {
    // Если в качестве результата вернулась функция с пометкой skip
    // необходимо продолжить поиск с того же места в контексте
    // после чего результат найденной функции передать в качестве аргумента
    // в skip функцию

    // Для этого в evalFrom передаём, на каком элементе в контексте мы сейчас остановились

    // ВАЖНО! evalOptions не должен перезаписываться в другой объект для того, чтобы
    // при изменении  currentCtxElement в нижележащий функциях здесь были видны изменеия
    // Также из-за макросов эта логика может сломаться, т.к. после обработки макроса
    // вместо рекурсивного вызова EVAL, который сбросит currentCtxElement, продолжается
    // обработка в том же EVAL в цикле с продолжением счетчика, но уже с другим деревом
    skippedForms.push(result);
    evalOptions.evalFrom = evalOptions.currentCtxElement + 1;
    evalOptions.currentCtxElement = 0;
    if (result.__ast) {
      ast = [ast[0], ...result.__ast];
    }
    result = EVAL_IMPLEMENTATION(ast, ctx, rs || {}, evalOptions);
  }
  for (let i = skippedForms.length - 1; i >= 0; --i) {
    result = safeApply(skippedForms[i], [result], undefined);
  }
  return result;
}



/**
 * Выполняет AST в указанном контексте. Не учитывает Skip формы.
 * @param {AST} ast
 * @param {Context} ctx
 * @param {EvalOptions} rs
 * @param {VarSearchOptions} evalOptions
 * @returns {Promise<Awaited<unknown>[] | void>|*|null|undefined}
 */
function EVAL_IMPLEMENTATION(ast, ctx, rs, evalOptions) {
  const {safeApply, safeFunction, safeValue} = evaluationPolicy(rs);

  if (!isArray(ast)) {
    if (isString(ast)) {
      const value = varGetter(ctx, ast, rs, evalOptions);
      if (value.found) {
        return safeValue(value.value);
      }
      return rs && rs.resolveString ? ast : undefined;
    }
    return safeValue(ast);
  }


  if (ast.length === 0) {
    // TODO: [] => empty list (or, maybe return vector [])
    return null;
  }



  const [opAst, ...argsAst] = ast;

  let op = EVAL_IMPLEMENTATION(opAst, ctx, isString(opAst) ? {...rs, wantCallable: true} : rs, evalOptions);       // evaluate operator

  if (isHash(op) && (__call__ in op)) {       // Если в качестве функции нам дают хэшмап и у него есть __call__
    const receiver = op;
    const callable = safeFunction(op[__call__]);
    op = (...args) => safeApply(callable, args, receiver);
  }

  if (!isFunction(op)) {
    throw new Error('Error: ' + String(op ?? opAst) + ' is not a function');
  }
  safeFunction(op);

  if (isSF(op)) {
    const sfResult = safeApply(op, [argsAst, ctx, rs, ast], undefined, true);
    return sfResult;
  }

  const args = argsAst.map(a => EVAL(a, ctx, rs));

  return unbox(
    args,
    (args) => {
      const fnResult = safeApply(op, args, op);
      return fnResult;
    },
    rs?.streamAdapter, rs,
  );

} // EVAL



/**
 * Выполняет AST дерево, подставляя STDLIB контекст.
 * @param {AST} ast
 * @param {Context=} ctx
 * @param {EvalOptions=} rs
 * @returns {*}
 */
export function eval_lisp(ast, ctx, rs) {
  const result = EVAL(ast, [ctx || {}, rs?.unsafe === true ? UNSAFE_STDLIB : STDLIB, {}], rs || {resolveString: true});
  return result;
}
