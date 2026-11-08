const assert = require('assert');
const loadSource = require("./load-source");
const calendar = loadSource(require.resolve("../../src/lib/date/date"));
const runIsolated = require("./run-isolated");

describe("Календарная функция: today", () => {
    it("Возвращает текущую дату в формате YYYY-MM-DD", () => {
        const actualToday = calendar.today();
        const expectedToday = new Date().toISOString().slice(0, 10);
        assert.strictEqual(actualToday, expectedToday);
    });

    it("Возвращает строку длиной 10 символов", () => {
        const actualToday = calendar.today();
        assert.strictEqual(actualToday.length, 10);
    });

    it("Возвращает дату, начинающуюся с текущего года", () => {
        const actualToday = calendar.today();
        const currentYear = new Date().getUTCFullYear().toString();
        assert.ok(actualToday.startsWith(currentYear));
    });
});

describe("Календарная функция: dateShift", () => {
    it("Сохраняет дату при нулевом сдвиге в днях", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 0, 'day');
        assert.strictEqual(result, '2023-10-15');
    });

    it("Сохраняет дату при нулевом сдвиге в месяцах", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 0, 'month');
        assert.strictEqual(result, '2023-10-15');
    });

    it("Сохраняет дату при нулевом сдвиге в годах", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 0, 'year');
        assert.strictEqual(result, '2023-10-15');
    });

    it("Сдвигает дату вперёд на указанное число дней", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 5, 'day');
        assert.strictEqual(result, '2023-10-20');
    });

    it("Сдвигает дату назад на указанное число дней", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, -5, 'day');
        assert.strictEqual(result, '2023-10-10');
    });

    it("Сдвигает дату вперёд на указанное число месяцев", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 1, 'month');
        assert.strictEqual(result, '2023-11-15');
    });

    it("Сдвигает дату назад на указанное число месяцев", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, -1, 'month');
        assert.strictEqual(result, '2023-09-15');
    });

    it("Ограничивает день последним днём целевого месяца", () => {
        const initialDate = '2023-01-31';
        const result = calendar.dateShift(initialDate, 1, 'month');
        assert.strictEqual(result, '2023-02-28');
    });

    it("Учитывает високосный год при сдвиге в днях", () => {
        const initialDate = '2024-02-28';
        const result = calendar.dateShift(initialDate, 1, 'day');
        assert.strictEqual(result, '2024-02-29');
    });

    it("Учитывает високосный год при сдвиге в годах", () => {
        const initialDate = '2024-02-29';
        const result = calendar.dateShift(initialDate, 1, 'year');
        assert.strictEqual(result, '2025-02-28');
    });

    it("Сдвигает дату вперёд на указанное число лет", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 1, 'year');
        assert.strictEqual(result, '2024-10-15');
    });

    it("Сдвигает дату назад на указанное число лет", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, -1, 'year');
        assert.strictEqual(result, '2022-10-15');
    });

    it("Сдвигает дату вперёд на указанное число недель", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 1, 'week');
        assert.strictEqual(result, '2023-10-22');
    });

    it("Сдвигает дату назад на указанное число недель", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, -1, 'week');
        assert.strictEqual(result, '2023-10-08');
    });

    it("Сдвигает обе даты интервала", () => {
        const initialDates = ['2023-10-01', '2023-10-15'];
        const result = calendar.dateShift(initialDates, 10, 'day');
        assert.deepStrictEqual(result, ['2023-10-11', '2023-10-25']);
    });

    it("Переходит на следующий год при сдвиге от 31 декабря", () => {
        const initialDate = '2023-12-31';
        const result = calendar.dateShift(initialDate, 1, 'day');
        assert.strictEqual(result, '2024-01-01');
    });

    it("Сдвигает дату на пять месяцев с переходом через границу года", () => {
        const initialDate = '2023-11-15';
        const result = calendar.dateShift(initialDate, 5, 'month');
        assert.strictEqual(result, '2024-04-15');
    });

    it("Сдвигает дату на пятьдесят лет вперёд", () => {
        const initialDate = '2023-10-15';
        const result = calendar.dateShift(initialDate, 50, 'year');
        assert.strictEqual(result, '2073-10-15');
    });

    it("Сдвигает январскую дату на тринадцать месяцев назад", () => {
        const initialDate = '2023-01-15';
        const result = calendar.dateShift(initialDate, -13, 'month');
        assert.strictEqual(result, '2021-12-15');
    });
});

