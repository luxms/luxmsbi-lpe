var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

describe('LPE KOOB tests', function() {



   it('should eval KOOB  if & sum', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     'if( sum(v_rel_pp)!= 0, (sum(v_rel_pp)/count(pay_code)*50)+(sum(v_rel_pp)/sum(group_pay_name)*50), 0):koeff'
                   ],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"],
                    "group_pay_name": ["="],
                    "v_rel_pp": ["!="],
                    "pay_code": ["or", ["!="], ["ilike", "Муж"]]
          },
         "sort":["perda","-lead","-rand()","rand()"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "postgresql"}),
    `SELECT sum(v_rel_pp) as v_rel_pp, group_pay_name as group_pay_name, hcode_name as hcode_name, CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d, CASE WHEN v_rel_pp IN (0, 1, 2) OR v_rel_pp IS NULL THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d, CASE WHEN v_rel_pp NOT IN (0, 1, 2) AND v_rel_pp IS NOT NULL THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d, CASE WHEN (v_rel_pp <= 0) AND ((v_rel_pp > -2) AND (NOT v_rel_pp IS NULL)) THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d
   FROM fot_out AS fot_out
   WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (pay_code ILIKE 'Муж')) AND (sex_code IS NULL)
   GROUP BY group_pay_name, hcode_name
   ORDER BY perda, lead DESC, random() DESC, random() LIMIT 100 OFFSET 10`
            );
      
         });
})