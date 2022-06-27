var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.mockCubeJSON = '[]';


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
`SELECT DISTINCT sum(v_main) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_fzp) as v_rel_fzp, sum(v_rel_pp_i), group_pay_name as group_pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (group_pay_name != 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY group_pay_name
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
`SELECT DISTINCT sum(v_main) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_pp_i), pay_code as pay_code, pay_name as pay_name
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') = '2020-03') AND (pay_code != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY pay_code, pay_name`
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
      `SELECT sum(v_main) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_pp_i), pay_code as pay_code, pay_name as pay_name
FROM fot_out AS fot_out
WHERE (((NOW() - INERVAL '1 DAY') = '2020-03') AND (pay_code != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (sex_code IS NULL))
   OR (((NOW() - INERVAL '1 DAY') = '2020-04') AND (pay_code = 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (sex_code IS NULL))
GROUP BY pay_code, pay_name`
                              );



        assert.equal( lpe.generate_koob_sql(
         {"columns":["sum(v_main)","sum(v_rel_pp)","sum(v_rel_fzp)","id","sum(v_rel_pp_i)","sum(v_main_i)","tlg","hcode_name"],
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
`SELECT DISTINCT sum(v_main) as v_main, sum(v_rel_pp) as v_rel_pp, sum(v_rel_fzp) as v_rel_fzp, sum(v_rel_pp_i), group_pay_name as group_pay_name, (max(sum(v_main))) as v_agg
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') BETWEEN '2020-12-07' AND '2021-01-13') AND (pay_name != 'Не задано') AND (area_name = 'Не задано') AND (hcode_name = 'ФЗП') AND (type_oe_bi = 'РЖД') AND (region_name = 'Не задано') AND (category_name = 'Не задано') AND (group_pay_name != 'Не задано') AND (municipal_name = 'Не задано') AND (prod_group_name = 'Не задано') AND (profession_name = 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY group_pay_name
ORDER BY group_pay_name, v_main, v_agg`
         );
  });


  it('KOOB access filters', function() {
   assert.equal( lpe.generate_koob_sql(
      {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
      "with":"ch.fot_out"},
            {"_access_filters":"v_main > 1 and (v_rel_pp_i < 0 or v_rel_pp_i = 0)"}),
`SELECT v_rel_pp_i / (100 * (v_main + 1)) as v_main, sum((v_main + v_rel_pp_i) / 100) as v_main
FROM fot_out AS fot_out
WHERE ((group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   ((v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (v_main + 1))`
         );
   })

