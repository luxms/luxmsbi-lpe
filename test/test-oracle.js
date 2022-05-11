var assert = require('assert');
var lpe = require('../dist/lpe');



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
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM <= 10
GROUP BY hcode_name
ORDER BY hcode_name`
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
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM > 10
GROUP BY hcode_name
ORDER BY hcode_name`
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
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM > 10 AND ROWNUM <= (10 + 5)
GROUP BY hcode_name
ORDER BY hcode_name`
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
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", __koob__range__ as "rng"
FROM fot_out AS fot_out,(
      select LEVEL AS __koob__range__ from dual
      where LEVEL between 1 and 2
      connect by LEVEL <= 2
      )
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM > 10 AND ROWNUM <= (10 + 5)
GROUP BY hcode_name, __koob__range__
ORDER BY hcode_name`
            );
   });


   it('should eval range() LIMIT OFFSET', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name',
                     'range(1,10,2):rng'
                  ],
         "filters":{"hcode_name":["!=", null]},
         "sort": ["hcode_name"],
         "limit": 5,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "oracle"}),
   `SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name", __koob__range__ as "rng"
FROM fot_out AS fot_out,(
      select LEVEL AS __koob__range__ from dual
      where LEVEL between 1 and 10 and MOD(LEVEL, 2) = 0
      connect by LEVEL <= 10
      )
WHERE (hcode_name IS NOT NULL) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM > 10 AND ROWNUM <= (10 + 5)
GROUP BY hcode_name, __koob__range__
ORDER BY hcode_name`
            );
   });

});




