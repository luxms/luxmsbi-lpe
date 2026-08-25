import { except } from "../lib/exception.js";
import { catchReturn, GLOBAL_CONTEXT, isArray, isString, makeSF, ReturnThrow } from "../lib/utils.js";
import { EVAL, eval_lisp } from "../lisp";
import unbox from "../lisp.unbox.js";
import { parse } from "../lpep.js";
import { $getvar$ } from "./variables.js";

/** @type {ContextObject} */
export const CONTEXT_STD = {

  // parser не умеет их считывать.
  // Это здесь на всякий случай, если где-то такое AST формируется
  "`": makeSF((ast, ctx) => ast[0]),

  // Системная функция, чтобы вернуть AST без изменений.
  "$AST$": makeSF((ast) => ast[0]),
};

/** @type {ContextFunctionsObject} */
const _context = CONTEXT_STD;



_context["()"] = _context['identity'] = a => {
  /**
   * Возвращает переданный аргумент.
   *
   * @usage identity(value)
   * @param value [any] Значение
   *
   * @example identity(5) => 5
   *          (1 + 2) * 3 => 9 ## Круглые скобки являются вызовом этой функции
   * @category 1
   */
  return a;
};



_context['"'] = _context["'"] = _context["q"] = makeSF((ast, ctx, rs) => {
  /**
   * Создает строку или получает значение переменной.
   *
   * @usage "value"
   * @param value [string] Значение
   *
   * @usage _"variable"
   * @param variable [string] Имя переменной
   *
   * @example "hello" => "hello"
   *          begin(x := 12, _"x") => 12
   *          begin(x := 12, q("x", "_")) => 12
   * @category 5
   */
  if (ast[1] === '_') return $getvar$(ctx, ast[0], rs);
  else return String(ast[0]);
});



_context['apply'] = (f, ...b) => {
  /**
   * Применяет функцию к списку аргументов.
   *
   * @usage apply(fn, ...args)
   * @param fn [function] Функция
   * @param args [any] Аргументы функции
   *
   * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
   * @category 10
   */
  return f.apply(f, b)
};



_context['_get_obj_meth_'] = _context['~>'] = (obj, propName) => {
  // Internal helper used by the ~> operator (no docstring on purpose so it
  // doesn't need a localization entry — it is never user-callable by name).
  // Returns obj[name]. If the value is a function, it is bound to obj so the
  // call site can invoke it standalone with `this` preserved. Non-functions
  // (objects, primitives, undefined) pass through unchanged so property chains
  // like  window ~> document ~> location ~> replace  compose naturally.
  if (obj == null) {
    throw new Error(`~> receiver is ${obj}; cannot read '${propName}'`);
  }
  const v = obj[propName];
  return (typeof v === 'function') ? v.bind(obj) : v;
};



_context['invoke'] = _context['_call_obj_meth_'] = (obj, methodName, ...args) => {
  /**
   * Вызов метода объекта.
   *
   * @usage invoke(obj, method, ...args)
   * @param obj [object] Объект
   * @param method [string] Имя метода
   * @param args [any] Аргументы метода
   *
   * @example invoke({1, 2, 3}, "toString") => "1,2,3"
   *          invoke({1, 2, 3}, "push", 4) => [1,2,3,4]
   *          invoke({1, 2, 3}, concat, {4, 5, 6}) => [1,2,3,4,5,6]
   *          invoke({1, 2, 3}, "con" + "cat", {4, 5, 6}) => [1,2,3,4,5,6]
   * @category 12
   */
  return obj[methodName].apply(obj, args);
};



