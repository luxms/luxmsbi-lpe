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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
var Logger;

try {
  Logger = Java.type('com.luxms.bi.service.LPEService');
} catch (err) {}

function prepareOutput() {
  var res = '';

  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];

    if (typeof arg == 'string') {
      res += arg;
    } else {
      try {
        res += JSON.stringify(arg);
      } catch (err) {
        res += String(arg);
      }
    }
  }

  return res;
}

function log() {
  var message = prepareOutput.apply(this, arguments);

  if (Logger) {
    Logger.log(message);
  } else {
    print(message);
  }
}

/* harmony default export */ __webpack_exports__["a"] = ({
  log: log,
  warn: log,
  error: log
});

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export init_lisp */
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_lisp;
/* harmony export (immutable) */ __webpack_exports__["b"] = evaluate;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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


var isArray = function isArray(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
};

var isString = function isString(arg) {
  return typeof arg === 'string';
};

var isNumber = function isNumber(arg) {
  return typeof arg === 'number';
};

var isHash = function isHash(arg) {
  return _typeof(arg) === 'object' && arg !== null && !isArray(arg);
};

var isFunction = function isFunction(arg) {
  return typeof arg === 'function';
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
        if (!_iteratorNormalCompletion && _iterator.return != null) {
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

  if (isFunction(ctx)) return ctx(varName, value);

  if (isHash(ctx)) {
    return value === undefined ? ctx[varName] : ctx[varName] = value;
  }

  return undefined;
}

function makeMacro(fn, ast) {
  fn.ast = ast || [[], {}, [], 1]; // mark as macro

  return fn;
}

function makeLetBindings(ast, ctx, rs) {
  var result = {};

  if (isHash(ast)) {
    for (var varName in ast) {
      result[varName] = EVAL(ast[varName], ctx, rs);
    }
  } else if (isArray(ast) && isString(ast[0])) {
    result[ast[0]] = EVAL(ast[1], ctx, rs);
  } else if (isArray(ast)) {
    ast.forEach(function (pair) {
      return result[pair[0]] = EVAL(pair[1], ctx, rs);
    });
  } else if (isFunction(ast)) {
    return ast;
  } else {
    throw new Error('LISP: let expression invalid form in ' + ast);
  }

  return result;
}

var SPECIAL_FORMS = {
  // built-in special forms
  'let': function _let(ast, ctx, rs) {
    return EVAL(['begin'].concat(_toConsumableArray(ast.slice(1))), [makeLetBindings(ast[0], ctx, rs), ctx], rs);
  },
  '`': function _(ast, ctx) {
    return ast[0];
  },
  // quote
  'macroexpand': macroexpand,
  'begin': function begin(ast, ctx) {
    return ast.reduce(function (acc, astItem) {
      return EVAL(astItem, ctx);
    }, null);
  },
  'do': function _do(ast, ctx) {
    throw new Error('DO not implemented');
  },
  'if': function _if(ast, ctx, rs) {
    return EVAL(ast[0], ctx, false) ? EVAL(ast[1], ctx, rs) : EVAL(ast[2], ctx, rs);
  },
  '~': function _(ast, ctx, rs) {
    // mark as macro
    var f = EVAL(ast[0], ctx, rs); // eval regular function

    f.ast.push(1); // mark as macro

    return f;
  },
  '.-': function _(ast, ctx, rs) {
    // get or set attribute
    var _eval_ast = eval_ast(ast, ctx, rs),
        _eval_ast2 = _slicedToArray(_eval_ast, 3),
        obj = _eval_ast2[0],
        propertyName = _eval_ast2[1],
        value = _eval_ast2[2];

    return value !== undefined ? obj[propertyName] = value : obj[propertyName];
  },
  '.': function _(ast, ctx, rs) {
    // call object method
    var _eval_ast3 = eval_ast(ast, ctx, rs),
        _eval_ast4 = _toArray(_eval_ast3),
        obj = _eval_ast4[0],
        methodName = _eval_ast4[1],
        args = _eval_ast4.slice(2);

    var fn = obj[methodName];
    return fn.apply(obj, args);
  },
  'try': function _try(ast, ctx, rs) {
    // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      var errCtx = env_bind([ast[1][0]], ctx, [e]);
      return EVAL(ast[1][1], errCtx, rs);
    }
  },
  '||': function _(ast, ctx, rs) {
    return ast.some(function (a) {
      return !!EVAL(a, ctx, rs);
    });
  },
  // logical or
  '&&': function _(ast, ctx, rs) {
    return ast.every(function (a) {
      return !!EVAL(a, ctx, rs);
    });
  },
  // logical and
  'fn': function fn(ast, ctx, rs) {
    // define new function (lambda)
    var f = function f() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return EVAL(ast[1], env_bind(ast[0], ctx, args), rs);
    };

    f.ast = [ast[1], ctx, ast[0]]; // f.ast compresses more than f.data

    return f;
  },
  'def': function def(ast, ctx, rs) {
    // update current environment
    var value = EVAL(ast[1], ctx, rs);
    var result = $var$(ctx, ast[0], value);
    return result;
  }
};
var STDLIB = {
  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,
  // js specific
  'true': true,
  'false': false,
  'Array': Array,
  // TODO: consider removing these properties
  'Object': Object,
  'Date': Date,
  'console': __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */],
  'JSON': JSON,
  // built-in function
  '=': function _() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return args.every(function (v) {
      return v === args[0];
    });
  },
  '+': function _() {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    return args.reduce(function (a, b) {
      return a + b;
    });
  },
  '-': function _() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    return args.length === 1 ? -args[0] : args.reduce(function (a, b) {
      return a - b;
    });
  },
  '*': function _() {
    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    return args.reduce(function (a, b) {
      return a * b;
    });
  },
  '/': function _() {
    for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    return args.length === 1 ? 1 / args[0] : args.reduce(function (a, b) {
      return a / b;
    });
  },
  '<': function _() {
    for (var _len7 = arguments.length, args = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    return args.every(function (v, i) {
      return i === 0 ? true : args[i - 1] < args[i];
    });
  },
  '>': function _() {
    for (var _len8 = arguments.length, args = new Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }

    return args.every(function (v, i) {
      return i === 0 ? true : args[i - 1] > args[i];
    });
  },
  '<=': function _() {
    for (var _len9 = arguments.length, args = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }

    return args.every(function (v, i) {
      return i === 0 ? true : args[i - 1] <= args[i];
    });
  },
  '>=': function _() {
    for (var _len10 = arguments.length, args = new Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
      args[_key10] = arguments[_key10];
    }

    return args.every(function (v, i) {
      return i === 0 ? true : args[i - 1] >= args[i];
    });
  },
  '!=': function _() {
    for (var _len11 = arguments.length, args = new Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
      args[_key11] = arguments[_key11];
    }

    return !args.every(function (v) {
      return v === args[0];
    });
  },
  'not': function not(a) {
    return !a;
  },
  'isa': function isa(a, b) {
    return a instanceof b;
  },
  'type': function type(a) {
    return _typeof(a);
  },
  'new': function _new() {
    debugger;

    for (var _len12 = arguments.length, args = new Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
      args[_key12] = arguments[_key12];
    }

    return new (args[0].bind.apply(args[0], args))();
  },
  'del': function del(a, b) {
    return delete a[b];
  },
  'list': function list() {
    for (var _len13 = arguments.length, args = new Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
      args[_key13] = arguments[_key13];
    }

    return args;
  },
  'vector': function vector() {
    for (var _len14 = arguments.length, args = new Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
      args[_key14] = arguments[_key14];
    }

    return args;
  },
  '[': function _() {
    for (var _len15 = arguments.length, args = new Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
      args[_key15] = arguments[_key15];
    }

    return args;
  },
  'map': function map(a, b) {
    return b.map(a);
  },
  'throw': function _throw(a) {
    throw a;
  },
  'identity': function identity(a) {
    return a;
  },
  'pluck': function pluck(c, k) {
    return c.map(function (el) {
      return el[k];
    });
  },
  // for each array element, get property value, present result as array.
  'RegExp': function (_RegExp) {
    function RegExp() {
      return _RegExp.apply(this, arguments);
    }

    RegExp.toString = function () {
      return _RegExp.toString();
    };

    return RegExp;
  }(function () {
    for (var _len16 = arguments.length, args = new Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
      args[_key16] = arguments[_key16];
    }

    return RegExp.apply(RegExp, args);
  }),
  'read-string': function readString(a) {
    return JSON.parse(a);
  },
  'rep': function rep(a) {
    return JSON.stringify(EVAL(JSON.parse(a), STDLIB));
  },
  // TODO: fix ctx and rs arguments
  'null?': function _null(a) {
    return a === null || a === undefined;
  },
  // ??? add [] ???
  'true?': function _true(a) {
    return a === true;
  },
  'false?': function _false(a) {
    return a === false;
  },
  'string?': isString,
  'list?': isArray,
  'contains?': function contains(a, b) {
    return a.hasOwnProperty(b);
  },
  'str': function str() {
    for (var _len17 = arguments.length, args = new Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
      args[_key17] = arguments[_key17];
    }

    return args.map(function (x) {
      return isString(x) ? x : JSON.stringify(x);
    }).join('');
  },
  'count': function count(a) {
    return a.length;
  },
  'get': function get(a, b) {
    return a.hasOwnProperty(b) ? a[b] : undefined;
  },
  'set': function set(a, b, c) {
    return a[b] = c, a;
  },
  'keys': function keys(a) {
    return Object.keys(a);
  },
  'vals': function vals(a) {
    return Object.values(a);
  },
  // not implemented yet
  // 'hash-table->alist'
  // macros
  '\'': makeMacro(function (a) {
    return a.toString();
  }),
  '"': makeMacro(function (a) {
    return a.toString();
  }),
  '()': makeMacro(function () {
    for (var _len18 = arguments.length, args = new Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
      args[_key18] = arguments[_key18];
    }

    return args;
  }),
  // ???
  '->': makeMacro(function (acc) {
    for (var _len19 = arguments.length, ast = new Array(_len19 > 1 ? _len19 - 1 : 0), _key19 = 1; _key19 < _len19; _key19++) {
      ast[_key19 - 1] = arguments[_key19];
    }

    // thread first macro
    // императивная лапша для макроса ->
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    for (var _i2 = 0; _i2 < ast.length; _i2++) {
      var arr = ast[_i2];

      if (!isArray(arr)) {
        arr = [".-", acc, arr]; // это может быть обращение к хэшу или массиву через индекс или ключ....
      } else if (arr[0] === "()" && arr.length === 2 && (isString(arr[1]) || isNumber(arr[1]))) {
        arr = [".-", acc, arr[1]];
      } else {
        arr.splice(1, 0, acc); // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }

      acc = arr;
    }

    return acc;
  }),
  '->>': makeMacro(function (acc) {
    for (var _len20 = arguments.length, ast = new Array(_len20 > 1 ? _len20 - 1 : 0), _key20 = 1; _key20 < _len20; _key20++) {
      ast[_key20 - 1] = arguments[_key20];
    }

    // thread last macro
    // императивная лапша для макроса ->>
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    for (var _i3 = 0; _i3 < ast.length; _i3++) {
      var arr = ast[_i3];
      arr.push(acc);
      acc = arr;
    }

    return acc;
  }),
  'invoke': makeMacro(function () {
    for (var _len21 = arguments.length, ast = new Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
      ast[_key21] = arguments[_key21];
    }

    /// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
    /// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
    /// invoke хорошо стыкуется с ->
    ast.splice(0, 0, ".");
    return ast;
  }),
  'and': makeMacro(function () {
    for (var _len22 = arguments.length, ast = new Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
      ast[_key22] = arguments[_key22];
    }

    if (ast.length === 0) return true;
    if (ast.length === 1) return ast[0];
    return ["let", ["__and", ast[0]], ["if", "__and", ["and"].concat(ast.slice(1)), "__and"]];
  }),
  'or': makeMacro(function () {
    for (var _len23 = arguments.length, ast = new Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
      ast[_key23] = arguments[_key23];
    }

    if (ast.length === 0) return false;
    if (ast.length === 1) return ast[0];
    return ["let", ["__or", ast[0]], ["if", "__or", "__or", ["or"].concat(ast.slice(1))]];
  }),
  // system functions & objects
  // 'js': eval,
  eval_context: eval_context,
  // TODO: remove
  eval: function _eval(a) {
    return EVAL(a, STDLIB);
  }
};
var minimal = ["begin", ["def", "del", ["fn", ["a", "b"], [".", "Reflect", ["`", "deleteProperty"], "a", "b"]]], ["def", "map", ["fn", ["a", "b"], [".", "b", ["`", "map"], ["fn", ["x"], ["a", "x"]]]]], ["def", "classOf", ["fn", ["a"], [".", [".-", [".-", "Object", ["`", "prototype"]], ["`", "toString"]], ["`", "call"], "a"]]], ["def", "pr-str", ["fn", ["&", "a"], [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"], ["`", "join"], ["`", " "]]]], ["def", "prn", ["fn", ["&", "a"], ["begin", [".", "console", ["`", "log"], [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"], ["`", "join"], ["`", " "]]], null]]], ["def", "println", ["fn", ["&", "a"], ["begin", [".", "console", ["`", "log"], [".", ["map", ["fn", ["x"], ["if", ["string?", "x"], "x", [".", "JSON", ["`", "stringify"], "x"]]], "a"], ["`", "join"], ["`", " "]]], null]]], ["def", "cons", ["fn", ["a", "b"], [".", ["`", []], ["`", "concat"], ["list", "a"], "b"]]], ["def", "concat", ["fn", ["&", "a"], [".", [".-", ["list"], ["`", "concat"]], ["`", "apply"], ["list"], "a"]]], ["def", "nth", "get"], ["def", "first", ["fn", ["a"], ["if", [">", [".-", "a", ["`", "length"]], 0], ["nth", "a", 0], null]]], ["def", "last", ["fn", ["a"], ["nth", "a", ["-", [".-", "a", ["`", "length"]], 1]]]], ["def", "empty?", ["fn", ["a"], ["if", ["list?", "a"], ["=", 0, [".-", "a", ["`", "length"]]], ["=", "a", null]]]], ["def", "slice", ["fn", ["a", "b", "&", "end"], [".", "a", ["`", "slice"], "b", ["if", [">", [".-", "end", ["`", "length"]], 0], ["get", "end", 0], [".-", "a", ["`", "length"]]]]]], ["def", "rest", ["fn", ["a"], ["slice", "a", 1]]], ["def", "apply", ["fn", ["f", "&", "b"], [".", "f", ["`", "apply"], "f", ["concat", ["slice", "b", 0, -1], ["last", "b"]]]]], null];
EVAL(minimal, STDLIB);

function macroexpand(ast, ctx) {
  var resolveString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  while (true) {
    if (!isArray(ast)) break;
    if (typeof ast[0] !== "string") break;
    var v = $var$(ctx, ast[0]);
    if (!isFunction(v)) break;
    if (!isArray(v.ast)) break;
    if (!v.ast[3]) break;
    ast = v.apply(v, ast.slice(1)); // Это макрос! 3-й элемент макроса установлен в 1 через push
  }

  return ast;
}
/**
 * Return new ctx with symbols in ast bound to
 * corresponding values in exprs
 * @param ast
 * @param ctx
 * @param exprs
 * @returns {*[]}
 */


function env_bind(ast, ctx, exprs) {
  var newCtx = {};

  for (var i = 0; i < ast.length; i++) {
    if (ast[i] === "&") {
      // variable length arguments
      newCtx[ast[i + 1]] = Array.prototype.slice.call(exprs, i);
      break;
    } else {
      newCtx[ast[i]] = exprs[i];
    }
  }

  return [newCtx, ctx];
}

function eval_ast(ast, ctx) {
  var resolveString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  if (isArray(ast)) {
    // list?
    return ast.map(function (e) {
      return EVAL(e, ctx, resolveString);
    });
  }

  if (isString(ast)) {
    var value = $var$(ctx, ast);

    if (value !== undefined) {
      // variable
      return value;
    }

    return resolveString ? ast : undefined; // if string and not in ctx:
  }

  return ast;
}

function EVAL(ast, ctx) {
  var resolveString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  while (true) {
    if (!isArray(ast)) {
      return eval_ast(ast, ctx, resolveString);
    } // apply


    ast = macroexpand(ast, ctx);
    if (!Array.isArray(ast)) return ast; // do we need eval here?

    if (ast.length === 0) return null; // [] => empty list (or, maybe return vector [])

    var op = ast[0];

    if (isString(op) && op in SPECIAL_FORMS) {
      return SPECIAL_FORMS[op](ast.slice(1), ctx, resolveString);
    }

    var el = ast.map(function (ast) {
      return EVAL(ast, ctx, resolveString);
    });
    var f = el[0];

    if (f.ast) {
      ast = f.ast[0];
      ctx = env_bind(f.ast[2], f.ast[1], el.slice(1)); // TCO
    } else {
      return f.apply(f, el.slice(1));
    }
  }
} // EVAL


function eval_context(ast, ctx) {
  var result = EVAL(ast, [ctx || {}, STDLIB]);
  return result;
} // Use with care


function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: function _eval(ast) {
      return eval_context(ast, ctx);
    },
    val: function val(varName, value) {
      return $var$(ctx, varName, value);
    }
  };
}
function eval_lisp(ast, ctx) {
  var result = eval_context(ast, ctx);

  if (isFunction(result)) {
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
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = parse;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpel__ = __webpack_require__(5);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__lpel__["c"]; });
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
  var token_nr; // стэк для типов выражений

  var expr_scope = {
    pop: function pop() {}
  }; // для разбора логических выражений типа (A and B or C)
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
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(token, "Got " + token.value + " but expected '" + id + "'.");
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
      if (v === 'true' || v === 'false' || v === 'null') {
        o = symbol_table[v];
        a = "literal";
      } else if (expr_scope.tp == "logical") {
        if (v === "or" || v === "and" || v === "not" || v === "in" || v === "is") {
          a = "operator";
          o = symbol_table[v];

          if (!o) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(t, "Unknown logical operator.");
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
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(t, "Unknown operator.");
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
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(t, "Unexpected token.");
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
      advance(); //scope.reserve(n);

      return n.std();
    }

    v = expression(0); //if (!v.assignment && v.id !== "(") {

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

      s = statement(); //console.log("STATEMENT ", s);

      if (s) {
        a.push(s);
      }
    }

    return a.length === 0 ? null : a.length === 1 ? a[0] : {
      "sexpr": ["do"].concat(a.map(function (el) {
        return el["sexpr"];
      }))
    };
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
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(this, "Undefined.");
    },
    led: function led(left) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(this, "Missing operator.");
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

  symbol("true").nud = function () {
    this.sexpr = true;
    return this;
  };

  symbol("false").nud = function () {
    this.sexpr = false;
    return this;
  };

  symbol("null").nud = function () {
    this.sexpr = null;
    return this;
  }; // allow to skip values in function calls....


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
  infixr("or", 30); // required for SQL logical scope where a in (1,2,3)

  infixr("in", 30);
  infixr("is", 30);
  prefix("not"); // for SQL types: '10'::BIGINT

  infixr("::", 90); // for SQL as

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
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(left, "Expected a variable name.");
      }
    } // dima support for missed function arguments...


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
            expr_scope.pop(); // var e = statements();

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
    this.first = left; // this.second = expression(0);

    this.second = expression(70);
    this.arity = "binary";
    this.value = "->";
    this.sexpr = ["->"].concat(lift_funseq(this));
    return this;
  });
  infix("..", 70, function (left) {
    this.first = left; // this.second = expression(0);

    this.second = expression(70);
    this.arity = "binary";
    this.value = "->>";
    this.sexpr = ["->>"].concat(lift_funseq_2(this));
    return this;
  }); // WARNING HACK FIXME DIMA - добавил чтобы писать order_by(+a)
  // А также замена /table на +table в htSQL

  prefix("+");
  prefix("!");
  prefix("not"); // will be used in logical scope

  prefix("¬");
  operator_alias("!", "not");
  operator_alias("¬", "not"); // trying to optimize, when we have negated -number

  prefix("-");
  prefix(".", function () {
    var v = expression(70);

    if (v.value !== "(") {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(v, "Only functions may have dot (.) unary operator.");
    } // this.first = v;
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
        a.push(expression(0)); // a.push(statements());

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
    tokens = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["b" /* tokenize */])(source, '=<>!+-*&|/%^:.', '=<>&|:.');
    token_nr = 0;
    advance();
    var s = statements(); // var s = expression(0);

    advance("(end)");
    return s;
  };
};

