




/**
 * @typedef {Object} GlobalContext
 * @property {'en'|'ru'} LOC
 * @property {number} DEFAULT_MAX_LOOP_ITERATIONS
 */


/** @type {GlobalContext} */
export const GLOBAL_CONTEXT = {
  LOC: 'en',
  DEFAULT_MAX_LOOP_ITERATIONS: 100,
};



///////////////////////////////////////
///////////////////////////////////////
// RETURN THROW
///////////////////////////////////////
///////////////////////////////////////


export class ReturnThrow extends Error {
  value = undefined;
  constructor(/** @type {any} */ value) {
    super(`Unexpected return construction with value [${value}]`);
    this.value = value;
  }
}


/**
 * Ловит return ошибку и возвращает ее значение
 * @param {function} fn
 * @returns
 */
export function catchReturn(fn) {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ReturnThrow) {
      return err.value;
    }
    throw err;
  }
}



///////////////////////////////////////
///////////////////////////////////////
// ISTYPE FUNCTIONS
///////////////////////////////////////
///////////////////////////////////////



/**
 * @param {*} arg
 * @returns {arg is boolean}
 */
export const isBoolean = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент булевым значением.
   *
   * @usage isBool(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isBool(true) => true
   *          isBool(false) => true
   *          isBool(0) => false
   *          isBool("true") => false
   * @category Проверки типов | 12
   */
  return arg === true || arg === false;
};



/** @returns {arg is number} */
export const isNumber = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент числом.
   *
   * @usage isNumber(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isNumber(42) => true
   *          isNumber(3.14) => true
   *          isNumber("42") => false
   *          isNumber(NaN) => true (NaN является числом по typeof)
   * @category Проверки типов | 15
   */
  return (typeof arg === 'number');
}



/** @returns {arg is number | string} */
export const isNumberLike = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент числом или числом-строкой.
   *
   * @usage isNumberLike(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isNumberLike(42) => true
   *          isNumberLike("3.14") => true
   *          isNumberLike({}) => false
   * @category Проверки типов | 16
   */
  return !!(isNumber(arg) || isString(arg) && arg.match(/^(0|[1-9]\d*)(\.\d+)?$/));
};



/** @returns {arg is string} */
export const isString = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент строкой.
   *
   * @usage isString(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isString("hello") => true
   *          isString(123) => false
   *          isString({1, 2}) => false
   * @category Проверки типов | 20
   */
  return (typeof arg === 'string');
};



/** @returns {arg is Array<any>} */
export const isArray = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент массивом.
   *
   * @usage isArray(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isArray({1, 2, 3}) => true
   *          isArray({a = 1}) => false
   *          isArray({1, 2, a = 1}) => true
   *          isArray("hello") => false
   * @category Проверки типов | 25
   */
  return Object.prototype.toString.call(arg) === '[object Array]';
};



/** @returns {arg is Object} */
export const isHash = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент хэш-таблицей (объектом, но не массивом и не null).
   *
   * @usage isHash(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isHash({a = 1, b = 2}) => true
   *          isHash(Hashmap) => true
   *          isHash({}) => false
   *          isHash({1, 2, 3}) => false
   *          isHash({1, 2, 3, a = 1}) => false
   *          isHash(null) => false
   *          isHash("object") => false
   * @category Проверки типов | 26
   */
  return (typeof arg === 'object') && (arg !== null) && !isArray(arg);
};




/** @returns {arg is Object | Array<any>} */
export const isObj = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент хэш-таблицей или массивом (не null).
   *
   * @usage isObj(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isObj({a = 1, b = 2}) => true
   *          isObj(Hashmap) => true
   *          isObj({}) => true
   *          isObj({1, 2, 3}) => true
   *          isObj({1, 2, 3, a = 1}) => true
   *          isObj(null) => false
   *          isObj("object") => false
   * @category Проверки типов | 27
   */
  return isArray(arg) || isHash(arg);
};



/** @returns {arg is Function} */
export const isFunction = (/** @type {any} */ arg) => {
  /**
   * Проверяет, является ли аргумент функцией.
   *
   * @usage isFunction(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isFunction((a, b) => a + b) => true
   *          isFunction(fn({a, b}, a + b)) => true
   *          isFunction(42) => false
   * @category Проверки типов | 30
   */
  return (typeof arg === 'function');
};



/**
 * Является ли это алиасом функции создания Array-like объекта
 * @param {string} funcName
 */
export function isArrayFunction(funcName) {
  return ["[", "list", "array", "vector", "()", "tuple"].includes(funcName)
}




///////////////////////////////////////
///////////////////////////////////////
// MAKE SPETIAL FUNCTIONS
///////////////////////////////////////
///////////////////////////////////////



/**
 * Помечает функцию как "special form"
 *
 * Аргументы функции не будут вычисляться, а вместо этого в функцию будут переданы (ast, ctx, rs)
 * Для вычисления аргументов придется вызывать EVAL.
 *
 * Для того, чтобы использовать результаты вычисления аргументов, нужно оборачивать их в unbox.
 *
 * @example
 * * const add = makeSF((ast, ctx, rs) => {
 * *   // Оборачиваем в unbox, чтобы манипулировать результатами EVAL
 * *   return unbox(
 * *     [EVAL(ast[0], ctx, rs), EVAL(ast[1], ctx, rs)],
 * *     ([a, b]) => a + b,
 * *     rs.streamAdapter,
 * *   );
 * * });
 *
 * @example
 * * const secondArg = makeSF((ast, ctx, rs) => {
 * *   return EVAL(ast[1], ctx, rs);
 * *   // Здесь оборачивать не нужно, т.к. результат вычисления сразу возвращается и мы его не используем
 * * });
 *
 * @param {SpecialFormFunction} fn
 * @returns {ContextFunction}
 */
export function makeSF(fn) {
  fn.__isSpecialForm = true;
  return fn;
}



/**
 * Определяет, что функция является помеченной как "special form"
 * @param {ContextFunction} fn
 * @returns {boolean}
 */
export function isSF(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSpecialForm;
}



/**
 * Создает callback функцию.
 *
 * При возврате в качестве результата контекстной функции этой формы, поиск подходящей функции продолжится так, как будто эта функция не была найдена.
 * При нахождении функции ниже по крнтексту, она вызывается, а ее результат передается в callback функцию в качестве аргумента.
 * Результат callback функции будет возвращен как результат вызова контекстной функции.
 *
 * Вторым аргументом можно передать AST аргументов для нижележащийх функций.
 *
 * @param {(res: any) => any} fn
 * @param {AST=} overridedAst
 * @returns
 */
export function makeSkipForm(fn, overridedAst = undefined) {
  // @ts-ignore
  fn.__isSkipForm = true;
  if (overridedAst) {
    // @ts-ignore Запоминаем новое ast, если функция хочет его изменить для нижележащих функций
    fn.__ast = overridedAst;
  }
  return fn;
}


/**
 * Проверяет, является ли функция skip формой.
 * @param {any} fn
 * @returns
 */
export function isSkip(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSkipForm;
}
