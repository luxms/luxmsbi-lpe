var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKcubeColumns =  [
{"id":"bi.cube.filters","sql_query":"filters","type":"STRING","config":{"possible_aggregations": []}},
{"id":"bi.cube.id","sql_query":"id","type":"NUMBER","config":{"possible_aggregations": []}},                                     
{"id":"bi.cube.org_fullname_nm","sql_query":"org_fullname_nm","type":"STRING","config":{"possible_aggregations": []}},           
{"id":"bi.cube.org_shortname_nm","sql_query":"org_shortname_nm","type":"STRING","config":{"possible_aggregations": []}},         
{"id":"bi.cube.contracts_by_year","sql_query":"contracts_by_year","type":"STRING","config":{"possible_aggregations": []}},       
{"id":"bi.cube.all_contracts","sql_query":"all_contracts","type":"STRING","config":{"possible_aggregations": []}},               
{"id":"bi.cube.additional_contracts","sql_query":"additional_contracts","type":"STRING","config":{"possible_aggregations": []}}, 
{"id":"bi.cube.ratio_paid_balance","sql_query":"ratio_paid_balance","type":"STRING","config":{"possible_aggregations": []}},     
{"id":"bi.cube.rating","sql_query":"rating","type":"STRING","config":{"possible_aggregations": []}},                             
{"id":"bi.cube.contracts_status","sql_query":"contracts_status","type":"STRING","config":{"possible_aggregations": []}},         
{"id":"bi.cube.purchase_method","sql_query":"purchase_method","type":"STRING","config":{"possible_aggregations": []}},           
{"id":"bi.cube.tru","sql_query":"tru","type":"STRING","config":{"possible_aggregations": []}},                                   
{"id":"bi.cube.kgg_rank","sql_query":"kgg_rank","type":"STRING","config":{"possible_aggregations": []}},                         
{"id":"bi.cube.dt","sql_query":"dt","type":"NUMBER","config":{"possible_aggregations": []}},                                     
{"id":"bi.cube.purch_region_nm","sql_query":"purch_region_nm","type":"STRING","config":{"possible_aggregations": []}},           
{"id":"bi.cube.spec_mtr_nm","sql_query":"spec_mtr_nm","type":"STRING","config":{"possible_aggregations": []}},                   
{"id":"bi.cube.vpz_nm","sql_query":"vpz_nm","type":"STRING","config":{"possible_aggregations": []}},                             
{"id":"bi.cube.purch_method_nm","sql_query":"purch_method_nm","type":"STRING","config":{"possible_aggregations": []}},           
{"id":"bi.cube.org_inn_cd","sql_query":"org_inn_cd","type":"STRING","config":{"possible_aggregations": []}},                     
{"id":"bi.cube.regions","sql_query":"regions","type":"STRING","config":{"possible_aggregations": []}}]

globalThis.MOCKCubeSQL = {
   "clickhouse-bi.cube":{
      "query": `(SELECT 1 from cube where
\${filters()}
or \${filters(except(vpz_nm))}
or \${filters(id,dt)})`, 
      "config": {"is_template": 1,"skip_where": 1}}}


//             "pay_code":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
describe('KOOB templates', function() {


   it('should eval to_char', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "to_char(dt, 'YYYY'):dt",
                     "to_char(dt,'YYYY-\"Q\"Q'):dt_period",
                     "to_char(dt,'YYYY-\"W\"WW'):dt_w",
                     "to_char(dt,'YYYY-\"Q\"Q'):dt_q",
                     'sum(id)'
                  ],
         "filters":{
         },
         "sort": ["id"],
         "limit": 10,
         "with":"bi.cube"},
               {"_target_database": "clickhouse"}),
   `SELECT leftPad(toString(toYear(dt)), 4, '0') as dt, format('{}-Q{}', leftPad(toString(toYear(dt)), 4, '0'), toString(toQuarter(dt))) as dt_period, format('{}-W{}', leftPad(toString(toYear(dt)), 4, '0'), leftPad(toString(toISOWeek(dt)), 2, '0')) as dt_w, format('{}-Q{}', leftPad(toString(toYear(dt)), 4, '0'), toString(toQuarter(dt))) as dt_q, sum(id) as id
FROM (SELECT 1 from cube where
1=1
or 1=1
or 1=1)
GROUP BY dt, dt_period, dt_w, dt_q
ORDER BY id LIMIT 10`
            );
   });



   it('should eval ilike', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(id):'АХТУНГ'",
                     'id'
                  ],
         "filters":{
            "regions":["ilike","%N%"],
            "dt":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
         },
         "sort": ["id"],
         "limit": 10,
         "with":"bi.cube"},
               {"_target_database": "clickhouse"}),
   `SELECT sum(id) as "АХТУНГ", id as id
FROM (SELECT 1 from cube where
(toString(regions) ILIKE '%N%') AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or (toString(regions) ILIKE '%N%') AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09'))))
GROUP BY id
ORDER BY id LIMIT 10`
            );
   });


   it('should eval empty and()', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(id):'АХТУНГ'",
                     'id'
                  ],
         "filters":{
            "id":["and"]
         },
         "sort": ["dt"],
         "limit": 10,
         "with":"bi.cube"},
               {"_target_database": "clickhouse"}),
   `SELECT sum(id) as "АХТУНГ", id as id
FROM (SELECT 1 from cube where
(1=1)
or (1=1)
or (1=1))
GROUP BY id
ORDER BY dt LIMIT 10`
            );
   });



         it('should eval empty and()', function() {

globalThis.MOCKCubeSQL = {
   "clickhouse-bi.cube":{
      "query": `(SELECT 1 from cube where
where \${filters()}
where \${filters(id)} and status_nm = 'Закрыт'
where \${filters(except(purch_method_nm))} and status_nm != 'Проект'
where \${filters(except(spec_mtr_nm))} and status_nm != 'Проект'
where \${filters(except(id))} and status_nm != 'Проект'
where \${filters(id)}
where \${filters(except(vpz_nm))} and status_nm != 'Проект'
where \${filters(except(purch_region_nm))} and status_nm != 'Проект'
where \${filters(id)}
`, 
      "config": {"is_template": 1,"skip_where": 1}}}

            assert.equal( lpe.generate_koob_sql(
               {"columns":[
                           "regions"
                        ],
               "filters":{
                  "dt":["between",2019,2022],
                  "id":["=",23000035]
               },
               "with":"bi.cube"},
                     {"_target_database": "clickhouse"}),
         `SELECT regions as regions
FROM (SELECT 1 from cube where
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035)
where (id = 23000035) and status_nm = 'Закрыт'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) and status_nm != 'Проект'
where (id = 23000035)
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (id = 23000035)
`
                  );
         });