describe("Календарная функция: toStart", () => {
    it("Возвращает начало квартала для даты в конце года", () => {
        const inputDate = '2023-12-31';
        const result = calendar.toStart(inputDate, 'quarter');
        assert.strictEqual(result, '2023-10-01');
    });

    it("Возвращает начало 2100 года", () => {
        const inputDate = '2100-11-15';
        const result = calendar.toStart(inputDate, 'year');
        assert.strictEqual(result, '2100-01-01'); // Начало года.
    });

    it("Возвращает начало февраля для 29 февраля високосного года", () => {
        const inputDate = '2020-02-29';
        const result = calendar.toStart(inputDate, 'month');
        assert.strictEqual(result, '2020-02-01'); // Начало месяца.
    });

    it("Возвращает начало недели для указанной даты", () => {
        const inputDate = '2023-11-15';
        const result = calendar.toStart(inputDate, 'week');
        assert.strictEqual(result, '2023-11-13'); // Начало недели.
    });

    it("Возвращает начало месяца для указанной даты", () => {
        const inputDate = '2023-11-15';
        const result = calendar.toStart(inputDate, 'month');
        assert.strictEqual(result, '2023-11-01'); // Начало месяца.
    });

    it("Возвращает начало квартала для указанной даты", () => {
        const inputDate = '2023-11-15';
        const result = calendar.toStart(inputDate, 'quarter');
        assert.strictEqual(result, '2023-10-01'); // Начало квартала.
    });

    it("Возвращает начало года для указанной даты", () => {
        const inputDate = '2023-11-15';
        const result = calendar.toStart(inputDate, 'year');
        assert.strictEqual(result, '2023-01-01'); // Начало года.
    });

    it("Сохраняет дату, если единица не указана", () => {
        const inputDate = calendar.today();
        const result = calendar.toStart(inputDate);
        assert.strictEqual(result, inputDate); // По умолчанию возвращается текущая дата.
    });
});

describe("Календарная функция: toEnd", () => {
    it("Возвращает конец недели", () => {
        const startDate = '2023-09-18'; // Понедельник.
        const result = calendar.toEnd(startDate, 'week');
        assert.strictEqual(result, '2023-09-24'); // Конец недели — воскресенье.
    });

    it("Возвращает конец месяца", () => {
        const startDate = '2023-09-15';
        const result = calendar.toEnd(startDate, 'month');
        assert.strictEqual(result, '2023-09-30'); // Конец сентября.
    });

    it("Возвращает конец квартала", () => {
        const startDate = '2023-09-15';
        const result = calendar.toEnd(startDate, 'quarter');
        assert.strictEqual(result, '2023-09-30'); // Конец третьего квартала.
    });

    it("Возвращает конец года", () => {
        const startDate = '2023-07-15';
        const result = calendar.toEnd(startDate, 'year');
        assert.strictEqual(result, '2023-12-31'); // Конец года.
    });

    it("Сохраняет дату, если единица не указана", () => {
        const startDate = calendar.today();
        const result = calendar.toEnd(startDate);
        assert.strictEqual(result, startDate); // Результат совпадает с исходной датой.
    });
});

describe("Календарная функция: bound", () => {
    it("Возвращает начало и конец недели", () => {
        const initDate = calendar.today();
        const startDate = calendar.toStart(initDate, 'w');
        const endDate = calendar.toEnd(initDate, 'w');
        const [start, end] = calendar.bound(initDate, 'week');
        assert.strictEqual(start, startDate);
        assert.strictEqual(end, endDate);
    });

    it("Возвращает начало и конец месяца", () => {
        const testDate = '2023-03-15';
        const [start, end] = calendar.bound(testDate, 'month');
        assert.strictEqual(start, '2023-03-01');
        assert.strictEqual(end, '2023-03-31');
    });

    it("Возвращает начало и конец квартала", () => {
        const testDate = '2023-04-10';
        const [start, end] = calendar.bound(testDate, 'quarter');
        assert.strictEqual(start, '2023-04-01');
        assert.strictEqual(end, '2023-06-30');
    });

    it("Возвращает начало и конец года", () => {
        const testDate = '2023-11-15';
        const [start, end] = calendar.bound(testDate, 'year');
        assert.strictEqual(start, '2023-01-01');
        assert.strictEqual(end, '2023-12-31');
    });
});

