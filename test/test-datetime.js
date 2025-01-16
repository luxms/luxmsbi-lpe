var assert = require('assert');
var lpe = require('../dist/lpe');

describe('Calendar function: today', () => {
    it('should return the current date in the format YYYY-MM-DD', () => {
        const actualToday = lpe.eval_lisp(lpe.parse('today()'));
        const expectedToday = new Date().toISOString().slice(0, 10);
        assert.strictEqual(actualToday, expectedToday);
    });

    it('should return a string of length 10', () => {
        const actualToday = lpe.eval_lisp(lpe.parse('today()'));
        assert.strictEqual(actualToday.length, 10);
    });

    it('should return a date string starting with the current year', () => {
        const actualToday = lpe.eval_lisp(lpe.parse('today()'));
        const currentYear = new Date().getFullYear().toString();
        assert.ok(actualToday.startsWith(currentYear));
    });
});

describe('Calendar function: dateShift', () => {
    it('should correctly handle the case when a zero shift in days is specified', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 0, 'day')`));
        assert.strictEqual(result, '2023-10-15');
    });

    it('should correctly handle the case when a zero shift in months is specified', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 0, 'month')`));
        assert.strictEqual(result, '2023-10-15');
    });

    it('should correctly handle the case when a zero shift in years is specified', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 0, 'year')`));
        assert.strictEqual(result, '2023-10-15');
    });

    it('should shift the date forward by the specified number of days', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 5, 'day')`));
        assert.strictEqual(result, '2023-10-20');
    });

    it('should shift the date backward by the specified number of days', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, -5, 'day')`));
        assert.strictEqual(result, '2023-10-10');
    });

    it('should shift the date forward by the specified number of months', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'month')`));
        assert.strictEqual(result, '2023-11-15');
    });

    it('should shift the date backward by the specified number of months', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, -1, 'month')`));
        assert.strictEqual(result, '2023-09-15');
    });

    it('should correctly handle the end-of-month carryover', () => {
        const initialDate = "'2023-01-31'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'month')`));
        assert.strictEqual(result, '2023-02-28');
    });

    it('should handle leap years when adding days', () => {
        const initialDate = "'2024-02-28'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'day')`));
        assert.strictEqual(result, '2024-02-29');
    });

    it('should handle leap years when adding years', () => {
        const initialDate = "'2024-02-29'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'year')`));
        assert.strictEqual(result, '2025-02-28');
    });

    it('should shift the date forward by the specified number of years', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'year')`));
        assert.strictEqual(result, '2024-10-15');
    });

    it('should shift the date backward by the specified number of years', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, -1, 'year')`));
        assert.strictEqual(result, '2022-10-15');
    });

    it('should shift the date forward by the specified number of weeks', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'week')`));
        assert.strictEqual(result, '2023-10-22');
    });

    it('should shift the date backward by the specified number of weeks', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, -1, 'week')`));
        assert.strictEqual(result, '2023-10-08');
    });

    it('should handle an array input and return shifted dates for each', () => {
        const initialDates = "['2023-10-01', '2023-10-15']";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDates}, 10, 'day')`));
        assert.deepStrictEqual(result, ['2023-10-11', '2023-10-25']);
    });

    it('should correctly shift the date when crossing the year boundary', () => {
        const initialDate = "'2023-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 1, 'day')`));
        assert.strictEqual(result, '2024-01-01');
    });

    it('should correctly shift the date forward by multiple time units', () => {
        const initialDate = "'2023-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 5, 'month')`));
        assert.strictEqual(result, '2024-04-15');
    });

    it('should correctly handle absurd multi-year shifts', () => {
        const initialDate = "'2023-10-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, 50, 'year')`));
        assert.strictEqual(result, '2073-10-15');
    });

    it('should handle negative shifts when the date starts with a negative month', () => {
        const initialDate = "'2023-01-15'";
        const result = lpe.eval_lisp(lpe.parse(`dateShift(${initialDate}, -13, 'month')`));
        assert.strictEqual(result, '2021-12-15');
    });
});

