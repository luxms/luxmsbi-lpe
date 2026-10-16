const assert = require("assert");
const { spawnSync } = require("child_process");

const loadSource = require("./load-source");
const utils = loadSource(require.resolve("../../src/lib/date/utils"));
const calendar = loadSource(require.resolve("../../src/lib/date/date"));
const time = loadSource(require.resolve("../../src/lib/date/time"));

describe("Строки AST и единицы измерения", () => {
  it("Извлекает строки с обоими видами кавычек и необязательной меткой", () => {
    for (const value of [["'", "2024-01-15"], ['"', "2024-01-15", "D"], ["'", "2024-01-15", "D"]]) {
      assert.strictEqual(utils.unwrapQuotedString(value), "2024-01-15");
    }
  });

  it("Сохраняет значения и массивы, которые не являются строковыми узлами AST", () => {
    for (const value of [null, undefined, 0, "2024-01-15", {}, [], ["'"], ["'", 42], ["2024-01-01", "2024-01-31"]]) {
      assert.strictEqual(utils.unwrapQuotedString(value), value);
    }
  });

  for (const [unit, aliases] of [
    ["y", ["y", "year"]], ["q", ["q", "quarter"]], ["m", ["m", "month"]],
    ["w", ["w", "week", "ww", "iw"]], ["d", ["d", "day", "dd"]],
    ["h", ["h", "hour", "hh", "hh24"]], ["n", ["n", "minute", "min", "mi"]],
    ["s", ["s", "second", "sec", "ss"]],
  ]) {
    it(`Нормализует обозначения единицы ${unit}, включая регистр, пробелы и AST`, () => {
      for (const alias of aliases) {
        assert.strictEqual(utils.normalizeDateUnit(alias), unit);
        assert.strictEqual(utils.normalizeDateUnit("  " + alias.toUpperCase() + "  "), unit);
        assert.strictEqual(utils.normalizeDateUnit(["'", alias]), unit);
      }
      assert.strictEqual(utils.isTimeUnit(unit), ["h", "n", "s"].includes(unit));
    });
  }

  it("Сохраняет неизвестные единицы после удаления пробелов и смены регистра", () => {
    for (const name of ["Unknown", "constructor", "__proto__", "toString", "hasOwnProperty"]) {
      assert.strictEqual(utils.normalizeDateUnit(" " + name + " "), name.toLowerCase());
    }
    assert.strictEqual(utils.normalizeDateUnit(undefined), "undefined");
    assert.strictEqual(utils.isTimeUnit("hour"), false);
    assert.strictEqual(utils.isTimeUnit(undefined), false);
  });
});

