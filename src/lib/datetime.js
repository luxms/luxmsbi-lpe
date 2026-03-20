/**
 * @return {string}
 */
export function now() {
  return today();
}

/**
 * @return {string}
 */
export function today() {
  /**
   * Возвращает текущую дату в формате YYYY-MM-DD
   *
   * @usage today()
   *
   * @example today() => "2024-01-15" (зависит от текущей даты)
   * @category Календарные функции | 1
   */
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param one
 * @param two
 * @param three
 */
export function dateShift(one, two, three) {
  /**
   * Сдвигает дату на указанное количество единиц времени
   *
   * Поддерживает несколько вариантов вызова:
   * 1. С указанием начальной даты: dateShift(start, delta, unit)
   * 2. С начальной датой по умолчанию (сегодня): dateShift(delta, unit)
   * 3. С массивом дат: dateShift([start1, start2], delta, unit) сдвигает обе даты
   *
   * @usage dateShift(start, delta, unit)
   * @param start [string] Начальная дата (YYYY-MM-DD)
   * @param delta [number] Величина сдвига (положительная или отрицательная)
   * @param unit [DateUnit] Единица измерения: 'd'/'day', 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
   *
   * @usage dateShift(delta, unit)
   * @param delta [number] Величина сдвига
   * @param unit [DateUnit] Единица измерения
   *
   * @usage dateShift([start1, start2], delta, unit)
   * @param dates [array] Массив дат
   * @param delta [number] Величина сдвига
   * @param unit [DateUnit] Единица измерения
   *
   * @example dateShift("2024-01-15", 5, 'd') => "2024-01-20"
   *          dateShift("2024-01-15", -1, 'm') => "2023-12-15"
   *          dateShift(3, 'd') => сдвигает сегодняшнюю дату на 3 дня
   *          dateShift(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-02-01", "2024-02-29"]
   * @category Календарные функции | 7
   */
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
 * @param one
 * @param two
 * @return string
 */
export function toStart(one, two) {
  /**
   * Возвращает начало периода
   *
   * @usage toStart(date, unit)
   * @param date [string] Дата
   * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
   *
   * @usage toStart(unit)
   * @param unit [DateUnit] Период (для текущей даты)
   *
   * @example toStart("2024-01-15", 'm') => "2024-01-01"
   *          toStart("2024-01-15", 'q') => "2024-01-01"
   *          toStart('y') => начало текущего года
   * @category Календарные функции | 5
   */
  let start = one;
  let unit = two;
  if (two === undefined) {
    unit = one;
    start = today();
  }
  const [y, m] = getSplitPeriod(getRawPeriod(start));
  switch (unit) {
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
 * @param one
 * @param two
 * @return string
 */
export function toEnd(one, two) {
  /**
   * Возвращает конец периода
   *
   * @usage toEnd(date, unit)
   * @param date [string] Дата
   * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
   *
   * @usage toEnd(unit)
   * @param unit [string] Период (для текущей даты)
   *
   * @example toEnd("2024-01-15", 'm') => "2024-01-31"
   *          toEnd("2024-01-15", 'q') => "2024-03-31"
   *          toEnd('y') => конец текущего года
   * @category Календарные функции | 6
   */
  let start = one;
  let unit = two;
  if (two === undefined) {
    start = today();
    unit = one;
  }
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
 * @param one
 * @param two
 * @return string[]
 */
export function bound(one, two) {
  /**
   * Возвращает границы периода (начало и конец)
   *
   * @usage bound(date, unit)
   * @param date [string] Дата (YYYY-MM-DD)
   * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
   *
   * @usage bound(unit)
   * @param unit [DateUnit] Период (для текущей даты)
   *
   * @example bound("2024-01-15", 'm') => ["2024-01-01", "2024-01-31"]
   *          bound("2024-01-15", 'q') => ["2024-01-01", "2024-03-31"]
   *          bound('w') => границы текущей недели
   * @category Календарные функции | 10
   */
  let start = one;
  let unit = two;
  if (two === undefined) {
    start = today();
    unit = one;
  }
  return [toStart(start, unit), toEnd(start, unit)];
}

/**
 * @param one
 * @param two
 * @param three
 * @return string[]
 */
export function extend(one, two, three) {
  /**
   * Расширяет период, сдвигая конечную дату
   *
   * @usage extend(start, delta, unit)
   * @param start [string] Начальная дата
   * @param delta [number] Величина расширения
   * @param unit [DateUnit] Единица измерения: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
   *
   * @usage extend(delta, unit)
   * @param delta [number] Величина расширения
   * @param unit [DateUnit] Единица измерения (от текущей даты)
   *
   * @usage extend([start, end], delta, unit)
   * @param period [array] Период [начало, конец]
   * @param delta [number] Величина расширения
   * @param unit [DateUnit] Единица измерения
   *
   * @example extend("2024-01-01", 5, 'd') => ["2024-01-01", "2024-01-06"]
   * @example extend(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-01-01", "2024-02-29"]
   * @category Календарные функции | 11
   */
  let start = one;
  let delta = two;
  let unit = three;
  if (unit === undefined) {
    start = today();
    delta = one;
    unit = two;
  }
  if (Array.isArray(start)) {
    const s = start[0];
    const e = dateShift(start[1], delta, unit);
    const min = Math.min(Number(getRawPeriod(s)), Number(getRawPeriod(e)));
    const max = Math.max(Number(getRawPeriod(s)), Number(getRawPeriod(e)));
    return [ffPeriod(min), ffPeriod(max)];
  }
  return [start, dateShift(start, delta, unit)];
}


/**
 * @param {string} dt
 * @return number
 */
export function year(dt) {
  /**
   * Возвращает год как число
   *
   * @usage year(date)
   * @param date [string] Дата
   *
   * @example year("2024-01-15") => 2024
   * @category Календарные функции | 30
   */
  const [y] = getSplitPeriod(getRawPeriod(dt));
  return y;
}

/**
 * @param {string} dt
 * @return number
 */
export function hoty(dt) {
  /**
   * Возвращает номер полугодия (1 или 2)
   *
   * @usage hoty(date)
   * @param date [string] Дата
   *
   * @example hoty("2024-01-15") => 1
   *          hoty("2024-07-15") => 2
   * @category Календарные функции | 31
   */
  return getHalfYearNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function qoty(dt) {
  /**
   * Возвращает номер квартала (1-4)
   *
   * @usage qoty(date)
   * @param date [string] Дата
   *
   * @example qoty("2024-01-15") => 1
   *          qoty("2024-10-15") => 4
   * @category Календарные функции | 32
   */
  return getQuarter(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function moty(dt) {
  /**
   * Возвращает номер месяца (1-12)
   *
   * @usage moty(date)
   * @param date [string] Дата
   *
   * @example moty("2024-01-15") => 1
   *          moty("2024-12-15") => 12
   * @category Календарные функции | 33
   */
  const [, m] = getSplitPeriod(getRawPeriod(dt));
  return m;
}

/**
 * @param {string} dt
 * @return number
 */
export function woty(dt) {
  /**
   * Возвращает номер недели в году (1-53)
   *
   * @usage woty(date)
   * @param date [string] Дата
   *
   * @example woty("2024-01-15") => 3
   * @category Календарные функции | 34
   */
  return getWeekNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function doty(dt) {
  /**
   * Возвращает номер дня в году (1-366)
   *
   * @usage doty(date)
   * @param date [string] Дата
   *
   * @example doty("2024-01-15") => 15
   * @example doty("2024-12-31") => 366 (високосный год)
   * @category Календарные функции | 35
   */
  return getDayNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return string
 */
export function isoy(dt) {
  /**
   * Возвращает год в формате ISO
   *
   * @usage isoy(date)
   * @param date [string] Дата
   *
   * @example isoy("2024-01-15") => "2024"
   * @category Календарные функции | 20
   */
  return `${year(dt)}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isom(dt) {
  /**
   * Возвращает месяц в формате ISO (YYYY-MM)
   *
   * @usage isom(date)
   * @param date [string] Дата
   *
   * @example isom("2024-01-15") => "2024-01"
   * @category Календарные функции | 22
   */
  return `${year(dt)}-${l2(moty(dt))}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isoq(dt) {
  /**
   * Возвращает квартал в формате ISO (YYYY-Qx)
   *
   * @usage isoq(date)
   * @param date [string] Дата
   *
   * @example isoq("2024-01-15") => "2024-Q1"
   *          isoq("2024-05-15") => "2024-Q2"
   * @category Календарные функции | 21
   */
  return `${year(dt)}-Q${qoty(dt)}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isow(dt) {
  /**
   * Возвращает неделю в формате ISO (YYYY-Www)
   *
   * @usage isow(date)
   * @param date [string] Дата
   *
   * @example isow("2024-01-15") => "2024-W03"
   * @category Календарные функции | 23
   */
  return `${year(dt)}-W${l2(woty(dt))}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isod(dt) {
  /**
   * Возвращает день года в формате ISO (YYYY-ddd)
   *
   * @usage isod(date)
   * @param date [string] Дата
   *
   * @example isod("2024-01-15") => "2024-015"
   * @category Календарные функции | 24
   */
  return `${year(dt)}-${doty(dt)}`;
}

export const DATE_TIME = {
  'dateShift': dateShift,
  'today': today,
  'now': today,
  'bound': bound,
  'extend': extend,
  'toStart': toStart,
  'toEnd': toEnd,

  'isoy': isoy,
  'isoq': isoq,
  'isom': isom,
  'isow': isow,
  'isod': isod,

  'year': year,
  'hoty': hoty,
  'qoty': qoty,
  'moty': moty,
  'woty': woty,
  'doty': doty,
}






// ==================== help fn  =======================

/**
 * @param m {string | number} - month
 * @return string - format ##
 */
const l2 = (m) => ('00' + (m  + '' || '')).slice(-2);

/**
 * @param {number} year
 * @returns boolean
 * @description leap year or not
 */
const isLeap = (year) => getSplitPeriod(year)[0] % 4 === 0;

/**
 * @param year {number}
 * @param month {number}
 * @return number
 */
const getDaysInMonth = (year, month) => {
  if (month === 2 && isLeap(year)) return 29;
  return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

/**
 * @param period {string | number} - format YYYYMMDD,YYYY-MM-DD, YYYY.MM.DD ...
 * @return string - format YYYYMMDD
 */
function getRawPeriod(period = '') {
  const p = String(period);
  return p.replace(/[^0-9]/g, '').slice(0, 8);
}

/**
 * @param period {string | number} - format YYYYMMDD,YYYY-MM-DD, YYYY.MM.DD ...
 * @return string - YYYY-MM-DD
 */
function ffPeriod(period = '') {
  const p = getRawPeriod(String(period));
  return `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}`;
}

/**
 * @param year {number}
 * @param month {number}
 * @param day {number}
 * @return string - YYYYMMDD
 */
const makePeriod = (year, month, day) => year.toString() + l2(month) + l2(day);

/**
 * @param period {string | number} - format YYYYMMDD
 * @return {[number, number, number]} [year, month, day]
 */
const getSplitPeriod = (period = '') => [+period.toString().slice(0, 4), +period.toString().slice(4, 6), +period.toString().slice(6, 8)];

/**
 * @param period {string | number} - format YYYYMMDD
 * @return number
 * @description 1 - 7
 */
export const getDoW = (period) => {
  const [year, month, day] = getSplitPeriod(period);
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 ? 7 : dow;
};

/**
 * @param period {string | number} - format YYYYMMDD
 * @return number
 * @description 1-40
 */
function getWeekNumber(period) {
  if (!period) return -1;
  const [year, month, day] = getSplitPeriod(period ?? '');
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * @param period {string | number} - format YYYYMMDD
 * @return {number | null}
 * @description 1-4
 */
function getQuarter(period) {
  if (!period) return null;
  const [, periodStartMonth] = getSplitPeriod(period ?? '');
  return Math.ceil(periodStartMonth / 3);
}

/**
 * @param period {string | number} - format YYYYMMDD
 * @return {1 | 2}
 * @description 1 | 2
 */
const getHalfYearNumber = (period) => {
  const [_, m] = getSplitPeriod(period);
  return m > 6 ? 2 : 1;
};

/**
 * @param period {string | number} - format YYYYMMDD
 * @return {number | null}
 * @description 1|4|7|10
 */
function getFirstMonthQuarter(period) {
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
 * @param period {string | number} - format YYYYMMDD
 * @return {number | null}
 * @description 3|6|9|12
 */
function getLastMonthQuarter(period) {
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
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD first day in week
 */
function getStartDayWeek(period) {
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
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD last day in week
 */
function getLastDayWeek(period) {
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
 * @param period {string | number} - format YYYYMMDD
 * @return number - day in year
 * @description  1-356
 */
const getDayNumber = (period) => {
  if (!period) return -1;
  const [y, m, d] = getSplitPeriod(period);
  const now = new Date(y, m - 1, d);
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return  Math.floor(diff / oneDay);
};

/**
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string | number} - format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string | number}- format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string | number}- format YYYYMMDD
 * @return string - format YYYYMMDD
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
 * @param period {string}
 * @param delta {number}
 * @return string
 */
const _changeDay = (period, delta) => {
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
 * @param period {string}
 * @param delta {number}
 * @return string
 */
const _changeYear = (period, delta) => {
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
 * @param period {string}
 * @param delta {number}
 * @return string
 */
const _changeMonth = (period, delta) => {
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