/**
 * Variadic argument support for LPE functions.
 *
 * Usage:
 *   ctx = {
 *     myfunc: makeVararg(["a:int", "b:fn"], (a, b, args, kwargs) => {
 *       // Template args (a, b) come first, then remaining args[] and kwargs{}
 *     }),
 *   }
 */

import { EVAL } from "./lisp";
import unbox from "./lisp.unbox";

function parseTemplate(template) {
  if (!Array.isArray(template)) {
    throw new Error("LPE vararg template must be array");
  }

  const varnames = [];
  let typesCast = {};
  let foundTypeObject = false;

  for (const entry of template) {
    if (foundTypeObject) {
      throw new Error(
        "LPE vararg template definition error: must be no arguments after type declaration"
      );
    }

    if (typeof entry === "string") {
      const match = entry.match(/^(.*):\s*(\w+)$/);
      if (match) {
        varnames.push(match[1]);
        typesCast[match[1].trim()] = match[2].trim().toLowerCase();
      } else {
        varnames.push(entry);
      }
    } else if (typeof entry === "object" && entry !== null) {
      foundTypeObject = true;
      typesCast = { ...typesCast, ...entry };
    } else {
      throw new Error(
        `LPE vararg template definition error: type ${typeof entry} is not supported`
      );
    }
  }

  function getType(varname) {
    if (varname in typesCast) {
      return typesCast[varname];
    }
    for (const [pattern, type] of Object.entries(typesCast)) {
      try {
        if (new RegExp(`^${pattern}$`).test(varname)) {
          return type;
        }
      } catch {
        // Invalid regex pattern - skip
      }
    }
    return undefined;
  }

  return { varnames, getType };
}

/**
 * Creates a variadic function with named template arguments.
 *
 * Template format: ["argName", "argName:type", { "pattern": "type" }]
 * - Type "fn" wraps the AST in a thunk (lazy evaluation)
 * - Other types evaluate immediately
 *
 * The wrapped function receives: ...templateArgs, remainingArgs[], remainingKwargs{}
 */
export default function makeVararg(template, fn) {
  const { varnames, getType } = parseTemplate(template);

  function varargHandler(ast, ctx, opt) {
    /**
     * Индексы позиционных аргументов
     * @type {number[]}
     */
    const positionalIndices = [];
    /**
     * Индексы аргументов, которые улетят в *args
     * @type {number[]}
     * */
    const argsIndices = [];
    /**
     * Индексы аргументов, которые улетят в **kwargs
     * @type {{[varname: string]: number}}
     * */
    const kwargIndices = {};

    /**
     * Количество входящих аргументов
     */
    const N = ast.length;
    /**
     * Массив длины N - имя для входящих аргументов
     * @type {string[]}
     */
    const varNameForPosition = new Array(N).fill('');

    for (let i = 0; i < N; i++) {
      const argAst = ast[i];

      if (Array.isArray(argAst) && argAst.length === 3 && argAst[0] === "=" && typeof argAst[1] === "string") {
        const [_,  varname, valueAst] = argAst;
        kwargIndices[varname] = i;
        ast[i] = valueAst;                                // Мы меняем ast (можно!) потому что часть с именем нам уже не нужна "a=..." => "..."
        varNameForPosition[i] = varname;                  // И прихраниваем имя переменной
      } else {
        argsIndices.push(i);                              // просто сохраняем индекс
      }
    }

    for (const varname of varnames) {                     // Раскидываем args и kwargs в позиционные аргументы
      if (varname in kwargIndices) {
        positionalIndices.push(kwargIndices[varname]);
        delete kwargIndices[varname]
      } else {
        const i = argsIndices.shift();
        positionalIndices.push(i);
        varNameForPosition[i] = varname;
      }
    }

    const evaluatedASTs = varNameForPosition.map((varname, i) => {    // вычисляем AST ориентируясь на тип переменной
      const type = getType(varname), myAst = ast[i];
      if (!type) {                                      // Тип не определен
        return EVAL(myAst, ctx, opt);                   // Просто вычисляем
      } else if (type === 'fn') {                       // тип "функция" - обернем
        return () => {
          return EVAL(myAst, ctx, opt);                 // Оборачиваем в функцию, это ни капли не смутит unbox. Тут где-то надо поиграться с контекстом чтоб передать эти аргументы
        };
      } else {                                          // некий известный тип
        return EVAL(['->' + type, myAst], ctx, opt);    // Обернем в функцию "->type", например, ["->int", ...]
      }
    });

    const self = this;

    return unbox(
        evaluatedASTs,
        (values) => {
          // Вычислились все аргументы, теперь их надо разложить по трем структурам данных
          const positionalArgs = positionalIndices.map(i => values[i]);
          const args = argsIndices.map(i => values[i]);
          const kwargs = Object.fromEntries(Object.entries(kwargIndices).map(([varname, i]) => [varname, values[i]]));
          // и запускаем
          return fn.apply(self, [...positionalArgs, args, kwargs]);
        },
        opt?.streamAdapter);
  }

  varargHandler.__isSpecialForm = true;
  return varargHandler;
}
