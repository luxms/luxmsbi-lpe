// @ts-check
import { isArray, isHash, isString, makeSF, isFunction, isArrayFunction, isObj } from "../lib/utils";
import { $getvar$, $setvar$ } from "../lisp.var";
import { EVAL } from "../lisp";
import { except } from "../lib/exception";
import unbox from "../lisp.unbox";



/** @type {ContextFunctionsObject} */
const _context = {};
export default _context;



_context[":="] = _context["assign"] = makeSF((ast, ctx, rs) => {
  /**
    * Оператор присваивания. Возвращает значение переменной после присваивания.
    *
    * Поддерживает присваивание в переменные и в свойства объектов/массивов.
    *
    * @usage assign(lvalue, rvalue)
    * @param lvalue [any] Левая часть присваивания (переменная или путь к свойству)
    * @param rvalue [any] Присваиваемое значение
    *
    * @example assign(x, 10) => 10
    *          assign(obj.key, 20) => 20  ## obj ==> { key: 20 }
    *          obj.a := (obj.b := 10) => 10  ## obj ==> { a: 10, b: 10 }
    * @category Работа с переменными | 1
    */
  if (isArray(ast[0])) {
    if (ast[0][0] !== ".") {
      throw except("LPE_LEFT_ARG_MUST_BE_LVALUE", ":=");
    }
    let varObj;
    if (isArray(ast[0][1])) {
      varObj = EVAL(ast[0][1], ctx, rs);
    } else {
      varObj = $getvar$(ctx, ast[0][1], rs);
      if (varObj === undefined) {
        throw except("LPE_VAR_NOT_FOUND", ast[0][1]);
      }
    }
    const keys = ast[0].slice(2).map(subast => {
      if (isString(subast)) {
        return subast;
      }
      return EVAL(subast, ctx, rs);
    });

    const toAccessableVar = (/** @type {*} */ obj) => {
      if (!isObj(obj) && obj !== undefined && obj !== null) {
        throw except("LPE_VAR_NOT_DOT_ACCESSIBLE", obj);
      }
      return obj === undefined || obj === null ? {} : obj;
    }

    return unbox(
      [varObj, ...keys, EVAL(ast[1], ctx, rs)],
      (data) => {
        let varObj = data[0];
        const keys = data.slice(1, -1);
        const value = data[data.length - 1];

        if (!isObj(varObj) && varObj !== undefined) {
          throw except("LPE_VAR_NOT_DOT_ACCESSIBLE", varObj);
        }
        for (let i = 0; i < keys.length - 1; ++i) {
          let key = keys[i];
          varObj[key] = toAccessableVar(varObj[key]);
          varObj = varObj[key];
        }
        return (varObj[keys[keys.length - 1]] = value);
      },
      rs?.streamAdapter,
    )

    for (let i = 0; i < keys.length - 1; ++i) {
      let key = keys[i];
      varObj[key] = varObj[key] || {};
      varObj = varObj[key];
    }
    return (varObj[keys[keys.length - 1]] = EVAL(ast[1], ctx, rs));
  }
  return $setvar$(ctx, ast[0], EVAL(ast[1], ctx, rs), rs);
});



