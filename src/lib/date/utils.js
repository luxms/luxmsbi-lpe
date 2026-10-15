/**
 * Общие типы и вспомогательные функции для дат и времени.
 * Модуль не зависит от date.js и time.js.
 */

/**
 * Дата YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD или число YYYYMMDD.
 * Дата со временем содержит T или пробел перед HH:mm:ss, необязательную
 * дробь секунды до девяти знаков и фиксированный пояс Z, ±HH, ±HHmm или ±HH:mm.
 * @typedef {string | number} DateValue
 */

/**
 * Узел строки AST: знак кавычки, текст и необязательная метка типа, например D.
 * @typedef {["'" | '"', string] | ["'" | '"', string, string]} LpeQuotedString
 */

/**
 * Дата или узел строки AST.
 * @typedef {DateValue | LpeQuotedString} DateInput
 */

/**
 * Пара входных дат.
 * @typedef {[DateInput, DateInput]} DatePairInput
 */

/**
 * Пара дат результата.
 * @typedef {[DateValue, DateValue]} DatePair
 */

/**
 * Единица даты или времени. Для минут используется n, для месяцев — m.
 * @typedef {'y' | 'year' | 'q' | 'quarter' | 'm' | 'month' | 'w' | 'week' | 'd' | 'day' | 'h' | 'hour' | 'n' | 'minute' | 'min' | 's' | 'second' | 'sec'} DateUnit
 */

/**
 * Период для поиска границ.
 * @typedef {DateUnit} PeriodUnit
 */

/**
 * Единица или узел строки AST.
 * @typedef {DateUnit | LpeQuotedString} DateUnitInput
 */

/**
 * Период или узел строки AST.
 * @typedef {PeriodUnit | LpeQuotedString} PeriodUnitInput
 */

/**
 * Разобранная дата со временем. Поля date хранят записанное местное время
 * через UTC-методы Date, чтобы расчёт не зависел от часового пояса компьютера.
 * Дробь секунды хранится отдельно и не теряет микросекунды и наносекунды.
 * @typedef {Object} DateTimeParts
 * @property {Date} date Дата и целые секунды без применения смещения пояса.
 * @property {string} fraction Цифры дроби секунды без точки либо пустая строка.
 * @property {string} timezone Записанное смещение пояса либо пустая строка.
 * @property {number} offsetMinutes Смещение пояса в минутах; без пояса — 0.
 */

// Значения и единицы даты.

/**
 * Извлекает текст из узла строки AST, включая D-строки с датами.
 * Остальные значения, в том числе пары дат, возвращает без изменений.
 *
 * @template T
 * @param {T | LpeQuotedString} v Значение или узел строки с одинарной либо двойной кавычкой.
 * @returns {T | string} Текст узла строки либо исходное значение.
 * @example unwrapQuotedString(["'", "2024-01-15", "D"]); // "2024-01-15"
 */
export function unwrapQuotedString(v) {
  if (Array.isArray(v) && (v[0] === "'" || v[0] === '"') && typeof v[1] === 'string') {
    return v[1];
  }
  return v;
}

/**
 * Приводит имя единицы к короткому обозначению без учёта регистра и пробелов.
 * Неизвестные единицы оставляет без изменений после приведения регистра.
 *
 * @param {DateUnitInput | undefined} unit Единица или узел строки AST.
 * @returns {string} Короткое обозначение либо неизвестное имя в нижнем регистре.
 */
export function normalizeDateUnit(unit) {
  const name = String(unwrapQuotedString(unit)).trim().toLowerCase();
  const aliases = {
    __proto__: null,
    year: "y", quarter: "q", month: "m", week: "w", ww: "w", iw: "w",
    day: "d", dd: "d", hour: "h", hh: "h", hh24: "h",
    minute: "n", min: "n", mi: "n", second: "s", sec: "s", ss: "s",
  };
  return aliases[name] ?? name;
}

/**
 * Проверяет, относится ли короткая единица к часам, минутам или секундам.
 * @param {string} unit Короткое обозначение единицы.
 * @returns {boolean} true для h, n и s.
 */
