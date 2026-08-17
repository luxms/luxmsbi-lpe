import { except } from "../lib/exception.js";
import { isArray, isBoolean, isFunction, isHash, isNumber, isNumberLike, isObj, isString, makeSF } from "../lib/utils.js";
import { EVAL } from "../lisp";

/** @type {ContextObject} */
export const CONTEXT_TYPES = {
};

/** @type {ContextFunctionsObject} */
const _context = CONTEXT_TYPES;



_context['->any'] = _context["toAny"] = v => {
  /**
   * Преобразует значение в any (возвращает как есть).
   *
   * @usage toAny(value)
   * @param value [any] Исходное значение
   *
   * @example toAny(42) => 42
   *          toAny("hello") => "hello"
   * @category Преобразование типов | 1
   */
  return v;
};



_context['->bool'] = _context["toBool"] = v => {
  /**
   * Преобразует значение в булевый тип.
   *
   * @usage toBool(value)
   * @param value [any] Исходное значение
   *
   * @example toBool(1) => true
   *          toBool(0) => false
   *          toBool("") => false
   *          toBool("text") => true
   * @category Преобразование типов | 2
   */
  return !!v;
};



_context['->int'] = _context["toInt"] = _context["toNumber"] = v => {
  /**
   * Преобразует значение в число.
   *
   * @usage toInt(value)
   * @param value [any] Исходное значение
   *
   * @example toInt("42") => 42
   *          toInt(3.14) => 3.14
   *          toInt(true) => 1
   *          toInt(false) => 0
   * @category Преобразование типов | 3
   */
  return +v;
};



_context['->str'] = _context["toStr"] = v => {
  /**
   * Преобразует значение в строку.
   *
   * @usage toStr(value)
   * @param value [any] Исходное значение
   *
   * @example toStr(42) => "42"
   *          toStr(true) => "true"
   *          toStr({1, 2, 3}) => "1,2,3"
   * @category Преобразование типов | 4
   */
  return String(v);
};



_context['read-string'] = _context["jsonParse"] = _context["json_parse"] = a => {
  /**
   * Преобразует JSON-строку в объект.
   *
   * @usage json_parse(str)
   * @param str [string] JSON-строка
   *
   * @example json_parse('{"a": 1}') => {a: 1}
   * @category Преобразование типов | 10
   */
  return JSON.parse(a);
};



_context["jsonStringify"] = a => {
  /**
   * Преобразует JSON-строку в объект.
   *
   * @usage json_parse(str)
   * @param str [string] JSON-строка
   *
   * @example json_parse('{"a": 1}') => {a: 1}
   * @category Преобразование типов | 11
   */
  return JSON.stringify(a);
};



_context['isa'] = (a, b) => {
  /**
   * Проверяет, является ли объект экземпляром класса.
   *
   * @usage isa(obj, class)
   * @param obj [any] Проверяемый объект
   * @param class [any] Класс
   *
   * @example isa({1,2,3}, Array) => true
   * @category Проверки типов | 1
   */
  return a instanceof b;
};



_context['type'] = a => {
  /**
   * Возвращает тип значения.
   *
   * @usage type(value)
   * @param value [any] Проверяемое значение
   *
   * @example type(123) => "number"
   *          type("hello") => "string"
   * @category Проверки типов | 2
   */
  return typeof a;
};



_context['classOf'] = (a) => {
  /**
   * Возвращает имя класса объекта.
   *
   * @usage classOf(obj)
   * @param obj [any] Объект
   *
   * @example classOf({}) => "[object Array]"
   * @category Проверки типов | 3
   */
  return Object.prototype.toString.call(a);
};



_context['null?'] = _context["isNull"] = (a) => {
  /**
   * Проверяет, является ли значение null или undefined.
   *
   * @usage isNull(value)
   * @param value [any] Проверяемое значение
   *
   * @example isNull(null) => true
   *          isNull(undefined) => true
   *          isNull(0) => false
   * @category Проверки типов | 5
   */
  // ??? add [] ???
  return a === null || a === undefined;
};



_context['undefined?'] = _context["isUndef"] = _context["isUndefined"] = (a) => {
  /**
   * Проверяет, является ли значение undefined.
   *
   * @usage isUndef(value)
   * @param value [any] Проверяемое значение
   *
   * @example isUndef(null) => false
   *          isUndef(undefined) => true
   *          isUndef(0) => false
   * @category Проверки типов | 6
   */
  return a === undefined;
};



_context['true?'] = _context["isTrue"] = (a) => {
  /**
   * Проверяет, является ли значение true.
   *
   * @usage isTrue(value)
   * @param value [any] Проверяемое значение
   *
   * @example isTrue(true) => true
   *          isTrue(1) => false
   * @category Проверки типов | 10
   */
  return a === true;
};



_context['false?'] = _context["isFalse"] = (a) => {
  /**
   * Проверяет, является ли значение false.
   *
   * @usage isFalse(value)
   * @param value [any] Проверяемое значение
   *
   * @example isFalse(false) => true
   *          isFalse(0) => false
   * @category Проверки типов | 11
   */
  return a === false;
};


_context['bool?'] = _context["isBool"] = isBoolean;
_context['number?'] = _context["isNumber"] = isNumber;
_context['numberlike?'] = _context["isNumberLike"] = isNumberLike;
_context['string?'] = _context["isString"] = isString;
_context['list?'] = _context["isArray"] = isArray;
_context['hash?'] = _context["isHash"] = isHash;
_context['obj?'] = _context["isObj"] = isObj;
_context['func?'] = _context["isFunction"] = isFunction;



_context['pr_str'] = _context["jsonJoin"] = (...a) => {
  /**
   * Преобразует значения в JSON-строки и объединяет через пробел.
   *
   * @usage pr_str(...args)
   * @param args [any] Значения
   *
   * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
   * @category Преобразование типов | 50
   */
  return a.map(x => JSON.stringify(x)).join(' ');
};



_context['[]'] = _context["astToString"] = makeSF((ast, ctx, rs) => {
  /**
   * Преобразовать в строку AST дерево выражения.
   *
   * @usage astToString(value)
   * @param value [any] Значение
   *
   * @example astToString(123) => "123"
   *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
   * @category Преобразование типов | 51
   */
  return String(ast[0]);
});
