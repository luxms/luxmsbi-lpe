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

    it('should eval cast to INT with default "NULL"', function() {
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

    it('should eval cast to FLOAT', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(f_col, FLOAT)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8("f_col", NULL::FLOAT)`
            );
    });

    it('should eval cast to FLOAT with default 0', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(f_col, FLOAT, 0)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8("f_col", '0'::FLOAT)`
            );
    });

    it('should eval cast to DOUBLE', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(f_col, DOUBLE)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8("f_col", NULL::FLOAT)`
            );
    });

    it('should eval cast to DOUBLE with default 0', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(f_col, DOUBLE, 0)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8("f_col", '0'::FLOAT)`
            );
    });

    it('should eval castWithExpr to DOUBLE', function() {
       assert.equal( lpe.eval_sql_macros(
          lpe.parse("castWithExpr(f_col, DOUBLE, left(regexp('(\\\\d+)'), 1) )"),
                {"_target_database": "postgresql"}),
    `    ALTER COLUMN "f_col" SET DATA TYPE FLOAT
    USING utils.safe_convert_to_float8(left((regexp_match("f_col", '(\\d+)'))[1], '1'), NULL::FLOAT)`
             );
    });

    it('should eval cast to STRING', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(t, STRING)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "t" SET DATA TYPE TEXT
    USING utils.safe_convert_to_text("t", NULL::TEXT)`
            );
    });

    it('should eval cast to STRING with default "TEST"', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(t, STRING, 'TEST')"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "t" SET DATA TYPE TEXT
    USING utils.safe_convert_to_text("t", 'TEST'::TEXT)`
            );
    });

    it('should eval castWithExpr to STRING', function() {
       assert.equal( lpe.eval_sql_macros(
          lpe.parse("castWithExpr(t, STRING, left(regexp('(\\\\d+)'), 1) )"),
                {"_target_database": "postgresql"}),
    `    ALTER COLUMN "t" SET DATA TYPE TEXT
    USING utils.safe_convert_to_text(left((regexp_match("t", '(\\d+)'))[1], '1'), NULL::TEXT)`
             );
    });

    it('should eval cast to DATE', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(d, DATE)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "d" SET DATA TYPE DATE
    USING utils.safe_convert_to_date("d", NULL::DATE)`
            );
    });

    it('should eval cast to DATE with default 2000-01-01', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(d, DATE, '2000-01-01')"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "d" SET DATA TYPE DATE
    USING utils.safe_convert_to_date("d", '2000-01-01'::DATE)`
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

    it('should eval cast to DATETIME', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(d, DATETIME)"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "d" SET DATA TYPE TIMESTAMP
    USING utils.safe_convert_to_timestamp("d", NULL::TIMESTAMP)`
            );
    });

    it('should eval cast to DATETIME with default 2000-01-01', function() {
      assert.equal( lpe.eval_sql_macros(
         lpe.parse("cast(d, DATETIME, '2000-01-01')"),
               {"_target_database": "postgresql"}),
    `    ALTER COLUMN "d" SET DATA TYPE TIMESTAMP
    USING utils.safe_convert_to_timestamp("d", '2000-01-01'::TIMESTAMP)`
            );
    });

    it('should eval castWithExpr to DATETIME with to_datetime', function() {
       assert.equal( lpe.eval_sql_macros(
          lpe.parse("castWithExpr(i, DATETIME, to_datetime('DD.mm.YYYY hh:mi'))"),
                {"_target_database": "postgresql"}),
    `    ALTER COLUMN "i" SET DATA TYPE TIMESTAMP
    USING utils.safe_convert_to_timestamp("i", 'DD.mm.YYYY hh:mi', NULL::TIMESTAMP)`
             );
    });

    it('should eval castWithExpr to DATETIME with to_datetime and default', function() {
       assert.equal( lpe.eval_sql_macros(
          lpe.parse("castWithExpr(i, DATETIME, to_datetime('DD.mm.YYYY hh:mi'), '2000-01-01 00:01' )"),
                {"_target_database": "postgresql"}),
    `    ALTER COLUMN "i" SET DATA TYPE TIMESTAMP
    USING utils.safe_convert_to_timestamp("i", 'DD.mm.YYYY hh:mi', '2000-01-01 00:01'::TIMESTAMP)`
             );
    });

    //console.log(JSON.stringify(lpe.parse("castWithExpr(i, INT, left(regexp('(\\d+\\n)'), 1) )")))

});




