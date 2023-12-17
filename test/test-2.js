var assert = require('assert');
var lpe = require('../dist/lpe');

globalThis.MOCKCubeSQL = {};


describe('LPE tests', function() {

      it('should eval geo filters clickhouse', function() {
          assert.equal( lpe.generate_koob_sql(
             {"columns":[
                         "concat(toString(v_rel_pp), '*', v_rel_pp, hcode_name ):v_rel_pp",
                         "toString(group_pay_name)", 
                         'hcode_name'
                      ],
             "filters":{
                  "hcode_name": ["between", "2019-01-01", "2020-03-01"],
                  "(lat,lng)": ["pointInPolygon",  ["[",["tuple",0,0],["tuple",0,1],["tuple",1,0],["tuple",1,1]]],
                  "": ["or", ["=",1,["pointInEllipses", 0,0, 0,0,1,1]], ["=", ["pointInPolygon",["tuple", "lat", "lng"], ["[",["tuple",0,0],["tuple",0,1],["tuple",1,0],["tuple",1,1]]], 1]]
              },
             "sort":["perda","-lead"],
             "limit": 100,
             "offset": 10,
             "with":"ch.fot_out"},
                   {"_target_database": "clickhouse"}),
       `SELECT concat(toString(v_rel_pp),'*',v_rel_pp,hcode_name) as v_rel_pp, toString(group_pay_name) as group_pay_name, hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND (pointInPolygon((lat,lng), [tuple(0,0),tuple(0,1),tuple(1,0),tuple(1,1)])) AND ((1 = pointInEllipses(0,0,0,0,1,1)) OR (pointInPolygon(tuple(lat,lng), [tuple(0,0),tuple(0,1),tuple(1,0),tuple(1,1)]) = 1))
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10`
                );
       
         });




});




