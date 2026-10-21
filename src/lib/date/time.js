/**
 * Дата со временем: сдвиги, границы времени и фиксированные часовые смещения.
 * Модуль не зависит от календарных функций date.js.
 */

import { unwrapQuotedString, normalizeDateUnit, parseDateTime, formatDateTime, shiftCalendarTime, shiftTime, truncateTime, compareDateTime} from "./utils";
export { unwrapQuotedString, normalizeDateUnit, isTimeUnit } from "./utils";

/** @typedef {import("./utils").DateValue} DateValue */
/** @typedef {import("./utils").LpeQuotedString} LpeQuotedString */
/** @typedef {import("./utils").DateInput} DateInput */
/** @typedef {import("./utils").DatePairInput} DatePairInput */
/** @typedef {import("./utils").DatePair} DatePair */
/** @typedef {import("./utils").DateUnit} DateUnit */
/** @typedef {import("./utils").PeriodUnit} PeriodUnit */
/** @typedef {import("./utils").DateUnitInput} DateUnitInput */
/** @typedef {import("./utils").PeriodUnitInput} PeriodUnitInput */
/** @typedef {import("./utils").DateTimeParts} DateTimeParts */

/**
 * Возвращает текущую дату и время по UTC с точностью до секунды.
 *
 * @returns {string} Дата и время в формате YYYY-MM-DD HH:mm:ss.
 * @see today
 */
