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

import {parse} from './lpep';
import {deparse} from './lped';
import unbox from "./lisp.unbox";
import STD from './lib/std';
import {DATE_TIME} from './lib/datetime';
import makeVararg from "./lisp.vararg";
import { makeDoc, selectPerfectFunctionName } from "./doc";

/**
 * @typedef {Object} EvalOptions
 * @property {boolean=} resolveString Proceed variables to their names <br>`lpe 'x' -> string 'x' (if x is not defined)`
 * @property {any=} streamAdapter Is there any streaming library so lpe can use it
 * @property {boolean=} squareBrackets Should `[Square Brackets]` be interpreted as string
 */



export const isArray = (arg) => {
  /**
   * Проверяет, является ли аргумент массивом
   *
   * @usage isArray(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isArray({1, 2, 3}) => true
   *          isArray({a = 1}) => false
   *          isArray({1, 2, a = 1}) => true
   *          isArray("hello") => false
   * @category Проверки типов | 7
   */
  return Object.prototype.toString.call(arg) === '[object Array]';
};

export const isString = (arg) => {
  /**
   * Проверяет, является ли аргумент строкой
   *
   * @usage isString(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isString("hello") => true
   *          isString(123) => false
   *          isString({1, 2}) => false
   * @category Проверки типов | 8
   */
  return (typeof arg === 'string');
};


export const isNumber = (arg) => {
  /**
   * Проверяет, является ли аргумент числом
   *
   * @usage isNumber(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isNumber(42) => true
   *          isNumber(3.14) => true
   *          isNumber("42") => false
   *          isNumber(NaN) => true (NaN является числом по typeof)
   * @category Проверки типов | 9
   */
  return (typeof arg === 'number');
}


export const isBoolean = (arg) => {
  /**
   * Проверяет, является ли аргумент булевым значением
   *
   * @usage isBoolean(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isBoolean(true) => true
   *          isBoolean(false) => true
   *          isBoolean(0) => false
   *          isBoolean("true") => false
   * @category Проверки типов | 10
   */
  return arg === true || arg === false;
};


export const isHash = (arg) => {
  /**
   * Проверяет, является ли аргумент хешем (объектом, но не массивом и не null)
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
   * @category Проверки типов | 11
   */
  return (typeof arg === 'object') && (arg !== null) && !isArray(arg);
};


export const isFunction = (arg) => {
  /**
   * Проверяет, является ли аргумент функцией
   *
   * @usage isFunction(arg)
   * @param arg [any] Проверяемое значение
   *
   * @example isFunction((a, b) => a + b) => true
   *          isFunction(fn({a, b}, a + b)) => true
   *          isFunction(42) => false
   * @category Проверки типов | 12
   */
  return (typeof arg === 'function');
};


/**
 * Является ли это алиасом функции создания Array-like объекта
 * @param {string} funcName
 * @returns
 */
function isArrayFunction(funcName) {
  return ["[", "list", "array", "vector" /* {} = vector */, "tuple"].includes(funcName)
}


function LPEEvalError(message) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  // this.stack = (new Error()).stack;
}

function makeError(name, ast, message) {
  const errorDescription = JSON.stringify(
      {name: name, message: message, args: deparse([name, ...ast])
        //ast.map(
        //x => x instanceof Array ? `['${x.map(y => y instanceof Array ? [y[0]] : y).join("','")}']` : x)
        },
      ['name', 'message', 'args'],
      4);

  throw new LPEEvalError(errorDescription);
}


/**
 * Этот символ используется как ключ для хэшмапов-контекстов определения контекста.
 * Еслди переменная не была найдена в хэшмаповом контексте, будет произведена попытка вызвать функцию
 * с этим ключом.
 * Функция может вернуть undefined (значение не найдено), либо действительное значение
 *
 * @type {symbol}
 */
export const $VAR$ = Symbol.for('__getitem__');

export const __call__ = Symbol.for('__call__');
export const __getitem__ = Symbol.for('__getitem__');

/**
 * Get or Set variable in context
 * @param {*} ctx - array, hashmap or function that stores variables
 * @param {string} varName - the name of variable
 * @param {*} value - optional value to set (undefined if get)
 * @param {EvalOptions=} options - options on how to resolve. resolveString - must be checked by caller and is not handled here...
 * @param {Record<string, any>=} evalOptions - current evaluate context and options for find endpoint
 */
 export function $var$(ctx, varName, value, options = {}, evalOptions = undefined) {
  let result = undefined;
  if (!evalOptions) {
    evalOptions = { evalFrom: 0, currentCtxElement: 0 }
  }
  evalOptions.currentCtxElement++;   // Инкрементируем шаг
  if (isArray(ctx)) {                                                                               // contexts chain
    for (let theCtx of ctx) {
      result = $var$(theCtx, varName, undefined, options, evalOptions);                             // Пытаемся получить значение из очередного контекста (выставив value=undefined - get-вариант)
      if (result === undefined) continue;                                                           // не найдено - продолжаем искать
      if (value === undefined) return result;                                                       // если вариант get => возвращаем результат
      // Ранее функция вызывалась c value=undefined и мы нашли конекст, в котором есть переменная
      // Значит, в этом контексте можно вызвать set-вариант функции, передав value
      return $var$(theCtx, varName, value, options, evalOptions);
    }
    if (value === undefined) return undefined;                                                      // get => variable not found in all contexts
    if (ctx.length) $var$(ctx[0], varName, value, options, evalOptions);                            // set => set variable to HEAD context
    return undefined;                                                                               // ??? ctx.length = 0
  }

  // Если мы хотим выполнить функцию, которая лежит ниже, пропускаем эту
  if (evalOptions.currentCtxElement < evalOptions.evalFrom) {
    return undefined;
  }

  if (isFunction(ctx)) {
      return ctx(varName, value, options);
  }

  if (isHash(ctx)) {                                                                                // Контекст является хэшмапом
    if (value === undefined) {                                                                      // получить значение
      result = ctx[varName];
      if (result !== undefined) {                                                                   // Нашлось в хэшмапе
        return result;
      }
      if (varName.substr(0, 3) !== 'sf:' && isFunction(ctx['sf:' + varName])) {                     // user-defined special form
        return makeSF(ctx['sf:' + varName]);
      }
      if ($VAR$ in ctx) {                                                                           // На хэшмапе может быть определена функция
        result = ctx[$VAR$](ctx, varName, value, options, evalOptions);                             // вызываем ее
        if (result !== undefined) {                                                                 // Подходящее значение нашлось
          return result;
        }
      }

      return undefined;
    } else {                                                                                        // Установить значение
      // Кажется, здесь надо еще подумать
      return (ctx[varName] = value);
    }
  }

  return undefined;
}


export function makeMacro(fn, ast) {
  fn.ast = ast || [[], {}, [], 1]; // mark as macro
  return fn;
}


function isMacro(fn) {
  if (!isFunction(fn)) return false;
  if (!isArray(fn.ast)) return false;
  return !!fn.ast[3];
}

/**
 * Помечает функцию как "special form" - в этом случае аргументы
 * функции не будут вычисляться, а вместо этого в функцию будут переданы (ast, ctx, options)
 * Для вычисления аргументов придется вызывать EVAL (и оборачивать результаты в unbox)
 *
 * @param {(...args: ?[]) => ?} fn
 * @returns {typeof fn}
 */
export function makeSF(fn) {
  fn.__isSpecialForm = true;
  return fn;
}


/**
 * Помечает функцию как "literal function" - в этом случае
 * функция не будет считаться функцией
 * и AST ["new", "Date"] будет работать как задумано
 *
 *
 * @param {(...args: ?[]) => ?} fn
 * @returns {typeof fn}
 */
export function makeLF(fn) {
  if (isFunction(fn)) {
    fn.__literalFunction = true;
  }
  return fn;
}


export function makeSkipForm(fn, overridedAst = undefined) {
  fn.__isSkipForm = true;
  if (overridedAst) {
    // Запоминаем новое ast, если функция хочет его изменить для нижележащих функций
    fn.__ast = overridedAst;
  }
  return fn;
}

/**
 * Определяет, что функция является помеченной как "special form"
 *
 * @param fn
 * @returns {boolean}
 */
function isSF(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSpecialForm;
}


function isSkip(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSkipForm;
}


function makeLetBindings(ast, ctx, rs) {
  let result = {};
  if (isHash(ast)) {
    for (let varName in ast) {
      result[varName] = EVAL(ast[varName], ctx, rs);
    }
  } else if (isArray(ast) && isString(ast[0])) {
    if(isArrayFunction(ast[0])) {
      ast = ast.slice(1)
    }
    if (isString(ast[0])) {
      result[ast[0]] = EVAL(ast[1], ctx, rs);
    } else if (isArray(ast[0])){
      ast.forEach(pair => isArrayFunction(pair[0]) ? result[pair[1]] = EVAL(pair[2], ctx, rs) : result[pair[0]] = EVAL(pair[1], ctx, rs));
    } else {
      throw new Error('LISP: let expression (1) invalid form in ' + ast);
    }
  } else if (isArray(ast)) {
    ast.forEach(pair => isArrayFunction(pair[0]) ? result[pair[1]] = EVAL(pair[2], ctx, rs) : result[pair[0]] = EVAL(pair[1], ctx, rs));
  } else if (isFunction(ast)) {
    return ast;
  } else {
    throw new Error('LISP: let expression (2) invalid form in ' + ast);
  }
  return result;
}


