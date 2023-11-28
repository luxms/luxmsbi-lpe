var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

describe('LPE KOOB tests', function() {

   it('should eval KOOB SUBTOTALS ONE COL and range()', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["range(2):rng", "dt", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
         "subtotals": ["rng", "dt"],
         "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":false},
         "filters":{"dt":["!=","2020-03","2020-04"],
         "pay_name":["!=","Не задано"]},
         "sort":["group_pay_name","v_main"],
         "with":"ch.fot_out"},
               {"_target_database": "teradata"}),
`SELECT koob__range__table__.day_of_calendar - 1 as "rng", (NOW() - INERVAL '1 DAY') as "dt", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i), GROUPING(koob__range__table__.day_of_calendar - 1) AS "∑rng", GROUPING((NOW() - INERVAL '1 DAY')) AS "∑dt"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as koob__range__table__
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (koob__range__table__.day_of_calendar <= 2) AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS ((koob__range__table__.day_of_calendar - 1, (NOW() - INERVAL '1 DAY'))
                       )
ORDER BY "group_pay_name", "v_main"`
            );
      });


      it('should eval KOOB SUBTOTALS range() in the middle', function() {

         assert.equal( lpe.generate_koob_sql(
            {"columns":["v_main", "range(2):rng", "dt", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
            "subtotals": ["v_main","rng"],
            "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":false},
            "filters":{"dt":["!=","2020-03","2020-04"],
            "pay_name":["!=","Не задано"]},
            "sort":["group_pay_name","v_main"],
            "with":"ch.fot_out"},
                  {"_target_database": "teradata"}),
`SELECT v_main as "v_main", koob__range__table__.day_of_calendar - 1 as "rng", (NOW() - INERVAL '1 DAY') as "dt", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i), GROUPING(v_main) AS "∑v_main", GROUPING(koob__range__table__.day_of_calendar - 1) AS "∑rng", GROUPING((NOW() - INERVAL '1 DAY')) AS "∑dt"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as koob__range__table__
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (koob__range__table__.day_of_calendar <= 2) AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS ((v_main, koob__range__table__.day_of_calendar - 1, (NOW() - INERVAL '1 DAY'))
                       ,(v_main),
                        (v_main,koob__range__table__.day_of_calendar - 1)
                       )
ORDER BY "group_pay_name", "v_main"`
               );
         });

         it('should eval KOOB SUBTOTALS range() in the middle', function() {

            assert.equal( lpe.generate_koob_sql(
               {"columns":["v_main", "range(2):rng", "dt", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
               "subtotals": ["v_main","rng","dt"],
               "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":false},
               "filters":{"dt":["!=","2020-03","2020-04"],
               "pay_name":["!=","Не задано"]},
               "sort":["group_pay_name","v_main"],
               "with":"ch.fot_out"},
                     {"_target_database": "teradata"}),
`SELECT v_main as "v_main", koob__range__table__.day_of_calendar - 1 as "rng", (NOW() - INERVAL '1 DAY') as "dt", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i), GROUPING(v_main) AS "∑v_main", GROUPING(koob__range__table__.day_of_calendar - 1) AS "∑rng", GROUPING((NOW() - INERVAL '1 DAY')) AS "∑dt"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as koob__range__table__
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (koob__range__table__.day_of_calendar <= 2) AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS ((v_main, koob__range__table__.day_of_calendar - 1, (NOW() - INERVAL '1 DAY'))
                       ,(v_main),
                        (v_main,koob__range__table__.day_of_calendar - 1)
                       )
ORDER BY "group_pay_name", "v_main"`
                  );
            });

            it('should eval KOOB SUBTOTALS ONE COL and range()', function() {

               assert.equal( lpe.generate_koob_sql(
                  {"columns":["range(2):rng", "dt","v_main", "group_pay_name", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
                  "subtotals": ["rng", "dt", "v_main"],
                  "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":false},
                  "filters":{"dt":["!=","2020-03","2020-04"],
                  "pay_name":["!=","Не задано"]},
                  "sort":["group_pay_name","v_main"],
                  "with":"ch.fot_out"},
                        {"_target_database": "teradata"}),
`SELECT koob__range__table__.day_of_calendar - 1 as "rng", (NOW() - INERVAL '1 DAY') as "dt", v_main as "v_main", group_pay_name as "group_pay_name", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i), GROUPING(koob__range__table__.day_of_calendar - 1) AS "∑rng", GROUPING((NOW() - INERVAL '1 DAY')) AS "∑dt", GROUPING(v_main) AS "∑v_main", GROUPING(group_pay_name) AS "∑group_pay_name"
FROM fot_out AS fot_out,sys_calendar.CALENDAR as koob__range__table__
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (koob__range__table__.day_of_calendar <= 2) AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS ((koob__range__table__.day_of_calendar - 1, (NOW() - INERVAL '1 DAY'), v_main, group_pay_name)
                       ,(koob__range__table__.day_of_calendar - 1,(NOW() - INERVAL '1 DAY')),
                        (koob__range__table__.day_of_calendar - 1,(NOW() - INERVAL '1 DAY'),v_main)
                       )
ORDER BY "group_pay_name", "v_main"`
                     );
               });

})