export function now() {
  /**
   * Возвращает текущую дату и время по UTC с точностью до секунды.
   *
   * @usage now()
   * @result Строка YYYY-MM-DD HH:mm:ss.
   * @example now() ## Результат зависит от текущего времени по UTC.
   * @category Календарные функции | 2
   */
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Сдвигает дату со временем и всегда возвращает дату со временем.
 * Без начальной даты использует now(). Дата без времени означает полночь.
 * Поддерживает строки с T или пробелом, дробью секунды до девяти знаков
 * и фиксированным смещением часового пояса; дробь и смещение сохраняются.
 * Месяцы и кварталы сдвигаются по месяцу, годы — по году; последний день
 * месяца сохраняется с учётом григорианского календаря.
 *
 * @param {DateInput | DatePairInput} one Дата, пара дат либо смещение при двух аргументах.
 * @param {number | DateUnitInput} two Смещение при трёх аргументах либо единица при двух.
 * @param {DateUnitInput} [three] Единица сдвига при явно заданной дате.
 * @returns {string | [string, string]} Дата со временем либо пара таких дат.
 * @throws {RangeError} Дата, единица или смещение не поддерживаются.
 * @example dateTimeShift("2024-01-15", 2, "h"); // "2024-01-15 02:00:00"
 * @example dateTimeShift("2024-01-31 12:34:56", 1, "m"); // "2024-02-29 12:34:56"
 */
export function dateTimeShift(one, two, three) {
  /**
   * Сдвигает дату со временем на указанное число единиц и сохраняет время
   * при календарном сдвиге. Без начальной даты использует текущее время по UTC.
   * Дата без времени означает полночь. Дробные секунды и фиксированный
   * часовой пояс сохраняются; переходы именованных часовых поясов не учитываются.
   *
   * @usage dateTimeShift(start, delta, unit)
   * @param start [DateInput] Дата со временем, дата без времени или D-строка.
   * @param delta [number] Смещение; для месяцев, кварталов и лет — целое число.
   * @param unit [DateUnit] Единица: y, q, m, w, d, h, n, s или её полное имя.
   * @usage dateTimeShift(delta, unit)
   * @param delta [number] Смещение относительно текущего времени по UTC.
   * @param unit [DateUnit] Единица сдвига.
   * @usage dateTimeShift(dates, delta, unit)
   * @param dates [DatePairInput] Пара дат; сдвигаются оба элемента.
   * @param delta [number] Смещение каждой даты.
   * @param unit [DateUnit] Единица сдвига.
   * @result Строка YYYY-MM-DD HH:mm:ss с дробью секунды и часовым поясом,
   *         если они были заданы, либо пара таких строк.
   * @example dateTimeShift("2024-01-15", 2, "h") => "2024-01-15 02:00:00"
   *          dateTimeShift("2024-01-31 12:34:56", 1, "m") => "2024-02-29 12:34:56"
   * @category Календарные функции | 8
   */
  one = unwrapQuotedString(one);
  two = unwrapQuotedString(two);
  three = unwrapQuotedString(three);
  const start = three === undefined ? now() : one;
  const delta = three === undefined ? one : two;
  const unit = normalizeDateUnit(three === undefined ? two : three);

  if (!["y", "q", "m", "w", "d", "h", "n", "s"].includes(unit)) throw new RangeError(`Unknown date unit: ${unit}`);

  if (typeof delta !== "number" || !Number.isFinite(delta)
      || (["y", "q", "m"].includes(unit) && !Number.isInteger(delta))) {
    throw new RangeError("Shift must be a finite number and an integer for months, quarters, and years.");
  }

  if (Array.isArray(start)) return [dateTimeShift(start[0], delta, unit), dateTimeShift(start[1], delta, unit)];

  const parts = parseDateTime(start);
  const secondsPerUnit = { w: 604800, d: 86400, h: 3600, n: 60, s: 1 }[unit];

  if (secondsPerUnit !== undefined) shiftTime(parts, delta * secondsPerUnit);
  else shiftCalendarTime(parts, delta, unit);

  return formatDateTime(parts);
}

/** Функции времени, доступные в выражениях LPE. */
export const TIME_FUNCTIONS = {now, dateTimeShift};

/**
 * Возвращает начало часа, минуты или секунды без дробной части секунды.
 * @param {DateInput} value Исходная дата со временем.
 * @param {string} unit Короткая единица h, n или s.
 * @returns {string} Начало периода с сохранением фиксированного часового пояса.
 * @throws {RangeError} Дата или время некорректны.
 */
export function toStartTime(value, unit) {
  return formatDateTime(truncateTime(parseDateTime(value), unit));
}

/**
 * Возвращает последнюю целую секунду дня, часа, минуты или секунды.
 * @param {DateInput} value Исходная дата со временем.
 * @param {string} unit Короткая единица d, h, n или s.
 * @returns {string} Конец периода с сохранением фиксированного часового пояса.
 * @throws {RangeError} Дата или время некорректны.
 */
export function toEndTime(value, unit) {
  const parts = truncateTime(parseDateTime(value), unit);
  shiftTime(parts, { d: 86400, h: 3600, n: 60, s: 1 }[unit] - 1);
  return formatDateTime(parts);
}

/**
 * Сдвигает конец интервала и упорядочивает границы с учётом времени и пояса.
 * @param {DatePairInput} range Исходная пара дат со временем.
 * @param {number} delta Смещение конечной даты.
 * @param {DateUnitInput} unit Единица часов, минут или секунд.
 * @returns {[string, string]} Границы от раннего момента к позднему.
 * @throws {RangeError} Дата, время или смещение некорректны.
 */
export function extendTimeRange(range, delta, unit) {
  const first = parseDateTime(range[0]);
  const last = parseDateTime(dateTimeShift(range[1], delta, unit));
  const pair = [formatDateTime(first), formatDateTime(last)];
  return compareDateTime(first, last) <= 0 ? pair : pair.reverse();
}

/**
 * Извлекает час, минуту или целую секунду в записанном часовом поясе.
 * @param {DateInput} value Исходная дата со временем.
 * @param {string} unit Короткая единица h, n или s.
 * @returns {number} Час от 0 до 23 либо минута или секунда от 0 до 59.
 * @throws {RangeError} Дата, время или единица некорректны.
 */
export function extractTime(value, unit) {
  const date = parseDateTime(value).date;
  switch (unit) {
    case "h": return date.getUTCHours();
    case "n": return date.getUTCMinutes();
    case "s": return date.getUTCSeconds();
    default: throw new RangeError(`Unknown time unit: ${unit}`);
  }
}
