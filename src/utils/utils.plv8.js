export function db_quote_literal(intxt) {
       return plv8.quote_literal(intxt);
}

export function db_quote_ident(intxt) {
    return plv8.quote_ident(intxt);
}

/* will make select from the local PostgreSQL */
export function reports_get_column_sql(srcId, col) {
    // on Error plv8 will generate Exception!
    var id = srcId + '.' + col
    var rows = plv8.execute( 'SELECT sql_query FROM koob.dimensions WHERE id = $1', [id] );
    if (rows.length > 0) {
        return rows[0].sql_query;
    }
    throw new Error("Can not find column description in the koob.dimensions for column " + id);
}

/* will make select from the local PostgreSQL */
export function reports_get_table_sql(srcId, tbl) {
    // on Error plv8 will generate Exception!
    var id = srcId + '.' + tbl
    var rows = plv8.execute( 'SELECT sql_query FROM koob.cubes WHERE id = $1', [id] );
    if (rows.length > 0) {
        return '(' + rows[0].sql_query + ') AS rprts_gnrtd_qry';
    }
    throw new Error("Can not find table description in the koob.cubes for table " + id);
}