// if (condition, then, else)
// if (condition, then, condition2, then2, ..., else)
const ifSF = (ast, ctx, options) => {
  /**
   * Получение выражения по условию
   *
   * @usage if(cond1, then1, cond2, then2, ..., else)
   * @param cond [boolean] Условие
   * @param then [any] Выражение, выполняемое если условие истинно
   * @param else [any] Выражение, выполняемое если все условия ложны
   *
   * @usage if(cond1, then1, cond2, then2, ...)
   * @param cond [boolean] Условие
   * @param then [any] Выражение, выполняемое если условие истинно
   *
   * @example if(5 > 3, "больше", 5 < 3, "меньше", "равны") => "больше"
   *          if(5 > 5, "больше", 5 < 5, "меньше", "равны") => "равны"
   *          if(5 > 5, "больше", 5 < 5, "меньше") => undefined
   * @category Управление выполнением | 5
   */
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, options);                                          // one arg - by convention return the argument
  const condition = EVAL(ast[0], ctx, {...options, resolveString: false});
  return unbox(
    [condition],
    ([condition]) => {
      if (condition) {
        return EVAL(ast[1], ctx, options);
      } else {
        return ifSF(ast.slice(2), ctx, options);
      }
    },
    options?.streamAdapter);
}

// do (condition, body)
const doSF = (ast, ctx, options) => {
  /**
   * Выполнение выражения в цикле до тех пор, пока условие выполняется.
   *
   * Если условие отсутствует, выполняется единыжды.
   *
   * Условие вычисляется после выполнения выражения.
   * @usage do(condition, expr)
   * @param condition [boolean] Условие
   * @param expr [any] Выражения для выполнения
   *
   * @usage do(expr)
   * @param expr [any] Выражения для выполнения единыжды
   *
   * @example begin(x := 0,\
   *         |      do(x < 10, x := x + 1)\
   *         |) => 10
   * @category Управление выполнением | 10
   */
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, options);                                          // one arg - by convention return the argument

  let last;
  let condition;

  let iter = 0;
  const maxLoopIterations = options?.maxLoopIterations ?? 65536

  do {
    if (iter >= maxLoopIterations) {
      throw new Error(`The maximum number of iterations (${maxLoopIterations}) is exceeded. Check the condition or change the limit in the settings.`)
    }

    last = EVAL(ast[1], ctx, options);
    condition = EVAL(ast[0], ctx, {...options, resolveString: false});
    iter += 1;
  } while (condition);

  return last;
}

/**
 * Рекурсивный begin
 */
const beginSF = (ast, ctx, options) => {
  /**
   * Последовательно выполняет несколько выражений и возвращает результат последнего
   *
   * @usage begin(...exprs)
   * @param exprs [any] Выражения для выполнения
   *
   * @example begin(println("Hello"), println("World"), 1 + 2) => 3
   *          ## Выведет "Hello", "World" в консоль
   * @category Управление выполнением | 1
   */
  if (ast.length === 0) return null;
  const firstOperator = EVAL(ast[0], ctx, options);
  return unbox(
      [firstOperator],
      ([firstResult]) => ast.length === 1 ? firstResult : beginSF(ast.slice(1), ctx, options),      // Если один аргумент - возвращаем значение
      options?.streamAdapter);
};