export function isTimeUnit(unit) {
  return unit === "h" || unit === "n" || unit === "s";
}

// Вспомогательные календарные функции.

/**
 * Дополняет значение нулями слева и оставляет последние два символа.
 * Значения длиннее двух символов обрезаются, а не проверяются.
 *
 * @param {string | number} m Значение месяца, дня или номера недели.
 * @returns {string} Строка длиной два символа.
 * @example l2(3); // "03"
 */
export const l2 = (m) => ('00' + (m  + '' || '')).slice(-2);

/**
 * Считает год високосным, если его номер делится на 4.
 * Исключения григорианского календаря для столетий здесь не учитываются.
 *
 * @param {DateValue} year Год YYYY или дата YYYYMMDD; используются первые четыре символа.
 * @returns {boolean} true, если извлечённый год делится на 4 без остатка.
 */
const isLeap = (year) => getSplitPeriod(year)[0] % 4 === 0;

/**
 * Возвращает число дней в месяце с проверкой февраля через isLeap().
 *
 * @param {number} year Календарный год.
 * @param {number} month Номер месяца от 1 до 12.
 * @returns {number | undefined} Число дней; undefined, если индекс месяца отсутствует в таблице.
 */
export const getDaysInMonth = (year, month) => {
  if (month === 2 && isLeap(year)) return 29;
  return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

/**
 * Удаляет из записи даты все символы, кроме цифр, и берёт первые восемь цифр.
 * Не проверяет длину результата и существование даты.
 *
 * @param {DateValue} [period=""] Дата YYYYMMDD, YYYY-MM-DD, YYYY.MM.DD или с другими разделителями.
 * @returns {string} Цифры даты в формате YYYYMMDD, если вход содержит полную дату; иначе — неполная или пустая строка.
 * @example getRawPeriod("2024-01-15"); // "20240115"
 */
export function getRawPeriod(period = '') {
  const p = String(period);
  return p.replace(/[^0-9]/g, '').slice(0, 8);
}

/**
 * Удаляет разделители даты и вставляет дефисы между годом, месяцем и днём.
 * Не проверяет корректность и полноту даты.
 *
 * @param {DateValue} [period=""] Дата в формате YYYYMMDD или с разделителями.
 * @returns {string} Дата YYYY-MM-DD при полном входе; для пустого значения — "--".
 * @example ffPeriod(20240115); // "2024-01-15"
 */
export function ffPeriod(period = '') {
  const p = getRawPeriod(String(period));
  return `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}`;
}

/**
 * Собирает дату из года, месяца и дня без проверки их допустимости.
 * Месяц и день дополняются нулём до двух символов, год — не дополняется.
 *
 * @param {number} year Календарный год.
 * @param {number} month Номер месяца от 1 до 12.
 * @param {number} day Номер дня в месяце от 1 до 31.
 * @returns {string} Дата YYYYMMDD для четырёхзначного года.
 * @example makePeriod(2024, 1, 5); // "20240105"
 */
export const makePeriod = (year, month, day) => year.toString() + l2(month) + l2(day);

/**
 * Разбивает запись YYYYMMDD на числовые год, месяц и день.
 * Разделители не удаляются, дата не проверяется; пустые части дают 0.
 *
 * @param {DateValue} [period=""] Дата без разделителей в формате YYYYMMDD.
 * @returns {[number, number, number]} Массив [год, месяц, день]; для пустой строки — [0, 0, 0].
 * @example getSplitPeriod("20240115"); // [2024, 1, 15]
 */
export const getSplitPeriod = (period = '') => [+period.toString().slice(0, 4), +period.toString().slice(4, 6), +period.toString().slice(6, 8)];

/**
 * Определяет день недели в местном часовом поясе.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {number} Номер дня недели: понедельник — 1, воскресенье — 7; для некорректной даты возможен NaN.
 * @example getDoW("20240115"); // 1
 */
export const getDoW = (period) => {
  const [year, month, day] = getSplitPeriod(period);
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 ? 7 : dow;
};

/**
 * Вычисляет номер недели ISO 8601 в UTC.
 * Первая неделя содержит первый четверг года; начало недели — понедельник.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {number} Номер недели от 1 до 53; -1 для пустой строки или 0.
 */
export function getWeekNumber(period) {
  if (!period) return -1;
  const [year, month, day] = getSplitPeriod(period ?? '');
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Определяет квартал по месяцу даты без проверки диапазона месяца.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {number | null} Номер квартала от 1 до 4 для корректной даты; null для пустой строки или 0.
 */
export function getQuarter(period) {
  if (!period) return null;
  const [, periodStartMonth] = getSplitPeriod(period ?? '');
  return Math.ceil(periodStartMonth / 3);
}

/**
 * Определяет полугодие: месяцы после июня относятся ко второму полугодию.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {1 | 2} 2, если месяц больше 6; иначе 1, в том числе для пустой строки.
 */
export const getHalfYearNumber = (period) => {
  const [_, m] = getSplitPeriod(period);
  return m > 6 ? 2 : 1;
};

/**
 * Возвращает первый месяц квартала, содержащего дату.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {1 | 4 | 7 | 10 | null} Январь, апрель, июль или октябрь; null, если квартал не определён.
 */
export function getFirstMonthQuarter(period) {
  const quarter = getQuarter(period);
  switch (quarter) {
    case 1:
      return 1;
    case 2:
      return 4;
    case 3:
      return 7;
    case 4:
      return 10;
    default:
      return null;
  }
}

/**
 * Возвращает последний месяц квартала, содержащего дату.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {3 | 6 | 9 | 12 | null} Март, июнь, сентябрь или декабрь; null, если квартал не определён.
 */
export function getLastMonthQuarter(period) {
  const quarter = getQuarter(period);
  switch (quarter) {
    case 1:
      return 3;
    case 2:
      return 6;
    case 3:
      return 9;
    case 4:
      return 12;
    default:
      return null;
  }
}

/**
 * Находит понедельник недели, содержащей дату, последовательным вычитанием дней.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {string} Дата понедельника YYYYMMDD; пустая строка, если вход — пустая строка или 0.
 */
export function getStartDayWeek(period) {
  if (!period) return '';
  let len = getDoW(period);
  let dd = period;
  while (len > 1) {
    len--;
    dd = decrementDay(dd);
  }
  return String(dd);
}

/**
 * Находит воскресенье недели, содержащей дату, последовательным прибавлением дней.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {string} Дата воскресенья YYYYMMDD; пустая строка, если вход — пустая строка или 0.
 */
export function getLastDayWeek(period) {
  if (!period) return '';
  const dow = getDoW(period);
  let len = 7 - dow;
  let dd = period;
  while (len) {
    len--;
    dd = incrementDay(dd);
  }
  return String(dd);
}

/**
 * Вычисляет номер дня в году по разнице с 31 декабря предыдущего года.
 * Использует местное время и округляет вниз число интервалов по 24 часа;
 * переходы часового пояса могут влиять на результат.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {number} Номер дня от 1 до 365 или 366; -1 для пустой строки или 0.
 */
export const getDayNumber = (period) => {
  if (!period) return -1;
  const [y, m, d] = getSplitPeriod(period);
  const now = new Date(y, m - 1, d);
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return  Math.floor(diff / oneDay);
};

/**
 * Вычитает один календарный день с переходом через границы месяца и года.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {string} Предыдущая дата в формате YYYYMMDD.
 */
const decrementDay = (period) => {
  let [year, month, day] = getSplitPeriod(period);
  day--;
  if (day !== 0) return makePeriod(year, month, day);
  if (--month === 0) {
    year--;
    month = 12;
  }
  day = getDaysInMonth(year, month);
  return makePeriod(year, month, day);
};

/**
 * Прибавляет один календарный день с переходом через границы месяца и года.
 *
 * @param {DateValue} period Дата без разделителей в формате YYYYMMDD.
 * @returns {string} Следующая дата в формате YYYYMMDD.
 */
const incrementDay = (period) => {
  let [year, month, day] = getSplitPeriod(period);
  day++;
  if (day <= getDaysInMonth(year, month)) return makePeriod(year, month, day);
  if (++month > 12) {
    year++;
    month = 1;
  }
  day = 1;
  return makePeriod(year, month, day);
};

/**
 * Вычитает один месяц с переходом на предыдущий год при необходимости.
 * Последний день месяца остаётся последним. Если нужного дня нет,
 * берётся последний день целевого месяца.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @returns {string} Дата предыдущего месяца в формате YYYYMMDD.
 */
const decrementMonth = (period) => {
  let [year, month, day] = getSplitPeriod(getRawPeriod(period));
  const isLastDay = getDaysInMonth(year, month) === day;
  if (--month === 0) {
    year--;
    month = 12;
  }
  if (isLastDay) return makePeriod(year, month, getDaysInMonth(year, month));
  if (day > getDaysInMonth(year, month)) return makePeriod(year, month, getDaysInMonth(year, month));
  return makePeriod(year, month, day);
};

/**
 * Прибавляет один месяц с переходом на следующий год при необходимости.
 * Последний день месяца остаётся последним. Если нужного дня нет,
 * берётся последний день целевого месяца.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @returns {string} Дата следующего месяца YYYYMMDD; пустая строка для пустой строки или 0 на входе.
 */
const incrementMonth = (period) => {
  if (!period) return '';

  let [year, month, day] = getSplitPeriod(getRawPeriod(period));
  const isLastDay = getDaysInMonth(year, month) === day;
  if (++month > 12) {
    year++;
    month = 1;
  }
  if (isLastDay) return makePeriod(year, month, getDaysInMonth(year, month));
  if (day > getDaysInMonth(year, month)) return makePeriod(year, month, getDaysInMonth(year, month));
  return makePeriod(year, month, day);
};

/**
 * Вычитает один год с сохранением последнего дня месяца.
 * Если нужного дня в целевом году нет, берётся последний день месяца.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @returns {string} Дата предыдущего года в формате YYYYMMDD.
 */
const decrementYear = (period) => {
  let [year, month, day] = getSplitPeriod(getRawPeriod(period));
  const isLastDay = getDaysInMonth(year, month) === day;
  --year;
  if (isLastDay) return makePeriod(year, month, getDaysInMonth(year, month));
  if (day > getDaysInMonth(year, month)) return makePeriod(year, month, getDaysInMonth(year, month));
  return makePeriod(year, month, day);
};

/**
 * Прибавляет один год с сохранением последнего дня месяца.
 * Если нужного дня в целевом году нет, берётся последний день месяца.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @returns {string} Дата следующего года в формате YYYYMMDD.
 */
const incrementYear = (period) => {
  let [year, month, day] = getSplitPeriod(getRawPeriod(period));
  const isLastDay = getDaysInMonth(year, month) === day;
  ++year;
  if (isLastDay) return makePeriod(year, month, getDaysInMonth(year, month));
  if (day > getDaysInMonth(year, month)) return makePeriod(year, month, getDaysInMonth(year, month));
  return makePeriod(year, month, day);
};

/**
 * Сдвигает дату на целое число дней последовательными шагами по одному дню.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @param {number} delta Целое смещение: положительное — вперёд, отрицательное — назад.
 * @returns {string} Дата YYYYMMDD; при нулевом смещении — исходная дата без разделителей.
 * @throws {RangeError} Смещение не является конечным числом.
 */
export const _changeDay = (period, delta) => {
  if (!Number.isFinite(delta)) throw new RangeError("Shift must be a finite number.");
  let result = getRawPeriod(period);
  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      result = incrementDay(result);
    }
    return result;
  }
  if (delta < 0) {
    for (let i = delta; i < 0; i++) {
      result = decrementDay(result);
    }
    return result;
  }
  return result;
};