describe('Calendar function: toStart', () => {
    it('should correctly work with the start of the quarter for dates at the end of the year', () => {
        const inputDate = "'2023-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'quarter')`));
        assert.strictEqual(result, '2023-10-01');
    });

    it('should check for crossing the century boundary when transitioning to the start of the year', () => {
        const inputDate = "'2100-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'year')`));
        assert.strictEqual(result, '2100-01-01'); // Expected result (start of the year)
    });

    it('should check for leap years and correctly return the start of February', () => {
        const inputDate = "'2020-02-29'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'month')`));
        assert.strictEqual(result, '2020-02-01'); // Expected result (start of the month)
    });

    it('should return the start of the week for the specified date', () => {
        const inputDate = "'2023-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'week')`));
        assert.strictEqual(result, '2023-11-13'); // Expected result (start of the week)
    });

    it('should return the start of the month for the specified date', () => {
        const inputDate = "'2023-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'month')`));
        assert.strictEqual(result, '2023-11-01'); // Expected result (start of the month)
    });

    it('should return the start of the quarter for the specified date', () => {
        const inputDate = "'2023-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'quarter')`));
        assert.strictEqual(result, '2023-10-01'); // Expected result (start of the quarter)
    });

    it('should return the start of the year for the specified date', () => {
        const inputDate = "'2023-11-15'";
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate}, 'year')`));
        assert.strictEqual(result, '2023-01-01'); // Expected result (start of the year)
    });

    it('should correctly handle the case without specifying a unit', () => {
        const inputDate = lpe.eval_lisp(lpe.parse('today()'));
        const result = lpe.eval_lisp(lpe.parse(`toStart(${inputDate})`));
        assert.strictEqual(result, inputDate); // Expected result defaults to today
    });
});

describe('Calendar function: toEnd', () => {
    it('should return the end of the week for the given period', () => {
        const startDate = "'2023-09-18'"; // for example, Monday
        const result = lpe.eval_lisp(lpe.parse(`toEnd(${startDate}, 'week')`));
        assert.strictEqual(result, '2023-09-24'); // end of the week - Sunday
    });

    it('should return the end of the month for the given period', () => {
        const startDate = "'2023-09-15'";
        const result = lpe.eval_lisp(lpe.parse(`toEnd(${startDate}, 'month')`));
        assert.strictEqual(result, '2023-09-30'); // end of September
    });

    it('should return the end of the quarter for the given period', () => {
        const startDate = "'2023-09-15'";
        const result = lpe.eval_lisp(lpe.parse(`toEnd(${startDate}, 'quarter')`));
        assert.strictEqual(result, '2023-09-30'); // end of the third quarter
    });

    it('should return the end of the year for the given period', () => {
        const startDate = "'2023-07-15'";
        const result = lpe.eval_lisp(lpe.parse(`toEnd(${startDate}, 'year')`));
        assert.strictEqual(result, '2023-12-31'); // end of the year
    });

    it('should return the current date if no time unit is specified', () => {
        const startDate = lpe.eval_lisp(lpe.parse('today()'));
        const result = lpe.eval_lisp(lpe.parse(`toEnd(${startDate})`));
        assert.strictEqual(result, startDate); // result should match the initial date
    });
});

describe('Calendar function: bound', () => {
    it('should return the start and end dates of the week by default', () => {
        const initDate = lpe.eval_lisp(lpe.parse('today()'));
        const startDate = lpe.eval_lisp(lpe.parse(`toStart(${initDate}, 'w')`));
        const endDate = lpe.eval_lisp(lpe.parse(`toEnd(${initDate}, 'w')`));
        const [start, end] = lpe.eval_lisp(lpe.parse(`bound(${initDate}, 'week')`));
        assert.strictEqual(start, startDate);
        assert.strictEqual(end, endDate);
    });

    it('should return the start and end dates of the month for a given date', () => {
        const testDate = "'2023-03-15'";
        const [start, end] = lpe.eval_lisp(lpe.parse(`bound(${testDate}, 'month')`));
        assert.strictEqual(start, '2023-03-01');
        assert.strictEqual(end, '2023-03-31');
    });

    it('should return the start and end dates of the quarter for a given date', () => {
        const testDate = "'2023-04-10'";
        const [start, end] = lpe.eval_lisp(lpe.parse(`bound(${testDate}, 'quarter')`));
        assert.strictEqual(start, '2023-04-01');
        assert.strictEqual(end, '2023-06-30');
    });

    it('should return the start and end dates of the year for a given date', () => {
        const testDate = "'2023-11-15'";
        const [start, end] = lpe.eval_lisp(lpe.parse(`bound(${testDate}, 'year')`));
        assert.strictEqual(start, '2023-01-01');
        assert.strictEqual(end, '2023-12-31');
    });
});

describe('Calendar function: extend', () => {
    it('todays date and 5 days ahead', () => {
        const today = lpe.eval_lisp(lpe.parse('today()'));
        const result = lpe.eval_lisp(lpe.parse(`extend(${today}, 5, 'd')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift(${today}, 5, 'd')`)));
    });

    it('date interval for a week', () => {
        const start = "'2023-01-01'";
        const end = "'2023-01-07'";

        const initDate = `[${start}, ${end}]`;
        const result = lpe.eval_lisp(lpe.parse(`extend(${initDate}, 1, 'w')`));

        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift(${end}, 1, 'w')`)));
    });

    it('date interval with a negative value', () => {
        const start = "'2023-01-01'";
        const end = "'2023-01-07'";

        const initDate = `[${start}, ${end}]`;
        const result = lpe.eval_lisp(lpe.parse(`extend(${initDate}, -2, 'd')`));

        assert.strictEqual(`'${result[0]}'`, start);
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift(${end}, -2, 'd')`)));
    });

    it('handles cases when delta is 0', () => {
        const date = '2023-01-01';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', 0, 'w')`));
        assert.deepStrictEqual(result, [date, lpe.eval_lisp(lpe.parse(`dateShift('${date}', 0, 'w')`))]);
    });

    it('handles unit of measurement "month"', () => {
        const date = '2023-01-01';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', 2, 'm')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift('${date}', 2, 'm')`)));
    });

    it('handles unit of measurement "year"', () => {
        const date = '2023-01-01';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', 1, 'y')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift('${date}', 1, 'y')`)));
    });

    it('correctly extends the interval using an array of dates', () => {
        const start = "'2023-01-01'";
        const end = "'2023-01-31'";
        const initDate = `[${start}, ${end}]`;
        const result = lpe.eval_lisp(lpe.parse(`extend(${initDate}, 1, 'm')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift(${end}, 1, 'm')`)));
    });

    it('correctly works with a half-year interval', () => {
        const date = '2023-01-01';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', 1, 'h')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift('${date}', 1, 'h')`)));
    });

    it('correctly works with a quarter interval', () => {
        const date = '2023-01-01';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', 1, 'q')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift('${date}', 1, 'q')`)));
    });

    it('correctly works with negative delta values in months', () => {
        const date = '2023-03-15';
        const result = lpe.eval_lisp(lpe.parse(`extend('${date}', -1, 'm')`));
        assert.strictEqual(result[1], lpe.eval_lisp(lpe.parse(`dateShift('${date}', -1, 'm')`)));
    });
});

