/**
 *  miniMAL lisp interpreter
 *  Copyright (C) 2014 Joel Martin
 *  Licensed under MPL 2.0
 *  https://github.com/kanaka/mal
 * 
 */
/**
 *  The code has been reworked to suite LuxmsBI needs
 *  by esix & Dmitry Dorofeev
 *  2017-2019
 */

import console from './console/console';


const isArray = (arg) => Object.prototype.toString.call(arg) === '[object Array]';


/**
 * Get or Set variable in context
 * @param {*} ctx - array, hashmap or function that stores variables 
 * @param {*} varName - the name of variable
 * @param {*} value - optional value to set (undefied if get)
 */
function $var$(ctx, varName, value) {
  if (isArray(ctx)) {                                                           // contexts chain
    for (let theCtx of ctx) {
      const result = $var$(theCtx, varName);
      if (result === undefined) continue;                                       // no such var in context
      if (value === undefined) return result;                                   // get => we've got a result
      return $var$(theCtx, varName, value);                                     // set => redirect 'set' to context with variable.
    }
    if (value === undefined) return undefined;                                  // get => variable not found in all contexts
    if (ctx.length) $var$(ctx[0], varName, value);                              // set => set variable to HEAD context
    return undefined;                                                           // ??? ctx.length = 0
  }
  
  if (typeof ctx === 'function') return ctx(varName, value);

  if (typeof ctx === 'object' && ctx !== null) {
    return (value === undefined) ? ctx[varName] : (ctx[varName] = value);
  }

  return undefined;
}


const STDLIB = {
  // 'js': eval,
  eval_context: eval_context,                           // TODO: remove
  JSON: JSON,
  console: console,
  eval: (a) => EVAL(a, STDLIB),
};


function eval_context(ast, ctx)   {
  var _ctx = {};
  for(var key in STDLIB) _ctx[key] = STDLIB[key];
  for(var key in ctx) _ctx[key] = ctx[key];
  return EVAL(ast, _ctx);
}


STDLIB["macroexpand"] = function(a) { return macroexpand(a, STDLIB); };

// These could all also be interop
STDLIB["="]     = function(a,b) { return a === b; }
STDLIB["<"]     = function(a,b) { return a<b; }
STDLIB[">"]     = function(a,b) { return a>b; }
STDLIB["+"]     = function()    { return Array.prototype.reduce.call(arguments, function (a,b) {return a+b}); }
STDLIB["-"]     = function(a,b) { return b===undefined?-a:a-b; }
STDLIB["*"]     = function()    { return Array.prototype.reduce.call(arguments, function (a,b) { return a*b}); }
STDLIB["/"]     = function(a,b) { return a/b; }
STDLIB["isa"]   = function(a,b) { return a instanceof b; }
STDLIB["type"]  = function(a)   { return typeof a; }
// new expecting real object as a argument, can not process string names...
STDLIB["new"]   = function(a)   { return new (a.bind.apply(a, arguments)); }
STDLIB["del"]   = function(a,b) { return delete a[b]; }
STDLIB["list"]  = function() { return Array.prototype.slice.call(arguments); }
STDLIB["vector"]  = (...args) => args,
STDLIB["map"]   = function(a,b) { return b.map(a); }
STDLIB["throw"] = function(a)   { throw(a); }
STDLIB["identity"] = function(a) {return a;}


// for each array element, get property value, present result as array.
STDLIB["pluck"] = function(c,k) { return c.map(function(el){return el[k]}); };


// Shortcut for using RegExp
STDLIB["RegExp"] = function(a) { return RegExp.apply(null, arguments); };


STDLIB["'"] = function(a) {return a.toString();}
STDLIB['"'] = function(a) {return a.toString();}
STDLIB["["] = function() { return Array.prototype.slice.call(arguments); };


STDLIB["read-string"] = function(a) { return JSON.parse(a); }
// E["slurp"] = function(a)   { return require('fs').readFileSync(a,'utf-8'); }
// E["load-file"] = function(a) { return EVAL(JSON.parse(E["slurp"](a)),E);  }


STDLIB["rep"] = function (a) {
  return JSON.stringify(EVAL(JSON.parse(a), STDLIB));
};


STDLIB["()"] = function() {
  return Array.prototype.slice.call(arguments).splice(1);
};
STDLIB["()"].ast = [[],{},[],1]; // mark as macro