// Для обратной совместимости с версиями до 1.6.0 "->" эквивалентен "."
_context['.'] = _context['->'] = _context["threadFirst"] = makeSF((ast, ctx, rs) => {
  /**
   * Если правый аргумент - вызов функции, позволяет выполнять последовательные вызовы (thread-first).
   *
   * Подставляет результат левого выражения первым аргументом в следующий вызов.
   *
   * Если правый аргумент - числовая или строковая константа,
   * пытаемся взять значение объекта левого выражения по ключю правого выражения.
   *
   * Для обращения к элементам массива используйте числовые индексы в круглых скобках: a.(0), a.(1).(0) и т.д.
   *
   * @usage explression.func(...args)
   * @param explression [any] Значение, подставляемое первым аргументом в функцию
   * @param func [function] Вызываемая функция
   * @param args [any] Остальные аргументы функции
   *
   * @usage obj.key
   * @param obj [object | array] Объект из которого необходимо взять значение по ключу
   * @param key [string | number] Ключ (строковая константа должна быть без кавычек)
   *
   * @example date.dateShift(-1, "m").toStart("m") => Дата начала предыдущего месяца
   * @example {1, 2, 3}.(1) => 2
   *          {a = 2, b = 3}.b => 3
   *          {{1}}.(0).(0) => 1
   * @category 20
   */
  // thread first macro
  // императивная лапша для макроса ->
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  let acc = ast[0];

  for (let arr of ast.slice(1)) {
    if (!isArray(arr)) {
      arr = [".-", acc, arr];                                                 // это может быть обращение к хэшу или массиву через индекс или ключ....
    } else if (arr[0] === "()" && arr.length === 2) {
      arr = [".-", acc, arr];
    } else {
      arr = arr.slice(0);                                                     // must copy array before modify
      arr.splice(1, 0, acc);
      // подставляем "вычисленное" ранее значение в качестве первого аргумента... классика thread first
    }
    acc = arr;
  }
  if (!isArray(acc)) {
    return ["resolve", acc];
  }
  return EVAL(acc, ctx, rs);
});



// Для обратной совместимости с версиями до 1.6.0 "->" эквивалентен "."
_context['..'] = _context['->>'] = _context["threadLast"] = makeSF((ast, ctx, rs) => {
  /**
   * Позволяет выполнять последовательных вызовов (thread-last).
   *
   * Подставляет предыдущий результат последним аргументом в следующий вызов.
   *
   * @usage expression->>func(...args)
   * @param explression [any] Значение, подставляемое последним аргументом в функцию
   * @param func [function] Вызываемая функция
   * @param args [any] Остальные аргументы функции
   *
   * @example fn({a}, a * 2)->>map({1, 2, 3}) => [2, 4, 6]
   *          ## Выполняется аналогично "map({1, 2, 3}, fn({a}, a * 2))"
   * @category 21
   */
  // thread last macro
  // императивная лапша для макроса ->>
  // надо вот так: https://clojuredocs.org/clojure.core/-%3E%3E
  let acc = ast[0];
  for (let arr of ast.slice(1)) {
    arr.push(acc);
    acc = arr;
  }
  return EVAL(acc, ctx, rs);
});



_context['nvl'] = _context['coalesce'] = makeSF((ast, ctx, rs) => {
  /**
   * Возвращает первый не-null/undefined аргумент.
   *
   * При отсутствии аргументов возвращает null.
   *
   * При нахождении подходящего аргумента возвращает его и не выполняет остальные аргументы.
   *
   * @usage nvl(...arg)
   * @param arg [any] Аргументы
   *
   * @example nvl(null, undefined, 42) => 42
   *          nvl(1, 2, 3) => 1
   */

  for (const arg of ast) {
    const val = eval_lisp(arg, ctx, rs);
    if (val !== null && val !== undefined) {
      return val;
    }
  }
  return null;
});



_context['println'] = (...args) => {
  /**
    * Выводит значения в консоль. В случае, если значение не является строкой, оно выводится как JSON.
    *
    * @usage println(...args)
    * @param args [any] Значения для вывода
    *
    * @example println("Hello", "World") => Hello World
    *          println({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
    * @category Вывод | 1
    */
  return console.log(args.map(x => isString(x) ? x : JSON.stringify(x)).join(' '));
};



_context['prn'] = (...args) => {
  /**
    * Выводит JSON-представление значений в консоль. Строки оборачиваются в двойные кавычки.
    *
    * @usage prn(...args)
    * @param args [any] Значения для вывода
    *
    * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
    *          prn({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
    * @category Вывод | 2
    */
  return console.log(args.map((x) => JSON.stringify(x)).join(' '));
};



_context['print'] = (...args) => {
  /**
   * Выводит значения в консоль (без JSON форматирования).
   *
   * @usage print(...args)
   * @param args [any] Значения для вывода
   *
   * @example print("Hello", "World") => Hello World
   *          print(1, 2, 3) => 1 2 3
   *          print({1,{1,{1,{1}}}}) => [ 1, [ 1, [ 1, [Array] ] ] ]
   * @category Вывод | 3
   */
  return console.log(...args);
};



