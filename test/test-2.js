var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};


describe('LPE tests', function() {
    globalThis.MOCKcubeColumns =  [
        {"id":"bi.cube.filters","sql_query":"filters","type":"STRING","config":{"possible_aggregations": []}},
        {"id":"bi.cube.id","sql_query":"id","type":"NUMBER","config":{"possible_aggregations": []}},
        {"id":"bi.cube.type","sql_query":"type","type":"STRING","config":{"possible_aggregations": []}},                             
        {"id":"bi.cube.if","sql_query":"if","type":"STRING","config":{"possible_aggregations": []}},                             
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
        



    it('should eval udf_args()', function() {
    globalThis.MOCKCubeSQL = {
        "postgresql-bi.cube":{
           "query": `(SELECT 1 from cube
where \${udf_args('', ql(regions), id, id, dt, ql(d))}
where \${udf_args(dir, ql(regions), id, ql(id), dt, dt)}
where \${udf_args(dir, ql(regions.1), id, ql(id), dt, dt)}
where \${udf_args(dir, regions, id, ql(id), dt, ql(dt))}
where \${udf_args(dir, regions.1, id, ql(id), dt, dt)}
where func_call(\${udf_args('', ql(regions))})
where func_call(\${udf_args('', ql(koob_filters()))})`,
           "config": {"is_template": 1,"skip_where": 1}}}

     assert.equal( lpe.generate_koob_sql(
        {"columns":[
                    "regions",
                    "median(id)"
                 ],
        "filters":{
           "dt":["=",2019,2022],
           "id":["=",23000035],
           "regions":["=","Moscow","piter","tumen"],
           "":["|||",{"asd":123}]
        },
        "with":"bi.cube"},
              {"_target_database": "postgresql"}),
     `SELECT regions as regions
FROM (SELECT 1 from cube
where $lpe_array_quot$["Moscow","piter","tumen"]$lpe_array_quot$, 23000035
where $lpe_array_quot$["Moscow","piter","tumen"]$lpe_array_quot$, '23000035', $lpe_array_quot$[2019,2022]$lpe_array_quot$
where 'Moscow', '23000035', $lpe_array_quot$[2019,2022]$lpe_array_quot$
where $lpe_array_quot$["Moscow","piter","tumen"]$lpe_array_quot$, '23000035', $lpe_array_quot$[2019,2022]$lpe_array_quot$
where Moscow, '23000035', $lpe_array_quot$[2019,2022]$lpe_array_quot$
where func_call($lpe_array_quot$["Moscow","piter","tumen"]$lpe_array_quot$)
where func_call('{"bi.cube.dt":["=",2019,2022],"bi.cube.id":["=",23000035],"bi.cube.regions":["=","Moscow","piter","tumen"],"":["|||",{"asd":123}]}')`
                       );


    })

});