STDLIB["->"] = function() {
  // thread first macro
  // императивная лапша для макроса ->
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  var acc = arguments[0];
  var ast = Array.prototype.slice.call(arguments);
  for(var i = 1; i < ast.length; i++) {
    var arr = ast[i];
    if (!Array.isArray(arr)) {
      //это может быть обращение к хэшу или массиву через индекс или ключ....
      arr = [".-", acc, arr];
    } else if (arr[0] === "()" && arr.length == 2 && (typeof(arr[1]) === "string" || typeof(arr[1]) === "number")) {
      arr = [".-", acc, arr[1]];
    } else {
      // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      arr.splice(1, 0, acc);
    }
    acc = arr;
    // console.log("->", JSON.stringify(acc));
  }
  return acc;
  /// end of thread first macro
};
STDLIB["->"].ast = [[],{},[],1]; // mark as macro


STDLIB["->>"] = function() {
  // thread last macro
  // императивная лапша для макроса ->>
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  var acc = arguments[0];
  var ast = Array.prototype.slice.call(arguments);
  for(var i = 1; i < ast.length; i++) {
    ast[i].push(acc);
    acc = ast[i];
    //console.log("->>", JSON.stringify(acc));
  }
  return acc;
  /// end of thread first macro
};
STDLIB["->>"].ast = [[],{},[],1]; // mark as macro


/// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
/// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
/// invoke хорошо стыкуется с ->
STDLIB["invoke"] = function() {
  var ast = Array.prototype.slice.call(arguments);
  ast.splice(0,0,".");
  return ast;
};
STDLIB["invoke"].ast = [[],{},[],1]; // mark as macro


