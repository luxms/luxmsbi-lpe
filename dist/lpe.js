/** [LPE]  Version: 1.0.0 - 2020/12/16 17:50:37 */ 
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
/******/ 	return __webpack_require__(__webpack_require__.s = 103);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(7);
var core = __webpack_require__(15);
var hide = __webpack_require__(12);
var redefine = __webpack_require__(10);
var ctx = __webpack_require__(19);
var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE];
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
  var key, own, out, exp;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // extend global
    if (target) redefine(target, key, out, type & $export.U);
    // export
    if (exports[key] != out) hide(exports, key, exp);
    if (IS_PROTO && expProto[key] != out) expProto[key] = out;
  }
};
global.core = core;
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
module.exports = $export;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

var store = __webpack_require__(47)('wks');
var uid = __webpack_require__(32);
var Symbol = __webpack_require__(7).Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

// Thank's IE8 for his funny defineProperty
module.exports = !__webpack_require__(6)(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});


/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var anObject = __webpack_require__(5);
var IE8_DOM_DEFINE = __webpack_require__(74);
var toPrimitive = __webpack_require__(31);
var dP = Object.defineProperty;

exports.f = __webpack_require__(2) ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3);
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};


/***/ }),
/* 7 */
/***/ (function(module, exports) {

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.13 ToObject(argument)
var defined = __webpack_require__(25);
module.exports = function (it) {
  return Object(defined(it));
};


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

// most Object methods by ES6 should accept primitives
var $export = __webpack_require__(0);
var core = __webpack_require__(15);
var fails = __webpack_require__(6);
module.exports = function (KEY, exec) {
  var fn = (core.Object || {})[KEY] || Object[KEY];
  var exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function () { fn(1); }), 'Object', exp);
};


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(7);
var hide = __webpack_require__(12);
var has = __webpack_require__(16);
var SRC = __webpack_require__(32)('src');
var $toString = __webpack_require__(112);
var TO_STRING = 'toString';
var TPL = ('' + $toString).split(TO_STRING);

__webpack_require__(15).inspectSource = function (it) {
  return $toString.call(it);
};

