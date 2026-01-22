import {EVAL, makeSF} from "../lisp";

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
  '->fn': makeSF((ast, ctx, opt) => {                                                               // Конвертация скоботы в вызываемую функцию
    return (...args) => {
      // Что-то сделать с args и закинуть в контекст
      // Нужно ли UNBOX?
      return EVAL(ast[0], ctx, opt);
    };
  }),

  // Утилиты
  print: (...args) => console.log(...args),
};

export default STD;
