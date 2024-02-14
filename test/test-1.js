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

   it('should eval KOOB total', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["branch4", "window(sum(6))"],
         "distinct":false,
         "filters":{"branch4":["=",["total",["sum", "branch4"]]]},
         "with":"ch.fot_out"},
               {"key":null, "_target_database": "clickhouse"}),
`SELECT DISTINCT COUNT(CASE WHEN (v_main > 1) AND (v_main < 100) THEN 1 END) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_fzp) as v_rel_fzp, sum(v_rel_pp_i), group_pay_name as group_pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INTERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (group_pay_name != 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)`
            );

})



   it('should eval KOOB queries', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["branch4","uniq(ss1):ss1"],
         "distinct":false,
         "filters":{"ss1":["between","2020-03","2020-04"]},
         "with":"ch.fot_out"},
               {"key":null, "_target_database": "clickhouse"}),
`SELECT DISTINCT COUNT(CASE WHEN (v_main > 1) AND (v_main < 100) THEN 1 END) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_fzp) as v_rel_fzp, sum(v_rel_pp_i), group_pay_name as group_pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INTERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (group_pay_name != 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY group_pay_name
ORDER BY group_pay_name, v_main`
            );

})

});




