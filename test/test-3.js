var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    it('KOOB corect brackets', function() {
        assert.equal( lpe.generate_koob_sql(
           {"columns":["v_rel_pp_i / (100 * (v_main + 1))", "sum((v_main+v_rel_pp_i)/100)"],
           "with":"ch.fot_out"},
                 {"key":null}),
     `SELECT`
              );
        })

})