const SPECIAL_FORMS = {                                                         // built-in special forms
  'let': makeSF((ast, ctx, rs) => {
    /**
     * Создаёт локальные привязки переменных и выполняет выражения в их контексте
     *
     * @usage let(bindings, ...exprs)
     * @param bindings [array] Список привязок
     * @param exprs [any] Выражения для выполнения в контексте привязок
     *
     * @example let({{"x", 10}, {"y", 20}}, x + y) => 30
     *          let({{"name", "Alice"}}, println("Hello,", name), name) => Alice
     *          ## Вывод в консоль: "Hello, Alice"
     * @category Работа с переменными | 1
     */
    return EVAL(['begin', ...ast.slice(1)], [makeLetBindings(ast[0], ctx, rs), ctx], rs);
  }),


  '`': makeSF((ast, ctx) => ast[0]),                                            // quote
  'macroexpand': makeSF(macroexpand),
  'begin': makeSF(beginSF),
  'do': makeSF(doSF),
  'if': makeSF(ifSF),
  '~': makeSF((ast, ctx, rs) => {                                               // mark as macro
    const f = EVAL(ast[0], ctx, rs);                                            // eval regular function
    f.ast.push(1); // mark as macro
    return f;
  }),


  '.-': makeSF((ast, ctx, options) => {
    /**
     * Получает или устанавливает свойство объекта
     *
     * @usage property(obj, propName)
     * @param obj [object | array] Объект
     * @param propName [string] Имя свойства
     *
     * @usage property(obj, propName, value)
     * @param obj [object | array] Объект
     * @param propName [string] Имя свойства
     * @param value [any] Значение для установки
     *
     * @example property({a = 1}, "a") => 1
     *          property({a = 1}, "b", 2) => 2 ## Значение объекта: { a:1, b:2 }
     * @category Работа с переменными | 12
     */                                                          // get or set attribute
    let [obj, propertyName, value] = [
      EVAL(ast[0], ctx, options),
      isString(ast[1]) ? ast[1] : EVAL(ast[1], ctx, options),
      EVAL(ast[2], ctx, options),
    ];
    return unbox(
        [obj, propertyName, value],
        ([obj, propertyName, value]) => {
          try {
            return (value !== undefined) ? (obj[propertyName] = value) : obj[propertyName];
          } catch (err) {
            return value;                                                             // undefined when 'get'
          }
        },
        options?.streamAdapter);
  }),


  '_call_obj_meth_': makeSF((ast, ctx, rs) => {
    /**
     * Вызывает метод объекта (внутренняя функция для макроса invoke)
     *
     * @usage _call_obj_meth_(obj, method, ...args)
     * @param obj [object] Объект
     * @param method [string] Имя метода
     * @param args [any] Аргументы метода
     *
     * @example _call_obj_meth_([1,2,3], "push", 4) => 4
     *          ## массив становится [1,2,3,4]
     * @category Внутренние функции | 1
     * @tags hidden
     */
    // call object method
    const [obj, methodName, ...args] = ast.map(a => EVAL(a, ctx, rs));
    const fn = obj[methodName];
    return fn.apply(obj, args);
  }),


  'try': makeSF((ast, ctx, rs) => {
    /**
     * Обработка исключений
     *
     * @usage try(expr, errorName, catch)
     * @param expr [any] Выражение для выполнения
     * @param errorName [string] Имя, по которому можно обратиться к объекту исключения
     * @param catch [any] Выражение для выполнения при ошибке
     *
     * @example try(throw("Текст ошибки"), ex, println("Ошибка:", ex)) => Ошибка: Текст ошибки
     * @category Исключения | 2
     */
    // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      const errCtx = env_bind([ast[1]], ctx, [e], rs);
      return EVAL(ast[2], errCtx, rs);
    }
  }),


  '||': makeSF((ast, ctx, rs) => {
    /**
     * Логическое ИЛИ
     *
     * Возвращает true или false
     *
     * > Текстовый оператор `||` парсится в `or`, из-за чего при выполнении `1 || 2` будет вызываться функция `or`.
     * <is-warning />
     * @usage logical-or(...exprs)
     * @param exprs [boolean] Выражения для проверки
     *
     * @category Базовые операторы | 23
     */
    return ast.some(a => !!EVAL(a, ctx, rs))
  }),            // logical or


  '&&': makeSF((ast, ctx, rs) => {
    /**
     * Логическое И
     *
     * Возвращает true или false
     *
     * > Текстовый оператор `&&` парсится в `and`, из-за чего при выполнении `1 && 2` будет вызываться функция `and`.
     * <is-warning />
     * @usage logical-and(...exprs)
     * @param exprs [boolean] Выражения для проверки
     *
     * @category Базовые операторы | 24
     */
    return ast.every(a => !!EVAL(a, ctx, rs));
  }),           // logical and


  'fn': makeSF((ast, ctx, rs) => {
    /**
     * Создаёт анонимную функцию
     *
     * @usage fn(args, body)
     * @param args [array] Список аргументов
     * @param body [any] Тело функции
     *
     * @example fn({x}, x * x) => функция возведения в квадрат
     *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
     * @category Создание объектов | 10
     */
    // define new function (lambda)
    const f = (...args) => EVAL(ast[1], env_bind(ast[0], ctx, args, rs), rs);
    f.ast = [ast[1], ctx, ast[0]];                                              // f.ast compresses more than f.data
    return f;
  }),


  'def': makeSF((ast, ctx, rs) => {
    /**
     * Определяет переменную в текущем контексте
     *
     * @usage def(name, value)
     * @param name [string] Имя переменной
     * @param value [any] Значение
     *
     * @example def(x, 42) => 42
     * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
     * @category Работа с переменными | 2
     */
    // update current environment
    const value = EVAL(ast[1], ctx, rs);
    const result = $var$(ctx, ast[0], value);
    return result;
  }),


  'resolve': makeSF((ast, ctx, rs) => {
    /**
     * Получить значение переменной
     *
     * @usage resolve(name)
     * @param name [string] Имя переменной
     *
     * @example resolve(x) => значение переменной x
     * @category Работа с переменными | 10
     */
    const result = $var$(ctx, ast[0], undefined, rs);
    return result;
  }),


  'set_options': makeSF((ast, ctx, rs) => {
    /**
     * Устанавливает опции выполнения для выражения
     *
     * @usage set_options(options, expr)
     * @param options [object|array] Опции (объект или массив пар ключ-значение)
     * @param expr [any] Выражение для выполнения с опциями
     *
     * @example set_options({wantCallable = true}, minus) => LPE функция "minus"
     *          set_options({{wantCallable, true}}, minus) => LPE функция "minus"
     * @category Управление выполнением | 15
     */
    let options = eval_lisp(ast[0], ctx, rs);
    if (isArray(options)) {
      // [["key1", "val1"], ["key2", "val2"]] => {key1: "val1", key2: "val2"}
      options = Object.fromEntries(options);
    }
    const result = eval_lisp(ast[1], ctx, { ...rs, ...options });
    return result;
  }),


  'eval_lpe': makeSF((ast, ctx, options) => {
    /**
     * Вычисляет LPE-код из строки
     *
     * @usage eval_lpe(str)
     * @param str [string] Строка с LPE-кодом
     *
     * @example eval_lpe("1 + 2") => 3
     * @category Интерпретатор | 4
     */
    const lpeCode = eval_lisp(ast[0], ctx, options);
    const lisp = parse(lpeCode, options);
    const result = eval_lisp(lisp, ctx);
    return result;
  }),


  'filterit': makeSF((ast, ctx, rs) => {
    /**
     * Фильтрует массив с использованием переменных it и idx
     *
     * it - Текущий элемент массива
     * idx - Индекс текущего элемента
     * @usage filterit(array, condition)
     * @param array [array] Исходный массив
     * @param condition [boolean] Условие
     *
     * @example filterit({1, 2, 3, 4}, it > 2 || idx = 0) => [1, 3, 4]
     * @category Работа с объектами | 24
     */
    //console.log("FILTERIT: " + JSON.stringify(ast))
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.filter.call(array, (it, idx) => !!eval_lisp(conditionAST, [{it, idx}, ctx], rs));
    return result;
  }),


  'mapit': makeSF((ast, ctx, rs) => {
    /**
     * Преобразует массив с использованием переменных it и idx
     *
     * it - Текущий элемент массива
     * idx - Индекс текущего элемента
     * @usage mapit(array, transformation)
     * @param array [array] Исходный массив
     * @param transformation [any] Выражение для получения преобразованного значения
     *
     * @example mapit({1, 2, 3}, it * 2) => [2, 4, 6]
     * @example mapit({"a", "b", "c"}, it + idx) => ["a0", "b1", "c2"]
     * @category Работа с объектами | 23
     */
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.map.call(array, (it, idx) => eval_lisp(conditionAST, [{it, idx}, ctx], rs));
    return result;
  }),


  'get_in': makeSF((ast, ctx, rs) => {
    /**
     * Получает значение из вложенной структуры по пути ключей
     *
     * При отсутствии значения по ключу возвращает undefined
     * @usage get_in(obj, keys)
     * @param obj [object|array] Исходная структура
     * @param keys [array] Массив ключей
     *
     * @usage get_in(obj, ...key)
     * @param obj [object|array] Исходная структура
     * @param key [string] Ключ
     *
     * @example get_in({a = {b = {c = 42}}}, {"a", "b"}) => { c: 42 }
     * @example get_in({a = {b = {10, 11, 12}}}, a, b, 2) => 12
     * @category Работа с переменными | 22
     */
    let array = [];
    let hashname;
    //console.log(JSON.stringify(ast))
    if (isArray(ast[0])) {
      hashname = eval_lisp(ast[0], ctx, rs);
    } else {
      hashname = ast[0]
    }

    if (isArray(ast[1]) && isArrayFunction(ast[1][0])) {
        // массив аргументов, ка в классическом get_in в Clojure
        array = eval_lisp(ast[1], ctx, rs);
    } else {
      // просто список ключей в виде аргументов
      [,...array] = ast
      const a = ["["].concat( array );
      array = eval_lisp(a, ctx, rs);
    }

    // но вообще-то вот так ещё круче ["->","a",3,1] // "->" изменён на "."
    // const m = ["->"].concat( array.slice(1).reduce((a, b) => {a.push([".-",b]); return a}, [[".-", ast[0], array[0]]]) );
    const m = [".", hashname].concat( array );
    //console.log('get_in', JSON.stringify(m))
    return eval_lisp(m, ctx, rs);
  }),


  'assoc_in': makeSF((ast, ctx, rs) => {
    /**
     * Устанавливает значение во вложенной структуре по пути ключей
     *
     * @usage assoc_in(obj, keys, value)
     * @param obj [object|array] Целевая структура
     * @param keys [array] Путь ключей
     * @param value [any] Устанавливаемое значение
     *
     * @example begin(\
     *          |  x := Hashmap,\
     *          |  assoc_in(x, {"a", "b", "c"}, 42),\
     *          |) => {c: 42}
     *          ## x == {a: {b: {c: 42}}}
     * @category Работа с переменными | 23
     */
    const array = eval_lisp(ast[1], ctx, {...rs, wantCallable: false});
    // удивительно, но работает set(a . 3 , 2, "Hoy")
    //const m = ["->", ast[0]].concat( array.slice(0,-1) );
    //const e = ["set", m, array.pop(), ast[2]]
    // первый аргумент в ast - ссылка на контекст/имя переменной
    //console.log('assoc_in var:', JSON.stringify(ast))
    // let focus = $var$(ctx, ast[0], undefined, {...rs, wantCallable: false});
    let focus = EVAL(ast[0], ctx, {...rs, wantCallable: false});
    for (var i = 0; i < array.length-1; i++) {
      if (focus[array[i]] === undefined) {
        // нужно создать
        if (isString(array[i+1])) {
          focus = focus[array[i]] = {}
        } else {
          focus = focus[array[i]] = []
        }
      } else {
        focus = focus[array[i]]
      }
    }
    const e = ["set", focus, array.pop(), ast[2]]
    //console.log(JSON.stringify(e), JSON.stringify(eval_lisp(e, ctx, rs)))
    return eval_lisp(e, ctx, rs);
  }),


  'cp': makeSF((ast, ctx, rs) => {
    /**
     * Копирует значение из одной вложенной структуры в другую
     *
     * Работает как `assoc_in(to, get_in(from))`
     * @usage cp(from, to)
     * @param from [array] Путь к источнику [source, key1, key2, ...]
     * @param to [array] Путь к назначению [target, key1, key2, ...]
     *
     * @example begin(\
     *          |  x := { a = {b = 10} },\
     *          |  y := { c = {d = 12} },\
     *          |  cp({ x, "a", "b" }, { y, "c", "f"})\
     *          |) => { d: 12, f: 10 }
     *          ## y = { c: { d: 12, f: 10 } }
     * @category Работа с переменными | 24
     */
    const from = EVAL(ast[0], ctx, {...rs, wantCallable: false})
    const to = EVAL(ast[1], ctx, {...rs, wantCallable: false})
    //console.log(`CP ${JSON.stringify(from)} to `, JSON.stringify(to))
    const lpe = ["assoc_in", to[0], ["["].concat(to.slice(1)), ["get_in", from[0], ["["].concat(from.slice(1))]]
    //console.log('CP', JSON.stringify(ast))
    return EVAL(lpe, ctx, rs);
  }),


  'ctx': makeSF((ast, ctx, rs) => {
    /**
     * Получить объект с переменными
     *
     * @usage ctx(...key)
     * @param key [string] Имя переменной
     *
     * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
     *          ctx("x") ## Ошибка: в функции ctx нельзя использовать выражения
     * @category Работа с переменными | 5
     */
    //FIXME will work only for single keys, we want: ctx(k1,k2,k3.df)
    let ret = {}
    ast.map(k=>ret[k]=$var$(ctx, k, undefined, rs))
    return ret
  })
};


