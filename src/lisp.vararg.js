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
        debugger;
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
        if (new RegExp(`^${pattern}$`).test(value)) {
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
    const realArgs = [];
    for (let t of varnames) {
      let ast;
      if (t in kwargs) {                                                                            // Если аргумент найден в kwargs - удаляем его оттуда
        ast = kwargs[t];
        delete kwargs[t];
      } else {                                                                                      // Иначе берем первый из args, удаляя его
        ast = args.shift();
      }
      // Теперь надо вычислить ast учитывая его тип
      const type = getType(t);
      let value;
      if (!type) {

      }

      realArgs.push(kwargs[t]);
    }
    return realArgs
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
    const realArgs = templateSplit(args, kwargs, ctx, opt);

    // Вызываем. |realArgs| = |template| так что они пойдут первыми
    return fn.apply(this, [...realArgs, args, kwargs]);
  };
  resultSF.__isSpecialForm = true;                              // Помечаем как special form чтоб получать ast а не аргументы
  return resultSF;
}