var minimal = ["do",
  // этот new ждёт на вход функцию a - создать regExp из строчки "RegExp" не выйдет
  ["def", "new", ["fn", ["a", "&", "b"],
    [".", "Reflect", ["`", "construct"], "a", "b"]]],
  ["def", "del", ["fn", ["a", "b"],
    [".", "Reflect", ["`", "deleteProperty"], "a", "b"]]],
  ["def", "map", ["fn", ["a", "b"],
    [".", "b", ["`", "map"], ["fn", ["x"], ["a", "x"]]]]],
  ["def", "list", ["fn", ["&", "a"], "a"]],
  ["def", ">=", ["fn", ["a", "b"],
    ["if", ["<", "a", "b"], false, true]]],
  ["def", ">", ["fn", ["a", "b"],
    ["if", [">=", "a", "b"],
      ["if", ["=", "a", "b"], false, true],
      false]]],
  ["def", "<=", ["fn", ["a", "b"],
    ["if", [">", "a", "b"], false, true]]],

  ["def", "classOf", ["fn", ["a"],
    [".", [".-", [".-", "Object", ["`", "prototype"]], ["`", "toString"]],
      ["`", "call"], "a"]]],

  ["def", "not", ["fn", ["a"], ["if", "a", false, true]]],

  ["def", "null?", ["fn", ["a"], ["=", null, "a"]]],
  ["def", "true?", ["fn", ["a"], ["=", true, "a"]]],
  ["def", "false?", ["fn", ["a"], ["=", false, "a"]]],
  ["def", "string?", ["fn", ["a"],
    ["if", ["=", "a", null],
      false,
      ["=", ["`", "String"],
        [".-", [".-", "a", ["`", "constructor"]],
          ["`", "name"]]]]]],

  ["def", "pr-str", ["fn", ["&", "a"],
    [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"],
      ["`", "join"], ["`", " "]]]],
  ["def", "str", ["fn", ["&", "a"],
    [".", ["map", ["fn", ["x"],
      ["if", ["string?", "x"],
        "x",
        [".", "JSON", ["`", "stringify"], "x"]]],
      "a"],
      ["`", "join"], ["`", ""]]]],
  ["def", "prn", ["fn", ["&", "a"],
    ["do", [".", "console", ["`", "log"],
      [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"],
        ["`", "join"], ["`", " "]]],
      null]]],
  ["def", "println", ["fn", ["&", "a"],
    ["do", [".", "console", ["`", "log"],
      [".", ["map", ["fn", ["x"],
        ["if", ["string?", "x"],
          "x",
          [".", "JSON", ["`", "stringify"], "x"]]],
        "a"],
        ["`", "join"], ["`", " "]]],
      null]]],

  ["def", "list?", ["fn", ["a"],
    [".", "Array", ["`", "isArray"], "a"]]],
  ["def", "contains?", ["fn", ["a", "b"],
    [".", "a", ["`", "hasOwnProperty"], "b"]]],
  ["def", "get", ["fn", ["a", "b"],
    ["if", ["contains?", "a", "b"], [".-", "a", "b"], null]]],
  ["def", "set", ["fn", ["a", "b", "c"],
    ["do", [".-", "a", "b", "c"], "a"]]],
  ["def", "keys", ["fn", ["a"],
    [".", "Object", ["`", "keys"], "a"]]],
  ["def", "vals", ["fn", ["a"],
    [".", "Object", ["`", "values"], "a"]]],

  ["def", "cons", ["fn", ["a", "b"],
    [".", ["`", []],
      ["`", "concat"], ["list", "a"], "b"]]],
  ["def", "concat", ["fn", ["&", "a"],
    [".", [".-", ["list"], ["`", "concat"]],
      ["`", "apply"], ["list"], "a"]]],
  ["def", "nth", "get"],
  ["def", "first", ["fn", ["a"],
    ["if", [">", [".-", "a", ["`", "length"]], 0],
      ["nth", "a", 0],
      null]]],
  ["def", "last", ["fn", ["a"],
    ["nth", "a", ["-", [".-", "a", ["`", "length"]], 1]]]],
  ["def", "count", ["fn", ["a"],
    [".-", "a", ["`", "length"]]]],
  ["def", "empty?", ["fn", ["a"],
    ["if", ["list?", "a"],
      ["=", 0, [".-", "a", ["`", "length"]]],
      ["=", "a", null]]]],
  ["def", "slice", ["fn", ["a", "b", "&", "end"],
    [".", "a", ["`", "slice"], "b",
      ["if", [">", [".-", "end", ["`", "length"]], 0],
        ["get", "end", 0],
        [".-", "a", ["`", "length"]]]]]],
  ["def", "rest", ["fn", ["a"], ["slice", "a", 1]]],

  ["def", "apply", ["fn", ["f", "&", "b"],
    [".", "f", ["`", "apply"], "f",
      ["concat", ["slice", "b", 0, -1], ["last", "b"]]]]],

  ["def", "and", ["~", ["fn", ["&", "xs"],
    ["if", ["empty?", "xs"],
      true,
      ["if", ["=", 1, [".-", "xs", ["`", "length"]]],
        ["first", "xs"],
        ["list", ["`", "let"], ["list", ["`", "__and"], ["first", "xs"]],
          ["list", ["`", "if"], ["`", "__and"],
            ["concat", ["`", ["and"]], ["rest", "xs"]],
            ["`", "__and"]]]]]]]],

  ["def", "or", ["~", ["fn", ["&", "xs"],
    ["if", ["empty?", "xs"],
      null,
      ["if", ["=", 1, [".-", "xs", ["`", "length"]]],
        ["first", "xs"],
        ["list", ["`", "let"], ["list", ["`", "__or"], ["first", "xs"]],
          ["list", ["`", "if"], ["`", "__or"],
            ["`", "__or"],
            ["concat", ["`", ["or"]], ["rest", "xs"]]]]]]]]],
  null
];

EVAL(minimal, STDLIB);


function macroexpand(ast, ctx) {
  while (Array.isArray(ast)
      && (typeof ast[0] == "string")
      && ast[0] in ctx
      && ctx[ast[0]].ast
      && ctx[ast[0]].ast[3]) { // Это макрос! 3-й элемент макроса установлен в 1 через push
    //console.log("MACRO-Expand ast0: " + JSON.stringify(ast[0]));
    ast = ctx[ast[0]].apply(ctx[ast[0]], ast.slice(1));
    //console.log( "MACRO-Expand: " + JSON.stringify(ast));
  }
  return ast;
}


function env_bind(ast, ctx, exprs) {
  // Return new Env with symbols in ast bound to
  // corresponding values in exprs
  ctx = Object.create(ctx);
  for (var i=0; i<ast.length; i++) {
    if (ast[i] == "&") {
      // variable length arguments
      ctx[ast[i+1]] = Array.prototype.slice.call(exprs, i);
      break;
    } else {
      ctx[ast[i]] = exprs[i];
    }
  }
  return ctx;
}


