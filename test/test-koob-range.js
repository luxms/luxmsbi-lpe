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
   "postgresql-bi.cube":{
      "query": `(SELECT filters, id, dt, org_fullname_nm, org_shortname_nm from cube) AS tbl`,
      "config": {"is_template": 0,"skip_where": 0}}}


//             "pay_code":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
describe('KOOB range templates', function() {

   it('should eval range() LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(dt):'АХТУНГ'",
                     'org_fullname_nm',
                     'range(2):rng'
                  ],
         "filters":{"org_shortname_nm":["!=", null]},
         "sort": ["org_shortname_nm"],
         "limit": 5,
         "offset": 10,
         "with":"bi.cube"},
               {"_target_database": "postgresql"}),
   `SELECT sum(dt) as "АХТУНГ", org_fullname_nm as org_fullname_nm, koob__range__ as rng
FROM (SELECT filters, id, dt, org_fullname_nm, org_shortname_nm from cube) AS tbl,generate_series(0, 2-1) as koob__range__
WHERE (org_shortname_nm IS NOT NULL)
GROUP BY org_fullname_nm, koob__range__
ORDER BY org_shortname_nm LIMIT 5 OFFSET 10`
            );



      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(dt):'АХТУНГ'",
                     'org_fullname_nm',
                     'range(2):rng',
                  ],
         "filters":{"org_shortname_nm":["!=", null]},
         "sort": ["org_shortname_nm"],
         "subtotals": ["org_fullname_nm"],
         "limit": 5,
         "offset": 10,
         "with":"bi.cube"},
               {"_target_database": "postgresql"}),
   `SELECT sum(dt) as "АХТУНГ", org_fullname_nm as org_fullname_nm, koob__range__ as rng, GROUPING(org_fullname_nm) AS "∑org_fullname_nm", GROUPING(koob__range__) AS "∑rng"
FROM (SELECT filters, id, dt, org_fullname_nm, org_shortname_nm from cube) AS tbl,generate_series(0, 2-1) as koob__range__
WHERE (org_shortname_nm IS NOT NULL)
GROUP BY GROUPING SETS ((org_fullname_nm, koob__range__)
                       ,(org_fullname_nm)
                       )
ORDER BY org_shortname_nm LIMIT 5 OFFSET 10`
            );

/*  в тесте выше можно было бы добавить HAVING "∑rng" != 1
так как range нет в subtotals но есть в group by, и в group by он идёт последним
#1248
*/
   assert.equal( lpe.generate_koob_sql(
      {"columns":[
                  "tru",
                  "sum(dt):'АХТУНГ'",
                  'org_fullname_nm',
                  'range(2):rng',
                  'org_shortname_nm'
               ],
      "filters":{"org_shortname_nm":["!=", null]},
      "sort": ["org_shortname_nm"],
      "subtotals": ["org_fullname_nm","rng","org_shortname_nm"],
      "limit": 5,
      "offset": 10,
      "with":"bi.cube"},
            {"_target_database": "postgresql"}),
`SELECT tru as tru, sum(dt) as "АХТУНГ", org_fullname_nm as org_fullname_nm, koob__range__ as rng, org_shortname_nm as org_shortname_nm, GROUPING(tru) AS "∑tru", GROUPING(org_fullname_nm) AS "∑org_fullname_nm", GROUPING(koob__range__) AS "∑rng", GROUPING(org_shortname_nm) AS "∑org_shortname_nm"
FROM (SELECT filters, id, dt, org_fullname_nm, org_shortname_nm from cube) AS tbl,generate_series(0, 2-1) as koob__range__
WHERE (org_shortname_nm IS NOT NULL)
GROUP BY GROUPING SETS ((tru, org_fullname_nm, koob__range__, org_shortname_nm)
                       ,(org_fullname_nm),
                        (org_fullname_nm,koob__range__),
                        (org_fullname_nm,koob__range__,org_shortname_nm)
                       )
HAVING GROUPING(koob__range__) != 1
ORDER BY org_shortname_nm LIMIT 5 OFFSET 10`
         );


assert.equal( lpe.generate_koob_sql(
   {"columns":[
               "tru",
               "sum(dt):'АХТУНГ'",
               'org_fullname_nm',
               'range(2):rng',
               'org_shortname_nm'
            ],
   "filters":{"org_shortname_nm":["!=", null]},
   "sort": ["org_shortname_nm"],
   "subtotals": ["org_fullname_nm","rng","org_shortname_nm"],
   "limit": 5,
   "offset": 10,
   "with":"bi.cube"},
         {"_target_database": "clickhouse"}),
`SELECT tru as tru, sum(dt) as "АХТУНГ", org_fullname_nm as org_fullname_nm, arrayJoin(range(2)) as rng, org_shortname_nm as org_shortname_nm, GROUPING(tru) AS "∑tru", GROUPING(org_fullname_nm) AS "∑org_fullname_nm", GROUPING(arrayJoin(range(2))) AS "∑rng", GROUPING(org_shortname_nm) AS "∑org_shortname_nm"
FROM cube AS cube
WHERE (cube.org_shortname_nm IS NOT NULL)
GROUP BY GROUPING SETS ((tru, org_fullname_nm, rng, org_shortname_nm)
                       ,(org_fullname_nm),
                        (org_fullname_nm,rng),
                        (org_fullname_nm,rng,org_shortname_nm)
                       )
HAVING "∑rng" != 1
ORDER BY org_shortname_nm LIMIT 5 OFFSET 10`
      );
});

/* FIXME:

      + expected - actual

       SELECT sum(dt) as "АХТУНГ", org_fullname_nm as org_fullname_nm, koob__range__ as rng, GROUPING(org_fullname_nm) AS "∑org_fullname_nm", GROUPING(koob__range__) AS "∑rng"
       FROM (SELECT filters, id, dt, org_fullname_nm, org_shortname_nm from cube) AS tbl,generate_series(0, 2-1) as koob__range__
       WHERE (org_shortname_nm IS NOT NULL)
       GROUP BY GROUPING SETS ((org_fullname_nm, koob__range__),
      -                        (koob__range__,org_fullname_nm)
      +                        (koob__range__)

*/





});