(module.exports = function (O, key, val, safe) {
  var isFunction = typeof val == 'function';
  if (isFunction) has(val, 'name') || hide(val, 'name', key);
  if (O[key] === val) return;
  if (isFunction) has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if (O === global) {
    O[key] = val;
  } else if (!safe) {
    delete O[key];
    hide(O, key, val);
  } else if (O[key]) {
    O[key] = val;
  } else {
    hide(O, key, val);
  }
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, TO_STRING, function toString() {
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = __webpack_require__(56);
var defined = __webpack_require__(25);
module.exports = function (it) {
  return IObject(defined(it));
};


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

var dP = __webpack_require__(4);
var createDesc = __webpack_require__(30);
module.exports = __webpack_require__(2) ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.15 ToLength
var toInteger = __webpack_require__(48);
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};


/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony default export */ __webpack_exports__["a"] = (console);

/***/ }),
/* 15 */
/***/ (function(module, exports) {

var core = module.exports = { version: '2.6.5' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef


/***/ }),
/* 16 */
/***/ (function(module, exports) {

var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

var pIE = __webpack_require__(29);
var createDesc = __webpack_require__(30);
var toIObject = __webpack_require__(11);
var toPrimitive = __webpack_require__(31);
var has = __webpack_require__(16);
var IE8_DOM_DEFINE = __webpack_require__(74);
var gOPD = Object.getOwnPropertyDescriptor;

exports.f = __webpack_require__(2) ? gOPD : function getOwnPropertyDescriptor(O, P) {
  O = toIObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return gOPD(O, P);
  } catch (e) { /* empty */ }
  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
};


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = __webpack_require__(84);
var enumBugKeys = __webpack_require__(55);

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

// optional / simple context binding
var aFunction = __webpack_require__(24);
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

var META = __webpack_require__(32)('meta');
var isObject = __webpack_require__(3);
var has = __webpack_require__(16);
var setDesc = __webpack_require__(4).f;
var id = 0;
var isExtensible = Object.isExtensible || function () {
  return true;
};
var FREEZE = !__webpack_require__(6)(function () {
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function (it) {
  setDesc(it, META, { value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  } });
};
var fastKey = function (it, create) {
  // return primitive with prefix
  if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return 'F';
    // not necessary to add metadata
    if (!create) return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function (it, create) {
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return true;
    // not necessary to add metadata
    if (!create) return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function (it) {
  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY: META,
  NEED: false,
  fastKey: fastKey,
  getWeak: getWeak,
  onFreeze: onFreeze
};


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

__webpack_require__(140);
var anObject = __webpack_require__(5);
var $flags = __webpack_require__(40);
var DESCRIPTORS = __webpack_require__(2);
var TO_STRING = 'toString';
var $toString = /./[TO_STRING];

var define = function (fn) {
  __webpack_require__(10)(RegExp.prototype, TO_STRING, fn, true);
};

// 21.2.5.14 RegExp.prototype.toString()
if (__webpack_require__(6)(function () { return $toString.call({ source: 'a', flags: 'b' }) != '/a/b'; })) {
  define(function toString() {
    var R = anObject(this);
    return '/'.concat(R.source, '/',
      'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? $flags.call(R) : undefined);
  });
// FF44- RegExp#toString has a wrong name
} else if ($toString.name != TO_STRING) {
  define(function toString() {
    return $toString.call(this);
  });
}


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// ECMAScript 6 symbols shim
var global = __webpack_require__(7);
var has = __webpack_require__(16);
var DESCRIPTORS = __webpack_require__(2);
var $export = __webpack_require__(0);
var redefine = __webpack_require__(10);
var META = __webpack_require__(20).KEY;
var $fails = __webpack_require__(6);
var shared = __webpack_require__(47);
var setToStringTag = __webpack_require__(46);
var uid = __webpack_require__(32);
var wks = __webpack_require__(1);
var wksExt = __webpack_require__(95);
var wksDefine = __webpack_require__(94);
var enumKeys = __webpack_require__(111);
var isArray = __webpack_require__(77);
var anObject = __webpack_require__(5);
var isObject = __webpack_require__(3);
var toIObject = __webpack_require__(11);
var toPrimitive = __webpack_require__(31);
var createDesc = __webpack_require__(30);
var _create = __webpack_require__(28);
var gOPNExt = __webpack_require__(83);
var $GOPD = __webpack_require__(17);
var $DP = __webpack_require__(4);
var $keys = __webpack_require__(18);
var gOPD = $GOPD.f;
var dP = $DP.f;
var gOPN = gOPNExt.f;
var $Symbol = global.Symbol;
var $JSON = global.JSON;
var _stringify = $JSON && $JSON.stringify;
var PROTOTYPE = 'prototype';
var HIDDEN = wks('_hidden');
var TO_PRIMITIVE = wks('toPrimitive');
var isEnum = {}.propertyIsEnumerable;
var SymbolRegistry = shared('symbol-registry');
var AllSymbols = shared('symbols');
var OPSymbols = shared('op-symbols');
var ObjectProto = Object[PROTOTYPE];
var USE_NATIVE = typeof $Symbol == 'function';
var QObject = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function () {
  return _create(dP({}, 'a', {
    get: function () { return dP(this, 'a', { value: 7 }).a; }
  })).a != 7;
}) ? function (it, key, D) {
  var protoDesc = gOPD(ObjectProto, key);
  if (protoDesc) delete ObjectProto[key];
  dP(it, key, D);
  if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function (tag) {
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D) {
  if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if (has(AllSymbols, key)) {
    if (!D.enumerable) {
      if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
      D = _create(D, { enumerable: createDesc(0, false) });
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P) {
  anObject(it);
  var keys = enumKeys(P = toIObject(P));
  var i = 0;
  var l = keys.length;
  var key;
  while (l > i) $defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P) {
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key) {
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
  it = toIObject(it);
  key = toPrimitive(key, true);
  if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
  var D = gOPD(it, key);
  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it) {
  var names = gOPN(toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
  var IS_OP = it === ObjectProto;
  var names = gOPN(IS_OP ? OPSymbols : toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if (!USE_NATIVE) {
  $Symbol = function Symbol() {
    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function (value) {
      if (this === ObjectProto) $set.call(OPSymbols, value);
      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, { configurable: true, set: $set });
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f = $defineProperty;
  __webpack_require__(42).f = gOPNExt.f = $getOwnPropertyNames;
  __webpack_require__(29).f = $propertyIsEnumerable;
  __webpack_require__(43).f = $getOwnPropertySymbols;

  if (DESCRIPTORS && !__webpack_require__(27)) {
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function (name) {
    return wrap(wks(name));
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });

for (var es6Symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), j = 0; es6Symbols.length > j;)wks(es6Symbols[j++]);

for (var wellKnownSymbols = $keys(wks.store), k = 0; wellKnownSymbols.length > k;) wksDefine(wellKnownSymbols[k++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function (key) {
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(sym) {
    if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol!');
    for (var key in SymbolRegistry) if (SymbolRegistry[key] === sym) return key;
  },
  useSetter: function () { setter = true; },
  useSimple: function () { setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it) {
    var args = [it];
    var i = 1;
    var replacer, $replacer;
    while (arguments.length > i) args.push(arguments[i++]);
    $replacer = replacer = args[1];
    if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
    if (!isArray(replacer)) replacer = function (key, value) {
      if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
      if (!isSymbol(value)) return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || __webpack_require__(12)($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);


/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = parse;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_find__ = __webpack_require__(61);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_find___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_find__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lpel__ = __webpack_require__(104);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_2__lpel__["c"]; });


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
  var m_symbol_table = {};
  var m_token;
  var m_tokens;
  var m_token_nr; // стэк для типов выражений

  var m_expr_scope = {
    pop: function pop() {}
  }; // для разбора логических выражений типа (A and B or C)
  // для хранения алиасов для операций

  var m_operator_aliases = {};

  var operator_alias = function operator_alias(from, to) {
    m_operator_aliases[from] = to;
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
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "logical"
  };
  var expr_lpe_scope = {
    pop: function pop() {
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "lpe"
  };

  var new_expression_scope = function new_expression_scope(tp) {
    var s = m_expr_scope;
    m_expr_scope = Object.create(tp === "logical" ? expr_logical_scope : expr_lpe_scope);
    m_expr_scope.parent = s;
    return m_expr_scope;
  };

  var advance = function advance(id) {
    var a, o, t, v;

    if (id && m_token.id !== id) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(m_token, "Got " + m_token.value + " but expected '" + id + "'.");
    }

    if (m_token_nr >= m_tokens.length) {
      m_token = m_symbol_table["(end)"];
      return;
    }

    t = m_tokens[m_token_nr];
    m_token_nr += 1;
    v = t.value;
    a = t.type;

    if (a === "name") {
      if (v === 'true' || v === 'false' || v === 'null') {
        o = m_symbol_table[v];
        a = "literal";
      } else if (m_expr_scope.tp == "logical") {
        if (v === "or" || v === "and" || v === "not" || v === "in" || v === "is") {
          a = "operator";
          o = m_symbol_table[v];

          if (!o) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(t, "Unknown logical operator.");
          }
        } else {
          o = scope.find(v);
        }
      } else {
        o = scope.find(v);
      }
    } else if (a === "operator") {
      o = m_symbol_table[v];

      if (!o) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(t, "Unknown operator.");
      }
    } else if (a === "string_double") {
      o = m_symbol_table["(string_literal_double)"];
      a = "literal";
    } else if (a === "string_single") {
      o = m_symbol_table["(string_literal_single)"];
      a = "literal";
    } else if (a === "number") {
      o = m_symbol_table["(number_literal)"];
      a = "literal";
    } else {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(t, "Unexpected token.");
    }

    m_token = Object.create(o);
    m_token.from = t.from;
    m_token.to = t.to;
    m_token.value = v;
    m_token.arity = a;

    if (a == "operator") {
      m_token.sexpr = m_operator_aliases[v];
    } else {
      m_token.sexpr = v; // by dima
    }

    return m_token;
  };

  var statement = function statement() {
    var n = m_token,
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
      if (m_token.id === "(end)") {
        break;
      } else if (m_token.value === ';') {
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
    var t = m_token;
    advance();
    left = t.nud();

    while (rbp < m_token.lbp) {
      t = m_token;
      advance();
      left = t.led(left);
    }

    return left;
  };

  var original_symbol = {
    nud: function nud() {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(this, "Undefined.");
    },
    led: function led(left) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(this, "Missing operator.");
    }
  };

  var symbol = function symbol(id, bp) {
    var s = m_symbol_table[id];
    bp = bp || 0;

    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp;
      }
    } else {
      s = Object.create(original_symbol);
      s.id = s.value = id;
      s.lbp = bp;
      m_symbol_table[id] = s;
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
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(this.second, "Invalid ternary operator.");
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
  infixr('⍴', 30);
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
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(left, "Expected a variable name.");
      }
    } // dima support for missed function arguments...


    if (m_token.id !== ")") {
      if (false) {
        // специальный парсер для where - logical expression.
        // тут у нас выражение с использованием скобок, and, or, not и никаких запятых...
        new_expression_scope("logical");
        var e = expression(0);
        m_expr_scope.pop();
        a.push(e);
      } else {
        new_expression_scope("lpe");

        while (true) {
          // console.log(">" + token.arity + " NAME:" + left.value);
          if (m_token.id === ',') {
            a.push({
              value: null,
              arity: "literal"
            });
            advance();
          } else if (m_token.id === ')') {
            a.push({
              value: null,
              arity: "literal"
            });
            break;
          } else {
            new_expression_scope("logical");
            var e = expression(0);
            m_expr_scope.pop(); // var e = statements();

            a.push(e);

            if (m_token.id !== ",") {
              break;
            }

            advance(",");
          }
        }

        m_expr_scope.pop();
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
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["a" /* makeError */])(v, "Only functions may have dot (.) unary operator.");
    } // this.first = v;
    // this.arity = "unary";
    // return this;
    // skip unary dot !!!


    return v;
  });
  prefix("(", function () {
    var e = expression(0);

    if (m_expr_scope.tp == "logical") {
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

    if (m_token.id !== "]") {
      while (true) {
        a.push(expression(0)); // a.push(statements());

        if (m_token.id !== ",") {
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
    m_tokens = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lpel__["b" /* tokenize */])(source, '=<>!+-*&|/%^:.', '=<>&|:.');
    m_token_nr = 0;
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
    __WEBPACK_IMPORTED_MODULE_1__console_console__["a" /* default */].error("Error", err.message);
    __WEBPACK_IMPORTED_MODULE_1__console_console__["a" /* default */].error("Error", err.stack);
    throw err;
  }
}


/***/ }),
/* 24 */
/***/ (function(module, exports) {

module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};


/***/ }),
/* 25 */
/***/ (function(module, exports) {

// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};


/***/ }),
/* 26 */
/***/ (function(module, exports) {

module.exports = {};


/***/ }),
/* 27 */
/***/ (function(module, exports) {

module.exports = false;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = __webpack_require__(5);
var dPs = __webpack_require__(82);
var enumBugKeys = __webpack_require__(55);
var IE_PROTO = __webpack_require__(60)('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = __webpack_require__(71)('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  __webpack_require__(113).appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};


/***/ }),
/* 29 */
/***/ (function(module, exports) {

exports.f = {}.propertyIsEnumerable;


/***/ }),
/* 30 */
/***/ (function(module, exports) {

module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = __webpack_require__(3);
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};


/***/ }),
/* 32 */
/***/ (function(module, exports) {

var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var addToUnscopables = __webpack_require__(53);
var step = __webpack_require__(80);
var Iterators = __webpack_require__(26);
var toIObject = __webpack_require__(11);

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = __webpack_require__(58)(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var isRegExp = __webpack_require__(57);
var anObject = __webpack_require__(5);
var speciesConstructor = __webpack_require__(116);
var advanceStringIndex = __webpack_require__(54);
var toLength = __webpack_require__(13);
var callRegExpExec = __webpack_require__(45);
var regexpExec = __webpack_require__(59);
var fails = __webpack_require__(6);
var $min = Math.min;
var $push = [].push;
var $SPLIT = 'split';
var LENGTH = 'length';
var LAST_INDEX = 'lastIndex';
var MAX_UINT32 = 0xffffffff;

// babel-minify transpiles RegExp('x', 'y') -> /x/y and it causes SyntaxError
var SUPPORTS_Y = !fails(function () { RegExp(MAX_UINT32, 'y'); });

// @@split logic
__webpack_require__(39)('split', 2, function (defined, SPLIT, $split, maybeCallNative) {
  var internalSplit;
  if (
    'abbc'[$SPLIT](/(b)*/)[1] == 'c' ||
    'test'[$SPLIT](/(?:)/, -1)[LENGTH] != 4 ||
    'ab'[$SPLIT](/(?:ab)*/)[LENGTH] != 2 ||
    '.'[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 ||
    '.'[$SPLIT](/()()/)[LENGTH] > 1 ||
    ''[$SPLIT](/.?/)[LENGTH]
  ) {
    // based on es5-shim implementation, need to rework it
    internalSplit = function (separator, limit) {
      var string = String(this);
      if (separator === undefined && limit === 0) return [];
      // If `separator` is not a regex, use native split
      if (!isRegExp(separator)) return $split.call(string, separator, limit);
      var output = [];
      var flags = (separator.ignoreCase ? 'i' : '') +
                  (separator.multiline ? 'm' : '') +
                  (separator.unicode ? 'u' : '') +
                  (separator.sticky ? 'y' : '');
      var lastLastIndex = 0;
      var splitLimit = limit === undefined ? MAX_UINT32 : limit >>> 0;
      // Make `global` and avoid `lastIndex` issues by working with a copy
      var separatorCopy = new RegExp(separator.source, flags + 'g');
      var match, lastIndex, lastLength;
      while (match = regexpExec.call(separatorCopy, string)) {
        lastIndex = separatorCopy[LAST_INDEX];
        if (lastIndex > lastLastIndex) {
          output.push(string.slice(lastLastIndex, match.index));
          if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
          lastLength = match[0][LENGTH];
          lastLastIndex = lastIndex;
          if (output[LENGTH] >= splitLimit) break;
        }
        if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++; // Avoid an infinite loop
      }
      if (lastLastIndex === string[LENGTH]) {
        if (lastLength || !separatorCopy.test('')) output.push('');
      } else output.push(string.slice(lastLastIndex));
      return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
    };
  // Chakra, V8
  } else if ('0'[$SPLIT](undefined, 0)[LENGTH]) {
    internalSplit = function (separator, limit) {
      return separator === undefined && limit === 0 ? [] : $split.call(this, separator, limit);
    };
  } else {
    internalSplit = $split;
  }

  return [
    // `String.prototype.split` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.split
    function split(separator, limit) {
      var O = defined(this);
      var splitter = separator == undefined ? undefined : separator[SPLIT];
      return splitter !== undefined
        ? splitter.call(separator, O, limit)
        : internalSplit.call(String(O), separator, limit);
    },
    // `RegExp.prototype[@@split]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@split
    //
    // NOTE: This cannot be properly polyfilled in engines that don't support
    // the 'y' flag.
    function (regexp, limit) {
      var res = maybeCallNative(internalSplit, regexp, this, limit, internalSplit !== $split);
      if (res.done) return res.value;

      var rx = anObject(regexp);
      var S = String(this);
      var C = speciesConstructor(rx, RegExp);

      var unicodeMatching = rx.unicode;
      var flags = (rx.ignoreCase ? 'i' : '') +
                  (rx.multiline ? 'm' : '') +
                  (rx.unicode ? 'u' : '') +
                  (SUPPORTS_Y ? 'y' : 'g');

      // ^(? + rx + ) is needed, in combination with some S slicing, to
      // simulate the 'y' flag.
      var splitter = new C(SUPPORTS_Y ? rx : '^(?:' + rx.source + ')', flags);
      var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
      if (lim === 0) return [];
      if (S.length === 0) return callRegExpExec(splitter, S) === null ? [S] : [];
      var p = 0;
      var q = 0;
      var A = [];
      while (q < S.length) {
        splitter.lastIndex = SUPPORTS_Y ? q : 0;
        var z = callRegExpExec(splitter, SUPPORTS_Y ? S : S.slice(q));
        var e;
        if (
          z === null ||
          (e = $min(toLength(splitter.lastIndex + (SUPPORTS_Y ? 0 : q)), S.length)) === p
        ) {
          q = advanceStringIndex(S, q, unicodeMatching);
        } else {
          A.push(S.slice(p, q));
          if (A.length === lim) return A;
          for (var i = 1; i <= z.length - 1; i++) {
            A.push(z[i]);
            if (A.length === lim) return A;
          }
          q = p = e;
        }
      }
      A.push(S.slice(p));
      return A;
    }
  ];
});


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(94)('asyncIterator');


/***/ }),
/* 36 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return isArray; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return isString; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return isNumber; });
/* unused harmony export isBoolean */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return isHash; });
/* unused harmony export isFunction */
/* unused harmony export makeMacro */
/* harmony export (immutable) */ __webpack_exports__["f"] = makeSF;
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_lisp;
/* unused harmony export init_lisp */
/* unused harmony export evaluate */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator__ = __webpack_require__(66);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from__ = __webpack_require__(62);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_object_values__ = __webpack_require__(50);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_object_values___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_object_values__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_iterator__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_es6_object_keys__ = __webpack_require__(64);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_es6_object_keys___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_core_js_modules_es6_object_keys__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_regexp_constructor__ = __webpack_require__(98);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_regexp_constructor___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_regexp_constructor__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_symbol_async_iterator__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_symbol_async_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_symbol_async_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_symbol__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_symbol___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_symbol__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_web_dom_iterable__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_web_dom_iterable___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8_core_js_modules_web_dom_iterable__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_to_string__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__lpep__ = __webpack_require__(23);











function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
 * @param {*} value - optional value to set (undefined if get)
 * @param {*} resolveOptions - options on how to resolve
 */

function $var$(ctx, varName, value, resolveOptions) {
  if (isArray(ctx)) {
    // contexts chain
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = ctx[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var theCtx = _step.value;
        var result = $var$(theCtx, varName, value, resolveOptions);
        if (result === undefined) continue; // no such var in context

        if (value === undefined) return result; // get => we've got a result

        return $var$(theCtx, varName, value, resolveOptions); // set => redirect 'set' to context with variable.
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

    if (ctx.length) $var$(ctx[0], varName, value, resolveOptions); // set => set variable to HEAD context

    return undefined; // ??? ctx.length = 0
  }

  if (isFunction(ctx)) {
    return ctx(varName, value, resolveOptions);
  }

  if (isHash(ctx)) {
    if (value === undefined) {
      // get from hash
      var _result = ctx[varName];

      if (_result !== undefined) {
        // found value in hash
        return _result;
      }

      if (varName.substr(0, 3) !== 'sf:' && isFunction(ctx['sf:' + varName])) {
        // user-defined special form
        return makeSF(ctx['sf:' + varName]);
      }

      return undefined;
    } else {
      return ctx[varName] = value;
    }
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
  'if': makeSF(function (ast, ctx, ro) {
    return EVAL(ast[0], ctx, _objectSpread({}, ro, {
      resolveString: false
    })) ? EVAL(ast[1], ctx, ro) : EVAL(ast[2], ctx, ro);
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
        value = _ast$map2[2]; // hack


    if (propertyName === undefined && isString(ast[1])) {
      // string propertyName tried to evaluate in rs context
      propertyName = ast[1];
    }

    try {
      return value !== undefined ? obj[propertyName] = value : obj[propertyName];
    } catch (err) {
      return value; // undefined when 'get'
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
  }),
  'eval_lpe': makeSF(function (ast, ctx, rs) {
    var lpeCode = eval_lisp(ast[0], ctx, rs);
    var lisp = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_11__lpep__["a" /* parse */])(lpeCode);
    var result = eval_lisp(lisp, ctx);
    return result;
  }),
  'filterit': function filterit(ast, ctx, rs) {
    var array = eval_lisp(ast[0], ctx, rs);
    var conditionAST = ast[1];
    var result = Array.prototype.filter.call(array, function (it, idx) {
      return !!eval_lisp(conditionAST, [{
        it: it,
        idx: idx
      }, ctx], rs);
    });
    return result;
  },
  'mapit': function mapit(ast, ctx, rs) {
    var array = eval_lisp(ast[0], ctx, rs);
    var conditionAST = ast[1];
    var result = Array.prototype.map.call(array, function (it, idx) {
      return eval_lisp(conditionAST, [{
        it: it,
        idx: idx
      }, ctx], rs);
    });
    return result;
  }
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
  'console': __WEBPACK_IMPORTED_MODULE_10__console_console__["a" /* default */],
  'JSON': JSON
}, SPECIAL_FORMS, {
  // built-in functions
  '=': function _() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return args.every(function (v) {
      return v == args[0];
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
      return v == args[0];
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
  'map': function map(arr, fn) {
    return arr.map(function (it) {
      return fn(it);
    });
  },
  'filter': function filter(arr, fn) {
    return arr.filter(function (it) {
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

    return __WEBPACK_IMPORTED_MODULE_10__console_console__["a" /* default */].log(args.map(function (x) {
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

    return __WEBPACK_IMPORTED_MODULE_10__console_console__["a" /* default */].log(args.map(function (x) {
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
  'join': function join(a, sep) {
    return Array.prototype.join.call(a, sep);
  },
  // operator from APL language
  '⍴': function _(len) {
    for (var _len23 = arguments.length, values = new Array(_len23 > 1 ? _len23 - 1 : 0), _key23 = 1; _key23 < _len23; _key23++) {
      values[_key23 - 1] = arguments[_key23];
    }

    return Array.apply(null, Array(len)).map(function (a, idx) {
      return values[idx % values.length];
    });
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
    for (var _len24 = arguments.length, args = new Array(_len24), _key24 = 0; _key24 < _len24; _key24++) {
      args[_key24] = arguments[_key24];
    }

    return ['begin'].concat(args);
  }),
  '->': makeMacro(function (acc) {
    for (var _len25 = arguments.length, ast = new Array(_len25 > 1 ? _len25 - 1 : 0), _key25 = 1; _key25 < _len25; _key25++) {
      ast[_key25 - 1] = arguments[_key25];
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
        arr = arr.slice(0); // must copy array before modify

        arr.splice(1, 0, acc); // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }

      acc = arr;
    }

    return acc;
  }),
  '->>': makeMacro(function (acc) {
    for (var _len26 = arguments.length, ast = new Array(_len26 > 1 ? _len26 - 1 : 0), _key26 = 1; _key26 < _len26; _key26++) {
      ast[_key26 - 1] = arguments[_key26];
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
    for (var _len27 = arguments.length, ast = new Array(_len27), _key27 = 0; _key27 < _len27; _key27++) {
      ast[_key27] = arguments[_key27];
    }

    /// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
    /// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
    /// invoke хорошо стыкуется с ->
    ast.splice(0, 0, ".");
    return ast;
  }),
  'and': makeMacro(function () {
    for (var _len28 = arguments.length, ast = new Array(_len28), _key28 = 0; _key28 < _len28; _key28++) {
      ast[_key28] = arguments[_key28];
    }

    if (ast.length === 0) return true;
    if (ast.length === 1) return ast[0];
    return ["let", ["__and", ast[0]], ["if", "__and", ["and"].concat(ast.slice(1)), "__and"]];
  }),
  'or': makeMacro(function () {
    for (var _len29 = arguments.length, ast = new Array(_len29), _key29 = 0; _key29 < _len29; _key29++) {
      ast[_key29] = arguments[_key29];
    }

    if (ast.length === 0) return false;
    if (ast.length === 1) return ast[0];
    return ["let", ["__or", ast[0]], ["if", "__or", "__or", ["or"].concat(ast.slice(1))]];
  }),
  // system functions & objects
  // 'js': eval,
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

function EVAL(ast, ctx, resolveOptions) {
  while (true) {
    if (!isArray(ast)) {
      // atom
      if (isString(ast)) {
        var value = $var$(ctx, ast, undefined, resolveOptions);

        if (value !== undefined) {
          // variable
          return value;
        }

        return resolveOptions && resolveOptions.resolveString ? ast : undefined; // if string and not in ctx
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

    var op = EVAL(opAst, ctx, _objectSpread({}, resolveOptions, {
      wantCallable: true
    })); // evaluate operator

    if (typeof op !== 'function') {
      throw new Error('Error: ' + String(op) + ' is not a function');
    }

    if (isSF(op)) {
      // special form
      var sfResult = op(argsAst, ctx, resolveOptions);
      return sfResult;
    }

    var args = argsAst.map(function (a) {
      return EVAL(a, ctx, resolveOptions);
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


function eval_lisp(ast, ctx, options) {
  var result = EVAL(ast, [ctx || {}, STDLIB], options || {
    "resolveString": true
  });
  return result;
} // Use with care

function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: function _eval(ast) {
      return eval_lisp(ast, ctx);
    },
    val: function val(varName, value) {
      return $var$(ctx, varName, value);
    }
  };
} // deprecated

function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = __webpack_require__(38);
var TAG = __webpack_require__(1)('toStringTag');
// ES3 wrong here
var ARG = cof(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

module.exports = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};


/***/ }),
/* 38 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

__webpack_require__(139);
var redefine = __webpack_require__(10);
var hide = __webpack_require__(12);
var fails = __webpack_require__(6);
var defined = __webpack_require__(25);
var wks = __webpack_require__(1);
var regexpExec = __webpack_require__(59);

var SPECIES = wks('species');

var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
  // #replace needs built-in support for named groups.
  // #match works fine because it just return the exec results, even if it has
  // a "grops" property.
  var re = /./;
  re.exec = function () {
    var result = [];
    result.groups = { a: '7' };
    return result;
  };
  return ''.replace(re, '$<a>') !== '7';
});

var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = (function () {
  // Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
  var re = /(?:)/;
  var originalExec = re.exec;
  re.exec = function () { return originalExec.apply(this, arguments); };
  var result = 'ab'.split(re);
  return result.length === 2 && result[0] === 'a' && result[1] === 'b';
})();

module.exports = function (KEY, length, exec) {
  var SYMBOL = wks(KEY);

  var DELEGATES_TO_SYMBOL = !fails(function () {
    // String methods call symbol-named RegEp methods
    var O = {};
    O[SYMBOL] = function () { return 7; };
    return ''[KEY](O) != 7;
  });

  var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL ? !fails(function () {
    // Symbol-named RegExp methods call .exec
    var execCalled = false;
    var re = /a/;
    re.exec = function () { execCalled = true; return null; };
    if (KEY === 'split') {
      // RegExp[@@split] doesn't call the regex's exec method, but first creates
      // a new one. We need to return the patched regex when creating the new one.
      re.constructor = {};
      re.constructor[SPECIES] = function () { return re; };
    }
    re[SYMBOL]('');
    return !execCalled;
  }) : undefined;

  if (
    !DELEGATES_TO_SYMBOL ||
    !DELEGATES_TO_EXEC ||
    (KEY === 'replace' && !REPLACE_SUPPORTS_NAMED_GROUPS) ||
    (KEY === 'split' && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC)
  ) {
    var nativeRegExpMethod = /./[SYMBOL];
    var fns = exec(
      defined,
      SYMBOL,
      ''[KEY],
      function maybeCallNative(nativeMethod, regexp, str, arg2, forceStringMethod) {
        if (regexp.exec === regexpExec) {
          if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
            // The native String method already delegates to @@method (this
            // polyfilled function), leasing to infinite recursion.
            // We avoid it by directly calling the native @@method method.
            return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
          }
          return { done: true, value: nativeMethod.call(str, regexp, arg2) };
        }
        return { done: false };
      }
    );
    var strfn = fns[0];
    var rxfn = fns[1];

    redefine(String.prototype, KEY, strfn);
    hide(RegExp.prototype, SYMBOL, length == 2
      // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
      // 21.2.5.11 RegExp.prototype[@@split](string, limit)
      ? function (string, arg) { return rxfn.call(string, this, arg); }
      // 21.2.5.6 RegExp.prototype[@@match](string)
      // 21.2.5.9 RegExp.prototype[@@search](string)
      : function (string) { return rxfn.call(string, this); }
    );
  }
};


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 21.2.5.3 get RegExp.prototype.flags
var anObject = __webpack_require__(5);
module.exports = function () {
  var that = anObject(this);
  var result = '';
  if (that.global) result += 'g';
  if (that.ignoreCase) result += 'i';
  if (that.multiline) result += 'm';
  if (that.unicode) result += 'u';
  if (that.sticky) result += 'y';
  return result;
};


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Forced replacement prototype accessors methods
module.exports = __webpack_require__(27) || !__webpack_require__(6)(function () {
  var K = Math.random();
  // In FF throws only define methods
  // eslint-disable-next-line no-undef, no-useless-call
  __defineSetter__.call(null, K, function () { /* empty */ });
  delete __webpack_require__(7)[K];
});


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys = __webpack_require__(84);
var hiddenKeys = __webpack_require__(55).concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return $keys(O, hiddenKeys);
};


/***/ }),
/* 43 */
/***/ (function(module, exports) {

exports.f = Object.getOwnPropertySymbols;


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = __webpack_require__(16);
var toObject = __webpack_require__(8);
var IE_PROTO = __webpack_require__(60)('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var classof = __webpack_require__(37);
var builtinExec = RegExp.prototype.exec;

 // `RegExpExec` abstract operation
// https://tc39.github.io/ecma262/#sec-regexpexec
module.exports = function (R, S) {
  var exec = R.exec;
  if (typeof exec === 'function') {
    var result = exec.call(R, S);
    if (typeof result !== 'object') {
      throw new TypeError('RegExp exec method returned something other than an Object or null');
    }
    return result;
  }
  if (classof(R) !== 'RegExp') {
    throw new TypeError('RegExp#exec called on incompatible receiver');
  }
  return builtinExec.call(R, S);
};


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

var def = __webpack_require__(4).f;
var has = __webpack_require__(16);
var TAG = __webpack_require__(1)('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

var core = __webpack_require__(15);
var global = __webpack_require__(7);
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: core.version,
  mode: __webpack_require__(27) ? 'pure' : 'global',
  copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
});


/***/ }),
/* 48 */
/***/ (function(module, exports) {

// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var anObject = __webpack_require__(5);
var toObject = __webpack_require__(8);
var toLength = __webpack_require__(13);
var toInteger = __webpack_require__(48);
var advanceStringIndex = __webpack_require__(54);
var regExpExec = __webpack_require__(45);
var max = Math.max;
var min = Math.min;
var floor = Math.floor;
var SUBSTITUTION_SYMBOLS = /\$([$&`']|\d\d?|<[^>]*>)/g;
var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&`']|\d\d?)/g;

var maybeToString = function (it) {
  return it === undefined ? it : String(it);
};

// @@replace logic
__webpack_require__(39)('replace', 2, function (defined, REPLACE, $replace, maybeCallNative) {
  return [
    // `String.prototype.replace` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.replace
    function replace(searchValue, replaceValue) {
      var O = defined(this);
      var fn = searchValue == undefined ? undefined : searchValue[REPLACE];
      return fn !== undefined
        ? fn.call(searchValue, O, replaceValue)
        : $replace.call(String(O), searchValue, replaceValue);
    },
    // `RegExp.prototype[@@replace]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@replace
    function (regexp, replaceValue) {
      var res = maybeCallNative($replace, regexp, this, replaceValue);
      if (res.done) return res.value;

      var rx = anObject(regexp);
      var S = String(this);
      var functionalReplace = typeof replaceValue === 'function';
      if (!functionalReplace) replaceValue = String(replaceValue);
      var global = rx.global;
      if (global) {
        var fullUnicode = rx.unicode;
        rx.lastIndex = 0;
      }
      var results = [];
      while (true) {
        var result = regExpExec(rx, S);
        if (result === null) break;
        results.push(result);
        if (!global) break;
        var matchStr = String(result[0]);
        if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
      }
      var accumulatedResult = '';
      var nextSourcePosition = 0;
      for (var i = 0; i < results.length; i++) {
        result = results[i];
        var matched = String(result[0]);
        var position = max(min(toInteger(result.index), S.length), 0);
        var captures = [];
        // NOTE: This is equivalent to
        //   captures = result.slice(1).map(maybeToString)
        // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
        // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
        // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
        for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));
        var namedCaptures = result.groups;
        if (functionalReplace) {
          var replacerArgs = [matched].concat(captures, position, S);
          if (namedCaptures !== undefined) replacerArgs.push(namedCaptures);
          var replacement = String(replaceValue.apply(undefined, replacerArgs));
        } else {
          replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
        }
        if (position >= nextSourcePosition) {
          accumulatedResult += S.slice(nextSourcePosition, position) + replacement;
          nextSourcePosition = position + matched.length;
        }
      }
      return accumulatedResult + S.slice(nextSourcePosition);
    }
  ];

    // https://tc39.github.io/ecma262/#sec-getsubstitution
  function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
    var tailPos = position + matched.length;
    var m = captures.length;
    var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
    if (namedCaptures !== undefined) {
      namedCaptures = toObject(namedCaptures);
      symbols = SUBSTITUTION_SYMBOLS;
    }
    return $replace.call(replacement, symbols, function (match, ch) {
      var capture;
      switch (ch.charAt(0)) {
        case '$': return '$';
        case '&': return matched;
        case '`': return str.slice(0, position);
        case "'": return str.slice(tailPos);
        case '<':
          capture = namedCaptures[ch.slice(1, -1)];
          break;
        default: // \d\d?
          var n = +ch;
          if (n === 0) return match;
          if (n > m) {
            var f = floor(n / 10);
            if (f === 0) return match;
            if (f <= m) return captures[f - 1] === undefined ? ch.charAt(1) : captures[f - 1] + ch.charAt(1);
            return match;
          }
          capture = captures[n - 1];
      }
      return capture === undefined ? '' : capture;
    });
  }
});


/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

// https://github.com/tc39/proposal-object-values-entries
var $export = __webpack_require__(0);
var $values = __webpack_require__(85)(false);

$export($export.S, 'Object', {
  values: function values(it) {
    return $values(it);
  }
});


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

var $iterators = __webpack_require__(33);
var getKeys = __webpack_require__(18);
var redefine = __webpack_require__(10);
var global = __webpack_require__(7);
var hide = __webpack_require__(12);
var Iterators = __webpack_require__(26);
var wks = __webpack_require__(1);
var ITERATOR = wks('iterator');
var TO_STRING_TAG = wks('toStringTag');
var ArrayValues = Iterators.Array;

var DOMIterables = {
  CSSRuleList: true, // TODO: Not spec compliant, should be false.
  CSSStyleDeclaration: false,
  CSSValueList: false,
  ClientRectList: false,
  DOMRectList: false,
  DOMStringList: false,
  DOMTokenList: true,
  DataTransferItemList: false,
  FileList: false,
  HTMLAllCollection: false,
  HTMLCollection: false,
  HTMLFormElement: false,
  HTMLSelectElement: false,
  MediaList: true, // TODO: Not spec compliant, should be false.
  MimeTypeArray: false,
  NamedNodeMap: false,
  NodeList: true,
  PaintRequestList: false,
  Plugin: false,
  PluginArray: false,
  SVGLengthList: false,
  SVGNumberList: false,
  SVGPathSegList: false,
  SVGPointList: false,
  SVGStringList: false,
  SVGTransformList: false,
  SourceBufferList: false,
  StyleSheetList: true, // TODO: Not spec compliant, should be false.
  TextTrackCueList: false,
  TextTrackList: false,
  TouchList: false
};

for (var collections = getKeys(DOMIterables), i = 0; i < collections.length; i++) {
  var NAME = collections[i];
  var explicit = DOMIterables[NAME];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  var key;
  if (proto) {
    if (!proto[ITERATOR]) hide(proto, ITERATOR, ArrayValues);
    if (!proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
    Iterators[NAME] = ArrayValues;
    if (explicit) for (key in $iterators) if (!proto[key]) redefine(proto, key, $iterators[key], true);
  }
}


/***/ }),
/* 52 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["h"] = db_quote_literal;
/* harmony export (immutable) */ __webpack_exports__["g"] = db_quote_ident;
/* harmony export (immutable) */ __webpack_exports__["a"] = reports_get_columns;
/* harmony export (immutable) */ __webpack_exports__["d"] = reports_get_column_info;
/* harmony export (immutable) */ __webpack_exports__["c"] = reports_get_table_sql;
/* harmony export (immutable) */ __webpack_exports__["e"] = reports_get_join_path;
/* harmony export (immutable) */ __webpack_exports__["f"] = reports_get_join_conditions;
/* harmony export (immutable) */ __webpack_exports__["b"] = get_source_database;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_regexp_split__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_regexp_split___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_regexp_split__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_regexp_to_string__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_replace__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_replace___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_replace__);



function db_quote_literal(intxt) {
  return "'" + intxt.toString().replace(/\'/g, "''") + "'";
}
function db_quote_ident(intxt) {
  return '"' + intxt.toString() + '"';
} // for debugging outside of database !!!

function reports_get_columns(cubeId) {
  var r = [{
    "id": "ch.fot_out.dt",
    "type": "PERIOD",
    "title": "dt",
    "sql_query": "NOW() - INERVAL '1 DAY'",
    "config": {}
  }, {
    "id": "ch.fot_out.hcode_id",
    "type": "NUMBER",
    "title": "hcode_id",
    "sql_query": "hcode_id",
    "config": {}
  }, {
    "id": "ch.fot_out.hcode_name",
    "type": "STRING",
    "title": "hcode_name",
    "sql_query": "hcode_name",
    "config": {}
  }, {
    "id": "ch.fot_out.unit_name",
    "type": "STRING",
    "title": "unit_name",
    "sql_query": "unit_name",
    "config": {}
  }, {
    "id": "ch.fot_out.date_type_id",
    "type": "NUMBER",
    "title": "date_type_id",
    "sql_query": "date_type_id",
    "config": {}
  }, {
    "id": "ch.fot_out.dor_id",
    "type": "NUMBER",
    "title": "dor_id",
    "sql_query": "dor_id",
    "config": {}
  }, {
    "id": "ch.fot_out.dor_tlg",
    "type": "STRING",
    "title": "dor_tlg",
    "sql_query": "dor_tlg",
    "config": {}
  }, {
    "id": "ch.fot_out.dor_name",
    "type": "STRING",
    "title": "dor_name",
    "sql_query": "dor_name",
    "config": {}
  }, {
    "id": "ch.fot_out.obj_id",
    "type": "NUMBER",
    "title": "obj_id",
    "sql_query": "obj_id",
    "config": {}
  }, {
    "id": "ch.fot_out.tlg",
    "type": "STRING",
    "title": "tlg",
    "sql_query": "tlg",
    "config": {}
  }, {
    "id": "ch.fot_out.obj_name",
    "type": "STRING",
    "title": "obj_name",
    "sql_query": "obj_name",
    "config": {}
  }, {
    "id": "ch.fot_out.oe_type",
    "type": "STRING",
    "title": "oe_type",
    "sql_query": "oe_type",
    "config": {}
  }, {
    "id": "ch.fot_out.priox_int",
    "type": "NUMBER",
    "title": "priox_int",
    "sql_query": "priox_int",
    "config": {}
  }, {
    "id": "ch.fot_out.type_oe_bi",
    "type": "STRING",
    "title": "type_oe_bi",
    "sql_query": "type_oe_bi",
    "config": {}
  }, {
    "id": "ch.fot_out.dor1",
    "type": "STRING",
    "title": "dor1",
    "sql_query": "dor1",
    "config": {}
  }, {
    "id": "ch.fot_out.dor2",
    "type": "STRING",
    "title": "dor2",
    "sql_query": "dor2",
    "config": {}
  }, {
    "id": "ch.fot_out.dor3",
    "type": "STRING",
    "title": "dor3",
    "sql_query": "dor3",
    "config": {}
  }, {
    "id": "ch.fot_out.dor4",
    "type": "STRING",
    "title": "dor4",
    "sql_query": "dor4",
    "config": {}
  }, {
    "id": "ch.fot_out.dor5",
    "type": "STRING",
    "title": "dor5",
    "sql_query": "dor5",
    "config": {}
  }, {
    "id": "ch.fot_out.dor6",
    "type": "STRING",
    "title": "dor6",
    "sql_query": "dor6",
    "config": {}
  }, {
    "id": "ch.fot_out.branch1",
    "type": "STRING",
    "title": "branch1",
    "sql_query": "branch1",
    "config": {}
  }, {
    "id": "ch.fot_out.branch2",
    "type": "STRING",
    "title": "branch2",
    "sql_query": "branch2",
    "config": {}
  }, {
    "id": "ch.fot_out.branch3",
    "type": "STRING",
    "title": "branch3",
    "sql_query": "branch3",
    "config": {}
  }, {
    "id": "ch.fot_out.branch4",
    "type": "STRING",
    "title": "branch4",
    "sql_query": "branch4",
    "config": {}
  }, {
    "id": "ch.fot_out.branch5",
    "type": "STRING",
    "title": "branch5",
    "sql_query": "branch5",
    "config": {}
  }, {
    "id": "ch.fot_out.branch6",
    "type": "STRING",
    "title": "branch6",
    "sql_query": "branch6",
    "config": {}
  }, {
    "id": "ch.fot_out.ss1",
    "type": "STRING",
    "title": "ss1",
    "sql_query": "ss1",
    "config": {}
  }, {
    "id": "ch.fot_out.ss2",
    "type": "STRING",
    "title": "ss2",
    "sql_query": "ss2",
    "config": {}
  }, {
    "id": "ch.fot_out.ss3",
    "type": "STRING",
    "title": "ss3",
    "sql_query": "ss3",
    "config": {}
  }, {
    "id": "ch.fot_out.ss4",
    "type": "STRING",
    "title": "ss4",
    "sql_query": "ss4",
    "config": {}
  }, {
    "id": "ch.fot_out.ss5",
    "type": "STRING",
    "title": "ss5",
    "sql_query": "ss5",
    "config": {}
  }, {
    "id": "ch.fot_out.ss6",
    "type": "STRING",
    "title": "ss6",
    "sql_query": "ss6",
    "config": {}
  }, {
    "id": "ch.fot_out.indicator_v",
    "type": "NUMBER",
    "title": "indicator_v",
    "sql_query": "indicator_v",
    "config": {}
  }, {
    "id": "ch.fot_out.group_pay_name",
    "type": "STRING",
    "title": "group_pay_name",
    "sql_query": "group_pay_name",
    "config": {
      "follow": ["fot_out.group_pay_id"],
      "children": ["fot_out.pay_name", "fot_out.pay_code"],
      "memberALL": "Не задано"
    }
  }, {
    "id": "ch.fot_out.pay_code",
    "type": "STRING",
    "title": "pay_code",
    "sql_query": "pay_code",
    "config": {
      "memberALL": "Не задано",
      "follow": ["fot_out.pay_name"]
    }
  }, {
    "id": "ch.fot_out.pay_name",
    "type": "STRING",
    "title": "pay_name",
    "sql_query": "pay_name",
    "config": {
      "memberALL": "Не задано",
      "follow": ["fot_out.pay_code"]
    }
  }, {
    "id": "ch.fot_out.category_name",
    "type": "STRING",
    "title": "category_name",
    "sql_query": "category_name",
    "config": {}
  }, {
    "id": "ch.fot_out.sex_code",
    "type": "STRING",
    "title": "sex_code",
    "sql_query": "sex_code",
    "config": {
      "memberALL": null,
      "altDimensions": ["fot_out.sex_name"]
    }
  }, {
    "id": "ch.fot_out.sex_name",
    "type": "STRING",
    "title": "sex_name",
    "sql_query": "sex_name",
    "config": {
      "memberALL": "Все",
      "altDimensions": ["fot_out.sex_code"]
    }
  }, {
    "id": "ch.fot_out.area_name",
    "type": "STRING",
    "title": "area_name",
    "sql_query": "area_name",
    "config": {}
  }, {
    "id": "ch.fot_out.region_name",
    "type": "STRING",
    "title": "region_name",
    "sql_query": "region_name",
    "config": {}
  }, {
    "id": "ch.fot_out.municipal_name",
    "type": "STRING",
    "title": "municipal_name",
    "sql_query": "municipal_name",
    "config": {}
  }, {
    "id": "ch.fot_out.prod_group_name",
    "type": "STRING",
    "title": "prod_group_name",
    "sql_query": "prod_group_name",
    "config": {}
  }, {
    "id": "ch.fot_out.profession_name",
    "type": "STRING",
    "title": "profession_name",
    "sql_query": "profession_name",
    "config": {}
  }, {
    "id": "ch.fot_out.v_main",
    "type": "SUM",
    "title": "v_main",
    "sql_query": "v_main",
    "config": {}
  }, {
    "id": "ch.fot_out.v_rel_fzp",
    "type": "SUM",
    "title": "v_rel_fzp",
    "sql_query": "v_rel_fzp",
    "config": {}
  }, {
    "id": "ch.fot_out.v_rel_pp",
    "type": "SUM",
    "title": "v_rel_pp",
    "sql_query": "v_rel_pp",
    "config": {}
  }];
  var parts = cubeId.split('.');
  var res = {};
  res[parts[0]] = {};
  var deep = {};
  r.map(function (el) {
    var ids = el.id.split('.');
    el["_ds"] = ids[0];
    el["_cube"] = ids[1];
    el["_col"] = ids[2];
    deep[el["_col"]] = el;
    res[el.id] = el;
  });
  res[parts[0]][parts[1]] = deep;
  return res;
}
function reports_get_column_info(srcId, col) {
  var parts = col.split('.');
  return {
    "id": col,
    "sql_query": parts[2],
    "type": "STRING",
    "config": {}
  };
}
function reports_get_table_sql(target_db_type, tbl) {
  var table_name = tbl.split('.')[1];

  if (target_db_type === 'oracle') {
    return "".concat(table_name, " ").concat(table_name);
  }

  return "".concat(table_name, " AS ").concat(table_name);
}
/* should find path to JOIN all tables listed in cubes array */

/* returns list of tables and list of links between them */

function reports_get_join_path(cubes) {
  return {
    "links": [],
    "nodes": cubes
  };
} // should return LPE STRUCT

function reports_get_join_conditions(link_struct) {
  return 'TRUE';
} // we should get it from JDBC Connect String

function get_source_database(srcIdent) {
  if (srcIdent === 'oracle') {
    return 'oracle';
  } else {
    return 'postgresql';
  }
}

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = __webpack_require__(1)('unscopables');
var ArrayProto = Array.prototype;
if (ArrayProto[UNSCOPABLES] == undefined) __webpack_require__(12)(ArrayProto, UNSCOPABLES, {});
module.exports = function (key) {
  ArrayProto[UNSCOPABLES][key] = true;
};


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var at = __webpack_require__(91)(true);

 // `AdvanceStringIndex` abstract operation
// https://tc39.github.io/ecma262/#sec-advancestringindex
module.exports = function (S, index, unicode) {
  return index + (unicode ? at(S, index).length : 1);
};


/***/ }),
/* 55 */
/***/ (function(module, exports) {

// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = __webpack_require__(38);
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};


/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

// 7.2.8 IsRegExp(argument)
var isObject = __webpack_require__(3);
var cof = __webpack_require__(38);
var MATCH = __webpack_require__(1)('match');
module.exports = function (it) {
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
};


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var LIBRARY = __webpack_require__(27);
var $export = __webpack_require__(0);
var redefine = __webpack_require__(10);
var hide = __webpack_require__(12);
var Iterators = __webpack_require__(26);
var $iterCreate = __webpack_require__(114);
var setToStringTag = __webpack_require__(46);
var getPrototypeOf = __webpack_require__(44);
var ITERATOR = __webpack_require__(1)('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = $native || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!LIBRARY && typeof IteratorPrototype[ITERATOR] != 'function') hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var regexpFlags = __webpack_require__(40);

var nativeExec = RegExp.prototype.exec;
// This always refers to the native implementation, because the
// String#replace polyfill uses ./fix-regexp-well-known-symbol-logic.js,
// which loads this file before patching the method.
var nativeReplace = String.prototype.replace;

var patchedExec = nativeExec;

var LAST_INDEX = 'lastIndex';

var UPDATES_LAST_INDEX_WRONG = (function () {
  var re1 = /a/,
      re2 = /b*/g;
  nativeExec.call(re1, 'a');
  nativeExec.call(re2, 'a');
  return re1[LAST_INDEX] !== 0 || re2[LAST_INDEX] !== 0;
})();

// nonparticipating capturing group, copied from es5-shim's String#split patch.
var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED;

if (PATCH) {
  patchedExec = function exec(str) {
    var re = this;
    var lastIndex, reCopy, match, i;

    if (NPCG_INCLUDED) {
      reCopy = new RegExp('^' + re.source + '$(?!\\s)', regexpFlags.call(re));
    }
    if (UPDATES_LAST_INDEX_WRONG) lastIndex = re[LAST_INDEX];

    match = nativeExec.call(re, str);

    if (UPDATES_LAST_INDEX_WRONG && match) {
      re[LAST_INDEX] = re.global ? match.index + match[0].length : lastIndex;
    }
    if (NPCG_INCLUDED && match && match.length > 1) {
      // Fix browsers whose `exec` methods don't consistently return `undefined`
      // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
      // eslint-disable-next-line no-loop-func
      nativeReplace.call(match[0], reCopy, function () {
        for (i = 1; i < arguments.length - 2; i++) {
          if (arguments[i] === undefined) match[i] = undefined;
        }
      });
    }

    return match;
  };
}

module.exports = patchedExec;


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

var shared = __webpack_require__(47)('keys');
var uid = __webpack_require__(32);
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
var $export = __webpack_require__(0);
var $find = __webpack_require__(106)(5);
var KEY = 'find';
var forced = true;
// Shouldn't skip holes
if (KEY in []) Array(1)[KEY](function () { forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  find: function find(callbackfn /* , that = undefined */) {
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
__webpack_require__(53)(KEY);


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var ctx = __webpack_require__(19);
var $export = __webpack_require__(0);
var toObject = __webpack_require__(8);
var call = __webpack_require__(78);
var isArrayIter = __webpack_require__(76);
var toLength = __webpack_require__(13);
var createProperty = __webpack_require__(70);
var getIterFn = __webpack_require__(96);

$export($export.S + $export.F * !__webpack_require__(79)(function (iter) { Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
    var O = toObject(arrayLike);
    var C = typeof this == 'function' ? this : Array;
    var aLen = arguments.length;
    var mapfn = aLen > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var index = 0;
    var iterFn = getIterFn(O);
    var length, result, step, iterator;
    if (mapping) mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
      for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for (result = new C(length); length > index; index++) {
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $export = __webpack_require__(0);
var aFunction = __webpack_require__(24);
var toObject = __webpack_require__(8);
var fails = __webpack_require__(6);
var $sort = [].sort;
var test = [1, 2, 3];

$export($export.P + $export.F * (fails(function () {
  // IE8-
  test.sort(undefined);
}) || !fails(function () {
  // V8 bug
  test.sort(null);
  // Old WebKit
}) || !__webpack_require__(117)($sort)), 'Array', {
  // 22.1.3.25 Array.prototype.sort(comparefn)
  sort: function sort(comparefn) {
    return comparefn === undefined
      ? $sort.call(toObject(this))
      : $sort.call(toObject(this), aFunction(comparefn));
  }
});


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.14 Object.keys(O)
var toObject = __webpack_require__(8);
var $keys = __webpack_require__(18);

__webpack_require__(9)('keys', function () {
  return function keys(it) {
    return $keys(toObject(it));
  };
});


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var anObject = __webpack_require__(5);
var toLength = __webpack_require__(13);
var advanceStringIndex = __webpack_require__(54);
var regExpExec = __webpack_require__(45);

// @@match logic
__webpack_require__(39)('match', 1, function (defined, MATCH, $match, maybeCallNative) {
  return [
    // `String.prototype.match` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.match
    function match(regexp) {
      var O = defined(this);
      var fn = regexp == undefined ? undefined : regexp[MATCH];
      return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
    },
    // `RegExp.prototype[@@match]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@match
    function (regexp) {
      var res = maybeCallNative($match, regexp, this);
      if (res.done) return res.value;
      var rx = anObject(regexp);
      var S = String(this);
      if (!rx.global) return regExpExec(rx, S);
      var fullUnicode = rx.unicode;
      rx.lastIndex = 0;
      var A = [];
      var n = 0;
      var result;
      while ((result = regExpExec(rx, S)) !== null) {
        var matchStr = String(result[0]);
        A[n] = matchStr;
        if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
        n++;
      }
      return n === 0 ? null : A;
    }
  ];
});


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $at = __webpack_require__(91)(true);

// 21.1.3.27 String.prototype[@@iterator]()
__webpack_require__(58)(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});


/***/ }),
/* 67 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = sql_where_context;
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_sql_where;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_array_sort__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_array_sort___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_array_sort__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_search__ = __webpack_require__(141);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_search___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_search__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_object_values__ = __webpack_require__(50);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_object_values___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_core_js_modules_es7_object_values__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_regexp_match__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_regexp_match___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_regexp_match__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_replace__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_replace___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_replace__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_split__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_split___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_split__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_constructor__ = __webpack_require__(98);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_constructor___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_constructor__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_function_name__ = __webpack_require__(97);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_function_name___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_function_name__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_regexp_to_string__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__lpep__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__utils_utils__ = __webpack_require__(52);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__lisp__ = __webpack_require__(36);














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
where - всегда возвращает слово WHERE, а потом условия. На пустом входе вернёт WHERE TRUE
filter - на пустом входе вернёт пустую строку
*/

function sql_where_context(_vars) {
  // try to get datasource Ident
  // table lookup queries should be sending us key named sourceId = historical name!
  var srcIdent = _vars["sourceId"];

  if (srcIdent !== undefined) {
    var target_db_type = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["b" /* get_source_database */])(srcIdent);
    _vars["_target_database"] = target_db_type;
  }

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
    var res = colname.toString();

    if (_typeof(_vars['_columns']) == 'object') {
      var h = _vars['_columns'][colname];

      if (_typeof(h) == "object") {
        var o = h['order'];

        if (o === undefined) {
          o = h['name'];
        }

        __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("-: try_to_quote_order_by_column " + JSON.stringify(o));
        __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("-: try_to_quote_order_by_column " + _typeof(o));

        if (o !== undefined && o.length > 0) {
          o = o.toString();
          var regExp = new RegExp(/^\w[\w\d]*$/, "i"); // quote only literals that are not standard!

          var schema_table = o.split('.');

          if (schema_table.length < 4) {
            res = schema_table.map(function (item) {
              return regExp.test(item) ? item : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["g" /* db_quote_ident */])(item);
            }).join('.');
          } else {
            throw new Error('Too many dots for column name ' + o);
          }
        }
      }
    }

    return res;
  };

  var resolve_literal = function resolve_literal(lit) {
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('LITERAL ', lit, '  CONTEXT:', _vars[lit]);

    if (_vars[lit] == undefined) {
      return try_to_quote_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(lit, _vars);
    }
  };

  var resolve_order_by_literal = function resolve_order_by_literal(lit) {
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('OB LITERAL ', lit, ' CONTEXT:', _vars[lit]);

    if (_vars[lit] === undefined) {
      return try_to_quote_order_by_column(lit);
    } else {
      // есть возможность переименовать имена столбцов! или сделать ещё какие-то подстановки
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(lit, _vars);
    }
  };
  /* заполняем контекст функциями и макросами, заточенными на SQL */


  _context['order_by'] = function () {
    var ret = [];
    var ctx = {};

    var get_extra_order = function get_extra_order(colname) {
      if (_typeof(_vars['_columns']) == 'object') {
        var h = _vars['_columns'][colname];

        if (_typeof(h) == "object") {
          var o = h['order_extra'];

          if (o !== undefined) {
            return " ".concat(o);
          }
        }
      }

      return "";
    };

    for (var key in _vars) {
      ctx[key] = _vars[key];
    } // так как order_by будет выполнять eval_lisp, когда встретит имя столба с минусом -a, то мы
    // с помощью макросов + и - в этом случае перехватим вызов и сделаем обработку.
    // а вот когда работает обработчик аргументов where - там eval_lisp почти никогда не вызывается...


    ctx['+'] = function (a) {
      return resolve_order_by_literal(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(a, _vars)) + get_extra_order(a);
    };

    ctx['+'].ast = [[], {}, [], 1]; // mark as macro

    ctx['-'] = function (a) {
      return resolve_order_by_literal(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(a, _vars)) + ' DESC' + get_extra_order(a);
    };

    ctx['-'].ast = [[], {}, [], 1]; // mark as macro

    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Array) {
        ret.push(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(arguments[i], ctx));
      } else {
        // try_to_quote_column берёт текст в двойные кавычки для известных столбцов!!!
        var a = arguments[i].toString();
        ret.push(resolve_order_by_literal(a) + get_extra_order(a));
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

    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("lpe_pg_tstz_at_time_zone" + timestamp);
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
  };

  _context["ql"] = function (el) {
    // NULL values should not be quoted
    return el === null ? null : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["h" /* db_quote_literal */])(el);
  }; // required for Oracle Reports


  _context["to_timestamp"] = function (el, fmt, nls) {
    return "to_timestamp(".concat(el, ")");
  }; // required for Oracle Reports


  _context["to_char"] = function (el, tp, fmt) {
    return "to_char()";
  }; // required for Oracle Reports


  _context["to_date"] = function (el, fmt, nls) {
    if (fmt && nls) {
      return "to_date(".concat(el, ", ").concat(fmt, ", ").concat(nls, ")");
    }

    if (fmt) {
      return "to_date(".concat(el, ", ").concat(fmt, ")");
    }

    return "to_date(".concat(el, ")");
  }; // filter


  _context['filter'] = function () {
    var ctx = {};

    for (var key in _vars) {
      ctx[key] = _vars[key];
    }

    var quote_scalar = function quote_scalar(el) {
      if (typeof el === "string") {
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["h" /* db_quote_literal */])(el);
      } else if (typeof el === "number") {
        return el;
      } else {
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["h" /* db_quote_literal */])(JSON.stringify(el));
      }
    };

    var prnt = function prnt(ar) {
      __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("PRNT:" + JSON.stringify(ar));

      if (ar instanceof Array) {
        if (ar[0] === '$' || ar[0] === '"' || ar[0] === "'" || ar[0] === "str" || ar[0] === "[" || ar[0] === 'parse_kv' || ar[0] === 'parse_cond' || ar[0] === "=" || ar[0] === "ql" || ar[0] === "pg_interval" || ar[0] === "lpe_pg_tstz_at_time_zone" || ar[0] === "column") {
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(ar, ctx);
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
            } else if (ar[0] == "and" || ar[0] == "or") {
              return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);
            } else if (ar[0] == "~") {
              //_source_database
              // Oracle has no ~ operator !!!
              if (_vars["_target_database"] === 'oracle') {
                return "REGEXP_LIKE( ".concat(prnt(ar[1]), " , ").concat(prnt(ar[2]), " )");
              } else if (_vars["_target_database"] === 'mysql') {
                return "".concat(prnt(ar[1]), " REGEXP ").concat(prnt(ar[2]));
              } else {
                return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);
              }
            } else if (ar[0] == "ilike") {
              //_source_database
              // Oracle has no ilike !!!!
              if (_vars["_target_database"] === 'oracle') {
                // UPPER(last_name) LIKE 'SM%' 
                return "UPPER( ".concat(prnt(ar[1]), " ) LIKE ").concat(prnt(ar[2]));
              } else if (_vars["_target_database"] === 'sqlserver') {
                return "UPPER( ".concat(prnt(ar[1]), " ) LIKE ").concat(prnt(ar[2]));
              } else {
                return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);
              }
            } else if (ar[0] == "like" || ar[0] == "in" || ar[0] == "is" || ar[0].match(/^[^\w]+$/)) {
              // имя функции не начинается с буквы
              __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("PRNT FUNC x F z " + JSON.stringify(ar)); // ["~",["column","vNetwork.folder"],"XXX"]

              if (Array.isArray(ar[1]) && ar[1][0] === 'column' && Array.isArray(ar[2]) && ar[2][0] !== 'column' || !Array.isArray(ar[2])) {// справа значение, которое нужно квотировать!
              }

              return prnt(ar[1]) + ' ' + ar[0] + ' ' + prnt(ar[2]);
            } else {
              return ar[0] + '(' + prnt(ar[1]) + ',' + prnt(ar[2]) + ')';
            }
          } else if (ar[0] == "and" || ar[0] == "or") {
            // много аргументов для логической функции
            return ar.slice(1).map(prnt).join(' ' + ar[0] + ' ');
          } else if (ar[0] == "between") {
            return '(' + prnt(ar[1]) + ' BETWEEN ' + prnt(ar[2]) + ' AND ' + prnt(ar[3]) + ')';
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
      // a = [] просто пропускаем, А кстати почему собственно???
      // a = [null, 1,2] как a in (1,2) or a is null
      // ["=",["column","vNetwork.cluster"],["[","SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
      // console.log('========'+ JSON.stringify(l) + ' ' + JSON.stringify(r))
      if (r instanceof Array) {
        if (r.length === 0) {
          return 'TRUE';
        }

        if (r[0] === '[') {
          r = ['['].concat(r.slice(1).map(function (el) {
            return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(el, _context);
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
          //console.log("RESOLVING VAR " + JSON.stringify(_context));
          var var_expr;

          if (r[0] === '$') {
            /* FIXME !!!
            _context contains just hash with defined vars (key/value).
            $(expr) inside sql_where should resolve to vars or generate exception with user refer to not defined var!!!
            it is better than default eval_lisp behavior where undefined var reolves to itself (atom). 
            */
            //var_expr = eval_lisp(r[1], _context);
            var_expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(r[1], _context); // actually, we might do eval_lisp(r, ctx) but that will quote everything, including numbers!
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
      } else if (r === '') {
        return prnt(l) + " = ''";
      } else {
        return prnt(l) + " = " + prnt(r);
      }
    };

    ctx['='].ast = [[], {}, [], 1]; // mark as macro
    // $(name) will quote text elements !!! suitable for generating things like WHERE title in ('a','b','c')
    // also, we should evaluate expression, if any.

    ctx['$'] = function (inexpr) {
      var expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(inexpr, _context); // evaluate in a normal LISP context without vars, not in WHERE context

      if (expr instanceof Array) {
        // try to print using quotes, use plv8 !!!
        return expr.map(function (el) {
          return quote_scalar(el);
        }).join(',');
      }

      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__utils_utils__["h" /* db_quote_literal */])(expr);
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
    // we should parse all logic: & | ! () but we are cheating at the moment....

    ctx['parse_cond'] = function (expr) {
      if (expr instanceof Array) {
        if (expr[0] === '->') {
          var sql = 'select "' + expr[2] + '" from "' + expr[1] + '" where id = $1::INT';
          var id_val = resolve_literal(expr[1].replace(/.$/, "_id")); //console.log('SQL: ', sql, " val:", id_val);

          var res_json = plv8.execute(sql, [id_val]); //var res_json = [{"src_id":"dor_id=96&obj_id=64024775"}];

          var frst = res_json[0]; //console.log('SQL RES: ', frst);

          if (frst !== undefined && frst[expr[2]] !== null && frst[expr[2]].length > 0) {
            var axis_condition = function axis_condition(e) {
              var result = e.split('&').map(function (e2) {
                return e2;
              }).join(' and ');
              return result;
            };

            var result = axis_condition(frst[expr[2]]);
            if (result === undefined || result.length == 0) return '(/*cond not resolved*/ 0=1)';
            return result;
          }
        }
      } // return everything, FIXME: is it right thing to do ?


      return '(/*parse_cond EMPTY*/ 1=1)';
    };

    ctx['parse_cond'].ast = [[], {}, [], 1]; // mark as macro

    var ret = []; //console.log("where IN: ", JSON.stringify(Array.prototype.slice.call(arguments)));

    var fts = _vars['fts'];
    var tree = arguments;

    if (fts !== undefined && fts.length > 0) {
      fts = fts.replace(/\'/g, "''"); //' be safe
      // Full Text Search based on column_list

      if (_typeof(_vars['_columns']) == 'object') {
        var ilike = Object.values(_vars['_columns']).map(function (col) {
          return col["search"] !== undefined ? ["ilike", col["search"], ["'", '%' + fts + '%']] : null;
        }).filter(function (el) {
          return el !== null;
        }).reduce(function (ac, el) {
          return ac ? ['or', ac, el] : el;
        }, null) || []; //console.log( "FTS PARSED: ",  JSON.stringify(ilike));
        //console.log( "FTS PARSED: ",  JSON.stringify(tree));

        if (ilike !== undefined && ilike.length > 0) {
          // добавляем корень AND с нашим поиском
          if (tree[0]) {
            tree = [["and", tree[0], ['()', ilike]]];
          } else {
            tree = [['()', ilike]];
          }
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

    if (tree.length > 0) {
      for (var i = 0; i < tree.length; i++) {
        // console.log("array ", JSON.stringify(Array.prototype.slice.call(tree[i])));
        var r = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(["filter", tree[i]], _context); // r should be string

        if (r.length > 0) {
          ret.push(r);
        }
      }
    } else {
      var r = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(["filter"], _context); // r should be string

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
  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lpep__["a" /* parse */])(_expr);
  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('sql_where parse: ', JSON.stringify(sexpr));

  if (sexpr instanceof Array && (sexpr[0] === 'filter' && sexpr.length <= 2 || sexpr[0] === 'order_by' || sexpr[0] === 'if' || sexpr[0] === 'where' || sexpr[0] === 'pluck' || sexpr[0] === 'str' || sexpr[0] === 'prnt' || sexpr[0] === '->' // it is dot operator, FIXME: add correct function call check !
  )) {
    // ok
    if (sexpr[0] === 'order_by' && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["d" /* isString */])(_vars['sort']) && _vars['sort'].length > 0) {
      // we should inject content of the sort key, which is coming from the GUI.
      // do it in a safe way
      var extra_srt_expr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lpep__["a" /* parse */])("order_by(".concat(_vars['sort'], ")"));
      __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('sql_where ORDER BY MIXED0: ', JSON.stringify(extra_srt_expr));
      __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('sql_where ORDER BY MIXED1: ', JSON.stringify(_vars));
      sexpr = sexpr.concat(extra_srt_expr.slice(1));
      __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('sql_where ORDER BY MIXED: ', JSON.stringify(sexpr));
    }
  } else {
    throw "only single where() or order_by() could be evaluated. Found: " + sexpr[0];
  }

  var _context = sql_where_context(_vars);

  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lisp__["a" /* eval_lisp */])(sexpr, _context); // console.log('ret: ',  JSON.stringify(ret));

  return ret;
}

/***/ }),
/* 68 */
/***/ (function(module, exports) {

module.exports = function (it, Constructor, name, forbiddenField) {
  if (!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)) {
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};


/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

// false -> Array#indexOf
// true  -> Array#includes
var toIObject = __webpack_require__(11);
var toLength = __webpack_require__(13);
var toAbsoluteIndex = __webpack_require__(118);
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $defineProperty = __webpack_require__(4);
var createDesc = __webpack_require__(30);

module.exports = function (object, index, value) {
  if (index in object) $defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3);
var document = __webpack_require__(7).document;
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

var MATCH = __webpack_require__(1)('match');
module.exports = function (KEY) {
  var re = /./;
  try {
    '/./'[KEY](re);
  } catch (e) {
    try {
      re[MATCH] = false;
      return !'/./'[KEY](re);
    } catch (f) { /* empty */ }
  } return true;
};


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

var ctx = __webpack_require__(19);
var call = __webpack_require__(78);
var isArrayIter = __webpack_require__(76);
var anObject = __webpack_require__(5);
var toLength = __webpack_require__(13);
var getIterFn = __webpack_require__(96);
var BREAK = {};
var RETURN = {};
var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
  var iterFn = ITERATOR ? function () { return iterable; } : getIterFn(iterable);
  var f = ctx(fn, that, entries ? 2 : 1);
  var index = 0;
  var length, step, iterator, result;
  if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if (result === BREAK || result === RETURN) return result;
  } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
    result = call(iterator, f, step.value, entries);
    if (result === BREAK || result === RETURN) return result;
  }
};
exports.BREAK = BREAK;
exports.RETURN = RETURN;


/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = !__webpack_require__(2) && !__webpack_require__(6)(function () {
  return Object.defineProperty(__webpack_require__(71)('div'), 'a', { get: function () { return 7; } }).a != 7;
});


/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3);
var setPrototypeOf = __webpack_require__(89).set;
module.exports = function (that, target, C) {
  var S = target.constructor;
  var P;
  if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
    setPrototypeOf(that, P);
  } return that;
};


/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

// check on default Array iterator
var Iterators = __webpack_require__(26);
var ITERATOR = __webpack_require__(1)('iterator');
var ArrayProto = Array.prototype;

module.exports = function (it) {
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

// 7.2.2 IsArray(argument)
var cof = __webpack_require__(38);
module.exports = Array.isArray || function isArray(arg) {
  return cof(arg) == 'Array';
};


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

// call something on iterator step with safe closing on error
var anObject = __webpack_require__(5);
module.exports = function (iterator, fn, value, entries) {
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch (e) {
    var ret = iterator['return'];
    if (ret !== undefined) anObject(ret.call(iterator));
    throw e;
  }
};


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

var ITERATOR = __webpack_require__(1)('iterator');
var SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function () { SAFE_CLOSING = true; };
  // eslint-disable-next-line no-throw-literal
  Array.from(riter, function () { throw 2; });
} catch (e) { /* empty */ }

module.exports = function (exec, skipClosing) {
  if (!skipClosing && !SAFE_CLOSING) return false;
  var safe = false;
  try {
    var arr = [7];
    var iter = arr[ITERATOR]();
    iter.next = function () { return { done: safe = true }; };
    arr[ITERATOR] = function () { return iter; };
    exec(arr);
  } catch (e) { /* empty */ }
  return safe;
};


/***/ }),
/* 80 */
/***/ (function(module, exports) {

module.exports = function (done, value) {
  return { value: value, done: !!done };
};


/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

var dP = __webpack_require__(4);
var gOPD = __webpack_require__(17);
var ownKeys = __webpack_require__(86);
var toIObject = __webpack_require__(11);

module.exports = function define(target, mixin) {
  var keys = ownKeys(toIObject(mixin));
  var length = keys.length;
  var i = 0;
  var key;
  while (length > i) dP.f(target, key = keys[i++], gOPD.f(mixin, key));
  return target;
};


/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

var dP = __webpack_require__(4);
var anObject = __webpack_require__(5);
var getKeys = __webpack_require__(18);

module.exports = __webpack_require__(2) ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};


/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = __webpack_require__(11);
var gOPN = __webpack_require__(42).f;
var toString = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function (it) {
  try {
    return gOPN(it);
  } catch (e) {
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it) {
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};


/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {

var has = __webpack_require__(16);
var toIObject = __webpack_require__(11);
var arrayIndexOf = __webpack_require__(69)(false);
var IE_PROTO = __webpack_require__(60)('IE_PROTO');

module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};


/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

var getKeys = __webpack_require__(18);
var toIObject = __webpack_require__(11);
var isEnum = __webpack_require__(29).f;
module.exports = function (isEntries) {
  return function (it) {
    var O = toIObject(it);
    var keys = getKeys(O);
    var length = keys.length;
    var i = 0;
    var result = [];
    var key;
    while (length > i) if (isEnum.call(O, key = keys[i++])) {
      result.push(isEntries ? [key, O[key]] : O[key]);
    } return result;
  };
};


/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

// all object keys, includes non-enumerable and symbols
var gOPN = __webpack_require__(42);
var gOPS = __webpack_require__(43);
var anObject = __webpack_require__(5);
var Reflect = __webpack_require__(7).Reflect;
module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
  var keys = gOPN.f(anObject(it));
  var getSymbols = gOPS.f;
  return getSymbols ? keys.concat(getSymbols(it)) : keys;
};


/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

var redefine = __webpack_require__(10);
module.exports = function (target, src, safe) {
  for (var key in src) redefine(target, key, src[key], safe);
  return target;
};


/***/ }),
/* 88 */
/***/ (function(module, exports) {

// 7.2.9 SameValue(x, y)
module.exports = Object.is || function is(x, y) {
  // eslint-disable-next-line no-self-compare
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};


/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = __webpack_require__(3);
var anObject = __webpack_require__(5);
var check = function (O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function (test, buggy, set) {
      try {
        set = __webpack_require__(19)(Function.call, __webpack_require__(17).f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) { buggy = true; }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy) O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};


/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var global = __webpack_require__(7);
var dP = __webpack_require__(4);
var DESCRIPTORS = __webpack_require__(2);
var SPECIES = __webpack_require__(1)('species');

module.exports = function (KEY) {
  var C = global[KEY];
  if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
    configurable: true,
    get: function () { return this; }
  });
};


/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(48);
var defined = __webpack_require__(25);
// true  -> String#at
// false -> String#codePointAt
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};


/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

// helper for String#{startsWith, endsWith, includes}
var isRegExp = __webpack_require__(57);
var defined = __webpack_require__(25);

module.exports = function (that, searchString, NAME) {
  if (isRegExp(searchString)) throw TypeError('String#' + NAME + " doesn't accept regex!");
  return String(defined(that));
};


/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3);
module.exports = function (it, TYPE) {
  if (!isObject(it) || it._t !== TYPE) throw TypeError('Incompatible receiver, ' + TYPE + ' required!');
  return it;
};


/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(7);
var core = __webpack_require__(15);
var LIBRARY = __webpack_require__(27);
var wksExt = __webpack_require__(95);
var defineProperty = __webpack_require__(4).f;
module.exports = function (name) {
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
};


/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

exports.f = __webpack_require__(1);


/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

var classof = __webpack_require__(37);
var ITERATOR = __webpack_require__(1)('iterator');
var Iterators = __webpack_require__(26);
module.exports = __webpack_require__(15).getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

var dP = __webpack_require__(4).f;
var FProto = Function.prototype;
var nameRE = /^\s*function ([^ (]*)/;
var NAME = 'name';

// 19.2.4.2 name
NAME in FProto || __webpack_require__(2) && dP(FProto, NAME, {
  configurable: true,
  get: function () {
    try {
      return ('' + this).match(nameRE)[1];
    } catch (e) {
      return '';
    }
  }
});


/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(7);
var inheritIfRequired = __webpack_require__(75);
var dP = __webpack_require__(4).f;
var gOPN = __webpack_require__(42).f;
var isRegExp = __webpack_require__(57);
var $flags = __webpack_require__(40);
var $RegExp = global.RegExp;
var Base = $RegExp;
var proto = $RegExp.prototype;
var re1 = /a/g;
var re2 = /a/g;
// "new" creates a new object, old webkit buggy here
var CORRECT_NEW = new $RegExp(re1) !== re1;

if (__webpack_require__(2) && (!CORRECT_NEW || __webpack_require__(6)(function () {
  re2[__webpack_require__(1)('match')] = false;
  // RegExp constructor can alter flags and IsRegExp works correct with @@match
  return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
}))) {
  $RegExp = function RegExp(p, f) {
    var tiRE = this instanceof $RegExp;
    var piRE = isRegExp(p);
    var fiU = f === undefined;
    return !tiRE && piRE && p.constructor === $RegExp && fiU ? p
      : inheritIfRequired(CORRECT_NEW
        ? new Base(piRE && !fiU ? p.source : p, f)
        : Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f)
      , tiRE ? this : proto, $RegExp);
  };
  var proxy = function (key) {
    key in $RegExp || dP($RegExp, key, {
      configurable: true,
      get: function () { return Base[key]; },
      set: function (it) { Base[key] = it; }
    });
  };
  for (var keys = gOPN(Base), i = 0; keys.length > i;) proxy(keys[i++]);
  proto.constructor = $RegExp;
  $RegExp.prototype = proto;
  __webpack_require__(10)(global, 'RegExp', $RegExp);
}

__webpack_require__(90)('RegExp');


/***/ }),
/* 99 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// 21.1.3.18 String.prototype.startsWith(searchString [, position ])

var $export = __webpack_require__(0);
var toLength = __webpack_require__(13);
var context = __webpack_require__(92);
var STARTS_WITH = 'startsWith';
var $startsWith = ''[STARTS_WITH];

$export($export.P + $export.F * __webpack_require__(72)(STARTS_WITH), 'String', {
  startsWith: function startsWith(searchString /* , position = 0 */) {
    var that = context(this, searchString, STARTS_WITH);
    var index = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length));
    var search = String(searchString);
    return $startsWith
      ? $startsWith.call(that, search, index)
      : that.slice(index, index + search.length) === search;
  }
});


/***/ }),
/* 100 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = deparse;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es7_symbol_async_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_symbol__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_split__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_split___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_regexp_split__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_regexp_to_string__);





function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

var OPERATORS = {
  '+': true,
  '-': true,
  '*': true,
  '/': true,
  '=': true,
  'and': '&&',
  'or': '||'
};
var PRIORITY = {
  '=': 40,
  '||': 30
};
var safeReplace = {
  '\n': '\\n',
  '\r': '\\r',
  '\"': '\\"',
  '\'': '\\\'',
  '\\': '\\\\'
};

function fixString(s) {
  return s.split('').map(function (char) {
    return char in safeReplace ? safeReplace[char] : char;
  }).join('');
}

function deparseWithOptionalBrackets(sexpr, op) {
  var res = deparse(sexpr);

  if (isArray(sexpr) && sexpr.length && OPERATORS[sexpr[0]]) {
    if (op === sexpr[0]) {
      return res;
    }

    var priority1 = PRIORITY[op];
    var priority2 = PRIORITY[sexpr[0]];

    if (priority1 && priority2 && priority1 < priority2) {
      // no need on brackets
      return res;
    }

    return '(' + res + ')';
  } else {
    return res;
  }
}

function deparseSexpr(sexpr) {
  var op = sexpr[0];
  var args = sexpr.slice(1);
  if (op === '"') return '"' + fixString(args[0]) + '"';
  if (op === '\'') return '\'' + fixString(args[0]) + '\'';
  if (op === '[') return '[' + args.map(deparse).join(', ') + ']';
  if (op === '()') return '(' + args.map(deparse).join(', ') + ')';
  if (op === '->') return args.map(deparse).join('.');

  if (OPERATORS[op] === true) {
    return args.map(function (arg) {
      return deparseWithOptionalBrackets(arg, op);
    }).join(' ' + op + ' ');
  }

  if (isString(OPERATORS[op])) {
    return args.map(function (arg) {
      return deparseWithOptionalBrackets(arg, OPERATORS[op]);
    }).join(' ' + OPERATORS[op] + ' ');
  }

  if (op === 'begin') return args.map(deparse).join('; ');
  return op + '(' + sexpr.slice(1).map(deparse).join(', ') + ')';
}

function deparse(lispExpr) {
  if (isString(lispExpr)) {
    return lispExpr;
  } else if (isNumber(lispExpr)) {
    return lispExpr.toString();
  } else if (isBoolean(lispExpr)) {
    return lispExpr.toString();
  } else if (isArray(lispExpr) && lispExpr.length === 0) {
    return '[]';
  } else if (lispExpr === null) {
    return 'null';
  } else if (isArray(lispExpr)) {
    return deparseSexpr(lispExpr);
  } else {
    return String(lispExpr);
  }
}

/***/ }),
/* 101 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export sql_context */
/* harmony export (immutable) */ __webpack_exports__["a"] = eval_sql_expr;
/* harmony export (immutable) */ __webpack_exports__["b"] = parse_sql_expr;
/* harmony export (immutable) */ __webpack_exports__["c"] = generate_report_sql;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_from__ = __webpack_require__(62);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_from___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_array_from__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es7_symbol_async_iterator__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es7_symbol_async_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es7_symbol_async_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_symbol__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_symbol___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es6_symbol__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_sort__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_sort___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_array_sort__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_core_js_modules_web_dom_iterable__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_array_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_string_iterator__ = __webpack_require__(66);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_string_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_string_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_set__ = __webpack_require__(142);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_set___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_core_js_modules_es6_set__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_split__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_split___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_regexp_split__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_match__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_match___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_regexp_match__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_10_core_js_modules_es6_regexp_to_string__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_regexp_replace__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_regexp_replace___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_regexp_replace__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_array_find__ = __webpack_require__(61);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_array_find___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_array_find__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__lisp__ = __webpack_require__(36);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__sql_where__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__lpep__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17__utils_utils__ = __webpack_require__(52);