function eval_ast(ast, ctx) {
  if (Array.isArray(ast)) {                       // list?
    return ast.map(e => EVAL(e, ctx));
  }

  if (typeof ast == 'string') {
    const value = $var$(ctx, ast);

    if (value !== undefined) {                    // variable
      return value;
    }

    // if string and not in ctx:
    return ast;
  }

  return ast;
}


function EVAL(ast, ctx) {
  while (true) {
    if (!Array.isArray(ast)) return eval_ast(ast, ctx);
    // apply
    ast = macroexpand(ast, ctx);
    if (!Array.isArray(ast)) return ast;

    if (ast[0] === "def") {        // update current environment
      return ctx[ast[1]] = EVAL(ast[2], ctx);

    } else if (ast[0] === "~") {  // mark as macro
      var f = EVAL(ast[1], ctx);  // eval regular function
      f.ast.push(1); // mark as macro
      return f;
    } else if (ast[0] === "let") { // new environment with bindings
      ctx = Object.create(ctx);
      for (var i in ast[1]) {
        if (i%2) {
          ctx[ast[1][i-1]] = EVAL(ast[1][i], ctx);
        }
      }
      ast = ast[2]; // TCO
    } else if (ast[0] === "`") {   // quote (unevaluated)
      return ast[1];
    } else if (ast[0] === ".-") {  // get or set attribute
      //console.log(".-", JSON.stringify(ast));
      var el = eval_ast(ast.slice(1), ctx);
      //console.log(".- AFTER eval", JSON.stringify(el));
      var x = el[0][el[1]];
      return 2 in el ? el[0][el[1]] = el[2] : x;
    } else if (ast[0] == ".") {   // call object method
      var el = eval_ast(ast.slice(1), ctx);
      var x = el[0][el[1]];
      //console.dir(el);
      //console.dir(ast);
      //console.log(x);
      return x.apply(el[0], el.slice(2));
    } else if (ast[0] == "try") { // try/catch
      try {
        return EVAL(ast[1], ctx);
      } catch (e) {
        return EVAL(ast[2][2], env_bind([ast[2][1]], ctx, [e]));
      }
    } else if (ast[0] == "do") {  // multiple forms (for side-effects)
      var el = eval_ast(ast.slice(1,ast.length-1), ctx);
      ast = ast[ast.length-1]; // TCO
    } else if (ast[0] == "if") {  // branching conditional
      ast = EVAL(ast[1], ctx) ? ast[2] : ast[3]; // TCO
    } else if (ast[0] == "fn") {  // define new function (lambda)
      var f = function() {
        return EVAL(ast[2], env_bind(ast[1], ctx, arguments));
      }
      f.ast = [ast[2], ctx, ast[1]]; // f.ast compresses more than f.data
      return f;
    } else if (ast[0] == "||") {  // logical or/ returns true or false
      for (var i=1; i<ast.length; i++) {
        if (EVAL(ast[i], ctx)) {
          return true;
        }
      }
      return false;
    } else if (ast[0] == "&&") {  // logical and/ returns true or false
      for (var i=1; i<ast.length; i++) {
        if (!EVAL(ast[i], ctx)) {
          return false;
        }
      }
      return true;

    } else {                      // invoke list form
      var el = eval_ast(ast, ctx);
      var f = el[0];
      if (f.ast) {
        ast = f.ast[0];
        ctx = env_bind(f.ast[2], f.ast[1], el.slice(1)); // TCO
      } else {
        return f.apply(f, el.slice(1))
      }
    }
  }
} // EVAL


function eval_context(ast, ctx) {
  debugger;
  var _ctx = {};
  for(var key in STDLIB) _ctx[key] = STDLIB[key];
  for(var key in ctx) _ctx[key] = ctx[key];
  return EVAL(ast, _ctx);
}


// Use with care
export function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: (ast) => eval_context(ast, ctx),
    val: (varName, value) => $var$(varName, value),
  }
}


export function eval_lisp(ast, ctx) {
  const result = eval_context(ast, ctx);

  if (typeof(result) == "function") {
    return '["function"]';
  } else {
    return result;
  }
}


export function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}
