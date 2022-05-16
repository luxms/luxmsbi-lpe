var assert = require('assert');
var lpe = require('../dist/lpe');



describe('SQL Macros', function() {

    it('should eval cast to INT', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(i, INT)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int("i", NULL::INT)`
            );
    });

    it('should eval cast to FLOAT', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(f_col, FLOAT)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8("f_col", NULL::FLOAT)`
            );
    });


   it('should eval cast to INT with default NULL', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(i, INT, NULL)"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int("i", 'NULL'::INT)`
            );
   });


   it('should eval cast to INT with default 0', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(i, INT, 0)"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int("i", '0'::INT)`
            );
   });

   it('should eval cast to INT with default null', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(i, INT, null)"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int("i", NULL::INT)`
            );
   });


   it('should eval castWithExpr to INT', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("castWithExpr(i, INT, left(regexp('(\\\\d+)'), 1) )"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int(left((regexp_match("i", '(\\d+)'))[1], '1'), NULL::INT)`
            );
   });

   it('should eval castWithExpr to INT with dot', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("castWithExpr(i, INT, regexp('(\\\\d+)').left(1) )"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE INT
    USING utils.safe_convert_to_int(left((regexp_match("i", '(\\d+)'))[1], '1'), NULL::INT)`
            );
   });


   it('should eval castWithExpr to DATE with to_date', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("castWithExpr(i, DATE, to_date('DD.mm.YYYY') )"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE DATE
    USING utils.safe_convert_to_date("i", 'DD.mm.YYYY', NULL::DATE)`
            );
   });

   it('should eval castWithExpr to DATE with to_date and default', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("castWithExpr(i, DATE, to_date('DD.mm.YYYY'), '2000-01-01' )"),
               {"_target_database": "postgresql"}),
   `    ALTER COLUMN "i" SET DATA TYPE DATE
    USING utils.safe_convert_to_date("i", 'DD.mm.YYYY', '2000-01-01'::DATE)`
            );
   });

   //console.log(JSON.stringify(lpe.parse("castWithExpr(i, INT, left(regexp('(\\d+\\n)'), 1) )")))

});




