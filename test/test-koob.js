var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    it('should eval KOOB queries', function() {

            assert.equal( lpe.generate_koob_sql(
               {"columns":["sum(v_main):v_main","sum(v_rel_pp)","sum(v_rel_fzp)","sum(v_rel_pp_i)","group_pay_name"],
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
               "sort":["group_pay_name","v_main"],
               "with":"ch.fot_out"},
                     {"key":null}),
`SELECT DISTINCT sum(fot_out.v_main) AS v_main, sum(fot_out.v_rel_pp) AS v_rel_pp, sum(fot_out.v_rel_fzp) AS v_rel_fzp, sum(v_rel_pp_i), fot_out.group_pay_name AS group_pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (fot_out.pay_name != 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.group_pay_name != 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.pay_code != 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.group_pay_name
ORDER BY group_pay_name, v_main`
                  );


                  assert.equal( lpe.generate_koob_sql(
                     {"columns":["sum(v_main)","sum(v_rel_pp)","sum(v_rel_pp_i)","pay_code","pay_name"],
                     "distinct":[],
                     "filters":{
                        "dt":["=","2020-03"],
                        "pay_code":["\u0021=","Не задано"],
                        "area_name":["=","Не задано"],
                        "hcode_name":["=","ФЗП"],
                        "type_oe_bi":["=","РЖД"],
                        "region_name":["=","Не задано"],
                        "category_name":["=","Не задано"],
                        "municipal_name":["=","Не задано"],
                        "prod_group_name":["=","Не задано"],
                        "profession_name":["=","Не задано"]},
                        "with":"ch.fot_out"},
                           {"key":null}),
`SELECT DISTINCT sum(fot_out.v_main) AS v_main, sum(fot_out.v_rel_pp) AS v_rel_pp, sum(v_rel_pp_i), fot_out.pay_code AS pay_code, fot_out.pay_name AS pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') = '2020-03') AND (fot_out.pay_code != 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.pay_code, fot_out.pay_name`
                        );

               assert.equal( lpe.generate_koob_sql(
                           {"columns":["sum(v_main)","sum(v_rel_pp)","sum(v_rel_pp_i)","pay_code","pay_name"],
                           "filters":[{
                              "dt":["=","2020-03"],
                              "pay_code":["\u0021=","Не задано"],
                              "area_name":["=","Не задано"],
                              "hcode_name":["=","ФЗП"],
                              "type_oe_bi":["=","РЖД"],
                              "region_name":["=","Не задано"],
                              "category_name":["=","Не задано"],
                              "municipal_name":["=","Не задано"],
                              "prod_group_name":["=","Не задано"],
                              "profession_name":["=","Не задано"]},
                              {
                                 "dt":["=","2020-04"],
                                 "pay_code":["=","Не задано"],
                                 "area_name":["=","Не задано"],
                                 "hcode_name":["=","ФЗП"],
                                 "type_oe_bi":["=","РЖД"],
                                 "region_name":["=","Не задано"],
                                 "category_name":["=","Не задано"],
                                 "municipal_name":["=","Не задано"],
                                 "prod_group_name":["=","Не задано"],
                                 "profession_name":["=","Не задано"]}
                           ],
                           "with":"ch.fot_out"},
                                 {"key":null}),
      `SELECT sum(fot_out.v_main) AS v_main, sum(fot_out.v_rel_pp) AS v_rel_pp, sum(v_rel_pp_i), fot_out.pay_code AS pay_code, fot_out.pay_name AS pay_name
FROM fot_out AS fot_out
WHERE (((NOW() - INERVAL '1 DAY') = '2020-03') AND (fot_out.pay_code != 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   OR (((NOW() - INERVAL '1 DAY') = '2020-04') AND (fot_out.pay_code = 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.sex_code IS NULL))
GROUP BY fot_out.pay_code, fot_out.pay_name`
                              );



        assert.equal( lpe.generate_koob_sql(
         {"columns":["sum(v_main)","sum(v_rel_pp)","sum(v_rel_fzp)","id","sum(v_rel_pp_i)","sum(v_main_i)","tlg","hcode_name"],
         "distinct":[],
         "filters":[
            {"dt":["=","2020-03"],"area_name":["=","Не задано"],"type_oe_bi":["=","Дороги"],"region_name":["=","Не задано"],"group_pay_id":["!=","Не задано"],"group_pay_name":["=","Поощрения"],"municipal_name":["=","Не задано"],"prod_group_name":["=","Не задано"],"profession_name":["=","Не задано"]},
            {"dt":["=","2020-03"],"hcode_name":["=","CCЧ"],"type_oe_bi":["=","Дороги"]}],
            "with":"ch.fot_out"},
                 {"key":null}),
            `SELECT DISTINCT sum(fot_out.v_main) AS v_main, sum(fot_out.v_rel_pp) AS v_rel_pp, sum(fot_out.v_rel_fzp) AS v_rel_fzp, id, sum(v_rel_pp_i), sum(v_main_i), fot_out.tlg AS tlg, fot_out.hcode_name AS hcode_name
FROM fot_out AS fot_out
WHERE (((NOW() - INERVAL '1 DAY') = '2020-03') AND (fot_out.area_name = 'Не задано') AND (fot_out.type_oe_bi = 'Дороги') AND (fot_out.region_name = 'Не задано') AND (group_pay_id != 'Не задано') AND (fot_out.group_pay_name = 'Поощрения') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   OR (((NOW() - INERVAL '1 DAY') = '2020-03') AND (fot_out.hcode_name = 'CCЧ') AND (fot_out.type_oe_bi = 'Дороги') AND (fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
GROUP BY id, fot_out.tlg, fot_out.hcode_name`
        );

  });


  it('should eval KOOB queries: AGGFN', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":["sum(v_main):v_main","sum(v_rel_pp)","sum(v_rel_fzp)","sum(v_rel_pp_i)","group_pay_name", 'v_agg'],
      "distinct":[],
      "filters":{"dt":["BetWEEn","2020-12-07","2021-01-13"],
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
WHERE ((NOW() - INERVAL '1 DAY') BETWEEN '2020-12-07' AND '2021-01-13') AND (fot_out.pay_name != 'Не задано') AND (fot_out.area_name = 'Не задано') AND (fot_out.hcode_name = 'ФЗП') AND (fot_out.type_oe_bi = 'РЖД') AND (fot_out.region_name = 'Не задано') AND (fot_out.category_name = 'Не задано') AND (fot_out.group_pay_name != 'Не задано') AND (fot_out.municipal_name = 'Не задано') AND (fot_out.prod_group_name = 'Не задано') AND (fot_out.profession_name = 'Не задано') AND (fot_out.pay_code != 'Не задано') AND (fot_out.sex_code IS NULL)
GROUP BY fot_out.group_pay_name
ORDER BY group_pay_name, v_main, v_agg`
         );
  });


  it('KOOB access filters', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
      "with":"ch.fot_out"},
            {"_access_filters":"v_main > 1 and (v_rel_pp_i < 0 or v_rel_pp_i = 0)"}),
`SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   ((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
         );
   })

it('KOOB access filters LPE', function() {
       assert.equal( lpe.generate_koob_sql(
          {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
          "with":"ch.fot_out"},
                {"_access_filters":["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]}),
    `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   ((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
             );
       })

it('KOOB access filters LPE with expr', function() {
       assert.equal( lpe.generate_koob_sql(
           {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
           "with":"ch.fot_out"},
                   {"_access_filters":["expr", ["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]]}),
       `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   ((fot_out.v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
               );
           })


it('KOOB access filters LPE with quoted string expr', function() {
            assert.equal( lpe.generate_koob_sql(
                {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
                "with":"ch.fot_out"},
                        {"_access_filters":["expr", [">","v_main",["'","quoted string"]]]}),
            `SELECT v_rel_pp_i / (100 * (fot_out.v_main + 1)) as "v_main", sum((fot_out.v_main + v_rel_pp_i) / 100) as "v_main"
FROM fot_out AS fot_out
WHERE ((fot_out.group_pay_name = 'Не задано') AND (fot_out.pay_code = 'Не задано') AND (fot_out.pay_name = 'Не задано') AND (fot_out.sex_code IS NULL))
   AND
   (fot_out.v_main > 'quoted string')
GROUP BY v_rel_pp_i / (100 * (fot_out.v_main + 1))`
                    );
                })

    
});




