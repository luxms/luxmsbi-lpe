var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

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
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ <= 10`
            );
   });

   it('should eval LIMIT with no order', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": [],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
QUALIFY koob__row__num__ <= 10`
            );
   });


   it('should eval LIMIT with no order no agg', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "v_rel_pp:'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": [],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
   `SELECT ROW_NUMBER() OVER (order by "АХТУНГ",hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT v_rel_pp as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out) koob__top__level__select__
QUALIFY koob__row__num__ <= 10`
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
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ > 10`
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
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ BETWEEN 11 AND 15`
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
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name", "rng" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", koob__range__table__.day_of_calendar - 1 as "rng"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as koob__range__table__
WHERE (hcode_name IS NOT NULL) AND (koob__range__table__.day_of_calendar <= 2) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__table__.day_of_calendar - 1) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ BETWEEN 11 AND 15`
            );
   });

   it('should eval KOOB SUBTOTALS', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["dt", "type_oe_bi", "region_name", "pay_name", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
         "subtotals": ["dt", "type_oe_bi", "region_name", "pay_name"],
         "config": {"subtotalsMode":"!AllButOneInterleaved"},
         "filters":{"dt":["!=","2020-03","2020-04"],
         "pay_name":["!=","Не задано"]},
         "sort":["group_pay_name","v_main"],
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
`SELECT (NOW() - INERVAL '1 DAY') as "dt", type_oe_bi as "type_oe_bi", region_name as "region_name", pay_name as "pay_name", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i)
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS (((NOW() - INERVAL '1 DAY'), type_oe_bi, region_name, pay_name),
                        (type_oe_bi, region_name, pay_name),
                        ((NOW() - INERVAL '1 DAY'), region_name, pay_name),
                        ((NOW() - INERVAL '1 DAY'), type_oe_bi, pay_name)
                       )
ORDER BY group_pay_name, v_main`
            );
      });

});




