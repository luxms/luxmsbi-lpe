/**
 * Календарные функции LPE: даты, границы периодов и части даты.
 * Операции со временем передаются модулю time.js.
 */

import {now, dateTimeShift, toStartTime, toEndTime, extendTimeRange, extractTime} from "./time";

import {
  unwrapQuotedString, normalizeDateUnit, isTimeUnit, l2, getDaysInMonth, getRawPeriod,
  ffPeriod, makePeriod, getSplitPeriod, getWeekNumber, getQuarter, getHalfYearNumber,
  getFirstMonthQuarter, getLastMonthQuarter, getStartDayWeek, getLastDayWeek, getDayNumber,
  _changeDay, _changeYear, _changeMonth,
} from "./utils";

export { getDoW } from "./utils";

/** @typedef {import("./utils").DateValue} DateValue */
/** @typedef {import("./utils").LpeQuotedString} LpeQuotedString */
/** @typedef {import("./utils").DateInput} DateInput */
/** @typedef {import("./utils").DatePairInput} DatePairInput */
/** @typedef {import("./utils").DatePair} DatePair */
/** @typedef {import("./utils").DateUnit} DateUnit */
/** @typedef {import("./utils").PeriodUnit} PeriodUnit */
/** @typedef {import("./utils").DateUnitInput} DateUnitInput */
/** @typedef {import("./utils").PeriodUnitInput} PeriodUnitInput */

/**
 * Возвращает текущую дату по UTC, которая может отличаться от местной даты.
 *
 * @returns {string} Текущая дата в формате YYYY-MM-DD.
 * @example today(); // "2024-01-15", если текущая дата по UTC — 15 января 2024 года.
 */
export function today() {
  /**
   * Возвращает текущую дату по UTC в формате YYYY-MM-DD.
   * Вблизи полуночи она может отличаться от местной даты.
   *
   * @usage today()
   *
   * @result Строка YYYY-MM-DD без времени суток.
   * @example today() ## Результат зависит от текущей даты по UTC.
   * @category Календарные функции | 1
   */
  return new Date().toISOString().slice(0, 10);
}

/**
 * Сдвигает дату или обе даты пары на указанное число единиц.
 * Для h/hour, n/minute/min и s/second/sec сохраняет время и использует now()
 * при вызове с двумя аргументами. Для календарных единиц возвращает только
 * дату и по умолчанию использует today(). Регистр единицы не учитывается.
 *
 * Месяцы и годы сдвигаются последовательно, по одному шагу. Последний день
 * месяца остаётся последним; отсутствующий день заменяется последним днём
 * целевого месяца. Пара дат сохраняет порядок элементов.
 * Для неизвестной единицы возвращает исходную дату после снятия кавычек AST.
 *
 * @param {DateInput | DatePairInput} one Дата, пара дат либо смещение при вызове с двумя аргументами.
 * @param {number | DateUnitInput} two Смещение при трёх аргументах либо единица при двух; календарное смещение — целое.
 * @param {DateUnitInput} [three] Единица сдвига при явно заданной дате или паре дат.
 * @returns {DateValue | DatePair} Дата YYYY-MM-DD либо дата со временем для h/n/s; также поддерживается пара дат.
 * @throws {RangeError} Смещение не является конечным числом или дата некорректна при временном сдвиге.
 * @example dateShift("2024-01-15", 5, "d"); // "2024-01-20"
 * @example dateShift(3, "d"); // Текущая дата по UTC плюс три дня.
 * @example dateShift(["2024-01-01", "2024-01-31"], 1, "m"); // ["2024-02-01", "2024-02-29"]
 */
