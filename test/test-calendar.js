var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};

describe('LPE tests', function() {
   
   it('should eval toStart/toEnd', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["toStart(dt,q):q", "toEnd(dt,q):e"],
         "filters":{//"toStart(dt,q)":["=","2020-03-01"],  ТАК НЕЛЬЗЯ :-()
                     "q":["=","2020-03-01"],
                     "e":["=","2021-03-01"],
                     },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT date_trunc('quarter', (NOW() - INTERVAL '1 DAY')) as q, date_trunc('quarter', (NOW() - INTERVAL '1 DAY')) + INTERVAL '3 MONTH - 1 DAY' as e
FROM fot_out AS fot_out
WHERE (date_trunc('quarter', (NOW() - INTERVAL '1 DAY')) = '2020-03-01') AND (date_trunc('quarter', (NOW() - INTERVAL '1 DAY')) + INTERVAL '3 MONTH - 1 DAY' = '2021-03-01')`
      )
   })

   it('should eval dateShift', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["dateShift(dt,1,w):w", "dateShift(dt,-3,'y'):y"],
         "filters":{//"toStart(dt,q)":["=","2020-03-01"],  ТАК НЕЛЬЗЯ :-()
                    "w":["=","2020-03-01"],
                    "y":["=","2021-03-01"],
                   },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT (NOW() - INTERVAL '1 DAY') + INTERVAL '1 WEEK' as w, (NOW() - INTERVAL '1 DAY') + INTERVAL '-3 YEAR' as y
FROM fot_out AS fot_out
WHERE ((NOW() - INTERVAL '1 DAY') + INTERVAL '1 WEEK' = '2020-03-01') AND ((NOW() - INTERVAL '1 DAY') + INTERVAL '-3 YEAR' = '2021-03-01')`
      )
   })

   it('should eval start/end & dateShift with constant dates', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["dateShift('2021-01-01',1,w):w", "dateShift('2022-01-01',-3,'y'):y", "toStart('2020-01-01',q):q", "toEnd('2020-01-01',q):e"],
         "filters":{//"toStart(dt,q)":["=","2020-03-01"],  ТАК НЕЛЬЗЯ :-()
                    "w":["=","2020-03-01"],
                    "y":["=","2021-03-01"],
                   },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT to_date('2021-01-01', 'YYYY-MM-DD') + INTERVAL '1 WEEK' as w, to_date('2022-01-01', 'YYYY-MM-DD') + INTERVAL '-3 YEAR' as y, date_trunc('quarter', to_date('2020-01-01', 'YYYY-MM-DD')) as q, date_trunc('quarter', to_date('2020-01-01', 'YYYY-MM-DD')) + INTERVAL '3 MONTH - 1 DAY' as e
FROM fot_out AS fot_out
WHERE (to_date('2021-01-01', 'YYYY-MM-DD') + INTERVAL '1 WEEK' = '2020-03-01') AND (to_date('2022-01-01', 'YYYY-MM-DD') + INTERVAL '-3 YEAR' = '2021-03-01')`
      )
   })

   it('should eval dateShift with diapazon', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["dateShift('2021-01-01',1,w):w", "dateShift('2022-01-01',-3,'y'):y", "toStart('2020-01-01',q):q", "toEnd('2020-01-01',q):e"],
         "filters":{//"toStart(dt,q)":["=","2020-03-01"],  ТАК НЕЛЬЗЯ :-()
                    "w":["=","2020-03-01"],
                    "y":["=","2021-03-01"],
                   },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT to_date('2021-01-01', 'YYYY-MM-DD') + INTERVAL '1 WEEK' as w, to_date('2022-01-01', 'YYYY-MM-DD') + INTERVAL '-3 YEAR' as y, date_trunc('quarter', to_date('2020-01-01', 'YYYY-MM-DD')) as q, date_trunc('quarter', to_date('2020-01-01', 'YYYY-MM-DD')) + INTERVAL '3 MONTH - 1 DAY' as e
FROM fot_out AS fot_out
WHERE (to_date('2021-01-01', 'YYYY-MM-DD') + INTERVAL '1 WEEK' = '2020-03-01') AND (to_date('2022-01-01', 'YYYY-MM-DD') + INTERVAL '-3 YEAR' = '2021-03-01')`
      )
   })

   it('should eval now', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["now():n"],
         "filters":{"n":["=","2020-03-01"],
                   },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT now() as n
FROM fot_out AS fot_out
WHERE (now() = '2020-03-01')`
      )
   })

   it('should eval today', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["today():t"],
         "filters":{"t":["=","2020-03-01"],
                   },
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CURRENT_DATE as t
FROM fot_out AS fot_out
WHERE (CURRENT_DATE = '2020-03-01')`
      )
   })

   it('should eval today in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["today():t"],
         "filters":{"t":["=","2020-03-01"],
                   },
         "with":"ch.fot_out"},
         {"_target_database": "clickhouse"}),
         `SELECT today() as t
FROM fot_out AS fot_out
WHERE (t = '2020-03-01')`
      )
   })

   it('should eval bound', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["bound('q')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT date_trunc('quarter', CURRENT_DATE),date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 MONTH - 1 DAY'
FROM fot_out AS fot_out`
      )
   })

   it('should eval bound with two arguments', function() {
      assert.equal( lpe.generate_koob_sql(
         {"columns":["bound('2023-10-15', 'm')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT date_trunc('month', to_date('2023-10-15', 'YYYY-MM-DD')),date_trunc('month', to_date('2023-10-15', 'YYYY-MM-DD')) + INTERVAL '1 MONTH - 1 DAY'
FROM fot_out AS fot_out`
      )
   })

   it('should eval extend with two arguments +offset', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["extend(1, 'm')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CURRENT_DATE,CURRENT_DATE + INTERVAL '1 MONTH'
FROM fot_out AS fot_out`
      )
   })

   it('should eval extend with two arguments -offset', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["extend(-1, 'm')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CURRENT_DATE,CURRENT_DATE + INTERVAL '-1 MONTH'
FROM fot_out AS fot_out`
      )
   })
   
   it('should eval extend with two arguments +offset quarter', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["extend(2, 'q')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CURRENT_DATE,CURRENT_DATE + INTERVAL '6 MONTH'
FROM fot_out AS fot_out`
      )
   })

   it('should eval extend with three arguments +offset', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["extend('2024-09-23', 1, 'm')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT to_date('2024-09-23', 'YYYY-MM-DD'),to_date('2024-09-23', 'YYYY-MM-DD') + INTERVAL '1 MONTH'
FROM fot_out AS fot_out`
      )
   })

   it('should eval extend with three arguments -offset', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["extend('2024-09-23', -1, 'm')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT to_date('2024-09-23', 'YYYY-MM-DD'),to_date('2024-09-23', 'YYYY-MM-DD') + INTERVAL '-1 MONTH'
FROM fot_out AS fot_out`
      )
   })

   it('should eval year in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["year('2023-01-01')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT year(toDate('2023-01-01'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval year in mysql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["year('2023-01-01')"],
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
         `SELECT year(STR_TO_DATE('2023-01-01', '%Y-%m-%d'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval year in postgresql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["year('2023-01-01')"],
         "with":"ch.fot_out"},
               {"_target_database": "postgresql"}),
         `SELECT CAST(EXTRACT(YEAR FROM to_date('2023-01-01', 'YYYY-MM-DD')) AS INT)
FROM fot_out AS fot_out`
      )
   })

   it('should eval hoty', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["hoty('2024-01-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT (CAST(EXTRACT(QUARTER FROM to_date('2024-01-26', 'YYYY-MM-DD')) AS INT)/3+1)
FROM fot_out AS fot_out`
      )
   })

   it('should eval hoty in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["hoty('2024-01-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT (intDiv(quarter(toDate('2024-01-26')),3)+1)
FROM fot_out AS fot_out`
      )
   })

   it('should eval hoty in mysql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["hoty('2024-01-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
         `SELECT (quarter(STR_TO_DATE('2024-01-26', '%Y-%m-%d')) DIV 3 + 1)
FROM fot_out AS fot_out`
      )
   })

   it('should eval qoty', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["qoty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CAST(EXTRACT(QUARTER FROM to_date('2024-04-26', 'YYYY-MM-DD')) AS INT)
FROM fot_out AS fot_out`
      )
   })

   it('should eval qoty in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["qoty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT quarter(toDate('2024-04-26'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval qoty in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["qoty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT DATEPART(QUARTER, CAST('2024-04-26' as date))
FROM fot_out AS fot_out`
      )
   })

   it('should eval moty', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["moty('2024-07-01')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CAST(EXTRACT(MONTH FROM to_date('2024-07-01', 'YYYY-MM-DD')) AS INT)
FROM fot_out AS fot_out`
      )
   })

   it('should eval moty in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["moty('2024-07-01')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT month(toDate('2024-07-01'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval moty in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["moty('2024-07-01')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT month(CAST('2024-07-01' as date))
FROM fot_out AS fot_out`
      )
   })

   it('should eval woty', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["woty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CAST(EXTRACT(WEEK FROM to_date('2024-04-26', 'YYYY-MM-DD')) AS INT)
FROM fot_out AS fot_out`
      )
   })

   it('should eval woty in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["woty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT week(toDate('2024-04-26'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval woty in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["woty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT DATEPART(WEEK, CAST('2024-04-26' as date))
FROM fot_out AS fot_out`
      )
   })

   it('should eval doty', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["doty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT CAST(EXTRACT(DOY FROM to_date('2024-04-26', 'YYYY-MM-DD')) AS INT)
FROM fot_out AS fot_out`
      )
   })

   it('should eval doty in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["doty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT toDayOfYear(toDate('2024-04-26'))
FROM fot_out AS fot_out`
      )
   })

   it('should eval doty in mysql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["doty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
         `SELECT CAST(DAYOFYEAR(STR_TO_DATE('2024-04-26', '%Y-%m-%d')) AS UNSIGNED)
FROM fot_out AS fot_out`
      )
   })

   it('should eval doty in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["doty('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT DATENAME(dayofyear, CAST('2024-04-26' as date))
FROM fot_out AS fot_out`
      )
   })

   it('should eval isoy', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isoy('2024-04-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT TO_CHAR(to_date('2024-04-26', 'YYYY-MM-DD'), 'YYYY')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isoy in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isoy('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT formatDateTime(toDate('2024-04-26'), '%Y')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isoy in mysql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isoy('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
         `SELECT DATE_FORMAT(STR_TO_DATE('2024-04-26', '%Y-%m-%d'), '%Y')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isoy in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isoy('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT FORMAT(CAST('2024-04-26' as date), 'yyyy')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isom', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isom('2024-04-26')"],
         "with":"ch.fot_out"},
               {"key":null}),
         `SELECT TO_CHAR(to_date('2024-04-26', 'YYYY-MM-DD'), 'YYYY-MM')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isom in clickhouse', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isom('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "clickhouse"}),
         `SELECT formatDateTime(toDate('2024-04-26'), '%Y-%m')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isom in mysql', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isom('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "mysql"}),
         `SELECT DATE_FORMAT(STR_TO_DATE('2024-04-26', '%Y-%m-%d'), '%Y-%m')
FROM fot_out AS fot_out`
      )
   })

   it('should eval isom in sqlserver', function() {
      assert.equal(lpe.generate_koob_sql(
         {"columns":["isom('2024-04-26')"],
         "with":"ch.fot_out"},
               {"_target_database": "sqlserver"}),
         `SELECT FORMAT(CAST('2024-04-26' as date), 'yyyy-MM')
FROM fot_out AS fot_out`
      )
   })
})




