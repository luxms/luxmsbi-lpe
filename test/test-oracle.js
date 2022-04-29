var assert = require('assert');
var lpe = require('../dist/lpe');



describe('LPE tests', function() {

   it('should eval KOOB TEMPLATE except', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "with":"ch.fot_out"},
               {"_target_database": "oracle"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name`
            );
   });

});




