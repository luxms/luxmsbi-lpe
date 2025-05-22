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

import {parse} from './lpep';
import {deparse} from './lped';
import {DATE_TIME} from './lib/datetime';

/**
 * @typedef {Object} EvalOptions
 * @property {boolean=} resolveString Proceed variables to their names <br>`lpe 'x' -> string 'x' (if x is not defined)`
 * @property {any=} streamAdapter Is there any streaming library so lpe can use it
 * @property {boolean=} squareBrackets Should `[Square Brackets]` be interpreted as string
 */



export const isArray = (arg) => Object.prototype.toString.call(arg) === '[object Array]';
export const isString = (arg) => (typeof arg === 'string');
export const isNumber = (arg) => (typeof arg === 'number');
export const isBoolean = (arg) => arg === true || arg === false;
export const isHash = (arg) => (typeof arg === 'object') && (arg !== null) && !isArray(arg);
export const isFunction = (arg) => (typeof arg === 'function');


function LPEEvalError(message) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  // this.stack = (new Error()).stack;
}

function makeError(name, ast, message) {
  const errorDescription = JSON.stringify(
      {name: name, message: message, args: deparse([name, ...ast])
        //ast.map(
        //x => x instanceof Array ? `['${x.map(y => y instanceof Array ? [y[0]] : y).join("','")}']` : x)
        },
      ['name', 'message', 'args'],
      4);

  throw new LPEEvalError(errorDescription);
}


/**
 * Get or Set variable in context
 * @param {*} ctx - array, hashmap or function that stores variables
 * @param {*} varName - the name of variable
 * @param {*} value - optional value to set (undefined if get)
 * @param {EvalOptions=} resolveOptions - options on how to resolve. resolveString - must be checked by caller and is not handled here...
 * @param {Map} evalOptions - current evaluate context and options for find endpoint
 */
