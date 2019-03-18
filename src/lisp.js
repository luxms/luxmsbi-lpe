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
const isString = (arg) => (typeof arg === 'string');
const isNumber = (arg) => (typeof arg === 'number');
const isBoolean = (arg) => arg === true || arg === false;
const isHash = (arg) => (typeof arg === 'object') && (arg !== null) && !isArray(arg);
const isFunction = (arg) => (typeof arg === 'function');


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
  
  if (isFunction(ctx)) {
    return ctx(varName, value);
  }

  if (isHash(ctx)) {
    if (value === undefined) {                                                  // get from hash
      const result = ctx[varName];
      if (result !== undefined) {                                               // found value in hash
        return result;
      }
      if (varName.substr(0, 3) !== 'sf:' && isFunction(ctx['sf:' + varName])) { // user-defined special form
        return makeSF(ctx['sf:' + varName]);
      }
      return undefined;
    } else {
      return (ctx[varName] = value);
    }
  }

  return undefined;
}


export function makeMacro(fn, ast) {
  fn.ast = ast || [[], {}, [], 1]; // mark as macro
  return fn;
}


function isMacro(fn) {
  if (!isFunction(fn)) return false;
  if (!isArray(fn.ast)) return false;
  return !!fn.ast[3];
}


export function makeSF(fn) {
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
    result[ast[0]] = EVAL(ast[1], ctx, rs);
  } else if (isArray(ast)) {
    ast.forEach(pair => result[pair[0]] = EVAL(pair[1], ctx, rs));
  } else if (isFunction(ast)) {
    return ast;
  } else {
    throw new Error('LISP: let expression invalid form in ' + ast);
  }
  return result;
}


const SPECIAL_FORMS = {                                                         // built-in special forms
  'let': makeSF((ast, ctx, rs) => EVAL(['begin', ...ast.slice(1)], [makeLetBindings(ast[0], ctx, rs), ctx], rs)),
  '`': makeSF((ast, ctx) => ast[0]),                                            // quote
  'macroexpand': makeSF(macroexpand),
  'begin': makeSF((ast, ctx) => ast.reduce((acc, astItem) => EVAL(astItem, ctx), null)),
  'do': makeSF((ast, ctx) => { throw new Error('DO not implemented') }),
  'if': makeSF((ast, ctx, rs) => EVAL(ast[0], ctx, false) ? EVAL(ast[1], ctx, rs) : EVAL(ast[2], ctx, rs)),
  '~': makeSF((ast, ctx, rs) => {                                               // mark as macro
    const f = EVAL(ast[0], ctx, rs);                                            // eval regular function
    f.ast.push(1); // mark as macro
    return f;
  }),
  '.-': makeSF((ast, ctx, rs) => {                                              // get or set attribute
    const [obj, propertyName, value] = ast.map(a => EVAL(a, ctx, rs));
    try {
      return (value !== undefined) ? (obj[propertyName] = value) : obj[propertyName];
    } catch (err) {
      return value;                                                             // undefined when 'get'
    }
  }),
  '.': makeSF((ast, ctx, rs) => {                                               // call object method
    const [obj, methodName, ...args] = ast.map(a => EVAL(a, ctx, rs));
    const fn = obj[methodName];
    return fn.apply(obj, args);
  }),
  'try': makeSF((ast, ctx, rs) => {                                             // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      const errCtx = env_bind([ast[1][0]], ctx, [e]);
      return EVAL(ast[1][1], errCtx, rs);
    }
  }),
  '||': makeSF((ast, ctx, rs) => ast.some(a => !!EVAL(a, ctx, rs))),            // logical or
  '&&': makeSF((ast, ctx, rs) => ast.every(a => !!EVAL(a, ctx, rs))),           // logical and
  'fn': makeSF((ast, ctx, rs) => {                                              // define new function (lambda)
    const f = (...args) => EVAL(ast[1], env_bind(ast[0], ctx, args), rs);
    f.ast = [ast[1], ctx, ast[0]];                                              // f.ast compresses more than f.data
    return f;
  }),
  'def': makeSF((ast, ctx, rs) => {                                             // update current environment
    const value = EVAL(ast[1], ctx, rs);
    const result = $var$(ctx, ast[0], value);
    return result;
  }),
  'filter': makeSF((ast, ctx, rs) => {
    const [lambda, array] = ast.map(a => EVAL(a, ctx, rs));
    return Array.prototype.filter.call(array, lambda);
  }),
};