it('KOOB access filters LPE', function() {
       assert.equal( lpe.generate_koob_sql(
          {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
          "with":"ch.fot_out"},
                {"_access_filters":["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]}),
    `SELECT v_rel_pp_i / (100 * (v_main + 1)) as v_main, sum((v_main + v_rel_pp_i) / 100) as v_main
FROM fot_out AS fot_out
WHERE ((group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   ((v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (v_main + 1))`
             );
       })

it('KOOB access filters LPE with expr', function() {
       assert.equal( lpe.generate_koob_sql(
           {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
           "with":"ch.fot_out"},
                   {"_access_filters":["expr", ["and",[">","v_main",1],["()",["or",["<","v_rel_pp_i",0],["=","v_rel_pp_i",0]]]]]}),
       `SELECT v_rel_pp_i / (100 * (v_main + 1)) as v_main, sum((v_main + v_rel_pp_i) / 100) as v_main
FROM fot_out AS fot_out
WHERE ((group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   ((v_main > 1) AND (((v_rel_pp_i < 0) OR (v_rel_pp_i = 0))))
GROUP BY v_rel_pp_i / (100 * (v_main + 1))`
               );
           })


it('KOOB access filters LPE with quoted string expr', function() {
            assert.equal( lpe.generate_koob_sql(
                {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
                "with":"ch.fot_out"},
                        {"_access_filters":["expr", [">","v_main",["'","quoted string"]]]}),
            `SELECT v_rel_pp_i / (100 * (v_main + 1)) as v_main, sum((v_main + v_rel_pp_i) / 100) as v_main
FROM fot_out AS fot_out
WHERE ((group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   (v_main > 'quoted string')
GROUP BY v_rel_pp_i / (100 * (v_main + 1))`
                    );
                })


   it('should eval KOOB concat', function() {
                  assert.equal( lpe.generate_koob_sql(
                     {"columns":[
                                 "concat(toString(v_rel_pp), '*', v_rel_pp, hcode_name ):v_rel_pp",
                                 "toString(group_pay_name)", 
                                 'hcode_name'
                              ],
                     "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
                     "sort":["perda","-lead"],
                     "limit": 100,
                     "offset": 10,
                     "with":"ch.fot_out"},
                           {"_target_database": "clickhouse"}),
`SELECT concat(toString(v_rel_pp),'*',v_rel_pp,hcode_name) as v_rel_pp, toString(group_pay_name), hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01')
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10
SETTINGS max_threads = 1`
                        );
   });

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
   `SELECT sum((round(v_main,2))) as fact, (round(v_main,2)) as fackt, group_pay_name as group_pay_name, hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY (round(v_main,2)), group_pay_name, hcode_name`
            );
   
     });


        /*
   если значение var == null
   cond('col in $(row.var)', []) = значит убрать cond вообще (с учётом or/and)
   cond('col in $(var)', 'defval') = col in defval
   cond('col = $(var)', ['col is null']) = полная замена col is null
   */
   it('should eval SQL cond expressions', function() {
      assert.equal( lpe.eval_sql_where(
          'where( cond(myfunc($(period.title)) = 234, [] ) )',
          {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
          "WHERE myfunc(Noyabr) = 234"
      );

      assert.equal( lpe.eval_sql_where(
         'where( cond(myfunc($(period.title1)) = 234, "defaultVal")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         'WHERE myfunc("defaultVal") = 234'
     );

     assert.equal( lpe.eval_sql_where(
      "where( cond(myfunc($(period.title1)) = 234,'defaultVal')  )",
      {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
      "WHERE myfunc('defaultVal') = 234"
      );

     assert.equal( lpe.eval_sql_where(
      'where( cond(myfunc($(period.title1)) = 234, ["myfunc(1)"])  )',
      {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
      'WHERE myfunc(1)'
      );

      assert.equal( lpe.eval_sql_where(
         "where( cond(myfunc($(period.title1)) = '234')  )",
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc() = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         "where( cond(myfunc($(period.title)) = '234')  )",
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc(Noyabr) = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         "where( cond(myfunc(ql($(period.title))) = '234')  )",
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc('Noyabr') = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         "where( cond(myfunc($(period.title)) = '234')  )",
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE myfunc(2001) = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond(table.column = $(period.title))  )',
         {"_quoting":"explicit", "a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE table.column = 2001"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond(table.column = ql($(period.title)))  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE table.column = '2001'"
         );

      assert.equal( lpe.eval_sql_where(
         'cond(table.column = ql($(period.title)))  ',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "table.column = '2001'"
         );

      assert.equal( lpe.eval_sql_where(
         'filter( cond(table.col or $(period.title) or 23) or cond(table.col2 = ql($(period.title))) )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "table.col or 2001 or 23 or table.col2 = '2001'"
         );

      assert.equal( lpe.eval_sql_where(
         "filter( cond(year_start <= $(row.y), []) and  cond(short_tp = ql($(row.short_tp)) or col != '$(row.short_tp)' && version = ql($(version)), []) )",
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"short_tp":["=","ГКБ"],"y":["=",2021]}}}),
         "year_start <= 2021 and short_tp = 'ГКБ' or col != 'ГКБ' and version = '2.0'"
         );

         assert.equal( lpe.eval_sql_where(
            "filter( cond(year_start <= $(row.y), []) and  cond(short_tp = ql($(row.short_tp)) or col != '$(row.short_tp)' && version = ql($(version)), []) )",
            {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"short_tp":["=","ГКБ"],"y":["=",2021]}}}),
            "year_start <= 2021 and short_tp = 'ГКБ' or col != 'ГКБ' and version = '2.0'"
            );

   });

   it('should eval KOOB only1', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "only1(toString(v_rel_pp)):v_rel_pp",
                     "sum(group_pay_name)",
                     "only1(v_rel_pp111)",
                     'hcode_name'
                  ],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
         "sort":["perda","-lead"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `/*ON1Y*/SELECT toString(v_rel_pp) as v_rel_pp, sum(group_pay_name) as group_pay_name, v_rel_pp111, hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10
SETTINGS max_threads = 1`
            );
   });


   it('should eval KOOB partial filters', function() {
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




      
         it('should eval KOOB cond (koob lookup)', function() {
            assert.equal( lpe.eval_sql_where(
               "filter( cond(year_start <= $(row.y), []) and cond(short_tp = $(row.short_tp), []) and cond(short_tp = ql($(row.short_tp)) or col != '$(row.short_tp)' && version = ql($(version)), []) )",
               {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"short_tp":["=","ГКБ"],"y":["=",2021]}}}),
               "year_start <= 2021 and short_tp = ГКБ and short_tp = 'ГКБ' or col != 'ГКБ' and version = '2.0'"
               )
         });
      
         it('should eval KOOB filters (koob lookup)', function() {
            assert.equal( lpe.eval_sql_where(
               "filters( )",
               {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
               "short_tp IN ('ГКБ!','КГБ') and y > '2021'"
               )
         });
      
      
         it('should eval KOOB filters with except (koob lookup)', function() {
            assert.equal( lpe.eval_sql_where(
               "filters( except(y), short_tp:tp, y:year )",
               {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
               "tp IN ('ГКБ!','КГБ')"
               )
         });


         it('should eval KOOB sort (koob lookup)', function() {
            assert.equal( lpe.eval_sql_where(
               "order_by()",
               {"_quoting":"explicit" ,"version":"2.0",
               "row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},
               "limit":100,"offset":0,
               "sort": ["-short_tp", "y"],
               "_columns": {"short_tp": {"name": "short_tp", "order": "a.ADDR", "title": "Адрес"},
                            "y": {"name": "y", "order": "some-crazy-Schema.y", "title": "Й"}
                           },
               "context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
               'ORDER BY a.ADDR DESC,"some-crazy-Schema".y'
               )
         });
  
         it('Should eval coefficients', function() {
            assert.equal( lpe.generate_koob_sql(
               {"coefficients": {
                  "$x" : 123,
                  "$y" : 34
               },
               "columns":[
                           "sum(fackt)*$x:fact",
                           "fackt + $y",
                           "group_pay_name - $y", 
                           'hcode_name'
                        ],
               "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
               "with":"ch.fot_out"},
                     {"_target_database": "mysql"}),
         `SELECT sum((round(v_main,2))) * 123 as fact, (round(v_main,2)) + 34 as fackt, group_pay_name - 34 as group_pay_name, hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY (round(v_main,2)) + 34, group_pay_name - 34, hcode_name`
                  );
           });
});




