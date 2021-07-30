var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

   it('should eval sum over custom SQL', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(fackt):fact",
                     "fackt",
                     "group_pay_name", 
                     'hcode_name'
                  ],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
   `SELECT sum((round(v_main,2))) as \`fact\`, fot_out.group_pay_name as \`group_pay_name\`, fot_out.hcode_name as \`hcode_name\`
FROM fot_out AS fot_out
WHERE (fot_out.hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.group_pay_name, fot_out.hcode_name`
            );
   
     });

})