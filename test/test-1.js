var assert = require('assert');
var lpe = require('../dist/lpe');

/*
{"columns": 
["doc_currcy", "fm_area", "loc_currcy", "fiscper", 
"running(sum, deb_cre_lc, -fiscper):rs",
"running(lead, rs):lead",
"rs - lead",
"(lead / rs * 100):perda"
]
select loc_currcy,fiscper, deb_cre_lc,  deb_cre_lc_accum, perda, prev from (
SELECT
    fiscper,doc_currcy,loc_currcy,
    finalizeAggregation(mnt) AS deb_cre_lc,
    runningAccumulate(mnt, (doc_currcy,loc_currcy)) AS deb_cre_lc_accum,
    finalizeAggregation(mnt) / runningAccumulate(mnt, (doc_currcy,loc_currcy)) * 100  as perda,
    runningAccumulate(mnt, (doc_currcy,loc_currcy)) - finalizeAggregation(mnt)  as prev
FROM
(
select fiscper,doc_currcy,loc_currcy, initializeAggregation('sumState',count(deb_cre_lc )) as mnt 
from gpn.zgrccp410_out zv 
group by fiscper,doc_currcy ,loc_currcy
order by doc_currcy,loc_currcy,fiscper
)
) where fiscper = '2019-03-01'

*/

describe('LPE tests', function() {


  it('should eval KOOB WINDOW FUNCTIONS FOR Clickhouse', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":[
                  "(lead / rs * 100):perda",
                  "running(lead, rs):lead",
                  "running(sum, v_main, -hcode_name):rs",
                  "(rs/100):div",
                  "sum(v_rel_pp)"
               ],
      "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
      "sort":["perda","-lead"],
      "limit": 100,
      "offset": 10,
      "with":"ch.fot_out"},
            {"_target_database": "clickhouse"}),
`SELECT (lead / rs * 100) as "perda", finalizeAggregation(_w_f_1) as "lead", runningAccumulate(_w_f_1, tuple(null)) as "rs", (rs / 100) as "div", v_rel_pp as "v_rel_pp"
FROM (
SELECT initializeAggregation('sumState',sum(v_main)) as "_w_f_1", sum(fot_out.v_rel_pp) as "v_rel_pp"
FROM fot_out AS fot_out
HAVING (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
         );

  });



  it('should eval KOOB WINDOW FUNCTIONS WITH GROUP BY FOR Clickhouse', function() {
    assert.equal( lpe.generate_koob_sql(
       {"columns":[
                   "(lead / rs * 100):perda",
                   "running(lead, rs):lead",
                   "running(sum, v_main, -hcode_name):rs",
                   "(rs/100):div",
                   "sum(v_rel_pp)",
                   "group_pay_name", 'hcode_name'
                ],
       "distinct":[],
       "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
       "sort":["perda","-lead"],
       "limit": 100,
       "offset": 10,
       "with":"ch.fot_out"},
             {"_target_database": "clickhouse"}),
 `SELECT DISTINCT (lead / rs * 100) as "perda", finalizeAggregation(_w_f_1) as "lead", runningAccumulate(_w_f_1, (group_pay_name)) as "rs", (rs / 100) as "div", v_rel_pp as "v_rel_pp", group_pay_name as "group_pay_name", hcode_name as "hcode_name"
FROM (
SELECT initializeAggregation('sumState',sum(v_main)) as "_w_f_1", sum(fot_out.v_rel_pp) as "v_rel_pp", fot_out.group_pay_name as "group_pay_name", fot_out.hcode_name as "hcode_name"
FROM fot_out AS fot_out
GROUP BY fot_out.group_pay_name, fot_out.hcode_name
HAVING (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY fot_out.group_pay_name, fot_out.hcode_name
)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
          );
 
   });


   it('should eval KOOB WINDOW FUNCTIONS WITH dictionaries FOR Clickhouse', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "(lead / rs * 100):perda",
                     "running(lead, rs):lead",
                     "running(sum, v_main, -hcode_name):rs",
                     "(rs/100):div",
                     "sum(v_rel_pp)",
                     "pay_title", 'hcode_name'
                  ],
         "distinct":[],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
         "sort":["perda","-lead"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `SELECT DISTINCT (lead / rs * 100) as "perda", finalizeAggregation(_w_f_1) as "lead", runningAccumulate(_w_f_1, (pay_code)) as "rs", (rs / 100) as "div", v_rel_pp as "v_rel_pp", dictGet('gpn.group_pay_dict', 'some_real_field', tuple(pay_code)) as "pay_title", hcode_name as "hcode_name"
FROM (
SELECT initializeAggregation('sumState',sum(v_main)) as "_w_f_1", sum(fot_out.v_rel_pp) as "v_rel_pp", pay_code as "pay_code", fot_out.hcode_name as "hcode_name"
FROM fot_out AS fot_out
GROUP BY pay_code, fot_out.hcode_name
HAVING (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY pay_code, fot_out.hcode_name
)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
            );
     });


   it('should eval KOOB dictionaries FOR Clickhouse without WINDOW functions', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp)",
                     "pay_title", 'hcode_name'
                  ],
         "distinct":[],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
         "sort":["perda"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `SELECT DISTINCT sum(fot_out.v_rel_pp) as "v_rel_pp", dictGet('gpn.group_pay_dict', 'some_real_field', tuple(pay_code)) as "pay_title", fot_out.hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (fot_out.hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY pay_code, fot_out.hcode_name
ORDER BY perda LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
            );
   });

  
   it('should eval KOOB WHERE dictionaries FOR Clickhouse without WINDOW functions and without column', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):sum",
                     'hcode_name'
                  ],
         "filters":{"hcode_name": [">","2019-01-01"],
                     "pay_title": ["=", "2019-01-01", "2020-03-01"]},
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `SELECT sum(fot_out.v_rel_pp) as "sum", fot_out.hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (fot_out.hcode_name > '2019-01-01') AND ((dictGet('gpn.group_pay_dict', 'some_real_field', tuple(pay_code))) IN ('2019-01-01', '2020-03-01')) AND (fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.hcode_name LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
            );
   });

});




