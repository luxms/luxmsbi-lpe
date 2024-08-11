(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["lpe"] = factory();
	else
		root["lpe"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 387:
/***/ ((module) => {

module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};


/***/ }),

/***/ 184:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = __webpack_require__(574)('unscopables');
var ArrayProto = Array.prototype;
if (ArrayProto[UNSCOPABLES] == undefined) __webpack_require__(341)(ArrayProto, UNSCOPABLES, {});
module.exports = function (key) {
  ArrayProto[UNSCOPABLES][key] = true;
};


/***/ }),

/***/ 228:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(305);
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};


/***/ }),

/***/ 464:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// false -> Array#indexOf
// true  -> Array#includes
var toIObject = __webpack_require__(221);
var toLength = __webpack_require__(485);
var toAbsoluteIndex = __webpack_require__(157);
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

/***/ 89:
/***/ ((module) => {

var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};


/***/ }),

/***/ 94:
/***/ ((module) => {

var core = module.exports = { version: '2.6.5' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef


/***/ }),

/***/ 52:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// optional / simple context binding
var aFunction = __webpack_require__(387);
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

/***/ 344:
/***/ ((module) => {

// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};


/***/ }),

/***/ 763:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Thank's IE8 for his funny defineProperty
module.exports = !__webpack_require__(448)(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});


/***/ }),

/***/ 34:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(305);
var document = (__webpack_require__(526).document);
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};


/***/ }),

/***/ 140:
/***/ ((module) => {

// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');


/***/ }),

/***/ 127:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var global = __webpack_require__(526);
var core = __webpack_require__(94);
var hide = __webpack_require__(341);
var redefine = __webpack_require__(859);
var ctx = __webpack_require__(52);
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

/***/ 448:
/***/ ((module) => {

module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};


/***/ }),

/***/ 461:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(556)('native-function-to-string', Function.toString);


/***/ }),

/***/ 526:
/***/ ((module) => {

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef


/***/ }),

/***/ 917:
/***/ ((module) => {

var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};


/***/ }),

/***/ 341:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var dP = __webpack_require__(967);
var createDesc = __webpack_require__(996);
module.exports = __webpack_require__(763) ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};


/***/ }),

/***/ 308:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var document = (__webpack_require__(526).document);
module.exports = document && document.documentElement;


/***/ }),

/***/ 956:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = !__webpack_require__(763) && !__webpack_require__(448)(function () {
  return Object.defineProperty(__webpack_require__(34)('div'), 'a', { get: function () { return 7; } }).a != 7;
});


/***/ }),

/***/ 249:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = __webpack_require__(89);
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};


/***/ }),

/***/ 305:
/***/ ((module) => {

module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};


/***/ }),

/***/ 32:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

var create = __webpack_require__(719);
var descriptor = __webpack_require__(996);
var setToStringTag = __webpack_require__(844);
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
__webpack_require__(341)(IteratorPrototype, __webpack_require__(574)('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};


/***/ }),

/***/ 175:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

var LIBRARY = __webpack_require__(750);
var $export = __webpack_require__(127);
var redefine = __webpack_require__(859);
var hide = __webpack_require__(341);
var Iterators = __webpack_require__(906);
var $iterCreate = __webpack_require__(32);
var setToStringTag = __webpack_require__(844);
var getPrototypeOf = __webpack_require__(627);
var ITERATOR = __webpack_require__(574)('iterator');
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

/***/ 970:
/***/ ((module) => {

module.exports = function (done, value) {
  return { value: value, done: !!done };
};


/***/ }),

/***/ 906:
/***/ ((module) => {

module.exports = {};


/***/ }),

/***/ 750:
/***/ ((module) => {

module.exports = false;


/***/ }),

/***/ 719:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = __webpack_require__(228);
var dPs = __webpack_require__(626);
var enumBugKeys = __webpack_require__(140);
var IE_PROTO = __webpack_require__(766)('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = __webpack_require__(34)('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  (__webpack_require__(308).appendChild)(iframe);
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

/***/ 967:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var anObject = __webpack_require__(228);
var IE8_DOM_DEFINE = __webpack_require__(956);
var toPrimitive = __webpack_require__(48);
var dP = Object.defineProperty;

exports.f = __webpack_require__(763) ? Object.defineProperty : function defineProperty(O, P, Attributes) {
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

/***/ 626:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var dP = __webpack_require__(967);
var anObject = __webpack_require__(228);
var getKeys = __webpack_require__(311);

module.exports = __webpack_require__(763) ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};


/***/ }),

/***/ 627:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = __webpack_require__(917);
var toObject = __webpack_require__(270);
var IE_PROTO = __webpack_require__(766)('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};


/***/ }),

/***/ 561:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var has = __webpack_require__(917);
var toIObject = __webpack_require__(221);
var arrayIndexOf = __webpack_require__(464)(false);
var IE_PROTO = __webpack_require__(766)('IE_PROTO');

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

/***/ 311:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = __webpack_require__(561);
var enumBugKeys = __webpack_require__(140);

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};


/***/ }),

/***/ 996:
/***/ ((module) => {

module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};


/***/ }),

/***/ 859:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var global = __webpack_require__(526);
var hide = __webpack_require__(341);
var has = __webpack_require__(917);
var SRC = __webpack_require__(415)('src');
var $toString = __webpack_require__(461);
var TO_STRING = 'toString';
var TPL = ('' + $toString).split(TO_STRING);

(__webpack_require__(94).inspectSource) = function (it) {
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

/***/ 844:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var def = (__webpack_require__(967).f);
var has = __webpack_require__(917);
var TAG = __webpack_require__(574)('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};


/***/ }),

