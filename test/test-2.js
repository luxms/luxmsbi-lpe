var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

  it('should eval KOOB lpe_subtotal', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":[
                  "sum(v_rel_pp):v_rel_pp",
                  "avg(v_rel_pp) / lpe_subtotal(sum(v_rel_pp)) + lpe_subtotal(avg(v_rel_pp) + 99)",
                  "group_pay_name", 
                  'hcode_name'
               ],
      "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
      "sort":["perda","-lead"],
      "limit": 100,
      "offset": 10,
      "with":"ch.fot_out"},
            {"_target_database": "postgresql"}),
`SELECT sum(fot_out.v_rel_pp) AS v_rel_pp, avg(fot_out.v_rel_pp) / (SELECT sum(fot_out.v_rel_pp) FROM fot_out AS fot_out
WHERE (fot_out.hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)) + (SELECT avg(fot_out.v_rel_pp) + 99 FROM fot_out AS fot_out
WHERE (fot_out.hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)), fot_out.group_pay_name AS group_pay_name, fot_out.hcode_name AS hcode_name
FROM fot_out AS fot_out
WHERE (fot_out.hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.group_pay_name, fot_out.hcode_name
ORDER BY perda, lead DESC LIMIT 100 OFFSET 100`
         );

  });


    
});




