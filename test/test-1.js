var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKcubeColumns =  [
   {"id":"bi.cube.filters","sql_query":"filters","type":"STRING","config":{"possible_aggregations": []}},
   {"id":"bi.cube.id","sql_query":'"id"',"type":"NUMBER","config":{"possible_aggregations": []}},                                     
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


         it('should eval empty and()', function() {

            globalThis.MOCKCubeSQL = {
               "clickhouse-bi.cube":{
                  "query": `(SELECT 1 from cube
where \${filters(id:("bi"."cube"."id"))}
where \${filters(dt:("bi"."cube".'dt'))}
where \${filters(dt:(bi.cube.dt))}
where \${filters(id:(bi.cube.id))}
where \${filters(id:(bi1.cube.id))}
where \${filters(id:(cube.id))}
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
FROM (SELECT 1 from cube
where ("bi"."cube"."id" = 23000035)
where ("bi"."cube".'dt' BETWEEN 2019 AND 2022)
where (dt BETWEEN 2019 AND 2022)
where ("id" = 23000035)
where (bi1.cube.id = 23000035)
where (cube.id = 23000035)
`
                              );
                     });

