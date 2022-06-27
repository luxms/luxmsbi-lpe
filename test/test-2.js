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
`SELECT sum(v_rel_pp) as v_rel_pp, avg(v_rel_pp) / (SELECT sum(v_rel_pp) FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)) + (SELECT avg(v_rel_pp) + 99 FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)), group_pay_name as group_pay_name, hcode_name as hcode_name
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
                        "v_rel_pp": ["!="],
                        "pay_code": ["or", ["!="], ["ilike", "Муж"]]
              },
             "sort":["perda","-lead","-rand()","rand()"],
             "limit": 100,
             "offset": 10,
             "with":"ch.fot_out"},
                   {"_target_database": "postgresql"}),
        `SELECT sum(v_rel_pp) as v_rel_pp, group_pay_name as group_pay_name, hcode_name as hcode_name, CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (pay_code ILIKE 'Муж')) AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name
ORDER BY perda, lead DESC, random() DESC, random() LIMIT 100 OFFSET 10`
        );

  });
  
  


it('should eval KOOB time_shift()', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":["id","tlg","hcode_name", "sum(v_main_i)","time_shift(sum(v_main_i), -1, year)"],
      "distinct":[],
      "filters":[
         {"dt":["=","2020-03"],"area_name":["=","Не задано"],"type_oe_bi":["=","Дороги"],"region_name":["=","Не задано"],"group_pay_id":["!=","Не задано"],"group_pay_name":["=","Поощрения"],"municipal_name":["=","Не задано"],"prod_group_name":["=","Не задано"],"profession_name":["=","Не задано"]},
         {"dt":["=","2020-03"],"hcode_name":["=","CCЧ"],"type_oe_bi":["=","Дороги"]}],
         "with":"ch.fot_out"},
            {"key":null}),
         `SELECT DISTINCT sum(v_main) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_fzp) as v_rel_fzp, id, sum(v_rel_pp_i), sum(v_main_i), tlg as tlg, hcode_name as hcode_name
   FROM fot_out AS fot_out
   WHERE (((NOW() - INERVAL '1 DAY') = '2020-03') AND (area_name = 'Не задано') AND (type_oe_bi = 'Дороги') AND (region_name = 'Не задано') AND (group_pay_id != 'Не задано') AND (group_pay_name = 'Поощрения') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   OR (((NOW() - INERVAL '1 DAY') = '2020-03') AND (hcode_name = 'CCЧ') AND (type_oe_bi = 'Дороги') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   GROUP BY id, tlg, hcode_name`
   );

   });
});




