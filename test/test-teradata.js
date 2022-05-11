var assert = require('assert');
var lpe = require('../dist/lpe');



describe('KOOB Teradata tests', function() {

   it('should eval LIMIT', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "__koob__row__num__", sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
QUALIFY __koob__row__num__ <= 10`
            );
   });

   it('should eval OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "__koob__row__num__", sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
QUALIFY __koob__row__num__ > 10`
            );
   });


   it('should eval LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "__koob__row__num__", sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
QUALIFY __koob__row__num__ BETWEEN 11 AND 15`
            );
   });

   it('should eval range() LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name',
                     'range(2):rng'
                  ],
         "filters":{"hcode_name":["!=", null]},
         "sort": ["hcode_name"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "__koob__row__num__", sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", __koob__range__table__.day_of_calendar as "rng"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as __koob__range__table__
WHERE (hcode_name IS NOT NULL) AND (__koob__range__table__.day_of_calendar <= 2) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, __koob__range__table__.day_of_calendar
ORDER BY hcode_name
QUALIFY __koob__row__num__ BETWEEN 11 AND 15`
            );
   });


});