function $var$(ctx, varName, value, resolveOptions = {}, evalOptions = undefined) {
  if (!evalOptions) {
    evalOptions = { evalFrom: 0, currentCtxElement: 0 }
  }
  evalOptions.currentCtxElement++;   // Инкрементируем шаг
  if (isArray(ctx)) {                                                           // contexts chain
    for (let theCtx of ctx) {
      const result = $var$(theCtx, varName, value, resolveOptions, evalOptions);
      if (result === undefined) continue;                                       // no such var in context
      if (value === undefined) return result;                                   // get => we've got a result
      // Повторный вызов той же функции с теми же аргументами точно нужен?
      return $var$(theCtx, varName, value, resolveOptions, evalOptions);                     // set => redirect 'set' to context with variable.
    }
    if (value === undefined) return undefined;                                  // get => variable not found in all contexts
    if (ctx.length) $var$(ctx[0], varName, value, resolveOptions, evalOptions);              // set => set variable to HEAD context
    return undefined;                                                           // ??? ctx.length = 0
  }

  // Если мы хотим выполнить функцию, которая лежит ниже, пропускаем эту
  if (evalOptions.currentCtxElement < evalOptions.evalFrom) {
    return undefined;
  }

  if (isFunction(ctx)) {
      return ctx(varName, value, resolveOptions);
  }

  if (isHash(ctx)) {
    if (value === undefined) {                                                  // get from hash
      const result = ctx[varName];
      //console.log(`$var: for ${varName} got ${isFunction(result)? 'FUNC' : result}`)
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


export function makeSkipForm(fn, overridedAst = undefined) {
  fn.__isSkipForm = true;
  if (overridedAst) {
    // Запоминаем новое ast, если функция хочет его изменить для нижележащих функций
    fn.__ast = overridedAst;
  }
  return fn;
}


function isSF(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSpecialForm;
}


function isSkip(fn) {
  if (!isFunction(fn)) return false;
  return !!fn.__isSkipForm;
}


function makeLetBindings(ast, ctx, rs) {
  let result = {};
  if (isHash(ast)) {
    for (let varName in ast) {
      result[varName] = EVAL(ast[varName], ctx, rs);
    }
  } else if (isArray(ast) && isString(ast[0])) {
    if(ast[0] === '[') {
      ast = ast.slice(1)
    }
    if (isString(ast[0])) {
      result[ast[0]] = EVAL(ast[1], ctx, rs);
    } else if (isArray(ast[0])){
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
const ifSF = (ast, ctx, options) => {
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, options);                                          // one arg - by convention return the argument
  const condition = EVAL(ast[0], ctx, {...options, resolveString: false});
  return unbox(
    [condition],
    ([condition]) => {
      if (condition) {
        return EVAL(ast[1], ctx, options);
      } else {
        return ifSF(ast.slice(2), ctx, options);
      }
    },
    options?.streamAdapter);
}

/**
 * Рекурсивный begin
 */
const beginSF = (ast, ctx, options) => {
  if (ast.length === 0) return null;
  const firstOperator = EVAL(ast[0], ctx, options);
  return unbox(
      [firstOperator],
      ([firstResult]) => ast.length === 1 ? firstResult : beginSF(ast.slice(1), ctx, options),      // Если один аргумент - возвращаем значение
      options?.streamAdapter);
};


const SPECIAL_FORMS = {                                                         // built-in special forms
  'let': makeSF((ast, ctx, rs) => EVAL(['begin', ...ast.slice(1)], [makeLetBindings(ast[0], ctx, rs), ctx], rs)),
  '`': makeSF((ast, ctx) => ast[0]),                                            // quote
  'macroexpand': makeSF(macroexpand),
  'begin': makeSF(beginSF),
  'do': makeSF((ast, ctx) => { throw new Error('DO not implemented') }),
  'if': makeSF(ifSF),
  '~': makeSF((ast, ctx, rs) => {                                               // mark as macro
    const f = EVAL(ast[0], ctx, rs);                                            // eval regular function
    f.ast.push(1); // mark as macro
    return f;
  }),
  '.-': makeSF((ast, ctx, options) => {                                                             // get or set attribute
    let [obj, propertyName, value] = ast.map(a => EVAL(a, ctx, options));
    // hack
    if (propertyName === undefined && isString(ast[1])) {                                           // string propertyName tried to evaluate in rs context
      propertyName = ast[1];
    }
    return unbox(
        [obj, propertyName, value],
        ([obj, propertyName, value]) => {
          try {
            return (value !== undefined) ? (obj[propertyName] = value) : obj[propertyName];
          } catch (err) {
            return value;                                                             // undefined when 'get'
          }
        },
        options?.streamAdapter);
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
  'resolve': makeSF((ast, ctx, rs) => {
    const result = $var$(ctx, ast[0], undefined, rs);
    return result;
  }),
  'set_options': makeSF((ast, ctx, rs) => {
    let options = eval_lisp(ast[0], ctx, rs);
    if (isArray(options)) {
      // [["key1", "val1"], ["key2", "val2"]] => {key1: "val1", key2: "val2"}
      options = Object.fromEntries(options);
    }
    const result = eval_lisp(ast[1], ctx, { ...rs, ...options });
    return result;
  }),
  'json_parse': (jsonText) => {
    return JSON.parse(jsonText);
  },
  'eval_ast': makeSF((ast, ctx, options) => {
    const lisp = eval_lisp(ast[0], ctx, options);
    const result = eval_lisp(lisp, ctx, options);
    return result;
  }),
  'eval_lpe': makeSF((ast, ctx, options) => {
    const lpeCode = eval_lisp(ast[0], ctx, options);
    const lisp = parse(lpeCode, options);
    const result = eval_lisp(lisp, ctx);
    return result;
  }),
  'filterit': makeSF((ast, ctx, rs) => {
    //console.log("FILTERIT: " + JSON.stringify(ast))
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.filter.call(array, (it, idx) => !!eval_lisp(conditionAST, [{it, idx}, ctx], rs));
    return result;
  }),
  'mapit': makeSF((ast, ctx, rs) => {
    const array = eval_lisp(ast[0], ctx, rs);
    const conditionAST = ast[1];
    const result = Array.prototype.map.call(array, (it, idx) => eval_lisp(conditionAST, [{it, idx}, ctx], rs));
    return result;
  }),
  'get_in': makeSF((ast, ctx, rs) => {
    let array = [];
    let hashname;
    //console.log(JSON.stringify(ast))
    if (isArray(ast[0])) {
      hashname = eval_lisp(ast[0], ctx, rs);
    } else {
      hashname = ast[0]
    }

    if (isArray(ast[1]) && ast[1][0] === '[') {
        // массив аргументов, ка в классическом get_in в Clojure
        array = eval_lisp(ast[1], ctx, rs);
    } else {
      // просто список ключей в виде аргументов
      [,...array] = ast
      const a = ["["].concat( array );
      array = eval_lisp(a, ctx, rs);
    }

    // но вообще-то вот так ещё круче ["->","a",3,1]
    // const m = ["->"].concat( array.slice(1).reduce((a, b) => {a.push([".-",b]); return a}, [[".-", ast[0], array[0]]]) );
    const m = ["->", hashname].concat( array );
    //console.log('get_in', JSON.stringify(m))
    return eval_lisp(m, ctx, rs);
  }),
  'assoc_in': makeSF((ast, ctx, rs) => {
    const array = eval_lisp(ast[1], ctx, {...rs, wantCallable: false});
    // удивительно, но работает set(a . 3 , 2, "Hoy")
    //const m = ["->", ast[0]].concat( array.slice(0,-1) );
    //const e = ["set", m, array.pop(), ast[2]]
    // первый аргумент в ast - ссылка на контекст/имя переменной
    //console.log('assoc_in var:', JSON.stringify(ast))
    // let focus = $var$(ctx, ast[0], undefined, {...rs, wantCallable: false});
    let focus = EVAL(ast[0], ctx, {...rs, wantCallable: false});
    for (var i = 0; i < array.length-1; i++) {
      if (focus[array[i]] === undefined) {
        // нужно создать
        if (isString(array[i+1])) {
          focus = focus[array[i]] = {}
        } else {
          focus = focus[array[i]] = []
        }
      } else {
        focus = focus[array[i]]
      }
    }
    const e = ["set", focus, array.pop(), ast[2]]
    //console.log(JSON.stringify(e), JSON.stringify(eval_lisp(e, ctx, rs)))
    return eval_lisp(e, ctx, rs);
  }),
  'cp': makeSF((ast, ctx, rs) => {
    const from = EVAL(ast[0], ctx, {...rs, wantCallable: false})
    const to = EVAL(ast[1], ctx, {...rs, wantCallable: false})
    //console.log(`CP ${JSON.stringify(from)} to `, JSON.stringify(to))
    const lpe = ["assoc_in", to[0], ["["].concat(to.slice(1)), ["get_in", from[0], ["["].concat(from.slice(1))]]
    //console.log('CP', JSON.stringify(ast))
    return EVAL(lpe, ctx, rs);
  }),
  'ctx': makeSF((ast, ctx, rs) => {
    //FIXME will work only for single keys, we want: ctx(k1,k2,k3.df)
    let ret = {}
    ast.map(k=>ret[k]=$var$(ctx, k, undefined, rs))
    return ret
  })
};


export const STDLIB = {
  // built-in constants
  '#t': true,
  '#f': false,
  'NIL': null,
  'null': null,                                                                // js specific
  'true': true,
  'false': false,
  'Array': Array,                                                               // TODO: consider removing these properties
  'Object': Object,
  'Hashmap': {},
  'Date': Date,
  'console': console,
  'JSON': JSON,

  // datetime fn
  ...DATE_TIME,

  // special forms
  ...SPECIAL_FORMS,

  // built-in functions
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
  ':=': makeSF((ast, ctx, rs) => {
    if (isArray(ast[0])) {
      if (ast[0][0] != "->") {
        makeError(":=", ast, 'Left operand of ":=" must be lvalue!');
      }
      let val = isArray(ast[0][1]) ? eval_lisp(ast[0][1], ctx, rs) : $var$(ctx, ast[0][1]);
      for (let i = 2; i < ast[0].length - 1; ++i) {
        let key = eval_lisp(ast[0][i], ctx, rs);
        val[key] = val[key] || {};
        val = val[key];
      }
      return (val[eval_lisp(ast[0][ast[0].length - 1], ctx, rs)] = eval_lisp(ast[1], ctx, rs));
    }
    return $var$(ctx, ast[0], eval_lisp(ast[1], ctx, rs));
  }), 
//  "'": a => `'${a}'`,
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
  'map': makeSF((ast, ctx, rs) => {
          let arr = eval_lisp(ast[0], ctx,  {...rs, wantCallable: false})
          rs.wantCallable = true
          let fn = eval_lisp(ast[1], ctx,  {...rs, wantCallable: true})
          return isArray(arr) ? arr.map(it => fn(it)) : []
  }),
  'filter': (arr, fn) => isArray(arr) ? arr.filter(it => fn(it)) : [],
  'throw': a => { throw(a) },
  'identity': a => a,
  'pluck': (c, k) => isArray(c) ? c.map(el => el[k]) : [],                      // for each array element, get property value, present result as array.
  'read-string': a => JSON.parse(a),
  'rep': (a) => JSON.stringify(EVAL(JSON.parse(a), STDLIB)),                    // TODO: fix ctx and rs arguments
  'null?': (a) => a === null || a === undefined,                                // ??? add [] ???
  'true?': (a) => a === true,
  'false?': (a) => a === false,
  'string?': isString,
  'list?': isArray,
  'contains?': (a, b) =>  a.hasOwnProperty(b),
  'str': (...args) => args.map(x => isString(x) ? x : isFunction(x) ? x.lpeName : JSON.stringify(x)).join(''),
  'get': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'nth': (a, b) => a.hasOwnProperty(b) ? a[b] : undefined,
  'set': (a, b, c) => (a[b] = c, a),
  'keys': (a) => Object.keys(a),
  'vals': (a) => Object.values(a),
  'rest': (a) => a.slice(1),
  'split': makeSF((ast, ctx, rs) => {
                  let str = eval_lisp(ast[0], ctx,  {...rs, wantCallable: false})
                  let sep = eval_lisp(ast[1], ctx,  {...rs, wantCallable: false})
                  return str.split(sep)
                }),
  'println': (...args) => console.log(args.map(x => isString(x) ? x : JSON.stringify(x)).join(' ')),
  'empty?': (a) => isArray(a) ? a.length === 0 : false,
  'cons': (a, b) => [].concat([a], b),
  'prn': (...args) => console.log(args.map((x) => JSON.stringify(x)).join(' ')),
  'slice': (a, b, ...end) => isArray(a) ? a.slice(b, end.length > 0 ? end[0] : a.length) : [],
  'first': (a) => a.length > 0 ? a[0] : null,
  'last': (a) => a[a.length - 1],
  'sort': (a) => isArray(a) ? a.sort() : [],
  // https://stackoverflow.com/questions/1669190/find-the-min-max-element-of-an-array-in-javascript
  // only for numbers!
  'max': (a) => isArray(a) ? a.reduce(function (p, v) {return ( p > v ? p : v );}) : [],
  'min': (a) => isArray(a) ? a.reduce(function (p, v) {return ( p < v ? p : v );}) : [],
  'apply': (f, ...b) => f.apply(f, b),
  'concat': (...a) => [].concat.apply([], a),
  'pr_str': (...a) => a.map(x => JSON.stringify(x)).join(' '),
  'classOf': (a) => Object.prototype.toString.call(a),
  'join': (a, sep) => isArray(a) ? Array.prototype.join.call(a, sep) : '',
  'rand': () => Math.random(),
  // operator from APL language
  '⍴': (len, ...values) => Array.apply(null, Array(len)).map((a, idx) => values[idx % values.length]),
  re_match: (t,r,o) => t.match(new RegExp(r,o)),
  // not implemented yet
  // 'hash-table->alist'
  '"' : makeSF((ast, ctx, rs) => String(ast[0])),
  '\'' : makeSF((ast, ctx, rs) => String(ast[0])),
  '[]' : makeSF((ast, ctx, rs) => String(ast[0])),

  // macros
 // '()': makeMacro((...args) => ['begin', ...args]), from 2022 It is just grouping of expressions
  '()': makeMacro(args => args),
  '->': makeMacro((acc, ...ast) => {                                            // thread first macro
    // императивная лапша для макроса ->
    // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
    // AST[["filterit",[">",1,0]]]
    //console.log("---------> " +JSON.stringify(acc) + " " + JSON.stringify(ast));

    for (let arr of ast) {
      if (!isArray(arr)) {
        arr = [".-", acc, arr];                                                 // это может быть обращение к хэшу или массиву через индекс или ключ....
      } else if (arr[0] === "()" && arr.length === 2 && (isString(arr[1]) || isNumber(arr[1]))) {
        arr = [".-", acc, arr[1]];
      } else {
        arr = arr.slice(0);                                                     // must copy array before modify
        arr.splice(1, 0, acc);
        //console.log("AST !!!!" + JSON.stringify(arr))
        // AST[["filterit",[">",1,0]]]
        // AST !!!!["filterit","locations",[">",1,0]]
        // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
      }
      acc = arr;
    }
    //console.log("AST !!!!" + JSON.stringify(acc))
    if (!isArray(acc)){
      return ["resolve", acc]
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


  "define": makeSF((ast, ctx, rs) => {
    let context = {};
    let ind = 0;
    let statics = $var$(ctx, '##static') || {};
    while (ind < ast.length && isArray(ast[ind]) && ast[ind][0] == "[") {
      let last = ast[ind];
      let body = last[last.length - 1];
      if (!body instanceof Array || body[0] != '"') {
        makeError(last[1], last.slice(2), 'Last argument of define must be <String> ("func body at quotes")');
      }
      body = body[1];
      let fargs = [];
      statics[last[1]] = {};
      last.slice(2, last.length - 1).forEach((v) => {
        let name = v;
        let val = undefined;
        if (v instanceof Array) {
          if (v[0] != "[") {
            makeError(last[1], last.slice(2), 'Argument of function must be <name> or <Array>');
          }
          name = v[1];
          val = eval_lisp(v[2], ctx, rs);
        }
        if (name.startsWith("#")) {
          statics[last[1]][name.slice(1)] = val;
        } else {
          fargs.push([ name, val ]);
        }
      });

      context[last[1]] = makeSF((ast, ctx, rs) => {
        if (!body) {
          return false;
        }
        let ths = $var$(ctx, '##static');
        if (ths) ths = ths[last[1]];
        return eval_lisp(
          ["let", 
            [["this", ths || {}], ...fargs.map((x, i) => [x[0], ast[i] || x[1]])], 
            parse(body)],
          ctx,
          rs
        );
      });
      ind++;// makeLetBindings(ast[0], ctx, rs)
    }
    return eval_lisp(['let', [["##static", statics]], ...ast.slice(ind)], {...context, ...ctx}, rs)
  }),
  // system functions & objects
  // 'js': eval,

  eval: (a) => EVAL(a, STDLIB),
};


for (const [key, val] of Object.entries(STDLIB)) {
  if (isFunction(val)) {val.lpeName = key}
}


function macroexpand(ast, ctx, resolveString = true) {
  //console.log("MACROEXPAND: " + JSON.stringify(ast))
  while (true) {
    if (!isArray(ast)) break;
    if (!isString(ast[0])) break;
    //const v = $var$(ctx, ast[0]);
    const v = $var$(ctx, ast[0], undefined, {"resolveString": resolveString}); //возможно надо так
    if (!isFunction(v)) break;

    if (!isMacro(v)) break;

    ast = v.apply(v, ast.slice(1));                                             // Это макрос! 3-й элемент макроса установлен в 1 через push
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
 * @param {any?} streamAdapter
 */
export function unbox(args, resolve, streamAdapter) {
  const hasPromise = args.find(a => a instanceof Promise);
  const hasStreams = !!args.find(a => streamAdapter?.isStream(a));

  if (hasStreams) {
    // TODO: add loading state
    const evaluatedArgs = args.map(a => streamAdapter.isStream(a) ? streamAdapter.getLastValue(a) : a);
    let outputStream;                                                                               // what will be returned
    const subscriptions = [];
    let resultStream;
    let resultStreamSubscription;

    const disposeResultStream = () => {                                                             // handler - dispose resultStream if any
      if (resultStreamSubscription) {
        resultStreamSubscription.dispose?.();
        resultStreamSubscription = null;
      }
      if (resultStream) {
        streamAdapter.disposeStream(resultStream);
        resultStream = null;
      }
    }

    const dispose = () => {                                                                         // handler - dispose all dependencies
      disposeResultStream();
      subscriptions.forEach(subscription => subscription?.dispose?.());                             // unsubscribe all subscriptions
      args.filter(a => streamAdapter?.isStream(a)).forEach(streamAdapter.disposeStream);            // and free services
    };

    const onNextValue = (value) => {                                                                // when we have extracted value from result
      streamAdapter.next(outputStream, value);
    }

    const onNextResult = (result) => {                                                              // will be called on next result to be pushed into stream
      if (streamAdapter.isStream(result)) {                                                         // when result is stream itself
        if (resultStream !== result) {                                                              // and only when new stream is received
          disposeResultStream();
          resultStream = result;
          onNextValue(streamAdapter.getLastValue(resultStream));
          resultStreamSubscription = streamAdapter.subscribe(resultStream, onNextValue);
        }
      } else {                                                                                      // when result is just value (TODO: Promise)
        disposeResultStream();                                                                      // we don't need stream any more if it was on previous result
        onNextValue(result);
      }
    }

    outputStream = streamAdapter.createStream(undefined, dispose);
    onNextResult(resolve(evaluatedArgs));

    args.forEach((a, idx) => {
      if (streamAdapter.isStream(a)) {
        subscriptions.push(                                                                         // save subscription in order to dispose later
          streamAdapter.subscribe(a, (value) => {
            evaluatedArgs[idx] = value;                                                             // update arguments
            onNextResult(resolve(evaluatedArgs))
          }));
      }
    });

    return outputStream;

  } else if (hasPromise) {                                                                          // TODO: handle both streams and promises
    return Promise.all(args).then(resolve);

  } else {
    return resolve(args);                                                                           // TODO check if stream or promise returned
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
  // В этой функции задаем параметры поиска и обрабатываем skip результат
  // после чего перенаправляем в исходную функцию, которая теперь называется EVAL_IMPLEMENTATION
  let evalOptions = { evalFrom: 0, currentCtxElement: 0 }
  let skippedForms = []
  let result = EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions);
  while (isSkip(result)) {
    // Если в качестве результата вернулась функция с пометкой skip
    // необходимо продолжить поиск с того же места в контексте
    // после чего результат найденной функции передать в качестве аргумента
    // в skip функцию

    // Для этого в evalFrom передаём, на каком элементе в контексте мы сейчас остановились

    // ВАЖНО! evalOptions не должен перезаписываться в другой объект для того, чтобы
    // при изменении  currentCtxElement в нижележащий функциях здесь были видны изменеия
    // Также из-за макросов эта логика может сломаться, т.к. после обработки макроса
    // вместо рекурсивного вызова EVAL, который сбросит currentCtxElement, продолжается 
    // обработка в том же EVAL в цикле с продолжением счетчика, но уже с другим деревом
    skippedForms.push(result);
    evalOptions.evalFrom = evalOptions.currentCtxElement + 1;
    evalOptions.currentCtxElement = 0;
    if (result.__ast) {
      ast = [ast[0], ...result.__ast];
    }
    result = EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions);
  }
  for (let i = skippedForms.length - 1; i >= 0; --i) {
    result = skippedForms[i](result);
  }
  return result;
}

function EVAL_IMPLEMENTATION(ast, ctx, options, evalOptions) {
  //console.log(`EVAL CALLED FOR ${JSON.stringify(ast)}`)
  while (true) {
    ast = macroexpand(ast, ctx, options?.resolveString ?? false);                                   // by default do not resolve string

    if (!isArray(ast)) {                                                        // atom
      if (isString(ast)) {
        const value = $var$(ctx, ast, undefined, options, evalOptions);
        //console.log(`${JSON.stringify(resolveOptions)} var ${ast} resolved to ${isFunction(value)?'FUNCTION':''} ${JSON.stringify(value)}`)
        if (value !== undefined) {
          if (isFunction(value) && options["wantCallable"] !== true) {
            return ast
          } else {                                 // variable
            //console.log(`EVAL RETURN resolved var ${JSON.stringify(ast)}`)
            return value;
          }
        }
        //console.log(`EVAL RETURN resolved2 var ${resolveOptions && resolveOptions.resolveString ? ast : undefined}`)
        return options && options.resolveString ? ast : undefined;                                 // if string and not in ctx
      }
      //console.log(`EVAL RETURN resolved3 var ${JSON.stringify(ast)}`)
      return ast;
    }

    //console.log(`EVAL CONTINUE for ${JSON.stringify(ast)}`)

    // apply
    // c 2022 делаем macroexpand сначала, а не после
    // ast = macroexpand(ast, ctx, resolveOptions && resolveOptions.resolveString ? true: false);

    //console.log(`EVAL CONTINUE after macroexpand: ${JSON.stringify(ast)}`)
    if (!Array.isArray(ast)) return ast;                                                            // TODO: do we need eval here?
    if (ast.length === 0) return null;                                                              // TODO: [] => empty list (or, maybe return vector [])

    //console.log("EVAL1: ", JSON.stringify(resolveOptions),  JSON.stringify(ast))
    const [opAst, ...argsAst] = ast;

    const op = EVAL_IMPLEMENTATION(opAst, ctx, {... options, wantCallable: true}, evalOptions);                                 // evaluate operator

    if (typeof op !== 'function') {
      throw new Error('Error: ' + String(op) + ' is not a function');
    }

    if (isSF(op)) {                                                                                 // special form
      const sfResult = op(argsAst, ctx, options);
      return sfResult;
    }

    const args = argsAst.map(a => EVAL(a, ctx, options));                                           // evaluate arguments

    if (op.ast) {                                                                                   // Macro
      ast = op.ast[0];
      ctx = env_bind(op.ast[2], op.ast[1], args);                                                   // TCO
    } else {
      return unbox(
          args,
          (args) => {
            const fnResult = op.apply(op, args);
            return fnResult;
          },
          options?.streamAdapter);
    }
  }
} // EVAL


export function eval_lisp(ast, ctx, options) {
  const result = EVAL(ast, [ctx || {}, STDLIB], options || {resolveString: true});
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