/**
 * Сдвигает дату на целое число лет последовательными шагами по одному году.
 * На каждом шаге сохраняет последний день месяца по правилам incrementYear()
 * или decrementYear().
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @param {number} delta Целое число лет: положительное — вперёд, отрицательное — назад.
 * @returns {string} Дата YYYYMMDD; при нулевом смещении — исходная дата без разделителей.
 * @throws {RangeError} Смещение не является конечным числом.
 */
export const _changeYear = (period, delta) => {
  if (!Number.isFinite(delta)) throw new RangeError("Shift must be a finite number.");
  let result = getRawPeriod(period);
  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      result = incrementYear(result);
    }
    return result;
  }
  if (delta < 0) {
    for (let i = delta; i < 0; i++) {
      result = decrementYear(result);
    }
    return result;
  }
  return result;
};

/**
 * Сдвигает дату на целое число месяцев последовательными шагами по одному месяцу.
 * На каждом шаге сохраняет последний день месяца по правилам incrementMonth()
 * или decrementMonth(). День, заменённый последним днём месяца на промежуточном
 * шаге, в следующих месяцах также остаётся последним.
 *
 * @param {DateValue} period Дата в формате YYYYMMDD или с разделителями.
 * @param {number} delta Целое число месяцев: положительное — вперёд, отрицательное — назад.
 * @returns {string} Дата YYYYMMDD; при нулевом смещении — исходная дата без разделителей.
 * @throws {RangeError} Смещение не является конечным числом.
 */