describe("Календарная функция: extend", () => {
    it("Строит интервал от текущей даты на пять дней вперёд", () => {
        const today = calendar.today();
        const result = calendar.extend(today, 5, 'd');
        assert.strictEqual(result[1], calendar.dateShift(today, 5, 'd'));
    });

    it("Сдвигает конец интервала на неделю", () => {
        const start = '2023-01-01';
        const end = '2023-01-07';

        const initDate = [start, end];
        const result = calendar.extend(initDate, 1, 'w');

        assert.strictEqual(result[1], calendar.dateShift(end, 1, 'w'));
    });

    it("Сдвигает конец интервала назад при отрицательном смещении", () => {
        const start = '2023-01-01';
        const end = '2023-01-07';

        const initDate = [start, end];
        const result = calendar.extend(initDate, -2, 'd');

        assert.strictEqual(result[0], start);
        assert.strictEqual(result[1], calendar.dateShift(end, -2, 'd'));
    });

    it("Сохраняет границы при нулевом смещении", () => {
        const date = '2023-01-01';
        const result = calendar.extend(date, 0, 'w');
        assert.deepStrictEqual(result, [date, calendar.dateShift(date, 0, 'w')]);
    });

    it("Сдвигает конец интервала на указанное число месяцев", () => {
        const date = '2023-01-01';
        const result = calendar.extend(date, 2, 'm');
        assert.strictEqual(result[1], calendar.dateShift(date, 2, 'm'));
    });

    it("Сдвигает конец интервала на указанное число лет", () => {
        const date = '2023-01-01';
        const result = calendar.extend(date, 1, 'y');
        assert.strictEqual(result[1], calendar.dateShift(date, 1, 'y'));
    });

    it("Расширяет интервал, переданный парой дат", () => {
        const start = '2023-01-01';
        const end = '2023-01-31';
        const initDate = [start, end];
        const result = calendar.extend(initDate, 1, 'm');
        assert.strictEqual(result[1], calendar.dateShift(end, 1, 'm'));
    });

    it("Сдвигает конец интервала на квартал", () => {
        const date = '2023-01-01';
        const result = calendar.extend(date, 1, 'q');
        assert.strictEqual(result[1], calendar.dateShift(date, 1, 'q'));
    });

    it("Сдвигает конец интервала на месяц назад", () => {
        const date = '2023-03-15';
        const result = calendar.extend(date, -1, 'm');
        assert.strictEqual(result[1], calendar.dateShift(date, -1, 'm'));
    });
});

describe("Календарная функция: year", () => {
    it("Возвращает год из даты в формате ISO", () => {
        const y1 = calendar.year("2023-10-31");
        const y2 = calendar.year("1995-01-15");
        assert.strictEqual(y1, 2023);
        assert.strictEqual(y2, 1995);
    });

    it("Определяет год для високосных дат", () => {
        const y1 = calendar.year("2000-02-29");
        const y2 = calendar.year("2400-02-29");
        assert.strictEqual(y1, 2000);
        assert.strictEqual(y2, 2400);
    });
});

describe("Календарная функция: hoty", () => {
    it("Возвращает 1 для первого полугодия", () => {
        const initDate = '2023-03-15';
        const result = calendar.hoty(initDate);
        assert.strictEqual(result, 1);
    });

    it("Возвращает 2 для второго полугодия", () => {
        const initDate = '2023-08-22';
        const result = calendar.hoty(initDate);
        assert.strictEqual(result, 2);
    });

    it("Относит 30 июня к первому полугодию", () => {
        const initDate = '2023-06-30';
        const result = calendar.hoty(initDate);
        assert.strictEqual(result, 1);
    });

    it("Относит 1 июля ко второму полугодию", () => {
        const initDate = '2023-07-01';
        const result = calendar.hoty(initDate);
        assert.strictEqual(result, 2);
    });

    it("Возвращает 1 для первого дня года", () => {
        const initDate = '2023-01-01';
        const result = calendar.hoty(initDate);
        assert.strictEqual(result, 1);
    });
});

