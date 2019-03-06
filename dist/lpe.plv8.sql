SET plv8.start_proc = '"lpe"."init"';

CREATE SCHEMA IF NOT EXISTS lpe;

CREATE OR REPLACE FUNCTION
lpe.init(_env JSON DEFAULT '{}')
RETURNS VOID
LANGUAGE 'plv8' STRICT
AS $body$

plv8 = typeof plv8 === "object" ? plv8 : {}; plv8["lpe"] =
/******/ (function(modules) { // webpackBootstrap
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
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
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

/* harmony default export */ __webpack_exports__["a"] = ({
  log: function log() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(NOTICE, message);
  },
  warn: function warn() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(WARNING, message);
  },
  error: function error() {
    var message = prepareOutput.apply(this, arguments);
    plv8.elog(ERROR, message);
  }
});

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export makeMacro */
/* unused harmony export makeSF */
/* unused harmony export init_lisp */
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_lisp;
/* harmony export (immutable) */ __webpack_exports__["b"] = evaluate;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

var isBoolean = function isBoolean(arg) {
  return arg === true || arg === false;
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

function isMacro(fn) {
  if (!isFunction(fn)) return false;
  if (!isArray(fn.ast)) return false;
  return !!fn.ast[3];
}

function makeSF(fn) {
  fn.__isSpecialForm = true;
  return fn;
}

function isSF(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSpecialForm;
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
  'let': makeSF(function (ast, ctx, rs) {
    return EVAL(['begin'].concat(_toConsumableArray(ast.slice(1))), [makeLetBindings(ast[0], ctx, rs), ctx], rs);
  }),
  '`': makeSF(function (ast, ctx) {
    return ast[0];
  }),
  // quote
  'macroexpand': makeSF(macroexpand),
  'begin': makeSF(function (ast, ctx) {
    return ast.reduce(function (acc, astItem) {
      return EVAL(astItem, ctx);
    }, null);
  }),
  'do': makeSF(function (ast, ctx) {
    throw new Error('DO not implemented');
  }),
  'if': makeSF(function (ast, ctx, rs) {
    return EVAL(ast[0], ctx, false) ? EVAL(ast[1], ctx, rs) : EVAL(ast[2], ctx, rs);
  }),
  '~': makeSF(function (ast, ctx, rs) {
    // mark as macro
    var f = EVAL(ast[0], ctx, rs); // eval regular function

    f.ast.push(1); // mark as macro

    return f;
  }),
  '.-': makeSF(function (ast, ctx, rs) {
    // get or set attribute
    var _ast$map = ast.map(function (a) {
      return EVAL(a, ctx, rs);
    }),
        _ast$map2 = _slicedToArray(_ast$map, 3),
        obj = _ast$map2[0],
        propertyName = _ast$map2[1],
        value = _ast$map2[2];

    try {
      return value !== undefined ? obj[propertyName] = value : obj[propertyName];
    } catch (err) {
      return null;
    }
  }),
  '.': makeSF(function (ast, ctx, rs) {
    // call object method
    var _ast$map3 = ast.map(function (a) {
      return EVAL(a, ctx, rs);
    }),
        _ast$map4 = _toArray(_ast$map3),
        obj = _ast$map4[0],
        methodName = _ast$map4[1],
        args = _ast$map4.slice(2);

    var fn = obj[methodName];
    return fn.apply(obj, args);
  }),
  'try': makeSF(function (ast, ctx, rs) {
    // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      var errCtx = env_bind([ast[1][0]], ctx, [e]);
      return EVAL(ast[1][1], errCtx, rs);
    }
  }),
  '||': makeSF(function (ast, ctx, rs) {
    return ast.some(function (a) {
      return !!EVAL(a, ctx, rs);
    });
  }),
  // logical or
  '&&': makeSF(function (ast, ctx, rs) {
    return ast.every(function (a) {
      return !!EVAL(a, ctx, rs);
    });
  }),
  // logical and
  'fn': makeSF(function (ast, ctx, rs) {
    // define new function (lambda)
    var f = function f() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return EVAL(ast[1], env_bind(ast[0], ctx, args), rs);
    };

    f.ast = [ast[1], ctx, ast[0]]; // f.ast compresses more than f.data

    return f;
  }),
  'def': makeSF(function (ast, ctx, rs) {
    // update current environment
    var value = EVAL(ast[1], ctx, rs);
    var result = $var$(ctx, ast[0], value);
    return result;
  })
};