export function dateShift(one, two, three) {
  /**
   * Сдвигает дату или обе даты пары на указанное число единиц.
   * Для h/hour, n/minute/min и s/second/sec возвращает дату со временем.
   * Для d/w/m/q/y возвращает только дату. Без начальной даты использует
   * now() для временных единиц и today() для календарных.
   *
   * Месяцы и годы сдвигаются по одному шагу с сохранением последнего дня месяца.
   * Если нужного дня в целевом месяце нет, берётся его последний день.
   * Для неизвестной единицы дата остаётся прежней.
   *
   * @usage dateShift(start, delta, unit)
   * @param start [DateInput] Начальная дата, в том числе D-строка.
   * @param delta [number] Смещение: положительное — вперёд, отрицательное — назад; для календарных единиц — целое.
   * @param unit [DateUnit] Единица: d/day, w/week, m/month, q/quarter, y/year, h/hour, n/minute/min, s/second/sec.
   *
   * @usage dateShift(delta, unit)
   * @param delta [number] Смещение относительно текущей даты или времени по UTC.
   * @param unit [DateUnit] Единица сдвига.
   *
   * @usage dateShift(dates, delta, unit)
   * @param dates [DatePairInput] Пара дат [начало, конец]; сдвигаются оба элемента.
   * @param delta [number] Смещение каждой даты; для календарных единиц — целое.
   * @param unit [DateUnit] Единица сдвига.
   *
   * @result Строка YYYY-MM-DD для календарных единиц, YYYY-MM-DD HH:mm:ss
   *         для временных единиц или пара таких строк в исходном порядке.
   *         Для неизвестной единицы возвращаются исходные даты.
   * @example dateShift("2024-01-15", 5, 'd') => "2024-01-20"
   *          dateShift("2024-01-15", -1, 'm') => "2023-12-15"
   *          dateShift(3, 'd') ## Текущая дата по UTC плюс три дня.
   *          dateShift(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-02-01", "2024-02-29"]
   *          dateShift("2024-01-15 23:30:00", 2, "h") => "2024-01-16 01:30:00"
   * @category Календарные функции | 7
   */
  one   = unwrapQuotedString(one);
  two   = unwrapQuotedString(two);
  three = unwrapQuotedString(three);
  const shiftUnit = normalizeDateUnit(three === undefined ? two : three);
  if (isTimeUnit(shiftUnit)) return dateTimeShift(one, two, three);
  let start = one;
  let delta = two;
  let unit = three;

  if (unit === undefined) {
    start = today();
    delta = one;
    unit = two;
  }

  if (Array.isArray(start)) {
    return [dateShift(start[0], delta, unit), dateShift(start[1], delta, unit)];
  }

  unit = shiftUnit;
  switch (unit) {
    case 'd':
    case 'day':
      return ffPeriod(_changeDay(start, delta));
    case 'w':
    case 'week':
      return ffPeriod(_changeDay(start, delta * 7));
    case 'm':
    case 'month':
      return ffPeriod(_changeMonth(start, delta));
    case 'q':
    case 'quarter':
      return ffPeriod(_changeMonth(start, delta * 3));
    case 'y':
    case 'year':
      return ffPeriod(_changeYear(start, delta));
  }

  return start;
}

/**
 * Возвращает начало секунды, минуты, часа, дня, недели, месяца, квартала или года.
 * Неделя начинается в понедельник. При вызове toStart(unit) использует
 * текущую дату по UTC, а для h/n/s — текущее время. Для неизвестного периода
 * возвращает исходную дату. Временные границы имеют точность до секунды.
 *
 * @param {DateInput | PeriodUnitInput} one Дата либо период при вызове с одним аргументом.
 * @param {PeriodUnitInput} [two] Период при явно заданной дате.
 * @returns {DateValue} Для h/n/s — YYYY-MM-DD HH:mm:ss, для остальных единиц — YYYY-MM-DD.
 * @throws {RangeError} При временной единице дата или время некорректны.
 * @example toStart("2024-01-15", "m"); // "2024-01-01"
 * @example toStart("y"); // Первый день текущего года по UTC.
 */