export const STDLIB = {
  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,                                                                // js specific
  'true': true,
  'false': false,
  'Array': makeLF(Array),                                                               // TODO: consider removing these properties
  'Object': makeLF(Object),
  'Hashmap': {},
  'Date': makeLF(Date),

  'console': console,
  'JSON': makeLF(JSON),

  // datetime fn
  ...STD,
  ...DATE_TIME,

  // special forms
  ...SPECIAL_FORMS,

  // built-in functions
  '=': (...args) => {
    /**
     * Проверяет на равенство всех аргументов первому аргументу
     * @usage eq(compared, ...agrs)
     * @param compared [any] Значение, с которым сравниваем
     * @param args [any] Значение, которое сравниваем
     * @example eq(1, 2, 1) => false
     *          eq(1, 1, 1, 1) => true
     *          1 = 3 => false
     * @category Базовые операторы | 6
     */
    return args.every(v => v == args[0]);
  },


  '+': (...args) => {
    /**
     * Складывает аргументы
     * @usage add(...agrs)
     * @param args [any] Значение для сложения
     * @example add(1, 2, 1) => 4
     *          add(1, '1', 1, 1) => '1111'
     *          1 + 3 => 4
     * @category Базовые операторы | 2
     */
    return args.reduce((a, b) => {
      if (typeof a === "function") {
        a = "undefined";
      }

      if (typeof b === "function") {
        b = "undefined";
      }
      return a + b;
    });
  },


  '-': (...args) => {
    /**
     * Вычитает из первого аргумента остальные
     *
     * Если аргумент один, его значение инвертируется
     * @usage minus(value, ...agrs)
     * @param value [number] Уменьшаемое
     * @param args [number] Вычитаемое
     * @usage minus(value)
     * @param value [number] Значение для инвертирования
     * @example minus(1, 2, 1) => -2
     *          minus(5) => -5
     *          1 - 3 => -2
     * @category Базовые операторы | 3
     */
    return args.length === 1 ? -args[0] : args.reduce((a, b) => a - b);
  },


  '*': (...args) => {
    /**
     * Умножает аргументы
     *
     * @usage multiply(...args)
     * @param args [number] Число для умножения
     * @example multiply(2, 3, 4) => 24
     *          2 * 3 * 4 => 24
     * @category Базовые операторы | 4
     */
    return args.reduce((a, b) => a * b);
  },


  '/': (...args) => {
    /**
     * Делит первый аргумент на остальные
     *
     * Если аргумент один, возвращает обратное число
     * @usage div(value, ...args)
     * @param value [number] Делимое
     * @param args [number] Делитель
     *
     * @usage div(value)
     * @param value [number] Число для получения обратного значения
     *
     * @example div(10, 2, 5) => 1
     *          div(5) => 0.2
     *          10 / 2 / 5 => 1
     * @category Базовые операторы | 5
     */
    return args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b);
  },


  '<': (...args) => {
    /**
     * Проверяет, что каждый последующий аргумент больше предыдущего
     *
     * @usage lt(...args)
     * @param args [number] Число для сравнения
     *
     * @example lt(1, 2, 3) => true
     *          lt(1, 3, 2) => false
     *          1 < 2 < 3 => true
     * @category Базовые операторы | 8
     */
    return args.every((v, i) => i === 0 ? true : args[i-1] < args[i]);
  },


  '>': (...args) => {
    /**
     * Проверяет, что каждый последующий аргумент меньше предыдущего
     *
     * @usage gt(...args)
     * @param args [number] Число для сравнения
     *
     * @example gt(3, 2, 1) => true
     *          gt(3, 1, 2) => false
     *          3 > 2 > 1 => true
     * @category Базовые операторы | 9
     */
    return args.every((v, i) => i === 0 ? true : args[i-1] > args[i]);
  },


  '<=': (...args) => {
    /**
     * Проверяет, что каждый последующий аргумент больше или равен предыдущему
     *
     * @usage le(...args)
     * @param args [number] Числа для сравнения
     *
     * @example le(1, 2, 2, 3) => true
     *          le(1, 3, 2) => false
     *          1 <= 2 <= 2 <= 3 => true
     * @category Базовые операторы | 10
     */
    return args.every((v, i) => i === 0 ? true : args[i-1] <= args[i]);
  },


  '>=': (...args) => {
    /**
     * Проверяет, что каждый последующий аргумент меньше или равен предыдущему
     *
     * @usage ge(...args)
     * @param args [number] Числа для сравнения
     *
     * @example ge(3, 2, 2, 1) => true
     *          ge(3, 1, 2) => false
     *          3 >= 2 >= 2 >= 1 => true
     * @category Базовые операторы | 11
     */
    return args.every((v, i) => i === 0 ? true : args[i-1] >= args[i]);
  },


  '!=': (...args) => {
    /**
     * Проверяет, что не все аргументы равны первому
     *
     * @usage neq(compared, ...args)
     * @param compared [any] Значение для сравнения
     * @param args [any] Значения для сравнения
     *
     * @example ne(1, 2, 3) => true
     *          ne(1, 1, 2) => true
     *          ne(1, 1, 1) => false
     *          1 != 2 => true
     * @category Базовые операторы | 7
     */
    return !args.every(v => v == args[0]);
  },


  ':=': makeSF((ast, ctx, rs) => {
    /**
     * Оператор присваивания. Возвращает значение переменной после присваивания
     *
     * Поддерживает присваивание в переменные и в свойства объектов/массивов
     *
     * @usage assign(lvalue, rvalue)
     * @param lvalue [any] Левая часть присваивания (переменная или путь к свойству)
     * @param rvalue [any] Присваиваемое значение
     *
     * @example assign(x, 10) => 10
     *          assign(obj.key, 20) => 20  ## obj ==> { key: 20 }
     *          obj.a := (obj.b := 10) => 10  ## obj ==> { a: 10, b: 10 }
     * @category Базовые операторы | 1
     */
    if (isArray(ast[0])) {
      if (ast[0][0] !== ".") {
        makeError(":=", ast, 'Left operand of ":=" must be lvalue!');
      }
      let val = isArray(ast[0][1]) ? eval_lisp(ast[0][1], ctx, rs) : $var$(ctx, ast[0][1]);
      for (let i = 2; i < ast[0].length - 1; ++i) {
        let key = eval_lisp(ast[0][i], ctx, rs);
        val[key] = val[key] || {};
        val = val[key];
      }
      return (val[eval_lisp(ast[0][ast[0].length - 1], ctx, rs)] = eval_lisp(ast[1], ctx, rs));
    }
    return $var$(ctx, ast[0], eval_lisp(ast[1], ctx, rs));
  }),
