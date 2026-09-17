import { except } from "../lib/exception.js";
import { isArray } from "../lib/utils.js";

/** @type {ContextFunctionsObject} */
const _context = {};
export default _context;



_context["+"] = _context["add"] = _context["plus"] = (...args) => {
  /**
    * Складывает аргументы.
    * @usage add(...agrs)
    * @param args [any] Значение для сложения
    * @example add(1, 2, 1) => 4
    *          add(1, '1', 1, 1) => '1111'
    *          1 + 3 => 4
    * @category Математические операторы | 1
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
};



_context["-"] = _context["minus"] = _context["subtract"] = (...args) => {
  /**
    * Вычитает из первого аргумента остальные.
    *
    * Если аргумент один, его значение инвертируется.
    * @usage minus(value, ...agrs)
    * @param value [number] Уменьшаемое
    * @param args [number] Вычитаемое
    * @usage minus(value)
    * @param value [number] Значение для инвертирования
    * @example minus(1, 2, 1) => -2
    *          minus(5) => -5
    *          1 - 3 => -2
    *          -3 => -3
    * @category Математические операторы | 2
    */
  return args.length === 1 ? -args[0] : args.reduce((a, b) => a - b);
};



_context["*"] = _context["mul"] = _context["multiply"] = (...args) => {
  /**
    * Умножает аргументы.
    *
    * @usage multiply(...args)
    * @param args [number] Число для умножения
    * @example multiply(2, 3, 4) => 24
    *          2 * 3 * 4 => 24
    * @category Математические операторы | 3
    */
  return args.reduce((a, b) => a * b);
};



_context["/"] = _context["div"] = _context["divide"] = (...args) => {
  /**
    * Делит первый аргумент на остальные.
    *
    * Если аргумент один, возвращает обратное число.
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
    * @category Математические операторы | 4
    */
  return args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b);
};



_context["rand"] = () => {
  /**
   * Возвращает случайное число от 0 до 1.
   *
   * @usage rand()
   *
   * @example rand() => 0.123456789
   * @category Математические функции | 1
   */
  return Math.random();
};



_context["max"] = (a) => {
  /**
   * Находит максимальное число в массиве.
   *
   * @usage max(array)
   * @param array [array<number>] Массив чисел
   *
   * @example max({1, 5, 2, 8, 3}) => 8
   * @category Математические функции | 10
   */
  return isArray(a) ? a.reduce(function (p, v) {return ( p > v ? p : v );}) : [];
};



_context["min"] = (a) => {
  /**
   * Находит минимальное число в массиве.
   *
   * @usage min(array)
   * @param array [array<number>] Массив чисел
   *
   * @example min([1, 5, 2, 8, 3]) => 1
   * @category Математические функции | 11
   */
  return isArray(a) ? a.reduce(function (p, v) {return ( p < v ? p : v );}) : [];
};