// FIXME: ->(user,sys_config,ext_groups) MUST BE FIXED
   it('should filter()', function() {
               globalThis.MOCKCubeSQL = {
                  "clickhouse-bi.cube":{
                     "query": `SELECT 1 from cube where \${filter(a = get_in(user,sys_config,external) or b = var_samp(regions) or a = [1,2,3] 
                        or b = get_in(user,sys_config,ext_groups) 
                        and cond(col in (get_in(user,sys_config,ext_groups)), ['col is null']) )}`,
                     "config": {"is_template": 1,"skip_where": 1}}}
               
               assert.equal( lpe.generate_koob_sql(
                  {"columns":[
                              "regions"
                           ],
                  "filters":{
                     "dt":["between",2019,2022],
                     "id":["=",23000035],
                     "regions":["=","Moscow","piter","tumen"]
                  },
                  "with":"bi.cube"},
                        {"_target_database": "clickhouse", "_user_info": {"username":"vasya","sys_config":{"external":true, "ext_groups":["a","b","c"]}}}),
               `SELECT regions as regions
FROM SELECT 1 from cube where a = true or b = var_samp(regions) or a IN (1,2,3) or b = ->(user,sys_config,ext_groups) or b IN (a,b,c) or b in ('a','b','c') and col in ('a','b','c')`
                                 );
                        });

   it('should eval ilike', function() {
   
      globalThis.MOCKCubeSQL = {
         "clickhouse-bi.cube":{
            "query": `(SELECT 1 from cube where
\${filters()}
or \${filters(except(vpz_nm))}
or \${filters("id",'dt':'date space')})`, 
            "config": {"is_template": 1,"skip_where": 1}}}

      
         assert.equal( lpe.generate_koob_sql(
            {"columns":[
                        "sum(id):'АХТУНГ'",
                        'id'
                     ],
            "filters":{
               "regions":["ilike","%N%"],
               "id":["=",123],
               "dt":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
            },
            "sort": ["id"],
            "limit": 10,
            "with":"bi.cube"},
                  {"_target_database": "clickhouse"}),
   `SELECT sum(id) as "АХТУНГ", id as id
FROM (SELECT 1 from cube where
(toString(regions) ILIKE '%N%') AND (id = 123) AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or (toString(regions) ILIKE '%N%') AND (id = 123) AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or (id = 123) AND ((toString("date space") ILIKE '%А%') AND ("date space" IN ('2022-01-02', '2022-10-10', '2020-09-09'))))
GROUP BY id
ORDER BY id LIMIT 10`
               );
   });


   it('should eval KOOB SUBTOTALS ONE PLAIN ROW', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["type_oe_bi", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
         "subtotals": ["type_oe_bi"],
         "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":false},
         "filters":{"dt":["!=","2020-03","2020-04"],
         "pay_name":["!=","Не задано"]},
         "sort":["group_pay_name","v_main"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
`SELECT type_oe_bi, avg(v_rel_fzp), sum(v_rel_pp_i), GROUPING(type_oe_bi) AS "∑type_oe_bi"
FROM fot_out AS fot_out
WHERE (ch.fot_out.dt NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано')
GROUP BY GROUPING SETS ((type_oe_bi)
                       )
ORDER BY group_pay_name, v_main`
            );
      });


   it('should eval KOOB SUBTOTALS', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["dt", "all_contracts", "regions", "tru", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
         "subtotals": ["dt", "all_contracts", "regions", "tru"],
         "config": {"subtotalsMode":"!AllButOneInterleaved", "subtotalsTotal":true},
         "filters":{"dt":["!=","2020-03","2020-04"],
         "pay_name":["!=","Не задано"]},
         "sort":["all_contracts", "regions"],
         "with":"bi.cube"},
               {"_target_database": "clickhouse"}),
`SELECT DISTINCT (NOW() - INERVAL '1 DAY') as "dt", type_oe_bi as "type_oe_bi", region_name as "region_name", pay_name as "pay_name", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i), GROUPING((NOW() - INERVAL '1 DAY')) AS "∑dt", GROUPING(type_oe_bi) AS "∑type_oe_bi", GROUPING(region_name) AS "∑region_name", GROUPING(pay_name) AS "∑pay_name"
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS (((NOW() - INERVAL '1 DAY'), type_oe_bi, region_name, pay_name),
                        ((NOW() - INERVAL '1 DAY')),
                        ((NOW() - INERVAL '1 DAY'),type_oe_bi),
                        ((NOW() - INERVAL '1 DAY'),type_oe_bi,region_name),
                        ((NOW() - INERVAL '1 DAY'),type_oe_bi,region_name,pay_name),
                        ()
                       )
ORDER BY "group_pay_name", "v_main"`
            );
      });

});