export const _changeMonth = (period, delta) => {
  if (!Number.isFinite(delta)) throw new RangeError("Shift must be a finite number.");
  let result = getRawPeriod(period);
  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      result = incrementMonth(result);
    }
    return result;
  }
  if (delta < 0) {
    for (let i = delta; i < 0; i++) {
      result = decrementMonth(result);
    }
    return result;
  }
  return result;
};

// Разбор и операции со временем.

/**
 * Разбирает дату и время без зависимости от часового пояса компьютера.
 * Дата без времени означает полночь; дробные секунды и пояс хранятся отдельно.
 *
 * @param {DateInput} value Дата, дата со временем или узел строки AST.
 * @returns {DateTimeParts} Проверенные компоненты даты и времени.
 * @throws {RangeError} Формат или компоненты даты и времени некорректны.
 */
export function parseDateTime(value) {
  const text = String(unwrapQuotedString(value)).trim();
  const match = text.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?))?)?$/i);
  if (!match) throw new RangeError(`Invalid date and time: ${text}`);

  const [, y, m, d, h = "00", n = "00", s = "00", fraction = "", zone = ""] = match;

  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  date.setUTCHours(Number(h), Number(n), Number(s), 0);

  const timezone = zone.toUpperCase();
  const zoneDigits = timezone.replace(/[^0-9]/g, "");
  const zoneHours = Number(zoneDigits.slice(0, 2));
  const zoneMinutes = Number(zoneDigits.slice(2) || "0");

  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() + 1 !== Number(m)
      || date.getUTCDate() !== Number(d) || date.getUTCHours() !== Number(h)
      || date.getUTCMinutes() !== Number(n) || date.getUTCSeconds() !== Number(s)
      || zoneHours > 23 || zoneMinutes > 59) {
    throw new RangeError(`Invalid date and time: ${text}`);
  }

  const offsetMinutes = (timezone.startsWith("-") ? -1 : 1) * (zoneHours * 60 + zoneMinutes);

  return { date, fraction, timezone, offsetMinutes };
}

