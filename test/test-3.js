var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

   it('should eval KOOB only1', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "only1(toString(v_rel_pp)):v_rel_pp",
                     "sum(group_pay_name)",
                     "only1(v_rel_pp111)",
                     'hcode_name'
                  ],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"]},
         "sort":["perda","-lead"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `/*ON1Y*/SELECT toString(v_rel_pp) as "v_rel_pp", sum(group_pay_name) as "group_pay_name", v_rel_pp111, hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10
SETTINGS max_threads = 1`
            );
   });

   it('should eval KOOB cond (koob lookup)', function() {
      assert.equal( lpe.eval_sql_where(
         "filter( cond(year_start <= $(row.y), []) and cond(short_tp = $(row.short_tp), []) and cond(short_tp = ql($(row.short_tp)) or col != '$(row.short_tp)' && version = ql($(version)), []) )",
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"short_tp":["=","ГКБ"],"y":["=",2021]}}}),
         "year_start <= 2021 and short_tp = ГКБ and short_tp = 'ГКБ' or col != 'ГКБ' and version = '2.0'"
         )
   });

   it('should eval KOOB filters (koob lookup)', function() {
      assert.equal( lpe.eval_sql_where(
         "filters( )",
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
         "short_tp IN ('ГКБ!','КГБ') and y > '2021'"
         )
   });


})