function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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
  var _context = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15__sql_where__["b" /* sql_where_context */])(_vars);
  /* заполняем контекст функциями и макросами, заточенными на SQL */


  _context['sql'] = function () {
    var q; // resulting sql

    var args = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('SQL IN: ', args); // use sql-struct!

    var command = ["sql-struct"].concat(args);
    var struct = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(command, _context);
    q = "".concat(struct["select"], " ").concat(struct["from"]);

    if (struct["where"] !== undefined) {
      q = "".concat(q, " WHERE ").concat(struct["where"]);
    }

    if (struct["group_by"] !== undefined) {
      q = "".concat(q, " ").concat(struct["group_by"]);
    }

    if (struct["order_by"] !== undefined) {
      q = "".concat(q, " ").concat(struct["order_by"]);
    }

    if (struct["limit_offset"] !== undefined) {
      if (_vars["_target_database"] === 'oracle') {
        q = "SELECT * FROM (\n          ".concat(q, "\n        ) WHERE ").concat(struct["limit_offset"]);
      } else {
        q = "".concat(q, " ").concat(struct["limit_offset"]);
      }
    }

    return q;
  };

  _context['sql'].ast = [[], {}, [], 1]; // mark as macro

  /* возвращает структуру запроса, при этом все элементы уже превращены в TEXT */

  _context['sql-struct'] = function () {
    var q = {
      "select": undefined,
      "from": undefined,
      "where": undefined,
      "order_by": undefined,
      "limit_offset": undefined,
      "group_by": undefined
    }; // resulting sql

    var args = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('SQL-STRUCT IN: ', args);

    var find_part = function find_part(p) {
      return args.find(function (el) {
        return p == el[0];
      });
    };

    var sel = find_part('select');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('FOUND select: ', sel);
    q.select = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(sel, _context);
    var from = find_part('from');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('FOUND from: ', from);
    q.from = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(from, _context);
    var where = find_part('filter');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("FOUND where: ", where);

    if (where instanceof Array && where.length > 1) {
      q.where = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(where, _context);
    }

    var grp = find_part('group_by');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('FOUND group_by: ', grp);

    if (grp instanceof Array && grp.length > 1) {
      q.group_by = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(grp, _context);
    }

    var srt = find_part('order_by');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('FOUND sort: ', srt);

    if (srt instanceof Array && srt.length > 1) {
      q.order_by = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(srt, _context);
    } //slice(offset, pageItemsNum)


    var s = find_part('slice');
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("FOUND slice: ", s);

    if (s instanceof Array && s.length > 1) {
      q.limit_offset = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(s, _context);
    }

    return q;
  };

  _context['sql-struct'].ast = [[], {}, [], 1]; // mark as macro

  function prnt(a) {
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('prnt IN: ', a);

    if (a instanceof Array) {
      if (a.length > 0) {
        if (a[0] === '::' && a.length == 3) {
          return a[1] + '::' + a[2];
        } else if (a[0] === ':') {
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(a, _context); //return prnt(a[1]) + ' as "' + a[2].replace(/"/,'\\"') + '"';
        } else if (a[0] === "->") {
          // наш LPE использует точку, как разделитель вызовов функций и кодирует её как ->
          // в логических выражениях мы это воспринимаем как ссылку на <ИМЯ СХЕМЫ>.<ИМЯ ТАБЛИЦЫ>
          // return '"' + a[1] + '"."' + a[2] + '"';
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(a, _context);
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
  } // table.column 


  _context['->'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("->   " + JSON.stringify(a));
    return a.join('.');
  };

  _context[':'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("->   " + JSON.stringify(a));
    return prnt(a[0]) + ' as ' + a[1].replace(/"/, '\\"');
  }; // должен вернуть СТРОКУ


  _context['select'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("select IN: ", JSON.stringify(a));

    if (a.length < 1) {
      return "SELECT *";
    } else {
      return "SELECT " + a.map(prnt).join(',');
    }
  };

  _context['select'].ast = [[], {}, [], 1]; // mark as macro

  _context['from'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('from IN: ', a);

    if (a.length < 1) {
      return "";
    } else {
      return "FROM " + a.map(prnt).join(', ');
    }
  };

  _context['from'].ast = [[], {}, [], 1]; // mark as macro

  _context['slice'] = function () {
    var a = Array.prototype.slice.call(arguments);
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('slice IN: ', a);

    if (a.length < 1) {
      return "";
    } else {
      if (_vars["_target_database"] === 'oracle') {
        if (parseInt(a[0]) === 0) {
          return "ROWNUM <= ".concat(parseInt(a[1]));
        } else {
          return "ROWNUM > ".concat(parseInt(a[0]), " AND ROWNUM <= ").concat(parseInt(a[1]) + parseInt(a[0]));
        }
      } else if (_vars["_target_database"] === 'sqlserver') {
        return "OFFSET ".concat(parseInt(a[0]), " ROWS FETCH NEXT ").concat(parseInt(a[1]), " ROWS ONLY");
      } else {
        return "LIMIT ".concat(parseInt(a[1]), " OFFSET ").concat(parseInt(a[0]));
      }
    }
  };

  _context['slice'].ast = [[], {}, [], 1]; // mark as macro

  _context['group_by'] = function () {
    var a = Array.prototype.slice.call(arguments);

    if (a.length === 0) {
      return "";
    } else {
      return "GROUP BY " + a.join(' , ');
    }
  };

  return _context;
}
/*
Это не дописано!!! Идея была сделать синтаксис, похожий на htSQL. типа +table(col1,col2).where(col1>3)
но например, как указать схему? сейчас парсер фигню выдаёт, так как точка не всегда корректно отрабатывает +sch.table(col1,col2)
Тщательнее надо....

select lpe.eval_sql_expr($$metrics(id).where(id='abcd')$$);


Примеры htSQL:
/course.filter(credits<3).select(department_code, no, title)
/course.sort(credits-).limit(10){department_code, no, credits}
/course.limit(10).sort(credits-){department_code, no, credits}

То есть, у нас имя таблицы идёт первым в любом случае. В LuxPath предлагаю использовать
комюинацию htSQL select и список столбцов {} в одном макросе +имя_таблицы(...)
мы будем использовать + вместо / Но слэш в htSQL не является частью синтаксиса, имя таблицы просто всегда идёт первым!!!

*/

function eval_sql_expr(_expr, _vars) {
  var ctx = sql_context(_vars);
  var _context = ctx; // for(var key in _vars) _context[key] = _vars[key];

  _context['sql->entrypoint'] = function () {
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("++++++++++++++++++");
    var ret = [];

    for (var i = 0; i < arguments.length; i++) {
      ret.push(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(arguments[i], _context));
      __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log(JSON.stringify(ret));
    }

    return ret.join(',');
  };

  _context['sql->entrypoint'].ast = [[], {}, [], 1]; // mark as macro

  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lpep__["a" /* parse */])(_expr);
  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("parsed eval_sql_expr IN: ", sexpr);
  /*
  if (ctx.hasOwnProperty('where')){
    console.log('W O W');
  }
  */
  // точка входа всегда должна быть sql->entrypoint, так как мы определили sql->entrypoint как макроc чтобы иметь возможность
  // перекодировать имена таблиц в вызов .from()
  // а parse возвращает нам ->, так что меняем!

  if (sexpr[0] === '->') {
    sexpr[0] = 'sql->entrypoint';
  }

  if (sexpr[0] !== 'sql->entrypoint') {
    sexpr = ['sql->entrypoint', sexpr];
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

    if (fr != 'where' && fr != 'select' && fr != 'sort' && fr != 'filter' && fr != 'from' && fr != 'slice') {
      sel[0] = 'select';
      p = true;
    }

    sql.push(sel);

    if (p) {
      sql.push(["from", fr]);
    }

    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("parse do_select_from: ", sql);
  };

  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];

    if (expr instanceof Array) {
      // expr: ["metrics","a","d",["max","c"]]
      // if (expr[0] === 'order_by') {expr[0]='sort'};
      if (expr[0] === 'where') {
        expr[0] = 'filter';
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

  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('parse: ', sql);
  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(sql, _context); // console.log("parse: ", ret);

  return ret;
}
/* returns struct, which is suitable to build full SQL text:
            {
                from: undefined,
                limit_offset: undefined,
                order_by: undefined,
                select: 'SELECT *',
                where: undefined,
                group_by: undefined
              }
*/

function parse_sql_expr(_expr, _vars, _forced_table, _forced_where) {
  var ctx = sql_context(_vars);
  var _context = ctx; // for(var key in _vars) _context[key] = _vars[key];

  if (_expr === null || _expr === '' || typeof _expr === "undefined") {
    _expr = 'filter()'; // that should generate empty struct
  }

  var sexpr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16__lpep__["a" /* parse */])(_expr);

  if (sexpr[0] === '->') {
    sexpr[0] = 'sql->entrypoint';
  }

  if (sexpr[0] !== 'sql->entrypoint') {
    // это значит, что на входе у нас всего один вызов функции, мы его обернём в ->
    sexpr = ['sql->entrypoint', sexpr];
  }

  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("DBAPI IN: ", sexpr);
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
  // в последнем случае берётся последний from, а все первые игнорятся, но см. test.js = там есть другой пример !!!!

  var sql = ['sql-struct']; // wrapped by sql call...

  var cache = {
    "filter": [],
    "select": [],
    "order_by": [],
    "from": [],
    "slice": []
  };

  for (var i = 1; i < sexpr.length; i++) {
    var expr = sexpr[i];

    if (expr instanceof Array) {
      var fr = expr[0];

      if (fr != 'where' && fr != 'select' && fr != 'order_by' && fr != 'from' && fr != ':' && fr != 'slice' && fr != 'filter') {
        throw 'unexpected func: ' + JSON.stringify(fr);
      } // have no idea how to support aliases for selects...


      if (fr === ':' && expr[1][0] === 'select') {
        cache["select"].push(expr[1]);
      } else {
        if (fr === 'where') {
          fr = 'filter';
        }

        cache[fr].push(expr);
      }
    } else {
      throw 'unexpected literal: ' + JSON.stringify(expr);
    }
  }

  if (_forced_table !== undefined) {
    cache[fr].push(["from", _forced_table]);
  }

  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("DEBUG", JSON.stringify(cache));
  var args = cache["select"].map(function (ar) {
    return ar.slice(1);
  });
  var sel = [].concat.apply(["select"], args); //flat

  sql.push(sel);
  var f = cache["from"].pop();

  if (f) {
    sql.push(f);
  }

  f = cache["order_by"].pop();

  if (f) {
    sql.push(f);
  }

  f = cache["slice"].pop();

  if (f) {
    sql.push(f);
  }

  args = cache["filter"].map(function (ar) {
    return ar.slice(1);
  });
  args = [].concat.apply([], args); //flat

  if (args.length > 0) {
    var w = ["()", args[0]];

    if (args.length > 1) {
      for (var i = 1; i < args.length; i++) {
        w = ["and", w, ["()", args[i]]];
      }
    }

    sql.push(["filter", w]);
  }

  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("WHERE", JSON.stringify(w));
  __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log('DBAPI parse: ', sql);
  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(sql, _context);
  return ret;
}
function generate_report_sql(_cfg, _vars) {
  var ctx = sql_context(_vars);
  var _context = ctx;
  /* Для генерации SELECT запросов из конфигов, созданных для Reports */

  /* while we wrapping aggregate functions around columns, we should keep track of the free columns, so we will be able to
     generate correct group by !!!!
  */

  var group_by = _cfg["columns"].map(function (h) {
    return h["id"];
  });

  var wrap_aggregate_functions = function wrap_aggregate_functions(col, cfg, col_id) {
    ret = col; // Empty agg arrays can be used for AGGFN type ! We happily support it

    if (Array.isArray(cfg["agg"])) {
      group_by = group_by.filter(function (id) {
        return id !== col_id;
      });
      var r = cfg["agg"].reduce(function (a, currentFunc) {
        return "".concat(currentFunc, "( ").concat(a, " )");
      }, ret);
      /* it is a special default formatter, which should be implemented per column with LPE!!!! DISABLED
      if (_context["_target_database"] === 'oracle' || _context["_target_database"] === 'postgresql') {
        // automatically format number
        r = `to_char( ${r}, '999G999G999G999G990D00')`
      }
      */

      return r;
    }

    return ret;
  };

  _context["column"] = function (col) {
    var col_info = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["d" /* reports_get_column_info */])(_cfg["sourceId"], col);
    var col_sql = col_info["sql_query"];

    if (col_sql.match(/^\S+$/) === null) {
      // we have whitespace here, so it is complex expression :-()
      return "".concat(col_sql);
    } // we have just column name, prepend table alias !


    var parts = col.split('.');
    return "".concat(parts[1], ".").concat(col_sql);
  };

  _context['generate_sql_struct_for_report'] = function (cfg) {
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log(JSON.stringify(cfg));

    if (_typeof(cfg) === 'object' && Array.isArray(cfg)) {
      throw new Error("reports_sql expected {...} as argument");
    }
    /* нужно сгенерить что-то типа такого:
    [  'sql-struct',
    [
      'select',
      'a',
      'b',
      [ '->', 'department_code', 'alias' ],
      [ '::', 'no', 'TEXT' ],
      [ 'max', 'credits' ]
    ],
    [ 'from', [ '->', 'bm', 'tbl' ] ],
    [ 'order_by', 'a', [ '-', 'b' ] ],
    [ 'filter', [ '()', [Array] ] ]
    ]
    */

    /*
      var convert_in_to_eq = function(in_lpe){
        if (in_lpe[0] === 'in'){
          in_lpe[0] = '=';
        }
         in_lpe.map(el => {
           if (Array.isArray(el)) {
            convert_in_to_eq(el)
           }      
          })
        return in_lpe;
      }*/


    var convert_in_to_eq = function convert_in_to_eq(in_lpe) {
      if (!Array.isArray(in_lpe) || in_lpe.length === 0) return in_lpe;
      return [in_lpe[0] === 'in' ? '=' : in_lpe[0]].concat(_toConsumableArray(in_lpe.slice(1).map(convert_in_to_eq)));
    }; // на входе вложенная структура из конфига.
    // расчитываем, что структура создана в GUI и порядок следования элементов стандартный


    var quote_text_constants = function quote_text_constants(in_lpe) {
      if (!Array.isArray(in_lpe)) return in_lpe;

      if (in_lpe[0] === 'IN') {
        // example: ["IN",["column","vNetwork.cluster"],["SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
        // Transform to AST form
        in_lpe[0] = 'in';
        in_lpe[2] = ['['].concat(in_lpe[2]); // and process further
      } //console.log("quote_text_constants" + JSON.stringify(in_lpe))


      if (in_lpe[0] === 'in') {
        if (Array.isArray(in_lpe[1])) {
          if (in_lpe[1][0] === 'column') {
            if (Array.isArray(in_lpe[2]) && in_lpe[2][0] === '[') {
              // ["=",["column","vNetwork.cluster"],["[","SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]]
              var info = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["d" /* reports_get_column_info */])(_cfg["sourceId"], in_lpe[1][1]);

              if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
                in_lpe[2] = ['['].concat(in_lpe[2].slice(1).map(function (el) {
                  return ["to_date", ["ql", el], "'YYYY-MM-DD'"];
                }));
              } else {
                in_lpe[2] = ['['].concat(in_lpe[2].slice(1).map(function (el) {
                  return ["ql", el];
                }));
              }
            }
          }
        }
      } else {
        if (in_lpe.length > 2 && in_lpe[0] !== 'not') {
          if (Array.isArray(in_lpe[1])) {
            if (in_lpe[1][0] === 'column') {
              if (!Array.isArray(in_lpe[2])) {
                // ANY OPERATOR
                // ["~",["column","vNetwork.cluster"],"SPB99-DMZ02"]
                var info = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["d" /* reports_get_column_info */])(_cfg["sourceId"], in_lpe[1][1]);

                if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
                  in_lpe[2] = ["to_date", ["ql", in_lpe[2]], "'YYYY-MM-DD'"];
                } else {
                  in_lpe[2] = ["ql", in_lpe[2]];
                }
              }

              if (in_lpe.length === 4) {
                // between
                if (!Array.isArray(in_lpe[3])) {
                  //["between",["column","vNetwork.period_month"],"2019-09-10","2019-09-20"]
                  var info = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["d" /* reports_get_column_info */])(_cfg["sourceId"], in_lpe[1][1]);

                  if (info["type"] === 'PERIOD' && _context["_target_database"] === 'oracle') {
                    in_lpe[3] = ["to_date", ["ql", in_lpe[3]], "'YYYY-MM-DD'"];
                    in_lpe[4] = ["to_date", ["ql", in_lpe[4]], "'YYYY-MM-DD'"];
                  } else {
                    in_lpe[3] = ["ql", in_lpe[3]];
                    in_lpe[4] = ["ql", in_lpe[4]];
                  }
                }
              }
            }
          }
        }
      }

      in_lpe.map(function (el) {
        //console.log("RECURS" + JSON.stringify(el))
        quote_text_constants(el);
      });
      return in_lpe;
    };

    var struct = ['sql'];
    var allSources = cfg["columns"].map(function (h) {
      return h["id"].split('.')[0];
    });

    var uniq = _toConsumableArray(new Set(allSources));

    if (uniq.length != 1) {
      throw new Error("We support select from one source only, joins are not supported! Sources detected: " + JSON.stringify(uniq));
    }

    var allTables = cfg["columns"].map(function (h) {
      return h["id"].split('.').slice(0, 2).join('.');
    }); // !!!!!!!!!!!!! uniq will be used later in from!!!

    var uniqTables = _toConsumableArray(new Set(allTables));

    var join_struct = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["e" /* reports_get_join_path */])(uniqTables);

    if (join_struct.nodes.length === 0) {
      throw new Error("Can not find path to JOIN tables: " + JSON.stringify(uniqTables));
    } // HACK as we miss _cfg["sourceId"]


    var srcIdent = _cfg["sourceId"];

    if (srcIdent === undefined) {
      srcIdent = join_struct.nodes[0].split('.')[0];
    }

    var target_db_type = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["b" /* get_source_database */])(srcIdent);
    _context["_target_database"] = target_db_type; // column should always be represented as full path source.cube.column
    // for aggregates we should add func names as suffix ! like source.cube.column.max_avg

    var sel = ['select'].concat(cfg["columns"].map(function (h) {
      var col_info = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["d" /* reports_get_column_info */])(cfg["sourceId"], h["id"]);
      var col_sql = col_info["sql_query"];
      var parts = h.id.split('.'); //if ( col_sql.match( /^\S+$/ ) !== null ) {

      if (col_sql === parts[2]) {
        // we have just column name, prepend table alias !
        col_sql = "".concat(parts[1], ".").concat(col_sql);
      } // This is hack to implement AGGFN type !


      if (col_info["config"]["aggFormula"]) {
        // We should remove column from GROUP BY
        // group_by is global, it is sad but true
        group_by = group_by.filter(function (id) {
          return id !== h["id"];
        });
      }

      var wrapped_column_sql = wrap_aggregate_functions(col_sql, h, h["id"]);
      var as = "".concat(h.id);

      if (Array.isArray(h["agg"])) {
        as = "\"".concat(h.id, ".").concat(h["agg"].join('.'), "\"");
      } //return `${wrapped_column_sql} AS ${as}`
      // oracle has limit 30 chars in identifier!
      // we can skip it for now.


      return "".concat(wrapped_column_sql); // return [':', `${wrapped_column_sql}`, 'abc']
    }));

    if (group_by.length === cfg["columns"].length) {
      group_by = ["group_by"];
    } else {
      // we should provide group_by!
      group_by = ["group_by"].concat(group_by.map(function (c) {
        return ["column", c];
      }));
    } // will return something like     (select * from abc) AS a


    var from = ['from'].concat(join_struct.nodes.map(function (t) {
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["c" /* reports_get_table_sql */])(target_db_type, t);
    }));
    var order_by = ['order_by'].concat(cfg["columns"].map(function (h) {
      if (h["sort"] == 1) {
        return ["+", ["column", h["id"]]];
      } else if (h["sort"] == 2) {
        return ["-", ["column", h["id"]]];
      }
    }));
    order_by = order_by.filter(function (el) {
      return el !== undefined;
    });
    var filt = cfg["filters"].map(function (h) {
      return h["lpe"] ? convert_in_to_eq(quote_text_constants(h["lpe"])) : null;
    }).filter(function (el) {
      return el !== null;
    });
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("========= reports_get_join_conditions " + JSON.stringify(join_struct));

    if (join_struct.nodes.length > 1) {
      filt = filt.concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17__utils_utils__["f" /* reports_get_join_conditions */])(join_struct));
    }

    if (filt.length > 1) {
      filt = ['and'].concat(filt);
    } else if (filt.length == 1) {
      filt = filt[0];
    }

    if (filt.length > 0) {
      filt = ["filter", filt];
    } else {
      filt = ["filter"];
    }

    struct.push(sel, from, order_by, filt, group_by);

    if (cfg["limit"] !== undefined) {
      var offset = cfg["offset"] || 0;
      struct.push(["slice", offset, cfg["limit"]]);
    }

    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log(JSON.stringify(struct));
    __WEBPACK_IMPORTED_MODULE_13__console_console__["a" /* default */].log("USING ".concat(target_db_type, " as target database"));
    var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(struct, _context);
    return ret;
  }; // по хорошему, надо столбцы засунуть в _context в _columns и подгрузить их тип из базы!!!
  // но мы типы столбцов будем определять здесь (в этой функции) и пытаться закавычить константы заранее....


  var ret = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14__lisp__["a" /* eval_lisp */])(["generate_sql_struct_for_report", _cfg], _context);
  return ret;
}

