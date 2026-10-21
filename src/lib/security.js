// The evaluator accepts LPE ASTs, data, and explicitly supplied host callbacks.
// JavaScript reflection and code generation are not part of that language.
// Capture intrinsics: do not dispatch through a user-controlled .apply/.call.
const reflectApply = Reflect.apply;
const reflectConstruct = Reflect.construct;
const ownDescriptor = Object.getOwnPropertyDescriptor;
const ownKeys = Object.keys;
const defineProperty = Object.defineProperty;
const getPrototypeOf = Object.getPrototypeOf;
const functionSource = Function.prototype.toString;
const objectTag = Object.prototype.toString;
const forbiddenKeys = new Set([
  'constructor', 'prototype', '__proto__', 'caller', 'callee', 'arguments',
  '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
]);
const functionDataKeys = new Set(['name', 'length', 'lpeName']);
const nativeFunctions = new WeakSet();
const checkedFunctions = new WeakSet();
const nativeChecks = new WeakMap();
const protectedObjects = new WeakSet();
const intrinsicPrototypes = new WeakSet();
const staticMembers = new WeakMap();
const methodPrototypes = new WeakSet();
const callbackArguments = new WeakMap();
const guardedPromises = new WeakMap();
const promiseThen = Promise.prototype.then;

export function securityError(message) {
  const error = new Error(`LPE security: ${message}`);
  error.name = 'LPESecurityError';
  error.code = 'LPE_SECURITY';
  return error;
}

export function safeKey(key) {
  // Coercing an object to a key can run code and change between check and use.
  if (typeof key !== 'string' && typeof key !== 'number') {
    throw securityError('Property keys must be strings or numbers');
  }
  key = String(key);
  if (forbiddenKeys.has(key)) throw securityError(`Forbidden property: ${key}`);
  return key;
}

function allowNativeMembers(object, names) {
  const allowed = new Set();
  for (const name of names) {
    if (forbiddenKeys.has(name)) continue;
    const descriptor = ownDescriptor(object, name);
    if (descriptor && 'value' in descriptor) {
      if (typeof descriptor.value === 'function') nativeFunctions.add(descriptor.value);
      allowed.add(name);
    }
  }
  staticMembers.set(object, allowed);
}

// This list deliberately excludes Function, eval, Reflect, Proxy, and Object
// reflection/mutation helpers. Unknown native/bound functions fail closed,
// including constructors obtained from a different JavaScript realm.
for (const constructor of [Array, Object, Date, String, Number, Boolean, RegExp]) {
  nativeFunctions.add(constructor);
  protectedObjects.add(constructor);
  protectedObjects.add(constructor.prototype);
  intrinsicPrototypes.add(constructor.prototype);
}
for (const prototype of [Array.prototype, String.prototype, Number.prototype,
  Boolean.prototype, Date.prototype, RegExp.prototype, Promise.prototype]) {
  methodPrototypes.add(prototype);
  protectedObjects.add(prototype);
  intrinsicPrototypes.add(prototype);
  allowNativeMembers(prototype, Object.getOwnPropertyNames(prototype));
}
for (const name of ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'propertyIsEnumerable']) {
  nativeFunctions.add(Object.prototype[name]);
}
allowNativeMembers(Object, ['keys', 'values', 'entries', 'fromEntries', 'hasOwn', 'is']);
allowNativeMembers(Array, ['isArray', 'from', 'of']);
allowNativeMembers(Date, ['now', 'parse', 'UTC']);
allowNativeMembers(String, ['fromCharCode', 'fromCodePoint', 'raw']);
allowNativeMembers(Number, ['isFinite', 'isInteger', 'isNaN', 'isSafeInteger', 'parseFloat', 'parseInt']);
for (const object of [Math, JSON]) {
  protectedObjects.add(object);
  allowNativeMembers(object, Object.getOwnPropertyNames(object));
}
if (typeof console !== 'undefined') {
  protectedObjects.add(console);
  allowNativeMembers(console, ['log', 'info', 'warn', 'error', 'debug']);
}
protectedObjects.add(Function.prototype);

for (const name of ['map', 'flatMap', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex',
  'every', 'some', 'forEach', 'reduce', 'reduceRight', 'sort', 'toSorted']) {
  if (typeof Array.prototype[name] === 'function') callbackArguments.set(Array.prototype[name], [0]);
}
for (const [fn, positions] of [
  [Array.from, [1]], [String.prototype.replace, [1]], [String.prototype.replaceAll, [1]],
  [JSON.parse, [1]], [JSON.stringify, [1]],
  [Promise.prototype.then, [0, 1]], [Promise.prototype.catch, [0]], [Promise.prototype.finally, [0]],
]) {
  if (typeof fn === 'function') callbackArguments.set(fn, positions);
}