describe('Calendar function: year', () => {
    it('should return the year from a date in ISO format', () => {
        const y1 = lpe.eval_lisp(lpe.parse('year("2023-10-31")'));
        const y2 = lpe.eval_lisp(lpe.parse('year("1995-01-15")'));
        assert.strictEqual(y1, 2023);
        assert.strictEqual(y2, 1995);
    });

    it('should correctly handle leap years', () => {
        const y1 = lpe.eval_lisp(lpe.parse('year("2000-02-29")'));
        const y2 = lpe.eval_lisp(lpe.parse('year("2400-02-29")'));
        assert.strictEqual(y1, 2000);
        assert.strictEqual(y2, 2400);
    });
});

describe('Calendar function: hoty', () => {
    it('should return 1 for the first half of the year', () => {
        const initDate = "'2023-03-15'";
        const result = lpe.eval_lisp(lpe.parse(`hoty(${initDate})`));
        assert.strictEqual(result, 1);
    });

    it('should return 2 for the second half of the year', () => {
        const initDate = "'2023-08-22'";
        const result = lpe.eval_lisp(lpe.parse(`hoty(${initDate})`));
        assert.strictEqual(result, 2);
    });

    it('should correctly handle the end of June', () => {
        const initDate = "'2023-06-30'";
        const result = lpe.eval_lisp(lpe.parse(`hoty(${initDate})`));
        assert.strictEqual(result, 1);
    });

    it('should correctly handle the beginning of July', () => {
        const initDate = "'2023-07-01'";
        const result = lpe.eval_lisp(lpe.parse(`hoty(${initDate})`));
        assert.strictEqual(result, 2);
    });

    it('should return 1 for a date that coincides with the start of the year', () => {
        const initDate = "'2023-01-01'";
        const result = lpe.eval_lisp(lpe.parse(`hoty(${initDate})`));
        assert.strictEqual(result, 1);
    });
});

