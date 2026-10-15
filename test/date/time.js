const assert = require("assert");
const { execFileSync } = require("child_process");

const loadSource = require("./load-source");
const time = loadSource(require.resolve("../../src/lib/date/time"));
const calendar = loadSource(require.resolve("../../src/lib/date/date"));

describe("Внутренние функции работы со временем", () => {
  it("Экспортирует функции времени и общие вспомогательные функции", () => {
    const utils = loadSource(require.resolve("../../src/lib/date/utils"));
    assert.deepStrictEqual(Object.keys(time.TIME_FUNCTIONS).sort(), ["dateTimeShift", "now"]);
    for (const name of ["now", "dateTimeShift"]) {
      assert.strictEqual(time.TIME_FUNCTIONS[name], time[name]);
      assert.strictEqual(typeof time[name], "function");
    }
    for (const name of ["unwrapQuotedString", "normalizeDateUnit", "isTimeUnit"]) {
      assert.strictEqual(time[name], utils[name]);
    }
  });

  for (const [unit, start, end, extracted] of [
    ["h", "12:00:00", "12:59:59", 12],
    ["n", "12:34:00", "12:34:59", 34],
    ["s", "12:34:56", "12:34:56", 56],
  ]) {
    it(`Определяет границы и компонент времени для единицы ${unit}`, () => {
      const input = "2024-01-15 12:34:56.123456789-03:30";
      assert.strictEqual(time.toStartTime(input, unit), "2024-01-15 " + start + "-03:30");
      assert.strictEqual(time.toEndTime(input, unit), "2024-01-15 " + end + "-03:30");
      assert.strictEqual(time.extractTime(input, unit), extracted);
    });
  }

  it("Отклоняет неизвестную единицу при прямом извлечении времени", () => {
    assert.throws(() => time.extractTime("2024-01-15", "unknown"), {
      name: "RangeError", message: "Unknown time unit: unknown",
    });
  });

  it("Сортирует обе возможные последовательности границ и не меняет исходный интервал", () => {
    for (const pair of [
      ["2024-01-15 12:00:00", "2024-01-15 14:00:00"],
      ["2024-01-15 14:00:00", "2024-01-15 12:00:00"],
    ]) {
      const original = pair.slice();
      assert.deepStrictEqual(time.extendTimeRange(pair, 0, "h"), ["2024-01-15 12:00:00", "2024-01-15 14:00:00"]);
      assert.deepStrictEqual(pair, original);
    }
  });

  it("Сравнивает одинаковые моменты времени с разной записью пояса и дроби", () => {
    assert.deepStrictEqual(time.extendTimeRange([
      "2024-01-15 12:00:00.1+03:00", "2024-01-15 09:00:00.100000000Z",
    ], 0, "s"), ["2024-01-15 12:00:00.1+03:00", "2024-01-15 09:00:00.100000000Z"]);
  });

  it("Возвращает текущее время по UTC и отбрасывает дробные секунды", () => {
    const ActualDate = global.Date;
    global.Date = class extends ActualDate {
      constructor(...args) {
        super(...(args.length ? args : ["2025-01-01T01:30:00.999+03:00"]));
      }
    };
    try {
      assert.strictEqual(time.now(), "2024-12-31 22:30:00");
      assert.strictEqual(time.now(), "2024-12-31 22:30:00");
      assert.strictEqual(time.dateTimeShift(2, "h"), "2025-01-01 00:30:00");
      assert.strictEqual(calendar.toStart("s"), "2024-12-31 22:30:00");
      assert.strictEqual(calendar.toEnd("s"), "2024-12-31 22:30:00");
    } finally {
      global.Date = ActualDate;
    }
  });
});

