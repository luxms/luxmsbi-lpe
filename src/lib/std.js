import {EVAL, makeSF} from "../lisp";

/**
 * Конвертация скоботы в функцию
 * Первым аргументом - скобота, которая должна быть выполнена
 * Дальше - названия переменных (без кавычек и дополнительных операторов)
 *
 * @param ast
 * @param ctx
 * @param opt
 * @returns {function(...[*]): Promise<Awaited<*>[]|void>|*|null|undefined}
 */
const convertAstToFunction = makeSF((ast, ctx, opt) => {
  return (...args) => {
    const argsCtx = {};
    ast.slice(1).forEach((argAst, i) => {                                     // Считаем, что ast начиная с первого - это названия переменных и что они ничем не обернуты
      if (typeof argAst === 'string') {
        argsCtx[argAst] = args[i];
      }
    })
    // Нужно ли UNBOX?
    let result =  EVAL(ast[0], [argsCtx, ctx], opt);
    if (typeof result === 'function') {                                               // Непонятно как быть,
      result = result(...args);                                                       //            по-разному можно коллбэк
    }                                                                                 //                                  объявить
    return result;
  };
});


/**
 * LPE STD LIB
 * @type {{}}
 */
const STD = {
  // Конвертация типов
  '->any': v => v,
  '->bool': v => !!v,
  '->int': v => +v,
  '->str': v => String(v),
  '->fn': convertAstToFunction,                                                                // Конвертнет первый аргумент в js функцию, а других не будет

  defFn: convertAstToFunction,

  '=>': makeSF((ast, ctx, opt) => {
    let argNames = [];
    if (ast[0]?.[0] === 'tuple') argNames = ast[0].slice(1);
    else argNames = [ast[0]];
    return EVAL(['->fn', ast[1], ...argNames], ctx, opt);                                    // Подготавливает аргументы в другом порядке и вызывает ->fn
  }),

  // Утилиты
  print: (...args) => console.log(...args),
};

export default STD;
