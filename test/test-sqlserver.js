var assert = require('assert');
var lpe = require('../dist/lpe');



describe('MS SQL KOOB tests', function() {

   it('should eval LIMIT', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`
            );
   });

   it('should eval OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
OFFSET 10 ROWS`
            );
   });


   it('should eval LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "sort": ["hcode_name"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY hcode_name
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
            );
   });


   it('should eval LIMIT OFFSET without sort', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{},
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY 1
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
            );
   });

   it('should eval range() LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name',
                     'range(2):rng'
                  ],
         "filters":{"hcode_name":["!=", null]},
         "sort": ["hcode_name"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name, koob__range__ as rng
FROM fot_out AS fot_out,(
      select koob__range__ FROM (VALUES (0), (1)) vals(koob__range__)
      ) as koob__range__table__
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__
ORDER BY hcode_name
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
            );
   });


   it('should eval range(x,y,z) LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name',
                     'range(1,10,2):rng'
                  ],
         "filters":{"hcode_name":["!=", null]},
         "sort": ["hcode_name","rng"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name, koob__range__ as rng
FROM fot_out AS fot_out,(
      select koob__range__ FROM (VALUES (1), (3), (5), (7), (9)) vals(koob__range__)
      ) as koob__range__table__
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__
ORDER BY hcode_name, rng
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
            );
   });


   it('should eval range(x,y,z) LIMIT OFFSET no alias', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name',
                     'range(1,10,2)'
                  ],
         "filters":{"hcode_name":["!=", null]},
         "sort": ["hcode_name","koob__range__"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name, koob__range__
FROM fot_out AS fot_out,(
      select koob__range__ FROM (VALUES (1), (3), (5), (7), (9)) vals(koob__range__)
      ) as koob__range__table__
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__
ORDER BY hcode_name, koob__range__
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
            );
   });


