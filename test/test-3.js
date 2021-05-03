var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    it ('should make JOINS', function() {
        // pluck&&filterit
        assert.equal( lpe.eval_sql_where(
            'where ( loc_id in ($(locations.filterit(it.is_hidden != 0).pluck(id))) )',
            {"locations":[{"is_hidden":0,"id":2324342},{"id":9890798,"is_hidden":1}], "period": {"title":"Noyabr","id":2131}}),
            "WHERE loc_id in (9890798)" 
        );

    });

})