describe("Календарная функция: qoty", () => {
    it("Возвращает 1 для даты в первом квартале", () => {
        const result = calendar.qoty('2023-01-15');
        assert.strictEqual(result, 1);
    });

    it("Возвращает 2 для даты во втором квартале", () => {
        const result = calendar.qoty('2023-05-10');
        assert.strictEqual(result, 2);
    });

    it("Возвращает 3 для даты в третьем квартале", () => {
        const result = calendar.qoty('2023-08-22');
        assert.strictEqual(result, 3);
    });

    it("Возвращает 4 для даты в четвёртом квартале", () => {
        const result = calendar.qoty('2023-11-30');
        assert.strictEqual(result, 4);
    });

    it("Относит последний день года к четвёртому кварталу", () => {
        const result = calendar.qoty('2023-12-31');
        assert.strictEqual(result, 4);
    });

    it("Относит первый день года к первому кварталу", () => {
        const result = calendar.qoty('2023-01-01');
        assert.strictEqual(result, 1);
    });

    it("Определяет квартал для 29 февраля", () => {
        const result = calendar.qoty('2024-02-29');
        assert.strictEqual(result, 1);
    });
});

describe("Календарная функция: moty", () => {
    it("Возвращает номер месяца для указанной даты", () => {
        const result1 = calendar.moty('2023-01-15');
        assert.strictEqual(result1, 1);

        const result2 = calendar.moty('2023-07-15');
        assert.strictEqual(result2, 7);

        const result3 = calendar.moty('2023-12-15');
        assert.strictEqual(result3, 12);
    });

    it("Определяет месяц для его первого и последнего дня", () => {
        const result1 = calendar.moty('2023-02-01');
        assert.strictEqual(result1, 2);

        const result2 = calendar.moty('2023-02-28');
        assert.strictEqual(result2, 2); // Февраль.
    });
});

describe("Календарная функция: woty", () => {
    it("Относит 1 января 2021 года к 53-й неделе предыдущего года", () => {
        const date = '2021-01-01';
        const expectedWeek = 53; // Первое января может относиться к 52-й или 53-й неделе предыдущего года.
        const result = calendar.woty(date);
        assert.strictEqual(result, expectedWeek);
    });

    it("Возвращает 1 для первого понедельника 2022 года", () => {
        const date = '2022-01-03';
        const expectedWeek = 1;
        const result = calendar.woty(date);
        assert.strictEqual(result, expectedWeek);
    });

    it("Возвращает 10 для 7 марта 2022 года", () => {
        const date = '2022-03-07';
        const expectedWeek = 10;
        const result = calendar.woty(date);
        assert.strictEqual(result, expectedWeek);
    });

    // Последняя неделя года.
    it("Возвращает 52 для последнего дня 2022 года", () => {
        const date = '2022-12-31';
        const expectedWeek = 52; // Последняя неделя 2022 года.
        const result = calendar.woty(date);
        assert.strictEqual(result, expectedWeek);
    });
});

describe("Календарная функция: doty", () => {
    it("Возвращает 1 для первого января", () => {
        const date = '2023-01-01';
        const result = calendar.doty(date);
        assert.strictEqual(result, 1);
    });

    it("Возвращает 365 для последнего дня обычного года", () => {
        const date = '2023-12-31';
        const result = calendar.doty(date);
        assert.strictEqual(result, 365);
    });

    it("Возвращает 366 для последнего дня високосного года", () => {
        const date = '2024-12-31';
        const result = calendar.doty(date);
        assert.strictEqual(result, 366);
    });

    it("Возвращает 166 для 15 июня 2023 года", () => {
        const date = '2023-06-15';
        const result = calendar.doty(date);
        assert.strictEqual(result, 166);  // 15 июня 2023 года — 166-й день года.
    });
});

describe("Календарная функция: isoy", () => {
    it("Возвращает год строкой", () => {
        const date = '1999-12-31';
        const result = calendar.isoy(date);
        assert.strictEqual(typeof result, 'string');
    });

    it("Извлекает из даты только год", () => {
        const date = '2023-07-14';
        const result = calendar.isoy(date);
        assert.strictEqual(result, '2023');
    });

    it("Возвращает год для первого января", () => {
        const date = '2023-01-01';
        const result = calendar.isoy(date);
        assert.strictEqual(result, '2023');
    });

    it("Извлекает год из даты в формате YYYY-MM-DD", () => {
        const date = '2000-02-29';
        const result = calendar.isoy(date);
        assert.strictEqual(result, '2000');
    });
});