export function toStart(one, two) {
  /**
   * Возвращает начало секунды, минуты, часа, дня или календарного периода.
   * Неделя начинается в понедельник. Без даты использует now() для h/n/s
   * и today() для календарных единиц. Дробь секунды на границе отбрасывается.
   *
   * @usage toStart(date, unit)
   * @param date [DateInput] Дата, в том числе D-строка.
   * @param unit [PeriodUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   *
   * @usage toStart(unit)
   * @param unit [PeriodUnit] Период для текущей даты по UTC.
   *
   * @result Для h/n/s — дата со временем; для остальных единиц — дата YYYY-MM-DD.
   *         Для неизвестного периода возвращается исходная дата.
   * @example toStart("2024-01-15", 'm') => "2024-01-01"
   *          toStart("2024-01-15", 'q') => "2024-01-01"
   *          toStart('y') ## Первый день текущего года по UTC.
   *          toStart("2024-01-15 12:34:56", "h") => "2024-01-15 12:00:00"
   * @category Календарные функции | 5
   */
  one = unwrapQuotedString(one);
  two = unwrapQuotedString(two);
  let start = one;
  let unit = two;
  if (two === undefined) {
    unit = one;
    start = isTimeUnit(normalizeDateUnit(unit)) ? now() : today();
  }
  unit = normalizeDateUnit(unit);
  if (isTimeUnit(unit)) return toStartTime(start, unit);
  const [y, m] = getSplitPeriod(getRawPeriod(start));
  switch (unit) {
    case "d":
      return ffPeriod(start);
    case 'w':
    case 'week':
      return ffPeriod(getStartDayWeek(getRawPeriod(start)));
    case 'm':
    case 'month':
      return ffPeriod(makePeriod(y, m, 1));
    case 'q':
    case 'quarter':
      return ffPeriod(makePeriod(y, getFirstMonthQuarter(getRawPeriod(start)), 1));
    case 'y':
    case 'year':
      return ffPeriod(makePeriod(y, 1, 1));
  }
  return start;
}

/**
 * Возвращает конец секунды, минуты, часа, дня или календарного периода.
 * Неделя заканчивается в воскресенье. При вызове toEnd(unit) использует
 * текущую дату по UTC, а для h/n/s — текущее время. Для неизвестного периода
 * возвращает исходную дату. Конец дня и временных периодов — последняя целая секунда.
 *
 * @param {DateInput | PeriodUnitInput} one Дата либо период при вызове с одним аргументом.
 * @param {PeriodUnitInput} [two] Период при явно заданной дате.
 * @returns {DateValue} Для d/h/n/s — YYYY-MM-DD HH:mm:ss, для w/m/q/y — YYYY-MM-DD.
 * @throws {RangeError} При единице d/h/n/s дата или время некорректны.
 * @example toEnd("2024-01-15", "q"); // "2024-03-31"
 * @example toEnd("y"); // Последний день текущего года по UTC.
 */
export function toEnd(one, two) {
  /**
   * Возвращает конец секунды, минуты, часа, дня или календарного периода.
   * Для d/h/n/s возвращает последнюю целую секунду, без дробной части.
   * Неделя заканчивается в воскресенье. Без даты использует now() для h/n/s
   * и today() для календарных единиц.
   *
   * @usage toEnd(date, unit)
   * @param date [DateInput] Дата, в том числе D-строка.
   * @param unit [PeriodUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   *
   * @usage toEnd(unit)
   * @param unit [PeriodUnit] Период для текущей даты по UTC.
   *
   * @result Для d/h/n/s — дата со временем; для w/m/q/y — дата YYYY-MM-DD.
   *         Для неизвестного периода возвращается исходная дата.
   * @example toEnd("2024-01-15", 'm') => "2024-01-31"
   *          toEnd("2024-01-15", 'q') => "2024-03-31"
   *          toEnd('y') ## Последний день текущего года по UTC.
   *          toEnd("2024-01-15 12:34:56", "n") => "2024-01-15 12:34:59"
   *          toEnd("2024-01-15", "d") => "2024-01-15 23:59:59"
   * @category Календарные функции | 6
   */
  one = unwrapQuotedString(one);
  two = unwrapQuotedString(two);
  let start = one;
  let unit = two;
  if (two === undefined) {
    unit = one;
    start = isTimeUnit(normalizeDateUnit(unit)) ? now() : today();
  }
  unit = normalizeDateUnit(unit);
  if (unit === "d" || isTimeUnit(unit)) return toEndTime(start, unit);
  const [y, m] = getSplitPeriod(getRawPeriod(start));
  switch (unit) {
    case 'w':
    case 'week':
      return ffPeriod(getLastDayWeek(getRawPeriod(start)));
    case 'm':
    case 'month':
      return ffPeriod(makePeriod(y, m, getDaysInMonth(y, m)));
    case 'q':
    case 'quarter':
      return ffPeriod(makePeriod(y, getLastMonthQuarter(getRawPeriod(start)), getDaysInMonth(y, getLastMonthQuarter(getRawPeriod(start)))));
    case 'y':
    case 'year':
      return ffPeriod(makePeriod(y, 12, 31));
  }
  return start;
}

