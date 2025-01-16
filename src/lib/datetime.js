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
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param one
 * @param two
 * @param three
 */
export function dateShift(one, two, three) {
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
  const [y] = getSplitPeriod(getRawPeriod(dt));
  return y;
}

/**
 * @param {string} dt
 * @return number
 */
export function hoty(dt) {
  return getHalfYearNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function qoty(dt) {
  return getQuarter(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function moty(dt) {
  const [, m] = getSplitPeriod(getRawPeriod(dt));
  return m;
}

/**
 * @param {string} dt
 * @return number
 */
export function woty(dt) {
  return getWeekNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return number
 */
export function doty(dt) {
  return getDayNumber(getRawPeriod(dt));
}

/**
 * @param {string} dt
 * @return string
 */
export function isoy(dt) {
  return `${year(dt)}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isom(dt) {
  return `${year(dt)}-${l2(moty(dt))}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isoq(dt) {
  return `${year(dt)}-Q${qoty(dt)}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isow(dt) {
  return `${year(dt)}-W${l2(woty(dt))}`;
}

/**
 * @param {string} dt
 * @return string
 */
export function isod(dt) {
  return `${year(dt)}-${doty(dt)}`;
}

export const DATE_TIME = {
  'dateShift': dateShift,
  'today': today,
  'now': now,
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