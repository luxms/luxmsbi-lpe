var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    
    it('should eval full SQL expressions', function() {
        assert.equal( lpe.eval_sql_expr(
            'from(bm.tbl).select(a,b,department_code.alias, no::TEXT, max(credits)).filter(a>1).order_by(a,-b)',
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            'SELECT a,b,"department_code"."alias",no::TEXT,max(credits) FROM "bm"."tbl" WHERE a > 1 ORDER BY a,b DESC'
        );
    });

/*
    it('should eval full SQL expressions', function() {
        assert.equal( lpe.parse_sql_expr(
            'from(bm.tbl).select(a,b,department_code.alias, no::TEXT, max(credits)).where(a>1).order_by(a,-b)',
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            'SELECT a,b,"department_code"."alias",no::TEXT,max(credits) FROM "bm"."tbl" WHERE a > 1 ORDER BY a,b DESC'
        );
    });
*/    

    it('should generate SQL for Reports', function() {

        /*
        assert.equal( lpe.generate_report_sql( 
            [],
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}
            ),
            'FUCK 1'
        ); 
        */

        assert.equal( lpe.generate_report_sql(
            {
                "columns":[
                   {
                      "sort":1,
                      "id":"rvtools.vNetwork.cluster",
                      "agg": ["min"],
                      "group":"Dimensions A",
                      "title":"Cluster"
                   },
                   {
                      "sort":2,
                      "id":"rvtools.vNetwork.direct_path_io",
                      "group":"Dimensions A",
                      "agg":["sum","avg"],
                      "title":"Direct Path IO"
                   },
                   {
                      "id":"rvtools.vNetwork.os_according_to_the_vmware_tools",
                      "group":"Dimensions A",
                      "title":"OS according to the VMware Tools"
                   }
                ],
                "filters":[
                   {
                      "lpe":[
                         "not",
                         [
                            "in",
                            [
                               "column",
                               "rvtools.vNetwork.cluster"
                            ],
                            [
                               "[",
                               "SPB99-DMZ02",
                               "SPB99-ESXCL02",
                               "SPB99-ESXCL04",
                               "SPB99-ESXCLMAIL"
                            ]
                         ]
                      ],
                      "id":"rvtools.vNetwork.cluster",
                      "predicate":"in",
                      "filterValues":[
                         "SPB99-DMZ02",
                         "SPB99-ESXCL02",
                         "SPB99-ESXCL04",
                         "SPB99-ESXCLMAIL"
                      ],
                      "negationValue":true,
                      "isTemplateFilter":true
                   },
                   {
                      "lpe":[
                         "not",
                         [
                            "~",
                            [
                               "column",
                               "rvtools.vNetwork.folder"
                            ],
                            "XXX"
                         ]
                      ],
                      "id":"rvtools.vNetwork.folder",
                      "predicate":"~",
                      "filterValues":[
                         "XXX"
                      ],
                      "negationValue":true,
                      "isTemplateFilter":true
                   },
                   {
                      "lpe":[
                         "=",
                         [
                            "column",
                            "rvtools.vNetwork.adapter"
                         ],
                         null
                      ],
                      "id":"vNetwork.adapter",
                      "predicate":"=",
                      "filterValues":[
             
                      ],
                      "negationValue":false,
                      "isTemplateFilter":false
                   },
                   {
                      "lpe":[
                         "=",
                         [
                            "column",
                            "rvtools.vNetwork.period_day"
                         ],
                         []
                      ],
                      "id":"rvtools.vNetwork.period_day",
                      "predicate":"=",
                      "filterValues":[
             
                      ],
                      "negationValue":false,
                      "isTemplateFilter":false
                   }
                ],
                "sourceId":"rvtools",
                "limit": 100
             },
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            `SELECT min( "vNetwork"."cluster" ),avg( sum( "vNetwork"."direct_path_io" ) ),"vNetwork"."os_according_to_the_vmware_tools" FROM vNetwork AS vNetwork WHERE not "vNetwork"."cluster" IN ('SPB99-DMZ02','SPB99-ESXCL02','SPB99-ESXCL04','SPB99-ESXCLMAIL') and not "vNetwork"."folder" ~ 'XXX' and "vNetwork"."adapter" IS NULL  and TRUE GROUP BY "vNetwork"."os_according_to_the_vmware_tools" ORDER BY "vNetwork"."cluster","vNetwork"."direct_path_io" DESC LIMIT 100 OFFSET 0`
        );



        assert.equal( lpe.generate_report_sql(
             {"columns": [{"sort": 1, "id": "rvtools.vNetwork.cluster", "group": "Dimensions A", "title": "Cluster"}, 
             {"sort": 2, "id": "rvtools.vNetwork.os_according_to_the_vmware_tools", "group": "Dimensions A", "title": "OS according to the VMware Tools"}, 
             {"id": "rvtools.vNetwork.connected", "group": "Dimensions B", "title": "Connected"}], 
             "filters": [{"lpe": [">", ["column", "rvtools.vNetwork.period_day"], "2019-09-11"], "id": "rvtools.vNetwork.period_day", "predicate": ">", "filterValues": ["2019-09-11"], "negationValue": false, "isTemplateFilter": false}, 
             {"lpe": ["in", ["column", "rvtools.vNetwork.os_according_to_the_configuration_file"], ["[", "Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"]], "id": "rvtools.vNetwork.os_according_to_the_configuration_file", "predicate": "in", "filterValues": ["Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "rvtools.vNetwork.softwarelic1c"], "xxx"]], "id": "rvtools.vNetwork.softwarelic1c", "predicate": "=", "filterValues": ["xxx"], "negationValue": true, "isTemplateFilter": true}, 
             {"lpe": ["~", ["column", "rvtools.vNetwork.starts_connected"], "zzz"], "id": "rvtools.vNetwork.starts_connected", "predicate": "~", "filterValues": ["zzz"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "rvtools.vNetwork.forecast_day_1"], "777"]], "id": "rvtools.vNetwork.forecast_day_1", "predicate": "=", "filterValues": ["777"], "negationValue": true, "isTemplateFilter": false}, 
             {"lpe": ["not", ["IN", ["column", "rvtools.vNetwork.direct_path_io"], ["False", "True"]]], "id": "rvtools.vNetwork.direct_path_io", "predicate": "in", "filterValues": ["False", "True"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "rvtools"}
,
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            `SELECT "vNetwork"."cluster","vNetwork"."os_according_to_the_vmware_tools","vNetwork"."connected" FROM vNetwork AS vNetwork WHERE "vNetwork"."period_day" > '2019-09-11' and "vNetwork"."os_according_to_the_configuration_file" IN ('Debian GNU/Linux 10 (64-bit)','Debian GNU/Linux 5 (32-bit)','Debian GNU/Linux 5 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 7 (64-bit)','Debian GNU/Linux 8 (64-bit)','FreeBSD Pre-11 versions (32-bit)','Microsoft Windows 10 (64-bit)','Microsoft Windows 7 (32-bit)') and not "vNetwork"."softwarelic1c" = 'xxx' and "vNetwork"."starts_connected" ~ 'zzz' and not "vNetwork"."forecast_day_1" = '777' and not "vNetwork"."direct_path_io" IN ('False','True') ORDER BY "vNetwork"."cluster","vNetwork"."os_according_to_the_vmware_tools" DESC`
        );



        assert.equal( lpe.generate_report_sql(
            {"columns": [{"id": "rvtools.vNetwork.period_day", "group": "Periods", "title": "DAY"}], "filters": [{"lpe": ["between", ["column", "rvtools.vNetwork.period_month"], "2019-09-10", "2019-09-20"], "id": "rvtools.vNetwork.period_month", "predicate": "between", "filterValues": ["2019-09-10", "2019-09-20"], "negationValue": false, "isTemplateFilter": false}], "sourceId": "rvtools"}            ,
           {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
           `SELECT "vNetwork"."period_day" FROM vNetwork AS vNetwork WHERE ("vNetwork"."period_month" BETWEEN '2019-09-10' AND '2019-09-20')`
       );

            // lpe: null
       assert.equal( lpe.generate_report_sql(
        {"columns": [{"sort": 2, "id": "rvtools.vNetwork.direct_path_io", "group": "Dimensions A", "title": "Direct Path IO"}], "filters": [{"lpe": ["not", ["in", ["column", "rvtools.vNetwork.os_according_to_the_vmware_tools"], ["[", "CentOS 7 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 9 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "FreeBSD Pre-11 versions (64-bit)", "Linux 4.15.0-51-generic buster/sid", "Linux 4.15.0-58-generic buster/sid", "Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)", "Microsoft Windows 10 (64-bit)"]]], "id": "rvtools.vNetwork.os_according_to_the_vmware_tools", "predicate": "in", "filterValues": ["CentOS 7 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 9 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "FreeBSD Pre-11 versions (64-bit)", "Linux 4.15.0-51-generic buster/sid", "Linux 4.15.0-58-generic buster/sid", "Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)", "Microsoft Windows 10 (64-bit)"], "negationValue": true, "isTemplateFilter": true}, {"lpe": null, "id": "rvtools.vNetwork.starts_connected", "predicate": "~", "filterValues": [], "negationValue": false, "isTemplateFilter": true}, {"lpe": ["not", ["between", ["column", "rvtools.vNetwork.period_month"], "2019-09-09", "2019-09-27"]], "id": "rvtools.vNetwork.period_month", "predicate": "between", "filterValues": ["2019-09-09", "2019-09-27"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "rvtools"}
              ,
       {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
       `SELECT "vNetwork"."direct_path_io" FROM vNetwork AS vNetwork WHERE not "vNetwork"."os_according_to_the_vmware_tools" IN ('CentOS 7 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 9 (64-bit)','FreeBSD Pre-11 versions (32-bit)','FreeBSD Pre-11 versions (64-bit)','Linux 4.15.0-51-generic buster/sid','Linux 4.15.0-58-generic buster/sid','Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)','Microsoft Windows 10 (64-bit)') and not ("vNetwork"."period_month" BETWEEN '2019-09-09' AND '2019-09-27') ORDER BY "vNetwork"."direct_path_io" DESC`
        );


        // Oracle flavor
        assert.equal( lpe.generate_report_sql(
         {"columns": [{"sort": 1, "id": "oracle.vNetwork.cluster", "group": "Dimensions A", "title": "Cluster"}, 
         {"sort": 2, "id": "oracle.vNetwork.os_according_to_the_vmware_tools", "group": "Dimensions A", "title": "OS according to the VMware Tools"}, 
         {"id": "oracle.vNetwork.connected", "group": "Dimensions B", "title": "Connected"}], 
         "filters": [{"lpe": [">", ["column", "oracle.vNetwork.period_day"], "2019-09-11"], "id": "oracle.vNetwork.period_day", "predicate": ">", "filterValues": ["2019-09-11"], "negationValue": false, "isTemplateFilter": false}, 
         {"lpe": ["in", ["column", "oracle.vNetwork.os_according_to_the_configuration_file"], ["[", "Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"]], "id": "oracle.vNetwork.os_according_to_the_configuration_file", "predicate": "in", "filterValues": ["Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"], "negationValue": false, "isTemplateFilter": true}, 
         {"lpe": ["not", ["=", ["column", "oracle.vNetwork.softwarelic1c"], "xxx"]], "id": "oracle.vNetwork.softwarelic1c", "predicate": "=", "filterValues": ["xxx"], "negationValue": true, "isTemplateFilter": true}, 
         {"lpe": ["~", ["column", "oracle.vNetwork.starts_connected"], "zzz"], "id": "oracle.vNetwork.starts_connected", "predicate": "~", "filterValues": ["zzz"], "negationValue": false, "isTemplateFilter": true}, 
         {"lpe": ["not", ["=", ["column", "oracle.vNetwork.forecast_day_1"], "777"]], "id": "oracle.vNetwork.forecast_day_1", "predicate": "=", "filterValues": ["777"], "negationValue": true, "isTemplateFilter": false}, 
         {"lpe": ["not", ["in", ["column", "oracle.vNetwork.direct_path_io"], ["[", "False", "True"]]], "id": "oracle.vNetwork.direct_path_io", "predicate": "in", "filterValues": ["False", "True"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "oracle", "limit": 1000}
,
        {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
        `SELECT * FROM (
          SELECT "vNetwork"."cluster","vNetwork"."os_according_to_the_vmware_tools","vNetwork"."connected" FROM vNetwork vNetwork WHERE "vNetwork"."period_day" > '2019-09-11' and "vNetwork"."os_according_to_the_configuration_file" IN ('Debian GNU/Linux 10 (64-bit)','Debian GNU/Linux 5 (32-bit)','Debian GNU/Linux 5 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 7 (64-bit)','Debian GNU/Linux 8 (64-bit)','FreeBSD Pre-11 versions (32-bit)','Microsoft Windows 10 (64-bit)','Microsoft Windows 7 (32-bit)') and not "vNetwork"."softwarelic1c" = 'xxx' and REGEXP_LIKE( "vNetwork"."starts_connected" , 'zzz' ) and not "vNetwork"."forecast_day_1" = '777' and not "vNetwork"."direct_path_io" IN ('False','True') ORDER BY "vNetwork"."cluster","vNetwork"."os_according_to_the_vmware_tools" DESC
        ) WHERE ROWNUM <= 1000`
    );
    });



    
});




