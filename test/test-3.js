var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    it('KOOB access filters', function() {
        assert.equal( lpe.generate_koob_sql(
           {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
           "with":"ch.fot_out"},
                 {"_access_filters":"v_main > 1 and (v_rel_pp_i < 0 or v_rel_pp_i = 0)"}),
     `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   (((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0)))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
              );
        })

    it('KOOB access filters LPE', function() {
            assert.equal( lpe.generate_koob_sql(
               {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
               "with":"ch.fot_out"},
                     {"_access_filters":["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]}),
         `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   (((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0)))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
                  );
            })

    it('KOOB access filters LPE with expr', function() {
            assert.equal( lpe.generate_koob_sql(
                {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
                "with":"ch.fot_out"},
                        {"_access_filters":["expr", ["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]]}),
            `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   (((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0)))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
                    );
                })

})