_context['throw'] = a => {
  /**
   * Выбрасывает исключение.
   *
   * @usage throw(error)
   * @param error [string] Ошибка для выбрасывания
   *
   * @example throw("Error message")
   * @category Исключения | 1
   */
  throw (a);
};



_context['try'] = makeSF((ast, ctx, rs) => {
  /**
   * Обработка исключений.
   *
   * @usage try(expr, errorName, catch)
   * @param expr [any] Выражение для выполнения
   * @param errorName [string] Имя, по которому можно обратиться к объекту исключения
   * @param catch [any] Выражение для выполнения при ошибке
   *
   * @example try(throw("Текст ошибки"), ex, println("Ошибка:", ex)) => Ошибка: Текст ошибки
   * @category Исключения | 2
   */
  if (!isString(ast[1])) {
    throw except("LPE_FUNC_WRONG_ARG_TYPE", "errorName", "string", typeof ast[1]);
  }
  try {
    return EVAL(ast[0], ctx, rs);
  } catch (e) {
    return EVAL(ast[2], [{ [ast[1]]: e }, ctx], rs);
  }
});



const beginSF = _context['begin'] = makeSF((ast, ctx, options) => {
  /**
   * Последовательно выполняет несколько выражений и возвращает результат последнего.
   *
   * @usage begin(...exprs)
   * @param exprs [any] Выражения для выполнения
   *
   * @example begin(println("Hello"), println("World"), 1 + 2) => 3
   *          ## Выведет "Hello", "World" в консоль
   * @category Управление выполнением | 1
   * @tags return-support
   */
  if (ast.length === 0) return null;
  return catchReturn(() => {
    const firstOperator = EVAL(ast[0], ctx, options);
    return unbox(
      [firstOperator],
      // Если один аргумент - возвращаем значение
      ([firstResult]) => ast.length === 1 ? firstResult : beginSF(ast.slice(1), ctx, options),
      options?.streamAdapter,
    );
  });
});



const ifSF = _context['if'] = makeSF((ast, ctx, rs) => {
  /**
   * Получение выражения по условию.
   *
   * @usage if(cond1, then1, cond2, then2, ..., else)
   * @param cond [boolean] Условие
   * @param then [any] Выражение, выполняемое если условие истинно
   * @param else [any] Выражение, выполняемое если все условия ложны
   *
   * @usage if(cond1, then1, cond2, then2, ...)
   * @param cond [boolean] Условие
   * @param then [any] Выражение, выполняемое если условие истинно
   *
   * @example if(5 > 3, "больше", 5 < 3, "меньше", "равны") => "больше"
   *          if(5 > 5, "больше", 5 < 5, "меньше", "равны") => "равны"
   *          if(5 > 5, "больше", 5 < 5, "меньше") => undefined
   * @category Управление выполнением | 5
   */
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, rs);
  const condition = EVAL(ast[0], ctx, {...rs, resolveString: false});
  return unbox(
    [condition],
    ([condition]) => {
      if (condition) {
        return EVAL(ast[1], ctx, rs);
      } else {
        return ifSF(ast.slice(2), ctx, rs);
      }
    },
    rs?.streamAdapter,
  );
});



_context['do'] = makeSF((ast, ctx, rs) => {
  /**
   * Выполнение выражения в цикле до тех пор, пока условие выполняется.
   *
   * Если условие отсутствует, выполняется единыжды.
   *
   * Условие вычисляется после выполнения выражения.
   * @usage do(condition, expr)
   * @param condition [boolean] Условие
   * @param expr [any] Выражения для выполнения
   *
   * @usage do(expr)
   * @param expr [any] Выражения для выполнения единыжды
   *
   * @example begin(x := 0,\
   *         |      do(x < 10, x := x + 1)\
   *         |) => 10
   * @category Управление выполнением | 10
   */
  if (ast.length === 0) return undefined;
  if (ast.length === 1) return EVAL(ast[0], ctx, rs);                                          // one arg - by convention return the argument

  const maxLoopIterations = rs?.maxLoopIterations ?? GLOBAL_CONTEXT.DEFAULT_MAX_LOOP_ITERATIONS;

  let iter = 0;

  const unboxing = (/** @type {any[]} */[expr]) => {
    if (iter++ >= maxLoopIterations) {
      throw new Error(`The maximum number of iterations (${maxLoopIterations}) is exceeded. Check the condition or change the limit in the settings.`);
    }
    return unbox(
      [EVAL(ast[0], ctx, rs)],
      ([cond]) => cond ? unbox([EVAL(ast[1], ctx, rs)], unboxing, rs?.streamAdapter) : expr,
      rs?.streamAdapter,
    );
  };

  return unbox(
    [EVAL(ast[1], ctx, rs)],
    unboxing,
    rs?.streamAdapter,
  );
});



