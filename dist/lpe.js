/** [LPE]  Version: 1.0.0 - 2019/02/11 14:49:35 */ 
 (function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["lpe"] = factory();
	else
		root["lpe"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = console;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
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

exports.init_lisp = init_lisp;
exports.eval_lisp = eval_lisp;
exports.evaluate = evaluate;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isArray = function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
};

/**
 * Get or Set variable in context
 * @param {*} ctx - array, hashmap or function that stores variables 
 * @param {*} varName - the name of variable
 * @param {*} value - optional value to set (undefied if get)
 */
function $var$(ctx, varName, value) {
  if (isArray(ctx)) {
    // contexts chain
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = ctx[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var theCtx = _step.value;

        var result = $var$(theCtx, varName);
        if (result === undefined) continue; // no such var in context
        if (value === undefined) return result; // get => we've got a result
        return $var$(theCtx, varName, value); // set => redirect 'set' to context with variable.
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    if (value === undefined) return undefined; // get => variable not found in all contexts
    if (ctx.length) $var$(ctx[0], varName, value); // set => set variable to HEAD context
    return undefined; // ??? ctx.length = 0
  }

  if (typeof ctx === 'function') return ctx(varName, value);

  if ((typeof ctx === 'undefined' ? 'undefined' : _typeof(ctx)) === 'object' && ctx !== null) {
    return value === undefined ? ctx[varName] : ctx[varName] = value;
  }

  return undefined;
}

var STDLIB = {
  // 'js': eval,
  eval_context: eval_context, // TODO: remove
  JSON: JSON,
  console: _console2.default,
  eval: function _eval(a) {
    return EVAL(a, STDLIB);
  }
};

function eval_context(ast, ctx) {
  var _ctx = {};
  for (var key in STDLIB) {
    _ctx[key] = STDLIB[key];
  }for (var key in ctx) {
    _ctx[key] = ctx[key];
  }return EVAL(ast, _ctx);
}

STDLIB["macroexpand"] = function (a) {
  return macroexpand(a, STDLIB);
};

// These could all also be interop
STDLIB["="] = function (a, b) {
  return a === b;
};
STDLIB["<"] = function (a, b) {
  return a < b;
};
STDLIB[">"] = function (a, b) {
  return a > b;
};
STDLIB["+"] = function () {
  return Array.prototype.reduce.call(arguments, function (a, b) {
    return a + b;
  });
};
STDLIB["-"] = function (a, b) {
  return b === undefined ? -a : a - b;
};
STDLIB["*"] = function () {
  return Array.prototype.reduce.call(arguments, function (a, b) {
    return a * b;
  });
};
STDLIB["/"] = function (a, b) {
  return a / b;
};
STDLIB["isa"] = function (a, b) {
  return a instanceof b;
};
STDLIB["type"] = function (a) {
  return typeof a === 'undefined' ? 'undefined' : _typeof(a);
};
// new expecting real object as a argument, can not process string names...
STDLIB["new"] = function (a) {
  return new (a.bind.apply(a, arguments))();
};
STDLIB["del"] = function (a, b) {
  return delete a[b];
};
STDLIB["list"] = function () {
  return Array.prototype.slice.call(arguments);
};
STDLIB["vector"] = function () {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return args;
}, STDLIB["map"] = function (a, b) {
  return b.map(a);
};
STDLIB["throw"] = function (a) {
  throw a;
};
STDLIB["identity"] = function (a) {
  return a;
};

// for each array element, get property value, present result as array.
STDLIB["pluck"] = function (c, k) {
  return c.map(function (el) {
    return el[k];
  });
};

// Shortcut for using RegExp
STDLIB["RegExp"] = function (a) {
  return RegExp.apply(null, arguments);
};

STDLIB["'"] = function (a) {
  return a.toString();
};
STDLIB['"'] = function (a) {
  return a.toString();
};
STDLIB["["] = function () {
  return Array.prototype.slice.call(arguments);
};

STDLIB["read-string"] = function (a) {
  return JSON.parse(a);
};
// E["slurp"] = function(a)   { return require('fs').readFileSync(a,'utf-8'); }
// E["load-file"] = function(a) { return EVAL(JSON.parse(E["slurp"](a)),E);  }


STDLIB["rep"] = function (a) {
  return JSON.stringify(EVAL(JSON.parse(a), STDLIB));
};

STDLIB["()"] = function () {
  return Array.prototype.slice.call(arguments).splice(1);
};
STDLIB["()"].ast = [[], {}, [], 1]; // mark as macro


STDLIB["->"] = function () {
  // thread first macro
  // императивная лапша для макроса ->
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  var acc = arguments[0];
  var ast = Array.prototype.slice.call(arguments);
  for (var i = 1; i < ast.length; i++) {
    var arr = ast[i];
    if (!Array.isArray(arr)) {
      //это может быть обращение к хэшу или массиву через индекс или ключ....
      arr = [".-", acc, arr];
    } else if (arr[0] === "()" && arr.length == 2 && (typeof arr[1] === "string" || typeof arr[1] === "number")) {
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
STDLIB["->"].ast = [[], {}, [], 1]; // mark as macro


STDLIB["->>"] = function () {
  // thread last macro
  // императивная лапша для макроса ->>
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  var acc = arguments[0];
  var ast = Array.prototype.slice.call(arguments);
  for (var i = 1; i < ast.length; i++) {
    ast[i].push(acc);
    acc = ast[i];
    //console.log("->>", JSON.stringify(acc));
  }
  return acc;
  /// end of thread first macro
};
STDLIB["->>"].ast = [[], {}, [], 1]; // mark as macro


/// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
/// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
/// invoke хорошо стыкуется с ->
STDLIB["invoke"] = function () {
  var ast = Array.prototype.slice.call(arguments);
  ast.splice(0, 0, ".");
  return ast;
};
STDLIB["invoke"].ast = [[], {}, [], 1]; // mark as macro


var minimal = ["do",
// этот new ждёт на вход функцию a - создать regExp из строчки "RegExp" не выйдет
["def", "new", ["fn", ["a", "&", "b"], [".", "Reflect", ["`", "construct"], "a", "b"]]], ["def", "del", ["fn", ["a", "b"], [".", "Reflect", ["`", "deleteProperty"], "a", "b"]]], ["def", "map", ["fn", ["a", "b"], [".", "b", ["`", "map"], ["fn", ["x"], ["a", "x"]]]]], ["def", "list", ["fn", ["&", "a"], "a"]], ["def", ">=", ["fn", ["a", "b"], ["if", ["<", "a", "b"], false, true]]], ["def", ">", ["fn", ["a", "b"], ["if", [">=", "a", "b"], ["if", ["=", "a", "b"], false, true], false]]], ["def", "<=", ["fn", ["a", "b"], ["if", [">", "a", "b"], false, true]]], ["def", "classOf", ["fn", ["a"], [".", [".-", [".-", "Object", ["`", "prototype"]], ["`", "toString"]], ["`", "call"], "a"]]], ["def", "not", ["fn", ["a"], ["if", "a", false, true]]], ["def", "null?", ["fn", ["a"], ["=", null, "a"]]], ["def", "true?", ["fn", ["a"], ["=", true, "a"]]], ["def", "false?", ["fn", ["a"], ["=", false, "a"]]], ["def", "string?", ["fn", ["a"], ["if", ["=", "a", null], false, ["=", ["`", "String"], [".-", [".-", "a", ["`", "constructor"]], ["`", "name"]]]]]], ["def", "pr-str", ["fn", ["&", "a"], [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"], ["`", "join"], ["`", " "]]]], ["def", "str", ["fn", ["&", "a"], [".", ["map", ["fn", ["x"], ["if", ["string?", "x"], "x", [".", "JSON", ["`", "stringify"], "x"]]], "a"], ["`", "join"], ["`", ""]]]], ["def", "prn", ["fn", ["&", "a"], ["do", [".", "console", ["`", "log"], [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"], ["`", "join"], ["`", " "]]], null]]], ["def", "println", ["fn", ["&", "a"], ["do", [".", "console", ["`", "log"], [".", ["map", ["fn", ["x"], ["if", ["string?", "x"], "x", [".", "JSON", ["`", "stringify"], "x"]]], "a"], ["`", "join"], ["`", " "]]], null]]], ["def", "list?", ["fn", ["a"], [".", "Array", ["`", "isArray"], "a"]]], ["def", "contains?", ["fn", ["a", "b"], [".", "a", ["`", "hasOwnProperty"], "b"]]], ["def", "get", ["fn", ["a", "b"], ["if", ["contains?", "a", "b"], [".-", "a", "b"], null]]], ["def", "set", ["fn", ["a", "b", "c"], ["do", [".-", "a", "b", "c"], "a"]]], ["def", "keys", ["fn", ["a"], [".", "Object", ["`", "keys"], "a"]]], ["def", "vals", ["fn", ["a"], [".", "Object", ["`", "values"], "a"]]], ["def", "cons", ["fn", ["a", "b"], [".", ["`", []], ["`", "concat"], ["list", "a"], "b"]]], ["def", "concat", ["fn", ["&", "a"], [".", [".-", ["list"], ["`", "concat"]], ["`", "apply"], ["list"], "a"]]], ["def", "nth", "get"], ["def", "first", ["fn", ["a"], ["if", [">", [".-", "a", ["`", "length"]], 0], ["nth", "a", 0], null]]], ["def", "last", ["fn", ["a"], ["nth", "a", ["-", [".-", "a", ["`", "length"]], 1]]]], ["def", "count", ["fn", ["a"], [".-", "a", ["`", "length"]]]], ["def", "empty?", ["fn", ["a"], ["if", ["list?", "a"], ["=", 0, [".-", "a", ["`", "length"]]], ["=", "a", null]]]], ["def", "slice", ["fn", ["a", "b", "&", "end"], [".", "a", ["`", "slice"], "b", ["if", [">", [".-", "end", ["`", "length"]], 0], ["get", "end", 0], [".-", "a", ["`", "length"]]]]]], ["def", "rest", ["fn", ["a"], ["slice", "a", 1]]], ["def", "apply", ["fn", ["f", "&", "b"], [".", "f", ["`", "apply"], "f", ["concat", ["slice", "b", 0, -1], ["last", "b"]]]]], ["def", "and", ["~", ["fn", ["&", "xs"], ["if", ["empty?", "xs"], true, ["if", ["=", 1, [".-", "xs", ["`", "length"]]], ["first", "xs"], ["list", ["`", "let"], ["list", ["`", "__and"], ["first", "xs"]], ["list", ["`", "if"], ["`", "__and"], ["concat", ["`", ["and"]], ["rest", "xs"]], ["`", "__and"]]]]]]]], ["def", "or", ["~", ["fn", ["&", "xs"], ["if", ["empty?", "xs"], null, ["if", ["=", 1, [".-", "xs", ["`", "length"]]], ["first", "xs"], ["list", ["`", "let"], ["list", ["`", "__or"], ["first", "xs"]], ["list", ["`", "if"], ["`", "__or"], ["`", "__or"], ["concat", ["`", ["or"]], ["rest", "xs"]]]]]]]]], null];

EVAL(minimal, STDLIB);

function macroexpand(ast, ctx) {
  while (Array.isArray(ast) && typeof ast[0] == "string" && ast[0] in ctx && ctx[ast[0]].ast && ctx[ast[0]].ast[3]) {
    // Это макрос! 3-й элемент макроса установлен в 1 через push
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
  for (var i = 0; i < ast.length; i++) {
    if (ast[i] == "&") {
      // variable length arguments
      ctx[ast[i + 1]] = Array.prototype.slice.call(exprs, i);
      break;
    } else {
      ctx[ast[i]] = exprs[i];
    }
  }
  return ctx;
}

function eval_ast(ast, ctx) {
  if (Array.isArray(ast)) {
    // list?
    return ast.map(function (e) {
      return EVAL(e, ctx);
    });
  }

  if (typeof ast == 'string') {
    var value = $var$(ctx, ast);

    if (value !== undefined) {
      // variable
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

    if (ast[0] === "def") {
      // update current environment
      return ctx[ast[1]] = EVAL(ast[2], ctx);
    } else if (ast[0] === "~") {
      // mark as macro
      var f = EVAL(ast[1], ctx); // eval regular function
      f.ast.push(1); // mark as macro
      return f;
    } else if (ast[0] === "let") {
      // new environment with bindings
      ctx = Object.create(ctx);
      for (var i in ast[1]) {
        if (i % 2) {
          ctx[ast[1][i - 1]] = EVAL(ast[1][i], ctx);
        }
      }
      ast = ast[2]; // TCO
    } else if (ast[0] === "`") {
      // quote (unevaluated)
      return ast[1];
    } else if (ast[0] === ".-") {
      // get or set attribute
      //console.log(".-", JSON.stringify(ast));
      var el = eval_ast(ast.slice(1), ctx);
      //console.log(".- AFTER eval", JSON.stringify(el));
      var x = el[0][el[1]];
      return 2 in el ? el[0][el[1]] = el[2] : x;
    } else if (ast[0] == ".") {
      // call object method
      var el = eval_ast(ast.slice(1), ctx);
      var x = el[0][el[1]];
      //console.dir(el);
      //console.dir(ast);
      //console.log(x);
      return x.apply(el[0], el.slice(2));
    } else if (ast[0] == "try") {
      // try/catch
      try {
        return EVAL(ast[1], ctx);
      } catch (e) {
        return EVAL(ast[2][2], env_bind([ast[2][1]], ctx, [e]));
      }
    } else if (ast[0] == "do") {
      // multiple forms (for side-effects)
      var el = eval_ast(ast.slice(1, ast.length - 1), ctx);
      ast = ast[ast.length - 1]; // TCO
    } else if (ast[0] == "if") {
      // branching conditional
      ast = EVAL(ast[1], ctx) ? ast[2] : ast[3]; // TCO
    } else if (ast[0] == "fn") {
      // define new function (lambda)
      var f = function f() {
        return EVAL(ast[2], env_bind(ast[1], ctx, arguments));
      };
      f.ast = [ast[2], ctx, ast[1]]; // f.ast compresses more than f.data
      return f;
    } else if (ast[0] == "||") {
      // logical or/ returns true or false
      for (var i = 1; i < ast.length; i++) {
        if (EVAL(ast[i], ctx)) {
          return true;
        }
      }
      return false;
    } else if (ast[0] == "&&") {
      // logical and/ returns true or false
      for (var i = 1; i < ast.length; i++) {
        if (!EVAL(ast[i], ctx)) {
          return false;
        }
      }
      return true;
    } else {
      // invoke list form
      var el = eval_ast(ast, ctx);
      var f = el[0];
      if (f.ast) {
        ast = f.ast[0];
        ctx = env_bind(f.ast[2], f.ast[1], el.slice(1)); // TCO
      } else {
        return f.apply(f, el.slice(1));
      }
    }
  }
} // EVAL


function eval_context(ast, ctx) {
  debugger;
  var _ctx = {};
  for (var key in STDLIB) {
    _ctx[key] = STDLIB[key];
  }for (var key in ctx) {
    _ctx[key] = ctx[key];
  }return EVAL(ast, _ctx);
}

// Use with care
function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: function _eval(ast) {
      return eval_context(ast, ctx);
    },
    val: function val(varName, value) {
      return $var$(varName, value);
    }
  };
}

function eval_lisp(ast, ctx) {
  var result = eval_context(ast, ctx);

  if (typeof result == "function") {
    return '["function"]';
  } else {
    return result;
  }
}

function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LPESyntaxError = LPESyntaxError;
exports.parse = parse;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

var _lpel = __webpack_require__(6);

var _lpel2 = _interopRequireDefault(_lpel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * LuxPath expressions parser
 *
 * VERSION: 1.0.1
 * 
 * DVD: added sexpr property to the token as array to keep s-expressions.
 *      arity and first, second etc will be removed
 * 
 */

// Parser for Simplified JavaScript written in Simplified JavaScript
// From Top Down Operator Precedence
// http://javascript.crockford.com/tdop/index.html
// Douglas Crockford
// 2010-06-26
//////////////////////////////////////////////////
// Later hacked to parse LPE instead of JavaScript
// Dmitry Dorofeev
// 2017-01-20


var make_parse = function make_parse() {
  var symbol_table = {};
  var token;
  var tokens;
  var token_nr;

  // стэк для типов выражений
  var expr_scope = { pop: function pop() {} }; // для разбора логических выражений типа (A and B or C)

  // для хранения алиасов для операций
  var operator_aliases = {};

  var operator_alias = function operator_alias(from, to) {
    operator_aliases[from] = to;
  };

  var itself = function itself() {
    return this;
  };

  var scope = {
    find: function find(n) {
      var e = this,
          o;
      var s = Object.create(original_symbol);
      s.nud = itself;
      s.led = null;
      s.lbp = 0;
      return s;
    }
  };

  var expr_logical_scope = {
    pop: function pop() {
      expr_scope = this.parent;
    },
    parent: null,
    tp: "logical"
  };

  var expr_lpe_scope = {
    pop: function pop() {
      expr_scope = this.parent;
    },
    parent: null,
    tp: "lpe"
  };

  var new_expression_scope = function new_expression_scope(tp) {
    var s = expr_scope;
    expr_scope = Object.create(tp == "logical" ? expr_logical_scope : expr_lpe_scope);
    expr_scope.parent = s;
    return expr_scope;
  };

  var advance = function advance(id) {
    var a, o, t, v;
    if (id && token.id !== id) {
      makeError(token, "Got " + token.value + " but expected '" + id + "'.");
    }
    if (token_nr >= tokens.length) {
      token = symbol_table["(end)"];
      return;
    }
    t = tokens[token_nr];
    token_nr += 1;
    v = t.value;
    a = t.type;
    if (a === "name") {
      if (expr_scope.tp == "logical") {
        if (v === "or" || v === "and" || v === "not" || v === "in" || v === "is") {
          a = "operator";
          o = symbol_table[v];
          if (!o) {
            makeError(t, "Unknown logical operator.");
          }
        } else {
          o = scope.find(v);
        }
      } else {
        o = scope.find(v);
      }
    } else if (a === "operator") {
      o = symbol_table[v];
      if (!o) {
        makeError(t, "Unknown operator.");
      }
    } else if (a === "string_double") {
      o = symbol_table["(string_literal_double)"];
      a = "literal";
    } else if (a === "string_single") {
      o = symbol_table["(string_literal_single)"];
      a = "literal";
    } else if (a === "number") {
      o = symbol_table["(number_literal)"];
      a = "literal";
    } else {
      makeError(t, "Unexpected token.");
    }
    token = Object.create(o);
    token.from = t.from;
    token.to = t.to;
    token.value = v;
    token.arity = a;
    if (a == "operator") {
      token.sexpr = operator_aliases[v];
    } else {
      token.sexpr = v; // by dima
    }
    return token;
  };

  var statement = function statement() {
    var n = token,
        v;

    if (n.std) {
      advance();
      //scope.reserve(n);
      return n.std();
    }
    v = expression(0);
    //if (!v.assignment && v.id !== "(") {
    /*  if (v.id !== "(" && v.id !== "name" && v.id !== "number") {
        console.log(v);
        v.error("Bad expression statement.");
    }*/
    //advance(";");
    return v;
  };

  var statements = function statements() {
    var a = [],
        s;
    while (true) {
      //console.log(token);
      if (token.id === "(end)") {
        break;
      } else if (token.value === ';') {
        // skip optional ;
        advance();
      }
      s = statement();
      //console.log("STATEMENT ", s);
      if (s) {
        a.push(s);
      }
    }
    return a.length === 0 ? null : a.length === 1 ? a[0] : { "sexpr": ["do"].concat(a.map(function (el) {
        return el["sexpr"];
      })) };
  };

  var expression = function expression(rbp) {
    var left;
    var t = token;
    advance();
    left = t.nud();
    while (rbp < token.lbp) {
      t = token;
      advance();
      left = t.led(left);
    }
    return left;
  };

  var original_symbol = {
    nud: function nud() {
      makeError(this, "Undefined.");
    },
    led: function led(left) {
      makeError(this, "Missing operator.");
    }
  };

  var symbol = function symbol(id, bp) {
    var s = symbol_table[id];
    bp = bp || 0;
    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp;
      }
    } else {
      s = Object.create(original_symbol);
      s.id = s.value = id;
      s.lbp = bp;
      symbol_table[id] = s;
    }
    operator_alias(id, id);
    return s;
  };

  var infix = function infix(id, bp, led) {
    var s = symbol(id, bp);
    s.led = led || function (left) {
      this.first = left;
      var right = expression(bp);
      this.second = right;
      this.arity = "binary";
      this.sexpr = [this.sexpr, left.sexpr, right.sexpr];
      return this;
    };
    return s;
  };

  var infixr = function infixr(id, bp, led) {
    var s = symbol(id, bp);
    s.led = led || function (left) {
      this.first = left;
      var right = expression(bp - 1);
      this.second = right;
      this.arity = "binary";
      this.sexpr = [this.sexpr, left.sexpr, right.sexpr];
      return this;
    };
    return s;
  };

  var prefix = function prefix(id, nud) {
    var s = symbol(id);
    s.nud = nud || function () {
      // scope.reserve(this);
      var expr = expression(70);
      this.first = expr;
      this.arity = "unary";
      this.sexpr = [this.sexpr, expr.sexpr];
      return this;
    };
    return s;
  };

  symbol("(end)");
  symbol("(name)");
  symbol("(null)");
  symbol(":");
  symbol(";");
  symbol(")");
  symbol("]");
  symbol("}");

  // allow to skip values in function calls....
  var comma = symbol(",");

  symbol("(string_literal_double)").nud = function () {
    this.first = '"';
    this.arity = "unary";
    this.sexpr = ['"', this.sexpr];
    return this;
  };

  symbol("(string_literal_single)").nud = function () {
    this.first = "'";
    this.arity = "unary";
    this.sexpr = ["'", this.sexpr];
    return this;
  };

  symbol("(number_literal)").nud = itself;

  infix("?", 20, function (left) {
    // FIXME TODO - need sexpr !!!
    this.first = left;
    this.second = expression(0);
    advance(":");
    this.third = expression(0);
    this.arity = "ternary";
    return this;
  });

  infixr("&&", 30);
  infixr("∧", 30);
  operator_alias("&&", "and");
  operator_alias("∧", "and");

  infixr("||", 30);
  infixr("∨", 30);

  operator_alias("||", "or");
  operator_alias("∨", "or");

  /* will be used in logical scope */
  infixr("and", 30);
  infixr("or", 30);
  // required for SQL logical scope where a in (1,2,3)
  infixr("in", 30);
  infixr("is", 30);
  prefix("not");

  // for SQL types: '10'::BIGINT
  infixr("::", 90);

  // for SQL as
  infixr(":", 80);

  infixr('~', 40);
  infixr('!~', 40);
  infixr('=', 40);
  infixr('≠', 40);
  operator_alias('≠', '!='); // from to canonical form;

  infixr('==', 40);
  infixr('!==', 40);
  infixr('!=', 40);
  infixr('<', 40);
  infixr('<=', 40);
  infixr('≤', 40);
  operator_alias('≤', '<=');

  infixr(">", 40);
  infixr(">=", 40);
  infixr("≥", 40);
  operator_alias("≥", ">=");
  infixr("<>", 40);

  infix("+", 50);
  infix("-", 50);

  infix("*", 60);
  infix("/", 60);

  infix("(", 80, function (left) {
    var a = [];
    if (left.id === "[") {
      // FIXME TODO
      this.arity = "ternary";
      this.first = left.first;
      this.second = left.second;
      this.third = a;
    } else {
      this.arity = "binary";
      this.first = left;
      this.value = "("; // it was '(' by dima
      this.second = a;
      if ((left.arity !== "unary" || left.id !== "function") && left.arity !== "name" && left.id !== "(" && left.id !== "&&" && left.id !== "||" && left.id !== "?") {
        makeError(left, "Expected a variable name.");
      }
    }
    // dima support for missed function arguments...
    if (token.id !== ")") {
      if (false) {
        // специальный парсер для where - logical expression.
        // тут у нас выражение с использованием скобок, and, or, not и никаких запятых...
        new_expression_scope("logical");
        var e = expression(0);
        expr_scope.pop();
        a.push(e);
      } else {
        new_expression_scope("lpe");
        while (true) {
          // console.log(">" + token.arity + " NAME:" + left.value);
          if (token.id === ',') {
            a.push({
              value: null,
              arity: "literal"
            });
            advance();
          } else if (token.id === ')') {
            a.push({
              value: null,
              arity: "literal"
            });
            break;
          } else {
            new_expression_scope("logical");
            var e = expression(0);
            expr_scope.pop();
            // var e = statements();
            a.push(e);
            if (token.id !== ",") {
              break;
            }
            advance(",");
          }
        }
        expr_scope.pop();
      }
    }

    this.sexpr = [this.first.value].concat(a.map(function (el) {
      return el.sexpr;
    }));
    advance(")");
    return this;
  });

  function lift_funseq(node) {
    if (node.value === "->") {
      return lift_funseq(node.first).concat(lift_funseq(node.second));
    } else if (node.value === "()") {
      if (node.first.value === "->") {
        // если у нас в скобки взято выражение "->", то скобки можно удалить
        // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны, 
        // так как seq уже группирует вызовы в цепочку
        return [["->"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      } else {
        return lift_funseq(node.first);
      }
    } else {
      return [node.sexpr];
    }
  }

  function lift_funseq_2(node) {
    if (node.value === "->>") {
      return lift_funseq(node.first).concat(lift_funseq(node.second));
    } else if (node.value === "()") {
      if (node.first.value === "->>") {
        // если у нас в скобки взято выражение "->", то скобки можно удалить
        // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны, 
        // так как seq уже группирует вызовы в цепочку
        return [["->>"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      } else {
        return lift_funseq(node.first);
      }
    } else {
      return [node.sexpr];
    }
  }

  infix(".", 70, function (left) {
    this.first = left;
    // this.second = expression(0);
    this.second = expression(70);
    this.arity = "binary";
    this.value = "->";
    this.sexpr = ["->"].concat(lift_funseq(this));
    return this;
  });

  infix("..", 70, function (left) {
    this.first = left;
    // this.second = expression(0);
    this.second = expression(70);
    this.arity = "binary";
    this.value = "->>";
    this.sexpr = ["->>"].concat(lift_funseq_2(this));
    return this;
  });

  // WARNING HACK FIXME DIMA - добавил чтобы писать order_by(+a)
  // А также замена /table на +table в htSQL
  prefix("+");

  prefix("!");
  prefix("not"); // will be used in logical scope
  prefix("¬");
  operator_alias("!", "not");
  operator_alias("¬", "not");

  // trying to optimize, when we have negated -number
  prefix("-");

  prefix(".", function () {
    var v = expression(70);
    if (v.value !== "(") {
      makeError(v, "Only functions may have dot (.) unary operator.");
    }
    // this.first = v;
    // this.arity = "unary";
    // return this;
    // skip unary dot !!!
    return v;
  });

  prefix("(", function () {
    var e = expression(0);
    if (expr_scope.tp == "logical") {
      // we should remember all brackets to restore original user expression
      e.sexpr = ["()", e.sexpr];
    } else {
      if (e.value === "->") {
        // в скобки взято выражение из цепочки LPE вызовов, нужно запомнить скобки, делаем push "()" в текущий AST 
        e = {
          first: e,
          value: "()",
          arity: "unary",
          sexpr: ["()", e.sexpr]
        };
      }
    }
    advance(")");
    return e;
  });

  prefix("[", function () {
    var a = [];
    if (token.id !== "]") {
      while (true) {
        a.push(expression(0));
        // a.push(statements());
        if (token.id !== ",") {
          break;
        }
        advance(",");
      }
    }
    advance("]");
    this.first = a;
    this.arity = "unary";
    this.sexpr = ["["].concat(a.map(function (el) {
      return el.sexpr;
    }));
    return this;
  });

  return function (source) {
    tokens = (0, _lpel2.default)(source, '=<>!+-*&|/%^:.', '=<>&|:.');
    token_nr = 0;
    advance();
    var s = statements();
    // var s = expression(0);
    advance("(end)");
    return s;
  };
};

// Transform a token object into an exception object and throw it.
function LPESyntaxError(message) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  // this.stack = (new Error()).stack;
}

function makeError(t, message) {
  t.message = message;

  var errorDescription = JSON.stringify(t, ['name', 'message', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'], 4);

  throw new LPESyntaxError(errorDescription);
}

var parser = make_parse();
// console.log('LPE Parser initialized')


function parse(str) {
  try {
    var parseResult = parser(str); // from, to, value, arity, sexpr
    return parseResult.sexpr;
  } catch (err) {
    _console2.default.error("Error", err.message);
    _console2.default.error("Error", err.stack);
    throw err;
  }
}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               Copyright (c) 2019 Luxms Inc.
                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                               Permission is hereby granted, free of charge, to any person obtaining
                                                                                                                                                                                                                                                                               a copy of this software and associated documentation files (the "Software"),
                                                                                                                                                                                                                                                                               to deal in the Software without restriction, including without limitation
                                                                                                                                                                                                                                                                               the rights to use, copy, modify, merge, publish, distribute, sublicense,
                                                                                                                                                                                                                                                                               and/or sell copies of the Software, and to permit persons to whom the Software
                                                                                                                                                                                                                                                                               is furnished to do so, subject to the following conditions:
                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                               The above copyright notice and this permission notice shall be included in
                                                                                                                                                                                                                                                                               all copies or substantial portions of the Software.
                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                               THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
                                                                                                                                                                                                                                                                               EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
                                                                                                                                                                                                                                                                               OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
                                                                                                                                                                                                                                                                               IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
                                                                                                                                                                                                                                                                               CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
                                                                                                                                                                                                                                                                               TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                                                                                                                                                                                                                                                                               OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                                                                                                                                                                                                                                                                               */

exports.sql_where_context = sql_where_context;
exports.eval_sql_where = eval_sql_where;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

var _lpep = __webpack_require__(2);

var _utils = __webpack_require__(7);

var _lisp = __webpack_require__(1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
where - всегда возвращает слово WHERE, а потом условия. На пустом вхоже вернёт WHERE TRUE
filter - на пустом входе вернёт пустую строку
*/

function sql_where_context(_vars) {
  var _context = _vars;

  var try_to_quote_column = function try_to_quote_column(colname) {
    if (_typeof(_vars['_columns']) == 'object') {
      var h = _vars['_columns'][colname];
      if ((typeof h === 'undefined' ? 'undefined' : _typeof(h)) == "object") {
        h = h['name'].toString();
        // console.log("-: try_to_quote_column " + JSON.stringify(h));
        // console.log("-: try_to_quote_column " + (typeof h));
        if (h.length > 0) {
          // return '"' + h + '"';
          return h;
        }
      }
    }
    return colname.toString();
  };

  var try_to_quote_order_by_column = function try_to_quote_order_by_column(colname) {
    if (_typeof(_vars['_columns']) == 'object') {
      var h = _vars['_columns'][colname];
      if ((typeof h === 'undefined' ? 'undefined' : _typeof(h)) == "object") {
        var o = h['order'];
        if (o === undefined) {
          o = h['name'];
        }
        _console2.default.log("-: try_to_quote_order_by_column " + JSON.stringify(o));
        _console2.default.log("-: try_to_quote_order_by_column " + (typeof o === 'undefined' ? 'undefined' : _typeof(o)));
        if (o !== undefined && o.length > 0) {
          //return '"' + o.toString() + '"';
          return o.toString();
        }
      }
    }
    return colname.toString();
  };

  var resolve_literal = function resolve_literal(lit) {
    _console2.default.log('LITERAL ', lit, '  CONTEXT:', _vars[lit]);
    if (_vars[lit] == undefined) {
      return try_to_quote_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return (0, _lisp.eval_lisp)(lit, _vars);
    }
  };

  var resolve_order_by_literal = function resolve_order_by_literal(lit) {
    _console2.default.log('OB LITERAL ', lit, ' CONTEXT:', _vars[lit]);

    if (_vars[lit] === undefined) {
      return try_to_quote_order_by_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return (0, _lisp.eval_lisp)(lit, _vars);
    }
  };

  /* заполняем контекст функциями и макросами, заточенными на SQL */
  _context['order_by'] = function () {
    var ret = [];
    var ctx = {};
    for (var key in _vars) {
      ctx[key] = _vars[key];
    } // так как order_by будет выполнять eval_lisp, когда встретит имя стольба с минусом -a, то мы
    // с помощью макросов + и - в этом случае перехватим вызов и сделаем обработку.
    // а вот когда работает обработчик аргументов where - там eval_lisp почти никогда не вызывается...
    ctx['+'] = function (a) {
      if (a instanceof Array) {
        throw "recursive +..-";
      } else {
        return resolve_order_by_literal(a);
      }
    };
    ctx['+'].ast = [[], {}, [], 1]; // mark as macro

    ctx['-'] = function (a) {
      //console.log("-: call " + JSON.stringify(a));
      if (a instanceof Array) {
        throw "recursive -..+";
      } else {
        return resolve_order_by_literal(a) + ' ' + 'DESC';
      }
    };
    ctx['-'].ast = [[], {}, [], 1]; // mark as macro

    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Array) {
        ret.push((0, _lisp.eval_lisp)(arguments[i], ctx));
      } else {
        // try_to_quote_column берёт текст в двойные кавычки для известных столбцов!!!
        ret.push(resolve_order_by_literal(arguments[i].toString()));
      }
    }

    if (ret.length > 0) {
      return 'ORDER BY ' + ret.join(',');
    } else {
      return '';
    }
  };

  _context['order_by'].ast = [[], {}, [], 1]; // mark as macro


  _context['pg_interval'] = function (cnt, period_type) {
    var pt;
    if (period_type instanceof Object) {
      pt = period_type["unit"];
    } else {
      pt = period_type;
    }

    if (/^\d+$/.test(pt)) {
      // all numbers....
      switch (pt) {
        case 1:
          pt = 'second';break;
        case 2:
          pt = 'minute';break;
        case 3:
          pt = 'hour';break;
        case 4:
          pt = 'day';break;
        case 5:
          pt = 'week';break;
        case 6:
          pt = 'month';break;
        case 7:
          pt = 'quarter';break;
        case 8:
          pt = 'year';break;
        default:
          throw "wrong period type:" + pt;
      }
    } else {
      var reg = new RegExp("['\"]+", "g");
      pt = pt.replace(reg, "");
    }

    var regExp = new RegExp(/quarter/, "i");
    if (regExp.test(pt)) {
      return "'" + cnt * 3 + " month'::interval";
    }
    return "'" + cnt + " " + pt + "'::interval";
  };

  // filter
  _context['filter'] = function () {
    var ctx = {};
    for (var key in _vars) {
      ctx[key] = _vars[key];
    }var prnt = function prnt(ar) {
      if (ar instanceof Array) {
        if (ar[0] === '$' || ar[0] === '"' || ar[0] === "'" || ar[0] === "[" || ar[0] === 'parse_kv' || ar[0] === "=" || ar[0] === "pg_interval") {
          return (0, _lisp.eval_lisp)(ar, ctx);
        } else {
          if (ar.length == 2) {
            // unary
            if (ar[0] == "not") {
              return ar[0] + ' ' + prnt(ar[1]);
            } else if (ar[0] == "()") {
              return "(" + prnt(ar[1]) + ")";
            } else if (ar[0].match(/^[^\w]+$/)) {
              return ar[0] + prnt(ar[1]);
            } else {
              return prnt(ar[0]) + "(" + prnt(ar[1]) + ")";
            }
          } else if (ar.length == 3) {
            if (ar[0] == "->") {
              // наш LPE использует точку, как разделитель вызовов функций и кодирует её как ->
              // в логических выражениях мы это воспринимаем как ссылку на <ИМЯ СХЕМЫ>.<ИМЯ ТАБЛИЦЫ>
              //return '"' + ar[1]+ '"."' + ar[2] + '"';
              return ar[1] + '.' + ar[2];
            } else if (ar[0] == "and" || ar[0] == "or" || ar[0] == "ilike" || ar[0] == "like" || ar[0] == "in" || ar[0] == "is" || ar[0].match(/^[^\w]+$/)) {
              // имя функции не начинается с буквы
              return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);
            } else {
              return ar[0] + '(' + prnt(ar[1]) + ',' + prnt(ar[2]) + ')';
            }
          } else {
            // это неизвестная функция с неизвестным кол-вом аргументов
            return ar[0] + '(' + ar.slice(1).map(function (argel) {
              return prnt(argel);
            }).join(',') + ')';
          }
        }
      } else {
        return ar;
      }
    };

    ctx['"'] = function (el) {
      return '"' + el.toString() + '"';
    };

    ctx["'"] = function (el) {
      return "'" + el.toString() + "'";
    };

    ctx["["] = function (el) {
      return "[" + Array.prototype.slice.call(arguments).join(',') + "]";
    };

    ctx['='] = function (l, r) {
      if (r instanceof Array && r[0] == 'vector') {
        return prnt(l) + " in (" + r.slice(1).map(function (el) {
          return prnt(el);
        }).join(',') + ")";
      }
      return prnt(l) + " = " + prnt(r);
    };
    ctx['='].ast = [[], {}, [], 1]; // mark as macro

    // $(name) will quote text elements !!! suitable for generating things like WHERE title in ('a','b','c')
    // also, we should evaluate expression, if any.
    ctx['$'] = function (inexpr) {
      var expr = (0, _lisp.eval_lisp)(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context
      if (expr instanceof Array) {
        // try to print using quotes, use plv8 !!!
        return expr.map(function (el) {
          if (typeof el === "string") {
            return (0, _utils.db_quote_literal)(el);
          } else if (typeof el === "number") {
            return el;
          } else {
            return (0, _utils.db_quote_literal)(JSON.stringify(el));
          }
        }).join(',');
      }
      return (0, _utils.db_quote_literal)(expr);
    };
    ctx['$'].ast = [[], {}, [], 1]; // mark as macro

    //  пока что считаем что у нас ОДИН аргумент и мы его интерпретируем как таблица.столбец
    ctx['parse_kv'] = function (expr) {
      if (expr instanceof Array) {
        if (expr[0] === '->') {
          var sql = 'select "' + expr[2] + '" from "' + expr[1] + '" where id = $1::INT';
          var id_val = resolve_literal(expr[1].replace(/.$/, "_id"));

          //console.log('SQL: ', sql, " val:", id_val);

          var res_json = plv8.execute(sql, [id_val]);
          //var res_json = [{"src_id":"$a:Вася:$b:Петя"}];
          var frst = res_json[0];

          //console.log('SQL RES: ', frst);

          if (frst !== undefined && frst[expr[2]] !== null && frst[expr[2]].length > 0) {
            var axis_condition = function axis_condition(e) {
              var result = e.split(':').map(function (e2) {
                e2 = e2.replace(/\'/g, "''"); //' be safe
                return e2.indexOf('$') == 0 ? ' AND ' + e2.substr(1) + '=' : "'" + e2 + "'";
              }).join('').substr(5);
              return result;
            };

            var result = axis_condition(frst[expr[2]]);
            if (result === undefined || result.length == 0) return '(/*kv not resolved*/ 0=1)';
            return result;
          }
        }
      }
      return '(/*parse_kv EMPTY*/ 1=0)';
    };
    ctx['parse_kv'].ast = [[], {}, [], 1]; // mark as macro

    var ret = [];
    //console.log("where IN: ", JSON.stringify(Array.prototype.slice.call(arguments)));

    var fts = _vars['fts'];
    var tree = arguments;

    if (fts !== undefined && fts.length > 0) {
      fts = fts.replace(/\'/g, "''"); //' be safe
      // Full Text Search based on column_list
      if (_typeof(_vars['_columns']) == 'object') {

        //console.log("FTS: ",  JSON.stringify(fts));

        var ilike = Object.values(_vars['_columns']).map(function (col) {
          col["search"] !== undefined ? ["ilike", col["search"], ["str", '%' + fts + '%']] : null;
        }).reduce(function (ac, el) {
          el == null ? ac : ['or', ac, el];
        });

        //console.log( "FTS PARSED: ",  JSON.stringify(ilike));

        if (ilike !== undefined && ilike.length > 0) {
          // добавляем корень AND с нашим поиском
          tree = [["and", tree[0], ['()', ilike]]];
        }
      }
    }

    for (var i = 0; i < tree.length; i++) {
      // console.log("array ", JSON.stringify(Array.prototype.slice.call(tree[i])));
      ret.push(prnt(tree[i], ctx));
    }

    var r = ret[0]; // у нас только один результат должен быть !!!
    if (r == undefined) {
      r = '';
    }
    return r;
  };
  _context['filter'].ast = [[], {}, [], 1]; // mark as macro


  // where - we should not eval arguments, so we must mark where as macro!!!
  _context['where'] = function () {
    // we should always get ONE argument, for example: ["=",["$",["->","period","title"]],3]
    // BUT if we get two, or more arguments, we eval them one by one, AND combine later with AND operand, skipping empty results...
    var tree = arguments;
    var ret = [];
    for (var i = 0; i < tree.length; i++) {
      // console.log("array ", JSON.stringify(Array.prototype.slice.call(tree[i])));
      var r = (0, _lisp.eval_lisp)(["filter", tree[i]], _context); // r should be string
      if (r.length > 0) {
        ret.push(r);
      }
    }

    if (ret.length > 0) {
      if (ret.length > 1) {
        return 'WHERE (' + ret.join(') AND (') + ')';
      } else {
        return 'WHERE ' + ret[0];
      }
    } else {
      return 'WHERE TRUE';
    }
  };
  _context['where'].ast = [[], {}, [], 1]; // mark as macro

  return _context;
}

function eval_sql_where(_expr, _vars) {
  if (typeof _vars === 'string') _vars = JSON.parse(_vars);

  var sexpr = (0, _lpep.parse)(_expr);

  _console2.default.log('sql_where parse: ', JSON.stringify(sexpr));

  if (sexpr instanceof Array && (sexpr[0] === 'filter' && sexpr.length <= 2 || sexpr[0] === 'order_by' || sexpr[0] === 'if' || sexpr[0] === 'where')) {
    // ok
  } else {
    throw "only single where() or order_by() could be evaluated.";
  }

  var _context = sql_where_context(_vars);

  var ret = (0, _lisp.eval_lisp)(sexpr, _context);

  // console.log('ret: ',  JSON.stringify(ret));
  return ret;
}

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sql_context = sql_context;
exports.parse_sql_expr = parse_sql_expr;
exports.parse_sql_apidb_expr = parse_sql_apidb_expr;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

var _lisp = __webpack_require__(1);

var _sql_where = __webpack_require__(3);

var _lpep = __webpack_require__(2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// polyfill = remove in 2020 !!!

/**
    Copyright (c) 2019 Luxms Inc.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

if (!Array.prototype.find) {
  Array.prototype.find = function (predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

function sql_context(_vars) {
  var _context = (0, _sql_where.sql_where_context)(_vars);

  /* заполняем контекст функциями и макросами, заточенными на SQL */
  _context['sql'] = function () {
    var q; // resulting sql
    var args = Array.prototype.slice.call(arguments);
    _console2.default.log('SQL IN: ', args);

    var find_part = function find_part(p) {
      return args.find(function (el) {
        return p == el[0];
      });
    };

    var sel = find_part('select');
    _console2.default.log('FOUND select: ', sel);
    q = (0, _lisp.eval_lisp)(sel, _context);

    var from = find_part('from');
    _console2.default.log('FOUND from: ', from);
    q = q + ' ' + (0, _lisp.eval_lisp)(from, _context);

    var where = find_part('where');
    _console2.default.log("FOUND where: ", where);
    if (where instanceof Array && where.length > 1) {
      q = q + ' ' + (0, _lisp.eval_lisp)(where, _context);
    }

    var srt = find_part('sort');
    _console2.default.log('FOUND sort: ', srt);
    if (srt instanceof Array && srt.length > 1) {
      q = q + ' ' + (0, _lisp.eval_lisp)(srt, _context);
    }

    return q;
  };
  _context['sql'].ast = [[], {}, [], 1]; // mark as macro

  function prnt(a) {
    _console2.default.log('prnt IN: ', a);
    if (a instanceof Array) {
      if (a.length > 0) {
        if (a[0] === '::' && a.length == 3) {
          return a[1] + '::' + a[2];
        } else if (a[0] === ':') {
          return prnt(a[1]) + ' as "' + a[2].replace(/"/, '\\"') + '"';
        } else {
          return a[0] + '(' + a.slice(1).map(function (argel) {
            return prnt(argel);
          }).join(',') + ')';
        }
      } else {
        return '';
      }
    } else {
      return a;
    }
  }

  // должен вернуть СТРОКУ
  _context['select'] = function () {
    var a = Array.prototype.slice.call(arguments);
    _console2.default.log("select IN: ", JSON.stringify(a));
    if (a.length < 1) {
      return "SELECT *";
    } else {
      return "SELECT " + a.map(prnt).join(',');
    }
  };
  _context['select'].ast = [[], {}, [], 1]; // mark as macro

  _context['from'] = function () {
    var a = Array.prototype.slice.call(arguments);
    _console2.default.log('from IN: ', a);
    if (a.length < 1) {
      return "";
    } else {
      return "FROM " + a.map(prnt).join(',');
    }
  };
  _context['from'].ast = [[], {}, [], 1]; // mark as macro

  return _context;
}

/*
Это не дописано!!! Идея была сделать синтаксис, похожий на htSQL. типа +table(col1,col2).where(col1>3)
но например, как указать схему? сейчас парсер фигню выдаёт, так как точка не всегда корректно отрабатывает +sch.table(col1,col2)
Тщательнее надо....

select lpe.parse_sql_expr($$metrics(id).where(id='abcd')$$);


Примеры htSQL:
/course.filter(credits<3).select(department_code, no, title)
/course.sort(credits-).limit(10){department_code, no, credits}
/course.limit(10).sort(credits-){department_code, no, credits}

То есть, у нас имя таблицы идёт первым в любом случае. В LuxPath предлагаю использовать
комюинацию htSQL select и список столбцов {} в одном макросе +имя_таблицы(...)
мы будем использовать + вместо / Но слэш в htSQL не является частью синтаксиса, имя таблицы просто всегда идёт первым!!!

*/

function parse_sql_expr(_expr, _vars) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  // for(var key in _vars) _context[key] = _vars[key];

  _context['->'] = function () {
    var ret = [];

    for (var i = 0; i < arguments.length; i++) {
      ret.push((0, _lisp.eval_lisp)(arguments[i], _context));
    }

    return ret.join(',');
  };
  _context['->'].ast = [[], {}, [], 1]; // mark as macro

  var sexpr = (0, _lpep.parse)(_expr);
  _console2.default.log("IN: ", sexpr);

  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */

  // точка входа всегда должна быть ->, так как мы определили -> как макроc чтобы иметь возможность
  // перекодировать имена таблиц в вызов .from()
  if (sexpr[0] !== '->') {
    sexpr = ['->', sexpr];
  }

  // теперь нужно пройтись по списку вызовов и привести к нормальной форме.
  // в нормальной форме всё выглядит вот так: (seq sql(select() from()) sql(...) sql(...) )
  // ["seq",["metrics","a","d",["max","c"]],["where"]]
  // ["seq",["+",["metrics","a","d",["max","c"]]],["where"]]

  /* на вход прилетает IN:
    metrics(a,d,max(c)).where(a>1 and i < 4).periods.where(a>4)
    ["seq",["metrics","a","d",["max","c"]],["where",["and",[">","a","1"],["<","i","4"]]],"periods",["where",[">","a","4"]]]
    ["seq",["sql",["select","a","d",["max","c"]],["from","metrics"],["filter",["and",[">","a","1"],["<","i","4"]]]],["sql",["select"],["from","periods"],["filter",[">","a","4"]]]]
  */

  var sql = ['sql'];
  var do_select_from = function do_select_from(sel) {
    if (!(sel instanceof Array)) {
      sel = [sel];
    }
    var fr = sel[0];
    var p = false;
    if (fr != 'where' && fr != 'select' && fr != 'sort' && fr != 'filter' && fr != 'from') {
      sel[0] = 'select';
      p = true;
    }
    sql.push(sel);
    if (p) {
      sql.push(["from", fr]);
    }
    _console2.default.log("parse do_select_from: ", sql);
  };

  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];
    if (expr instanceof Array) {
      // expr: ["metrics","a","d",["max","c"]]
      if (expr[0] === 'order_by') {
        expr[0] = 'sort';
      };
      if (expr[0] === 'where') {
        expr[0] = 'where';
      };
      if (expr[0] === '+') {
        // expr: ["+",["metrics","a","d",["max","c"]]]
        do_select_from(expr[1]);
      } else if (_context[expr[0].toString()] === undefined) {
        // это имя таблицы... так как мы проверили на ключевые слова,
        // распознаваемые нашим интерпретатором
        // expr: ["metrics","a","d",["max","c"]]
        do_select_from(expr);
      } else {
        sql.push(sexpr[i]);
      }
    } else if (_context[expr.toString()] === undefined) {
      // это литерал = имя таблицы...
      // expr: "metrics"
      do_select_from(expr);
    } else {
      throw 'unexpected call: ' + JSON.stringify(expr);
    }
  }

  _console2.default.log('parse: ', sql);

  var ret = (0, _lisp.eval_lisp)(sql, _context);
  // console.log("parse: ", ret);

  return ret;
}

function parse_sql_apidb_expr(_expr, _vars, _forced_table, _forced_where) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  // for(var key in _vars) _context[key] = _vars[key];

  var sexpr = (0, _lpep.parse)(_expr);
  _console2.default.log("DBAPI IN: ", sexpr);

  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */

  // теперь нужно пройтись по списку вызовов и привести к нормальной форме.
  // в нормальной форме у нас должен быть один вызов sql() а внутри select().from().where()
  // причём 
  // select(a,b) === select(a).select(b)
  // order_by(a,b) === order_by(a).order_by(b)
  // where(a>1).where(b<1) === where(a>1 and b<1)
  // from(a).from(b).from(c) === from(c)
  // в последнем случае берётся последний from, а все первые игнорятся !!!!

  var sql = ['sql']; // wrapped by sql call...
  var cache = { "where": [], "select": [], "order_by": [], "from": [] };
  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];
    if (expr instanceof Array) {
      var fr = expr[0];
      if (fr != 'where' && fr != 'select' && fr != 'order_by' && fr != 'from' && fr != ':') {
        throw 'unexpected func: ' + JSON.stringify(fr);
      }
      // have no idea how to support aliases for selects...
      if (fr === ':' && expr[1][0] === 'select') {
        cache["select"].push(expr[1]);
      } else {
        cache[fr].push(expr);
      }
    } else {
      throw 'unexpected literal: ' + JSON.stringify(expr);
    }
  }

  if (_forced_table !== undefined) {
    cache[fr].push(["from", _forced_table]);
  }

  var args = cache["select"].map(function (ar) {
    return ar.slice(1);
  });
  var sel = [].concat.apply(["select"], args); //flat
  sql.push(sel);

  sql.push(cache["from"].pop());

  args = cache["where"].map(function (ar) {
    return ar.slice(1);
  });
  args = [].concat.apply([], args); //flat

  var w = ["()", args[0]];
  if (args.length > 1) {
    for (var i = 1; i < args.length; i++) {
      w = ["and", w, ["()", args[i]]];
    }
  }

  sql.push(["where", w]);

  _console2.default.log("WHERE", JSON.stringify(w));

  _console2.default.log('DBAPI parse: ', sql);

  var ret = (0, _lisp.eval_lisp)(sql, _context);

  return ret;
}

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eval_lisp = exports.evaluate = exports.parse_sql_apidb_expr = exports.parse_sql_expr = exports.eval_sql_where = exports.LPESyntaxError = exports.parse = undefined;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

var _lpep = __webpack_require__(2);

var _lisp = __webpack_require__(1);

var _sql_where = __webpack_require__(3);

var _sql_context = __webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.parse = _lpep.parse;
exports.LPESyntaxError = _lpep.LPESyntaxError;
exports.eval_sql_where = _sql_where.eval_sql_where;
exports.parse_sql_expr = _sql_context.parse_sql_expr;
exports.parse_sql_apidb_expr = _sql_context.parse_sql_apidb_expr;
exports.evaluate = _lisp.evaluate;
exports.eval_lisp = _lisp.eval_lisp;

// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = evaluate(ast, []);
// console.log(res);

// test:
// var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = tokenize;

var _console = __webpack_require__(0);

var _console2 = _interopRequireDefault(_console);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isDigit = function isDigit(c) {
  return c >= '0' && c <= '9';
};
// http://javascript.crockford.com/tdop/tdop.html

// 2010-02-23

// (c) 2006 Douglas Crockford

// Produce an array of simple token objects from a string.
// A simple token object contains these members:
//      type: 'name', 'string', 'number', 'operator'
//      value: string or number value of the token
//      from: index of first character of the token
//      to: index of the last character + 1

// Comments of the // type are ignored.

// Operators are by default single characters. Multicharacter
// operators can be made by supplying a string of prefix and
// suffix characters.
// characters. For example,
//      '<>+-&', '=>&:'
// will match any of these:
//      <=  >>  >>>  <>  >=  +: -: &: &&: &&

function tokenize(s) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '<>+-&';
  var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '=>&:';

  var c = void 0; // The current character.
  var from = void 0; // The index of the start of the token.
  var i = 0; // The index of the current character.
  var length = s.length;
  var n = void 0; // The number value.
  var q = void 0; // The quote character.
  var str = void 0; // The string value.
  var result = []; // An array to hold the results.
  var make = function make(type, value) {
    return { type: type, value: value, from: from, to: i };
  }; // Make a token object.

  // If the source string is empty, return nothing.
  if (!s) {
    return [];
  }

  // Loop through this text, one character at a time.
  c = s.charAt(i);
  while (c) {
    from = i;

    // Ignore whitespace.
    if (c <= ' ') {
      i += 1;
      c = s.charAt(i);

      // name.
    } else if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c === '$' || c === '#') {
      str = c;
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c === '_' || c === '$') {
          str += c;
          i += 1;
        } else {
          break;
        }
      }

      result.push(make('name', str));
      // number.

      // A number cannot start with a decimal point. It must start with a digit,
      // possibly '0'.
    } else if (c >= '0' && c <= '9') {
      str = c;
      i += 1;

      // Look for more digits.

      for (;;) {
        c = s.charAt(i);
        if (c < '0' || c > '9') {
          break;
        }
        i += 1;
        str += c;
      }

      // Look for a decimal fraction part.

      if (c === '.') {
        i += 1;
        str += c;
        for (;;) {
          c = s.charAt(i);
          if (c < '0' || c > '9') {
            break;
          }
          i += 1;
          str += c;
        }
      }

      // Look for an exponent part.
      if (c === 'e' || c === 'E') {
        i += 1;
        str += c;
        c = s.charAt(i);
        if (c === '-' || c === '+') {
          i += 1;
          str += c;
          c = s.charAt(i);
        }
        if (c < '0' || c > '9') {
          makeError(make('number', str), "Bad exponent");
        }
        do {
          i += 1;
          str += c;
          c = s.charAt(i);
        } while (c >= '0' && c <= '9');
      }

      // Make sure the next character is not a letter.

      if (c >= 'a' && c <= 'z') {
        str += c;
        i += 1;
        makeError(make('number', str), "Bad number");
      }

      // Don't convert the string value to a number. If it is finite, then it is a good
      // token.
      // result.push(make('number', parseFloat(str)));
      // result.push(make('number', str));


      n = +str;
      if (isFinite(n)) {
        result.push(make('number', n));
      } else {
        makeError(make('number', str), "Bad number");
      }

      // string
    } else if (c === '\'' || c === '"') {
      str = '';
      q = c;
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (c < ' ') {
          // make('string', str).error(c === '\n' || c === '\r' || c === '' ?
          //     "Unterminated string." :
          //     "Control character in string.", make('', str));
          makeError(make('', str) || make(q === '"' ? 'string_double' : 'string_single', str), c === '\n' || c === '\r' || c === '' ? "Unterminated string." : "Control character in string.");
        }

        // Look for the closing quote.

        if (c === q) {
          break;
        }

        // Look for escapement.

        if (c === '\\') {
          i += 1;
          if (i >= length) {
            makeError(make(q === '"' ? 'string_double' : 'string_single', str), "Unterminated string");
          }
          c = s.charAt(i);
          switch (c) {
            case 'b':
              c = '\b';
              break;
            case 'f':
              c = '\f';
              break;
            case 'n':
              c = '\n';
              break;
            case 'r':
              c = '\r';
              break;
            case 't':
              c = '\t';
              break;
            case 'u':
              if (i >= length) {
                makeError(make(q === '"' ? 'string_double' : 'string_single', str), "Unterminated string");
              }
              c = parseInt(s.substr(i + 1, 4), 16);
              if (!isFinite(c) || c < 0) {
                makeError(make(q === '"' ? 'string_double' : 'string_single', str), "Unterminated string");
              }
              c = String.fromCharCode(c);
              i += 4;
              break;
          }
        }
        str += c;
        i += 1;
      }
      i += 1;
      result.push(make(q === '"' ? 'string_double' : 'string_single', str));
      c = s.charAt(i);

      // comment.
    } else if (c === '/' && s.charAt(i + 1) === '/') {
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (c === '\n' || c === '\r' || c === '') {
          break;
        }
        i += 1;
      }

      // combining
    } else if (prefix.indexOf(c) >= 0) {
      str = c;
      i += 1;
      while (true) {
        c = s.charAt(i);
        if (i >= length || suffix.indexOf(c) < 0) {
          break;
        }
        str += c;
        i += 1;
      }
      result.push(make('operator', str));

      // single-character operator
    } else {
      i += 1;
      result.push(make('operator', c));
      c = s.charAt(i);
    }
  }
  return result;
};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
     value: true
});
exports.db_quote_literal = db_quote_literal;
function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g, "''") + "'";
}

/***/ })
/******/ ]);
}); 