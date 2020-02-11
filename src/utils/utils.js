
export function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g , "''") + "'";
} 

export function db_quote_ident(intxt) {
     return '"' + intxt.toString() + '"';
} 

export function reports_get_column_info(srcId, col) {
     var parts = col.split('.')
     return {"id": col, "sql_query": parts[2], "type": "STRING", "config": {}}
 }

 export function reports_get_table_sql(target_db_type, tbl) {
     var table_name = tbl.split('.')[1]
     if (target_db_type === 'oracle') {
          return `${table_name} ${table_name}`
     }
     return `${table_name} AS ${table_name}`
 }

/* should find path to JOIN all tables listed in cubes array */
/* returns list of tables and list of links between them */
export function reports_get_join_path(cubes) {
     return {"links": [], "nodes": cubes}
}

// should return LPE STRUCT
export function reports_get_join_conditions(link_struct) {
     return 'TRUE'
}

// we should get it from JDBC Connect String
export function get_source_database(srcIdent) {
     if (srcIdent === 'oracle') {
          return 'oracle'
     } else {
          return 'postgresql'
     }
}