//  "'": a => `'${a}'`,


  'RegExp': (...args) => {
    /**
     * Создаёт регулярное выражение
     *
     * @usage regexp(pattern, flags)
     * @param pattern [string] Шаблон регулярного выражения
     * @param flags [string] Флаги регулярного выражения
     *
     * @example regexp("[0-9]+", "g") => /[0-9]+/g
     * @category Создание объектов | 30
     */
    return RegExp.apply(RegExp, args);
  },


  'count': (a) => {
    /**
     * Возвращает длину массива или строки
     *
     * @usage count(obj)
     * @param obj [array|string] Объект для подсчёта длины
     *
     * @example count([1, 2, 3]) => 3
     *          count("hello") => 5
     * @category Работа с объектами | 30
     */
    return a.length;
  },


  'del': (a, b) => {
    /**
     * Удаляет свойство из объекта
     *
     * @usage del(obj, key)
     * @param obj [hashmap] Объект
     * @param key [string] Ключ для удаления
     *
     * @example del({"a"=1, "b"=2}, "a") => true
     * @category Работа с переменными | 13
     */
    return delete a[b];
  },
  // 'del': (a, b) => Reflect.deleteProperty(a, b),

  'isa': (a, b) => {
    /**
     * Проверяет, является ли объект экземпляром класса
     *
     * @usage isa(obj, class)
     * @param obj [any] Проверяемый объект
     * @param class [any] Класс
     *
     * @example isa({1,2,3}, Array) => true
     * @category Проверки типов | 1
     */
    return a instanceof b;
  },


  'type': a => {
    /**
     * Возвращает тип значения
     *
     * @usage type(value)
     * @param value [any] Проверяемое значение
     *
     * @example type(123) => "number"
     *          type("hello") => "string"
     * @category Проверки типов | 2
     */
    return typeof a;
  },


  'new': (...args) => {
    /**
     * Создаёт новый экземпляр класса
     *
     * @usage new(class, ...args)
     * @param class [function] Класс
     * @param args [any] Аргументы конструктора
     *
     * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
     * @category Создание объектов | 20
     */
    return new (args[0].bind.apply(args[0], args));
  },


  'not': a => {
    /**
     * Логическое отрицание
     *
     * @usage not(value)
     * @param value [any] Значение для отрицания
     *
     * @example not true => false
     *          not(false) => true
     *          not 0 => true
     * @category Базовые операторы | 20
     */
    return !a;
  },


  'list': (...args) => {
    /**
     * Создаёт список (массив) из аргументов
     *
     * @usage list(...args)
     * @param args [any] Элементы списка
     *
     * @example list(1, 2, 3) => [1, 2, 3]
     *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
     * @category Создание объектов | 1
     */
    return args;
  },


  'vector': makeVararg([], (args, kwargs) => {
    /**
     * Создаёт гибридный массив (kwargs array) из аргументов.
     *
     * При передаче именнованных аргументов добавляет их как именованные свойства.
     *
     * При отсутствии kwargs создаёт обычный массив.
     * При отсутствии args создаёт Hashmap.
     * @usage vector(...args, ...kwargs)
     * @param args [any] Элементы позиционного массива
     * @param kwargs [any] Именованные элементы объекта
     *
     * @example vector(1, 2, 3) => [1, 2, 3]
     *          vector(1, 2, a = 3, b = 4) => [1, 2, a: 3, b: 4]
     *          vector(a = 3, b = 4) => {a: 3, b: 4}
     * @category Создание объектов | 3
     */
    return Object.keys(kwargs).length ? args.length ? Object.assign(args, kwargs) : kwargs : args;
  }),


  'tuple': makeVararg([], (args, kwargs) => {
    /**
     * Создаёт гибридный массив (kwargs array) из аргументов
     *
     * При передаче именнованных аргументов добавляет их как именованные свойства
     * @usage tuple(...args, ...kwargs)
     * @param args [any] Элементы позиционного массива
     * @param kwargs [any] Именованные элементы объекта
     *
     * @example tuple(1, 2, 3, a=1, b=2) => [1, 2, 3, a: 1, b: 2]
     *          tuple(1, 2, 3) => [1, 2, 3]
     *          tuple(a=1, b=2) => [a: 1, b: 2] ## Является массивом
     *          (1, 2, 3) => [1, 2, 3] ## Перечисление в скобказ является вызовом функции tuple
     * @category Создание объектов | 2
     */
    return Object.assign(args, kwargs);
  }),


  // Qk functions
  'pick': makeVararg(['n:int'], (n, args) => args[n - 1]),                                          // The pick function returns the n:th expression in the list. n is an integer between 1 and N.
  //

  'map': makeSF((ast, ctx, rs) => {
    /**
     * Применяет функцию к каждому элементу массива
     *
     * В качестве функции можно использовать имя LPE функции
     * @usage map(arr, fn)
     * @param arr [array] Массив
     * @param fn [function] Функция для применения
     *
     * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
     *          map({1, 2, 3}, minus) => [-1, -2, -3]
     * @category Работа с объектами | 20
     */
      let arr = eval_lisp(ast[0], ctx,  {...rs, wantCallable: false});
      rs.wantCallable = true;
      let fn = eval_lisp(ast[1], ctx,  {...rs, wantCallable: true});
      return isArray(arr) ? arr.map(it => fn(it)) : [];
  }),


  'filter': (arr, fn) => {
    /**
     * Фильтрует массив по предикату
     *
     * @usage filter(arr, predicate)
     * @param arr [array] Массив
     * @param predicate [function] Функция-предикат
     *
     * @example filter([1, 2, 3, 4], fn({a}, a > 2)) => [3, 4]
     * @category Работа с объектами | 21
     */
    return isArray(arr) ? arr.filter(it => fn(it)) : [];
  },


  'throw': a => {
    /**
     * Выбрасывает исключение
     *
     * @usage throw(error)
     * @param error [string] Ошибка для выбрасывания
     *
     * @example throw("Error message")
     * @category Исключения | 1
     */
    throw(a);
  },


  'identity': a => {
    /**
     * Возвращает переданный аргумент
     *
     * @usage identity(value)
     * @param value [any] Значение
     *
     * @example identity(5) => 5
     * @category Работа с объектами | 1
     */
    return a;
  },


  'pluck': (c, k) => {
    /**
     * Извлекает значение свойства из каждого элемента массива
     *
     * @usage pluck(array, key)
     * @param array [array] Массив объектов
     * @param key [string] Ключ свойства
     *
     * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
     * @category Работа с объектами | 26
     */
    // for each array element, get property value, present result as array.
    return isArray(c) ? c.map(el => el[k]) : [];
  },


  'read-string': a => {
    /**
     * Преобразует JSON-строку в объект
     *
     * @usage json_parse(str)
     * @param str [string] JSON-строка
     *
     * @example json_parse('{"a": 1}') => {a: 1}
     * @category Преобразование типов | 13
     */
    return JSON.parse(a);
  },


  'rep': (a) => {
    /**
     * Вычисляет AST и возвращает JSON-представление результата
     *
     * @usage rep(str)
     * @param str [string] Строка с LPE-кодом
     *
     * @example rep('["+", 1, 2]') => "3"
     * @category Интерпретатор | 1
     */
    // TODO: fix ctx and rs arguments
    return JSON.stringify(EVAL(JSON.parse(a), STDLIB));
  },


  'null?': (a) => {
    /**
     * Проверяет, является ли значение null или undefined
     *
     * @usage isNull(value)
     * @param value [any] Проверяемое значение
     *
     * @example isNull(null) => true
     *          isNull(undefined) => true
     *          isNull(0) => false
     * @category Проверки типов | 3
     */
    // ??? add [] ???
    return a === null || a === undefined;
  },


  'true?': (a) => {
    /**
     * Проверяет, является ли значение true
     *
     * @usage isTrue(value)
     * @param value [any] Проверяемое значение
     *
     * @example isTrue(true) => true
     *          isTrue(1) => false
     * @category Проверки типов | 4
     */
    return a === true;
  },


  'false?': (a) => {
    /**
     * Проверяет, является ли значение false
     *
     * @usage isFalse(value)
     * @param value [any] Проверяемое значение
     *
     * @example isFalse(false) => true
     *          isFalse(0) => false
     * @category Проверки типов | 5
     */
    return a === false;
  },


  'string?': isString,
  'list?': isArray,


  'contains?': (a, b) => {
    /**
     * Проверяет, содержит ли объект указанное свойство
     *
     * @usage contains(obj, key)
     * @param obj [object] Объект
     * @param key [string] Ключ
     *
     * @example contains({a = 1}, "a") => true
     * @category Работа с переменными | 11
     */
    return a.hasOwnProperty(b);
  },


  'str': (...args) => {
    /**
     * Преобразует аргументы в строку и объединяет
     *
     * @usage str(...args)
     * @param args [any] Значения для преобразования
     *
     * @example str(1, 2, 3) => "123"
     *          str("a", 1) => "a1"
     *          str("a", {1,2,3}) => "a[1,2,3]"
     * @category Преобразование типов | 12
     */
    return args.map(x => isString(x) ? x : isFunction(x) ? x.lpeName : JSON.stringify(x)).join('');
  },


  'get': (a, b) => {
    /**
     * Получает значение свойства объекта
     *
     * @usage get(obj, key)
     * @param obj [object] Объект
     * @param key [string | number] Ключ
     *
     * @example get({a: 1}, "a") => 1
     * @category Работа с переменными | 20
     */
    return a.hasOwnProperty(b) ? a[b] : undefined;
  },


  'set': (a, b, c) => {
    /**
     * Устанавливает значение свойства объекта и возвращает объект
     *
     * @usage set(obj, key, value)
     * @param obj [object] Объект
     * @param key [string] Ключ
     * @param value [any] Значение
     *
     * @example set(Hashmap, "a", 1) => {a: 1}
     *          set({}, 0, 1) => [1]
     * @category Работа с переменными | 21
     */
    return (a[b] = c, a);
  },


  'keys': (a) => {
    /**
     * Возвращает массив ключей объекта
     *
     * @usage keys(obj)
     * @param obj [object] Объект
     *
     * @example keys({a = 1, b = 2}) => ["a", "b"]
     *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
     * @category Работа с объектами | 27
     */
    return Object.keys(a);
  },


  'vals': (a) => {
    /**
     * Возвращает массив значений объекта
     *
     * @usage vals(obj)
     * @param obj [object] Объект
     *
     * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
     * @category Работа с объектами | 28
     */
    return Object.values(a);
  },


  'rest': (a) => {
    /**
     * Возвращает все элементы массива кроме первого
     *
     * @usage rest(array)
     * @param array [array] Массив
     *
     * @example rest({1, 2, 3}) => [2, 3]
     *          rest({1, 2, 3, a = 1}) => [2, 3] ## Исключает именованые аргументы
     * @category Работа с объектами | 32
     */
    return a.slice(1);
  },


  'split': makeSF((ast, ctx, rs) => {
    /**
     * Разбивает строку по разделителю
     *
     * @usage split(str, separator)
     * @param str [string] Строка
     * @param separator [string] Разделитель
     *
     * @example split("a,b,c", ",") => ["a", "b", "c"]
     * @category Работа с объектами | 10
     */
    let str = eval_lisp(ast[0], ctx,  {...rs, wantCallable: false});
    let sep = eval_lisp(ast[1], ctx,  {...rs, wantCallable: false});
    return str.split(sep);
  }),


  'println': (...args) => {
    /**
     * Выводит значения в консоль
     *
     * @usage println(...args)
     * @param args [any] Значения для вывода
     *
     * @example println("Hello", "World") => Hello World
     * @category Вывод | 1
     */
    return console.log(args.map(x => isString(x) ? x : JSON.stringify(x)).join(' '));
  },


  'prn': (...args) => {
    /**
     * Выводит JSON-представление значений в консоль. Строки оборачиваются в двойные кавычки.
     *
     * @usage prn(...args)
     * @param args [any] Значения для вывода
     *
     * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
     * @category Вывод | 2
     */
    return console.log(args.map((x) => JSON.stringify(x)).join(' '));
  },


  'empty?': (a) => {
    /**
     * Проверяет, является ли массив пустым
     *
     * @usage empty(array)
     * @param array [array] Массив
     *
     * @example empty([]) => true
     *          empty([1, 2]) => false
     * @category Работа с объектами | 31
     */
    return isArray(a) ? a.length === 0 : false;
  },


  'cons': (a, b) => {
    /**
     * Добавляет элемент в начало массива
     *
     * @usage cons(element, array)
     * @param element [any] Элемент
     * @param array [array] Массив
     *
     * @example cons(1, {2, 3}) => [1, 2, 3]
     * @category Работа с объектами | 33
     */
    return [].concat([a], b);
  },


  'slice': (a, b, ...end) => {
    /**
     * Возвращает срез массива
     *
     * @usage slice(array, start)
     * @param array [array] Массив
     * @param start [number] Начальный индекс
     *
     * @usage slice(array, start, end)
     * @param array [array] Массив
     * @param start [number] Начальный индекс
     * @param end [number] Конечный индекс
     *
     * @example slice({1, 2, 3, 4}, 1, 3) => [2, 3]
     *          slice({1, 2, 3, 4}, 1) => [2, 3, 4]
     * @category Работа с объектами | 34
     */
    return isArray(a) ? a.slice(b, end.length > 0 ? end[0] : a.length) : [];
  },


  'first': (a) => {
    /**
     * Возвращает первый элемент массива
     *
     * @usage first(array)
     * @param array [array] Массив
     *
     * @example first({1, 2, 3}) => 1
     *          first({}) => null
     * @category Работа с объектами | 37
     */
    return a.length > 0 ? a[0] : null;
  },


  'last': (a) => {
    /**
     * Возвращает последний элемент массива
     *
     * @usage last(array)
     * @param array [array] Массив
     *
     * @example last({1, 2, 3}) => 3
     *          last({}) => undefined
     * @category Работа с объектами | 38
     */
    return a[a.length - 1];
  },


  'sort': (a, fn) => {
  /**
   * Сортирует массив
   *
   * Поддерживает два варианта вызова:
   * 1. Без функции сравнения (стандартная сортировка)
   * 2. С функцией сравнения для пользовательского порядка
   *
   * Функция изменяет исходный массив (сортирует на месте)
   *
   * Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!)
   * @usage sort(array)
   * @param array [array] Массив для сортировки
   *
   * @usage sort(array, compareFn)
   * @param array [array] Массив для сортировки
   * @param compareFn [function] Функция сравнения формата (a, b) => число
   *                             Если функция возвращает:
   *                             - отрицательное: a идёт перед b
   *                             - положительное: b идёт перед a
   *                             - 0: порядок не меняется
   *
   * @example sort({3, 1, 2}) => [1, 2, 3]
   *          sort({5, 2, 8, 1}) => [1, 2, 5, 8]
   *          sort({"banana", "apple", "cherry"}) => ["apple", "banana", "cherry"]
   *
   * @example sort({5, 2, 8, 1}, (a, b) => a - b) => [1, 2, 5, 8]  (по возрастанию)
   *          sort({5, 2, 8, 1}, (a, b) => b - a) => [8, 5, 2, 1]  (по убыванию)
   *
   *          sort(\
   *          |  { {1, 2}, {3, 1}, {2, 3} },\
   *          |  (a, b) => first(a) - first(b)\
   *          |) => [[1, 2], [2, 3], [3, 1]] (по первому элементу)
   *
   *          sort(\
   *          |  { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },\
   *          |  (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)\
   *          |) => [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
   * @category Работа с объектами | 25
   */
    return isArray(a) ? a.sort(fn) : [];
  },


  // https://stackoverflow.com/questions/1669190/find-the-min-max-element-of-an-array-in-javascript
  // only for numbers!
  'max': (a) => {
    /**
     * Находит максимальное число в массиве
     *
     * @usage max(array)
     * @param array [array] Массив чисел
     *
     * @example max({1, 5, 2, 8, 3}) => 8
     * @category Математические функции | 10
     */
    return isArray(a) ? a.reduce(function (p, v) {return ( p > v ? p : v );}) : [];
  },


  'min': (a) => {
    /**
     * Находит минимальное число в массиве
     *
     * @usage min(array)
     * @param array [array] Массив чисел
     *
     * @example min([1, 5, 2, 8, 3]) => 1
     * @category Математические функции | 11
     */
    return isArray(a) ? a.reduce(function (p, v) {return ( p < v ? p : v );}) : [];
  },


  'apply': (f, ...b) => {
    /**
     * Применяет функцию к списку аргументов
     *
     * @usage apply(fn, ...args)
     * @param fn [function] Функция
     * @param args [any] Аргументы функции
     *
     * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
     * @category Базовые операторы | 41
     */
    return f.apply(f, b)
  },


  'concat': (...a) => {
    /**
     * Конкатинирует массивы
     *
     * @usage concat(...arrays)
     * @param arrays [array] Массивы для объединения
     *
     * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
     *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
     *          ## Исключает именованные элементы
     * @category Работа с объектами | 35
     */
    return [].concat.apply([], a)
  },


  'pr_str': (...a) => {
    /**
     * Преобразует значения в JSON-строки и объединяет через пробел
     *
     * @usage pr_str(...args)
     * @param args [any] Значения
     *
     * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
     * @category Преобразование типов | 11
     */
    return a.map(x => JSON.stringify(x)).join(' ');
  },


  'classOf': (a) => {
    /**
     * Возвращает имя класса объекта
     *
     * @usage classOf(obj)
     * @param obj [any] Объект
     *
     * @example classOf({}) => "[object Array]"
     * @category Проверки типов | 6
     */
    return Object.prototype.toString.call(a);
  },


  'join': (a, sep) => {
    /**
     * Объединяет элементы массива в строку через разделитель
     *
     * @usage join(array, separator)
     * @param array [array] Массив
     * @param separator [string] Разделитель
     *
     * @example join({1, 2, 3}, "-") => "1-2-3"
     * @category Работа с объектами | 11
     */
    return isArray(a) ? Array.prototype.join.call(a, sep) : '';
  },


  'rand': () => {
    /**
     * Возвращает случайное число от 0 до 1
     *
     * @usage rand()
     *
     * @example rand() => 0.123456789
     * @category Математические функции | 7
     */
    return Math.random()
  },


  // operator from APL language
  '⍴': (len, ...values) => {
    /**
     * Создаёт массив заданной длины, заполняя его значениями по циклу
     *
     * @usage reshape(len, ...values)
     * @param len [number] Длина массива
     * @param values [any] Значения для заполнения
     *
     * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
     * @category Создание объектов | 4
     */
    return Array.apply(null, Array(len)).map((a, idx) => values[idx % values.length]);
  },


  re_match: (t,r,o) => {
    /**
     * Проверяет соответствие строки регулярному выражению. Возвращает попадания.
     *
     * @usage re_match(text, regexp)
     * @param text [string] Текст
     * @param regexp [string] Регулярное выражение
     *
     * @usage re_match(text, regexp, flags)
     * @param text [string] Текст
     * @param regexp [string] Регулярное выражение
     * @param flags [string] Флаги
     *
     * @example re_match("hello123", "[a-z]+", "g") => ["hello"]
     *          re_match("hello123", "[!]+", "g") => null
     *          re_match("hello123", "[a-z]+") => ReMath object
     *          re_match("test(aaa)", "\\((.*)\\)").0 => '(aaa)'
     *          re_match("test(aaa)", "\\((.*)\\)").1 => 'aaa'
     *          re_match("hello123", "[!]+") => null
     * @category Работа со строками | 3
     */
    return t.match(new RegExp(r,o));
  },


  // not implemented yet
  // 'hash-table->alist'
  '"' : makeSF((ast, ctx, rs) => {
    /**
     * Оператор строки или получения переменной
     *
     * @usage "value"
     * @param value [string] Значение
     *
     * @usage _"variable"
     * @param variable [string] Имя переменной
     *
     * @example "hello" => "hello"
     *          begin(x := 12, _"x") => 12
     *          begin(x := 12, q("x", "_")) => 12
     * @category Базовые операторы | 29
     */
    if (ast[1] === '_') return $var$(ctx, ast[0]);
    else return String(ast[0]);
  }),


  '[]': makeSF((ast, ctx, rs) => {
    /**
     * Преобразовать в строку AST дерево выражения
     *
     * @usage astToString(value)
     * @param value [any] Значение
     *
     * @example astToString(123) => "123"
     *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
     * @category Преобразование типов | 10
     */
    return String(ast[0]);
  }),

  // macros
 // '()': makeMacro((...args) => ['begin', ...args]), from 2022 It is just grouping of expressions
  '()': makeMacro(args => {
    /**
     * Возвращает первый аргумент
     * @usage firstArg(...args)
     * @param args [any] Выражения
     *
     * @example firstArg(1, 2, 3) => 1
     * @category Макросы | 1
     */
    return args
  }),


  '.': makeMacro((acc, ...ast) => {
    /**
     * Если правый аргумент - вызов функции, позволяет выполнять последовательные вызовов (thread-first)
     *
     * Подставляет результат левого выражения первым аргументом в следующий вызов
     *
     * Если правый аргумент - числовая или строковая константа,
     * пытаемся взять значение объекта левого выражения по ключю правого выражения
     *
     * @usage explression.func(...args)
     * @param explression [any] Значение, подставляемое первым аргументом в функцию
     * @param func [function] Вызываемая функция
     * @param args [any] Остальные аргументы функции
     *
     * @usage obj.key
     * @param obj [object | array] Объект из которого необходимо взять значение по ключу
     * @param key [string | number] Ключ (строковая константа должна быть без кавычек)
     *
     * @example date.dateShift(-1, "m").toStart("m") => Дата начала предыдущего месяца
     * @example {1, 2, 3}.1 => 2
     *          {a = 2, b = 3}.b => 3
     * @category Базовые операторы | 30
     */
    // thread first macro
    // императивная лапша для макроса ->
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    // AST[["filterit",[">",1,0]]]
    //console.log("---------> " +JSON.stringify(acc) + " " + JSON.stringify(ast));

    for (let arr of ast) {
      if (!isArray(arr)) {
        arr = [".-", acc, arr];                                                 // это может быть обращение к хэшу или массиву через индекс или ключ....
      } else if (arr[0] === "()" && arr.length === 2 && (isString(arr[1]) || isNumber(arr[1]))) {
        arr = [".-", acc, arr[1]];
      } else {
        arr = arr.slice(0);                                                     // must copy array before modify
        arr.splice(1, 0, acc);
        //console.log("AST !!!!" + JSON.stringify(arr))
        // AST[["filterit",[">",1,0]]]
        // AST !!!!["filterit","locations",[">",1,0]]
        // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }
      acc = arr;
    }
    //console.log("AST !!!!" + JSON.stringify(acc))
    if (!isArray(acc)){
      return ["resolve", acc]
    }
    return acc;
  }),


  '..': makeMacro((acc, ...ast) => {
    /**
     * Позволяет выполнять последовательных вызовов (thread-last)
     *
     * Подставляет предыдущий результат последним аргументом в следующий вызов
     *
     * @usage expression->>func(...args)
     * @param explression [any] Значение, подставляемое последним аргументом в функцию
     * @param func [function] Вызываемая функция
     * @param args [any] Остальные аргументы функции
     *
     * @example fn({a}, a * 2)->>map({1, 2, 3}) => [2, 4, 6]
     *          ## Выполняется аналогично "map({1, 2, 3}, fn({a}, a * 2))"
     * @category Базовые операторы | 31
     */
    // thread last macro
    // императивная лапша для макроса ->>
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    for (let arr of ast) {
      arr.push(acc);
      acc = arr;
    }
    return acc;
  }),


  'invoke': makeMacro((...ast) => {
    /**
     * Вызова метода объекта
     *
     * @usage invoke(obj, method, ...args)
     * @param obj [object] Объект
     * @param method [string] Имя метода
     * @param args [any] Аргументы метода
     *
     * @example invoke({1, 2, 3}, "toString") => "1,2,3"
     *          invoke({1, 2, 3}, concat, {4, 5, 6}) => [1,2,3,4,5,6]
     *          invoke({1, 2, 3}, "con" + "cat", {4, 5, 6}) => [1,2,3,4,5,6]
     * @category Базовые операторы | 40
     */
    /// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
    /// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
    /// invoke хорошо стыкуется с ->
    ast.splice(0, 0, "_call_obj_meth_");
    return ast;
  }),


  'and': makeMacro((...ast) => {
    /**
     * Логического И
     *
     * Вычисляет аргументы последовательно, возвращая первое ложное значение
     * или последнее истинное
     *
     * Аргументы после первого ложного значения не вычисляются
     * @usage and(...exprs)
     * @param exprs [boolean] Выражения
     *
     * @example and(5 > 3, 2 < 4) => true
     *          5 > 3 and 2 < 4 and 10 => 10
     * @category Базовые операторы | 21
     */
    if (ast.length === 0) return true;
    if (ast.length === 1) return ast[0];
    return ["let", ["__and", ast[0]],
                   ["if", "__and",
                          ["and"].concat(ast.slice(1)),
                          "__and"]];
  }),


  'or': makeMacro((...ast) => {
    /**
     * Логическое ИЛИ
     *
     * Вычисляет аргументы последовательно, возвращая первое истинное значение
     * или последнее ложное
     *
     * Аргументы после первого истинного значения не вычисляются
     * @usage or(...exprs)
     * @param exprs [boolean] Выражения
     *
     * @example or(5 > 3, 10 < 4) => true
     *          1 < 0 or false or 2 * 2 => 4
     * @category Базовые операторы | 22
     */
    if (ast.length === 0) return false;
    if (ast.length === 1) return ast[0];
    return ["let", ["__or", ast[0]],
                   ["if", "__or",
                          "__or",
                          ["or"].concat(ast.slice(1))]];
  }),


  "define": makeSF((ast, ctx, rs) => {
    /**
     * Определение функций с поддержкой статических переменных
     * и выполнение последующих аргументов с этими функциями в контексте
     *
     * Описание аргументов функции:
     * - Для указания позиционного аргумента используется имя аргумента: `n`;
     * - Для указания позиционного аргумента с умалчиваемым значением: `n = 10`;
     * - Для указания статической переменной, общей для всех вызовов этой функции: `$n = 10`
     *
     * Статические переменные будут храниться в переменной `this`
     * @usage define(...{name, ...args, funcBody}, ...expr)
     * @param name [string] Имя функции
     * @param args [array | string] Описание аргументов функции
     * @param funcBody [string] Тело функции
     * @param expr [any] Выражения выполняемые
     *
     * @example define(\
     *          |  { factorial, n,\
     *          |    "if(n < 2, 1, n * factorial(n - 1))"\
     *          |  },\
     *          |  factorial(4)\
     *          |) => 24
     * @example define(\
     *          |  { incr, $inc = 0,\
     *          |    "this.inc := this.inc + 1"\
     *          |  },\
     *          |  incr(), incr(), incr()\
     *          |) => 3
     *          ## Считает количество вызовов этой функции используя статическую переменную
     * @example define(\
     *          |  { func, a, b = 5 * 2,\
     *          |    "a + b"\
     *          |  },\
     *          |  func(1, 2) + func(3)\
     *          |) => 16
     * @category Работа с переменными | 3
     */
    let context = {};
    let ind = 0;
    let statics = $var$(ctx, '##static') || {};
    while (ind < ast.length && isArray(ast[ind]) && isArrayFunction(ast[ind][0])) {
      let last = ast[ind];
      let body = last[last.length - 1];
      if (!(isArray(body) && ['"', "'"].includes(body[0]))) {
        makeError(last[1], last.slice(2), 'Last argument of define must be <String> ("func body at quotes")');
      }
      body = body[1];
      let fargs = [];
      statics[last[1]] = {};
      last.slice(2, last.length - 1).forEach((v) => {
        let name = v;
        let val = undefined;
        if (isArray(v)) {
          if (v[0] != "=") {
            makeError(last[1], last.slice(2), 'Argument of function must be <name> or <name = defaultValue>');
          }
          name = v[1];
          val = eval_lisp(v[2], ctx, rs);
        }
        if (name.startsWith("$")) {
          statics[last[1]][name.slice(1)] = val;
        } else {
          fargs.push([ name, val ]);
        }
      });

      context[last[1]] = makeSF((ast, ctx, rs) => {
        if (!body) {
          return false;
        }
        let ths = $var$(ctx, '##static');
        if (ths) ths = ths[last[1]];
        return eval_lisp(
          ["let",
            [["this", ths || {}], ...fargs.map((x, i) => [x[0], ast[i] || x[1]])],
            parse(body)],
          ctx,
          rs
        );
      });
      ind++;// makeLetBindings(ast[0], ctx, rs)
    }
    return eval_lisp(['let', [["##static", statics]], ...ast.slice(ind)], {...context, ...ctx}, rs)
  }),
  // system functions & objects
  // 'js': eval,

  eval: (a) => {
    /**
     * Вычисляет LPE-AST в контексте STDLIB
     *
     * @usage eval(expr)
     * @param expr [ast] LPE-выражение
     *
     * @example eval({"+", 1, 2}) => 3
     * @category Интерпретатор | 2
     */
    return EVAL(a, STDLIB)
  },


  'eval_ast': makeSF((ast, ctx, options) => {
    /**
     * Вычисляет LPE-AST
     *
     * @usage eval_ast(expr)
     * @param expr [ast] LPE-выражение
     *
     * @example eval({"+", 1, 2}) => 3
     * @category Интерпретатор | 3
     */
    const lisp = eval_lisp(ast[0], ctx, options);
    const result = eval_lisp(lisp, ctx, options);
    return result;
  }),
};


