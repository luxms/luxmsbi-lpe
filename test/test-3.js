var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE KOOB tests', function() {



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


   it('should eval KOOB only1 Oracle  LIMIT OFFSET', function() {
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
               {"_target_database": "oracle"}),
   `/*ON1Y*/SELECT toString(v_rel_pp) as "v_rel_pp", sum(group_pay_name) as "group_pay_name", v_rel_pp111, hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL) AND ROWNUM > 100 AND ROWNUM <= 10 + 100
ORDER BY perda, lead DESC`
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
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
         "short_tp IN ('ГКБ!','КГБ') and y > '2021'"
         )
   });


   it('should eval KOOB filters with except (koob lookup)', function() {
      assert.equal( lpe.eval_sql_where(
         "filters( except(y), short_tp:tp, y:year )",
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["!=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["!=","ГКБ!","КГБ"],"y":[">",2021]}}}),
         "tp NOT IN ('ГКБ!','КГБ')"
         )
   });

   it('should do correct WHERE with empty conditions', function() {
      assert.equal( lpe.eval_sql_where(
         "filters( notexists )",
         {"_quoting":"explicit" ,"version":"2.0","row":{"short_tp":["=","ГКБ","КГБ"],"y":["=",2021]},"limit":100,"offset":0,"context":{"attachment_id":5,"row":{"$measures":["=","m1"],"short_tp":["=","ГКБ!","КГБ"],"y":[">",2021]}}}),
         "1=1"
         )
   });

   it('should eval KOOB var_pop', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":[
                     "only1(toString(v_rel_pp)):v_rel_pp",
                     "median(group_pay_name)",
                     "var_pop(group_pay_name)",
                     "var_samp(group_pay_name)",
                     "stddev_samp(group_pay_name)",
                     "stddev_pop(group_pay_name)",
                     "only1(v_rel_pp111)",
                     "-1*sum(group_pay_name)",
                     'hcode_name'
                  ],
         "filters":{"hcode_name": ["between", "2019-01-01", "2020-03-01"], "perda": [">",2]},
         "sort":["perda","-lead"],
         "limit": 100,
         "offset": 10,
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
   `/*ON1Y*/SELECT toString(v_rel_pp) as "v_rel_pp", quantile(0.5)(group_pay_name) as "group_pay_name", varPop(group_pay_name) as "group_pay_name", varSamp(group_pay_name) as "group_pay_name", stddevSamp(group_pay_name) as "group_pay_name", stddevPop(group_pay_name) as "group_pay_name", v_rel_pp111, -1 * sum(group_pay_name) as "group_pay_name", hcode_name as "hcode_name"
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (perda > 2) AND (group_pay_name = 'Не задано') AND (pay_code = 'Не задано') AND (pay_name = 'Не задано') AND (sex_code IS NULL)
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10
SETTINGS max_threads = 1`
            )
   });


   it('should eval KOOB SUBTOTALS', function() {

      assert.equal( lpe.generate_koob_sql(
         {"columns":["group_pay_name", "type_oe_bi", "region_name", "pay_name", "avg(v_rel_fzp)","sum(v_rel_pp_i)"],
         "subtotals": ["group_pay_name", "type_oe_bi", "region_name"],
         "filters":{"dt":["!=","2020-03","2020-04"],
         "pay_name":["!=","Не задано"]},
         "sort":["group_pay_name","v_main"],
         "with":"ch.fot_out"},
               {"_target_database": "postgresql"}),
`SELECT group_pay_name as "group_pay_name", type_oe_bi as "type_oe_bi", region_name as "region_name", pay_name as "pay_name", avg(v_rel_fzp) as "v_rel_fzp", sum(v_rel_pp_i)
FROM fot_out AS fot_out
WHERE ((NOW() - INERVAL '1 DAY') NOT IN ('2020-03', '2020-04')) AND (pay_name != 'Не задано') AND (pay_code != 'Не задано') AND (sex_code IS NULL)
GROUP BY GROUPING SETS ((group_pay_name, type_oe_bi, region_name, pay_name),
                        (type_oe_bi, region_name, pay_name),
                        (group_pay_name, region_name, pay_name),
                        (group_pay_name, type_oe_bi, pay_name)
                       )
ORDER BY group_pay_name, v_main`
            );
      });

      it('should eval array join', function() {
         assert.equal( lpe.eval_sql_where(
            "where(l.id ~ $(locations.join('|')))",
            {"_target_database": "oracle", "context": null, "locations": [1234,3456]}),
            "WHERE REGEXP_LIKE( l.id , '1234|3456' )"
        )
      });
})