_context['return'] = makeSF((ast, ctx, rs) => {
  /**
  * Прерывает выполнение текущей функции и возвращает результат.
  *
  * Работает для [созданных функций]($func-fn), [let]($func-let) и [begin]($func-begin).
  *
  * @usage return(value)
  * @param value [any] Возвращаемое значение.
  *
  * @example {1, 2, 3, 4}.map(x =>\
  *          |  begin(\
  *          |     if(x < 3, return(-1)),\
  *          |     x * 2\
  *          |  )\
  *          |) => [-1, -1, 6, 8]
  * @category Управление выполнением | 15
  */
  throw new ReturnThrow(EVAL(ast[0], ctx, rs));
});



_context['catchReturn'] = makeSF((ast, ctx, rs) => {
  /**
   * Отлавливает вызов функции [return]($func-return) и возвращает результат.
   *
   * @usage catchReturn(expr)
   * @param expr [any] Выражение, в котором используется функция return.
   *
   * @category Управление выполнением | 16
   * @tags hidden
   */
  return catchReturn(() => EVAL(ast[0], ctx, rs));
});



_context['rep'] = makeSF((ast, ctx, rs) => {
  /**
   * Вычисляет AST в виде строки и возвращает JSON-представление результата.
   *
   * @usage rep(str)
   * @param str [string] Строка с AST-деревом
   *
   * @example rep('["+", 1, 2]') => "3"
   * @category Интерпретатор | 1
  */
  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([newAst]) => EVAL(["jsonStringify", JSON.parse(newAst)], ctx, rs),
    rs?.streamAdapter,
  );
});



_context['eval'] = (a) => {
  /**
   * Вычисляет LPE-AST в контексте STDLIB. Другие контексты будут недоступны.
   *
   * @usage eval(expr)
   * @param expr [ast] LPE-выражение
   *
   * @example eval({"+", 1, 2}) => 3
   * @category Интерпретатор | 2
   */
  return eval_lisp(a);
};



_context['eval_ast'] = makeSF((ast, ctx, rs) => {
  /**
   * Вычисляет LPE-AST в этом же контексте.
   *
   * @usage eval_ast(expr)
   * @param expr [AST] AST-дерево
   *
   * @example eval_ast({"+", 1, 2}) => 3
   * @category Интерпретатор | 3
   */
  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([newAst]) => EVAL(newAst, ctx, rs),
    rs?.streamAdapter,
  );
});



_context['eval_lpe'] = makeSF((ast, ctx, rs) => {
  /**
   * Вычисляет LPE-код из строки.
   *
   * @usage eval_lpe(str)
   * @param str [string] Строка с LPE-кодом
   *
   * @example eval_lpe("1 + 2") => 3
   * @category Интерпретатор | 4
   */

  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([lpeCode]) => {
      const parsed = parse(lpeCode, rs);
      return EVAL(parsed, ctx, rs);
    },
    rs?.streamAdapter,
  );
});



_context['set_options'] = makeSF((ast, ctx, rs) => {
  /**
   * Устанавливает опции выполнения для выражения.
   *
   * @usage set_options(options, expr)
   * @param options [object|array] Опции (объект или массив пар ключ-значение)
   * @param expr [any] Выражение для выполнения с опциями
   *
   * @category Интерпретатор | 100
   * @tags hidden
   */
  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([options]) => {
      if (isArray(options)) {
        // [["key1", "val1"], ["key2", "val2"]] => {key1: "val1", key2: "val2"}
        options = Object.fromEntries(options);
      }
      return EVAL(ast[1], ctx, { ...rs, ...options });
    },
    rs?.streamAdapter,
  );
});