var STDLIB = _objectSpread({
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
  'JSON': JSON
}, SPECIAL_FORMS, {
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
  '[': function _() {
    for (var _len12 = arguments.length, args = new Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
      args[_key12] = arguments[_key12];
    }

    return args;
  },
  'RegExp': function (_RegExp) {
    function RegExp() {
      return _RegExp.apply(this, arguments);
    }

    RegExp.toString = function () {
      return _RegExp.toString();
    };

    return RegExp;
  }(function () {
    for (var _len13 = arguments.length, args = new Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
      args[_key13] = arguments[_key13];
    }

    return RegExp.apply(RegExp, args);
  }),
  'count': function count(a) {
    return a.length;
  },
  'del': function del(a, b) {
    return delete a[b];
  },
  // 'del': (a, b) => Reflect.deleteProperty(a, b),
  'isa': function isa(a, b) {
    return a instanceof b;
  },
  'type': function type(a) {
    return _typeof(a);
  },
  'new': function _new() {
    for (var _len14 = arguments.length, args = new Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
      args[_key14] = arguments[_key14];
    }

    return new (args[0].bind.apply(args[0], args))();
  },
  'not': function not(a) {
    return !a;
  },
  'list': function list() {
    for (var _len15 = arguments.length, args = new Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
      args[_key15] = arguments[_key15];
    }

    return args;
  },
  'vector': function vector() {
    for (var _len16 = arguments.length, args = new Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
      args[_key16] = arguments[_key16];
    }

    return args;
  },
  'map': function map(fn, arr) {
    return arr.map(function (it) {
      return fn(it);
    });
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
  'get': function get(a, b) {
    return a.hasOwnProperty(b) ? a[b] : undefined;
  },
  'nth': function nth(a, b) {
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
  'rest': function rest(a) {
    return a.slice(1);
  },
  'println': function println() {
    for (var _len18 = arguments.length, args = new Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
      args[_key18] = arguments[_key18];
    }

    return __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log(args.map(function (x) {
      return isString(x) ? x : JSON.stringify(x);
    }).join(' '));
  },
  'empty?': function empty(a) {
    return isArray(a) ? a.length === 0 : false;
  },
  'cons': function cons(a, b) {
    return [].concat([a], b);
  },
  'prn': function prn() {
    for (var _len19 = arguments.length, args = new Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
      args[_key19] = arguments[_key19];
    }

    return __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log(args.map(function (x) {
      return JSON.stringify(x);
    }).join(' '));
  },
  'slice': function slice(a, b) {
    return a.slice(b, (arguments.length <= 2 ? 0 : arguments.length - 2) > 0 ? arguments.length <= 2 ? undefined : arguments[2] : a.length);
  },
  'first': function first(a) {
    return a.length > 0 ? a[0] : null;
  },
  'last': function last(a) {
    return a[a.length - 1];
  },
  'apply': function apply(f) {
    for (var _len20 = arguments.length, b = new Array(_len20 > 1 ? _len20 - 1 : 0), _key20 = 1; _key20 < _len20; _key20++) {
      b[_key20 - 1] = arguments[_key20];
    }

    return f.apply(f, b);
  },
  'concat': function concat() {
    for (var _len21 = arguments.length, a = new Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
      a[_key21] = arguments[_key21];
    }

    return [].concat.apply([], a);
  },
  'pr-str': function prStr() {
    for (var _len22 = arguments.length, a = new Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
      a[_key22] = arguments[_key22];
    }

    return a.map(function (x) {
      return JSON.stringify(x);
    }).join(' ');
  },
  'classOf': function classOf(a) {
    return Object.prototype.toString.call(a);
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
    for (var _len23 = arguments.length, args = new Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
      args[_key23] = arguments[_key23];
    }

    return args;
  }),
  // ???
  '->': makeMacro(function (acc) {
    for (var _len24 = arguments.length, ast = new Array(_len24 > 1 ? _len24 - 1 : 0), _key24 = 1; _key24 < _len24; _key24++) {
      ast[_key24 - 1] = arguments[_key24];
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
    for (var _len25 = arguments.length, ast = new Array(_len25 > 1 ? _len25 - 1 : 0), _key25 = 1; _key25 < _len25; _key25++) {
      ast[_key25 - 1] = arguments[_key25];
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
    for (var _len26 = arguments.length, ast = new Array(_len26), _key26 = 0; _key26 < _len26; _key26++) {
      ast[_key26] = arguments[_key26];
    }

    /// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
    /// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
    /// invoke хорошо стыкуется с ->
    ast.splice(0, 0, ".");
    return ast;
  }),
  'and': makeMacro(function () {
    for (var _len27 = arguments.length, ast = new Array(_len27), _key27 = 0; _key27 < _len27; _key27++) {
      ast[_key27] = arguments[_key27];
    }

    if (ast.length === 0) return true;
    if (ast.length === 1) return ast[0];
    return ["let", ["__and", ast[0]], ["if", "__and", ["and"].concat(ast.slice(1)), "__and"]];
  }),
  'or': makeMacro(function () {
    for (var _len28 = arguments.length, ast = new Array(_len28), _key28 = 0; _key28 < _len28; _key28++) {
      ast[_key28] = arguments[_key28];
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
});

function macroexpand(ast, ctx) {
  var resolveString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  while (true) {
    if (!isArray(ast)) break;
    if (!isString(ast[0])) break;
    var v = $var$(ctx, ast[0]);
    if (!isFunction(v)) break;
    if (!isMacro(v)) break;
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

function EVAL(ast, ctx) {
  var resolveString = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  while (true) {
    if (!isArray(ast)) {
      // atom
      if (isString(ast)) {
        var value = $var$(ctx, ast);

        if (value !== undefined) {
          // variable
          return value;
        }

        return resolveString ? ast : undefined; // if string and not in ctx
      }

      return ast;
    } // apply


    ast = macroexpand(ast, ctx);
    if (!Array.isArray(ast)) return ast; // TODO: do we need eval here?

    if (ast.length === 0) return null; // TODO: [] => empty list (or, maybe return vector [])

    var _ast = ast,
        _ast2 = _toArray(_ast),
        opAst = _ast2[0],
        argsAst = _ast2.slice(1);

    var op = EVAL(opAst, ctx, resolveString); // evaluate operator

    if (isSF(op)) {
      // special form
      var sfResult = op(argsAst, ctx, resolveString);
      return sfResult;
    }

    var args = argsAst.map(function (a) {
      return EVAL(a, ctx, resolveString);
    }); // evaluate arguments

    if (op.ast) {
      ast = op.ast[0];
      ctx = env_bind(op.ast[2], op.ast[1], args); // TCO
    } else {
      var fnResult = op.apply(op, args);
      return fnResult;
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
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpel__ = __webpack_require__(6);
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
    expr_scope = Object.create(tp === "logical" ? expr_logical_scope : expr_lpe_scope);
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
      "sexpr": ["begin"].concat(a.map(function (el) {
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

  symbol("(number_literal)").nud = itself; // [esix]: commented as in conflict with SQL operator ':'
  // infix("?", 20, function (left) {
  //   this.first = left;
  //   this.second = expression(0);
  //   advance(":");
  //   this.third = expression(0);
  //   this.arity = "ternary";
  //   this.sexpr = ["if", this.first.sexpr, this.second.sexpr, this.third.sexpr];
  //   return this;
  // });
  // [esix]: ternary operator with no conflict on ':' operator

  infix('?', 20, function (left) {
    this.first = left;
    this.second = expression(0);
    this.arity = 'binary';

    if (this.second.arity === 'binary' && this.second.value === ':') {
      this.sexpr = ["if", this.first.sexpr, this.second.sexpr[1], this.second.sexpr[2]];
    } else {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpel__["a" /* makeError */])(this.second, "Invalid ternary operator.");
    }

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
  infixr('⍱', 30);
  operator_alias('⍱', 'nor');
  infixr('⍲', 30);
  operator_alias('⍲', 'nand');
  infixr('⊣', 30);
  operator_alias('⊣', 'car');
  infixr('⊢', 30);
  operator_alias('⊢', 'cdr');
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
/* harmony export (immutable) */ __webpack_exports__["a"] = sql_where_context;
/* harmony export (immutable) */ __webpack_exports__["b"] = eval_sql_where;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpep__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__utils_utils__ = __webpack_require__(7);
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

  _context['lpe_pg_tstz_at_time_zone'] = function (timestamp, zone) {
    // FIXME: check quotes !!!
    if (/'/.test(timestamp)) {
      throw 'Wrong timestamp: ' + JSON.stringify(timestamp);
    }

    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("lpe_pg_tstz_at_time_zone" + timestamp);
    return "'" + timestamp + "'" + "::timestamptz at time zone '" + zone + "'";
  };

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

    var quote_scalar = function quote_scalar(el) {
      if (typeof el === "string") {
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils_utils__["a" /* db_quote_literal */])(el);
      } else if (typeof el === "number") {
        return el;
      } else {
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__utils_utils__["a" /* db_quote_literal */])(JSON.stringify(el));
      }
    };

    var prnt = function prnt(ar) {
      if (ar instanceof Array) {
        if (ar[0] === '$' || ar[0] === '"' || ar[0] === "'" || ar[0] === "[" || ar[0] === 'parse_kv' || ar[0] === "=" || ar[0] === "pg_interval" || ar[0] === "lpe_pg_tstz_at_time_zone") {
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
      // понимаем a = [null] как a is null
      // a = [] просто пропускаем
      // a = [null, 1,2] как a in (1,2) or a is null
      if (r instanceof Array) {
        if (r[0] === '[') {
          r = ['['].concat(r.slice(1).map(function (el) {
            return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(el, _context);
          }));
          var nonnull = r.filter(function (el) {
            return el !== null;
          });

          if (nonnull.length === r.length) {
            if (nonnull.length === 1) {
              return "TRUE";
            } else {
              return prnt(l) + " IN (" + r.slice(1).map(function (el) {
                return prnt(el);
              }).join(',') + ")";
            }
          } else {
            var col = prnt(l);

            if (nonnull.length === 1) {
              return col + " IS NULL";
            } else {
              return "(" + col + " IS NULL OR " + col + " IN (" + nonnull.slice(1).map(function (el) {
                return prnt(el);
              }).join(',') + "))";
            }
          }
        } else {
          //console.log("RESOLVING VAR " + JSON.stringify(r));
          //console.log("RESOLVING VAR " + JSON.stringify(r.slice(1)));
          var var_expr;

          if (r[0] === '$') {
            var_expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(r[1], _context);
          } else {
            var_expr = prnt(r, ctx);
          } //console.log("EVAL" + JSON.stringify(var_expr));


          if (var_expr instanceof Array) {
            return ctx['='](l, ['['].concat(var_expr));
          } else {
            return ctx['='](l, var_expr);
          }
        }
      }

      if (r == null) {
        return prnt(l) + " IS NULL ";
      } else if (r == '') {
        return prnt(l) + " = ''";
      } else {
        return prnt(l) + " = " + prnt(r);
      }
    };

    ctx['='].ast = [[], {}, [], 1]; // mark as macro
    // $(name) will quote text elements !!! suitable for generating things like WHERE title in ('a','b','c')
    // also, we should evaluate expression, if any.

    ctx['$'] = function (inexpr) {
      var expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context

      if (expr instanceof Array) {
        // try to print using quotes, use plv8 !!!
        return expr.map(function (el) {
          return quote_scalar(el);
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
      } // return everything, FIXME: is it right thing to do ?


      return '(/*parse_kv EMPTY*/ 1=1)';
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
/* harmony export (immutable) */ __webpack_exports__["a"] = sql_context;
/* harmony export (immutable) */ __webpack_exports__["b"] = parse_sql_expr;
/* unused harmony export parse_sql_apidb_expr */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lisp__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__sql_where__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lpep__ = __webpack_require__(2);
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



 // polyfill = remove in 2020 !!!

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
  var _context = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__sql_where__["a" /* sql_where_context */])(_vars);
  /* заполняем контекст функциями и макросами, заточенными на SQL */


  _context['sql'] = function () {
    var q; // resulting sql

    var args = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('SQL IN: ', args);

    var find_part = function find_part(p) {
      return args.find(function (el) {
        return p == el[0];
      });
    };

    var sel = find_part('select');
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('FOUND select: ', sel);
    q = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(sel, _context);
    var from = find_part('from');
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('FOUND from: ', from);
    q = q + ' ' + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(from, _context);
    var where = find_part('where');
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("FOUND where: ", where);

    if (where instanceof Array && where.length > 1) {
      q = q + ' ' + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(where, _context);
    }

    var srt = find_part('sort');
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('FOUND sort: ', srt);

    if (srt instanceof Array && srt.length > 1) {
      q = q + ' ' + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(srt, _context);
    }

    return q;
  };

  _context['sql'].ast = [[], {}, [], 1]; // mark as macro

  function prnt(a) {
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('prnt IN: ', a);

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
  } // должен вернуть СТРОКУ


  _context['select'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("select IN: ", JSON.stringify(a));

    if (a.length < 1) {
      return "SELECT *";
    } else {
      return "SELECT " + a.map(prnt).join(',');
    }
  };

  _context['select'].ast = [[], {}, [], 1]; // mark as macro

  _context['from'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('from IN: ', a);

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
  var _context = ctx; // for(var key in _vars) _context[key] = _vars[key];

  _context['->'] = function () {
    var ret = [];

    for (var i = 0; i < arguments.length; i++) {
      ret.push(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(arguments[i], _context));
    }

    return ret.join(',');
  };

  _context['->'].ast = [[], {}, [], 1]; // mark as macro

  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lpep__["a" /* parse */])(_expr);
  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("IN: ", sexpr);
  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */
  // точка входа всегда должна быть ->, так как мы определили -> как макроc чтобы иметь возможность
  // перекодировать имена таблиц в вызов .from()

  if (sexpr[0] !== '->') {
    sexpr = ['->', sexpr];
  } // теперь нужно пройтись по списку вызовов и привести к нормальной форме.
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

    __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("parse do_select_from: ", sql);
  };

  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];

    if (expr instanceof Array) {
      // expr: ["metrics","a","d",["max","c"]]
      if (expr[0] === 'order_by') {
        expr[0] = 'sort';
      }

      ;

      if (expr[0] === 'where') {
        expr[0] = 'where';
      }

      ;

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

  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('parse: ', sql);
  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(sql, _context); // console.log("parse: ", ret);

  return ret;
}
function parse_sql_apidb_expr(_expr, _vars, _forced_table, _forced_where) {
  var ctx = sql_context(_vars);
  var _context = ctx; // for(var key in _vars) _context[key] = _vars[key];

  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lpep__["a" /* parse */])(_expr);
  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("DBAPI IN: ", sexpr);
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

  var cache = {
    "where": [],
    "select": [],
    "order_by": [],
    "from": []
  };

  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];

    if (expr instanceof Array) {
      var fr = expr[0];

      if (fr != 'where' && fr != 'select' && fr != 'order_by' && fr != 'from' && fr != ':') {
        throw 'unexpected func: ' + JSON.stringify(fr);
      } // have no idea how to support aliases for selects...


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
  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log("WHERE", JSON.stringify(w));
  __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('DBAPI parse: ', sql);
  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lisp__["a" /* eval_lisp */])(sql, _context);
  return ret;
}

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lpe", function() { return eval_lpe; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpep__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lisp__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__sql_where__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__sql_context__ = __webpack_require__(4);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parse", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "LPESyntaxError", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "evaluate", function() { return __WEBPACK_IMPORTED_MODULE_2__lisp__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lisp", function() { return __WEBPACK_IMPORTED_MODULE_2__lisp__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "sql_where_context", function() { return __WEBPACK_IMPORTED_MODULE_3__sql_where__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_sql_where", function() { return __WEBPACK_IMPORTED_MODULE_3__sql_where__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "sql_context", function() { return __WEBPACK_IMPORTED_MODULE_4__sql_context__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parse_sql_expr", function() { return __WEBPACK_IMPORTED_MODULE_4__sql_context__["b"]; });




 // test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = evaluate(ast, []);
// console.log(res);

var logo = ['\x1b[0;100m \x1b[48;5;0m', '\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m', '\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m', '\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;0m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;0m  \x1b[48;5;0m', '\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;32m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;200m  \x1b[48;5;0m', '\x1b[48;5;34m  \x1b[48;5;0m\x1b[48;5;130m  \x1b[48;5;0m\x1b[48;5;32m  \x1b[48;5;32m\x1b[48;5;11m  \x1b[48;5;0m\x1b[48;5;200m  \x1b[48;5;0m', '\x1b[38;5;15m\x1b[48;5;16m Luxms BI \x1b[0m', '\x1b[0m'].join('\n');
__WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log(logo); // example
// global helper: should not use it so

plv8.console = __WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */];
__WEBPACK_IMPORTED_MODULE_0__console_console__["a" /* default */].log('LPE initialised!'); // var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);

function eval_lpe(lpe, ctx) {
  var ast = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpep__["a" /* parse */])(lpe);
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lisp__["a" /* eval_lisp */])(ast, ctx);
} // exports to plv8.lpe due to webpack config



/*
CREATE OR REPLACE FUNCTION
lpe.init_parser()
RETURNS VOID
*/

/*
CREATE OR REPLACE FUNCTION
lpe.eval(ast JSONB, context JSONB DEFAULT '{}')
RETURNS JSONB
*/
// lpe.eval = function (ast, context) {

/*
CREATE OR REPLACE FUNCTION
lpe.eval_sql_where(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
*/

/*
CREATE OR REPLACE FUNCTION
lpe.init_sql_where()
RETURNS VOID
*/
// lpe.init_sql_where = function() {
//   plv8.lpe.sql_where_context = sql_where_context;
// }

/*
CREATE OR REPLACE FUNCTION
lpe.init_sql_context()
RETURNS VOID
*/

/*
CREATE OR REPLACE FUNCTION
lpe.parse_sql_expr(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
*/

/***/ }),
/* 6 */
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
};

var isLetter = function isLetter(c) {
  return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z';
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
    } else if (isLetter(c) || c === '_' || c === '$' || c === '#') {
      // first char of name. TODO: remove #
      str = c;
      i += 1;

      for (;;) {
        c = s.charAt(i);

        if (isLetter(c) || isDigit(c) || c === '_' || c === '$') {
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
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = db_quote_literal;
function db_quote_literal(intxt) {
  return plv8.quote_literal(intxt);
}

/***/ })
/******/ ]);
$body$;
COMMENT ON FUNCTION lpe.init(JSON) IS
$$Инициализирует интерпретатор LISP для дальнейшего использования, на вход принимает настройки окружения для LISP.
Также инициализируется парсер LPE-выражений.
Перед использованием не забудьте подать SET plv8.start_proc = '"lpe"."init"'$$;

SELECT lpe.init();


CREATE OR REPLACE FUNCTION
lpe.parse(_expr TEXT)
RETURNS JSON
LANGUAGE 'plv8' STABLE
AS $body$
  var sexpr = plv8.lpe.parse(_expr);
  return sexpr;
$body$;

COMMENT ON FUNCTION lpe.parse(TEXT) IS
$$Parses text into AST$$;

/*********************************************************************************/

CREATE OR REPLACE FUNCTION lpe.eval(ast jsonb, context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plv8
 STABLE
AS $function$

  ret = plv8.lpe.evaluate(ast, context);

  if (typeof(ret) == "function") {
    /*plv8.elog(NOTICE, "RET = ", ret.toString());*/
    return '["function"]';
  } else {
    /*plv8.elog(NOTICE, "tp = ", typeof(ret));*/
    return ret;
  }

$function$;

COMMENT ON FUNCTION lpe.eval(ast jsonb, context jsonb) IS
$$Вычисляет выражение ast (в виде s-expr) и используя контекст со значениями переменных и функций.$$;

/*********************************************************************************/


CREATE OR REPLACE FUNCTION
lpe.eval_sql_where(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
LANGUAGE 'plv8' STABLE
AS $body$

  return plv8.lpe.eval_sql_where(_expr, _vars);

$body$;

COMMENT ON FUNCTION lpe.eval_sql_where(TEXT,JSONB) IS
$$Выполняет разбор LPE выражений в SQL шаблоне для генерации одиночного выражения where() или одиночного order_by().
Второй аргумент = это значения переменных для подстановки.$$;

/*********************************************************************************/

CREATE OR REPLACE FUNCTION
lpe.parse_sql_expr(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
LANGUAGE 'plv8' STABLE
AS $body$

  return plv8.lpe.parse_sql_expr(_expr, _vars);

$body$;

COMMENT ON FUNCTION lpe.parse_sql_expr(TEXT,JSONB) IS
$$Выполняет разбор LPE выражения и выдаёт SQL запрос в виде текста$$;



CREATE OR REPLACE FUNCTION lpe.eval_mixed_expr(_expr jsonb, _vars jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plv8
 STABLE
AS $function$


  var safe_sql_type = function (ret) {
    if (typeof(ret) == "function") {
      return '["function"]';
    } else {
      return ret;
    }
  }

if (_expr instanceof Array) {
    return safe_sql_type(plv8.lpe.eval_lisp(_expr));
  }
  if (typeof(_expr) === 'string') {
    if      (_expr.startsWith('lpe:')) return safe_sql_type(plv8.lpe.eval_lpe(_expr.substr(4)));
    else if (_expr.startsWith('⚡'))   return safe_sql_type(plv8.lpe.eval_lpe(_expr.substr(1)));
  }

  return _expr;
$function$;

COMMENT ON FUNCTION lpe.eval_mixed_expr(JSONB, JSONB) IS
$$Выполняет разбор LPE выражения в разных форматах: LISP S-EXPRESSIONS в виде JSON массива и текстовые выражения LPE. 
Текстовые выражения должны начинаться с префикса lpe: или ⚡. Иначе функция просто вернёт входной параметр _expr$$;