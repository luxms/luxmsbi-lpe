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
})




