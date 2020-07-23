
export function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g , "''") + "'";
} 

export function db_quote_ident(intxt) {
     return '"' + intxt.toString() + '"';
} 

// for debugging outside of database !!!
export function reports_get_columns(cubeId) {
     var r = [{"id":"ch.fot_out.dt","type":"PERIOD","title":"dt","sql_query":"NOW() - INERVAL '1 DAY'","config":{}}, {"id":"ch.fot_out.hcode_id","type":"NUMBER","title":"hcode_id","sql_query":"hcode_id",
     "config":{}}, {"id":"ch.fot_out.hcode_name","type":"STRING","title":"hcode_name","sql_query":"hcode_name","config":{}}, {"id":"ch.fot_out.unit_name","type":"STRING","title":
     "unit_name","sql_query":"unit_name","config":{}}, {"id":"ch.fot_out.date_type_id","type":"NUMBER","title":"date_type_id","sql_query":"date_type_id","config":{}}, {"id"
     :"ch.fot_out.dor_id","type":"NUMBER","title":"dor_id","sql_query":"dor_id","config":{}}, {"id":"ch.fot_out.dor_tlg","type":"STRING","title":"dor_tlg","sql_query":"dor_tlg",
     "config":{}}, {"id":"ch.fot_out.dor_name","type":"STRING","title":"dor_name","sql_query":"dor_name","config":{}}, {"id":"ch.fot_out.obj_id","type":"NUMBER","title":"obj_id",
     "sql_query":"obj_id","config":{}}, {"id":"ch.fot_out.tlg","type":"STRING","title":"tlg","sql_query":"tlg","config":{}}, {"id":"ch.fot_out.obj_name","type":"STRING",
     "title":"obj_name","sql_query":"obj_name","config":{}}, {"id":"ch.fot_out.oe_type","type":"STRING","title":"oe_type","sql_query":"oe_type","config":{}}, {"id":"ch.fot_out.priox_int",
     "type":"NUMBER","title":"priox_int","sql_query":"priox_int","config":{}}, {"id":"ch.fot_out.type_oe_bi","type":"STRING","title":"type_oe_bi","sql_query":"type_oe_bi",
     "config":{}}, {"id":"ch.fot_out.dor1","type":"STRING","title":"dor1","sql_query":"dor1","config":{}}, {"id":"ch.fot_out.dor2","type":"STRING","title":"dor2","sql_query":
     "dor2","config":{}}, {"id":"ch.fot_out.dor3","type":"STRING","title":"dor3","sql_query":"dor3","config":{}}, {"id":"ch.fot_out.dor4","type":"STRING","title":"dor4",
     "sql_query":"dor4","config":{}}, {"id":"ch.fot_out.dor5","type":"STRING","title":"dor5","sql_query":"dor5","config":{}}, {"id":"ch.fot_out.dor6","type":"STRING","title":"dor6",
     "sql_query":"dor6","config":{}}, {"id":"ch.fot_out.branch1","type":"STRING","title":"branch1","sql_query":"branch1","config":{}}, {"id":"ch.fot_out.branch2","type":
     "STRING","title":"branch2","sql_query":"branch2","config":{}}, {"id":"ch.fot_out.branch3","type":"STRING","title":"branch3","sql_query":"branch3","config":{}}, 
     {"id":"ch.fot_out.branch4","type":"STRING","title":"branch4","sql_query":"branch4","config":{}}, {"id":"ch.fot_out.branch5","type":"STRING","title":"branch5","sql_query":"branch5",
     "config":{}}, {"id":"ch.fot_out.branch6","type":"STRING","title":"branch6","sql_query":"branch6","config":{}}, {"id":"ch.fot_out.ss1","type":"STRING","title":"ss1",
     "sql_query":"ss1","config":{}}, {"id":"ch.fot_out.ss2","type":"STRING","title":"ss2","sql_query":"ss2","config":{}}, {"id":"ch.fot_out.ss3","type":"STRING","title":"ss3",
     "sql_query":"ss3","config":{}}, {"id":"ch.fot_out.ss4","type":"STRING","title":"ss4","sql_query":"ss4","config":{}}, {"id":"ch.fot_out.ss5","type":"STRING","title":"ss5",
     "sql_query":"ss5","config":{}}, {"id":"ch.fot_out.ss6","type":"STRING","title":"ss6","sql_query":"ss6","config":{}}, {"id":"ch.fot_out.indicator_v","type":"NUMBER","title":
     "indicator_v","sql_query":"indicator_v","config":{}}, {"id":"ch.fot_out.group_pay_name","type":"STRING","title":"group_pay_name","sql_query":"group_pay_name","config":{}}, 
     {"id":"ch.fot_out.pay_name","type":"STRING","title":"pay_name","sql_query":"pay_name","config":{"memberALL":null}}, {"id":"ch.fot_out.category_name","type":"STRING","title":"category_name"
     ,"sql_query":"category_name","config":{}}, {"id":"ch.fot_out.sex_code","type":"STRING","title":"sex_code","sql_query":"sex_code","config":{"memberALL":"Все","altDimensions":["fot_out.sex_name"]}},
     {"id":"ch.fot_out.sex_name","type":"STRING","title":"sex_name","sql_query":"sex_name","config":{"memberALL":"Все","altDimensions":["fot_out.sex_code"]}}, {"id":"ch.fot_out.area_name",
     "type":"STRING","title":"area_name","sql_query":"area_name","config":{}}, {"id":"ch.fot_out.region_name","type":"STRING","title":"region_name","sql_query":"region_name"
     ,"config":{}}, {"id":"ch.fot_out.municipal_name","type":"STRING","title":"municipal_name","sql_query":"municipal_name","config":{}}, {"id":"ch.fot_out.prod_group_name",
     "type":"STRING","title":"prod_group_name","sql_query":"prod_group_name","config":{}}, {"id":"ch.fot_out.profession_name","type":"STRING","title":"profession_name","sql_query":
     "profession_name","config":{}}, {"id":"ch.fot_out.v_main","type":"SUM","title":"v_main","sql_query":"v_main","config":{}}, {"id":"ch.fot_out.v_rel_fzp","type":"SUM",
     "title":"v_rel_fzp","sql_query":"v_rel_fzp","config":{}}, {"id":"ch.fot_out.v_rel_pp","type":"SUM","title":"v_rel_pp","sql_query":"v_rel_pp","config":{}}];

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