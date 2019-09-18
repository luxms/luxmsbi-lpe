
export function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g , "''") + "'";
} 

export function db_quote_ident(intxt) {
     return '"' + intxt.toString() + '"';
} 

export function reports_get_column_sql(srcId, col) {
     // on Error plv8 will generate Exception!
     return col.split('.')[1];
 }

 export function reports_get_table_sql(srcId, tbl) {
     // on Error plv8 will generate Exception!
     return tbl;
 }