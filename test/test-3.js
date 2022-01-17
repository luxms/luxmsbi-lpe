var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {



   /*
   если значение var == null
   cond('col in $(row.var)', []) = значит убрать cond вообще (с учётом or/and)
   cond('col in $(var)', 'defval') = col in defval
   cond('col = $(var)', ['col is null']) = полная замена col is null
   */
   it('should eval SQL cond expressions', function() {
      assert.equal( lpe.eval_sql_where(
          'where( cond("myfunc($(period.title1)) = 234", [])  )',
          {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
          "WHERE 1=1"
      );

      assert.equal( lpe.eval_sql_where(
         'where( cond("myfunc($(period.title1)) = 234", "defaultVal")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         'WHERE myfunc("defaultVal") = 234'
     );

     assert.equal( lpe.eval_sql_where(
      'where( cond("myfunc($(period.title1)) = 234", ["myfunc(1)"])  )',
      {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
      'WHERE myfunc(1)'
      );

      assert.equal( lpe.eval_sql_where(
         'where( cond("myfunc($(period.title1)) = \'234\'")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc() = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond("myfunc($(period.title)) = \'234\'")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc(Noyabr) = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond("myfunc(ql($(period.title))) = \'234\'")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
         "WHERE myfunc('Noyabr') = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond("myfunc($(period.title)) = \'234\'")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE myfunc(2001) = '234'"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond("table.column = $(period.title)")  )',
         {"_quoting":"explicit", "a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE table.column = 2001"
         );

      assert.equal( lpe.eval_sql_where(
         'where( cond("table.column = ql($(period.title))")  )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "WHERE table.column = '2001'"
         );

      assert.equal( lpe.eval_sql_where(
         'cond("table.column = ql($(period.title))")  ',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "table.column = '2001'"
         );

      assert.equal( lpe.eval_sql_where(
         'filter( cond("table.col = ql($(period.title))") or cond("table.col2 = ql($(period.title))") )',
         {"_quoting":"explicit","a":"b","period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":2001}}),
         "table.col = '2001' or table.col2 = '2001'"
         );
   });
})