/***/ }),
/* 102 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = generate_koob_sql;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator__ = __webpack_require__(66);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from__ = __webpack_require__(62);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_array_from__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_array_includes__ = __webpack_require__(144);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_array_includes___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_core_js_modules_es7_array_includes__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_string_includes__ = __webpack_require__(143);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_string_includes___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_core_js_modules_es6_string_includes__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_es7_symbol_async_iterator__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_core_js_modules_es7_symbol_async_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_core_js_modules_es7_symbol_async_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_symbol__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_symbol___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_core_js_modules_es6_symbol__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_array_find__ = __webpack_require__(61);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_array_find___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_core_js_modules_es6_array_find__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es7_object_values__ = __webpack_require__(50);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_core_js_modules_es7_object_values___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_core_js_modules_es7_object_values__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_string_starts_with__ = __webpack_require__(99);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_string_starts_with___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8_core_js_modules_es6_string_starts_with__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_array_sort__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_array_sort___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9_core_js_modules_es6_array_sort__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_web_dom_iterable__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_core_js_modules_web_dom_iterable___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_10_core_js_modules_web_dom_iterable__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_array_iterator__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_array_iterator___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_11_core_js_modules_es6_array_iterator__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_object_keys__ = __webpack_require__(64);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_object_keys___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_12_core_js_modules_es6_object_keys__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_core_js_modules_es6_regexp_match__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_core_js_modules_es6_regexp_match___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_13_core_js_modules_es6_regexp_match__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14_core_js_modules_es6_regexp_split__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14_core_js_modules_es6_regexp_split___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_14_core_js_modules_es6_regexp_split__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15_core_js_modules_es6_regexp_to_string__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15_core_js_modules_es6_regexp_to_string___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_15_core_js_modules_es6_regexp_to_string__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16_core_js_modules_es6_regexp_replace__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16_core_js_modules_es6_regexp_replace___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_16_core_js_modules_es6_regexp_replace__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_18__lisp__ = __webpack_require__(36);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_19__lpep__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_20__utils_utils__ = __webpack_require__(52);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_21_core_js_fn_object__ = __webpack_require__(105);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_21_core_js_fn_object___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_21_core_js_fn_object__);


















function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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

 //import {sql_where_context} from './sql_where';




/* Постановка
На входе имеем структуру данных из браузера:
          { "with":"czt.fot",
              "filters": {
              "dor1": ["=", "ГОРЬК"],
              "dor2": ["=", "ПОДГОРЬК"],
              "dor4": ["=", null],
              "dor5": ["=", null],
              "dt": ["BETWEEN", "2020-01", "2020-12"],
              "sex_name": ["=", "Мужской"],
              "": [">", ["+",["col1", "col2"]], 100]
            },
            "having": {
              "dt": [">","2020-08"],
            },
            "columns": ["dor3", "czt.fot.dor4", "fot.dor5", 'sum((val3+val1)/100):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new":  ["avg", ["+",["column","val2"],["column","val3"]]]} ],
            "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2", "summa"]
          }

Требуется 
1) тексты отпарсить в скоботу и сделать готовые для eval структуры.
2) на основе with сходить в базу и получить всю инфу про столбцы куба, подготовить context для поиска столбцов по короткому и длинному имени.
3) выполнить eval для части columns -> получить массив структур, готовых к построению части SELECT.
   'sum((val3+val1)/100):summa' ===> 
   {
     expr: 'sum((fot.val3+fot.val1)/100)',
     alias: "summa",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true
     cubes: ["czt.fot"]
   }
   можно также в процессе вычисления определить тип столбца из базы, и автоматом навесить agg, например sum
4) на основе columns_struct вычислить group_by, проверить, требуется ли JOIN.
5) при вычислении фильтров, учесть group_by и сделать дополнение для столбцов, у которых в конфиге указано как селектить ALL
6) создать какое-то чудо, которое будет печатать SQL из этих структур.
7) при генерации SQL в ПРОСТОМ случае, когда у нас один единственный куб, генрим КОРОТКИЕ имена столбцов
*/