_context["let"] = makeSF((ast, ctx, rs) => {
  /**
   * Создаёт локальные привязки переменных и выполняет выражения в их контексте.
   *
   * В качестве объекта привязок может быть одно из:
   * - `Array<[VarName, Value]>` - список пар ключ-значение
   * - `Hash` - объект с ключами и значениями
   * - `Function` - функция для получения значения переменной
   *
   * Функция принимает следующие аргументы:
   * - `key` - имя переменной или функции
   * - `value` - значение переменной, которое нужно ей установить. Если мы хотим получить значение, то value можно не передавать или передать `undefined`
   * - `options` - объект с дополнительными опциями
   *
   * В случае, если в качестве `bindings` передается хэш-таблица, новый объект контекста не будет создан.
   * Если будут переприсвоены значения переменных, изменения будут отражены на переданном объекте.
   *
   * @usage let(bindings, ...exprs)
   * @param bindings [Array | Object | Function] Список привязок или функция для получения значения переменной
   * @param exprs [any] Выражения для выполнения в контексте привязок
   *
   * @example let({{"x", 10}, {"y", 20}}, x + y) => 30
   *          let({{"name", "Alice"}}, println("Hello,", name), name) => Alice
   *          ## Вывод в консоль: "Hello, Alice"
   *          let({x = 10, y = 20}, x + y) => 30
   *          let((key) => if(key = "x", 10, key = "y", 20), x + y) => 30
   * @category Работа с переменными | 5
   * @tags return-support
   */
  let vars;
  let kvArray = false;
  if (isArray(ast[0]) && isString(ast[0][0])) {
    vars = [EVAL(ast[0], ctx, rs)];
  } else if (isHash(ast[0])) {
    vars = Object.entries(ast[0]).map(([k, v]) => EVAL(["list", ["$AST$", k], v], ctx, rs));
    kvArray = true;
  } else if (isArray(ast[0])) {
    vars = ast[0].map(val => {
      if (!isArray(val) || val.length !== 2) {
        throw except("LPE_FUNC_WRONG_ARG_TYPE", "let", "bindings", "Array<[Key, Value]> | Hash | Function", "Array<Any>");
      }
      return EVAL(["list", isString(val[0]) ? ["$AST$", val[0]] : val[0], val[1]], ctx, rs);
    });
    kvArray = true;
  } else if (isFunction(ast[0])) {
    vars = [ast[0]];
  } else {
    // Это не AST и не переданный вручную аргумент корректного типа
    throw except("LPE_FUNC_WRONG_ARG_TYPE", "let", "bindings", "Array<[Key, Value]> | Hash | Function", typeof ast[0]);
  }


  return unbox(
    vars,
    (vars) => {
      /** @type {*} */
      let newCtx = {};
      if (!kvArray) {
        vars = vars[0];
      }

      if (isArray(vars)) {
        vars.forEach((val) => {
          if (!isArray(val) || val.length !== 2 || !isString(val[0])) {
            throw except("LPE_FUNC_WRONG_ARG_TYPE", "let", "bindings", "Array<[Key, Value]> | Hash | Function", "Array<Any>");
          }
          newCtx[val[0]] = val[1];
        });
      } else if (isFunction(vars) || isHash(vars)) {
        newCtx = vars;
      } else {
        throw except("LPE_FUNC_WRONG_ARG_TYPE", "let", "bindings", "Array<[Key, Value]> | Hash | Function", typeof vars);
      }
      // На случай, если newCtx - функция, передаем {}, чтобы в него записывались локальные переменные
      return EVAL(['begin', ...ast.slice(1)], [newCtx, {}, ctx], rs);
    },
    rs?.streamAdapter,
  );
});



const letStarSF = _context["let*"] = _context["letseq"] = _context["letstar"] = makeSF((ast, ctx, rs) => {
  /**
   * Создаёт локальные привязки переменных последовательно: каждая следующая привязка
   * видит предыдущие (в отличие от let, где привязки независимы).
   *
   * Это форма, в которую компилируется VAR ... RETURN.
   *
   * @usage let*(bindings, ...exprs)
   * @param bindings [array] Список привязок [[имя, значение], ...]
   * @param exprs [any] Выражения для выполнения в контексте привязок
   *
   * @example letseq({{"x", 10}, {"y", x * 2}}, y) => 20
   * @category Работа с переменными | 6
   * @tags return-support
   */
  let bindings = ast[0];
  if (!isArray(bindings)) {
    throw new Error('LISP: let* expression invalid bindings form');
  }
  if (isString(bindings[0]) && isArrayFunction(bindings[0])) {                                       // strip outer "[" array constructor
    return letStarSF([bindings.slice(1), ...ast.slice(1)], ctx, rs);
  }
  if (bindings.length > 0 && isString(bindings[0])) {                                                // single-pair shape ["name", valueAst]
    return letStarSF([[bindings], ...ast.slice(1)], ctx, rs);
  }
  if (bindings.length === 0) {
    return EVAL(['begin', ...ast.slice(1)], ctx, rs);
  }
  let pair = bindings[0];
  if (isArray(pair) && isString(pair[0]) && isArrayFunction(pair[0])) {                              // strip "[" off this pair
    pair = pair.slice(1);
  }
  if (!isArray(pair) || pair.length !== 2) {
    throw new Error('LISP: let* binding must be a [name, value] pair');
  }
  const [nameAst, valueAst] = pair;
  const name = isString(nameAst) ? nameAst : EVAL(nameAst, ctx, rs);
  const value = EVAL(valueAst, ctx, rs);
  return unbox(
    [name, value],
    ([name, resolved]) => letStarSF(
      [bindings.slice(1), ...ast.slice(1)],
      [{[String(name)]: resolved}, ctx],
      rs),
    rs?.streamAdapter);
});



