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
   `SELECT sum(id) as "АХТУНГ", id
FROM (SELECT 1 from cube where
(toString(regions) ILIKE '%N%') AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or (toString(regions) ILIKE '%N%') AND ((toString(dt) ILIKE '%А%') AND (dt IN ('2022-01-02', '2022-10-10', '2020-09-09')))
or 1=1)
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
   `SELECT sum(id) as "АХТУНГ", id
FROM (SELECT 1 from cube where
(1=1)
or (1=1)
or 1=1)
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
         `SELECT regions
FROM (SELECT 1 from cube where
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035)
where 1=1 and status_nm = 'Закрыт'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where 1=1
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where (dt BETWEEN 2019 AND 2022) AND (id = 23000035) and status_nm != 'Проект'
where 1=1
`
                  );
         });



         it('should eval mssql_sp_args()', function() {

            globalThis.MOCKCubeSQL = {
               "clickhouse-bi.cube":{
                  "query": `(SELECT 1 from cube
where \${mssql_sp_args(dir, ql(ql(regions)), id, id, dt, ql(ql(d)))}
where \${mssql_sp_args(dir, ql(regions), id, ql(id), dt, dt)}
where \${mssql_sp_args(dir, ql(regions.1), id, ql(id), dt, dt)}`, 
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
                     {"_target_database": "clickhouse"}),
            `SELECT regions
FROM (SELECT 1 from cube
where @dir = ''Moscow@piter@tumen'', @id = 23000035
where @dir = 'Moscow@piter@tumen', @id = '23000035'
where @dir = 'Moscow', @id = '23000035'`
                              );
                     });



});