function any_db_quote_literal(el) {
  return "'" + el.toString().replace(/'/g, "''") + "'";
}
/***************************************************************
 * Дописывает имена столбцов в структуре _cfg, до полных имён, используя префикс cube_prefix, там, где это очевидно.
 * простые тексты переводит в LPE скоботу
 * Считаем, что любой встреченный литерал является именем столбца.
 * в контексте ctx[_columns] должны быть описания столбцов из базы
 */


function normalize_koob_config(_cfg, cube_prefix, ctx) {
  var parts = cube_prefix.split('.');
  var ds = parts[0];
  var cube = parts[1];
  var ret = {
    "ds": ds,
    "cube": cube,
    "filters": {},
    "having": {},
    "columns": [],
    "sort": [],
    "limit": _cfg["limit"],
    "offset": _cfg["offset"]
  };
  var aliases = {};
  if (_cfg["distinct"]) ret["distinct"] = [];
  /* expand_column также будем делать в процессе выполнения LPE, там будет вся инфа про куб, и про его дименшены. 
     мы будем точно знать, является ли суффикс именем столбца из куба или нет.
     То есть нужна правильная реализация функции column и правильная реализация для неизвестного литерала, с учётом алиасов !!!
  */

  var expand_column = function expand_column(col) {
    return col.match(/("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)/) === null ? ctx._columns["".concat(cube_prefix, ".").concat(col)] ? "".concat(cube_prefix, ".").concat(col) : col : col;
  }; // для фильтров заменяем ключи на полные имена


  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(_cfg["filters"])) {
    Object.keys(_cfg["filters"]).filter(function (k) {
      return k !== "";
    }).map(function (key) {
      ret["filters"][expand_column(key)] = _cfg["filters"][key];
    });
  } // для фильтров заменяем ключи на полные имена, но у нас может быть массив [{},{}]


  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_cfg["filters"])) {
    var processed = _cfg["filters"].map(function (obj) {
      var result = {};

      if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(obj)) {
        Object.keys(obj).filter(function (k) {
          return k !== "";
        }).map(function (key) {
          result[expand_column(key)] = obj[key];
        });
      }

      return result;
    });

    ret["filters"] = processed; // [{},{}]
  } // probably we should use aliased columns a AS b!!


  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_cfg["having"])) {
    Object.keys(_cfg["having"]).filter(function (k) {
      return k !== "";
    }).map(function (key) {
      return ret["having"][expand_column(key)] = _cfg["having"][key];
    });
  } // "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2", ["-",["column","val3"]]]
  // FIXME: нужна поддержка "sort": [1,3,-2]
  // FIXME: может быть лучше перейти на ORDER BY 2, 1 DESC, 4 ???? 


  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_cfg["sort"])) {
    ret["sort"] = _cfg["sort"].map(function (el) {
      if (Array.isArray(el)) {
        if (el.length === 2) {
          if (el[0] === "-" || el[0] === "+") {
            if (Array.isArray(el[1])) {
              if (el[1][0] === "column") {
                return [el[0], ["column", expand_column(el[1][1])]];
              }
            } else {
              return [el[0], ["column", expand_column(el[1])]];
            }
          }
        }
      } else if (el && typeof el === 'string') {
        // тут может быть ссылка как на столбец, так и на alias, надо бы научиться отличать одно от другого
        if (el.startsWith("-")) {
          return ["-", ["column", expand_column(el.substring(1))]];
        } else if (el.startsWith("+")) {
          return ["+", ["column", expand_column(el.substring(1))]];
        } else {
          return ["+", ["column", expand_column(el)]];
        }
      }
    });
  } // "columns": ["dor3", "src.cube.dor4", "cube.col", 'sum((val3+val1)/100):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new":  ["avg", ["+",["column","val2"],["column","val3"]]]} ],

  /* возвращает примерно вот такое:
  [["column","ch.fot_out.dor3"],["->","src","cube","dor4"],["->","cube","col"],[":",["sum",["/",["()",["+","val3","val1"]],100]],"summa"],[":",["column","ch.fot_out.old"],"new"],["sum",["column","val2"]],[":",["avg",["+",["column","val2"],["column","val3"]]],"new"]]
  простые случаи раскладывает в скоботу сразу, чтобы не запускать eval_lisp
  */


  var expand_column_expression = function expand_column_expression(el) {
    if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(el)) {
      // do not call parse on simple strings, which looks like column names !!!
      if (el.match(/^[a-zA-Z_]\w+$/) !== null) {
        return ["column", expand_column(el)];
      } // exactly full column name, но может быть лучше это скинуть в ->


      if (el.match(/^([a-zA-Z_]\w+\.){1,2}[a-zA-Z_]\w+$/) !== null) {
        return ["column", el];
      }

      var ast = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_19__lpep__["a" /* parse */])(el);

      if (typeof ast === 'string') {
        // but if it was string, try to expand
        return ["column", expand_column(ast)];
      }

      return ast;
    } else if (Array.isArray(el)) {
      return el;
    } else {
      throw new Error("Wrong element in the columns array: ".concat(el.toString()));
    }
  }; // turn text lpe representations into AST, keep AST as is...


  ret["columns"] = _cfg["columns"].map(function (el) {
    if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(el)) {
      return [":", expand_column_expression(Object.values(el)[0]), Object.keys(el)[0]];
    } else {
      return expand_column_expression(el);
    }
  }); //console.log(`COLUMNS: ${JSON.stringify(ret)}`)

  return ret;
}
/*********************************
 * 
 * init_koob_context
 * на входе контекст может быть массивом, а может быть хэшем. Стало сложнее с этим работать!
 * Cчитаем, что на входе может быть только хэш с уже прочитанными именами столбцов!!
 */