describe('Calendar function: qoty', () => {
    it('correctly determines the quarter for a date in the first quarter', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-01-15')`));
        assert.strictEqual(result, 1);
    });

    it('correctly determines the quarter for a date in the second quarter', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-05-10')`));
        assert.strictEqual(result, 2);
    });

    it('correctly determines the quarter for a date in the third quarter', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-08-22')`));
        assert.strictEqual(result, 3);
    });

    it('correctly determines the quarter for a date in the fourth quarter', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-11-30')`));
        assert.strictEqual(result, 4);
    });

    it('returns the correct value for the end of the year', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-12-31')`));
        assert.strictEqual(result, 4);
    });

    it('returns the correct value for the start of the year', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2023-01-01')`));
        assert.strictEqual(result, 1);
    });

    it('works correctly for leap years', () => {
        const result = lpe.eval_lisp(lpe.parse(`qoty('2024-02-29')`));
        assert.strictEqual(result, 1);
    });
});

describe('Calendar function: moty', () => {
    it('should return the correct month for valid dates', () => {
        const result1 = lpe.eval_lisp(lpe.parse(`moty('2023-01-15')`));
        assert.strictEqual(result1, 1);

        const result2 = lpe.eval_lisp(lpe.parse(`moty('2023-07-15')`));
        assert.strictEqual(result2, 7);

        const result3 = lpe.eval_lisp(lpe.parse(`moty('2023-12-15')`));
        assert.strictEqual(result3, 12);
    });

    it('should work with dates at the beginning and end of the month', () => {
        const result1 = lpe.eval_lisp(lpe.parse(`moty('2023-02-01')`));
        assert.strictEqual(result1, 2);

        const result2 = lpe.eval_lisp(lpe.parse(`moty('2023-02-28')`));
        assert.strictEqual(result2, 2); // February
    });
});

describe('Calendar function: woty', () => {
    it('should correctly return the week number for the date 2021-01-01', () => {
        const date = "'2021-01-01'";
        const expectedWeek = 53; // typically, January 1st can belong to the 52nd or 53rd week of the previous year
        const result = lpe.eval_lisp(lpe.parse(`woty(${date})`));
        assert.strictEqual(result, expectedWeek);
    });

    it('should return 1 for the date 2022-01-03, which is the first Monday of the year', () => {
        const date = "'2022-01-03'";
        const expectedWeek = 1;
        const result = lpe.eval_lisp(lpe.parse(`woty(${date})`));
        assert.strictEqual(result, expectedWeek);
    });

    it('should return week number 10 for 2022-03-07', () => {
        const date = "'2022-03-07'";
        const expectedWeek = 10;
        const result = lpe.eval_lisp(lpe.parse(`woty(${date})`));
        assert.strictEqual(result, expectedWeek);
    });

    // Additional tests for other edge or specific cases
    it('should return the correct week number at the end of the year, for example 2022-12-31', () => {
        const date = "'2022-12-31'";
        const expectedWeek = 52; // the value will depend on the actual distribution of weeks
        const result = lpe.eval_lisp(lpe.parse(`woty(${date})`));
        assert.strictEqual(result, expectedWeek);
    });
});

describe('Calendar function: doty', () => {
    it('should return the correct day number in the year for January 1st', () => {
        const date = "'2023-01-01'";
        const result = lpe.eval_lisp(lpe.parse(`doty(${date})`));
        assert.strictEqual(result, 1);
    });

    it('should return the correct day number in the year for December 31st', () => {
        const date = "'2023-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`doty(${date})`));
        assert.strictEqual(result, 365);
    });

    it('should correctly handle leap years', () => {
        const date = "'2024-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`doty(${date})`));
        assert.strictEqual(result, 366);
    });

    it('should return the correct day number for a random date', () => {
        const date = "'2023-06-15'";
        const result = lpe.eval_lisp(lpe.parse(`doty(${date})`));
        assert.strictEqual(result, 166);  // Check the actual day number for this date in the year
    });
});

describe('Calendar function: isoy', () => {
    it('should return the year as a string', () => {
        const date = "'1999-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`isoy(${date})`));
        assert.strictEqual(typeof result, 'string');
    });

    it('should return only the year from the date', () => {
        const date = "'2023-07-14'";
        const result = lpe.eval_lisp(lpe.parse(`isoy(${date})`));
        assert.strictEqual(result, '2023');
    });

    it('should correctly handle boundary values', () => {
        const date = "'2023-01-01'";
        const result = lpe.eval_lisp(lpe.parse(`isoy(${date})`));
        assert.strictEqual(result, '2023');
    });

    it('should correctly handle dates in the format YYYY-MM-DD', () => {
        const date = "'2000-02-29'";
        const result = lpe.eval_lisp(lpe.parse(`isoy(${date})`));
        assert.strictEqual(result, '2000');
    });
});