describe("Календарная функция: isom", () => {
    it("Возвращает год и месяц строкой", () => {
        const date = '1999-12-31';
        const result = calendar.isom(date);
        assert.strictEqual(typeof result, 'string');
    });

    it("Извлекает из даты только год и месяц", () => {
        const date = '2023-07-14';
        const result = calendar.isom(date);
        assert.strictEqual(result, '2023-07');
    });

    it("Возвращает год и месяц для первого января", () => {
        const date = '2023-01-01';
        const result = calendar.isom(date);
        assert.strictEqual(result, '2023-01');
    });

    it("Извлекает год и месяц из даты в формате YYYY-MM-DD", () => {
        const date = '2000-02-29';
        const result = calendar.isom(date);
        assert.strictEqual(result, '2000-02');
    });
});

describe("Календарная функция: isoq", () => {
    it("Возвращает год и квартал в формате YYYY-Qn", () => {
        const result1 = calendar.isoq('2023-01-15');
        assert.strictEqual(result1, '2023-Q1');

        const result2 = calendar.isoq('2023-04-15');
        assert.strictEqual(result2, '2023-Q2');

        const result3 = calendar.isoq('2023-06-30');
        assert.strictEqual(result3, '2023-Q2');

        const result4 = calendar.isoq('2023-07-15');
        assert.strictEqual(result4, '2023-Q3');

        const result5 = calendar.isoq('2023-09-30');
        assert.strictEqual(result5, '2023-Q3');

        const result6 = calendar.isoq('2023-10-15');
        assert.strictEqual(result6, '2023-Q4');
    });

    it("Различает кварталы по обе стороны границы года", () => {
        const result1 = calendar.isoq('2023-01-01');
        assert.strictEqual(result1, '2023-Q1');

        const result2 = calendar.isoq('2022-12-31');
        assert.strictEqual(result2, '2022-Q4');
    });
});

describe("Календарная функция: isow", () => {
  it("Возвращает год и номер недели в формате ISO", () => {
    const result1 = calendar.isow('2023-02-15');
    assert.strictEqual(result1, '2023-W07');

    const result2 = calendar.isow('2023-12-31');
    assert.strictEqual(result2, '2023-W52');
  });

  it("Определяет неделю для понедельника", () => {
    const result = calendar.isow('2023-01-02'); // Понедельник.
    assert.strictEqual(result, '2023-W01');
  });

  it("Определяет неделю для воскресенья", () => {
    const result = calendar.isow('2023-01-08'); // Воскресенье.
    assert.strictEqual(result, '2023-W01');
  });

  it("Определяет неделю для первого января", () => {
    const result = calendar.isow('2024-01-01');
    assert.strictEqual(result, '2024-W01');
  });
});

describe("Календарная функция: isod", () => {
  it("Возвращает год и порядковый номер дня без ведущего нуля", () => {
    const date = '2023-03-15';
    const result = calendar.isod(date);
    assert.strictEqual(result, '2023-74'); // 15 марта 2023 года — 74-й день года.
  });

  it("Возвращает первый день года в формате YYYY-1", () => {
    const date = '2023-01-01';
    const result = calendar.isod(date);
    assert.strictEqual(result, '2023-1'); // Первое января — первый день года.
  });

  it("Учитывает 29 февраля при определении дня года", () => {
    const date = '2024-02-29'; // 2024 год — високосный.
    const result = calendar.isod(date);
    assert.strictEqual(result, '2024-60'); // 29 февраля — 60-й день високосного года.
  });
});