const contextAliases = {
  "=": ["eq", "equal"],
  "+": ["add", "plus"],
  "-": ["minus", "subtract"],
  "*": ["mul", "multiply"],
  "/": ["div", "divide"],

  // Операторы сравнения
  "<": ["lt", "less"],
  ">": ["gt", "greater"],
  "<=": ["lte", "le"],
  ">=": ["gte", "ge"],
  "!=": ["neq", "ne"],

  "||": ["logical_or"],
  "&&": ["logical_and"],

  // Оператор присваивания
  ":=": ["assign"],

  "count": ["length"],

  "list": ["[", "array"],

  "read-string": ["json_parse"],


  // Проверки типов
  "null?": ["isNull"],
  "true?": ["isTrue"],
  "false?": ["isFalse"],
  "string?": ["isString"],
  "list?": ["isArray"],

  "get": ["nth"],


  "contains?": ["containsKey"],
  "empty?": ["empty"],

  "cons": ["pushStart"],

  "⍴": ["reshape"],

  "\"": ["'", "q"],

  "[]": ["astToString"],
  "->any": ["toAny"],
  "->bool": ["toBool"],
  "->int": ["toInt", "toNumber"],
  "->str": ["toStr"],
  "->fn": ["toFn", "defFn"],

  "()": ["firstArg"],

  // Для обратной совместимости с версиями до 1.6.0 "->" эквивалентен "."
  ".": ["->", "threadFirst"],
  "..": ["->>", "threadLast"],

  "do": ["doWhile"],

  ".-": ["property"],

  "=>": ["lambda"],
}

