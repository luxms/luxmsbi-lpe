var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

describe('LPE KOOB tests', function() {

   it('KOOB access filters', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
         "with":"ch.fot_out"},
               {"_access_filters":"v_main > 1 and (v_rel_pp_i < 0 or v_rel_pp_i = 0) and v_main = [1,2,3] and v_main != [1,2,3] or v_main = ['a','b','c']"}),
   `SELECT CAST(v_rel_pp_i AS FLOAT) / (100 * (v_main + 1)) as v_main, sum(CAST((v_main + v_rel_pp_i) AS FLOAT) / 100) as v_main
   FROM fot_out AS fot_out
   WHERE ((group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
      AND
      ((v_main > 1) AND ((((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))) AND ((v_main IN (1, 2, 3)) AND (v_main NOT IN (1, 2, 3)))))
   GROUP BY CAST(v_rel_pp_i AS FLOAT) / (100 * (v_main + 1))`
            );
      })

})