var parser = make_parse(); // console.log('LPE Parser initialized')

function parse(str) {
  try {
    var parseResult = parser(str); // from, to, value, arity, sexpr

    return parseResult.sexpr;
  } catch (err) {
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].error("Error", err.message);
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].error("Error", err.stack);
    throw err;
  }
}


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export sql_where_context */
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_sql_where;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpep__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__utils_utils__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lisp__ = __webpack_require__(1);
function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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




/*
where - всегда возвращает слово WHERE, а потом условия. На пустом вхоже вернёт WHERE TRUE
filter - на пустом входе вернёт пустую строку
*/

function sql_where_context(_vars) {
  var _context = _vars;

  var try_to_quote_column = function try_to_quote_column(colname) {
    if (_typeof(_vars['_columns']) == 'object') {
      var h = _vars['_columns'][colname];

      if (_typeof(h) == "object") {
        h = h['name'].toString(); // console.log("-: try_to_quote_column " + JSON.stringify(h));
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

      if (_typeof(h) == "object") {
        var o = h['order'];

        if (o === undefined) {
          o = h['name'];
        }

        __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("-: try_to_quote_order_by_column " + JSON.stringify(o));
        __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("-: try_to_quote_order_by_column " + _typeof(o));

        if (o !== undefined && o.length > 0) {
          //return '"' + o.toString() + '"';
          return o.toString();
        }
      }
    }

    return colname.toString();
  };

  var resolve_literal = function resolve_literal(lit) {
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('LITERAL ', lit, '  CONTEXT:', _vars[lit]);

    if (_vars[lit] == undefined) {
      return try_to_quote_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(lit, _vars);
    }
  };

  var resolve_order_by_literal = function resolve_order_by_literal(lit) {
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('OB LITERAL ', lit, ' CONTEXT:', _vars[lit]);

    if (_vars[lit] === undefined) {
      return try_to_quote_order_by_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(lit, _vars);
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
        ret.push(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(arguments[i], ctx));
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
          pt = 'second';
          break;

        case 2:
          pt = 'minute';
          break;

        case 3:
          pt = 'hour';
          break;

        case 4:
          pt = 'day';
          break;

        case 5:
          pt = 'week';
          break;

        case 6:
          pt = 'month';
          break;

        case 7:
          pt = 'quarter';
          break;

        case 8:
          pt = 'year';
          break;

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
  }; // filter


  _context['filter'] = function () {
    var ctx = {};

    for (var key in _vars) {
      ctx[key] = _vars[key];
    }

    var prnt = function prnt(ar) {
      if (ar instanceof Array) {
        if (ar[0] === '$' || ar[0] === '"' || ar[0] === "'" || ar[0] === "[" || ar[0] === 'parse_kv' || ar[0] === "=" || ar[0] === "pg_interval") {
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(ar, ctx);
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
      var expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context

      if (expr instanceof Array) {
        // try to print using quotes, use plv8 !!!
        return expr.map(function (el) {
          if (typeof el === "string") {
            return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils_utils__["a" /* db_quote_literal */])(el);
          } else if (typeof el === "number") {
            return el;
          } else {
            return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils_utils__["a" /* db_quote_literal */])(JSON.stringify(el));
          }
        }).join(',');
      }

      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils_utils__["a" /* db_quote_literal */])(expr);
    };

    ctx['$'].ast = [[], {}, [], 1]; // mark as macro
    //  пока что считаем что у нас ОДИН аргумент и мы его интерпретируем как таблица.столбец

    ctx['parse_kv'] = function (expr) {
      if (expr instanceof Array) {
        if (expr[0] === '->') {
          var sql = 'select "' + expr[2] + '" from "' + expr[1] + '" where id = $1::INT';
          var id_val = resolve_literal(expr[1].replace(/.$/, "_id")); //console.log('SQL: ', sql, " val:", id_val);

          var res_json = plv8.execute(sql, [id_val]); //var res_json = [{"src_id":"$a:Вася:$b:Петя"}];

          var frst = res_json[0]; //console.log('SQL RES: ', frst);

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

    var ret = []; //console.log("where IN: ", JSON.stringify(Array.prototype.slice.call(arguments)));

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
        }); //console.log( "FTS PARSED: ",  JSON.stringify(ilike));

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
      var r = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(["filter", tree[i]], _context); // r should be string

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
  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpep__["a" /* parse */])(_expr);
  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('sql_where parse: ', JSON.stringify(sexpr));

  if (sexpr instanceof Array && (sexpr[0] === 'filter' && sexpr.length <= 2 || sexpr[0] === 'order_by' || sexpr[0] === 'if' || sexpr[0] === 'where')) {// ok
  } else {
    throw "only single where() or order_by() could be evaluated.";
  }

  var _context = sql_where_context(_vars);

  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(sexpr, _context); // console.log('ret: ',  JSON.stringify(ret));

  return ret;
}

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lpe", function() { return eval_lpe; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpep__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lisp__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__sql_where__ = __webpack_require__(3);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parse", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "LPESyntaxError", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "evaluate", function() { return __WEBPACK_IMPORTED_MODULE_2__lisp__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lisp", function() { return __WEBPACK_IMPORTED_MODULE_2__lisp__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_sql_where", function() { return __WEBPACK_IMPORTED_MODULE_3__sql_where__["a"]; });





function eval_lpe(lpe, ctx) {
  var ast = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpep__["a" /* parse */])(lpe);
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lisp__["a" /* eval_lisp */])(ast, ctx);
}



