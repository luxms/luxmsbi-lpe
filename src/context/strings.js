import { except } from "../lib/exception.js";
import { isFunction, isString } from "../lib/utils.js";


/** @type {ContextFunctionsObject} */
const _context = {};
export default _context;



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



_context["lower"] = (str) => {
  /**
   * Преобразует строку в нижний регистр.
   *
   * @usage lower(str)
   * @param str [string] Строка
   *
   * @example lower("Hello") => "hello"
   *          "TeST".lower() => "test"
   * @category Работа со строками | 5
   */
  return str.toLocaleLowerCase();
};



_context["upper"] = (str) => {
  /**
   * Преобразует строку в верхний регистр.
   *
   * @usage upper(str)
   * @param str [string] Строка
   *
   * @example upper("Hello") => "HELLO"
   *          "TesT".upper() => "TEST"
   * @category Работа со строками | 6
   */
  return str.toLocaleUpperCase();
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



_context["indexOf"] = (str, substr, start) => {
  /**
   * Возвращает индекс первого вхождения подстроки в строку.
   *
   * @usage indexOf(str, substr)
   * @param str [string] Строка
   * @param substr [string] Подстрока
   *
   * @usage indexOf(str, substr, start)
   * @param str [string] Строка
   * @param substr [string] Подстрока
   * @param start [number] Начальный индекс поиска
   *
   * @example indexOf("hello", "e") => 1
   *          "hello".indexOf("e") => 1
   *          indexOf("hello", "world") => -1
   *          indexOf("test test", "st") => 2
   *          indexOf("test test", "st", 3) => 7
   *          indexOf("test test", "", 3) => 3
   *          indexOf("test test", "", 1000) => 9
   * @category Работа со строками | 19
   */
  return str.indexOf(substr, start || 0);
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
   *          re_match("test(aaa)", r"\((.*)\)").1 => 'aaa'
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



_context["trim"] = (str) => {
  /**
   * Удаляет пробелы и символы переноса строки в начале и конце строки.
   *
   * @usage trim(str)
   * @param str [string] Строка
   *
   * @example trim("  hello  ") => "hello"
   * @category Работа со строками | 30
   */
  return str.trim();
};



_context["trimStart"] = (str) => {
  /**
   * Удаляет пробелы и символы переноса строки в начале строки.
   *
   * @usage trimStart(str)
   * @param str [string] Строка
   *
   * @example trimStart("  hello  ") => "hello  "
   * @category Работа со строками | 31
   */
  return str.trimStart();
};



_context["trimEnd"] = (str) => {
  /**
   * Удаляет пробелы и символы переноса строки в конце строки.
   *
   * @usage trimEnd(str)
   * @param str [string] Строка
   *
   * @example trimEnd("  hello  ") => "  hello"
   * @category Работа со строками | 32
   */
  return str.trimEnd();
};



_context["padStart"] = (str, len, ch) => {
  /**
   * Добавляет символы в начало строки до указанной длины.
   *
   * @usage padStart(str, len, ch)
   * @param str [string] Строка
   * @param len [number] Длина строки
   * @param ch [string] Символ для добавления
   *
   * @example padStart("hello", 10, " ") => "     hello"
   *          "10".padStart(5, "0") => "00010"
   * @category Работа со строками | 35
   */
  return str.padStart(len, ch);
};



_context["padEnd"] = (str, len, ch) => {
  /**
   * Добавляет символы в начало строки до указанной длины.
   *
   * @usage padEnd(str, len, ch)
   * @param str [string] Строка
   * @param len [number] Длина строки
   * @param ch [string] Символ для добавления
   *
   * @example padEnd("hello", 10, " ") => "hello     "
   *          "10".padEnd(5, "0") => "10000"
   * @category Работа со строками | 35
   */
  return str.padEnd(len, ch);
};



_context["replace"] = (str, search, replacement) => {
  /**
   * Заменяет первое вхождение подстроки в строке на указанню подстроку.
   *
   * @usage replace(str, search, replacement)
   * @param str [string] Строка
   * @param search [string] Подстрока или регулярное выражение для поиска
   * @param replacement [string] Подстрока для замены
   *
   * @example replace("helloween", "e", "[e]") => "h[e]lloween"
   *          replace("helloween", RegExp(r"(e{2,})"), "[$1]") => "hellow[ee]n"
   * @category Работа со строками | 40
   */
  return str.replace(search, replacement);
};



_context["replaceAll"] = (str, search, replacement) => {
  /**
   * Заменяет все вхождения подстроки в строке на указанню подстроку.
   *
   * @usage replaceAll(str, search, replacement)
   * @param str [string] Строка
   * @param search [string] Подстрока или регулярное выражение с ключом "g" для поиска
   * @param replacement [string] Подстрока для замены
   *
   * @example replaceAll("helloween", "e", "[e]") => "h[e]llow[e][e]n"
   *          replaceAll("helloween engeneer", RegExp(r"([en]+)", "g"), "[$1]") => "h[e]llow[een] [en]g[enee]r"
   *          replaceAll("+1 234 567 89-98", RegExp(r"\d", "g"), "*") => "+* *** *** **-**"
   * @category Работа со строками | 41
   */
  return str.replaceAll(search, replacement);
};



_context["startsWith"] = (str, search) => {
  /**
   * Проверяет, начинается ли строка с указанной подстроки.
   *
   * @usage startsWith(str, search)
   * @param str [string] Строка
   * @param search [string] Подстрока для поиска
   *
   * @example startsWith("hello", "hell") => true
   *          startsWith("hello", "world") => false
   * @category Работа со строками | 50
   */
  return str.startsWith(search);
};



_context["endsWith"] = (str, search) => {
  /**
   * Проверяет, заканчивается ли строка указанной подстрокой.
   *
   * @usage endsWith(str, search)
   * @param str [string] Строка
   * @param search [string] Подстрока для поиска
   *
   * @example endsWith("hello", "lo") => true
   *          endsWith("hello", "world") => false
   * @category Работа со строками | 51
   */
  return str.endsWith(search);
};



_context["includes"] = (str, search) => {
  /**
   * Проверяет, содержит ли строка указанную подстроку.
   *
   * @usage includes(str, search)
   * @param str [string] Строка
   * @param search [string] Подстрока для поиска
   *
   * @example includes("hello", "lo") => true
   *          includes("hello", "el") => true
   *          includes("hello", "world") => flase
   * @category Работа со строками | 52
   */
  return str.includes(search);
};
