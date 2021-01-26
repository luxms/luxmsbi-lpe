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
`SELECT DISTINCT lead / rs * 100 AS perda, finalizeAggregation(_w_f_1) AS lead, runningAccumulate(_w_f_1, (group_pay_name)) AS rs, rs / 100 AS div, v_rel_pp AS v_rel_pp, group_pay_name AS group_pay_name, hcode_name AS hcode_name
FROM (
SELECT initializeAggregation('sumState',sum(v_main)) AS _w_f_1, sum(fot_out.v_rel_pp) AS v_rel_pp, fot_out.group_pay_name AS group_pay_name, fot_out.hcode_name AS hcode_name
FROM fot_out AS fot_out
GROUP BY fot_out.group_pay_name, fot_out.hcode_name
HAVING (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY fot_out.group_pay_name, fot_out.hcode_name
)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 100
SETTINGS max_threads = 12`
         );

  });


    
});