function init_koob_context(_vars, default_ds, default_cube) {
  var _ctx = []; // это контекст где будет сначала список переменных, включая _columns, и функции

  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(_vars)) {
    _ctx = [_vars];
  }

  var _context = _ctx[0]; // пытается определить тип аргумента, если это похоже на столбец, то ищет про него инфу в кэше и определяет тип,
  // а по типу можно уже думать, квотировать значения или нет.

  var shouldQuote = function shouldQuote(col, v) {
    if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(col) && col[0] === 'column') {
      //try to detect column type
      var c = _context["_columns"][col[1]];

      if (c) {
        return c.type !== 'NUMBER';
      }

      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(v);
    } // это формула над какими-то столбцами...
    // смотрим на тип выражения v, если это текст, то возвращаем true,


    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(v);
  };

  var quoteLiteral = function quoteLiteral(lit) {
    if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(lit) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["e" /* isNumber */])(lit) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(lit) && lit[0] !== "ql") {
      return ["ql", lit];
    }

    return lit;
  }; // функция, которая резолвит имена столбцов для случаев, когда имя функции не определено в явном виде в _vars/_context


  _ctx.push(function (key, val, resolveOptions) {
    //console.log(`WANT to resolve ${key}`, JSON.stringify(resolveOptions));
    // вызываем функцию column(ПолноеИмяСтолбца) если нашли столбец в дефолтном кубе
    if (_context["_columns"][key]) return _context["column"](key);
    if (_context["_columns"][default_ds][default_cube][key]) return _context["column"]("".concat(default_ds, ".").concat(default_cube, ".").concat(key));

    if (resolveOptions && resolveOptions.wantCallable) {
      if (key.match(/^\w+$/)) {
        if (_context["_result"]) {
          if (['sum', 'avg', 'min', 'max', 'count'].find(function (el) {
            return el === key;
          })) {
            _context["_result"]["agg"] = true;
          }
        }

        return function () {
          var a = Array.prototype.slice.call(arguments); //console.log(`FUNC RESOLV ${key}`, JSON.stringify(a))

          return "".concat(key, "(").concat(a.join(','), ")");
        };
      } else {
        // -> ~ > < != <> and so on,
        //  FIXME: мы должны вернуть более умный макрос, который будет искать вызовы column в левой и правой части и делать ql при необходимости
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast, ctx) {
          //console.log(`ANY FUNC ${key}`, JSON.stringify(ast))
          var k = key;
          var col = ast[0];
          var c = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, ctx);
          var v = ast[1];
          if (shouldQuote(col, v)) v = quoteLiteral(v);
          v = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(v, ctx);
          return "".concat(c, " ").concat(k, " ").concat(v);
        });
      }
    } //console.log(`DID NOT resolved ${key}`);


    return key;
  });

  _context["column"] = function (col) {
    // считаем, что сюда приходят только полностью резолвенные имена с двумя точками...
    var c = _context["_columns"][col];

    if (c) {
      if (_context["_result"]) {
        _context["_result"]["columns"].push(col);
      }

      var parts = col.split('.');

      if (c.sql_query.match(/^\S+$/) === null) {
        // we have whitespace here, so it is complex expression :-()
        return "(".concat(c.sql_query, ")");
      } else {
        // we have just column name, prepend table alias !
        return "".concat(parts[1], ".").concat(parts[2]);
      }
    } //console.log("COL FAIL", col)
    // возможно кто-то вызовет нас с коротким именем - нужно знать дефолт куб!!!
    //if (_context["_columns"][default_ds][default_cube][key]) return `${default_cube}.${key}`;


    return col;
  }; // сюда должны попадать только хитрые варианты вызова функций с указанием схемы типа utils.smap()


  _context["->"] = function () {
    var a = Array.prototype.slice.call(arguments); //console.log("-> !" , JSON.stringify(a))

    return a.map(function (el) {
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(el) ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(el, _ctx) : el;
    }).join('.');
  };

  _context['->'].ast = [[], {}, [], 1]; // mark as macro

  _context[':'] = function (o, n) {
    //var a = Array.prototype.slice.call(arguments);
    //console.log(":   " + JSON.stringify(o));
    //return a[0] + ' as ' + a[1].replace(/"/,'\\"');
    //console.log("AS   " + JSON.stringify(_ctx));
    var otext = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(o, _ctx);

    if (_context["_result"]) {
      // мы кидаем значение alias в _result, это подходит для столбцов
      // для TABLE as alias не надо вызывать _result
      _context["_result"]["alias"] = n;
      return otext;
    }

    return "".concat(otext, " as ").concat(n);
  };

  _context[':'].ast = [[], {}, [], 1]; // mark as macro

  _context['()'] = function (a) {
    return "(".concat(a, ")");
  };

  _context['and'] = function () {
    var a = Array.prototype.slice.call(arguments);
    return "(".concat(a.join(') AND ('), ")");
  };

  _context['or'] = function () {
    var a = Array.prototype.slice.call(arguments);
    return "(".concat(a.join(') OR ('), ")");
  }; // overwrite STDLIB! or we will treat (a = 'null') as (a = null) which is wrong in SQL !


  _context['null'] = 'null';
  _context['true'] = 'true';
  _context['false'] = 'false';

  _context["ql"] = function (el) {
    // NULL values should not be quoted
    // plv8 version of db_quote_literal returns E'\\d\\d' for '\d\d' which is not supported in ClickHose :-()
    // so we created our own version...
    return el === null ? null : any_db_quote_literal(el);
  };

  _context['between'] = function (col, var1, var2) {
    if (shouldQuote(col, var1)) var1 = quoteLiteral(var1);
    if (shouldQuote(col, var2)) var2 = quoteLiteral(var2);
    return "".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context), " BETWEEN ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(var1, _context), " AND ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(var2, _context));
  };

  _context['between'].ast = [[], {}, [], 1]; // mark as macro

  _context['~'] = function (col, tmpl) {
    if (shouldQuote(col, tmpl)) tmpl = quoteLiteral(tmpl); // в каждой базе свои regexp

    if (_vars["_target_database"] === 'oracle') {
      return "REGEXP_LIKE( ".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context), " , ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(tmpl, _context), " )");
    } else if (_vars["_target_database"] === 'mysql') {
      return "".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context), " REGEXP ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(tmpl, _context));
    } else if (_vars["_target_database"] === 'clickhouse') {
      // case is important !!!
      return "match( ".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context), " , ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(tmpl, _context), " )");
    } else {
      return "".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context), " ~ ").concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(tmpl, _context));
    }
  };

  _context['~'].ast = [[], {}, [], 1]; // mark as macro

  _context['!~'] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast, ctx) {
    return "NOT " + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(["~"].concat(ast), ctx);
  });
  _context['='] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast, ctx) {
    // понимаем a = [null] как a is null
    // a = [] просто пропускаем, А кстати почему собственно???
    // a = [null, 1,2] как a in (1,2) or a is null
    // ["=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log(JSON.stringify(ast));
    var col = ast[0];
    var c = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context);

    var resolveValue = function resolveValue(v) {
      if (shouldQuote(col, v)) v = quoteLiteral(v);
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(v, _context);
    };

    if (ast.length === 1) {
      return 'TRUE';
    } else if (ast.length === 2) {
      var v = resolveValue(ast[1]);
      return v === null ? "".concat(c, " IS NULL") : "".concat(c, " = ").concat(v);
    } else {
      // check if we have null in the array of values...
      var resolvedV = ast.slice(1).map(function (el) {
        return resolveValue(el);
      }).filter(function (el) {
        return el !== null;
      });
      var hasNull = resolvedV.length < ast.length - 1;
      var ret = "".concat(c, " IN (").concat(resolvedV.join(', '), ")");
      if (hasNull) ret = "".concat(ret, " OR ").concat(c, " IS NULL");
      return ret;
    }
  });
  _context['!='] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast, ctx) {
    // понимаем a != [null] как a is not null
    // a != [] просто пропускаем, А кстати почему собственно???
    // a != [null, 1,2] как a not in (1,2) and a is not null
    // ["!=",["column","vNetwork.cluster"],SPB99-DMZ02","SPB99-ESXCL02","SPB99-ESXCL04","SPB99-ESXCLMAIL"]
    // var a = Array.prototype.slice.call(arguments)
    __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log(JSON.stringify(ast));
    var col = ast[0];
    var c = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(col, _context);

    var resolveValue = function resolveValue(v) {
      if (shouldQuote(col, v)) v = quoteLiteral(v);
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(v, _context);
    };

    if (ast.length === 1) {
      return 'TRUE';
    } else if (ast.length === 2) {
      var v = resolveValue(ast[1]);
      return v === null ? "".concat(c, " IS NOT NULL") : "".concat(c, " != ").concat(v);
    } else {
      // check if we have null in the array of values...
      var resolvedV = ast.slice(1).map(function (el) {
        return resolveValue(el);
      }).filter(function (el) {
        return el !== null;
      });
      var hasNull = resolvedV.length < ast.length - 1;
      var ret = "".concat(c, " NOT IN (").concat(resolvedV.join(', '), ")");
      if (hasNull) ret = "".concat(ret, " AND ").concat(c, " IS NOT NULL");
      return ret;
    }
  });
  return _ctx;
}

