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
                      "dimId":"vNetwork.cluster",
                      "group":"Dimensions A",
                      "title":"Cluster"
                   },
                   {
                      "sort":2,
                      "dimId":"vNetwork.direct_path_io",
                      "group":"Dimensions A",
                      "title":"Direct Path IO"
                   },
                   {
                      "dimId":"vNetwork.os_according_to_the_vmware_tools",
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
                      "dimId":"vNetwork.cluster",
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
                      "dimId":"vNetwork.folder",
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
                      "dimId":"vNetwork.adapter",
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
                      "dimId":"vNetwork.period_day",
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
            "SELECT cluster,direct_path_io,os_according_to_the_vmware_tools FROM vNetwork WHERE not cluster IN ('SPB99-DMZ02','SPB99-ESXCL02','SPB99-ESXCL04','SPB99-ESXCLMAIL') and not folder ~ 'XXX' and adapter IS NULL  and TRUE ORDER BY cluster,direct_path_io DESC"
        );



        assert.equal( lpe.generate_report_sql(
             {"columns": [{"sort": 1, "dimId": "vNetwork.cluster", "group": "Dimensions A", "title": "Cluster"}, 
             {"sort": 2, "dimId": "vNetwork.os_according_to_the_vmware_tools", "group": "Dimensions A", "title": "OS according to the VMware Tools"}, 
             {"dimId": "vNetwork.connected", "group": "Dimensions B", "title": "Connected"}], 
             "filters": [{"lpe": [">", ["column", "vNetwork.period_day"], "2019-09-11"], "dimId": "vNetwork.period_day", "predicate": ">", "filterValues": ["2019-09-11"], "negationValue": false, "isTemplateFilter": false}, 
             {"lpe": ["in", ["column", "vNetwork.os_according_to_the_configuration_file"], ["[", "Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"]], "dimId": "vNetwork.os_according_to_the_configuration_file", "predicate": "in", "filterValues": ["Debian GNU/Linux 10 (64-bit)", "Debian GNU/Linux 5 (32-bit)", "Debian GNU/Linux 5 (64-bit)", "Debian GNU/Linux 6 (64-bit)", "Debian GNU/Linux 7 (64-bit)", "Debian GNU/Linux 8 (64-bit)", "FreeBSD Pre-11 versions (32-bit)", "Microsoft Windows 10 (64-bit)", "Microsoft Windows 7 (32-bit)"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "vNetwork.softwarelic1c"], "xxx"]], "dimId": "vNetwork.softwarelic1c", "predicate": "=", "filterValues": ["xxx"], "negationValue": true, "isTemplateFilter": true}, 
             {"lpe": ["~", ["column", "vNetwork.starts_connected"], "zzz"], "dimId": "vNetwork.starts_connected", "predicate": "~", "filterValues": ["zzz"], "negationValue": false, "isTemplateFilter": true}, 
             {"lpe": ["not", ["=", ["column", "vNetwork.forecast_day_1"], "777"]], "dimId": "vNetwork.forecast_day_1", "predicate": "=", "filterValues": ["777"], "negationValue": true, "isTemplateFilter": false}, 
             {"lpe": ["not", ["in", ["column", "vNetwork.direct_path_io"], ["[", "False", "True"]]], "dimId": "vNetwork.direct_path_io", "predicate": "in", "filterValues": ["False", "True"], "negationValue": true, "isTemplateFilter": true}], "sourceId": "rvtools"}
,
            {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
            "SELECT cluster,os_according_to_the_vmware_tools,connected FROM vNetwork WHERE period_day > '2019-09-11' and os_according_to_the_configuration_file IN ('Debian GNU/Linux 10 (64-bit)','Debian GNU/Linux 5 (32-bit)','Debian GNU/Linux 5 (64-bit)','Debian GNU/Linux 6 (64-bit)','Debian GNU/Linux 7 (64-bit)','Debian GNU/Linux 8 (64-bit)','FreeBSD Pre-11 versions (32-bit)','Microsoft Windows 10 (64-bit)','Microsoft Windows 7 (32-bit)') and not softwarelic1c = 'xxx' and starts_connected ~ 'zzz' and not forecast_day_1 = '777' and not direct_path_io IN ('False','True') ORDER BY cluster,os_according_to_the_vmware_tools DESC"
        );



        assert.equal( lpe.generate_report_sql(
            {"columns": [{"dimId": "vNetwork.period_day", "group": "Periods", "title": "DAY"}], "filters": [{"lpe": ["between", ["column", "vNetwork.period_month"], "2019-09-10", "2019-09-20"], "dimId": "vNetwork.period_month", "predicate": "between", "filterValues": ["2019-09-10", "2019-09-20"], "negationValue": false, "isTemplateFilter": false}], "sourceId": "rvtools"}            ,
           {"period_type_list":[-1, '2',3,"4", {"a":[1,2,3,'sdf']}], "period": {"title":"Noyabr"}}),
           "SELECT period_day FROM vNetwork WHERE (period_month BETWEEN '2019-09-10' AND '2019-09-20')"
       );
    });




   
});




