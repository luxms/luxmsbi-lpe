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
         `select count(300) as count from (SELECT sum(v_rel_pp) as v_rel_pp, group_pay_name as group_pay_name, hcode_name as hcode_name, CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE sum(pay_code) / sum(v_rel_pp) END as d
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (UPPER(pay_code) LIKE UPPER('Муж'))) AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name) koob__count__src__`
               );
         
            });

});