/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["c"] = LPESyntaxError;
/* harmony export (immutable) */ __webpack_exports__["a"] = makeError;
/* harmony export (immutable) */ __webpack_exports__["b"] = tokenize;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
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


var isDigit = function isDigit(c) {
  return c >= '0' && c <= '9';
}; // Transform a token object into an exception object and throw it.


function LPESyntaxError(message) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message; // this.stack = (new Error()).stack;
}
function makeError(t, message) {
  t.message = message;
  var errorDescription = JSON.stringify(t, ['name', 'message', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'], 4);
  throw new LPESyntaxError(errorDescription);
}
function tokenize(s) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '<>+-&';
  var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '=>&:';
  var c; // The current character.

  var from; // The index of the start of the token.

  var i = 0; // The index of the current character.

  var length = s.length;
  var n; // The number value.

  var q; // The quote character.

  var str; // The string value.

  var result = []; // An array to hold the results.

  var make = function make(type, value) {
    return {
      type: type,
      value: value,
      from: from,
      to: i
    };
  }; // Make a token object.
  // If the source string is empty, return nothing.


  if (!s) {
    return [];
  } // Loop through this text, one character at a time.


  c = s.charAt(i);

  while (c) {
    from = i; // Ignore whitespace.

    if (c <= ' ') {
      i += 1;
      c = s.charAt(i); // name.
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

      result.push(make('name', str)); // number.
      // A number cannot start with a decimal point. It must start with a digit,
      // possibly '0'.
    } else if (c >= '0' && c <= '9') {
      str = c;
      i += 1; // Look for more digits.

      for (;;) {
        c = s.charAt(i);

        if (c < '0' || c > '9') {
          break;
        }

        i += 1;
        str += c;
      } // Look for a decimal fraction part.


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
      } // Look for an exponent part.


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
      } // Make sure the next character is not a letter.


      if (c >= 'a' && c <= 'z') {
        str += c;
        i += 1;
        makeError(make('number', str), "Bad number");
      } // Don't convert the string value to a number. If it is finite, then it is a good
      // token.
      // result.push(make('number', parseFloat(str)));
      // result.push(make('number', str));


      n = +str;

      if (isFinite(n)) {
        result.push(make('number', n));
      } else {
        makeError(make('number', str), "Bad number");
      } // string

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
        } // Look for the closing quote.


        if (c === q) {
          break;
        } // Look for escapement.


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
      c = s.charAt(i); // comment.
    } else if (c === '/' && s.charAt(i + 1) === '/') {
      i += 1;

      for (;;) {
        c = s.charAt(i);

        if (c === '\n' || c === '\r' || c === '') {
          break;
        }

        i += 1;
      } // combining

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

      result.push(make('operator', str)); // single-character operator
    } else {
      i += 1;
      result.push(make('operator', c));
      c = s.charAt(i);
    }
  }

  return result;
}
/* unused harmony default export */ var _unused_webpack_default_export = (tokenize);

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = db_quote_literal;
function db_quote_literal(intxt) {
  return "'" + intxt.toString().replace(/\'/g, "''") + "'";
}

/***/ })
/******/ ]);
});