/**
 * Собирает дату и время, сохраняя дробные секунды и фиксированный пояс.
 * @param {DateTimeParts} parts Компоненты даты и времени.
 * @returns {string} Строка YYYY-MM-DD HH:mm:ss с необязательной дробью и поясом.
 * @throws {RangeError} Результат выходит за диапазон четырёхзначного года.
 */
export function formatDateTime(parts) {
  if (parts.date.getUTCFullYear() < 0 || parts.date.getUTCFullYear() > 9999) throw new RangeError("Year must be between 0000 and 9999.");
  return parts.date.toISOString().slice(0, 19).replace("T", " ") + (parts.fraction ? "." + parts.fraction : "") + parts.timezone;
}

/**
 * Сдвигает месяц, квартал или год, сохраняя время и последний день месяца.
 * Длина месяца вычисляется через Date с полным правилом григорианского календаря.
 * Месяцы и кварталы сдвигаются по месяцу, годы — по году.
 *
 * @param {DateTimeParts} parts Изменяемые компоненты даты и времени.
 * @param {number} delta Целое число единиц сдвига.
 * @param {string} unit Короткая единица m, q или y.
 * @returns {void}
 * @throws {RangeError} Результат выходит за диапазон четырёхзначного года.
 */
export function shiftCalendarTime(parts, delta, unit) {
  const stride = unit === "y" ? 12 : 1;
  const steps = unit === "q" ? delta * 3 : delta;
  const finalMonth = parts.date.getUTCFullYear() * 12 + parts.date.getUTCMonth() + steps * stride;
  if (finalMonth < 0 || finalMonth >= 120000) throw new RangeError("Year must be between 0000 and 9999.");

  const step = Math.sign(steps) * stride;
  for (let i = 0; i < Math.abs(steps); i++) {
    const date = parts.date;
    const last = new Date(date.getTime());
    last.setUTCMonth(date.getUTCMonth() + 1, 0);
    const isLastDay = date.getUTCDate() === last.getUTCDate();
    last.setUTCMonth(date.getUTCMonth() + step + 1, 0);
    date.setUTCMonth(date.getUTCMonth() + step, isLastDay ? last.getUTCDate() : Math.min(date.getUTCDate(), last.getUTCDate()));
  }
}