function extend_context_for_order_by(_context, _cfg) {
  // создаём контекст с двумя макросами + и -, а они вызовут обычный контекст....
  // можно пробовать переопределить реализацию функции column и поиска литералов/алиасов
  // но пока что будет так 
  var aliasContext = [// 
  {
    "column": __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (col) {
      /* примерно на 222 строке есть обработчик-резолвер литералов, там хардкодный вызов функции 
        if (_context["_columns"][key]) return _context["column"](key)
        то есть вызывается функция column в явном виде, а тут мы просто печатаем, что нам прислали.
         FIXME: ИМЕЕТ смысл сделать функцию colref() и типа ссылаться на какой-то столбец.
        И тут мы можем умно резолвить имена столбцов и алиасы и подставлять то, что нам надо.
        ЛИБО объявить тут функцию как МАКРОС и тогда уже правильно отработать column
        NEW COL: ["ch.fot_out.dor1"]
        console.log("NEW COLUMN", col)
      */
      //console.log("NEW COL:", JSON.stringify(col))
      var parts = col[0].split('.');

      if (parts.length === 3) {
        return "".concat(parts[1], ".").concat(parts[2]);
      } else {
        return col[0];
      }
      /*
      if (_context[0]["_columns"][key]) return _context["column"](key)
      if (_context[0]["_columns"][default_ds][default_cube][key]) return _context["column"](`${default_ds}.${default_cube}.${key}`)
      
      return col*/

    })
  }].concat(_toConsumableArray(_context));
  var _ctx = {};
  _ctx["+"] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(ast[0], aliasContext);
  });
  _ctx["-"] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["f" /* makeSF */])(function (ast) {
    return "".concat(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(ast[0], aliasContext), " DESC");
  });
  return _ctx;
}
/* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
 Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
 Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !
  Также можно считать ашрегаты на лету, но для этого требуется ИСКЛЮЧИТЬ memberALL из агрегирования!!!
  Для указанных явно дименшенов доп. условий не требуется, клиент сам должен задать фильтры и понимать последствия.
 В любом случае по group by столбцам не будет удвоения, memberAll будет явно представлен отдельно в результатах
*/


function inject_all_member_filters(_cfg, columns) {
  /* _cfg.filters может быть {} а может быть [{},{}] и тут у нас дикий код */
  var processed = {};

  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(_cfg["filters"])) {
    _cfg["filters"] = get_all_member_filters(_cfg, columns, _cfg["filters"]);
  } else if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_cfg["filters"])) {
    _cfg["filters"] = _cfg["filters"].map(function (obj) {
      return get_all_member_filters(_cfg, columns, obj);
    });
  }

  return _cfg;
}

function get_all_member_filters(_cfg, columns, _filters) {
  var processed = {}; // лучше его использовать как аккумулятор для накопления ответа, это вам не Clojure!

  var h = {}; // заполняем хэш h длинными именами столбцов, по которым явно есть GROUP BY

  _cfg["_group_by"].map(function (el) {
    el.columns.map(function (e) {
      return h[e] = true;
    });
  });

  __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("FILTERS", JSON.stringify(_filters)); //console.log("columns", JSON.stringify(columns))
  // Ищем dimensions, по которым явно указан memeber ALL, и которых НЕТ в нашем явном списке...
  // ПО ВСЕМ СТОЛБАМ!!!

  Object.values(columns).map(function (el) {
    if (h[el.id] === true) {
      return; // столбец уже есть в списке group by!
    }

    if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(el.config)) {
      // Если для столбца прописано в конфиге follow=[], и нашего столбца ещё нет в списке фильтров, то надо добавить фильтр
      if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(el.config.follow) && !__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_filters[el.id])) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = el.config.follow[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var alt = _step.value;
            // names should skip datasource
            var altId = "".concat(_cfg.ds, ".").concat(alt);
            __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("###checking ".concat(el.config.follow, " ").concat(altId), JSON.stringify(_filters[el.id])); // По столбцу за которым мы следуем есть условие

            if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_filters[altId])) {
              if (_filters[altId].length == 2) {
                // у столбца описан memberAll
                if (columns[altId].config.memberALL === null || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(columns[altId].config.memberALL) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["e" /* isNumber */])(columns[altId].config.memberALL)) {
                  var f = _filters[altId];

                  if (f[1] == columns[altId].config.memberALL) {
                    // Есть условие по столбцу, которому мы должны следовать, надо добавить такое же условие!
                    _filters[el.id] = [f[0], f[1]];
                    break;
                  }
                }
              } // так как есть условие по основному столбцу, мы не знаем точно, какое наше значение ему соответствует, 
              // и чтобы не добавлялся memberALL ниже, мы пропускаем наш столбец


              return;
            }
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
      }

      if (el.config.memberALL === null || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(el.config.memberALL) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["e" /* isNumber */])(el.config.memberALL)) {
        // есть значение для члена ALL, и оно в виде строки или IS NULL
        // добавляем фильтр, но только если по этому столбцу нет другого фильтра (который задали в конфиге)!!!
        // NOTE: по ключу filters ещё не было нормализации !!! 
        if (!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_filters[el.id])) {
          // Также нужно проверить нет ли уже фильтра по столбцу, который является altId
          if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(el.config.altDimensions)) {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = el.config.altDimensions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _alt = _step2.value;
                // names must skip datasource, but may skip cube, let's add our cube if it is missed...
                var _altId = '';

                if (_alt.includes('.')) {
                  _altId = "".concat(_cfg.ds, ".").concat(_alt);
                } else {
                  _altId = "".concat(_cfg.ds, ".").concat(_cfg.cube, ".").concat(_alt);
                }

                __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("ALT", JSON.stringify(_altId));

                if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_filters[_altId]) || h[_altId] === true) {
                  // уже есть условие по столбцу из altId, не добавляем новое условие
                  // но только в том случае, если у нас явно просят этот столбец в выдачу
                  // if ( h[])
                  return;
                }
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                  _iterator2.return();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }
          }

          __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("!!!!checking  ".concat(el.id, " children"), JSON.stringify(el.config.children)); // Если есть дочерние столбцы, то надо проверить нет ли их в GROUP BY или В Фильтрах

          if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(el.config.children)) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = el.config.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var _alt2 = _step3.value;
                var _altId2 = '';

                if (_alt2.includes('.')) {
                  _altId2 = "".concat(_cfg.ds, ".").concat(_alt2);
                } else {
                  _altId2 = "".concat(_cfg.ds, ".").concat(_cfg.cube, ".").concat(_alt2);
                }

                if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_filters[_altId2]) || h[_altId2] === true) {
                  // children уже специфицированы, не надо добавлять меня!
                  return;
                }
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
                  _iterator3.return();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }
          }

          _filters[el.id] = ["=", el.config.memberALL];
        }
      }
    }
  });
  __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("FILTERS AFTER", JSON.stringify(_filters));
  return _filters;
}

function generate_koob_sql(_cfg, _vars) {
  var _context = _vars;
  /*
  {
  "with":"czt.fot",
    "filters": {
    "dor1": ["=", "ГОРЬК"],
    "dor2": ["=", "ПОДГОРЬК"],
    "dor4": ["=", null],
    "dor5": ["=", null],
    "dt": ["BETWEEN", "2020-01", "2020-12"],
    "sex_name": ["=", "Мужской"],
    "": [">", ["+",["col1", "col2"]], 100]
  },
  "having": {
    "dt": [">","2020-08"],
  },
  "columns": ["dor3", 'sum(val3):summa', {"new":"old"}, ["sum", ["column","val2"]],  {"new",  ["avg", ["+",["column","val2"],["column","val3"]]} ],
  "sort": ["-dor1","val1",["-","val2"],"-czt.fot.dor2"] 
  }
  */

  var target_db_type = null;

  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["d" /* isString */])(_cfg["with"])) {
    var w = _cfg["with"];
    _context["_columns"] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_20__utils_utils__["a" /* reports_get_columns */])(w); // это корректный префикс: "дс.перв"."куб.2"  так что тупой подсчёт точек не катит.

    if (w.match(/^("[^"]+"|[^\.]+)\.("[^"]+"|[^\.]+)$/) !== null) {
      _cfg = normalize_koob_config(_cfg, w, _context);
      target_db_type = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_20__utils_utils__["b" /* get_source_database */])(w.split('.')[0]);
      _context["_target_database"] = target_db_type;
    } else {
      // это строка, но она не поддерживается, так как либо точек слишком много, либо они не там, либо их нет
      throw new Error("Request contains with key, but it has the wrong format: ".concat(w, " Should be datasource.cube with exactly one dot in between."));
    }
  } else {
    throw new Error("Default cube must be specified in with key");
  }

  _context = init_koob_context(_context, _cfg["ds"], _cfg["cube"]);
  __WEBPACK_IMPORTED_MODULE_17__console_console__["a" /* default */].log("NORMALIZED CONFIG: ", JSON.stringify(_cfg["filters"]));
  /*
    while we evaluating each column, koob_context will fill JSON structure in the context like this:
   {
     expr: "sum((fot.val3+fot.val1)/100) as summa",
     alias: "summa",
     columns: ["czt.fot.val3","czt.fot.val1"],
     agg: true
   }
  */

  var columns_s = [];

  var columns = _cfg["columns"].map(function (el) {
    _context[0]["_result"] = {
      "columns": []
    };
    var r = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(el, _context);
    columns_s.push(_context[0]["_result"]);
    return r;
  });

  _context[0]["_result"] = null;

  for (var i = 0; i < columns.length; i++) {
    columns_s[i]["expr"] = columns[i];
  } // ищем кандидатов для GROUP BY и заполняем оригинальную структуру служебными полями


  _cfg["_group_by"] = [];
  _cfg["_measures"] = [];
  columns_s.map(function (el) {
    return el["agg"] === true ? _cfg["_measures"].push(el) : _cfg["_group_by"].push(el);
  });
  _cfg["_columns"] = columns_s; //console.log("RES ", JSON.stringify(columns_s))

  if (_cfg["_measures"].length === 0) {
    // do not group if we have no aggregates !!!
    _cfg["_group_by"] = [];
  } //console.log("GBY ", JSON.stringify(_cfg["_group_by"]))

  /* В итоге у нас получается явный GROUP BY по указанным столбцам-dimensions и неявный group by по всем остальным dimensions куба.
   Свободные дименшены могут иметь мембера ALL, и во избежание удвоения сумм, требуется ВКЛЮЧИТЬ мембера ALL в суммирование как некий кэш.
   Другими словами, по ВСЕМ свободным дименшенам, у которых есть мембер ALL (см. конфиг) требуется добавить фильтр dimX = 'ALL' !
    Для указанных явно дименшенов доп. условий не требуется, клиент сам будет разбираться с результатом
  */


  if (_cfg["_group_by"].length > 0) {
    _cfg = inject_all_member_filters(_cfg, _context[0]["_columns"]);
  } // at this point we will have something like this:

  /*
   {"ds":"ch",
   "cube":"fot_out",
   "filters":{"ch.fot_out.dor1":["=","ГОРЬК"],"ch.fot_out.dor2":["=","ПОДГОРЬК"],"ch.fot_out.dor4":["=",null],
   "ch.fot_out.dor5":["=",null],"ch.fot_out.dt":["BETWEEN","2020-01","2020-12"],"ch.fot_out.sex_name":["=","Мужской"],"ch.fot_out.pay_name":
   ["=",null]},
   "having":{"ch.fot_out.dt":[">","2020-08"]},
   "columns":[["column","ch.fot_out.dt"],["column","ch.fot_out.branch4"],
   ["column","fot_out.ss1"],[":",["sum",["/",["()",["+","v_main",["->","utils",["func","v_rel_fzp"]]]],100]],"summa"],[":",
   ["column","ch.fot_out.obj_name"],"new"],["sum",["column","v_rel_pp"]],[":",["avg",["+",["column","ch.fot_out.indicator_v"],["column","v_main"]]],
   "new"]],"sort":[["-",["column","ch.fot_out.dor1"]],["+",["column","val1"]],["-",["column","val2"]],["-",["column","czt.fot.dor2"]],
   ["+",["column","summa"]]],
   "_group_by":[{"columns":["ch.fot_out.dt"],"expr":"(NOW() - INERVAL '1 DAY')"},{"columns":["ch.fot_out.branch4"],
   "expr":"fot_out.branch4"},{"columns":[],"expr":"fot_out.ss1"},{"columns":["ch.fot_out.obj_name"],"alias":"new","expr":"fot_out.obj_name"}],
   "_measures":[{"columns":["ch.fot_out.v_main","ch.fot_out.v_rel_fzp"],"agg":true,"alias":"summa","expr":
   "sum((fot_out.v_main + utils.func(fot_out.v_rel_fzp)) / 100)"},{"columns":["ch.fot_out.v_rel_pp"],"agg":true,"expr":
   "sum(fot_out.v_rel_pp)"},{"columns":["ch.fot_out.indicator_v","ch.fot_out.v_main"],"agg":true,"alias":"new","expr":
   "avg(fot_out.indicator_v + fot_out.v_main)"}],
   "_columns":[{"columns":["ch.fot_out.dt"],"expr":"(NOW() - INERVAL '1 DAY')"},
   {"columns":["ch.fot_out.branch4"],"expr":"fot_out.branch4"},{"columns":[],"expr":"fot_out.ss1"},{"columns":
   ["ch.fot_out.v_main","ch.fot_out.v_rel_fzp"],"agg":true,"alias":"summa","expr":"sum((fot_out.v_main + utils.func(fot_out.v_rel_fzp)) / 100)"},
   {"columns":["ch.fot_out.obj_name"],"alias":"new","expr":"fot_out.obj_name"},{"columns":["ch.fot_out.v_rel_pp"],"agg":true,"expr":
   "sum(fot_out.v_rel_pp)"},{"columns":["ch.fot_out.indicator_v","ch.fot_out.v_main"],"agg":true,"alias":"new","expr":
   "avg(fot_out.indicator_v + fot_out.v_main)"}]}
  */
  // let's get SQL from it!


  var select = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["c" /* isArray */])(_cfg["distinct"]) ? "SELECT DISTINCT " : "SELECT "; // могут быть ньюансы квотации столбцов, обозначения AS и т.д. поэтому каждый участок приводим к LPE и вызываем SQLPE функции с адаптацией под конкретные базы

  select = select.concat(_cfg["_columns"].map(function (el) {
    if (el.alias) {
      return "".concat(el.expr, " AS ").concat(el.alias);
    } else {
      if (el.columns.length === 1) {
        var parts = el.columns[0].split('.');
        return "".concat(el.expr, " AS ").concat(parts[2]);
      }

      return el.expr;
    }
  }).join(', '));
  var where = '';
  var filters_array = _cfg["filters"];

  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["b" /* isHash */])(filters_array)) {
    filters_array = [filters_array];
  }

  filters_array = filters_array.map(function (_filters) {
    var part_where = null;
    var pw = Object.keys(_filters).filter(function (k) {
      return k !== "";
    }).map(function (key) {
      var a = _filters[key].splice(1, 0, ["column", key]);

      return _filters[key];
    });

    if (pw.length > 0) {
      var wh = ["and"].concat(pw); //console.log("WHERE", JSON.stringify(wh))

      part_where = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(wh, _context);
    }

    return part_where;
  }).filter(function (el) {
    return el !== null && el.length > 0;
  });

  if (filters_array.length == 1) {
    where = "\nWHERE ".concat(filters_array[0]);
  } else if (filters_array.length > 1) {
    where = "\nWHERE ".concat("(".concat(filters_array.join(")\n   OR ("), ")"));
  }

  var group_by = _cfg["_group_by"].map(function (el) {
    return el.expr;
  }).join(', ');

  group_by = group_by ? "\nGROUP BY ".concat(group_by) : ''; // нужно дополнить контекст для +,- и суметь сослатья на алиасы!

  var order_by_context = extend_context_for_order_by(_context, _cfg); //console.log("SORT:", JSON.stringify(_cfg["sort"]))

  var order_by = _cfg["sort"].map(function (el) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18__lisp__["a" /* eval_lisp */])(el, order_by_context);
  }).join(', ');

  order_by = order_by ? "\nORDER BY ".concat(order_by) : '';
  var from = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_20__utils_utils__["c" /* reports_get_table_sql */])(target_db_type, "".concat(_cfg["ds"], ".").concat(_cfg["cube"]));
  return "".concat(select, "\nFROM ").concat(from).concat(where).concat(group_by).concat(order_by);
}

/***/ }),
/* 103 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lpe", function() { return eval_lpe; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__console_console__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lpep__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lped__ = __webpack_require__(100);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lisp__ = __webpack_require__(36);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__sql_where__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__sql_context__ = __webpack_require__(101);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__sql_koob__ = __webpack_require__(102);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parse", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "deparse", function() { return __WEBPACK_IMPORTED_MODULE_2__lped__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "LPESyntaxError", function() { return __WEBPACK_IMPORTED_MODULE_1__lpep__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_lisp", function() { return __WEBPACK_IMPORTED_MODULE_3__lisp__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_sql_where", function() { return __WEBPACK_IMPORTED_MODULE_4__sql_where__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "eval_sql_expr", function() { return __WEBPACK_IMPORTED_MODULE_5__sql_context__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parse_sql_expr", function() { return __WEBPACK_IMPORTED_MODULE_5__sql_context__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "generate_report_sql", function() { return __WEBPACK_IMPORTED_MODULE_5__sql_context__["c"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "generate_koob_sql", function() { return __WEBPACK_IMPORTED_MODULE_6__sql_koob__["a"]; });








function eval_lpe(lpe, ctx) {
  var ast = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lpep__["a" /* parse */])(lpe);
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lisp__["a" /* eval_lisp */])(ast, ctx);
}

 // test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = eval_lisp(ast, []);
// console.log(res);
// test:
// var result = eval_sql_where("where(id=[1,2,3,4] and metric.tree_level(id) = 3 and max(id)=now() and $metric_id = 3)", {"$metric_id":"COOL","id":"ID"});
// console.log(result);