/***/ 766:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var shared = __webpack_require__(556)('keys');
var uid = __webpack_require__(415);
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};


/***/ }),

/***/ 556:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var core = __webpack_require__(94);
var global = __webpack_require__(526);
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: core.version,
  mode: __webpack_require__(750) ? 'pure' : 'global',
  copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
});


/***/ }),

/***/ 157:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var toInteger = __webpack_require__(87);
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};


/***/ }),

/***/ 87:
/***/ ((module) => {

// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};


/***/ }),

/***/ 221:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = __webpack_require__(249);
var defined = __webpack_require__(344);
module.exports = function (it) {
  return IObject(defined(it));
};


/***/ }),

/***/ 485:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 7.1.15 ToLength
var toInteger = __webpack_require__(87);
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};


/***/ }),

/***/ 270:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 7.1.13 ToObject(argument)
var defined = __webpack_require__(344);
module.exports = function (it) {
  return Object(defined(it));
};


/***/ }),

/***/ 48:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = __webpack_require__(305);
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

/***/ 415:
/***/ ((module) => {

var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};


/***/ }),

/***/ 574:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var store = __webpack_require__(556)('wks');
var uid = __webpack_require__(415);
var Symbol = (__webpack_require__(526).Symbol);
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;


/***/ }),

/***/ 165:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

var addToUnscopables = __webpack_require__(184);
var step = __webpack_require__(970);
var Iterators = __webpack_require__(906);
var toIObject = __webpack_require__(221);

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = __webpack_require__(175)(Array, 'Array', function (iterated, kind) {
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

/***/ 890:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

var $iterators = __webpack_require__(165);
var getKeys = __webpack_require__(311);
var redefine = __webpack_require__(859);
var global = __webpack_require__(526);
var hide = __webpack_require__(341);
var Iterators = __webpack_require__(906);
var wks = __webpack_require__(574);
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


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  LPESyntaxError: () => (/* reexport */ LPESyntaxError),
  STDLIB: () => (/* reexport */ STDLIB),
  deparse: () => (/* reexport */ deparse),
  eval_lisp: () => (/* reexport */ eval_lisp),
  eval_lpe: () => (/* binding */ eval_lpe),
  isArray: () => (/* reexport */ isArray),
  isFunction: () => (/* reexport */ isFunction),
  isHash: () => (/* reexport */ isHash),
  isNumber: () => (/* reexport */ isNumber),
  isString: () => (/* reexport */ isString),
  makeSF: () => (/* reexport */ makeSF),
  parse: () => (/* reexport */ parse)
});

// EXTERNAL MODULE: ./node_modules/core-js/modules/web.dom.iterable.js
var web_dom_iterable = __webpack_require__(890);
;// CONCATENATED MODULE: ./src/lisp.js

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



/**
 * @typedef {Object} EvalOptions
 * @property {boolean=} resolveString Would proceed variables to their names
 *                          lpe 'x' -> string 'x' (if x is not defined)
 * @property {any=} streamAdapter Is there any streaming library so lpe can use it
 */

const isArray = arg => Object.prototype.toString.call(arg) === '[object Array]';
const isString = arg => typeof arg === 'string';
const isNumber = arg => typeof arg === 'number';
const isBoolean = arg => arg === true || arg === false;
const isHash = arg => typeof arg === 'object' && arg !== null && !isArray(arg);
const isFunction = arg => typeof arg === 'function';

/**
 * Get or Set variable in context
 * @param {*} ctx - array, hashmap or function that stores variables
 * @param {*} varName - the name of variable
 * @param {*} value - optional value to set (undefined if get)
 * @param {EvalOptions=} resolveOptions - options on how to resolve. resolveString - must be checked by caller and is not handled here...
 */