for (const [name, aliases] of Object.entries(contextAliases)) {
  aliases.forEach(alias => {
    if (STDLIB[alias] !== undefined) {
      throw `STDLIB alias ${alias} already in use`;
    }
    STDLIB[alias] = STDLIB[name]
  });
}



for (const [key, val] of Object.entries(STDLIB)) {
  if (isFunction(val)) {
    val.lpeName = selectPerfectFunctionName(val.lpeName, key);
  }
}

for (const [key, val] of Object.entries(STDLIB)) {
  if (isFunction(val) && val._doc === undefined) {
    makeDoc("STDLIB", val, val.__docFunction);
  }
}


function macroexpand(ast, ctx, resolveString = true) {
  /**
   * Раскрывает макрос без его выполнения
   *
   * @usage macroexpand(expr)
   * @param expr [any] Выражение
   *
   * @category Макросы | 8
   */
  //console.log("MACROEXPAND: " + JSON.stringify(ast))
  while (true) {
    if (!isArray(ast)) break;
    if (!isString(ast[0])) break;
    //const v = $var$(ctx, ast[0]);
    const v = $var$(ctx, ast[0], undefined, {"resolveString": resolveString}); //возможно надо так
    if (!isFunction(v)) break;

    if (!isMacro(v)) break;

    ast = v.apply(v, ast.slice(1));                                             // Это макрос! 3-й элемент макроса установлен в 1 через push
  }
  //console.log("MACROEXPAND RETURN: " + JSON.stringify(ast))

  return ast;
}