export function isNativeFunction(fn) {
  if (!nativeChecks.has(fn)) {
    nativeChecks.set(fn, /^\s*function\b[^{]*\{\s*\[native code\]\s*\}\s*$/.test(reflectApply(functionSource, fn, [])));
  }
  return nativeChecks.get(fn);
}

export function safeFunction(fn) {
  if (typeof fn !== 'function') throw new TypeError('LPE callable must be a function');
  if (!nativeFunctions.has(fn) && !checkedFunctions.has(fn)) {
    if (isNativeFunction(fn)) {
      throw securityError('Native reflection, code generation, and opaque bound functions are forbidden');
    }
    checkedFunctions.add(fn);
  }
  return fn;
}

function checkValue(value) {
  if (typeof value === 'function') safeFunction(value);
  if (value === globalThis || value === Reflect || intrinsicPrototypes.has(value) || value === Function.prototype ||
      (value && typeof value === 'object' && protectedObjects.has(value) && !staticMembers.has(value))) {
    throw securityError('Host globals and intrinsic prototypes are forbidden');
  }
}

export function safeValue(value) {
  checkValue(value);
  const localPromise = value instanceof Promise;
  if (localPromise || (value && typeof value === 'object' && reflectApply(objectTag, value, []) === '[object Promise]')) {
    if (guardedPromises.has(value)) return guardedPromises.get(value);
    // Promise.prototype.then brand-checks the receiver. Normalize foreign
    // promises so unbox also recognizes them, without calling an own .then.
    const input = localPromise ? value : new Promise((resolve, reject) => {
      reflectApply(promiseThen, value, [resolve, reject]);
    });
    const guarded = reflectApply(promiseThen, input, [safeValue]);
    guardedPromises.set(value, guarded);
    guardedPromises.set(guarded, guarded);
    return guarded;
  }
  return value;
}

export function safeApply(fn, args, receiver) {
  safeFunction(fn);
  args = args.map(safeValue);
  // These native helpers otherwise bypass guarded property reads, e.g. by
  // extracting a special form's private callback or invoking an accessor.
  if (fn === Object.keys) return safeEntries(args[0]).map(([key]) => key);
  if (fn === Object.values) return safeEntries(args[0]).map(([, value]) => value);
  if (fn === Object.entries) return safeEntries(args[0]);
  if (fn === Object.fromEntries) return safeFromEntries(args[0]);
  if (fn === Object.hasOwn) return memberDescriptor(args[0], safeKey(args[1])) !== undefined;
  const positions = callbackArguments.get(fn);
  if (positions) {
    args = args.slice();
    for (const index of positions) {
      const callback = args[index];
      if (typeof callback === 'function') {
        args[index] = function (...values) { return safeApply(callback, values, this); };
      }
    }
  }
  return safeValue(reflectApply(fn, receiver, args));
}

export function safeConstruct(fn, args) {
  safeFunction(fn);
  args = args.map(safeValue);
  return safeValue(reflectConstruct(fn, args));
}

function memberDescriptor(object, key) {
  checkValue(object);
  if (object == null) return undefined;
  const allowed = staticMembers.get(object);
  if (typeof object === 'function' && !functionDataKeys.has(key) && !allowed?.has(key)) {
    throw securityError('Function internals are not accessible');
  }
  if (allowed && protectedObjects.has(object) && typeof object !== 'function' && !allowed.has(key)) {
    throw securityError('Host object internals are not accessible');
  }
  const descriptor = ownDescriptor(Object(object), key);
  if (descriptor && !('value' in descriptor)) throw securityError('Property accessors are forbidden');
  return descriptor;
}

export function safeGet(object, key, fallback) {
  key = safeKey(key);
  const descriptor = memberDescriptor(object, key);
  return descriptor ? safeValue(descriptor.value) : fallback;
}

export function safeMethod(object, key) {
  key = safeKey(key);
  const own = memberDescriptor(object, key);
  if (own) return safeValue(own.value);
  if (object == null) throw new TypeError(`Cannot read method of ${object}`);
  // Ordinary data lookup never walks prototypes. Method dispatch permits only
  // known intrinsic methods, not arbitrary inherited properties or getters.
  for (let prototype = getPrototypeOf(Object(object)); prototype; prototype = getPrototypeOf(prototype)) {
    const descriptor = ownDescriptor(prototype, key);
    if (!descriptor) continue;
    if (!methodPrototypes.has(prototype) && prototype !== Object.prototype) {
      throw securityError('Inherited host members are forbidden');
    }
    if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
      throw securityError('Inherited data and accessors are forbidden');
    }
    return safeFunction(descriptor.value);
  }
  return undefined;
}

export function safeBoundMethod(object, key) {
  const member = safeMethod(object, key);
  return typeof member === 'function' ? (...args) => safeApply(member, args, object) : member;
}

function writable(object) {
  if (!object || typeof object !== 'object' || protectedObjects.has(object) || object === globalThis || object === Reflect) {
    throw securityError('Only application data objects and arrays are writable');
  }
}

export function safeSet(object, key, value) {
  key = safeKey(key);
  writable(object);
  value = safeValue(value);
  const descriptor = ownDescriptor(object, key);
  if (descriptor && !('value' in descriptor)) throw securityError('Property accessors are forbidden');
  // Defining an own property also avoids inherited setters on a host object.
  defineProperty(object, key, descriptor ? {...descriptor, value} : {
    value, writable: true, enumerable: true, configurable: true,
  });
  return value;
}

export function safeDelete(object, key) {
  key = safeKey(key);
  writable(object);
  return delete object[key];
}

export function safeEntries(object) {
  checkValue(object);
  if (typeof object === 'function') throw securityError('Function internals are not accessible');
  return ownKeys(object).map(key => [safeKey(key), safeGet(object, key)]);
}

export function safeFromEntries(entries) {
  const object = {};
  for (const entry of entries) safeSet(object, safeGet(entry, 0), safeGet(entry, 1));
  return object;
}

export function safeGetIn(object, path) {
  const keys = path.map(safeKey);
  for (const key of keys) {
    if (object == null) return undefined;
    object = safeGet(object, key);
  }
  return safeValue(object);
}
