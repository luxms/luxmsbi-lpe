export function db_quote_literal(intxt) {
       return plv8.quote_literal(intxt);
}

export function db_quote_ident(intxt) {
    return plv8.quote_ident(intxt);
}

/* will make select from the local PostgreSQL */
/* col must be 3-elements: srcId, table, colname */

export function reports_get_column_sql(srcId, col) {
    // on Error plv8 will generate Exception!
    var id = col
    var rows = plv8.execute( 'SELECT sql_query FROM koob.dimensions WHERE id = $1', [id] );
    if (rows.length > 0) {
        return rows[0].sql_query;
    }
    throw new Error("Can not find column description in the koob.dimensions for column " + id);
}

/* will make select from the local PostgreSQL */
export function reports_get_table_sql(srcId, tbl) {
    // on Error plv8 will generate Exception!
    var id = tbl
    var rows = plv8.execute( 'SELECT sql_query FROM koob.cubes WHERE id = $1', [id] );
    if (rows.length > 0) {
        return '(' + rows[0].sql_query + ') AS rprts_gnrtd_qry';
    }
    throw new Error("Can not find table description in the koob.cubes for table " + id);
}

/* should find path to JOIN all tables listed in cubes array */
/* returns list of tables and list of links between them */
export function reports_get_join_path(cubes) {
    var join_info = plv8.execute(`
        WITH RECURSIVE prev(from_table, link_ident, to_table, step, nodes, links) AS (
            SELECT
            src.cube_ident,
            src.link_ident,
            dst.cube_ident,
            0::INT as step,
            ARRAY[src.cube_ident,dst.cube_ident]::TEXT[] as nodes,
            ARRAY[src.link_ident]::TEXT[] as links
            FROM koob.joins as src left join koob.joins as dst on (src.link_ident = dst.link_ident)
            WHERE src.cube_ident = $1
            AND src.cube_ident <> dst.cube_ident
        UNION ALL
            SELECT
            src.cube_ident,
            src.link_ident,
            dst.cube_ident,
            step+1 as step,
            nodes || dst.cube_ident as nodes,
            links || src.link_ident as links
            FROM koob.joins as src LEFT JOIN koob.joins as dst ON (src.link_ident = dst.link_ident), prev
            WHERE src.cube_ident = prev.to_table
            AND dst.cube_ident <> prev.to_table
            AND src.link_ident <> prev.link_ident
            AND dst.link_ident <> prev.link_ident
            AND step < 6
        )
        SELECT * from prev where nodes @> $2 order by array_length(nodes,1) asc limit 1`, 
    [cubes[0], cubes])
    if (join_info.length === 0) {
        return {"links": [], "nodes": []}
    }
    return {"links": join_info[0]["links"], "nodes": join_info[0]["nodes"]}
}