describe("Сдвиги времени и граничные значения", () => {
  for (const unit of ["y", "q", "m", "w", "d", "h", "n", "s"]) {
    it(`Сохраняет дату, дробные секунды и пояс при нулевом сдвиге в ${unit}`, () => {
      const input = "2024-03-31 12:34:56.123456789+05:45";
      assert.strictEqual(time.dateTimeShift(input, 0, unit), input);
    });

    it(`Проверяет тип и конечность смещения для единицы ${unit}`, () => {
      for (const value of [NaN, Infinity, -Infinity, "1", null, true, undefined]) {
        assert.throws(() => time.dateTimeShift("2024-01-15", value, unit), {
          name: "RangeError", message: "Shift must be a finite number and an integer for months, quarters, and years.",
        });
      }
    });
  }

  for (const unit of ["y", "q", "m"]) {
    it(`Отклоняет дробное число календарных единиц ${unit}`, () => {
      for (const delta of [-1.5, 0.5]) {
        assert.throws(() => time.dateTimeShift("2024-01-15", delta, unit), RangeError);
      }
    });
  }

  for (const [initial, delta, unit, expected] of [
    ["2024-03-31 12:34:56", -1, "m", "2024-02-29 12:34:56"],
    ["2024-03-31 12:34:56", -1, "q", "2023-12-31 12:34:56"],
    ["2024-02-29 12:34:56", -1, "y", "2023-02-28 12:34:56"],
    ["2024-01-01 12:34:56", -1, "w", "2023-12-25 12:34:56"],
    ["2024-01-01 12:34:56", -1, "d", "2023-12-31 12:34:56"],
    ["2024-01-01 00:34:56", -1, "h", "2023-12-31 23:34:56"],
    ["2024-01-01 00:00:56", -1, "n", "2023-12-31 23:59:56"],
    ["2024-01-01 00:00:00", -1, "s", "2023-12-31 23:59:59"],
    ["2024-01-01 00:00:00", 0.5, "w", "2024-01-04 12:00:00"],
    ["0099-12-31 23:59:59", 1, "s", "0100-01-01 00:00:00"],
    ["0000-01-01 00:00:01", -1, "s", "0000-01-01 00:00:00"],
    ["9999-12-31 23:59:58", 1, "s", "9999-12-31 23:59:59"],
    ["1900-02-28 23:59:59", 1, "s", "1900-03-01 00:00:00"],
    ["2000-02-28 23:59:59", 1, "s", "2000-02-29 00:00:00"],
    ["2100-02-28 23:59:59", 1, "s", "2100-03-01 00:00:00"],
  ]) {
    it(`Сдвигает дату со временем: ${initial}, ${delta}, ${unit}`, () => {
      assert.strictEqual(time.dateTimeShift(initial, delta, unit), expected);
    });
  }

  it("Сдвигает обе даты пары и не изменяет AST входных значений", () => {
    const first = ["'", "2024-01-31 12:34:56.123Z", "D"];
    const last = ["'", "2024-02-01 01:02:03.456Z", "D"];
    const pair = [first, last];
    const original = JSON.parse(JSON.stringify(pair));
    assert.deepStrictEqual(time.dateTimeShift(pair, 1, ["'", "month"]), [
      "2024-02-29 12:34:56.123Z", "2024-03-01 01:02:03.456Z",
    ]);
    assert.deepStrictEqual(pair, original);
  });

  for (const [input, delta, unit] of [
    ["0000-01-01", -1, "s"], ["9999-12-31 23:59:59.999999999", 0.000000001, "s"],
    ["0000-01-01", -1, "y"], ["9999-12-31", 1, "y"],
  ]) {
    it(`Отклоняет выход за диапазон года: ${input}, ${delta}, ${unit}`, () => {
      assert.throws(() => time.dateTimeShift(input, delta, unit), {
        name: "RangeError", message: "Year must be between 0000 and 9999.",
      });
    });
  }

  for (const [unit, expectedStart] of [["h", "23:00:00"], ["n", "23:59:00"], ["s", "23:59:59"]]) {
    it(`Определяет границы периода ${unit} в последнюю секунду года`, () => {
      const input = "2024-12-31 23:59:59.999999999-03:30";
      assert.deepStrictEqual(calendar.bound(input, unit), [
        "2024-12-31 " + expectedStart + "-03:30", "2024-12-31 23:59:59-03:30",
      ]);
    });
  }

  for (const initial of ["2023-12-31 23:59:59.999999999", "2024-02-28 23:59:59.000000001", "2024-02-29 00:00:00.123456789", "2024-01-15 00:00:00.000000000"]) {
    it(`Сверяет сдвиги секунд с целочисленной арифметикой наносекунд: ${initial}`, () => {
      const billion = 1000000000n;
      const [seconds, fraction] = initial.split(".");
      const initialNs = BigInt(Date.parse(seconds.replace(" ", "T") + "Z")) * 1000000n + BigInt(fraction);
      for (const delta of [-86400n * billion, -3600n * billion, -60n * billion, -1250000000n, -125000000n, -1000000n, -1n, 0n, 1n, 1000000n, 125000000n, 1250000000n, 60n * billion, 3600n * billion, 86400n * billion]) {
        const expectedNs = initialNs + delta;
        const expected = new Date(Number(expectedNs / billion) * 1000).toISOString().slice(0, 19).replace("T", " ")
          + "." + String(expectedNs % billion).padStart(9, "0") + "+05:45";
        assert.strictEqual(time.dateTimeShift(initial + "+05:45", Number(delta) / 1e9, "s"), expected, String(delta));
      }
    });
  }
});

