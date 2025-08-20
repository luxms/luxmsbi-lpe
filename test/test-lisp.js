var assert = require('assert');
var lpe = require('../dist/lpe');

let skipFunctions = {
  toStart1: (val) => {
    return lpe.makeSkipForm(res => {
      return `Start1 ${res}`
    });
  },
  toStart2: (val) => {
    return lpe.makeSkipForm(res => {
      return `Start2 ${res}`
    });
  },
  toStartAst1: lpe.makeSF((ast, ctx, rs) => {
    return lpe.makeSkipForm(
      res => { return `Ast1 ${res}`}, 
      [ [ "'", '20250203' ], [ "'", 'w' ] ]
    );
  }),
  toStartAst2: lpe.makeSF((ast, ctx, rs) => {
    return lpe.makeSkipForm(res => {
      return `Ast2 ${res}`
    });
  })
}


describe('LISP tests', function () {
  it('should resolve js-constants', function () {
    assert.deepEqual(lpe.eval_lisp(1), 1);
    assert.deepEqual(lpe.eval_lisp(false), false);
    assert.deepEqual(lpe.eval_lisp(true), true);
    assert.deepEqual(lpe.eval_lisp("Hello World"), "Hello World");
    assert.deepEqual(lpe.eval_lisp([]), null);
    assert.deepEqual(lpe.eval_lisp(null), null);
  });

  it('should resolve built-in lisp constants', function () {
    assert.deepEqual(lpe.eval_lisp("#t"), true);
    assert.deepEqual(lpe.eval_lisp("#f"), false);
    assert.deepEqual(lpe.eval_lisp("NIL"), null);
  });

  it('should run let special form', function () {
    assert.deepEqual(lpe.eval_lisp(["let", { "foo": 2 }, "foo"]), 2);
    assert.deepEqual(lpe.eval_lisp(["let", [["foo", 2],["bar",3]], ["+","foo","bar"]]), 5);
    assert.deepEqual(lpe.eval_lisp(["let", ["foo", 2], "foo"]), 2);
    assert.deepEqual(lpe.eval_lisp( lpe.parse('let(foo(2), foo)')), 2);
    assert.deepEqual(lpe.eval_lisp( lpe.parse('let([foo,3], foo)')), 3);
    assert.deepEqual(lpe.eval_lisp( lpe.parse('let([[foo,3],[bar,4]], foo+bar)')), 7);
  });

  it('should skip current realization and run lower', function () {
    const sf = skipFunctions;
    //toStart('20240203', 'w')
    assert.deepEqual(lpe.eval_lisp(
      ["toStart", ["'", "20240203"], ["'", "w"]],
      [{toStart: sf.toStart1}, [{toStart: sf.toStartAst1}, {toStart: sf.toStart2}], {toStart: sf.toStartAst2}]
    ), "Start1 Ast1 Start2 Ast2 2025-02-03");
  });

  it('should allow hash changes declared with let', function () {
    assert.deepEqual(lpe.eval_lisp(["let", ["foo", { "a": 33 }], ['begin', [".-", "foo", "a", ["*", 10, [".-", "foo", "a"]]], "foo"]]), { "a": 330 });
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(a . 3 . 1)'), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(set(a . 3 , 2, "Hoy"), a)'), { "a": { "3": [300, 600] } }),
      {
        '3': [
          300,
          600,
          'Hoy'
        ]
      });
  });

  it('operator =', function () {
    assert.deepEqual(lpe.eval_lisp(["=", 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, 1]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, ["-", 2, 1]]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 2]), false);
    assert.deepEqual(lpe.eval_lisp(["=", 1, 1, 2]), false);
    assert.deepEqual(lpe.eval_lisp(["=", 0]), true);
    assert.deepEqual(lpe.eval_lisp(["=", 0, null]), false);
  });

  it('if', function () {
    assert.deepEqual(lpe.eval_lisp(["if", true, 1, 2]), 1);
    assert.deepEqual(lpe.eval_lisp(["if", false, 1, 2]), 2);
    assert.deepEqual(lpe.eval_lisp(["if", "a", 1, 2], { a: true }), 1);
    assert.deepEqual(lpe.eval_lisp( lpe.parse('if(c=null, 1, false)')  , { a: true , b: true}), 1);
    assert.deepEqual(lpe.eval_lisp(["if", "a", 1, 2], {}), 2);
    assert.deepEqual(lpe.eval_lisp(["if", ["=", "a", ["'", "a"]], 1, 2], { a: "a" }), 1);
    assert.deepEqual(lpe.eval_lisp(["if", true, 1], {}), 1);
    assert.deepEqual(lpe.eval_lisp(["if", false, 1], {}), undefined);
    assert.deepEqual(lpe.eval_lisp(["if", false, 1, true, 2], {}), 2);                                    // if (false) 1; else if (true) 2; else undefined;
    assert.deepEqual(lpe.eval_lisp(["if", false, 1, false, 2], {}), undefined);                           // if (false) 1; else if (false) 2; else undefined;
    assert.deepEqual(lpe.eval_lisp(["if", undefined, undefined, undefined, undefined, 2], {}), 2);        // if (undefined) undefined; else if (undefined) undefined; else 2;
    assert.deepEqual(lpe.eval_lisp(["if", true, 1, false, 2, 3], {}), 1);                                 // if (true) 1; else if (false) 2; else 3;
    assert.deepEqual(lpe.eval_lisp(["if", false, 1, false, 2, true, 3, 4], {}), 3);                       // if (false) 1; else if (false) 2; else if (true) 3; else 4
  });


  it('nested struct if', function () {
    assert.deepEqual(lpe.eval_lpe("if(http.req.vars.dataset='databoring' and http.req.vars.table='configs', true, false)", {"http":{"req":{"vars":{"table":"configs","dataset":"databoring"}}}}, {resolveString: true}), true);
  });

  it('arrays', function () {
    assert.deepEqual(lpe.eval_lisp(["sort", ["[", 3, 2, 1]]), [1, 2, 3]);
    assert.deepEqual(lpe.eval_lisp(["min", ["[", 3, 2, 1]]), 1);
    assert.deepEqual(lpe.eval_lisp(["max", ["[", 3, 2, 1]]), 3);
  });

  it('eval_ast', function () {
    assert.deepEqual(lpe.eval_lisp(
        lpe.parse(`eval_ast(json_parse("[\\"+\\", 1, 2]"))`)
      ), 3
    );
    assert.deepEqual(lpe.eval_lisp(["eval_ast", ["[", "+", 1, 2]]), 3);
  });

  it('and or not', function () {
    assert.deepEqual(lpe.eval_lpe('a or b', {"a":123}, {resolveString: true}), 123);
    assert.deepEqual(lpe.eval_lpe('a or b', {"a":123}, {resolveString: false}), 123);
    assert.deepEqual(lpe.eval_lpe('a or b', {"aaa":123}, {resolveString: true}), "a");
    assert.deepEqual(lpe.eval_lpe('a or b', {"aaa":123}, {resolveString: false}), null);   
  });

  /*
  it('concat', function () {
    assert.deepEqual(lpe.eval_lisp( lpe.parse( 'concat( if(c=null, 1, false), "abc")'), { a: true , b: true}), '1abc');
  });
  */

  it('get-in', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(a . 3 . 1)'), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, ["3",1])'), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in("a", ["3",1])'), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse("get_in('a', ['3',1])"), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, [3,1])'), { "a": { "3": [300, 600] } }), 600);
    assert.deepEqual(lpe.eval_lisp(lpe.parse('get_in(a, [3,1,0,"j"])'), { "a": { "3": [300, 600] } }), undefined);
  });



  it('assoc_in', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["4","nkey"], 100),a)'), { "a": { "3": [300, 600], "4": {} } }),
      {
        '3': [
          300,
          600,
        ],
        "4": {
          "nkey": 100
        }
      });

    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["4"], 100),a)'), { "a": { "3": [300, 600], "4": 1 } }),
      {
        '3': [
          300,
          600,
        ],
        "4": 100
      });

    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["4","newkey"], "set"),a)'), { "a": { "3": [300, 600], "4": {} } }),
      {
        '3': [
          300,
          600,
        ],
        "4": {
          "newkey": "set"
        }
      });

    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["4","newkey"], 100),a)'), { "a": { "3": [300, 600], "4": {} } }),
      {
        '3': [
          300,
          600,
        ],
        "4": {
          "newkey": 100
        }
      });


    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["5","newkey"], 100),a)'), { "a": { "3": [300, 600] } }),
      {
        '3': [
          300,
          600,
        ],
        "5": {
          "newkey": 100
        }
      });

    let a = []
    a[2] = {
      "newkey": 100
    }

    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(a, ["5", 2, "newkey"], 100),a)'), { "a": { "3": [300, 600] } }),
      {
        '3': [
          300,
          600,
        ],
        "5": a
      });

    });


    it('cp', function () {
      let a = []
      a[2] = {
        "newkey": [
          300,
          600
        ]
      }
      // в get_in не получается использовать a без кавычек, потом надо пофиксить
      assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(cp( [a, "3"], ["a", "5", 2, "newkey"]),a)'), { "a": { "3": [300, 600] } }),
      {
        '3': [
          300,
          600,
        ],
        "5": a
      });

      assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(cp( ["a", "3"], ["a", "5", 2, "newkey"]),a)'), { "a": { "3": [300, 600] } }),
      {
        '3': [
          300,
          600,
        ],
        "5": a
      });
  });

  it('ctx', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('ctx(a,b)'), { "a": "1","b":2, "c":3 }),
    { "a": "1","b":2})
  });

  it('split', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('split("asd.dfg",".").1'), { "a": "1","b":2, "c":3 }),
    "dfg");

    assert.deepEqual(lpe.eval_lisp(lpe.parse('assoc_in(db, ["adm","users","sys_config","domain"], split(get_in(http, [ "resp", "body", "userPrincipalName"]),"@").1)'), { "db":{},"http":{"resp":{"body":{"userPrincipalName":"a@b.c"}}}}),
    {
      domain: 'b.c'
    })
  });

  it('complex', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(db, ["adm","users","sys_config","groups"], get_in(http, [ "resp", "body", "groups"])), ctx(db))'),
    { "db":{},"http":{"resp":{"body":{"sub": "0fa6f0f5-b3e9-4579-a759-daf4159b717e", "name": "Dima Dorofeev", "email": "dima@yasp.ru", "groups": ["/corp-wifi", "/ipausers", "/openshift", "/harbor", "/awx-dev", "/inventory-writers"], "given_name": "Dima", "family_name": "Dorofeev", "userPrincipalName": "ddorofeev@SPB.LUXMS.COM", "preferred_username": "ddorofeev"}}}}),
    {
      "db": {
        "adm": {
          "users": {
            "sys_config": {
              "groups": [
                "/corp-wifi",
                "/ipausers",
                "/openshift",
                "/harbor",
                "/awx-dev",
                "/inventory-writers"
              ]
            }
          }
        }
      }
  })
  });

  it('complex', function () {
    assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(assoc_in(db, ["adm","users","sys_config","groups"],  [ "my-grp" ]), ctx(db))'),
    { "db":{},"http":{"resp":{"body":{"sub": "0fa6f0f5-b3e9-4579-a759-daf4159b717e", "name": "Dima Dorofeev", "email": "dima@yasp.ru", "groups": ["/corp-wifi", "/ipausers", "/openshift", "/harbor", "/awx-dev", "/inventory-writers"], "given_name": "Dima", "family_name": "Dorofeev", "userPrincipalName": "ddorofeev@SPB.LUXMS.COM", "preferred_username": "ddorofeev"}}}}),
    {
      "db": {
        "adm": {
          "users": {
            "sys_config": {
              "groups": [
                "my-grp"
              ]
            }
          }
        }
      }
  })
  });

  it('named and default args', function () {
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2, c := 3)'), {}), 
      11
    );

    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2)'), {}), 
      NaN
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2, b := 10, c := 3)'), {}), 
      16
    );

    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(b := 10, c := 3)'), {}),
      NaN 
    );

    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2, c := 3, d := 4)'), {}),
      11
    );

    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2, c := null)'), {}),
      5
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(c := 3, a := 2)'), {}),
      11
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a()'), {}),
      NaN 
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2 + 3, c := 1 + 2)'), {}),
      20
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a := 1, b := 5, c := 2], b + a * c)) a()'), {}),
      7
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a := 1, b := 5, c := 2], b + a * c)) a(b := 10)'), {}),
      12
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a := 1, b := 5, c := 2], b + a * c)) a(a := 3, b := 10, c := 4)'), {}),
      22
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + a * c)) a(2, c := "string")'), {}),
      NaN
    );
    
    assert.deepEqual(
      lpe.eval_lisp(lpe.parse('def(a, fn([a, b := 5, c], b + c(a))) a(2, c := fn(x, x + 1))'), {}),
      8 
    );
  });
  

  it('copy to new branch', function () {
  assert.deepEqual(lpe.eval_lisp(lpe.parse('begin(cp(  ["a", "3"], ["b", "5", 0, "newkey"] ), cp(  ["a", "3"], ["b", "5", 0, "newkey1"] ), ctx(b))'), { "b":{}, "a": { "3": [300, 600] } }),
  {
     "b": {
       "5": [
         {
           "newkey": [
             300,
             600
           ],
           "newkey1": [
            300,
            600
          ]
         }
       ]
     }});
});

});