const STDLIB = {
  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,                                                                 // js specific
  'true': true,
  'false': false,
  'Array': Array,                                                               // TODO: consider removing these properties
  'Object': Object,
  'Date': Date,
  'console': console,
  'JSON': JSON,

  // special forms
  ...SPECIAL_FORMS,

  // built-in function
  '=': (...args) => args.every(v => v == args[0]),
  '+': (...args) => args.reduce((a, b) => a + b),
  '-': (...args) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
  '*': (...args) => args.reduce((a, b) => a * b),
  '/': (...args) => args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b),
  '<': (...args) => args.every((v, i) => i === 0 ? true : args[i-1] < args[i]),
  '>': (...args) => args.every((v, i) => i === 0 ? true : args[i-1] > args[i]),
  '<=': (...args) => args.every((v, i) => i === 0 ? true : args[i-1] <= args[i]),
  '>=': (...args) => args.every((v, i) => i === 0 ? true : args[i-1] >= args[i]),
  '!=': (...args) => !args.every(v => v == args[0]),
  '[': (...args) => args,
  'RegExp': (...args) => RegExp.apply(RegExp, args),
  'count': (a) => a.length,
  'del': (a, b) => delete a[b],
  // 'del': (a, b) => Reflect.deleteProperty(a, b),
  'isa': (a, b) => a instanceof b,
  'type': a => typeof a,
  'new': (...args) => new (args[0].bind.apply(args[0], args)),
  'not': a => !a,
  'list': (...args) => args,
  'vector': (...args) => args,
  'map': (fn, arr) => arr.map(it => fn(it)),
  'throw': a => { throw(a) },
  'identity': a => a,
  'pluck': (c, k) => c.map(el => el[k]),                                        // for each array element, get property value, present result as array.
  'read-string': a => JSON.parse(a),
  'rep': (a) => JSON.stringify(EVAL(JSON.parse(a), STDLIB)),                    // TODO: fix ctx and rs arguments
  'null?': (a) => a === null || a === undefined,                                // ??? add [] ???
  'true?': (a) => a === true,
  'false?': (a) => a === false,
  'string?': isString,
  'list?': isArray,
  'contains?': (a, b) =>  a.hasOwnProperty(b),
  'str': (...args) => args.map(x => isString(x) ? x : JSON.stringify(x)).join(''),
  'get': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'nth': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'set': (a, b, c) => (a[b] = c, a),
  'keys': (a) => Object.keys(a),
  'vals': (a) => Object.values(a),
  'rest': (a) => a.slice(1),
  'println': (...args) => console.log(args.map(x => isString(x) ? x : JSON.stringify(x)).join(' ')),
  'empty?': (a) => isArray(a) ? a.length === 0 : false,
  'cons': (a, b) => [].concat([a], b),
  'prn': (...args) => console.log(args.map((x) => JSON.stringify(x)).join(' ')),
  'slice': (a, b, ...end) => a.slice(b, end.length > 0 ? end[0] : a.length),
  'first': (a) => a.length > 0 ? a[0] : null,
  'last': (a) => a[a.length - 1],
  'apply': (f, ...b) => f.apply(f, b),
  'concat': (...a) => [].concat.apply([], a),
  'pr-str': (...a) => a.map(x => JSON.stringify(x)).join(' '),
  'classOf': (a) => Object.prototype.toString.call(a),
  '⍴': (len, ...values) => Array.apply(null, Array(len)).map((a, idx) => values[idx % values.length]),

  // not implemented yet
  // 'hash-table->alist'

  // macros
  '\'': makeMacro(a => a.toString()),
  '"': makeMacro(a => a.toString()),
  '()': makeMacro((...args) => ['begin', ...args]),
  '->': makeMacro((acc, ...ast) => {                                            // thread first macro
    // императивная лапша для макроса ->
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    for (let arr of ast) {
      if (!isArray(arr)) {
        arr = [".-", acc, arr];                                                 // это может быть обращение к хэшу или массиву через индекс или ключ....
      } else if (arr[0] === "()" && arr.length === 2 && (isString(arr[1]) || isNumber(arr[1]))) {
        arr = [".-", acc, arr[1]];
      } else {
        arr.splice(1, 0, acc);                                                  // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }
      acc = arr;
    }
    return acc;
  }),
  '->>': makeMacro((acc, ...ast) => {                                           // thread last macro
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
    return ["let", ["__and", ast[0]],
                   ["if", "__and",
                          ["and"].concat(ast.slice(1)),
                          "__and"]];
  }),
  'or': makeMacro((...ast) => {
    if (ast.length === 0) return false;
    if (ast.length === 1) return ast[0];
    return ["let", ["__or", ast[0]],
                   ["if", "__or",
                          "__or",
                          ["or"].concat(ast.slice(1))]];
  }),


  // system functions & objects
  // 'js': eval,
  eval: (a) => EVAL(a, STDLIB),
};


function macroexpand(ast, ctx, resolveString = true) {
  while (true) {
    if (!isArray(ast)) break;
    if (!isString(ast[0])) break;

    const v = $var$(ctx, ast[0]);
    if (!isFunction(v)) break;

    if (!isMacro(v)) break;

    ast = v.apply(v, ast.slice(1));                                             // Это макрос! 3-й элемент макроса установлен в 1 через push
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


function EVAL(ast, ctx, resolveString = true) {
  while (true) {
    if (!isArray(ast)) {                                                        // atom
      if (isString(ast)) {
        const value = $var$(ctx, ast);
        if (value !== undefined) {                                              // variable
          return value;
        }
        return resolveString ? ast : undefined;                                 // if string and not in ctx
      }
      return ast;
    }

    // apply
    ast = macroexpand(ast, ctx);
    if (!Array.isArray(ast)) return ast;                                        // TODO: do we need eval here?
    if (ast.length === 0) return null;                                          // TODO: [] => empty list (or, maybe return vector [])

    const [opAst, ...argsAst] = ast;

    const op = EVAL(opAst, ctx, resolveString);                                 // evaluate operator

    if (typeof op !== 'function') {
      throw new Error('Error: ' + String(op) + ' is not a function');
    }

    if (isSF(op)) {                                                             // special form
      const sfResult = op(argsAst, ctx, resolveString);
      return sfResult;
    }

    const args = argsAst.map(a => EVAL(a, ctx, resolveString));                 // evaluate arguments

    if (op.ast) {
      ast = op.ast[0];
      ctx = env_bind(op.ast[2], op.ast[1], args);                               // TCO
    } else {
      const fnResult = op.apply(op, args);
      return fnResult;
    }
  }
} // EVAL


export function eval_lisp(ast, ctx) {
  const result = EVAL(ast, [ctx || {}, STDLIB]);
  return result;
}

// Use with care
export function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: (ast) => eval_lisp(ast, ctx),
    val: (varName, value) => $var$(ctx, varName, value),
  }
}


// deprecated
export function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}



