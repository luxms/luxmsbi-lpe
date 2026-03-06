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
  /**
   * Преобразует выражение в JavaScript функцию
   *
   * @usage toFn(body, ...argNames)
   * @param body [any] Тело функции
   * @param argNames [string] Имена аргументов функции
   *
   * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
   * @category Создание функций | 3
   */
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
  '->any': v => {
    /**
     * Преобразует значение в any (возвращает как есть)
     *
     * @usage toAny(value)
     * @param value [any] Исходное значение
     *
     * @example toAny(42) => 42
     *          toAny("hello") => "hello"
     * @category Преобразование типов | 4
     */
    return v;
  },


  '->bool': v => {
    /**
     * Преобразует значение в булевый тип
     *
     * @usage toBool(value)
     * @param value [any] Исходное значение
     *
     * @example toBool(1) => true
     *          toBool(0) => false
     *          toBool("") => false
     *          toBool("text") => true
     * @category Преобразование типов | 5
     */
    return !!v;
  },

  '->int': v => {
    /**
     * Преобразует значение в число
     *
     * @usage toInt(value)
     * @param value [any] Исходное значение
     *
     * @example toInt("42") => 42
     *          toInt(3.14) => 3.14
     *          toInt(true) => 1
     *          toInt(false) => 0
     * @category Преобразование типов | 6
     */
    return +v;
  },


  '->str': v => {
    /**
     * Преобразует значение в строку
     *
     * @usage toStr(value)
     * @param value [any] Исходное значение
     *
     * @example toStr(42) => "42"
     *          toStr(true) => "true"
     *          toStr({1, 2, 3}) => "1,2,3"
     * @category Преобразование типов | 7
     */
    return String(v)
  },
  '->fn': convertAstToFunction,                                                                // Конвертнет первый аргумент в js функцию, а других не будет

  '=>': makeSF((ast, ctx, opt) => {
    /**
     * Создаёт функцию с альтернативным синтаксисом
     *
     * Поддерживает два варианта вызова:
     * 1. С одним аргументом: arg => body
     * 2. С кортежем аргументов: (arg1, arg2 ...) => body
     *
     * @usage arg => body
     * @param arg [string] Имя единственного аргумента
     * @param body [any] Тело функции
     *
     * @usage (...args) => body
     * @param args [string] Имя аргумента
     * @param body [any] Тело функции
     *
     * @example {1, 2, 3}.map(x => x * 2) => [2, 4, 6]
     *          (x, y) => x + y => Функция сложения
     *          lambda((x, y), x + y) => Функция сложения
     * @category Создание функций | 5
     */
    let argNames = [];
    if (ast[0]?.[0] === 'tuple') argNames = ast[0].slice(1);
    else argNames = [ast[0]];
    return EVAL(['->fn', ast[1], ...argNames], ctx, opt);                                    // Подготавливает аргументы в другом порядке и вызывает ->fn
  }),

  // Утилиты
  print: (...args) => {
    /**
     * Выводит значения в консоль (без форматирования)
     *
     * @usage print(...args)
     * @param args [any] Значения для вывода
     *
     * @example print("Hello", "World") => Hello World
     * @example print(1, 2, 3) => 1 2 3
     * @category Вывод | 3
     */
    return console.log(...args)
  },
};

export default STD;