it('should eval KOOB ILIKE', function() {
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
            {"_target_database": "sqlserver"}),
   `SELECT sum(v_rel_pp) as v_rel_pp, group_pay_name as group_pay_name, hcode_name as hcode_name, CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (UPPER(pay_code) LIKE UPPER('Муж'))) AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name
ORDER BY perda, lead DESC, newid() DESC, newid()
OFFSET 10 ROWS FETCH NEXT 100 ROWS ONLY`
         );
   
      });


   
      it('should eval range() LIMIT OFFSET and RLS', function() {
         assert.equal( lpe.generate_koob_sql(
            {"columns":[
                        "sum(v_rel_pp):'АХТУНГ'",
                        'hcode_name',
                        'range(2):rng'
                     ],
            "filters":{"hcode_name":["!="]},
            "sort": ["hcode_name"],
            "limit": 5,
            "offset": 10,
            "with":"ch.fot_out"},
                  {"_target_database": "sqlserver","_access_filters":["expr",["=","REG_NAME",["'","кв. Маяковского - В. Посад"]]]}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as hcode_name, koob__range__ as rng
FROM fot_out AS fot_out,(
      select koob__range__ FROM (VALUES (0), (1)) vals(koob__range__)
      ) as koob__range__table__
WHERE ((1=1) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   (REG_NAME = 'кв. Маяковского - В. Посад')
GROUP BY hcode_name, koob__range__
ORDER BY hcode_name
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`
               );
      });


   it('should eval KOOB COUNT', function() {
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
            "sort1":["perda","-lead","-rand()","rand()"],
            "limit1": 100,
            "offset1": 10,
            "return": "count",
            "with":"ch.fot_out"},
                  {"_target_database": "sqlserver"}),
         `select count(300) as "count" from (SELECT sum(v_rel_pp) as v_rel_pp, group_pay_name as group_pay_name, hcode_name as hcode_name, CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (UPPER(pay_code) LIKE UPPER('Муж'))) AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name) koob__count__src__`
               );
         
            });

      it('should eval udf_args()', function() {
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
               "sqlserver-bi.cube":{
                  "query": `(SELECT 1 from cube
where \${udf_args(dir, regions, id, id, dt, ql(dt))}
where \${udf_args(dir, ql(regions), id, ql(id), dt, dt)}
where \${udf_args(dir, ql(regions.1), id, ql(id), dt, dt)}
where func_call(\${udf_args('', ql(regions))})`,
                  "config": {"is_template": 1,"skip_where": 1}}}
            
            assert.equal( lpe.generate_koob_sql(
               {"columns":[
                           "regions"
                        ],
               "filters":{
                  "dt":["=",2019,2022],
                  "id":["=",23000035],
                  "regions":["=","Moscow","piter","tumen"]
               },
               "with":"bi.cube"},
                     {"_target_database": "sqlserver"}),
            `SELECT regions as regions
FROM (SELECT 1 from cube
where @dir = 'Moscow@piter@tumen', @id = 23000035, @dt = '2019@2022'
where @dir = 'Moscow@piter@tumen', @id = '23000035', @dt = '2019@2022'
where @dir = 'Moscow', @id = '23000035', @dt = '2019@2022'
where func_call('Moscow@piter@tumen')`
                              );

            globalThis.MOCKCubeSQL = {
               "postgresql-bi.cube":{
                  "query": `(SELECT 1 from cube
where \${udf_args(dir, ql(regions), id, id, dt, ql(d))}
where \${udf_args(dir, ql(regions), id, ql(id), dt, dt)}
where \${udf_args(dir, ql(regions.1), id, ql(id), dt, dt)}
where \${udf_args(dir, regions, id, ql(id), dt, ql(dt))}
where \${udf_args(dir, regions.1, id, ql(id), dt, dt)}
where func_call(\${udf_args('', ql(regions))})`,
                  "config": {"is_template": 1,"skip_where": 1}}}

            assert.equal( lpe.generate_koob_sql(
               {"columns":[
                           "regions"
                        ],
               "filters":{
                  "dt":["=",2019,2022],
                  "id":["=",23000035],
                  "regions":["=","Moscow","piter","tumen"]
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
where func_call($lpe_array_quot$["Moscow","piter","tumen"]$lpe_array_quot$)`
                              );




            globalThis.MOCKCubeSQL = {
               "sap-bi.cube":{
                  "query": `(SELECT 1 from cube
where \${udf_args(dir, ql(regions), id, id, dt, ql(d))}
where \${udf_args(dir, ql(regions), id, ql(id), dt, dt)}
where \${udf_args(dir, ql(regions.1), id, ql(id), dt, dt)}
where \${udf_args(dir, regions, id, ql(id), dt, ql(dt))}
where \${udf_args(dir, regions.1, id, ql(id), dt, dt)}`,
                  "config": {"is_template": 1,"skip_where": 1}}}

            assert.equal( lpe.generate_koob_sql(
               {"columns":[
                           "regions"
                        ],
               "filters":{
                  "dt":["=",2019,2022],
                  "id":["=",23000035],
                  "regions":["=","Moscow","piter","tumen"]
               },
               "with":"bi.cube"},
                     {"_target_database": "sap"}),
            `SELECT regions as "regions"
FROM (SELECT 1 from cube
where 'PLACEHOLDER' = ('$$dir$$', '''Moscow'',''piter'',''tumen'''), 'PLACEHOLDER' = ('$$id$$', 23000035)
where 'PLACEHOLDER' = ('$$dir$$', '''Moscow'',''piter'',''tumen'''), 'PLACEHOLDER' = ('$$id$$', '23000035'), 'PLACEHOLDER' = ('$$dt$$', '2019,2022')
where 'PLACEHOLDER' = ('$$dir$$', 'Moscow'), 'PLACEHOLDER' = ('$$id$$', '23000035'), 'PLACEHOLDER' = ('$$dt$$', '2019,2022')
where 'PLACEHOLDER' = ('$$dir$$', 'Moscow,piter,tumen'), 'PLACEHOLDER' = ('$$id$$', '23000035'), 'PLACEHOLDER' = ('$$dt$$', '''2019'',''2022''')
where 'PLACEHOLDER' = ('$$dir$$', Moscow), 'PLACEHOLDER' = ('$$id$$', '23000035'), 'PLACEHOLDER' = ('$$dt$$', '2019,2022')`
                              );
                     });

});




