import { except } from "../lib/exception.js";
import { isFunction, isString } from "../lib/utils.js";
import { EVAL } from "../lisp";

/** @type {ContextObject} */
export const CONTEXT_STRINGS = {
};

/** @type {ContextFunctionsObject} */
const _context = CONTEXT_STRINGS;



_context["str"] = (...args) => {
  /**
   * Преобразует аргументы в строку и объединяет.
   *
   * @usage str(...args)
   * @param args [any] Значения для преобразования
   *
   * @example str(1, 2, 3) => "123"
   *          str("a", 1) => "a1"
   *          str("a", {1,2,3}) => "a[1,2,3]"
   *          str("a", null) => "anull"
   * @category Работа со строками | 1
   */
  return args.map(x => isString(x) ? x : isFunction(x) ? x.lpeName : JSON.stringify(x)).join('');
};



_context["split"] = (str, sep) => {
  /**
   * Разбивает строку по разделителю.
   *
   * @usage split(str, separator)
   * @param str [string] Строка
   * @param separator [string] Разделитель
   *
   * @example split("a,b,c", ",") => ["a", "b", "c"]
   * @category Работа со строками | 10
   */
  return str.split(sep);
};



_context["words"] = (str, reg) => {
  /**
   * Разбивает строку на слова.
   *
   * @usage words(str)
   * @param str [string] Строка
   *
   * @usage words(str, regexp)
   * @param str [string] Строка
   * @param regexp [string] Регулярное выражение для определения слова
   *
   * @example words("a, b, c") => ["a", "b", "c"]
   *          words("a-1, test_2 - 322 __432__") => ["a-1", "test_2", "322", "__432__"]
   *          words("a-1, test_2 - 322 __432__", r"\w+") => ["a", "1", "test_2", "322", "__432__"]
   * @category Работа со строками | 11
   */
  const r = reg === undefined ? /-*[a-zA-Zа-яА-ЯёЁ_\d][a-zA-Zа-яА-ЯёЁ_\d-]*/g : new RegExp(reg, 'g');
  return [...str.matchAll(r)].map(el => el[0]);
};



_context["re_match"] = (t, r, o) => {
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
   * @category Работа со строками | 20
   */
  return t.match(new RegExp(r, o));
};



_context["RegExp"] = (...args) => {
  /**
   * Создаёт регулярное выражение.
   *
   * @usage regexp(pattern, flags)
   * @param pattern [string] Шаблон регулярного выражения
   * @param flags [string] Флаги регулярного выражения
   *
   * @example regexp("[0-9]+", "g") => /[0-9]+/g
   * @category Работа со строками  | 21
   */
  // @ts-ignore
  return RegExp.apply(RegExp, args);
};
