var assert = require('assert');
var lpe = require('../dist/lpe');


describe('LPE tests', function() {

    
    it('should eval full SQL expressions', function() {
        assert.equal( lpe.eval_sql_expr(
            'from(bm.tbl).select(a,b,department_code.alias, no::TEXT, max(credits)).where(a>1).order_by(a,-b)',
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
                      "id":"vNetwork.cluster",
                      "agg": ["min"],
                      "group":"Dimensions A",
                      "title":"Cluster"
                   },
                   {
                      "sort":2,
                      "id":"vNetwork.direct_path_io",
                      "group":"Dimensions A",
                      "agg":["sum","avg"],
                      "title":"Direct Path IO"
                   },
                   {
                      "id":"vNetwork.os_according_to_the_vmware_tools",
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
                               "vNetwork.cluster"
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
                      "id":"vNetwork.cluster",
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
                               "vNetwork.folder"
                            ],
                            "XXX"
                         ]
                      ],
                      "id":"vNetwork.folder",
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
                            "vNetwork.adapter"
                         ]
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
                            "vNetwork.period_day"
                         ],
                         []
                      ],
                      "id":"vNetwork.period_day",
                      "predicate":"=",
                      "filterValues":[
             
                      ],
                      "negationValue":false,
                      "isTemplateFilter":false
                   }
                ],
                "sourceId":"rvtools"
             },
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "SELECT min(cluster),avg(sum(direct_path_io)),os_according_to_the_vmware_tools FROM vNetwork WHERE not cluster IN ('SPB99-DMZ02','SPB99-ESXCL02','SPB99-ESXCL04','SPB99-ESXCLMAIL') and not folder ~ 'XXX' and adapter IS NULL  and TRUE GROUP BY os_according_to_the_vmware_tools ORDER BY cluster,direct_path_io DESC"
        );



        assert.equal( lpe.generate_report_sql(
             {"columns": [{"sort": 1, "id": "vNetwork.cluster", "group": "Dimensions A", "title": "Cluster"}, 
             {"sort": 2, "id": "vNetwork.os_according_to_the_vmware_tools", "group": "Dimensions A", "title": "OS according to the VMware Tools"}, 
             {"id": "vNetwork.connected", "group": "Dimensions B", "title": "Connected"}], 
             "filters": [{"lpe": [">", ["column", "vNetwork.period_day"], "2019-09-11"], "id": "vNetwork.period_day", "predicate": ">", "filterValues": ["2019-09-11"], "negationValue": false, "isTemplateFilter": false}, 
             {"lpe": ["in", ["column", "vNetwork.os_according_to_the_configuration_file"], ["[", "Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"]], "id": "vNetwork.os_according_to_the_configuration_file", "predicate": "in", "filterValues": ["Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "vNetwork.softwarelic1c"], "xxx"]], "id": "vNetwork.softwarelic1c", "predicate": "=", "filterValues": ["xxx"], "negationValue": true, "isTemplateFilter": true}, 
             {"lpe": ["~", ["column", "vNetwork.starts_connected"], "zzz"], "id": "vNetwork.starts_connected", "predicate": "~", "filterValues": ["zzz"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "vNetwork.forecast_day_1"], "777"]], "id": "vNetwork.forecast_day_1", "predicate": "=", "filterValues": ["777"], "negationValue": true, "isTemplateFilter": false}, 
             {"lpe": ["not", ["in", ["column", "vNetwork.direct_path_io"], ["[", "False", "True"]]], "id": "vNetwork.direct_path_io", "predicate": "in", "filterValues": ["False", "True"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "rvtools"}
,
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "SELECT cluster,os_according_to_the_vmware_tools,connected FROM vNetwork WHERE period_day > '2019-09-11' and os_according_to_the_configuration_file IN ('Debian GNU/Linux 10 (64-bit)','Debian GNU/Linux 5 (32-bit)','Debian GNU/Linux 5 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 7 (64-bit)','Debian GNU/Linux 8 (64-bit)','FreeBSD Pre-11 versions (32-bit)','Microsoft Windows 10 (64-bit)','Microsoft Windows 7 (32-bit)') and not softwarelic1c = 'xxx' and starts_connected ~ 'zzz' and not forecast_day_1 = '777' and not direct_path_io IN ('False','True') ORDER BY cluster,os_according_to_the_vmware_tools DESC"
        );



        assert.equal( lpe.generate_report_sql(
            {"columns": [{"id": "vNetwork.period_day", "group": "Periods", "title": "DAY"}], "filters": [{"lpe": ["between", ["column", "vNetwork.period_month"], "2019-09-10", "2019-09-20"], "id": "vNetwork.period_month", "predicate": "between", "filterValues": ["2019-09-10", "2019-09-20"], "negationValue": false, "isTemplateFilter": false}], "sourceId": "rvtools"}            ,
           {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
           "SELECT period_day FROM vNetwork WHERE (period_month BETWEEN '2019-09-10' AND '2019-09-20')"
       );

            // lpe: null
       assert.equal( lpe.generate_report_sql(
        {"columns": [{"sort": 2, "id": "vNetwork.direct_path_io", "group": "Dimensions A", "title": "Direct Path IO"}], "filters": [{"lpe": ["not", ["in", ["column", "vNetwork.os_according_to_the_vmware_tools"], ["[", "CentOS 7 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 9 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "FreeBSD Pre-11 versions (64-bit)", "Linux 4.15.0-51-generic buster/sid", "Linux 4.15.0-58-generic buster/sid", "Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)", "Microsoft Windows 10 (64-bit)"]]], "id": "vNetwork.os_according_to_the_vmware_tools", "predicate": "in", "filterValues": ["CentOS 7 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 9 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "FreeBSD Pre-11 versions (64-bit)", "Linux 4.15.0-51-generic buster/sid", "Linux 4.15.0-58-generic buster/sid", "Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)", "Microsoft Windows 10 (64-bit)"], "negationValue": true, "isTemplateFilter": true}, {"lpe": null, "id": "vNetwork.starts_connected", "predicate": "~", "filterValues": [], "negationValue": false, "isTemplateFilter": true}, {"lpe": ["not", ["between", ["column", "vNetwork.period_month"], "2019-09-09", "2019-09-27"]], "id": "vNetwork.period_month", "predicate": "between", "filterValues": ["2019-09-09", "2019-09-27"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "rvtools"}
              ,
       {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
       "SELECT direct_path_io FROM vNetwork WHERE not os_according_to_the_vmware_tools IN ('CentOS 7 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 9 (64-bit)','FreeBSD Pre-11 versions (32-bit)','FreeBSD Pre-11 versions (64-bit)','Linux 4.15.0-51-generic buster/sid','Linux 4.15.0-58-generic buster/sid','Linux 4.15.3-1-generic Astra Linux CE 2.12.13 (Orel)','Microsoft Windows 10 (64-bit)') and not (period_month BETWEEN '2019-09-09' AND '2019-09-27') ORDER BY direct_path_io DESC"
   );
    });



    
});