/**
 * Возвращает начало и конец периода, содержащего дату.
 * При вызове bound(unit) берёт текущую дату по UTC, для h/n/s — текущее время. Неделя длится
 * с понедельника по воскресенье. Для неизвестного периода обе границы равны дате.
 *
 * @param {DateInput | PeriodUnitInput} one Дата либо период при вызове с одним аргументом.
 * @param {PeriodUnitInput} [two] Период при явно заданной дате.
 * @returns {DatePair} Пара [начало, конец]; формат каждой границы определяется toStart() и toEnd().
 * @throws {RangeError} При единице d/h/n/s дата или время некорректны.
 * @example bound("2024-01-15", "m"); // ["2024-01-01", "2024-01-31"]
 * @example bound("w"); // Границы недели, содержащей текущую дату по UTC.
 */
export function bound(one, two) {
  /**
   * Возвращает начало и конец периода, содержащего дату.
   * Неделя длится с понедельника по воскресенье. Без даты использует now()
   * для h/n/s и today() для календарных единиц.
   *
   * @usage bound(date, unit)
   * @param date [DateInput] Дата, в том числе D-строка.
   * @param unit [PeriodUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   *
   * @usage bound(unit)
   * @param unit [PeriodUnit] Период для текущей даты по UTC.
   *
   * @result Пара [начало, конец]; для h/n/s обе границы содержат время.
   *         Для d начало — дата, конец — дата с временем 23:59:59.
   *         Для неизвестного периода обе границы равны исходной дате.
   * @example bound("2024-01-15", 'm') => ["2024-01-01", "2024-01-31"]
   *          bound("2024-01-15", 'q') => ["2024-01-01", "2024-03-31"]
   *          bound('w') ## Границы недели, содержащей текущую дату по UTC.
   *          bound("2024-01-15 12:34:56", "h") => ["2024-01-15 12:00:00", "2024-01-15 12:59:59"]
   * @category Календарные функции | 10
   */
  one = unwrapQuotedString(one);
  two = unwrapQuotedString(two);
  let start = one;
  let unit = two;
  if (two === undefined) {
    unit = one;
    start = isTimeUnit(normalizeDateUnit(unit)) ? now() : today();
  }
  return [toStart(start, unit), toEnd(start, unit)];
}

/**
 * Создаёт интервал от даты или сдвигает конечную дату готового интервала.
 * При вызове extend(delta, unit) использует now() для h/n/s и today() для календарных единиц.
 *
 * Для одной даты возвращает [дата, сдвинутая дата] без перестановки элементов:
 * при отрицательном смещении вторая дата может быть раньше первой.
 * Для пары сдвигает только конец и упорядочивает результат от ранней даты к поздней.
 * Правила сдвига, включая обработку конца месяца, совпадают с dateShift().
 *
 * @param {DateInput | DatePairInput} one Начальная дата, интервал либо смещение при двух аргументах.
 * @param {number | DateUnitInput} two Смещение при трёх аргументах либо единица при двух.
 * @param {DateUnitInput} [three] Единица сдвига при явно заданной дате или интервале.
 * @returns {DatePair} Исходная и сдвинутая даты; для готового интервала — упорядоченные даты, с временем для h/n/s.
 * @throws {RangeError} При временной единице дата, время или смещение некорректны.
 * @example extend("2024-01-01", 5, "d"); // ["2024-01-01", "2024-01-06"]
 * @example extend("2024-01-15", -5, "d"); // ["2024-01-15", "2024-01-10"]
 * @example extend(["2024-01-01", "2024-01-31"], 1, "m"); // ["2024-01-01", "2024-02-29"]
 */