describe("Функции работы со временем", () => {
  const examples = [
    ["Сдвигает часы с переходом на следующий день", () => calendar.dateShift("2024-01-15 23:30:00", 2, "h"), "2024-01-16 01:30:00"],
    ["Сдвигает минуты с переходом на предыдущий год", () => calendar.dateShift("2024-01-01 00:00:10", -1, "n"), "2023-12-31 23:59:10"],
    ["Сдвигает секунды с переходом на 29 февраля", () => calendar.dateShift("2024-02-28 23:59:59", 1, "s"), "2024-02-29 00:00:00"],
    ["Считает время равным полуночи, если передана только дата", () => time.dateTimeShift("2024-01-15", 2, "h"), "2024-01-15 02:00:00"],
    ["Сдвигает время в строке с меткой D", () => calendar.dateShift(["'", "2024-01-15 12:34:56", "D"], 2, "h"), "2024-01-15 14:34:56"],
    ["Принимает дату в числовом формате", () => time.dateTimeShift(20240115, 2, "h"), "2024-01-15 02:00:00"],
    ["Сохраняет время при нулевом сдвиге", () => time.dateTimeShift("2024-01-15 12:34:56", 0, "d"), "2024-01-15 12:34:56"],
    ["Сохраняет время при сдвиге в днях", () => time.dateTimeShift("2024-01-15 12:34:56", 2, "d"), "2024-01-17 12:34:56"],
    ["Сохраняет время при сдвиге в неделях", () => time.dateTimeShift("2024-01-15 12:34:56", -1, "w"), "2024-01-08 12:34:56"],
    ["Сохраняет время при сдвиге с последнего дня месяца", () => time.dateTimeShift("2024-01-31 12:34:56", 1, "m"), "2024-02-29 12:34:56"],
    ["Сохраняет время при сдвиге на квартал", () => time.dateTimeShift("2024-01-31 12:34:56", 1, "q"), "2024-04-30 12:34:56"],
    ["Сохраняет время при сдвиге на год", () => time.dateTimeShift("2024-02-29 12:34:56", 1, "y"), "2025-02-28 12:34:56"],
    ["Учитывает невисокосный век при сдвиге к концу февраля", () => time.dateTimeShift("1900-01-31 12:34:56", 1, "m"), "1900-02-28 12:34:56"],
    ["Сохраняет последний день месяца при сдвиге из февраля невисокосного века", () => time.dateTimeShift("1900-02-28 12:34:56", 1, "m"), "1900-03-31 12:34:56"],
    ["Сдвигает год без влияния промежуточных месяцев", () => time.dateTimeShift("2023-01-30 12:34:56", 1, "y"), "2024-01-30 12:34:56"],
    ["Поддерживает дробный сдвиг в часах", () => time.dateTimeShift("2024-01-15 12:00:00", 0.5, "h"), "2024-01-15 12:30:00"],
    ["Поддерживает дробный сдвиг в днях", () => time.dateTimeShift("2024-01-15 12:00:00", 0.5, "d"), "2024-01-16 00:00:00"],
    ["Поддерживает дробный сдвиг в секундах", () => time.dateTimeShift("2024-01-15 12:00:00.125", -0.25, "s"), "2024-01-15 11:59:59.875"],
    ["Сохраняет микросекунды при сдвиге на час", () => calendar.dateShift("2024-01-15T12:34:56.123456+03:00", 1, "h"), "2024-01-15 13:34:56.123456+03:00"],
    ["Переносит наносекунду на следующий день", () => time.dateTimeShift("2024-01-15 23:59:59.999999999Z", 0.000000001, "s"), "2024-01-16 00:00:00.000000000Z"],
    ["Переносит наносекунду на предыдущий день", () => time.dateTimeShift("2024-01-15 00:00:00.000000000Z", -0.000000001, "s"), "2024-01-14 23:59:59.999999999Z"],
    ["Сохраняет часовое смещение в формате +03", () => time.dateTimeShift("2024-01-15 12:34:56 +03", 1, "n"), "2024-01-15 12:35:56+03"],
    ["Сохраняет часовое смещение в формате -0330", () => time.dateTimeShift("2024-01-15 12:34:56-0330", 1, "n"), "2024-01-15 12:35:56-0330"],
    ["Возвращает начало часа", () => calendar.toStart("2024-01-15 12:34:56.789", "h"), "2024-01-15 12:00:00"],
    ["Возвращает начало минуты", () => calendar.toStart("2024-01-15 12:34:56", "n"), "2024-01-15 12:34:00"],
    ["Возвращает начало секунды", () => calendar.toStart("2024-01-15 12:34:56.789", "s"), "2024-01-15 12:34:56"],
    ["Возвращает конец часа", () => calendar.toEnd("2024-01-15 12:34:56", "h"), "2024-01-15 12:59:59"],
    ["Возвращает конец минуты", () => calendar.toEnd("2024-01-15 12:34:56", "n"), "2024-01-15 12:34:59"],
    ["Возвращает конец секунды", () => calendar.toEnd("2024-01-15 12:34:56.789", "s"), "2024-01-15 12:34:56"],
    ["Возвращает последнюю секунду дня", () => calendar.toEnd("2024-01-15", "d"), "2024-01-15 23:59:59"],
    ["Сохраняет часовое смещение при определении конца часа", () => calendar.toEnd("2024-01-15 23:34:56.789+03:00", "h"), "2024-01-15 23:59:59+03:00"],
    ["Извлекает час в указанном часовом смещении", () => calendar.extract("2024-01-15T12:34:56+03:00", "h"), 12],
    ["Извлекает минуты", () => calendar.extract("2024-01-15 12:34:56", "n"), 34],
    ["Извлекает целые секунды без дробной части", () => calendar.extract("2024-01-15 12:34:56.999999", "s"), 56],
    ["Возвращает нулевой час, если передана только дата", () => calendar.extract("2024-01-15", "h"), 0],
  ];

  for (const [name, run, expected] of examples) {
    it(name, () => {
      assert.strictEqual(run(), expected);
    });
  }

  it("Сдвигает обе границы интервала с учётом времени", () => {
    assert.deepStrictEqual(
      calendar.dateShift(["2024-01-15 23:30:00", "2024-01-16 01:30:00"], 2, "h"),
      ["2024-01-16 01:30:00", "2024-01-16 03:30:00"]
    );
    assert.deepStrictEqual(
      time.dateTimeShift(["2024-01-15", "2024-01-16"], 1, "d"),
      ["2024-01-16 00:00:00", "2024-01-17 00:00:00"]
    );
  });

  it("Возвращает границы часа и дня в формате календаря SQL", () => {
    assert.deepStrictEqual(
      calendar.bound("2024-01-15 12:34:56", "h"),
      ["2024-01-15 12:00:00", "2024-01-15 12:59:59"]
    );
    assert.deepStrictEqual(
      calendar.bound("2024-01-15 12:34:56", "d"),
      ["2024-01-15", "2024-01-15 23:59:59"]
    );
  });

  it("Сохраняет исходную дату со временем как первую границу интервала", () => {
    assert.deepStrictEqual(
      calendar.extend("2024-01-15 12:34:56", -1, "h"),
      ["2024-01-15 12:34:56", "2024-01-15 11:34:56"]
    );
  });

  it("Упорядочивает границы интервала по времени в пределах дня", () => {
    assert.deepStrictEqual(
      calendar.extend(["2024-01-15 12:00:00.500", "2024-01-15 12:00:00.700"], -0.3, "s"),
      ["2024-01-15 12:00:00.400", "2024-01-15 12:00:00.500"]
    );
  });

  it("Упорядочивает границы интервала по моментам времени с учётом часовых смещений", () => {
    assert.deepStrictEqual(
      calendar.extend(["2024-01-15 12:00:00+03:00", "2024-01-15 10:30:00+01:00"], -1, "h"),
      ["2024-01-15 09:30:00+01:00", "2024-01-15 12:00:00+03:00"]
    );
  });

  it("Использует текущее время или дату в зависимости от единицы измерения", () => {
    const ActualDate = global.Date;
    global.Date = class extends ActualDate {
      constructor(...args) {
        super(...(args.length ? args : ["2024-01-15T12:34:56.789Z"]));
      }
    };
    try {
      assert.strictEqual(time.now(), "2024-01-15 12:34:56");
      assert.strictEqual(calendar.today(), "2024-01-15");
      assert.strictEqual(calendar.dateShift(1, "h"), "2024-01-15 13:34:56");
      assert.strictEqual(calendar.dateShift(1, "d"), "2024-01-16");
      assert.strictEqual(time.dateTimeShift(1, "d"), "2024-01-16 12:34:56");
      assert.strictEqual(calendar.toStart("h"), "2024-01-15 12:00:00");
      assert.strictEqual(calendar.toEnd("n"), "2024-01-15 12:34:59");
      assert.deepStrictEqual(calendar.bound("h"), ["2024-01-15 12:00:00", "2024-01-15 12:59:59"]);
      assert.deepStrictEqual(calendar.extend(1, "h"), ["2024-01-15 12:34:56", "2024-01-15 13:34:56"]);
    } finally {
      global.Date = ActualDate;
    }
  });

  it("Выполняет расчёты независимо от часового пояса системы и перехода на летнее время", () => {
    const script = `
      const assert = require("assert");
      const loadSource = require(${JSON.stringify(require.resolve("./load-source"))});
      const calendar = loadSource(${JSON.stringify(require.resolve("../../src/lib/date/date"))});
      const time = loadSource(${JSON.stringify(require.resolve("../../src/lib/date/time"))});
      assert.strictEqual(time.dateTimeShift("2024-03-10 01:30:00", 2, "h"), "2024-03-10 03:30:00");
      assert.strictEqual(time.dateTimeShift("2024-03-10 01:30:00-05:00", 2, "h"), "2024-03-10 03:30:00-05:00");
      assert.strictEqual(calendar.toStart("2024-03-10 03:30:00", "h"), "2024-03-10 03:00:00");
    `;
    for (const timezone of ["UTC", "America/New_York", "Asia/Kathmandu"]) {
      execFileSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: timezone }, stdio: "pipe", timeout: 5000 });
    }
  }).timeout(20000);

  it("Сдвигает конец интервала на час", () => {
    const date = '2023-01-01';
    const result = calendar.extend(date, 1, 'h');
    assert.strictEqual(result[1], calendar.dateShift(date, 1, 'h'));
  });
});