function $var$(ctx, varName, value, resolveOptions = {}) {
  if (isArray(ctx)) {
    // contexts chain
    for (let theCtx of ctx) {
      const result = $var$(theCtx, varName, value, resolveOptions);
      if (result === undefined) continue; // no such var in context
      if (value === undefined) return result; // get => we've got a result
      return $var$(theCtx, varName, value, resolveOptions); // set => redirect 'set' to context with variable.
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
      const result = ctx[varName];
      //console.log(`$var: for ${varName} got ${isFunction(result)? 'FUNC' : result}`)
      if (result !== undefined) {
        // found value in hash
        return result;
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
  let result = {};
  if (isHash(ast)) {
    for (let varName in ast) {
      result[varName] = EVAL(ast[varName], ctx, rs);
    }
  } else if (isArray(ast) && isString(ast[0])) {
    if (ast[0] === '[') {
      ast = ast.slice(1);
    }
    if (isString(ast[0])) {
      result[ast[0]] = EVAL(ast[1], ctx, rs);
    } else if (isArray(ast[0])) {
      ast.forEach(pair => pair[0] === '[' ? result[pair[1]] = EVAL(pair[2], ctx, rs) : result[pair[0]] = EVAL(pair[1], ctx, rs));
    } else {
      throw new Error('LISP: let expression (1) invalid form in ' + ast);
    }
  } else if (isArray(ast)) {
    ast.forEach(pair => pair[0] === '[' ? result[pair[1]] = EVAL(pair[2], ctx, rs) : result[pair[0]] = EVAL(pair[1], ctx, rs));
  } else if (isFunction(ast)) {
    return ast;
  } else {
    throw new Error('LISP: let expression (2) invalid form in ' + ast);
  }
  return result;
}

// if (condition, then, else)
// if (condition, then, condition2, then2, ..., else)
const ifSF = (ast, ctx, ro) => {
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, ro); // one arg - by convention return the argument
  const condition = EVAL(ast[0], ctx, {
    ...ro,
    resolveString: false
  });
  return unbox([condition], ([condition]) => {
    if (condition) {
      return EVAL(ast[1], ctx, ro);
    } else {
      return ifSF(ast.slice(2), ctx, ro);
    }
  }, error => {}, ro === null || ro === void 0 ? void 0 : ro.streamAdapter);
};
const SPECIAL_FORMS = {
  // built-in special forms
  'let': makeSF((ast, ctx, rs) => EVAL(['begin', ...ast.slice(1)], [makeLetBindings(ast[0], ctx, rs), ctx], rs)),
  '`': makeSF((ast, ctx) => ast[0]),
  // quote
  'macroexpand': makeSF(macroexpand),
  'begin': makeSF((ast, ctx, rs) => ast.reduce((acc, astItem) => EVAL(astItem, ctx, rs), null)),
  'do': makeSF((ast, ctx) => {
    throw new Error('DO not implemented');
  }),
  'if': makeSF(ifSF),
  '~': makeSF((ast, ctx, rs) => {
    // mark as macro
    const f = EVAL(ast[0], ctx, rs); // eval regular function
    f.ast.push(1); // mark as macro
    return f;
  }),
  '.-': makeSF((ast, ctx, rs) => {
    // get or set attribute
    let [obj, propertyName, value] = ast.map(a => EVAL(a, ctx, rs));
    // hack
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
  '.': makeSF((ast, ctx, rs) => {
    // call object method
    const [obj, methodName, ...args] = ast.map(a => EVAL(a, ctx, rs));
    const fn = obj[methodName];
    return fn.apply(obj, args);
  }),
  'try': makeSF((ast, ctx, rs) => {
    // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      const errCtx = env_bind([ast[1][0]], ctx, [e]);
      return EVAL(ast[1][1], errCtx, rs);
    }
  }),
  '||': makeSF((ast, ctx, rs) => ast.some(a => !!EVAL(a, ctx, rs))),
  // logical or
  '&&': makeSF((ast, ctx, rs) => ast.every(a => !!EVAL(a, ctx, rs))),
  // logical and
  'fn': makeSF((ast, ctx, rs) => {
    // define new function (lambda)
    const f = (...args) => EVAL(ast[1], env_bind(ast[0], ctx, args), rs);
    f.ast = [ast[1], ctx, ast[0]]; // f.ast compresses more than f.data
    return f;
  }),
  'def': makeSF((ast, ctx, rs) => {
    // update current environment
    const value = EVAL(ast[1], ctx, rs);
    const result = $var$(ctx, ast[0], value);
    return result;
  }),
  'resolve': makeSF((ast, ctx, rs) => {
    const result = $var$(ctx, ast[0], undefined, rs);
    return result;
  }),
  'eval_lpe': makeSF((ast, ctx, rs) => {
    const lpeCode = eval_lisp(ast[0], ctx, rs);
    const lisp = parse(lpeCode);
    const result = eval_lisp(lisp, ctx);
    return result;
  }),
  'filterit': makeSF((ast, ctx, rs) => {
    //console.log("FILTERIT: " + JSON.stringify(ast))
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.filter.call(array, (it, idx) => !!eval_lisp(conditionAST, [{
      it,
      idx
    }, ctx], rs));
    return result;
  }),
  'mapit': makeSF((ast, ctx, rs) => {
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.map.call(array, (it, idx) => eval_lisp(conditionAST, [{
      it,
      idx
    }, ctx], rs));
    return result;
  }),
  'get_in': makeSF((ast, ctx, rs) => {
    let array = [];
    let hashname;
    //console.log(JSON.stringify(ast))
    if (isArray(ast[0])) {
      hashname = eval_lisp(ast[0], ctx, rs);
    } else {
      hashname = ast[0];
    }
    if (isArray(ast[1]) && ast[1][0] === '[') {
      // массив аргументов, ка в классическом get_in в Clojure
      array = eval_lisp(ast[1], ctx, rs);
    } else {
      // просто список ключей в виде аргументов
      [, ...array] = ast;
      const a = ["["].concat(array);
      array = eval_lisp(a, ctx, rs);
    }

    // но вообще-то вот так ещё круче ["->","a",3,1]
    // const m = ["->"].concat( array.slice(1).reduce((a, b) => {a.push([".-",b]); return a}, [[".-", ast[0], array[0]]]) );
    const m = ["->", hashname].concat(array);
    //console.log('get_in', JSON.stringify(m))
    return eval_lisp(m, ctx, rs);
  }),
  'assoc_in': makeSF((ast, ctx, rs) => {
    const array = eval_lisp(ast[1], ctx, {
      ...rs,
      wantCallable: false
    });
    // удивительно, но работает set(a . 3 , 2, "Hoy")
    //const m = ["->", ast[0]].concat( array.slice(0,-1) );
    //const e = ["set", m, array.pop(), ast[2]]
    // первый аргумент в ast - ссылка на контекст/имя переменной
    //console.log('assoc_in var:', JSON.stringify(ast))
    // let focus = $var$(ctx, ast[0], undefined, {...rs, wantCallable: false});
    let focus = EVAL(ast[0], ctx, {
      ...rs,
      wantCallable: false
    });
    for (var i = 0; i < array.length - 1; i++) {
      if (focus[array[i]] === undefined) {
        // нужно создать
        if (isString(array[i + 1])) {
          focus = focus[array[i]] = {};
        } else {
          focus = focus[array[i]] = [];
        }
      } else {
        focus = focus[array[i]];
      }
    }
    const e = ["set", focus, array.pop(), ast[2]];
    //console.log(JSON.stringify(e), JSON.stringify(eval_lisp(e, ctx, rs)))
    return eval_lisp(e, ctx, rs);
  }),
  'cp': makeSF((ast, ctx, rs) => {
    const from = EVAL(ast[0], ctx, {
      ...rs,
      wantCallable: false
    });
    const to = EVAL(ast[1], ctx, {
      ...rs,
      wantCallable: false
    });
    //console.log(`CP ${JSON.stringify(from)} to `, JSON.stringify(to))
    const lpe = ["assoc_in", to[0], ["["].concat(to.slice(1)), ["get_in", from[0], ["["].concat(from.slice(1))]];
    //console.log('CP', JSON.stringify(ast))
    return EVAL(lpe, ctx, rs);
  }),
  'ctx': makeSF((ast, ctx, rs) => {
    //FIXME will work only for single keys, we want: ctx(k1,k2,k3.df)
    let ret = {};
    ast.map(k => ret[k] = $var$(ctx, k, undefined, rs));
    return ret;
  })
};
const STDLIB = {
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
  'Hashmap': {},
  'Date': Date,
  'console': console,
  'JSON': JSON,
  // special forms
  ...SPECIAL_FORMS,
  // built-in functions
  '=': (...args) => args.every(v => v == args[0]),
  '+': (...args) => args.reduce((a, b) => a + b),
  '-': (...args) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
  '*': (...args) => args.reduce((a, b) => a * b),
  '/': (...args) => args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b),
  '<': (...args) => args.every((v, i) => i === 0 ? true : args[i - 1] < args[i]),
  '>': (...args) => args.every((v, i) => i === 0 ? true : args[i - 1] > args[i]),
  '<=': (...args) => args.every((v, i) => i === 0 ? true : args[i - 1] <= args[i]),
  '>=': (...args) => args.every((v, i) => i === 0 ? true : args[i - 1] >= args[i]),
  '!=': (...args) => !args.every(v => v == args[0]),
  //  "'": a => `'${a}'`,
  '[': (...args) => args,
  'RegExp': (...args) => RegExp.apply(RegExp, args),
  'count': a => a.length,
  'del': (a, b) => delete a[b],
  // 'del': (a, b) => Reflect.deleteProperty(a, b),
  'isa': (a, b) => a instanceof b,
  'type': a => typeof a,
  'new': (...args) => new (args[0].bind.apply(args[0], args))(),
  'not': a => !a,
  'list': (...args) => args,
  'vector': (...args) => args,
  'map': makeSF((ast, ctx, rs) => {
    let arr = eval_lisp(ast[0], ctx, {
      ...rs,
      wantCallable: false
    });
    rs.wantCallable = true;
    let fn = eval_lisp(ast[1], ctx, {
      ...rs,
      wantCallable: true
    });
    return isArray(arr) ? arr.map(it => fn(it)) : [];
  }),
  'filter': (arr, fn) => isArray(arr) ? arr.filter(it => fn(it)) : [],
  'throw': a => {
    throw a;
  },
  'identity': a => a,
  'pluck': (c, k) => c.map(el => el[k]),
  // for each array element, get property value, present result as array.
  'read-string': a => JSON.parse(a),
  'rep': a => JSON.stringify(EVAL(JSON.parse(a), STDLIB)),
  // TODO: fix ctx and rs arguments
  'null?': a => a === null || a === undefined,
  // ??? add [] ???
  'true?': a => a === true,
  'false?': a => a === false,
  'string?': isString,
  'list?': isArray,
  'contains?': (a, b) => a.hasOwnProperty(b),
  'str': (...args) => args.map(x => isString(x) ? x : isFunction(x) ? x.lpeName : JSON.stringify(x)).join(''),
  'get': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'nth': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'set': (a, b, c) => (a[b] = c, a),
  'keys': a => Object.keys(a),
  'vals': a => Object.values(a),
  'rest': a => a.slice(1),
  'split': makeSF((ast, ctx, rs) => {
    let str = eval_lisp(ast[0], ctx, {
      ...rs,
      wantCallable: false
    });
    let sep = eval_lisp(ast[1], ctx, {
      ...rs,
      wantCallable: false
    });
    return str.split(sep);
  }),
  'println': (...args) => console.log(args.map(x => isString(x) ? x : JSON.stringify(x)).join(' ')),
  'empty?': a => isArray(a) ? a.length === 0 : false,
  'cons': (a, b) => [].concat([a], b),
  'prn': (...args) => console.log(args.map(x => JSON.stringify(x)).join(' ')),
  'slice': (a, b, ...end) => isArray(a) ? a.slice(b, end.length > 0 ? end[0] : a.length) : [],
  'first': a => a.length > 0 ? a[0] : null,
  'last': a => a[a.length - 1],
  'sort': a => isArray(a) ? a.sort() : [],
  // https://stackoverflow.com/questions/1669190/find-the-min-max-element-of-an-array-in-javascript
  // only for numbers!
  'max': a => isArray(a) ? a.reduce(function (p, v) {
    return p > v ? p : v;
  }) : [],
  'min': a => isArray(a) ? a.reduce(function (p, v) {
    return p < v ? p : v;
  }) : [],
  'apply': (f, ...b) => f.apply(f, b),
  'concat': (...a) => [].concat.apply([], a),
  'pr_str': (...a) => a.map(x => JSON.stringify(x)).join(' '),
  'classOf': a => Object.prototype.toString.call(a),
  'join': (a, sep) => isArray(a) ? Array.prototype.join.call(a, sep) : '',
  'rand': () => Math.random(),
  // operator from APL language
  '⍴': (len, ...values) => Array.apply(null, Array(len)).map((a, idx) => values[idx % values.length]),
  re_match: (t, r, o) => t.match(new RegExp(r, o)),
  // not implemented yet
  // 'hash-table->alist'
  '"': makeSF((ast, ctx, rs) => String(ast[0])),
  '\'': makeSF((ast, ctx, rs) => String(ast[0])),
  // macros
  // '()': makeMacro((...args) => ['begin', ...args]), from 2022 It is just grouping of expressions
  '()': makeMacro(args => args),
  '->': makeMacro((acc, ...ast) => {
    // thread first macro
    // императивная лапша для макроса ->
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    // AST[["filterit",[">",1,0]]]
    //console.log("---------> " +JSON.stringify(acc) + " " + JSON.stringify(ast));

    for (let arr of ast) {
      if (!isArray(arr)) {
        arr = [".-", acc, arr]; // это может быть обращение к хэшу или массиву через индекс или ключ....
      } else if (arr[0] === "()" && arr.length === 2 && (isString(arr[1]) || isNumber(arr[1]))) {
        arr = [".-", acc, arr[1]];
      } else {
        arr = arr.slice(0); // must copy array before modify
        arr.splice(1, 0, acc);
        //console.log("AST !!!!" + JSON.stringify(arr))
        // AST[["filterit",[">",1,0]]]
        // AST !!!!["filterit","locations",[">",1,0]]
        // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }
      acc = arr;
    }
    //console.log("AST !!!!" + JSON.stringify(acc))
    if (!isArray(acc)) {
      return ["resolve", acc];
    }
    return acc;
  }),
  '->>': makeMacro((acc, ...ast) => {
    // thread last macro
    // императивная лапша для макроса ->>
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    for (let arr of ast) {
      arr.push(acc);
      acc = arr;
    }
    return acc;
  }),
  'invoke': makeMacro((...ast) => {
    /// мы не можем использовать точку в LPE для вызова метода объекта, так как она уже замаплена на ->
    /// поэтому для фанатов ООП пришлось добавить макрос invoke - вызов метода по его текстовому названию.
    /// invoke хорошо стыкуется с ->
    ast.splice(0, 0, ".");
    return ast;
  }),
  'and': makeMacro((...ast) => {
    if (ast.length === 0) return true;
    if (ast.length === 1) return ast[0];
    return ["let", ["__and", ast[0]], ["if", "__and", ["and"].concat(ast.slice(1)), "__and"]];
  }),
  'or': makeMacro((...ast) => {
    if (ast.length === 0) return false;
    if (ast.length === 1) return ast[0];
    return ["let", ["__or", ast[0]], ["if", "__or", "__or", ["or"].concat(ast.slice(1))]];
  }),
  // system functions & objects
  // 'js': eval,

  eval: a => EVAL(a, STDLIB)
};
for (const [key, val] of Object.entries(STDLIB)) {
  if (isFunction(val)) {
    val.lpeName = key;
  }
}
function macroexpand(ast, ctx, resolveString = true) {
  //console.log("MACROEXPAND: " + JSON.stringify(ast))
  while (true) {
    if (!isArray(ast)) break;
    if (!isString(ast[0])) break;
    //const v = $var$(ctx, ast[0]);
    const v = $var$(ctx, ast[0], undefined, {
      "resolveString": resolveString
    }); //возможно надо так
    if (!isFunction(v)) break;
    if (!isMacro(v)) break;
    ast = v.apply(v, ast.slice(1)); // Это макрос! 3-й элемент макроса установлен в 1 через push
  }
  //console.log("MACROEXPAND RETURN: " + JSON.stringify(ast))

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
  let newCtx = {};
  for (let i = 0; i < ast.length; i++) {
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

/**
 * Unwrap values if they are promise or stream
 * @param {any[]} args
 * @param {(arg: any[]) => any} resolve callback to run when all ready
 * @param {any} reject
 * @param {any?} streamAdapter
 */
function unbox(args, resolve, reject, streamAdapter) {
  const hasPromise = args.find(a => a instanceof Promise);
  const hasStreams = !!args.find(a => streamAdapter === null || streamAdapter === void 0 ? void 0 : streamAdapter.isStream(a));
  if (hasStreams) {
    // TODO: add loading state
    const evaluatedArgs = args.map(a => streamAdapter.isStream(a) ? streamAdapter.getLastValue(a) : a);
    const firstValue = resolve(evaluatedArgs);
    const subscriptions = [];
    const outputStream = streamAdapter.createStream(firstValue, () => {
      // onDispose handler - dispose all dependencies
      subscriptions.forEach(subscription => {
        var _subscription$dispose;
        return subscription === null || subscription === void 0 || (_subscription$dispose = subscription.dispose) === null || _subscription$dispose === void 0 ? void 0 : _subscription$dispose.call(subscription);
      }); // unsubscribe all subscriptions
      args.filter(a => streamAdapter === null || streamAdapter === void 0 ? void 0 : streamAdapter.isStream(a)).forEach(streamAdapter.disposeStream); // and free services
    });
    args.forEach((a, idx) => {
      if (streamAdapter.isStream(a)) {
        subscriptions.push(
        // save subscription in order to dispose later
        streamAdapter.subscribe(a, value => {
          evaluatedArgs[idx] = value;
          const nextValue = resolve(evaluatedArgs);
          streamAdapter.next(outputStream, nextValue);
        }));
      }
    });
    return outputStream;
  } else if (hasPromise) {
    // TODO: handle both streams and promises
    return Promise.all(args).then(resolve).catch(reject);
  } else {
    try {
      return resolve(args);
    } catch (err) {
      reject(err);
    }
  }
}

/**
 *
 * @param ast
 * @param ctx
 * @param {EvalOptions=} options
 * @returns {Promise<Awaited<unknown>[] | void>|*|null|undefined}
 */
function EVAL(ast, ctx, options) {
  //console.log(`EVAL CALLED FOR ${JSON.stringify(ast)}`)
  while (true) {
    ast = macroexpand(ast, ctx, (options === null || options === void 0 ? void 0 : options.resolveString) ?? false); // by default do not resolve string

    if (!isArray(ast)) {
      // atom
      if (isString(ast)) {
        const value = $var$(ctx, ast, undefined, options);
        //console.log(`${JSON.stringify(resolveOptions)} var ${ast} resolved to ${isFunction(value)?'FUNCTION':''} ${JSON.stringify(value)}`)
        if (value !== undefined) {
          if (isFunction(value) && options["wantCallable"] !== true) {
            return ast;
          } else {
            // variable
            //console.log(`EVAL RETURN resolved var ${JSON.stringify(ast)}`)
            return value;
          }
        }
        //console.log(`EVAL RETURN resolved2 var ${resolveOptions && resolveOptions.resolveString ? ast : undefined}`)
        return options && options.resolveString ? ast : undefined; // if string and not in ctx
      }
      //console.log(`EVAL RETURN resolved3 var ${JSON.stringify(ast)}`)
      return ast;
    }

    //console.log(`EVAL CONTINUE for ${JSON.stringify(ast)}`)

    // apply
    // c 2022 делаем macroexpand сначала, а не после
    // ast = macroexpand(ast, ctx, resolveOptions && resolveOptions.resolveString ? true: false);

    //console.log(`EVAL CONTINUE after macroexpand: ${JSON.stringify(ast)}`)
    if (!Array.isArray(ast)) return ast; // TODO: do we need eval here?
    if (ast.length === 0) return null; // TODO: [] => empty list (or, maybe return vector [])

    //console.log("EVAL1: ", JSON.stringify(resolveOptions),  JSON.stringify(ast))
    const [opAst, ...argsAst] = ast;
    const op = EVAL(opAst, ctx, {
      ...options,
      wantCallable: true
    }); // evaluate operator

    if (typeof op !== 'function') {
      throw new Error('Error: ' + String(op) + ' is not a function');
    }
    if (isSF(op)) {
      // special form
      const sfResult = op(argsAst, ctx, options);
      return sfResult;
    }
    const args = argsAst.map(a => EVAL(a, ctx, options)); // evaluate arguments

    if (op.ast) {
      // Macro
      ast = op.ast[0];
      ctx = env_bind(op.ast[2], op.ast[1], args); // TCO
    } else {
      return unbox(args, args => {
        const fnResult = op.apply(op, args);
        return fnResult;
      }, error => {
        // ??
      }, options === null || options === void 0 ? void 0 : options.streamAdapter);
    }
  }
} // EVAL

function eval_lisp(ast, ctx, options) {
  const result = EVAL(ast, [ctx || {}, STDLIB], options || {
    resolveString: true
  });
  return result;
}

// Use with care
function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: ast => eval_lisp(ast, ctx),
    val: (varName, value) => $var$(ctx, varName, value)
  };
}

// deprecated
function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}
;// CONCATENATED MODULE: ./src/lpel.js
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

const isDigit = c => c >= '0' && c <= '9';
//const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
// https://stackoverflow.com/questions/9862761/how-to-check-if-character-is-a-letter-in-javascript
//const isLetter = (c) => RegExp(/^\p{L}$/,'u').test(c);
const isLetter = c => c.toLowerCase() != c.toUpperCase();

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
  const errorDescription = JSON.stringify(t, ['name', 'message', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'], 4);
  throw new LPESyntaxError(errorDescription);
}
function tokenize(s, prefix = '<>+-&', suffix = '=>&:') {
  if (s.startsWith('lpe:')) s = s.substr(4);
  if (s.startsWith('⚡')) s = s.substr(1);
  let c; // The current character.
  let from; // The index of the start of the token.
  let i = 0; // The index of the current character.
  let length = s.length;
  let n; // The number value.
  let q; // The quote character.
  let str; // The string value.
  let result = []; // An array to hold the results.
  const make = (type, value) => ({
    type,
    value,
    from,
    to: i
  }); // Make a token object.

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
}
/* harmony default export */ const lpel = ((/* unused pure expression or super */ null && (tokenize)));
;// CONCATENATED MODULE: ./src/lpep.js
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
// http://crockford.com/javascript/tdop/tdop.html
// Douglas Crockford
// 2010-06-26
//////////////////////////////////////////////////
// Later hacked to parse LPE instead of JavaScript
// Dmitry Dorofeev
// 2017-01-20

/*

lbp = left binding power
rbp = right binding power
nud = null denotation
led = left denotation
std = statement denotation
*/



var make_parse = function () {
  var m_symbol_table = {};
  var m_token;
  var m_tokens;
  var m_token_nr;

  // стэк для типов выражений
  var m_expr_scope = {
    pop: function () {}
  }; // для разбора логических выражений типа (A and B or C)

  // для хранения алиасов для операций
  var m_operator_aliases = {};
  var operator_alias = function (from, to) {
    m_operator_aliases[from] = to;
  };
  var itself = function () {
    return this;
  };
  let scope = {
    find: function (n) {
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
    pop: function () {
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "logical"
  };
  var expr_lpe_scope = {
    pop: function () {
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "lpe"
  };
  var new_expression_scope = function (tp) {
    var s = m_expr_scope;
    m_expr_scope = Object.create(tp === "logical" ? expr_logical_scope : expr_lpe_scope);
    m_expr_scope.parent = s;
    return m_expr_scope;
  };
  var advance = function (id) {
    var a, o, t, v;
    if (id && m_token.id !== id) {
      makeError(m_token, "Got " + m_token.value + " but expected '" + id + "'.");
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
          //a = "operator";
          o = m_symbol_table[v];
          //console.log("OPERATOR>", v , " ", JSON.stringify(o))
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
      o = m_symbol_table[v];
      if (!o) {
        makeError(t, "Unknown operator.");
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
      makeError(t, "Unexpected token.");
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
  var statement = function () {
    var n = m_token,
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
  var statements = function () {
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
      s = statement();
      //console.log("STATEMENT ", s);
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
  var expression = function (rbp) {
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
    nud: function () {
      makeError(this, "Undefined.");
    },
    led: function (left) {
      makeError(this, "Missing operator.");
    }
  };
  var symbol = function (id, bp) {
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
  var infix = function (id, bp, led) {
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

  // infix operators are left associative.
  // We can also make right associative operators, such as short-circuiting logical operators,
  // by reducing the right binding power.
  var infixr = function (id, bp, led) {
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
  var prefix = function (id, nud) {
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
  var stmt = function (s, f) {
    var x = symbol(s);
    x.std = f;
    return x;
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
  };

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

  // [esix]: commented as in conflict with SQL operator ':'
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
      makeError(this.second, "Invalid ternary operator.");
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

  /* will be used in logical scope, allow (a or and(b,c,ss)) */
  infixr("and", 30).nud = function () {
    return this;
  };
  /* allow (a and or(b,c,ss)) */
  infixr("or", 30).nud = function () {
    return this;
  };

  // required for SQL logical scope where a in (1,2,3)
  infixr("in", 30);
  infixr("is", 30);

  // for SQL types: '10'::BIGINT
  infixr("::", 90);

  // for SQL as
  infixr(":", 80);
  infix(":=", 30);
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
    //console.log("FUNC>", left.value)
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
    if (m_token.id !== ")") {
      if (false) { var e; } else {
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
            //console.log("LOGICAL????? " + JSON.stringify(e));
            m_expr_scope.pop();
            // var e = statements();
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
    } else
      /*if (node.value === "(") {
      console.log("() DETECTED" + JSON.stringify(node))
      //if (node.first.value === "->"){
      // если у нас в скобки взято выражение "->", то скобки можно удалить
      // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны,
      // так как seq уже группирует вызовы в цепочку
      // DIMA 2022 на самом деле нет для
      // if(a=b).(yes().yes()).(no().no3())
      // получаем
      // ["->",["if",["=","a","b"]],["yes"],["yes"],["no"],["no3"]]
      // что выглядит странно со вснх сторон
      //  return [["->"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      //} else {
      return lift_funseq(node.first);
      //}
      } else */
      {
        //console.log("?? DETECTED" + JSON.stringify(node))
        return [node.sexpr];
      }
  }
  function lift_funseq_2(node) {
    if (node.value === "->>") {
      return lift_funseq(node.first).concat(lift_funseq(node.second));
    } else
      /*if (node.value === "()") {
      //if (node.first.value === "->>"){
      // если у нас в скобки взято выражение "->", то скобки можно удалить
      // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны,
      // так как seq уже группирует вызовы в цепочку
      //  return [["->>"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      //} else {
      return lift_funseq(node.first);
      //}
      } else */
      {
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

  // allow func().not(a)   а также f(a is not null)
  var n = prefix("not", function () {
    // it is nud function
    var expr = expression(70);
    //console.log("AHTUNG expr is " + JSON.stringify(expr))
    if (isArray(expr.sexpr) && expr.sexpr[0] === '()') {
      /* выражение not() выдаёт вот такое:
        {
          from: 0,
          to: 3,
          value: 'not',
          arity: 'unary',
          sexpr: [ 'not', [ '()' ] ],
          first: {from: 3,to: 4,value: '(',arity: 'binary',sexpr: [ '()' ],
                  first: { from: 3, to: 4, value: '()', arity: 'name', sexpr: ['()'] }
          }
        }
        not(1) даёт такое, a not(1,2) нельзя написать = ошибка !!!
          {
            from: 0,
            to: 3,
            value: 'not',
            arity: 'unary',
            sexpr: [ 'not', [ '()', 1 ] ],
            first: { from: 4, to: 5, value: 1, arity: 'literal', sexpr: [ '()', 1 ] }
          }
        надо его преобразовать в
          {
            from: 1,
            to: 2,
            value: '(',
            arity: 'binary',
            sexpr: [ 'f' ],
            first: { from: 0, to: 1, value: 'f', arity: 'name', sexpr: 'f' },
            second: []
          }
        или с параметром (одним!)
          {
            from: 1,
            to: 2,
            value: '(',
            arity: 'binary',
            sexpr: [ 'f', 1 ],
            first: { from: 0, to: 1, value: 'f', arity: 'name', sexpr: 'f' },
            second: [ { from: 2, to: 3, value: 1, arity: 'literal', sexpr: 1 } ]
          }
      */
      this.arity = 'name';
      this.value = 'not';
      this.sexpr = 'not';
      var e = {
        from: 0,
        to: 2,
        value: '(',
        arity: 'binary',
        sexpr: ['not'],
        first: this
      };
      if (expr.sexpr.length > 1) {
        e.second = [{
          from: 4,
          to: 5,
          value: expr.sexpr[1],
          arity: 'literal',
          sexpr: expr.sexpr[1]
        }];
        e.sexpr.push(expr.sexpr); // keep () in the parsed AST
        //e.sexpr = e.sexpr.concat(expr.sexpr) // keep () in the parsed AST
      }
      return e;
    }

    // simple operator `not expr`
    this.first = expr;
    this.arity = "unary";
    this.sexpr = [this.sexpr, expr.sexpr];
    //console.log("2NOT nud:" + JSON.stringify(this))
    return this;
  });
  n.led = function (left) {
    //console.log("NOT led left:" + JSON.stringify(left))
    return this;
  }; // will be used in logical scope

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
    var e;
    if (m_token.value === ')') {
      // если это просто () две скобки, то возвращаем сразу кусок AST,генерим функцию с именем "()"
      // {"from":3,"to":4,"value":"(","arity":"operator","sexpr":"("}
      this.arity = "binary";
      this.sexpr = ["()"];
      this.first = {
        from: this.from,
        to: this.to + 1,
        value: '()',
        arity: 'name',
        sexpr: ['()']
      };
      advance(")");
      return this;
    }
    e = expression(0);
    //console.log('(), got e' + JSON.stringify(e))
    if (m_expr_scope.tp == "logical") {
      // we should remember all brackets to restore original user expression
      e.value = "("; // FIXME: why not make it '()' ?? and looks like function `()` call ?
      e.sexpr = ["()", e.sexpr];
    } else {
      if (e.value === "->") {
        // в скобки взято выражение из цепочки LPE вызовов, нужно запомнить скобки, делаем push "()" в текущий AST
        e = {
          first: e,
          value: "(",
          arity: "binary",
          sexpr: ["()", e.sexpr]
        };
      }
    }
    advance(")");
    //console.log('(), return e' + JSON.stringify(e))
    return e;
  });
  prefix("[", function () {
    var a = [];
    if (m_token.id !== "]") {
      while (true) {
        a.push(expression(0));
        // a.push(statements());
        if (m_token.id !== ",") {
          break;
        }
        advance(",");
      }
    }
    advance("]");
    this.first = a;
    this.arity = "unary";
    this.sexpr = ["["].concat(a.map(el => el.sexpr));
    return this;
  });
  return function (source) {
    m_tokens = tokenize(source, '=<>!+-*&|/%^:.', '=<>&|:.');
    m_token_nr = 0;
    new_expression_scope("logical");
    advance();
    var s = statements();
    // var s = expression(0);
    advance("(end)");
    return s;
  };
};
const parser = make_parse();
function parse(str) {
  try {
    const parseResult = parser(str); // from, to, value, arity, sexpr
    return parseResult.sexpr;
  } catch (err) {
    console.error("Error", err.message);
    console.error("Error", err.stack);
    throw err;
  }
}

;// CONCATENATED MODULE: ./src/lped.js
const lped_isArray = arg => Object.prototype.toString.call(arg) === '[object Array]';
const lped_isString = arg => typeof arg === 'string';
const lped_isNumber = arg => typeof arg === 'number';
const lped_isBoolean = arg => arg === true || arg === false;
const lped_isHash = arg => typeof arg === 'object' && arg !== null && !lped_isArray(arg);
const lped_isFunction = arg => typeof arg === 'function';
const OPERATORS = {
  '+': true,
  '-': true,
  '*': true,
  '/': true,
  '=': true,
  'and': '&&',
  'or': '||'
};
const PRIORITY = {
  '=': 40,
  '*': 20,
  '+': 10,
  '-': 10,
  '||': 5
};
const safeReplace = {
  '\n': '\\n',
  '\r': '\\r',
  '\"': '\\"',
  '\'': '\\\'',
  '\\': '\\\\'
};
function fixString(s) {
  return s.split('').map(char => char in safeReplace ? safeReplace[char] : char).join('');
}
function deparseWithOptionalBrackets(sexpr, op) {
  const res = deparse(sexpr);
  if (lped_isArray(sexpr) && sexpr.length && OPERATORS[sexpr[0]]) {
    if (op === sexpr[0]) {
      return res;
    }
    const priority1 = PRIORITY[op];
    const priority2 = PRIORITY[sexpr[0]];
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
  const op = sexpr[0];
  const args = sexpr.slice(1);
  if (op === '"') return '"' + fixString(args[0]) + '"';
  if (op === '\'') return '\'' + fixString(args[0]) + '\'';
  if (op === '[') return '[' + args.map(deparse).join(', ') + ']';
  if (op === '()') return '(' + args.map(deparse).join(', ') + ')';
  if (op === '->') return args.map(deparse).join('.');
  if ((op === '-' || op === '+') && args.length === 1) {
    if (lped_isNumber(args[0]) || lped_isString(args[0])) return op + String(args[0]);else return op + deparseWithOptionalBrackets(args[0], op);
  }
  if (OPERATORS[op] === true) {
    return args.map(arg => deparseWithOptionalBrackets(arg, op)).join(' ' + op + ' ');
  }
  if (lped_isString(OPERATORS[op])) {
    return args.map(arg => deparseWithOptionalBrackets(arg, OPERATORS[op])).join(' ' + OPERATORS[op] + ' ');
  }
  if (op === 'begin') return args.map(deparse).join('; ');
  return op + '(' + sexpr.slice(1).map(deparse).join(', ') + ')';
}
function deparse(lispExpr) {
  if (lped_isString(lispExpr)) {
    return lispExpr;
  } else if (lped_isNumber(lispExpr)) {
    return lispExpr.toString();
  } else if (lped_isBoolean(lispExpr)) {
    return lispExpr.toString();
  } else if (lped_isArray(lispExpr) && lispExpr.length === 0) {
    return '[]';
  } else if (lispExpr === null) {
    return 'null';
  } else if (lped_isArray(lispExpr)) {
    return deparseSexpr(lispExpr);
  } else {
    return String(lispExpr);
  }
}
;// CONCATENATED MODULE: ./src/index.js



function eval_lpe(lpe, ctx, options) {
  const ast = parse(lpe);
  return eval_lisp(ast, ctx, options);
}


// test:
// var ast = parse('2+2*2');
// console.log(ast);
// var res = eval_lisp(ast, []);
// console.log(res);
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=lpe.js.map