/**
 * Возможность задать variadic arguments
 *  контект задается с вызовом
 *  ctx = {
 *    myfunc: makeVararg(["a:int", "b:fn"], (a, b, args, kwargs) => {
 *      // Будут доступны переменные, заданные в template а также дополнительные переменные
 *    }),
 * }
 *
 * Доступн также дополнительный аргумент
 *
 */

import {EVAL} from "./lisp";
import unbox from "./lisp.unbox";

/**
 * Разберет template
 * Вернет функцию, которой можно передать массив args и хэшмап kwargs
 * template это массив строк которые обозначают названия аргументов
 *
 *
 * @param template
 * @returns {function(*, *): *[]}
 */
function parseTemplate(template) {
  if (!Array.isArray(template)) {
    throw new Error('LPE vararg template must be array');
  }
  let varnames = [];
  // Хэшмап определяет тип, в который будем кастовать аргументы
  let typesCast = {};
  // После последнего элемента не должно быть ничего
  let foundLastTemplateEntry = false;
  for (let t of template) {
    if (foundLastTemplateEntry) {
      // Ранее встретился шаблон для типов, но после него еще что-то пришло
      throw new Error(`LPE vararg template definition error: must be no arguments after type declaration`);
    }
    if (typeof t === 'string') {
      // Переменная может иметь формат `varname:type`
      // И тогда можно добавить тип в определения для типов typeCast
      const mdt = t.match(/^(.*):\s*(\w+)$/);
      if (mdt) {
        varnames.push(mdt[1]);                                                                // Имя переменной
        typesCast[mdt[1].trim()] = mdt[2].trim().toLowerCase();
      } else {
        varnames.push(t);
      }
    } else if ((typeof t === 'object') && t !== null) {
      foundLastTemplateEntry = true;
      typesCast = {...typesCast, ...t};                           // Обогащаем объект с типами пришедшими определениями
    } else {
      throw new Error(`LPE vararg template definition error: type ${typeof t} is not supported`);
    }
  }

  // Получаем тип у переменной (необязательно)
  function getType(varname) {
    if (varname in typesCast) {
      return typesCast[varname];
    }
    // Теперь поиск по шаблону - в объекте typeCast может быть задан шаблон в ключе { "on.*" : "fn" }
    for (const [pattern, type] of Object.entries(typesCast)) {
      try {
        if (new RegExp(`^${pattern}$`).test(varname)) {
          return type;
        }
      } catch (err) {
        // Что-то плохое с регвыром
      }
    }
    return undefined;
  }

  return (args, kwargs, ctx, opt) => {
    // Собираем реальные аргументы по template
    // Возвращаем структуру с информацией о том, какие аргументы вычислены, а какие - AST (fn type)
    const realArgs = [];
    const realArgsTypes = [];  // 'fn' или undefined для каждого аргумента

    for (let t of varnames) {
      let ast;
      if (t in kwargs) {                                                                            // Если аргумент найден в kwargs - удаляем его оттуда
        ast = kwargs[t];
        delete kwargs[t];
      } else {                                                                                      // Иначе берем первый из args, удаляя его
        ast = args.shift();
      }

      const type = getType(t);
      realArgsTypes.push(type);

      if (type === 'fn') {
        // Для типа fn оборачиваем AST в функцию, которая вычислит его при вызове
        const capturedAst = ast;
        realArgs.push(() => EVAL(capturedAst, ctx, opt));
      } else {
        // Для остальных типов вычисляем значение
        realArgs.push(EVAL(ast, ctx, opt));
      }
    }

    return { realArgs, realArgsTypes };
  }
}


/**
 * Определяет функцию как имеющую непостоянный набор аргументое
 * Например, в контексте объявлено
 *   somefunc = makeVararg(["a", "b"], (a, b, args, kwargs) => {
 *     // переменные a и b - по порядку
 *     // args - массив остальных переменных
 *     // kwargs - хэшмап
 *   })
 *
 * В дальнейшем вызовы в LPE приведут к результату
 * - somefunc(3, 4)             // a = 3, b = 4, args = [], kwargs = {}
 * - somefunc(b=4, 3)          // a = 3, b = 4, args = [], kwargs = {}
 * - somefunc(b=4, с=5, 3)          // a = 3, b = 4, args = [], kwargs = {c: 5}
 * - somefunc(3, 4, 5)          // a = 3, b = 4, args = [5], kwargs = {}
 *
 * @param template
 * @param fn
 */
export default function makeVararg(template, fn) {

  const templateSplit = parseTemplate(template);

  const resultSF = function (ast, ctx, opt) {
    const args = [];
    const kwargs = {};
    for (let argAst of ast) {
      if (Array.isArray(argAst) && argAst.length === 3 && argAst[0] === '=' && (typeof argAst[1] === 'string')) {  // Если похож на ["=", "variable name", ...] - вычисляем значение и кладем в kwargs
        kwargs[argAst[1]] = argAst[2];
      } else {                                                                                      // Если не похож - то кладем в аргументы
        args.push(argAst);
      }
    }

    // Вытаскиваем реальные аргументы по template
    const { realArgs, realArgsTypes } = templateSplit(args, kwargs, ctx, opt);

    // Вычисляем оставшиеся args (те что не попали в template)
    const evaluatedArgs = args.map(a => EVAL(a, ctx, opt));

    // Вычисляем оставшиеся kwargs (те что не попали в template)
    const kwargsKeys = Object.keys(kwargs);
    const evaluatedKwargsValues = kwargsKeys.map(key => EVAL(kwargs[key], ctx, opt));

    // Собираем все вычисленные значения для unbox
    // (fn-type аргументы не вычисляются, это AST - их не надо unbox'ить)
    const toUnbox = [];
    const realArgsEvaluatedIndices = [];  // индексы в realArgs которые были вычислены (не fn type)

    for (let i = 0; i < realArgs.length; i++) {
      if (realArgsTypes[i] !== 'fn') {
        realArgsEvaluatedIndices.push(i);
        toUnbox.push(realArgs[i]);
      }
    }

    const evaluatedArgsStartIndex = toUnbox.length;
    toUnbox.push(...evaluatedArgs);

    const kwargsValuesStartIndex = toUnbox.length;
    toUnbox.push(...evaluatedKwargsValues);

    // Используем unbox для обработки Promise/Stream значений
    return unbox(
      toUnbox,
      (unboxedValues) => {
        // Восстанавливаем realArgs с unbox'нутыми значениями
        const finalRealArgs = [...realArgs];
        for (let i = 0; i < realArgsEvaluatedIndices.length; i++) {
          finalRealArgs[realArgsEvaluatedIndices[i]] = unboxedValues[i];
        }

        // Восстанавливаем evaluatedArgs
        const finalEvaluatedArgs = unboxedValues.slice(
          evaluatedArgsStartIndex,
          evaluatedArgsStartIndex + evaluatedArgs.length
        );

        // Восстанавливаем kwargs
        const finalKwargs = {};
        for (let i = 0; i < kwargsKeys.length; i++) {
          finalKwargs[kwargsKeys[i]] = unboxedValues[kwargsValuesStartIndex + i];
        }

        // Вызываем. |realArgs| = |template| так что они пойдут первыми
        return fn.apply(this, [...finalRealArgs, finalEvaluatedArgs, finalKwargs]);
      },
      opt?.streamAdapter
    );
  };
  resultSF.__isSpecialForm = true;                              // Помечаем как special form чтоб получать ast а не аргументы
  return resultSF;
}