_context["def"] = makeSF((ast, ctx, rs) => {
  /**
   * Определяет переменную в текущем контексте.
   *
   * @usage def(name, value)
   * @param name [string] Имя переменной
   * @param value [any] Значение
   *
   * @example def(x, 42) => 42
   * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
   * @category Работа с переменными | 10
   */
  // update current environment
  const value = EVAL(ast[1], ctx, rs);
  return unbox(
    [value],
    ([value]) => {
      const result = $setvar$(ctx, ast[0], value, rs);
      return result;
    },
    rs?.streamAdapter,
  );
});



_context["undef"] = makeSF((ast, ctx, rs) => {
  /**
   * Удаляет переменную из текущего контекста и возвращает её значение.
   *
   * @usage undef(name)
   * @param name [string] Имя переменной
   *
   * @example begin(\
   *          |  x := 42,\
   *          |  undef(x),\
   *          |  x\
   *          |) => undefined
   *
   *          begin(\
   *          |  x := 42,\
   *          |  undef(x)\
   *          |) => 42 ## Сама функция возвращает значение удаленной переменной
   *
   *          begin(\
   *          |  x := 42,\
   *          |  let({{x, 12}}, prn(x), undef(x), prn(x)),\
   *          |  x\
   *          |) => 42
   *          ## Напечатается сперва 12, затем 42
   *          ## При этом удалится локальная переменная x, а глобальная останется
   *
   *          begin(\
   *          |  x := 42,\
   *          |  varName := "x",\
   *          |  undef(_"varName"),\
   *          |  x\
   *          |) => undefined
   *          ## Если передано выражение, то оно вычислится
   *          ## Удалится переменная, имя которой равно значению выражения
   * @category Работа с переменными | 11
   */

  const varName = isString(ast[0]) ? ast[0] : EVAL(ast[0], ctx, rs);

  /**
   * @param {string} varName
   * @param {*} ctx
   * @returns {{ value: *, found: boolean }}
   */
  const undefFunc = (varName, ctx) => {
    if (isArray(ctx)) {
      for (const subctx of ctx) {
        const res = undefFunc(varName, subctx);
        if (res.found) {
          return res;
        }
      }
    } else if (isHash(ctx)) {
      if (Object.hasOwn(ctx, varName)) {
        const res = { value: ctx[varName], found: true };
        delete ctx[varName];
        return res;
      }
    }
    return { value: undefined, found: false };
  };

  return unbox(
    [varName],
    ([varName]) => {
      return undefFunc(String(varName), ctx).value;
    },
    rs?.streamAdapter,
  );
});






_context["resolve"] = makeSF((ast, ctx, rs) => {
  /**
   * Получить значение переменной.
   *
   * @usage resolve(name)
   * @param name [string] Имя переменной
   *
   * @example resolve(x) => значение переменной x
   * @category Работа с переменными | 15
   */
  const result = $getvar$(ctx, ast[0], rs);
  return result;
});



_context["ctx"] = makeSF((ast, ctx, rs) => {
  /**
   * Получить объект с переменными.
   *
   * @usage ctx(...key)
   * @param key [string] Имя переменной
   *
   * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
   *          ctx("x") ## Ошибка: в функции ctx нельзя использовать выражения
   * @category Работа с переменными | 16
   */
  //FIXME will work only for single keys, we want: ctx(k1,k2,k3.df)
  /** @type {Record<string, *>} */
  let ret = {}
  ast.map((/** @type {string} */ k) => ret[k] = $getvar$(ctx, k, rs))
  return ret
});



_context[".-"] = _context["property"] = makeSF((ast, ctx, options) => {
  /**
   * Получает или устанавливает свойство объекта.
   *
   * @usage property(obj, propName)
   * @param obj [object | array] Объект
   * @param propName [string] Имя свойства
   *
   * @usage property(obj, propName, value)
   * @param obj [object | array] Объект
   * @param propName [string] Имя свойства
   * @param value [any] Значение для установки
   *
   * @example property({a = 1}, "a") => 1
   *          property({a = 1}, "b", 2) => 2 ## Значение объекта: { a:1, b:2 }
   * @category Работа с переменными | 20
   */                                                          // get or set attribute
  const [obj, propertyName, value] = [
    EVAL(ast[0], ctx, options),
    isString(ast[1]) ? ast[1] : EVAL(ast[1], ctx, options),
    EVAL(ast[2], ctx, options),
  ];
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
});