export function extend(one, two, three) {
  /**
   * Создаёт интервал от даты или сдвигает конечную дату готового интервала.
   * Без начальной даты использует now() для h/n/s и today() для календарных единиц.
   * Для пары дат результат упорядочивается от ранней даты к поздней.
   * Для одной даты порядок сохраняется, даже если смещение отрицательное.
   *
   * @usage extend(start, delta, unit)
   * @param start [DateInput] Начальная дата, в том числе D-строка.
   * @param delta [number] Смещение второй даты; отрицательное значение сдвигает её назад.
   * @param unit [DateUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   *
   * @usage extend(delta, unit)
   * @param delta [number] Смещение относительно текущей даты или времени по UTC.
   * @param unit [DateUnit] Единица сдвига.
   *
   * @usage extend(period, delta, unit)
   * @param period [DatePairInput] Интервал [начало, конец]; сдвигается только конечная дата.
   * @param delta [number] Смещение конечной даты; для календарных единиц — целое.
   * @param unit [DateUnit] Единица сдвига.
   *
   * @result Пара дат [начало, конец]. Для готового интервала обе даты
   *         упорядочиваются и сохраняют время для h/n/s; для календарных единиц
   *         приводятся к YYYY-MM-DD. Для одной даты её запись сохраняется.
   * @example extend("2024-01-01", 5, 'd') => ["2024-01-01", "2024-01-06"]
   * @example extend("2024-01-15", -5, 'd') => ["2024-01-15", "2024-01-10"]
   * @example extend(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-01-01", "2024-02-29"]
   * @category Календарные функции | 11
   */
  one   = unwrapQuotedString(one);
  two   = unwrapQuotedString(two);
  three = unwrapQuotedString(three);
  let start = one;
  let delta = two;
  let unit = three;
  if (unit === undefined) {
    delta = one;
    unit = two;
    start = isTimeUnit(normalizeDateUnit(unit)) ? now() : today();
  }
  unit = normalizeDateUnit(unit);
  if (Array.isArray(start)) {
    if (isTimeUnit(unit)) return extendTimeRange(start, delta, unit);
    const s = start[0];
    const e = dateShift(start[1], delta, unit);
    const min = Math.min(Number(getRawPeriod(s)), Number(getRawPeriod(e)));
    const max = Math.max(Number(getRawPeriod(s)), Number(getRawPeriod(e)));
    return [ffPeriod(min), ffPeriod(max)];
  }
  return [start, dateShift(start, delta, unit)];
}

/**
 * Извлекает числовую часть даты или времени по единице, как extract() в lpe-sql.
 * Часы, минуты и секунды читаются в записанном фиксированном часовом поясе.
 *
 * @param {DateInput} dt Дата, дата со временем или узел строки AST.
 * @param {DateUnitInput} unit Единица: y, q, m, w, d, h, n, s или её полное имя.
 * @returns {number | null} Часть даты; для d — день месяца, для s — целая секунда.
 * @throws {RangeError} Единица неизвестна или запись времени некорректна.
 * @example extract("2024-01-15 12:34:56", "n"); // 34
 */
export function extract(dt, unit) {
  /**
   * Извлекает числовую часть даты или времени. Единица d означает день месяца,
   * w — номер недели ISO. Часы, минуты и секунды читаются в часовом поясе
   * исходной строки; дробная часть секунды отбрасывается.
   *
   * @usage extract(date, unit)
   * @param date [DateInput] Дата, дата со временем или D-строка.
   * @param unit [DateUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   * @result Числовая часть даты; часы 0–23, минуты и целые секунды 0–59.
   * @example extract("2024-01-15 12:34:56", "h") => 12
   *          extract("2024-01-15 12:34:56", "n") => 34
   *          extract("2024-01-15 12:34:56", "s") => 56
   * @category Календарные функции | 29
   */
  dt = unwrapQuotedString(dt);
  unit = normalizeDateUnit(unit);
  switch (unit) {
    case "y": return year(dt);
    case "q": return qoty(dt);
    case "m": return moty(dt);
    case "w": return woty(dt);
    case "d": return getSplitPeriod(getRawPeriod(dt))[2];
    case "h":
    case "n":
    case "s": return extractTime(dt, unit);
    default: throw new RangeError(`Unknown date unit: ${unit}`);
  }
}

