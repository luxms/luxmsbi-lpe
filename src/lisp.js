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
  
  if (isFunction(ctx)) return ctx(varName, value);

  if (isHash(ctx)) {
    return (value === undefined) ? ctx[varName] : (ctx[varName] = value);
  }

  return undefined;
}


function makeMacro(fn, ast) {
  fn.ast = ast || [[],{},[],1]; // mark as macro
  return fn;
}


function aListToHashTable(alist) {
  let result = {};
  alist.forEach(pair => result[pair[0]] = pair[1]);
  return result;
}


function makeLetBindings(bindings) {
  if (isHash(bindings)) return {...bindings};
  if (isArray(bindings)) return aListToHashTable(bindings);
  if (isFunction(bindings)) return bindings;
  throw new Error('LISP: let expression invalid form in ' + ast);
}


const SPECIAL_FORMS = {                                                         // built-in special forms
  'let': (ast, ctx, rs) => EVAL(['begin', ...ast.slice(1)], [makeLetBindings(ast[0]), ctx], rs),
  '`': (ast, ctx) => ast[0],                                                    // quote
  'macroexpand': macroexpand,
  'begin': (ast, ctx) => ast.reduce((acc, astItem) => EVAL(astItem, ctx), null),
  'do': (ast, ctx) => { throw new Error('DO not implemented') },
  'if': (ast, ctx, rs) => {
    return EVAL(ast[0], ctx, false) ? EVAL(ast[1], ctx, rs) : EVAL(ast[2], ctx, rs);
  },
  '~': (ast, ctx, rs) => {                                                      // mark as macro
    const f = EVAL(ast[0], ctx, rs);                                            // eval regular function
    f.ast.push(1); // mark as macro
    return f;
  },
  '.-': (ast, ctx, rs) => {                                                     // get or set attribute
    const [obj, propertyName, value] = eval_ast(ast, ctx, rs);
    return (value !== undefined) ? (obj[propertyName] = value) : obj[propertyName];
  },
  '.': (ast, ctx, rs) => {                                                      // call object method
    const [obj, methodName, ...args] = eval_ast(ast, ctx, rs);
    const fn = obj[methodName];
    return fn.apply(obj, args);
  },
  'try': (ast, ctx, rs) => {                                                    // try/catch
    try {
      return EVAL(ast[0], ctx, rs);
    } catch (e) {
      const errCtx = env_bind([ast[1][0]], ctx, [e]);
      return EVAL(ast[1][1], errCtx, rs);
    }
  },
  '||': (ast, ctx, rs) => ast.some(a => !!EVAL(a, ctx, rs)),                    // logical or
  '&&': (ast, ctx, rs) => ast.every(a => !!EVAL(a, ctx, rs)),                   // logical and
  'fn': (ast, ctx, rs) => {                                                     // define new function (lambda)
    const f = (...args) => EVAL(ast[1], env_bind(ast[0], ctx, args), rs);
    f.ast = [ast[1], ctx, ast[0]];                                              // f.ast compresses more than f.data
    return f;
  },
  'def': (ast, ctx, rs) => {                                                    // update current environment
    const value = EVAL(ast[1], ctx, rs);
    const result = $var$(ctx, ast[0], value);
    return result;
  },
};


const STDLIB = {
  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,                                                                 // js specific
  'true': true,
  'false': false,
  'Array': Array,
  'Object': Object,

  // built-in function
  '=': (...args) => args.every(v => v === args[0]),
  '+': (...args) => args.reduce((a, b) => a + b),
  '-': (...args) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
  '*': (...args) => args.reduce((a, b) => a * b),
  '/': (...args) => args.length === 1 ? 1 / args[0] : args.reduce((a, b) => a / b),
  '<': (...args) => args.every((v, i) => i === 0 ? true : args[i-1] < args[i]),
  'isa': (a, b) => a instanceof b,
  'type': a => typeof a,
  'new': (...args) => new (args[0].bind.apply(args[0], args)),
  'del': (a, b) => delete a[b],
  'list': (...args) => args,
  'vector': (...args) => args,
  '[': (...args) => args,
  'map': (a, b) => b.map(a),
  'throw': a => { throw(a) },
  'identity': a => a,
  'pluck': (c, k) => c.map(el => el[k]),                                        // for each array element, get property value, present result as array.
  'RegExp': (...args) => RegExp.apply(RegExp, args),
  'read-string': a => JSON.parse(a),
  'rep': (a) => JSON.stringify(EVAL(JSON.parse(a), STDLIB)),                    // TODO: fix ctx and rs arguments

  // not implemented yet
  // 'hash-table->alist'

  // macros
  '\'': makeMacro(a => a.toString()),
  '"': makeMacro(a => a.toString()),
  '()': makeMacro((...args) => args),                                           // ???
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

  // system functions & objects
  // 'js': eval,
  eval_context: eval_context,                           // TODO: remove
  JSON: JSON,
  console: console,
  eval: (a) => EVAL(a, STDLIB),
};


var minimal = ["begin",
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
    ["begin",
      [".", "console", ["`", "log"],
          [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"],
        ["`", "join"], ["`", " "]]],
      null]]],
  ["def", "println", ["fn", ["&", "a"],
    ["begin", [".", "console", ["`", "log"],
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
    ["begin", [".-", "a", "b", "c"], "a"]]],
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


function macroexpand(ast, ctx, resolveString = true) {
  while (true) {
    if (!isArray(ast)) break;
    if (typeof ast[0] !== "string") break;

    const v = $var$(ctx, ast[0]);
    if (!isFunction(v)) break;

    if (!isArray(v.ast)) break;
    if (!v.ast[3]) break;

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


function eval_ast(ast, ctx, resolveString = true) {
  if (isArray(ast)) {                                                           // list?
    return ast.map(e => EVAL(e, ctx, resolveString));
  }

  if (isString(ast)) {
    const value = $var$(ctx, ast);

    if (value !== undefined) {                                                  // variable
      return value;
    }

    return resolveString ? ast : undefined;                                     // if string and not in ctx:
  }

  return ast;
}


function EVAL(ast, ctx, resolveString = true) {
  while (true) {
    if (!isArray(ast)) {
      return eval_ast(ast, ctx, resolveString);
    }

    // apply
    ast = macroexpand(ast, ctx);
    if (!Array.isArray(ast)) return ast;                                        // do we need eval here?
    if (ast.length === 0) return null;                                          // [] => empty list (or, maybe return vector [])

    const op = ast[0];

    if (isString(op) && (op in SPECIAL_FORMS)) {
      return SPECIAL_FORMS[op](ast.slice(1), ctx, resolveString);
    }

    const el = ast.map(ast => EVAL(ast, ctx, resolveString));
    const f = el[0];
    if (f.ast) {
      ast = f.ast[0];
      ctx = env_bind(f.ast[2], f.ast[1], el.slice(1));                          // TCO
    } else {
      return f.apply(f, el.slice(1));
    }
  }
} // EVAL


function eval_context(ast, ctx) {
  const result = EVAL(ast, [ctx || {}, STDLIB]);
  return result;
}


// Use with care
export function init_lisp(ctx) {
  ctx = [ctx || {}, STDLIB];
  return {
    eval: (ast) => eval_context(ast, ctx),
    val: (varName, value) => $var$(ctx, varName, value),
  }
}


export function eval_lisp(ast, ctx) {
  const result = eval_context(ast, ctx);

  if (isFunction(result)) {
    return '["function"]';
  } else {
    return result;
  }
}


export function evaluate(ast, ctx) {
  return eval_lisp(ast, ctx);
}