describe("Календарные операции с датой и временем", () => {
  const examples = [
    ["dateShift возвращает только дату при сдвиге в календарных единицах", () => calendar.dateShift("2024-01-15 12:34:56", 1, "d"), "2024-01-16"],
    ["Возвращает начало дня без времени", () => calendar.toStart("2024-01-15 12:34:56", "d"), "2024-01-15"],
    ["Возвращает календарные границы без времени", () => calendar.toEnd("2024-01-15 12:34:56", "m"), "2024-01-31"],
    ["Извлекает год из даты со временем", () => calendar.extract("2024-01-15 12:34:56", "y"), 2024],
    ["Извлекает квартал из даты со временем", () => calendar.extract("2024-04-15 12:34:56", "q"), 2],
    ["Извлекает месяц из даты со временем", () => calendar.extract("2024-04-15 12:34:56", "m"), 4],
    ["Извлекает номер недели по ISO из даты со временем", () => calendar.extract("2021-01-01 12:34:56", "w"), 53],
    ["Извлекает день месяца", () => calendar.extract("2024-04-15 12:34:56", "d"), 15],
  ];

  for (const [name, run, expected] of examples) {
    it(name, () => {
      assert.strictEqual(run(), expected);
    });
  }
});

describe("Совместимость календарных функций", () => {
  it("Экспортирует все календарные функции через DATE_FUNCTIONS", () => {
    const names = ["dateShift", "today", "bound", "extend", "toStart", "toEnd", "isoy", "isoq", "isom", "isow", "isod", "extract", "year", "hoty", "qoty", "moty", "woty", "doty"];
    assert.deepStrictEqual(Object.keys(calendar.DATE_FUNCTIONS).sort(), names.sort());
    for (const name of names) {
      assert.strictEqual(calendar.DATE_FUNCTIONS[name], calendar[name]);
      assert.strictEqual(typeof calendar[name], "function");
    }
    assert.strictEqual(calendar.getDoW("20240115"), 1);
  });

  for (const [unit, alias, shifted, start, end, extracted] of [
    ["y", "year", "2025-05-15", "2024-01-01", "2024-12-31", 2024],
    ["q", "quarter", "2024-08-15", "2024-04-01", "2024-06-30", 2],
    ["m", "month", "2024-06-15", "2024-05-01", "2024-05-31", 5],
    ["w", "iw", "2024-05-22", "2024-05-13", "2024-05-19", 20],
    ["d", "dd", "2024-05-16", "2024-05-15", "2024-05-15 23:59:59", 15],
  ]) {
    it(`Обрабатывает календарную единицу ${unit} и её обозначения во всех операциях`, () => {
      const input = "2024-05-15 12:34:56";
      for (const value of [unit, alias, " " + alias.toUpperCase() + " ", ["'", alias]]) {
        assert.strictEqual(calendar.dateShift(input, 1, value), shifted);
        assert.strictEqual(calendar.toStart(input, value), start);
        assert.strictEqual(calendar.toEnd(input, value), end);
        assert.deepStrictEqual(calendar.bound(input, value), [start, end]);
        assert.strictEqual(calendar.extract(input, value), extracted);
      }
    });
  }

  for (const input of [20240515, "20240515", "2024-05-15", "2024.05.15", ["'", "2024-05-15", "D"], ['"', "2024-05-15"]]) {
    it(`Принимает разные представления даты во всех функциях извлечения: ${JSON.stringify(input)}`, () => {
      for (const [name, expected] of [
        ["year", 2024], ["hoty", 1], ["qoty", 2], ["moty", 5], ["woty", 20], ["doty", 136],
        ["isoy", "2024"], ["isoq", "2024-Q2"], ["isom", "2024-05"], ["isow", "2024-W20"], ["isod", "2024-136"],
      ]) {
        assert.strictEqual(calendar[name](input), expected, name);
      }
    });
  }

  it("Сохраняет календарный год в isow на границе года недель ISO", () => {
    assert.strictEqual(calendar.woty("2021-01-01"), 53);
    assert.strictEqual(calendar.isow("2021-01-01"), "2021-W53");
    assert.strictEqual(calendar.isow("2018-12-31"), "2018-W01");
  });

  it("Сохраняет описанные результаты извлечения из пустой строки", () => {
    for (const [name, expected] of [["year", 0], ["moty", 0], ["hoty", 1], ["qoty", null], ["woty", -1], ["doty", -1]]) {
      assert.strictEqual(calendar[name](""), expected, name);
    }
  });

  it("Сохраняет исходную дату для неизвестной календарной единицы", () => {
    const value = "2024.01.15";
    for (const unit of ["unknown", "constructor", "__proto__"]) {
      assert.strictEqual(calendar.dateShift(["'", value, "D"], 1, unit), value);
      assert.strictEqual(calendar.toStart(value, unit), value);
      assert.strictEqual(calendar.toEnd(value, unit), value);
      assert.deepStrictEqual(calendar.bound(value, unit), [value, value]);
      assert.deepStrictEqual(calendar.extend(value, 1, unit), [value, value]);
    }
  });

  it("Сдвигает пару дат в исходном порядке и не изменяет входной массив", () => {
    const pair = ["2024-01-31", "2024-01-01"];
    assert.deepStrictEqual(calendar.dateShift(pair, 1, "m"), ["2024-02-29", "2024-02-01"]);
    assert.deepStrictEqual(pair, ["2024-01-31", "2024-01-01"]);
  });

  it("Упорядочивает расширенный календарный интервал при переходе его конца за начало", () => {
    const pair = ["2024-01-01", "2024-01-02"];
    assert.deepStrictEqual(calendar.extend(pair, -3, "d"), ["2023-12-30", "2024-01-01"]);
    assert.deepStrictEqual(pair, ["2024-01-01", "2024-01-02"]);
  });

  it("Использует текущую дату по UTC при сокращённом вызове всех календарных операций", () => {
    const ActualDate = global.Date;
    global.Date = class extends ActualDate {
      constructor(...args) {
        super(...(args.length ? args : ["2025-01-01T01:30:00+03:00"]));
      }
    };
    try {
      assert.strictEqual(calendar.today(), "2024-12-31");
      assert.strictEqual(calendar.dateShift(1, "d"), "2025-01-01");
      assert.strictEqual(calendar.toStart("m"), "2024-12-01");
      assert.strictEqual(calendar.toEnd("m"), "2024-12-31");
      assert.deepStrictEqual(calendar.bound("y"), ["2024-01-01", "2024-12-31"]);
      assert.deepStrictEqual(calendar.extend(1, "d"), ["2024-12-31", "2025-01-01"]);
    } finally {
      global.Date = ActualDate;
    }
  });

  it("Сдвигает дни в обе стороны на границах всех месяцев обычных и високосных лет", () => {
    for (const year of [1999, 2000, 2001, 2023, 2024]) {
      for (let month = 0; month < 12; month++) {
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        for (const day of [1, 15, lastDay]) {
          const input = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
          for (const delta of [-7, -1, 0, 1, 7]) {
            const expected = new Date(Date.UTC(year, month, day + delta)).toISOString().slice(0, 10);
            assert.strictEqual(calendar.dateShift(input, delta, "d"), expected, input + ", " + delta);
          }
        }
      }
    }
  });
});

