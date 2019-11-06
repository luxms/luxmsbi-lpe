var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    
 
    it ('should make JOINS', function() {
      
      assert.equal( lpe.generate_report_sql(
         {"columns": [
            {"id": "luxmsbi.locations.id", "group": "locations", "title": "id"}, 
            {"id": "luxmsbi.locations.title", "group": "locations", "title": "title"},
            {"id": "luxmsbi.units.id", "group": "locations", "title": "id"}
            ], 
         "filters": []}
         ,
        {}),
        `SELECT "locations"."id","locations"."title","units"."id" FROM locations AS locations, units AS units WHERE TRUE`
        );

    });

 


    
});