/**
 * Return new ctx with symbols in ast bound to
 * corresponding values in exprs
 * @param ast
 * @param ctx
 * @param exprs
 * @returns {*[]}
 */
function env_bind(ast, ctx, exprs, opt) {
  let newCtx = {};

  if (isArrayFunction(ast[0])) {
    ast = ast.slice(1)
  }

  let named_arg_idx = null;

  for (let i = 0; i < exprs.length; i++) {
    if (isArray(exprs[i])) {
      if (exprs[i][0] === ":=") {
        //newCtx[exprs[1]] = EVAL(exprs[2], [newCtx, ctx], opt);
        named_arg_idx = i;
        break;
      } else {
        // по идее эта ветка никогда не сработает
        newCtx[ast[i]] = undefined;
      }
    }

    if (ast[i] === "&") {
      // variable length arguments
      newCtx[ast[i + 1]] = Array.prototype.slice.call(exprs, i);
      break;
    } else {
      // replace default value to expr
      if (isArray(ast[i]) && ast[i][0] === ":=") {
        newCtx[ast[i][1]] = exprs[i];
      } else {
        newCtx[ast[i]] = exprs[i];
      }
    }
  }

  // apply named args
  if (named_arg_idx !== null) {
    for (let i = named_arg_idx; i < exprs.length; i++) {
      if (newCtx[exprs[i][1]] === undefined) {
        newCtx[exprs[i][1]] = EVAL(exprs[i][2], [newCtx, ctx], opt);
      } else {
        console.warn(`name "${exprs[i][1]}" is already defined`);
      }
    }
  }

  // set default arg values
  for (let i = 0; i < ast.length; i++) {
    if (isArray(ast[i]) && ast[i][0] == ":=" && newCtx[ast[i][1]] == undefined) {
      newCtx[ast[i][1]] = EVAL(ast[i][2], [newCtx, ctx], opt);
    }
  }


  return [newCtx, ctx];
}


/**
 *
 * @param ast
 * @param ctx
 * @param {EvalOptions=} options
 * @returns {Promise<Awaited<unknown>[] | void>|*|null|undefined}
 */
export function EVAL(ast, ctx, options) {
  // В этой функции задаем параметры поиска и обрабатываем skip результат
  // после чего перенаправляем в исходную функцию, которая теперь называется EVAL_IMPLEMENTATION
  let evalOptions = { evalFrom: 0, currentCtxElement: 0 }
  let skippedForms = []
  let result = EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions);
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
    result = EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions);
  }
  for (let i = skippedForms.length - 1; i >= 0; --i) {
    result = skippedForms[i](result);
  }
  return result;
}

/**
 *
 * @param ast
 * @param ctx
 * @param {EvalOptions=} options
 * @param evalOptions
 * @returns {*|fn|Stream<undefined>|Promise<Awaited<unknown>[]>|undefined|null}
 * @constructor
 */
function EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions) {
  while (true) {
    ast = macroexpand(ast, ctx, options?.resolveString ?? false);                                   // by default do not resolve string

    if (!isArray(ast)) {                                                                            // atom
      if (isString(ast)) {
        const value = $var$(ctx, ast, undefined, options, evalOptions);
        if (value !== undefined) {
          if (isFunction(value) && options["wantCallable"] !== true && !value.__literalFunction) {
            return ast
          } else {                                 // variable
            return value;
          }
        }
        return options && options.resolveString ? ast : undefined;                                 // if string and not in ctx
      }
      return ast;
    }

    // apply
    // c 2022 делаем macroexpand сначала, а не после
    // ast = macroexpand(ast, ctx, resolveOptions && resolveOptions.resolveString ? true: false);

    if (!Array.isArray(ast)) return ast;                                                            // TODO: do we need eval here?
    if (ast.length === 0) return null;                                                              // TODO: [] => empty list (or, maybe return vector [])

    const [opAst, ...argsAst] = ast;

    let op = EVAL_IMPLEMENTATION(opAst, ctx, {... options, wantCallable: true}, evalOptions);       // evaluate operator

    if (isHash(op) && (__call__ in op)) {                                                           // Если в качестве функции нам дают хэшмап и у него есть __call__
      op = op[__call__].bind(op);                                                                   // то используем его как callable (и сохраняем this)
    }

    if (typeof op !== 'function') {
      throw new Error('Error: ' + String(op ?? opAst) + ' is not a function');
    }

    if (isSF(op)) {                                                                                 // special form
      const sfResult = op(argsAst, ctx, options, ast);
      return sfResult;
    }

    const args = argsAst.map(a => {
      if (isArray(a) && a[0] === ":=") {
        return a;
      }

      return EVAL(a, ctx, options);
    });                                           // evaluate arguments

    if (op.ast) {                                                                                   // Macro
      ast = op.ast[0];
      ctx = env_bind(op.ast[2], op.ast[1], args, options);                                                   // TCO
    } else {
      return unbox(
          args,
          (args) => {
            const fnResult = op.apply(op, args);
            return fnResult;
          },
          options?.streamAdapter);
    }
  }
} // EVAL


export function eval_lisp(ast, ctx, options) {
  const result = EVAL(ast, [ctx || {}, STDLIB], options || {resolveString: true, maxLoopIterations: 65536});
  return result;
}

// Use with care
export function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: (ast) => eval_lisp(ast, ctx),
    val: (varName, value) => $var$(ctx, varName, value),
  }
}


// deprecated
export function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}
