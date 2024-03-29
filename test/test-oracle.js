var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

describe('Oracle KOOB tests', function() {

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
               {"_target_database": "oracle"}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY "hcode_name") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" <= 10`
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
               {"_target_database": "oracle"}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY "hcode_name") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" > 10`
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
               {"_target_database": "oracle"}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name
ORDER BY "hcode_name") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" > 10 AND "koob__row__num__" <= (10 + 5)`
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
               {"_target_database": "oracle"}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", koob__range__ as "rng"
FROM fot_out fot_out,(
      select LEVEL-1 AS koob__range__ from dual
      where LEVEL between 0+1 and 2
      connect by LEVEL <= 2
      )
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__
ORDER BY "hcode_name") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" > 10 AND "koob__row__num__" <= (10 + 5)`
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
               {"_target_database": "oracle"}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", koob__range__ as "rng"
FROM fot_out fot_out,(
      select LEVEL-1 AS koob__range__ from dual
      where LEVEL between 1+1 and 10 and MOD(LEVEL, 2) = 0
      connect by LEVEL <= 10
      )
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name, koob__range__
ORDER BY "hcode_name", "rng") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" > 10 AND "koob__row__num__" <= (10 + 5)`
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
      "with":"ch.fot_out"},
            {"_target_database": "oracle"}),
   `SELECT sum(v_rel_pp) as "v_rel_pp", group_pay_name as "group_pay_name", hcode_name as "hcode_name", CASE WHEN sum(v_rel_pp) = 0 THEN 0 ELSE CAST(sum(pay_code) AS FLOAT) / sum(v_rel_pp) END as "d"
FROM fot_out fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (1=0) AND (1=1) AND ((1=1) OR (UPPER(pay_code) LIKE UPPER('Муж'))) AND (sex_code IS NULL)
GROUP BY group_pay_name, hcode_name
ORDER BY "perda", "lead" DESC, dbms_random.value() DESC, dbms_random.value()`
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
                  {"_target_database": "oracle","_access_filters":["expr",["=","REG_NAME",["'","кв. Маяковского - В. Посад"]]]}),
   `SELECT * FROM (SELECT koob__inner__select__.*, ROWNUM AS "koob__row__num__" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", koob__range__ as "rng"
FROM fot_out fot_out,(
      select LEVEL-1 AS koob__range__ from dual
      where LEVEL between 0+1 and 2
      connect by LEVEL <= 2
      )
WHERE ((1=1) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL))
   AND
   (REG_NAME = 'кв. Маяковского - В. Посад')
GROUP BY hcode_name, koob__range__
ORDER BY "hcode_name") koob__inner__select__) koob__top__level__select__
WHERE "koob__row__num__" > 10 AND "koob__row__num__" <= (10 + 5)`
               );
      });

});




