import console from "../console/console.plv8";

export function db_quote_literal(intxt) {
       return plv8.quote_literal(intxt);
}

export function db_quote_ident(intxt) {
    return plv8.quote_ident(intxt);
}


export function reports_get_columns(cubeId) {
    var r = plv8.execute( 'SELECT id, sql_query, "type", config FROM koob.dimensions WHERE id LIKE $1', [`${cubeId}%`] );
    if (r.length > 0) {
        var parts = cubeId.split('.')

        var res = {}
        res[parts[0]] = {}
        
        var deep = {}
        r.map(el => {
             var ids = el.id.split('.')
             el["_ds"] = ids[0]
             el["_cube"] = ids[1]
             el["_col"] = ids[2]
             deep[el["_col"]] = el
             res[el.id] = el
        })
        res[parts[0]][parts[1]] = deep
        return res;
    }
    throw new Error("Can not find column descriptions in the koob.cube " + cubeId);

}

/* will make select from the local PostgreSQL */
/* col must be 3-elements: srcId.table.colname */
export function reports_get_column_info(srcId, col) {
    // on Error plv8 will generate Exception!
    var id = col
    var rows = plv8.execute( 'SELECT id, sql_query, "type", config FROM koob.dimensions WHERE id = $1', [id] );
    if (rows.length > 0) {
        return rows[0];
    }
    throw new Error("Can not find column description in the koob.dimensions for column " + id);
}


/* will make select from the local PostgreSQL */
export function reports_get_table_sql(target_db_type, tbl) {
    // on Error plv8 will generate Exception!
    var id = tbl
    var rows = plv8.execute( 'SELECT sql_query FROM koob.cubes WHERE id = $1', [id] );
    if (rows.length > 0) {
        var parts = tbl.split('.')
        var sql = rows[0].sql_query
        if (sql.match(/ /) !== null) sql = `(${sql})` // it's select ... FROM or something like this
        if (target_db_type === 'oracle') {
            return `${sql} ${parts[1]}`
        }
        return `${sql} AS ${parts[1]}`
    }
    throw new Error("Can not find table description in the koob.cubes for table " + id);
}

/* should find path to JOIN all tables listed in cubes array */
/* returns list of tables and list of links between them */
export function reports_get_join_path(cubes) {
    if (cubes.length === 1) {
        return {"links": [], "nodes": cubes, "linkedNodes": []}
    }

    /*
    with these we can not work with star schema!!!!
    commenting these two lines will generate duplicate tables, but we can deal with it later !

    AND src.link_ident <> prev.link_ident
    AND dst.link_ident <> prev.link_ident
    */


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
            --AND src.link_ident <> prev.link_ident
            --AND dst.link_ident <> prev.link_ident
            AND step < 5
        )
        SELECT * from prev where nodes @> $2 order by array_length(nodes,1) asc limit 1`, 
    [cubes[0], cubes])
    if (join_info.length === 0) {
        return {"links": [], "nodes": [], "linkedNodes": [] }
    }

    // We should remove duplicates from JOIN PATHS
    /*
    nodes: {luxmsbi.data,luxmsbi.periods,luxmsbi.data,luxmsbi.locations,luxmsbi.data,luxmsbi.metrics}
    links: {luxmsbi.period,luxmsbi.period,luxmsbi.location,luxmsbi.location,luxmsbi.metric}
    */

    var links = join_info[0]["links"]
    var nodes = join_info[0]["nodes"]
    var uniqLinks = []
    var uniqNodes = [nodes[0]]
    var linkedNodes = []
    for (var i = 0; i<links.length; i++) {
        if ( uniqLinks.findIndex( l => l == links[i] ) === -1 ) {
            // no such links yet, we can add new link easily,
            console.log(`${i} ADDING AT link ${links[i]}`)
            uniqLinks.push(links[i])
            uniqNodes.push(nodes[i+1])
            linkedNodes.push([nodes[i], nodes[i+1]])
        } else {
            // there is such link already (at least one), but let's check nodes!!!!
            for (var j = 0; j <= i; j++){
                if (links[j] == links[i]) {
                    console.log(`${i}:${j} EQUALS ${links[j]} == ${links[i]}`)
                    if ((nodes[j] == nodes[i] && nodes[j+1] == nodes[i+1]) || (nodes[j] == nodes[i+1] && nodes[j+1] == nodes[i]) ){
                        // we already have such nodes connected with this link!!!
                        console.log(`${i}:${j} SKIP link as DUPL ${links[i]}`)
                    } else {
                        uniqLinks.push(links[i])
                        uniqNodes.push(nodes[i+1])
                        linkedNodes.push([nodes[i], nodes[i+1]])
                    }
                }
            }
        }
        console.log(`${i} UNIQ LINKS:` + JSON.stringify(uniqLinks))
        console.log(`${i} UNIQ NODES:` + JSON.stringify(uniqNodes))
    }

    return {"links": uniqLinks, "nodes": uniqNodes, "linkedNodes": linkedNodes }
}

// should return LPE STRUCT
// input should be coming from reports_get_join_path
export function reports_get_join_conditions(link_struct) {
    //console.log("reports_get_join_conditions " + JSON.stringify(link_struct))
    var res = [];
    for (var i=0; i<link_struct.links.length; i++) {
        //  link_ident    |    cube_ident     |       dim_ident_list        | config
        var links = plv8.execute(`select dim_ident_list from koob.joins where link_ident = $1 AND (cube_ident = $2 OR cube_ident = $3)`, 
                            [link_struct.links[i], link_struct.linkedNodes[i][0], link_struct.linkedNodes[i][1]])
        // we should get 2 records
        if (links.length !== 2) {
            throw new Error(`Can not find full link named ${link_struct.links[i]} between ${link_struct.linkedNodes[i][0]} and ${link_struct.linkedNodes[i][1]}`)
        }

        const zip = (arr, ...arrs) => {
            return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
        }

        var lpe = zip(links[0]["dim_ident_list"], links[1]["dim_ident_list"]).map( l => ["=", ["column", l[0]], ["column", l[1]]])
        if (lpe.length > 1) {
            res.push( ["and"].concat(lpe) )
        }
        res.push(lpe[0])
    }
    return res
}


// we should get it from JDBC Connect String
export function get_source_database(srcIdent) {
    var rows = plv8.execute( 'SELECT url FROM adm.data_sources WHERE ident = $1', [srcIdent] );
    if (rows.length > 0) {
        var url = rows[0]["url"]
        if (url) {
            var matched = url.match(/^jdbc\:([^:]+)\:/)
            console.log(`DATA SOURCE URL MATCHED ${JSON.stringify(matched)}`)
            if (matched != null && matched.length > 1) {
                return matched[1]
            }
        }
    }
    // default
    return 'postgresql'
}