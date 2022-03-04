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
`SELECT sum(v_rel_pp) as "v_rel_pp", avg(v_rel_pp) / (SELECT sum(v_rel_pp) FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)) + (SELECT avg(v_rel_pp) + 99 FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)), group_pay_name as "group_pay_name", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10`
         );


          assert.equal( lpe.generate_koob_sql(
             {"columns":[
                         "sum(v_rel_pp):v_rel_pp",
                         "group_pay_name", 
                         'hcode_name',
                         'if ( sum(v_rel_pp)=0, 0, sum(pay_code)/sum(v_rel_pp)):d'
                      ],
             "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"],
                        "group_pay_name": ["="],
                        "pay_code": ["or", ["!="], ["ilike", "Муж"]]
              },
             "sort":["perda","-lead","-rand()","rand()"],
             "limit": 100,
             "offset": 10,
             "with":"ch.fot_out"},
                   {"_target_database": "postgresql"}),
        `SELECT sum(v_rel_pp) as "v_rel_pp", group_pay_name as "group_pay_name", hcode_name as "hcode_name", CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as "d"
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10`
        );

  });


    
});




