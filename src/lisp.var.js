import { isArray, isHash, makeSF, isFunction } from "./lib/utils";
import { except } from "./lib/exception";
import { $IS_LIB$, $VAR$, EVAL } from "./lisp";


const VAR_NOT_FOUND = { value: undefined, found: false };


/**
 * Получить или установить значение переменной в контексте
 *
 * deprecated: иногда нам нужно установить значение переменной в контексте как undefined
 * @param {Context} ctx - array, hashmap or function that stores variables
 * @param {string} varName - the name of variable
 * @param {*} value - optional value to set (undefined if get)
 * @param {EvalOptions} rs - options on how to resolve. resolveString - must be checked by caller and is not handled here...
 * @param {VarSearchOptions=} varSearchOptions - current evaluate context and options for find endpoint
 */
export function $var$(ctx, varName, value, rs = {}, varSearchOptions = undefined) {
  if (value === undefined) {
    return $getvar$(ctx, varName, rs, varSearchOptions);
  } else {
    return $setvar$(ctx, varName, value, rs);
  }
}



/**
 * Get variable or function in context
 * @param {Context} ctx - array, hashmap or function that stores variables
 * @param {string} varName - the name of variable
 * @param {EvalOptions} rs - options on how to resolve
 * @param {VarSearchOptions=} varSearchOptions - current evaluate context and options for find endpoint
 */
export function $getvar$(ctx, varName, rs = {}, varSearchOptions = undefined) {
  if (!varSearchOptions) {
    varSearchOptions = { evalFrom: 0, currentCtxElement: 0 }
  }
  return varGetter(ctx, varName, rs, varSearchOptions).value;
}



/**
 * Set variable in context
 * @param {Context} ctx - array, hashmap or function that stores variables
 * @param {string} varName - the name of variable
 * @param {*} value - the value of variable
 * @param {EvalOptions} rs - options on how to resolve
 */
export function $setvar$(ctx, varName, value, rs = {}) {
  const result = varSetter(ctx, varName, value, rs);

  if (result.found) {
    return result.value;
  }
  if (result.firstNotlib !== undefined) {
    return (result.firstNotlib[varName] = value);
  }
  throw except("LPE_VAR_SCOPE_NOT_FOUND");
}



/**
 * Get variable from context
 * @param {Context} ctx
 * @param {string} varName
 * @param {EvalOptions} rs
 * @param {VarSearchOptions} varSearchOptions
 * @returns {{value: *, found: boolean}}
 */
export function varGetter(ctx, varName, rs, varSearchOptions) {
  varSearchOptions.currentCtxElement++;

  if (isArray(ctx)) {
    for (let theCtx of ctx) {
      const res = varGetter(theCtx, varName, rs, varSearchOptions);
      if (res.found) {
        return res;
      }
    }
    return VAR_NOT_FOUND;
  }

  // Если мы хотим выполнить функцию, которая лежит ниже, пропускаем эту
  if (varSearchOptions.currentCtxElement < varSearchOptions.evalFrom) {
    return VAR_NOT_FOUND;
  }

  if (isFunction(ctx)) {
    const res = ctx(varName, undefined, rs);
    return { value: res, found: res !== undefined };
  }


  if (isHash(ctx)) {                                                                              // получить значение
    if (Object.hasOwn(ctx, varName)) {                                                            // Нашлось в хэшмапе
      if (!rs.wantCallable && ctx[$IS_LIB$] && rs.disallowLibFunctionsGetting && isFunction(ctx[varName])) {
        // Для sql строки могут быть заданы без кавычек.
        return VAR_NOT_FOUND;
      }
      return { value: ctx[varName], found: true };
    }
    if (varName.slice(0, 3) !== 'sf:' && isFunction(ctx['sf:' + varName])) {                     // user-defined special form
      return { value: makeSF(ctx['sf:' + varName]), found: true };
    }
    if ($VAR$ in ctx && isFunction(ctx[$VAR$])) {                                                                           // На хэшмапе может быть определена функция
      const res = ctx[$VAR$](ctx, varName, undefined, rs, varSearchOptions);                      // вызываем ее
      if (res !== undefined) {                                                                    // Подходящее значение нашлось
        return { value: res, found: true };
      }
    }
  }
  return VAR_NOT_FOUND;
}



/**
 * Set existed variable value at
 * Get variable from context
 * Get variable from context context
 * @param {Context} ctx
 * @param {string} varName
 * @param {*} value
 * @param {EvalOptions} rs
 * @returns {{value: *, found: boolean, firstNotlib?: ContextObject}}
 */
function varSetter(ctx, varName, value, rs) {

  if (isArray(ctx)) {
    let firstNotlib = undefined;
    for (let theCtx of ctx) {
      const res = varSetter(theCtx, varName, value, rs);
      if (res.found) {
        return res;
      }
      if (res.firstNotlib !== undefined && firstNotlib === undefined) {
        firstNotlib = res.firstNotlib;
      }
    }
    return { ...VAR_NOT_FOUND, firstNotlib };
  }


  if (isFunction(ctx)) {
    const res = ctx(varName, undefined, rs);
    return { value: res, found: res !== undefined };
  }


  if (isHash(ctx)) {
    if (ctx[$IS_LIB$]) {
      return VAR_NOT_FOUND;
    }
    if (Object.hasOwn(ctx, varName)) {
      return { value: (ctx[varName] = value), found: true };
    } else {
      return { ...VAR_NOT_FOUND, firstNotlib: ctx }
    }
  }
  return VAR_NOT_FOUND;
}