/**
 * Прибавляет секунды к компонентам даты без потери исходной дроби секунды.
 * Дробное смещение округляется до наносекунды; пояс остаётся фиксированным.
 *
 * @param {DateTimeParts} parts Изменяемые компоненты даты и времени.
 * @param {number} seconds Конечное число секунд, в том числе отрицательное или дробное.
 * @returns {void}
 * @throws {RangeError} Смещение секунд не является конечным числом.
 */
export function shiftTime(parts, seconds) {
  if (!Number.isFinite(seconds)) {
    throw new RangeError("Shift in seconds must be a finite number.");
  }
  const whole = Math.trunc(seconds);
  const remainder = seconds - whole;
  const extraDigits = Math.abs(remainder).toFixed(9).slice(2).replace(/0+$/, "");
  const precision = Math.max(parts.fraction.length, extraDigits.length);
  const scale = 10 ** precision;
  const fraction = Number(parts.fraction.padEnd(precision, "0") || "0") + Math.round(remainder * scale);
  const carry = Math.floor(fraction / scale);
  parts.date.setTime(parts.date.getTime() + (whole + carry) * 1000);
  parts.fraction = precision ? String(fraction - carry * scale).padStart(precision, "0") : "";
}

/**
 * Сбрасывает младшие части времени до начала заданного периода и удаляет дробь секунды.
 * @param {DateTimeParts} parts Изменяемые компоненты даты и времени.
 * @param {string} unit Короткая единица d, h, n или s.
 * @returns {DateTimeParts} Тот же объект с началом периода.
 */
export function truncateTime(parts, unit) {
  if (unit === "d") parts.date.setUTCHours(0, 0, 0, 0);
  else if (unit === "h") parts.date.setUTCMinutes(0, 0, 0);
  else if (unit === "n") parts.date.setUTCSeconds(0, 0);
  parts.fraction = "";
  return parts;
}

/**
 * Сравнивает моменты времени с учётом фиксированного пояса и дроби секунды.
 * Для строк без пояса используется UTC.
 *
 * @param {DateTimeParts} first Первый момент времени.
 * @param {DateTimeParts} last Второй момент времени.
 * @returns {number} Отрицательное число, 0 или положительное число.
 */
export function compareDateTime(first, last) {
  const firstTime = first.date.getTime() - first.offsetMinutes * 60000;
  const lastTime = last.date.getTime() - last.offsetMinutes * 60000;
  return firstTime - lastTime || Number("0." + (first.fraction || "0")) - Number("0." + (last.fraction || "0"));
}