/***/ }),
/* 104 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["c"] = LPESyntaxError;
/* harmony export (immutable) */ __webpack_exports__["a"] = makeError;
/* harmony export (immutable) */ __webpack_exports__["b"] = tokenize;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_starts_with__ = __webpack_require__(99);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_starts_with___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_core_js_modules_es6_string_starts_with__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_function_name__ = __webpack_require__(97);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_function_name___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_core_js_modules_es6_function_name__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__console_console__ = __webpack_require__(14);


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
  if (s.startsWith('lpe:')) s = s.substr(4);
  if (s.startsWith('⚡')) s = s.substr(1);
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
/* 105 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(22);
__webpack_require__(124);
__webpack_require__(126);
__webpack_require__(125);
__webpack_require__(128);
__webpack_require__(130);
__webpack_require__(64);
__webpack_require__(129);
__webpack_require__(127);
__webpack_require__(136);
__webpack_require__(135);
__webpack_require__(132);
__webpack_require__(133);
__webpack_require__(131);
__webpack_require__(123);
__webpack_require__(134);
__webpack_require__(137);
__webpack_require__(138);
__webpack_require__(148);
__webpack_require__(50);
__webpack_require__(147);
__webpack_require__(145);
__webpack_require__(146);
__webpack_require__(149);
__webpack_require__(150);
__webpack_require__(121);
__webpack_require__(119);
__webpack_require__(120);
__webpack_require__(122);
module.exports = __webpack_require__(15).Object;


/***/ }),
/* 106 */
/***/ (function(module, exports, __webpack_require__) {

// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx = __webpack_require__(19);
var IObject = __webpack_require__(56);
var toObject = __webpack_require__(8);
var toLength = __webpack_require__(13);
var asc = __webpack_require__(108);
module.exports = function (TYPE, $create) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  var create = $create || asc;
  return function ($this, callbackfn, that) {
    var O = toObject($this);
    var self = IObject(O);
    var f = ctx(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var val, res;
    for (;length > index; index++) if (NO_HOLES || index in self) {
      val = self[index];
      res = f(val, index, O);
      if (TYPE) {
        if (IS_MAP) result[index] = res;   // map
        else if (res) switch (TYPE) {
          case 3: return true;             // some
          case 5: return val;              // find
          case 6: return index;            // findIndex
          case 2: result.push(val);        // filter
        } else if (IS_EVERY) return false; // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};


/***/ }),
/* 107 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(3);
var isArray = __webpack_require__(77);
var SPECIES = __webpack_require__(1)('species');

module.exports = function (original) {
  var C;
  if (isArray(original)) {
    C = original.constructor;
    // cross-realm fallback
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return C === undefined ? Array : C;
};


/***/ }),
/* 108 */
/***/ (function(module, exports, __webpack_require__) {

// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var speciesConstructor = __webpack_require__(107);

module.exports = function (original, length) {
  return new (speciesConstructor(original))(length);
};


/***/ }),
/* 109 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var dP = __webpack_require__(4).f;
var create = __webpack_require__(28);
var redefineAll = __webpack_require__(87);
var ctx = __webpack_require__(19);
var anInstance = __webpack_require__(68);
var forOf = __webpack_require__(73);
var $iterDefine = __webpack_require__(58);
var step = __webpack_require__(80);
var setSpecies = __webpack_require__(90);
var DESCRIPTORS = __webpack_require__(2);
var fastKey = __webpack_require__(20).fastKey;
var validate = __webpack_require__(93);
var SIZE = DESCRIPTORS ? '_s' : 'size';

var getEntry = function (that, key) {
  // fast case
  var index = fastKey(key);
  var entry;
  if (index !== 'F') return that._i[index];
  // frozen object case
  for (entry = that._f; entry; entry = entry.n) {
    if (entry.k == key) return entry;
  }
};

module.exports = {
  getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
    var C = wrapper(function (that, iterable) {
      anInstance(that, C, NAME, '_i');
      that._t = NAME;         // collection type
      that._i = create(null); // index
      that._f = undefined;    // first entry
      that._l = undefined;    // last entry
      that[SIZE] = 0;         // size
      if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear() {
        for (var that = validate(this, NAME), data = that._i, entry = that._f; entry; entry = entry.n) {
          entry.r = true;
          if (entry.p) entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function (key) {
        var that = validate(this, NAME);
        var entry = getEntry(that, key);
        if (entry) {
          var next = entry.n;
          var prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if (prev) prev.n = next;
          if (next) next.p = prev;
          if (that._f == entry) that._f = next;
          if (that._l == entry) that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /* , that = undefined */) {
        validate(this, NAME);
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3);
        var entry;
        while (entry = entry ? entry.n : this._f) {
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while (entry && entry.r) entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key) {
        return !!getEntry(validate(this, NAME), key);
      }
    });
    if (DESCRIPTORS) dP(C.prototype, 'size', {
      get: function () {
        return validate(this, NAME)[SIZE];
      }
    });
    return C;
  },
  def: function (that, key, value) {
    var entry = getEntry(that, key);
    var prev, index;
    // change existing entry
    if (entry) {
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if (!that._f) that._f = entry;
      if (prev) prev.n = entry;
      that[SIZE]++;
      // add to index
      if (index !== 'F') that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function (C, NAME, IS_MAP) {
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function (iterated, kind) {
      this._t = validate(iterated, NAME); // target
      this._k = kind;                     // kind
      this._l = undefined;                // previous
    }, function () {
      var that = this;
      var kind = that._k;
      var entry = that._l;
      // revert to the last existing entry
      while (entry && entry.r) entry = entry.p;
      // get next entry
      if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if (kind == 'keys') return step(0, entry.k);
      if (kind == 'values') return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};


/***/ }),
/* 110 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var global = __webpack_require__(7);
var $export = __webpack_require__(0);
var redefine = __webpack_require__(10);
var redefineAll = __webpack_require__(87);
var meta = __webpack_require__(20);
var forOf = __webpack_require__(73);
var anInstance = __webpack_require__(68);
var isObject = __webpack_require__(3);
var fails = __webpack_require__(6);
var $iterDetect = __webpack_require__(79);
var setToStringTag = __webpack_require__(46);
var inheritIfRequired = __webpack_require__(75);

module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
  var Base = global[NAME];
  var C = Base;
  var ADDER = IS_MAP ? 'set' : 'add';
  var proto = C && C.prototype;
  var O = {};
  var fixMethod = function (KEY) {
    var fn = proto[KEY];
    redefine(proto, KEY,
      KEY == 'delete' ? function (a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'has' ? function has(a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'get' ? function get(a) {
        return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'add' ? function add(a) { fn.call(this, a === 0 ? 0 : a); return this; }
        : function set(a, b) { fn.call(this, a === 0 ? 0 : a, b); return this; }
    );
  };
  if (typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
    new C().entries().next();
  }))) {
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    var instance = new C();
    // early implementations not supports chaining
    var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
    // V8 ~  Chromium 40- weak-collections throws on primitives, but should return false
    var THROWS_ON_PRIMITIVES = fails(function () { instance.has(1); });
    // most early implementations doesn't supports iterables, most modern - not close it correctly
    var ACCEPT_ITERABLES = $iterDetect(function (iter) { new C(iter); }); // eslint-disable-line no-new
    // for early implementations -0 and +0 not the same
    var BUGGY_ZERO = !IS_WEAK && fails(function () {
      // V8 ~ Chromium 42- fails only with 5+ elements
      var $instance = new C();
      var index = 5;
      while (index--) $instance[ADDER](index, index);
      return !$instance.has(-0);
    });
    if (!ACCEPT_ITERABLES) {
      C = wrapper(function (target, iterable) {
        anInstance(target, C, NAME);
        var that = inheritIfRequired(new Base(), target, C);
        if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
        return that;
      });
      C.prototype = proto;
      proto.constructor = C;
    }
    if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
      fixMethod('delete');
      fixMethod('has');
      IS_MAP && fixMethod('get');
    }
    if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);
    // weak collections should not contains .clear method
    if (IS_WEAK && proto.clear) delete proto.clear;
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F * (C != Base), O);

  if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);

  return C;
};


/***/ }),
/* 111 */
/***/ (function(module, exports, __webpack_require__) {

// all enumerable object keys, includes symbols
var getKeys = __webpack_require__(18);
var gOPS = __webpack_require__(43);
var pIE = __webpack_require__(29);
module.exports = function (it) {
  var result = getKeys(it);
  var getSymbols = gOPS.f;
  if (getSymbols) {
    var symbols = getSymbols(it);
    var isEnum = pIE.f;
    var i = 0;
    var key;
    while (symbols.length > i) if (isEnum.call(it, key = symbols[i++])) result.push(key);
  } return result;
};


/***/ }),
/* 112 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(47)('native-function-to-string', Function.toString);


/***/ }),
/* 113 */
/***/ (function(module, exports, __webpack_require__) {

var document = __webpack_require__(7).document;
module.exports = document && document.documentElement;


/***/ }),
/* 114 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var create = __webpack_require__(28);
var descriptor = __webpack_require__(30);
var setToStringTag = __webpack_require__(46);
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
__webpack_require__(12)(IteratorPrototype, __webpack_require__(1)('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};


/***/ }),
/* 115 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 19.1.2.1 Object.assign(target, source, ...)
var getKeys = __webpack_require__(18);
var gOPS = __webpack_require__(43);
var pIE = __webpack_require__(29);
var toObject = __webpack_require__(8);
var IObject = __webpack_require__(56);
var $assign = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || __webpack_require__(6)(function () {
  var A = {};
  var B = {};
  // eslint-disable-next-line no-undef
  var S = Symbol();
  var K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function (k) { B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source) { // eslint-disable-line no-unused-vars
  var T = toObject(target);
  var aLen = arguments.length;
  var index = 1;
  var getSymbols = gOPS.f;
  var isEnum = pIE.f;
  while (aLen > index) {
    var S = IObject(arguments[index++]);
    var keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
  } return T;
} : $assign;


/***/ }),
/* 116 */
/***/ (function(module, exports, __webpack_require__) {

// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject = __webpack_require__(5);
var aFunction = __webpack_require__(24);
var SPECIES = __webpack_require__(1)('species');
module.exports = function (O, D) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};


/***/ }),
/* 117 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var fails = __webpack_require__(6);

module.exports = function (method, arg) {
  return !!method && fails(function () {
    // eslint-disable-next-line no-useless-call
    arg ? method.call(null, function () { /* empty */ }, 1) : method.call(null);
  });
};


/***/ }),
/* 118 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(48);
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};


/***/ }),
/* 119 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);

$export($export.S + $export.F, 'Object', { classof: __webpack_require__(37) });


/***/ }),
/* 120 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);
var define = __webpack_require__(81);

$export($export.S + $export.F, 'Object', { define: define });


/***/ }),
/* 121 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);

$export($export.S + $export.F, 'Object', { isObject: __webpack_require__(3) });


/***/ }),
/* 122 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);
var define = __webpack_require__(81);
var create = __webpack_require__(28);

$export($export.S + $export.F, 'Object', {
  make: function (proto, mixin) {
    return define(create(proto), mixin);
  }
});


/***/ }),
/* 123 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.3.1 Object.assign(target, source)
var $export = __webpack_require__(0);

$export($export.S + $export.F, 'Object', { assign: __webpack_require__(115) });


/***/ }),
/* 124 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', { create: __webpack_require__(28) });


/***/ }),
/* 125 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);
// 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
$export($export.S + $export.F * !__webpack_require__(2), 'Object', { defineProperties: __webpack_require__(82) });


/***/ }),
/* 126 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(0);
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !__webpack_require__(2), 'Object', { defineProperty: __webpack_require__(4).f });


/***/ }),
/* 127 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.5 Object.freeze(O)
var isObject = __webpack_require__(3);
var meta = __webpack_require__(20).onFreeze;

__webpack_require__(9)('freeze', function ($freeze) {
  return function freeze(it) {
    return $freeze && isObject(it) ? $freeze(meta(it)) : it;
  };
});


/***/ }),
/* 128 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
var toIObject = __webpack_require__(11);
var $getOwnPropertyDescriptor = __webpack_require__(17).f;

__webpack_require__(9)('getOwnPropertyDescriptor', function () {
  return function getOwnPropertyDescriptor(it, key) {
    return $getOwnPropertyDescriptor(toIObject(it), key);
  };
});


/***/ }),
/* 129 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.7 Object.getOwnPropertyNames(O)
__webpack_require__(9)('getOwnPropertyNames', function () {
  return __webpack_require__(83).f;
});


/***/ }),
/* 130 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = __webpack_require__(8);
var $getPrototypeOf = __webpack_require__(44);

__webpack_require__(9)('getPrototypeOf', function () {
  return function getPrototypeOf(it) {
    return $getPrototypeOf(toObject(it));
  };
});


/***/ }),
/* 131 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.11 Object.isExtensible(O)
var isObject = __webpack_require__(3);

__webpack_require__(9)('isExtensible', function ($isExtensible) {
  return function isExtensible(it) {
    return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
  };
});


/***/ }),
/* 132 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.12 Object.isFrozen(O)
var isObject = __webpack_require__(3);

__webpack_require__(9)('isFrozen', function ($isFrozen) {
  return function isFrozen(it) {
    return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
  };
});


/***/ }),
/* 133 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.13 Object.isSealed(O)
var isObject = __webpack_require__(3);

__webpack_require__(9)('isSealed', function ($isSealed) {
  return function isSealed(it) {
    return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
  };
});


/***/ }),
/* 134 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.3.10 Object.is(value1, value2)
var $export = __webpack_require__(0);
$export($export.S, 'Object', { is: __webpack_require__(88) });


/***/ }),
/* 135 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.15 Object.preventExtensions(O)
var isObject = __webpack_require__(3);
var meta = __webpack_require__(20).onFreeze;

__webpack_require__(9)('preventExtensions', function ($preventExtensions) {
  return function preventExtensions(it) {
    return $preventExtensions && isObject(it) ? $preventExtensions(meta(it)) : it;
  };
});


/***/ }),
/* 136 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.17 Object.seal(O)
var isObject = __webpack_require__(3);
var meta = __webpack_require__(20).onFreeze;

__webpack_require__(9)('seal', function ($seal) {
  return function seal(it) {
    return $seal && isObject(it) ? $seal(meta(it)) : it;
  };
});


/***/ }),
/* 137 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = __webpack_require__(0);
$export($export.S, 'Object', { setPrototypeOf: __webpack_require__(89).set });


/***/ }),
/* 138 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 19.1.3.6 Object.prototype.toString()
var classof = __webpack_require__(37);
var test = {};
test[__webpack_require__(1)('toStringTag')] = 'z';
if (test + '' != '[object z]') {
  __webpack_require__(10)(Object.prototype, 'toString', function toString() {
    return '[object ' + classof(this) + ']';
  }, true);
}


/***/ }),
/* 139 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var regexpExec = __webpack_require__(59);
__webpack_require__(0)({
  target: 'RegExp',
  proto: true,
  forced: regexpExec !== /./.exec
}, {
  exec: regexpExec
});


/***/ }),
/* 140 */
/***/ (function(module, exports, __webpack_require__) {

// 21.2.5.3 get RegExp.prototype.flags()
if (__webpack_require__(2) && /./g.flags != 'g') __webpack_require__(4).f(RegExp.prototype, 'flags', {
  configurable: true,
  get: __webpack_require__(40)
});


/***/ }),
/* 141 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var anObject = __webpack_require__(5);
var sameValue = __webpack_require__(88);
var regExpExec = __webpack_require__(45);

// @@search logic
__webpack_require__(39)('search', 1, function (defined, SEARCH, $search, maybeCallNative) {
  return [
    // `String.prototype.search` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.search
    function search(regexp) {
      var O = defined(this);
      var fn = regexp == undefined ? undefined : regexp[SEARCH];
      return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
    },
    // `RegExp.prototype[@@search]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@search
    function (regexp) {
      var res = maybeCallNative($search, regexp, this);
      if (res.done) return res.value;
      var rx = anObject(regexp);
      var S = String(this);
      var previousLastIndex = rx.lastIndex;
      if (!sameValue(previousLastIndex, 0)) rx.lastIndex = 0;
      var result = regExpExec(rx, S);
      if (!sameValue(rx.lastIndex, previousLastIndex)) rx.lastIndex = previousLastIndex;
      return result === null ? -1 : result.index;
    }
  ];
});


/***/ }),
/* 142 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var strong = __webpack_require__(109);
var validate = __webpack_require__(93);
var SET = 'Set';

// 23.2 Set Objects
module.exports = __webpack_require__(110)(SET, function (get) {
  return function Set() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value) {
    return strong.def(validate(this, SET), value = value === 0 ? 0 : value, value);
  }
}, strong);


/***/ }),
/* 143 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// 21.1.3.7 String.prototype.includes(searchString, position = 0)

var $export = __webpack_require__(0);
var context = __webpack_require__(92);
var INCLUDES = 'includes';

$export($export.P + $export.F * __webpack_require__(72)(INCLUDES), 'String', {
  includes: function includes(searchString /* , position = 0 */) {
    return !!~context(this, searchString, INCLUDES)
      .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
  }
});


/***/ }),
/* 144 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// https://github.com/tc39/Array.prototype.includes
var $export = __webpack_require__(0);
var $includes = __webpack_require__(69)(true);

$export($export.P, 'Array', {
  includes: function includes(el /* , fromIndex = 0 */) {
    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
  }
});

__webpack_require__(53)('includes');


/***/ }),
/* 145 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $export = __webpack_require__(0);
var toObject = __webpack_require__(8);
var aFunction = __webpack_require__(24);
var $defineProperty = __webpack_require__(4);

// B.2.2.2 Object.prototype.__defineGetter__(P, getter)
__webpack_require__(2) && $export($export.P + __webpack_require__(41), 'Object', {
  __defineGetter__: function __defineGetter__(P, getter) {
    $defineProperty.f(toObject(this), P, { get: aFunction(getter), enumerable: true, configurable: true });
  }
});


/***/ }),
/* 146 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $export = __webpack_require__(0);
var toObject = __webpack_require__(8);
var aFunction = __webpack_require__(24);
var $defineProperty = __webpack_require__(4);

// B.2.2.3 Object.prototype.__defineSetter__(P, setter)
__webpack_require__(2) && $export($export.P + __webpack_require__(41), 'Object', {
  __defineSetter__: function __defineSetter__(P, setter) {
    $defineProperty.f(toObject(this), P, { set: aFunction(setter), enumerable: true, configurable: true });
  }
});


/***/ }),
/* 147 */
/***/ (function(module, exports, __webpack_require__) {

// https://github.com/tc39/proposal-object-values-entries
var $export = __webpack_require__(0);
var $entries = __webpack_require__(85)(true);

$export($export.S, 'Object', {
  entries: function entries(it) {
    return $entries(it);
  }
});


/***/ }),
/* 148 */
/***/ (function(module, exports, __webpack_require__) {

// https://github.com/tc39/proposal-object-getownpropertydescriptors
var $export = __webpack_require__(0);
var ownKeys = __webpack_require__(86);
var toIObject = __webpack_require__(11);
var gOPD = __webpack_require__(17);
var createProperty = __webpack_require__(70);

$export($export.S, 'Object', {
  getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object) {
    var O = toIObject(object);
    var getDesc = gOPD.f;
    var keys = ownKeys(O);
    var result = {};
    var i = 0;
    var key, desc;
    while (keys.length > i) {
      desc = getDesc(O, key = keys[i++]);
      if (desc !== undefined) createProperty(result, key, desc);
    }
    return result;
  }
});


/***/ }),
/* 149 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $export = __webpack_require__(0);
var toObject = __webpack_require__(8);
var toPrimitive = __webpack_require__(31);
var getPrototypeOf = __webpack_require__(44);
var getOwnPropertyDescriptor = __webpack_require__(17).f;

// B.2.2.4 Object.prototype.__lookupGetter__(P)
__webpack_require__(2) && $export($export.P + __webpack_require__(41), 'Object', {
  __lookupGetter__: function __lookupGetter__(P) {
    var O = toObject(this);
    var K = toPrimitive(P, true);
    var D;
    do {
      if (D = getOwnPropertyDescriptor(O, K)) return D.get;
    } while (O = getPrototypeOf(O));
  }
});


/***/ }),
/* 150 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $export = __webpack_require__(0);
var toObject = __webpack_require__(8);
var toPrimitive = __webpack_require__(31);
var getPrototypeOf = __webpack_require__(44);
var getOwnPropertyDescriptor = __webpack_require__(17).f;

// B.2.2.5 Object.prototype.__lookupSetter__(P)
__webpack_require__(2) && $export($export.P + __webpack_require__(41), 'Object', {
  __lookupSetter__: function __lookupSetter__(P) {
    var O = toObject(this);
    var K = toPrimitive(P, true);
    var D;
    do {
      if (D = getOwnPropertyDescriptor(O, K)) return D.set;
    } while (O = getPrototypeOf(O));
  }
});


/***/ })
/******/ ]);
});
//# sourceMappingURL=lpe.js.map 