/**
 * Извлекает календарный год из даты.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {number} Год как число; для пустой строки — 0.
 * @example year("2024-01-15"); // 2024
 */
export function year(dt) {
  /**
   * Возвращает календарный год как число.
   *
   * @usage year(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число — календарный год; для пустой строки — 0.
   * @example year("2024-01-15") => 2024
   * @category Календарные функции | 30
   */
  dt = unwrapQuotedString(dt);
  const [y] = getSplitPeriod(getRawPeriod(dt));
  return y;
}

/**
 * Определяет полугодие по месяцу даты.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {1 | 2} 1 для января — июня, 2 для июля — декабря.
 * @example hoty("2024-07-15"); // 2
 */
export function hoty(dt) {
  /**
   * Возвращает номер полугодия: 1 для января — июня, 2 для июля — декабря.
   *
   * @usage hoty(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число 1 или 2.
   * @example hoty("2024-01-15") => 1
   *          hoty("2024-07-15") => 2
   * @category Календарные функции | 31
   */
  dt = unwrapQuotedString(dt);
  return getHalfYearNumber(getRawPeriod(dt));
}

/**
 * Определяет квартал по месяцу даты.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {number | null} Номер квартала от 1 до 4; null для пустой строки.
 * @example qoty("2024-10-15"); // 4
 */
export function qoty(dt) {
  /**
   * Возвращает номер квартала от 1 до 4.
   *
   * @usage qoty(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число от 1 до 4; для пустой строки — null.
   * @example qoty("2024-01-15") => 1
   *          qoty("2024-10-15") => 4
   * @category Календарные функции | 32
   */
  dt = unwrapQuotedString(dt);
  return getQuarter(getRawPeriod(dt));
}

/**
 * Извлекает номер месяца из даты.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {number} Номер месяца от 1 до 12; для пустой строки — 0.
 * @example moty("2024-12-15"); // 12
 */
export function moty(dt) {
  /**
   * Возвращает номер месяца: январь — 1, декабрь — 12.
   *
   * @usage moty(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число от 1 до 12; для пустой строки — 0.
   * @example moty("2024-01-15") => 1
   *          moty("2024-12-15") => 12
   * @category Календарные функции | 33
   */
  dt = unwrapQuotedString(dt);
  const [, m] = getSplitPeriod(getRawPeriod(dt));
  return m;
}

/**
 * Вычисляет номер недели по правилам ISO 8601.
 * Неделя начинается в понедельник; первая неделя содержит 4 января.
 * У границы года номер недели может относиться к соседнему году.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {number} Номер недели от 1 до 53; для пустой строки — -1.
 * @example woty("2021-01-01"); // 53
 */
export function woty(dt) {
  /**
   * Возвращает номер недели по ISO 8601: от 1 до 53.
   * Неделя начинается в понедельник; первая неделя содержит 4 января.
   * В начале и конце календарного года неделя может относиться к соседнему году.
   *
   * @usage woty(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число от 1 до 53; для пустой строки — -1.
   * @example woty("2024-01-15") => 3
   *          woty("2021-01-01") => 53
   * @category Календарные функции | 34
   */
  dt = unwrapQuotedString(dt);
  return getWeekNumber(getRawPeriod(dt));
}

/**
 * Вычисляет порядковый номер дня в году, начиная с 1 января.
 * Расчёт использует местное время и интервалы по 24 часа; переходы часового
 * пояса могут влиять на результат.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {number} Номер дня от 1 до 365 или 366; для пустой строки — -1.
 * @example doty("2024-12-31"); // 366
 */
export function doty(dt) {
  /**
   * Возвращает порядковый номер дня в году, начиная с 1 января.
   * Расчёт в местном времени может зависеть от переходов часового пояса.
   *
   * @usage doty(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Число от 1 до 365 или 366; для пустой строки — -1.
   * @example doty("2024-01-15") => 15
   * @example doty("2024-12-31") => 366 ## Високосный год.
   * @category Календарные функции | 35
   */
  dt = unwrapQuotedString(dt);
  return getDayNumber(getRawPeriod(dt));
}