describe("Вспомогательные календарные функции", () => {
  it("Отклоняет неконечные смещения до входа во внутренние календарные циклы", () => {
    const script = `
      const assert = require("assert");
      const loadSource = require(${JSON.stringify(require.resolve("./load-source"))});
      const utils = loadSource(${JSON.stringify(require.resolve("../../src/lib/date/utils"))});
      for (const name of ["_changeDay", "_changeMonth", "_changeYear"]) {
        for (const delta of [Infinity, -Infinity, NaN]) {
          assert.throws(() => utils[name]("2024-01-15", delta), {
            name: "RangeError", message: "Shift must be a finite number.",
          });
        }
      }
      process.stdout.write("ok");
    `;
    const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8", timeout: 1500 });
    assert.ifError(result.error);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(result.stdout, "ok");
  }).timeout(5000);

  const cases = [
    ["Дополняет однозначное число нулём", "l2", [3], "03"],
    ["Оставляет два последних символа числа", "l2", [123], "23"],
    ["Удаляет разделители даты", "getRawPeriod", ["2024.01.15"], "20240115"],
    ["Отделяет дату от времени и часового смещения", "getRawPeriod", ["2024-01-15T23:59:59+03:00"], "20240115"],
    ["Принимает дату в числовом формате", "getRawPeriod", [20240115], "20240115"],
    ["Возвращает пустую строку для отсутствующей записи даты", "getRawPeriod", [], ""],
    ["Форматирует компактную дату", "ffPeriod", [20240115], "2024-01-15"],
    ["Форматирует дату с точками", "ffPeriod", ["2024.01.15"], "2024-01-15"],
    ["Сохраняет поведение форматирования пустой даты", "ffPeriod", [], "--"],
    ["Собирает компактную дату из компонентов", "makePeriod", [2024, 1, 5], "20240105"],
    ["Разбивает компактную дату на числа", "getSplitPeriod", ["20240105"], [2024, 1, 5]],
    ["Разбивает числовую дату на компоненты", "getSplitPeriod", [20240105], [2024, 1, 5]],
    ["Возвращает нулевые компоненты для пустой даты", "getSplitPeriod", [], [0, 0, 0]],
    ["Определяет понедельник", "getDoW", ["20240115"], 1],
    ["Определяет воскресенье", "getDoW", ["20240121"], 7],
    ["Находит понедельник с переходом через февраль", "getStartDayWeek", ["20240301"], "20240226"],
    ["Находит понедельник в предыдущем году", "getStartDayWeek", ["20230101"], "20221226"],
    ["Сохраняет дату понедельника", "getStartDayWeek", ["20240115"], "20240115"],
    ["Находит воскресенье с переходом через февраль", "getLastDayWeek", ["20240228"], "20240303"],
    ["Находит воскресенье в следующем году", "getLastDayWeek", ["20241231"], "20250105"],
    ["Сохраняет дату воскресенья", "getLastDayWeek", ["20240121"], "20240121"],
    ["Возвращает пустое начало недели для пустой даты", "getStartDayWeek", [""], ""],
    ["Возвращает пустой конец недели для пустой даты", "getLastDayWeek", [0], ""],
    ["Возвращает признак отсутствующей недели", "getWeekNumber", [""], -1],
    ["Возвращает признак отсутствующего квартала", "getQuarter", [""], null],
    ["Не находит первый месяц для отсутствующего квартала", "getFirstMonthQuarter", [""], null],
    ["Не находит последний месяц для отсутствующего квартала", "getLastMonthQuarter", [""], null],
    ["Относит июнь к первому полугодию", "getHalfYearNumber", ["20240630"], 1],
    ["Относит июль ко второму полугодию", "getHalfYearNumber", ["20240701"], 2],
    ["Возвращает первый день года", "getDayNumber", ["20240101"], 1],
    ["Возвращает признак отсутствующего дня года", "getDayNumber", [""], -1],
  ];
  for (const [description, name, args, expected] of cases) {
    it(description, () => assert.deepStrictEqual(utils[name](...args), expected));
  }

  it("Определяет длительность всех месяцев обычного и високосного года", () => {
    for (const year of [2023, 2024, 2000]) {
      const expected = [31, year === 2023 ? 28 : 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      expected.forEach((days, i) => assert.strictEqual(utils.getDaysInMonth(year, i + 1), days));
    }
    assert.strictEqual(utils.getDaysInMonth(2024, 13), undefined);
  });

  it("Определяет квартал и его месяцы для каждого месяца года", () => {
    for (const [quarter, months, first, last] of [[1, [1, 2, 3], 1, 3], [2, [4, 5, 6], 4, 6], [3, [7, 8, 9], 7, 9], [4, [10, 11, 12], 10, 12]]) {
      for (const month of months) {
        const period = "2024" + String(month).padStart(2, "0") + "15";
        assert.strictEqual(utils.getQuarter(period), quarter);
        assert.strictEqual(utils.getFirstMonthQuarter(period), first);
        assert.strictEqual(utils.getLastMonthQuarter(period), last);
      }
    }
  });

  for (const [period, week] of [["20041231", 53], ["20050101", 53], ["20071231", 1], ["20201231", 53], ["20210104", 1]]) {
    it(`Определяет неделю ISO на границе года для ${period}`, () => {
      assert.strictEqual(utils.getWeekNumber(period), week);
    });
  }

  for (const [name, initial, delta, expected] of [
    ["_changeDay", "2024-01-15", 0, "20240115"],
    ["_changeDay", "2023-12-31", 1, "20240101"],
    ["_changeDay", "2024-01-01", -1, "20231231"],
    ["_changeDay", "2024-03-01", -1, "20240229"],
    ["_changeDay", "2023-03-01", -1, "20230228"],
    ["_changeDay", "2024-02-28", 2, "20240301"],
    ["_changeMonth", "2024-01-15", 0, "20240115"],
    ["_changeMonth", "2023-12-15", 1, "20240115"],
    ["_changeMonth", "2024-01-15", -1, "20231215"],
    ["_changeMonth", "2024-01-30", 2, "20240331"],
    ["_changeMonth", "2024-03-30", -2, "20240131"],
    ["_changeMonth", "2024-04-30", -1, "20240331"],
    ["_changeYear", "2024-01-15", 0, "20240115"],
    ["_changeYear", "2024-02-29", -1, "20230228"],
    ["_changeYear", "2023-02-28", 1, "20240229"],
    ["_changeYear", "2023-01-30", 2, "20250130"],
    ["_changeYear", "2025-01-30", -2, "20230130"],
  ]) {
    it(`Сдвигает календарную дату: ${name}(${initial}, ${delta})`, () => {
      assert.strictEqual(utils[name](initial, delta), expected);
    });
  }
});

describe("Разбор и форматирование даты со временем", () => {
  for (const [input, expected, offset] of [
    ["2024-01-15", "2024-01-15 00:00:00", 0],
    [20240115, "2024-01-15 00:00:00", 0],
    ["2024.01.15", "2024-01-15 00:00:00", 0],
    ["2024/01/15", "2024-01-15 00:00:00", 0],
    [" 2024-01-15t12:34:56.100z ", "2024-01-15 12:34:56.100Z", 0],
    ["2024-01-15 12:34:56+03", "2024-01-15 12:34:56+03", 180],
    ["2024-01-15 12:34:56-0330", "2024-01-15 12:34:56-0330", -210],
    ["2024-01-15 12:34:56.123456789+05:45", "2024-01-15 12:34:56.123456789+05:45", 345],
    [["'", "2024-01-15 12:34:56", "D"], "2024-01-15 12:34:56", 0],
    ["0000-02-29 00:00:00Z", "0000-02-29 00:00:00Z", 0],
    ["0099-12-31 23:59:59", "0099-12-31 23:59:59", 0],
    ["9999-12-31 23:59:59.999999999", "9999-12-31 23:59:59.999999999", 0],
  ]) {
    it(`Разбирает и восстанавливает дату: ${JSON.stringify(input)}`, () => {
      const parts = utils.parseDateTime(input);
      assert.strictEqual(utils.formatDateTime(parts), expected);
      assert.strictEqual(parts.offsetMinutes, offset);
      assert.strictEqual(parts.date.getUTCMilliseconds(), 0);
    });
  }

  for (const value of [
    "", "invalid", null, undefined, "2024-1-15", "2024-00-15", "2024-13-15", "2024-01-00",
    "2024-04-31", "2023-02-29", "1900-02-29", "2100-02-29", "2024-01-15T24:00:00",
    "2024-01-15 12:60:00", "2024-01-15 12:00:60", "2024-01-15 12:00",
    "2024-01-15 12:00:00.1234567890", "2024-01-15 12:00:00+24:00", "2024-01-15 12:00:00-03:60",
    "2024-01-15Z", "2024-01-15 12:00:00 Europe/Moscow",
  ]) {
    it(`Отклоняет некорректную дату или время: ${JSON.stringify(value)}`, () => {
      assert.throws(() => utils.parseDateTime(value), {
        name: "RangeError", message: "Invalid date and time: " + String(value).trim(),
      });
    });
  }

  it("Отклоняет результат за нижней и верхней границей четырёхзначного года", () => {
    for (const [input, delta] of [["0000-01-01", -1], ["9999-12-31 23:59:59", 1]]) {
      const parts = utils.parseDateTime(input);
      utils.shiftTime(parts, delta);
      assert.throws(() => utils.formatDateTime(parts), {
        name: "RangeError", message: "Year must be between 0000 and 9999.",
      });
    }
  });
});

describe("Операции с компонентами времени", () => {
  for (const [delta, expected] of [[0, "2024-01-15 12:00:00.125Z"], [0.875, "2024-01-15 12:00:01.000Z"], [-0.25, "2024-01-15 11:59:59.875Z"], [1.5, "2024-01-15 12:00:01.625Z"]]) {
    it(`Сдвигает дробную секунду на ${delta} с сохранением точности`, () => {
      const parts = utils.parseDateTime("2024-01-15 12:00:00.125Z");
      utils.shiftTime(parts, delta);
      assert.strictEqual(utils.formatDateTime(parts), expected);
    });
  }

  it("Округляет доли секунды до наносекунды", () => {
    const parts = utils.parseDateTime("2024-01-15 00:00:00");
    utils.shiftTime(parts, 0.1234567894);
    assert.strictEqual(utils.formatDateTime(parts), "2024-01-15 00:00:00.123456789");
  });

  it("Отклоняет неконечное число секунд и значения другого типа", () => {
    for (const value of [NaN, Infinity, -Infinity, "1", null, undefined]) {
      assert.throws(() => utils.shiftTime(utils.parseDateTime("2024-01-15"), value), {
        name: "RangeError", message: "Shift in seconds must be a finite number.",
      });
    }
  });

  for (const [unit, expected] of [["d", "00:00:00"], ["h", "12:00:00"], ["n", "12:34:00"], ["s", "12:34:56"]]) {
    it(`Обрезает время до начала периода ${unit}, сохраняя пояс`, () => {
      const parts = utils.parseDateTime("2024-01-15 12:34:56.123456789+03:00");
      assert.strictEqual(utils.truncateTime(parts, unit), parts);
      assert.strictEqual(utils.formatDateTime(parts), "2024-01-15 " + expected + "+03:00");
    });
  }

  for (const [first, last, sign] of [
    ["2024-01-15 12:00:00+03:00", "2024-01-15 09:00:00Z", 0],
    ["2024-01-15 12:00:00+03:00", "2024-01-15 10:30:00+01:00", -1],
    ["2024-01-15 12:00:00", "2024-01-15 11:59:59.999999999Z", 1],
    ["2024-01-15 12:00:00.000000001Z", "2024-01-15 12:00:00.000000002Z", -1],
    ["2024-01-15 12:00:00.1Z", "2024-01-15 12:00:00.100000000Z", 0],
  ]) {
    it(`Сравнивает моменты с учётом пояса и наносекунд: ${first} / ${last}`, () => {
      assert.strictEqual(Math.sign(utils.compareDateTime(utils.parseDateTime(first), utils.parseDateTime(last))), sign);
    });
  }

  for (const [initial, delta, unit, expected] of [
    ["2024-03-31", -1, "m", "2024-02-29"],
    ["2024-03-30", -2, "m", "2024-01-31"],
    ["2024-05-15", -1, "q", "2024-02-15"],
    ["2024-02-29", -1, "y", "2023-02-28"],
    ["2024-01-15", 0, "m", "2024-01-15"],
    ["2024-01-15", 12, "m", "2025-01-15"],
  ]) {
    it(`Сдвигает календарные компоненты: ${initial}, ${delta}, ${unit}`, () => {
      const parts = utils.parseDateTime(initial + " 12:34:56.123456789+05:45");
      utils.shiftCalendarTime(parts, delta, unit);
      assert.strictEqual(utils.formatDateTime(parts), expected + " 12:34:56.123456789+05:45");
    });
  }

  it("Проверяет обе границы года до начала календарного сдвига", () => {
    for (const [initial, delta] of [["0000-01-01", -1], ["9999-12-31", 1]]) {
      assert.throws(() => utils.shiftCalendarTime(utils.parseDateTime(initial), delta, "m"), {
        name: "RangeError", message: "Year must be between 0000 and 9999.",
      });
    }
  });
});

// Строковые узлы AST передаются функциям как обычные аргументы JavaScript.
// Проверяется извлечение значения из массива, включая необязательную метку D.
describe("Обработка строк с меткой D", () => {
  // Строковые узлы даты и единицы измерения.
  const dDate = ["'", '2024-01-15', 'D'];
  const qDate = ["'", '2024-01-15'];           // Строка в кавычках без метки.
  const qUnit = ["'", 'm'];                    // Единица измерения в кавычках.

  describe("Прямой вызов со строковым узлом с меткой D", () => {
    it("dateShift принимает строку с меткой D", () => {
      assert.strictEqual(
        calendar.dateShift(["'", '2024-01-15', "D"], 5, 'd'),
        '2024-01-20'
      );
    });
    it("toStart принимает строку с меткой D", () => {
      assert.strictEqual(
        calendar.toStart(["'", '2024-01-15', "D"], 'm'),
        '2024-01-01'
      );
    });
    it("year принимает строку с меткой D", () => {
      assert.strictEqual(
        calendar.year(["'", '2024-01-15', "D"]),
        2024
      );
    });
    it("isom принимает строку с меткой D", () => {
      assert.strictEqual(
        calendar.isom(["'", '2024-01-15', "D"]),
        '2024-01'
      );
    });
  });

  describe("Прямой вызов с узлом, сохранённым в переменной", () => {
    it("dateShift извлекает дату из переданного строкового узла", () => {
      assert.strictEqual(
        calendar.dateShift(dDate, 5, ["'", 'd']),
        '2024-01-20'
      );
    });
    it("extend извлекает дату из переданного строкового узла", () => {
      assert.deepStrictEqual(
        calendar.extend(dDate, 5, ["'", 'd']),
        ['2024-01-15', '2024-01-20']
      );
    });
    it("toStart извлекает дату из переданного строкового узла", () => {
      assert.strictEqual(
        calendar.toStart(dDate, ["'", 'm']),
        '2024-01-01'
      );
    });
    it("toEnd извлекает дату из переданного строкового узла", () => {
      assert.strictEqual(
        calendar.toEnd(dDate, ["'", 'm']),
        '2024-01-31'
      );
    });
    it("bound извлекает дату из переданного строкового узла", () => {
      assert.deepStrictEqual(
        calendar.bound(dDate, ["'", 'm']),
        ['2024-01-01', '2024-01-31']
      );
    });
    it("year, qoty, moty и isom извлекают дату из переданного строкового узла", () => {
      assert.strictEqual(calendar.year(dDate), 2024);
      assert.strictEqual(calendar.qoty(dDate), 1);
      assert.strictEqual(calendar.moty(dDate), 1);
      assert.strictEqual(calendar.isom(dDate), '2024-01');
    });
    it("Принимает строковый узел без метки D", () => {
      assert.strictEqual(
        calendar.dateShift(qDate, 5, ["'", 'd']),
        '2024-01-20'
      );
    });
    it("Принимает строковый узел единицы измерения", () => {
      assert.strictEqual(
        calendar.toStart('2024-01-15', qUnit),
        '2024-01-01'
      );
    });
  });

  describe("Распознавание интервала из двух дат", () => {
    it("dateShift сохраняет обе границы переданного интервала", () => {
      assert.deepStrictEqual(
        calendar.dateShift(['2024-01-01', '2024-01-31'], 1, ["'", 'm']),
        ['2024-02-01', '2024-02-29']
      );
    });
    it("extend сохраняет структуру переданного интервала", () => {
      assert.deepStrictEqual(
        calendar.extend(['2024-01-01', '2024-01-31'], 1, ["'", 'm']),
        ['2024-01-01', '2024-02-29']
      );
    });
  });
});

describe("Общие проверки даты и времени", () => {
  for (const [aliases, expected] of [
    [["hour", "H", "HH24", " hour "], "2024-01-15 13:34:56"],
    [["minute", "min", "MI", "N"], "2024-01-15 12:35:56"],
    [["second", "sec", "SS", "S"], "2024-01-15 12:34:57"],
  ]) {
    it(`Поддерживает обозначения единиц из SQL: ${aliases.join(", ")}`, () => {
      for (const alias of aliases) {
        assert.strictEqual(calendar.dateShift("2024-01-15 12:34:56", 1, alias), expected);
      }
    });
  }

  it("Извлекает дату со временем и единицу измерения из переданных узлов", () => {
    const timestamp = ["'", "2024-01-15 12:34:56", "D"];
    const unit = ["'", "hour"];
    assert.strictEqual(time.dateTimeShift(timestamp, 1, unit), "2024-01-15 13:34:56");
    assert.strictEqual(calendar.toStart(timestamp, unit), "2024-01-15 12:00:00");
    assert.strictEqual(calendar.extract(timestamp, unit), 12);
  });

  it("Отклоняет неверные даты, единицы измерения и неконечные смещения", () => {
    for (const timestamp of ["2024-02-30 12:00:00", "2024-01-15 25:00:00", "2024-01-15 12:00:00+24:00", "invalid"]) {
      assert.throws(() => time.dateTimeShift(timestamp, 1, "h"), RangeError);
    }
    assert.throws(() => time.dateTimeShift("2024-01-15", Infinity, "s"), RangeError);
    assert.throws(() => time.dateTimeShift("2024-01-15", 1, "unknown"), RangeError);
    assert.throws(() => time.dateTimeShift("9999-12-31 23:59:59", 1, "s"), RangeError);
    assert.throws(() => time.dateTimeShift("2024-01-15", 1e308, "m"), RangeError);
    assert.throws(() => calendar.extract("2024-01-15", "unknown"), RangeError);
  });

  it("Отклоняет неизвестные единицы, совпадающие с именами свойств Object.prototype", () => {
    for (const unit of ["constructor", "__proto__"]) {
      assert.throws(() => time.dateTimeShift("2024-01-15", 1, unit), {
        name: "RangeError", message: `Unknown date unit: ${unit}`,
      });
      assert.throws(() => calendar.extract("2024-01-15", unit), {
        name: "RangeError", message: `Unknown date unit: ${unit}`,
      });
    }
  });

  it("Возвращает сообщения об ошибках на английском языке", () => {
    const cases = [
      [() => time.dateTimeShift("invalid", 1, "h"), "Invalid date and time: invalid"],
      [() => time.dateTimeShift("2024-02-30", 1, "h"), "Invalid date and time: 2024-02-30"],
      [() => time.dateTimeShift("2024-01-15", Infinity, "s"), "Shift must be a finite number and an integer for months, quarters, and years."],
      [() => time.dateTimeShift("2024-01-15", 1e308, "h"), "Shift in seconds must be a finite number."],
      [() => time.dateTimeShift("9999-12-31 23:59:59", 1, "s"), "Year must be between 0000 and 9999."],
      [() => time.dateTimeShift("2024-01-15", 1e308, "m"), "Year must be between 0000 and 9999."],
    ];
    for (const [action, message] of cases) {
      assert.throws(action, { name: "RangeError", message });
    }
  });
});
