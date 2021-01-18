var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

  it('should eval KOOB queries: AGGFN', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":["sum(v_main):v_main","sum(v_rel_pp)","sum(v_rel_fzp)","sum(v_rel_pp_i)","group_pay_name", 'v_agg'],
      "distinct":[],
      "filters":{"dt":["!=","2020-03","2020-04"],
      "pay_name":["!=","Не задано"],
      "area_name":["=","Не задано"],
      "hcode_name":["=","ФЗП"],
      "type_oe_bi":["=","РЖД"],
      "region_name":["=","Не задано"],
      "category_name":["=","Не задано"],
      "group_pay_name":["!=","Не задано"],
      "municipal_name":["=","Не задано"],
      "prod_group_name":["=","Не задано"],
      "profession_name":["=","Не задано"]},
      "sort":["group_pay_name","v_main","v_agg"],
      "with":"ch.fot_out"},
            {"key":null}),
`SELECT DISTINCT sum(fot_out.v_main) AS v_main, sum(fot_out.v_rel_pp) AS v_rel_pp, sum(fot_out.v_rel_fzp) AS v_rel_fzp, sum(v_rel_pp_i), fot_out.group_pay_name AS group_pay_name, (max(sum(v_main))) AS v_agg
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (fot_out.pay_name != 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.group_pay_name != 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.pay_code != 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.group_pay_name
ORDER BY group_pay_name, v_main, v_agg`
         );



  });


    
});




