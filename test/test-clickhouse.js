var assert = require('assert');
var lpe = require('../dist/lpe');


//             "pay_code":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
describe('KOOB Clickhouse tests', function() {

   it('should eval LIMIT', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{
            "group_pay_name":["ilike","%N%"],
            "pay_code":["and",["ilike","%А%"],["=","2022-01-02","2022-10-10","2020-09-09"]]
         },
         "sort": ["hcode_name"],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ <= 10`
            );
   });


   it('should eval filter(except())', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "sum(v_rel_pp):'АХТУНГ'",
                     'hcode_name'
                  ],
         "filters":{
            "pay_code":["and"]
         },
         "sort": ["hcode_name"],
         "limit": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `SELECT ROW_NUMBER() OVER (order by hcode_name) as "koob__row__num__", "АХТУНГ", "hcode_name" FROM (SELECT sum(v_rel_pp) as "АХТУНГ", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
GROUP BY hcode_name) koob__top__level__select__
ORDER BY hcode_name
QUALIFY koob__row__num__ <= 10`
            );
   });

});