/**
 * Возвращает календарный год в виде строки без дополнения нулями.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {string} Строковая запись года.
 * @example isoy("2024-01-15"); // "2024"
 */
export function isoy(dt) {
  /**
   * Возвращает календарный год в виде строки без дополнения нулями.
   *
   * @usage isoy(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Строковая запись календарного года, например "2024".
   * @example isoy("2024-01-15") => "2024"
   * @category Календарные функции | 20
   */
  return `${year(dt)}`;
}

/**
 * Возвращает год и месяц даты в формате YYYY-MM.
 * Месяц дополняется ведущим нулём до двух цифр.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {string} Год и месяц, разделённые дефисом.
 * @example isom("2024-01-15"); // "2024-01"
 */
export function isom(dt) {
  /**
   * Возвращает год и месяц даты в формате YYYY-MM.
   * Месяц дополняется ведущим нулём до двух цифр.
   *
   * @usage isom(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Строка YYYY-MM, например "2024-01".
   * @example isom("2024-01-15") => "2024-01"
   * @category Календарные функции | 22
   */
  return `${year(dt)}-${l2(moty(dt))}`;
}

/**
 * Возвращает календарный год и номер квартала в формате YYYY-QN.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {string} Год, дефис, буква Q и номер квартала от 1 до 4.
 * @example isoq("2024-05-15"); // "2024-Q2"
 */
export function isoq(dt) {
  /**
   * Возвращает календарный год и номер квартала в формате YYYY-QN.
   *
   * @usage isoq(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Строка с номером квартала от 1 до 4, например "2024-Q1".
   * @example isoq("2024-01-15") => "2024-Q1"
   *          isoq("2024-05-15") => "2024-Q2"
   * @category Календарные функции | 21
   */
  return `${year(dt)}-Q${qoty(dt)}`;
}

/**
 * Возвращает календарный год даты и номер недели ISO в формате YYYY-Www.
 * Номер недели дополняется ведущим нулём до двух цифр.
 * Год берётся из даты и может отличаться от года недели ISO у границы года.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {string} Календарный год, дефис, буква W и номер недели.
 * @example isow("2024-01-15"); // "2024-W03"
 * @example isow("2021-01-01"); // "2021-W53": используется календарный год даты.
 */
export function isow(dt) {
  /**
   * Возвращает календарный год даты и номер недели ISO в формате YYYY-Www.
   * Год берётся из даты, поэтому у границы года может отличаться от года недели ISO.
   *
   * @usage isow(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Строка с двузначным номером недели, например "2024-W03".
   * @example isow("2024-01-15") => "2024-W03"
   *          isow("2021-01-01") => "2021-W53" ## Год берётся из даты.
   * @category Календарные функции | 23
   */
  return `${year(dt)}-W${l2(woty(dt))}`;
}

/**
 * Возвращает календарный год и порядковый номер дня через дефис.
 * Номер дня не дополняется нулями: 15 января записывается как YYYY-15.
 * Расчёт номера дня наследует зависимость doty() от местного времени.
 *
 * @param {DateInput} dt Дата в поддерживаемом формате или узел строки AST.
 * @returns {string} Календарный год и номер дня от 1 до 365 или 366 без ведущих нулей.
 * @example isod("2024-01-15"); // "2024-15"
 */
export function isod(dt) {
  /**
   * Возвращает календарный год и порядковый номер дня через дефис.
   * Номер дня не дополняется нулями. Расчёт зависит от местного времени, как у doty().
   *
   * @usage isod(date)
   * @param date [DateInput] Дата, в том числе D-строка.
   *
   * @result Строка «год-номер дня» без ведущих нулей в номере дня.
   * @example isod("2024-01-15") => "2024-15"
   * @category Календарные функции | 24
   */
  return `${year(dt)}-${doty(dt)}`;
}

/** Календарные функции, доступные в выражениях LPE. */
export const DATE_FUNCTIONS = {
  dateShift,
  today,
  bound,
  extend,
  toStart,
  toEnd,
  isoy,
  isoq,
  isom,
  isow,
  isod,
  extract,
  year,
  hoty,
  qoty,
  moty,
  woty,
  doty,
};