describe("Проверка конечности календарного смещения", () => {
  for (const unit of ["d", "w", "m", "q", "y"]) {
    it(`Отклоняет неконечный календарный сдвиг в единицах ${unit} без зависания`, async () => {
      // Изоляция в дочернем процессе позволяет остановить бесконечный цикл.
      const script = `
        const assert = require("assert");
        const loadSource = require(${JSON.stringify(require.resolve("./load-source"))});
        const calendar = loadSource(${JSON.stringify(require.resolve("../../src/lib/date/date"))});
        process.send({ready:true});
        const unit = ${JSON.stringify(unit)};
        const aliases = { d: "day", w: "IW", m: " MONTH ", q: "quarter", y: "year" };
        const invalid = [Infinity, -Infinity, NaN];
        // Конечное число также может дать Infinity при переводе недель в дни или кварталов в месяцы.
        if (unit === "w" || unit === "q") invalid.push(Number.MAX_VALUE);
        for (const value of [unit, aliases[unit]]) {
          for (const delta of invalid) {
            const error = { name: "RangeError", message: "Shift must be a finite number." };
            assert.throws(() => calendar.dateShift("2024-01-15", delta, value), error);
            assert.throws(() => calendar.dateShift(delta, value), error);
            assert.throws(() => calendar.dateShift(["2024-01-01", "2024-01-15"], delta, value), error);
            assert.throws(() => calendar.extend("2024-01-15", delta, value), error);
            assert.throws(() => calendar.extend(delta, value), error);
            assert.throws(() => calendar.extend(["2024-01-01", "2024-01-15"], delta, value), error);
          }
        }
        process.stdout.write("ok");
      `;
      const result = await runIsolated(script);
      assert.ifError(result.error);
      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, "ok");
    }).timeout(10000);
  }
});
