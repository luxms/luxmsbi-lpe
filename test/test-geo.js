var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE GEO', function() {
    it('should eval geo filters clickhouse', function() {
        assert.equal( lpe.generate_koob_sql(
           {"columns":[
                       "concat(toString(v_rel_pp), '*', v_rel_pp, hcode_name ):v_rel_pp",
                       "toString(group_pay_name)", 
                       'hcode_name'
                    ],
           "filters":{
                "hcode_name": ["between", "2019-01-01", "2020-03-01"],
                "": ["or", ["=",1,["pointInEllipses", 0,0, 0,0,1,1]], ["=", ["pointInPolygon",["tuple", "lat", "lng"], ["[",["tuple",0,0],["tuple",0,1],["tuple",1,0],["tuple",1,1]]], 1]]
            },
           "sort":["perda","-lead"],
           "limit": 100,
           "offset": 10,
           "with":"ch.fot_out"},
                 {"_target_database": "clickhouse"}),
     `SELECT concat(toString(v_rel_pp),'*',v_rel_pp,hcode_name) as v_rel_pp, toString(group_pay_name), hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND ((1 = pointInEllipses(0,0,0,0,1,1)) OR (pointInPolygon(tuple(lat,lng), [tuple(0,0),tuple(0,1),tuple(1,0),tuple(1,1)]) = 1))
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10
SETTINGS max_threads = 1`
              );
     
       });




       it('should eval geo filters postgresql', function() {
        assert.equal( lpe.generate_koob_sql(
           {"columns":[
                       "concat(toString(v_rel_pp), '*', v_rel_pp, hcode_name ):v_rel_pp",
                       "toString(group_pay_name)", 
                       'hcode_name'
                    ],
           "filters":{
                "hcode_name": ["between", "2019-01-01", "2020-03-01"],
                "": ["or", ["=",true,["pointInCircle", 0,0, 0,0,1]], ["=", ["pointInPolygon",["tuple", "lat", "lng"], ["[",["tuple",0,0],["tuple",0,1],["tuple",1,0],["tuple",1,1]]], true]]
            },
           "sort":["perda","-lead"],
           "limit": 100,
           "offset": 10,
           "with":"ch.fot_out"},
                 {"_target_database": "postgresql"}),
     `SELECT concat(v_rel_pp::TEXT,'*',v_rel_pp,hcode_name) as v_rel_pp, group_pay_name::TEXT, hcode_name as hcode_name
FROM fot_out AS fot_out
WHERE (hcode_name BETWEEN '2019-01-01' AND '2020-03-01') AND ((true = circle(point(0,0),1) @> point(0,0)) OR (polygon '((0,0),(0,1),(1,0),(1,1))' @> point(lat,lng) = true))
ORDER BY perda, lead DESC LIMIT 100 OFFSET 10`
              );
     
       });

});