describe('Calendar function: isom', () => {
    it('should return the year and month as a string', () => {
        const date = "'1999-12-31'";
        const result = lpe.eval_lisp(lpe.parse(`isom(${date})`));
        assert.strictEqual(typeof result, 'string');
    });

    it('should return only the year and month from the date', () => {
        const date = "'2023-07-14'";
        const result = lpe.eval_lisp(lpe.parse(`isom(${date})`));
        assert.strictEqual(result, '2023-07');
    });

    it('should correctly handle boundary values', () => {
        const date = "'2023-01-01'";
        const result = lpe.eval_lisp(lpe.parse(`isom(${date})`));
        assert.strictEqual(result, '2023-01');
    });

    it('should correctly handle dates in the format YYYY-MM-DD', () => {
        const date = "'2000-02-29'";
        const result = lpe.eval_lisp(lpe.parse(`isom(${date})`));
        assert.strictEqual(result, '2000-02');
    });
});

describe('Calendar function: isoq', () => {
    it('should match the format "YYYY-Qn" for the given date', () => {
        const result1 = lpe.eval_lisp(lpe.parse(`isoq('2023-01-15')`));
        assert.strictEqual(result1, '2023-Q1');

        const result2 = lpe.eval_lisp(lpe.parse(`isoq('2023-04-15')`));
        assert.strictEqual(result2, '2023-Q2');

        const result3 = lpe.eval_lisp(lpe.parse(`isoq('2023-06-30')`));
        assert.strictEqual(result3, '2023-Q2');

        const result4 = lpe.eval_lisp(lpe.parse(`isoq('2023-07-15')`));
        assert.strictEqual(result4, '2023-Q3');

        const result5 = lpe.eval_lisp(lpe.parse(`isoq('2023-09-30')`));
        assert.strictEqual(result5, '2023-Q3');

        const result6 = lpe.eval_lisp(lpe.parse(`isoq('2023-10-15')`));
        assert.strictEqual(result6, '2023-Q4');
    });

    it('should work correctly when transitioning to the next year', () => {
        const result1 = lpe.eval_lisp(lpe.parse(`isoq('2023-01-01')`));
        assert.strictEqual(result1, '2023-Q1');

        const result2 = lpe.eval_lisp(lpe.parse(`isoq('2022-12-31')`));
        assert.strictEqual(result2, '2022-Q4');
    });
});

describe('Calendar function: isow', () => {
  it('should return the correct ISO format for the given date', () => {
    const result1 = lpe.eval_lisp(lpe.parse(`isow('2023-02-15')`));
    assert.strictEqual(result1, '2023-W07');

    const result2 = lpe.eval_lisp(lpe.parse(`isow('2023-12-31')`));
    assert.strictEqual(result2, '2023-W52');
  });

  it('should correctly handle dates that are the first day of the week', () => {
    const result = lpe.eval_lisp(lpe.parse(`isow('2023-01-02')`)); // Monday
    assert.strictEqual(result, '2023-W01');
  });

  it('should correctly handle dates that are the last days of the week', () => {
    const result = lpe.eval_lisp(lpe.parse(`isow('2023-01-08')`)); // Sunday
    assert.strictEqual(result, '2023-W01');
  });

  it('should assign the correct week number for dates in the New Year', () => {
    const result = lpe.eval_lisp(lpe.parse(`isow('2024-01-01')`));
    assert.strictEqual(result, '2024-W01');
  });
});

describe('Calendar function: isod', () => {
  it('should return a string with the day of the year in the format YYYY-DD', () => {
    const date = "'2023-03-15'";
    const result = lpe.eval_lisp(lpe.parse(`isod(${date})`));
    assert.strictEqual(result, '2023-74'); // For example, March 15, 2023 is the 74th day of the year
  });

  it('should correctly handle edge cases, such as January 1st', () => {
    const date = "'2023-01-01'";
    const result = lpe.eval_lisp(lpe.parse(`isod(${date})`));
    assert.strictEqual(result, '2023-1'); // January 1st is the 1st day of the year
  });

  it('should correctly handle dates in leap years', () => {
    const date = "'2024-02-29'"; // 2024 is a leap year
    const result = lpe.eval_lisp(lpe.parse(`isod(${date})`));
    assert.strictEqual(result, '2024-60'); // February 29 is the 60th day in a leap year
  });
});

