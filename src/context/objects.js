import { except } from "../lib/exception.js";
import { catchReturn, isArray, isArrayFunction, isFunction, isHash, isNumber, isNumberLike, isObj, isString, makeSF } from "../lib/utils.js";
import { EVAL } from "../lisp";
import unbox from "../lisp.unbox.js";
import makeVararg from "../lisp.vararg.js";

/** @type {ContextObject} */
export const CONTEXT_OBJECTS = {
};

/** @type {ContextFunctionsObject} */
const _context = CONTEXT_OBJECTS;



_context["new"] = (...args) => {
  /**
   * Создаёт новый экземпляр класса
   *
   * @usage new(class, ...args)
   * @param class [function] Класс
   * @param args [any] Аргументы конструктора
   *
   * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
   * @category Создание объектов | 1
   */
  return new (args[0].bind.apply(args[0], args));
};



_context["vector"] = _context["{"] = makeVararg([], (args, kwargs) => {
  /**
   * Создаёт гибридный массив (kwargs array) из аргументов.
   *
   * При передаче именнованных аргументов добавляет их как именованные свойства.
   *
   * При отсутствии kwargs создаёт обычный массив.
   * При отсутствии args создаёт хэш-таблицу.
   * @usage vector(...args, ...kwargs)
   * @param args [any] Элементы позиционного массива
   * @param kwargs [any] Именованные элементы объекта
   *
   * @example vector(1, 2, 3) => [1, 2, 3]
   *          vector(1, 2, a = 3, b = 4) => [1, 2, a: 3, b: 4]
   *          vector(a = 3, b = 4) => {a: 3, b: 4}
   * @category Создание объектов | 2
   */
  return Object.keys(kwargs).length ? args.length ? Object.assign(args, kwargs) : kwargs : args;
});



_context["list"] = _context["array"] = _context["["] = (...args) => {
  /**
   * Создаёт список (массив) из аргументов
   *
   * @usage list(...args)
   * @param args [any] Элементы списка
   *
   * @example list(1, 2, 3) => [1, 2, 3]
   *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
   * @category Создание объектов | 3
   */
  return args;
};



_context["tuple"] = makeVararg([], (args, kwargs) => {
  /**
   * Создаёт гибридный массив (kwargs array) из аргументов
   *
   * При передаче именнованных аргументов добавляет их как именованные свойства
   * @usage tuple(...args, ...kwargs)
   * @param args [any] Элементы позиционного массива
   * @param kwargs [any] Именованные элементы объекта
   *
   * @example tuple(1, 2, 3, a=1, b=2) => [1, 2, 3, a: 1, b: 2]
   *          tuple(1, 2, 3) => [1, 2, 3]
   *          tuple(a=1, b=2) => [a: 1, b: 2] ## Является массивом
   *          (1, 2, 3) => [1, 2, 3] ## Перечисление в скобках является вызовом функции tuple
   * @category Создание объектов | 4
   */
  return Object.assign(args, kwargs);
});



_context["hash"] = makeVararg([], (_, kwargs) => {
  /**
   * Создаёт хэш-таблицу из именованных аргументов.
   *
   * Без аргументов возвращает пустая хэш-таблица.
   *
   * Позиционные аргументы игнорируются — для смешанных структур используйте [vector]($func-vector).
   * @usage hash(...kwargs)
   * @param kwargs [any] Именованные элементы
   *
   * @example hash() => {}
   *          hash(a = 1, b = 2) => {a: 1, b: 2}
   *          {=} => {} ## то же, что hash()
   * @category Создание объектов | 5
   */
  return kwargs;
});



_context["makeHash"] = makeSF((ast, ctx, rs) => {
  /**
   * Создаёт хэш-таблицу из именованных аргументов.
   *
   * Без аргументов возвращает пустая хэш-таблица.
   *
   * Позиционные аргументы игнорируются — для смешанных структур используйте [vector]($func-vector).
   *
   * В отличие от [hash]($func-hash), эта функция выполняет выражения, записанные в качестве имен ключей.
   *
   * @usage makeHash(...kwargs)
   * @param kwargs [any] Именованные элементы
   *
   * @example makeHash() => {}
   *          makeHash(a = 1, b = 2) => {a: 1, b: 2}
   *          makeHash(1+2 = 'test') => {3: 'test'}
   * @category Создание объектов | 6
   */
  return unbox(
    ast
      .filter((/** @type {AST} */ subast) => isArray(subast) && subast[0] === "=" && subast.length === 3)
      .map((/** @type {AST} */ subast) => [EVAL(subast[1], ctx, rs), EVAL(subast[2], ctx, rs)])
      .flat(),

    // В evaled сглаженный массив вычисленных ключей, значений по порядку
    (evaled) => Object.fromEntries(
      evaled.reduce((acc, val, idx) => {
        if (idx % 2 === 0) {
          acc.push([val]);
        } else {
          acc[acc.length - 1].push(val);
        }
        return acc;
      }, [])
    ),

    rs?.streamAdapter,
  );
});



_context["range"] = (start, end, step) => {
  /**
   * Возвращает массив чисел в диапазоне [start, end) с шагом step.
   *
   * @usage range(end)
   * @param end [number] Конечное значение
   *
   * @usage range(start, end)
   * @param start [number] Начальное значение
   * @param end [number] Конечное значение
   *
   * @usage range(start, end, step)
   * @param start [number] Начальное значение
   * @param end [number] Конечное значение
   * @param step [number] Шаг
   *
   * @example range(5) => [0, 1, 2, 3, 4]
   *          range(1, 5) => [1, 2, 3, 4]
   *          range(5, 1, -2) => [5, 3]
   * @category Создание объектов | 10
   */
  if (end === undefined) {
    end = start;
    start = 0;
  }
  if (step === undefined || step == 0) {
    step = 1;
  }
  start = +start; end = +end; step = +step;

  const result = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    result.push(i);
  }
  return result;
};



_context["repeat"] = makeSF((ast, ctx, rs) => {
  /**
   * Создает массив из повторений значения n раз.
   *
   * Каждое значение вычисляется заново на каждой итерации.
   *
   * @usage repeat(n, val)
   * @param n [number] Количество повторений
   * @param val [any] Значение для повторения
   *
   * @example repeat(3, 5) => [5, 5, 5]
   *          begin(
   *          |  x := 0,
   *          |  repeat(2, x := x + 1)
   *          |) => [1, 2]
   *          repeat(3, x := nvl(_"x", 0) + 1) => [1, 2, 3]
   *          begin(
   *          |  arr := repeat(2, {}),
   *          |  arr.(0).(0) := 12,
   *          |  arr
   *          |) => [[12], []]
   * @category Создание объектов | 15
   */
  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([n]) => {
      return unbox(
        [...Array(n)].map(() => EVAL(ast[1], ctx, rs)),
        (result) => result,
        rs?.streamAdapter,
      );
    },
    rs?.streamAdapter,
  )
});



_context["⍴"] = _context["reshape"] = (len, ...values) => {
  /**
   * Создаёт массив заданной длины, заполняя его значениями по циклу.
   *
   * @usage reshape(len, ...values)
   * @param len [number] Длина массива
   * @param values [any] Значения для заполнения
   *
   * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
   * @category Создание объектов | 16
   */
  return Array.apply(null, Array(len)).map((_, idx) => values[idx % values.length]);
};



_context["zip"] = (/** @type {Array<Array<*>>} */ arrays, zipByMinLength) => {
  /**
   * Объединяет массивы по индексам в кортежи.
   *
   * @usage zip(arrays)
   * @param arrays [Array<Array>] Массивы для объединения
   *
   * @usage zip(arrays, minimize)
   * @param arrays [Array<Array>] Массивы для объединения
   * @param minimize [boolean] Минимизировать длину результата до минимальной длины входных массивов
   *
   * @example zip({{1, 2}, {3, 4}}) => [[1, 3], [2, 4]]
   *          zip({{1, 2}, {3}}) => [[1, 3], [2, undefined]]
   *          zip({{1}, {2, 3}, {4}}) => [[1, 2, 4], [undefined, 3, undefined]]
   *          zip({{1}, {2, 3}, {4}}, true) => [[1, 2, 4]]
   * @category Создание объектов | 20
   */
  const len = zipByMinLength ? Math.min(...arrays.map(a => a.length)) : Math.max(...arrays.map(a => a.length));
  return [...Array(len)].map((_, i) => arrays.map(a => a[i]));
};



_context["fn"] = makeSF((ast, ctx, rs) => {
  /**
   * Создаёт анонимную функцию.
   *
   * В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
   * Это позволяет вызывать себя рекурсивно.
   *
   * @usage fn(args, body)
   * @param args [array] Список аргументов
   * @param body [any] Тело функции
   *
   * @example fn({x}, x * x) => функция возведения в квадрат
   *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
   *
   *          factorial := fn({x}, if(x < 2, 1, x * $this$(x - 1)));\
   *          factorial(5) => 120
   * @category Создание объектов | 30
   * @tags return-support
  */
  /** @type {string[]} */
  const argNames = [];
  if (isString(ast[0])) {
    argNames.push(ast[0]);
  } else if (isArray(ast[0])) {
    argNames.push(...(isArrayFunction(ast[0][0]) ? ast[0].slice(1) : ast[0]));
  } else {
    throw except("LPE_FUNC_WRONG_ARG_TYPE", "fn", "args", "VarName | Array<VarName>", typeof ast[0]);
  }
  if (argNames.some(name => !isString(name))) {
    throw except("LPE_FUNC_WRONG_ARG_TYPE", "fn", "args", "VarName | Array<VarName>", "Array<Any>");
  }
  return EVAL(['->fn', ast[1], ...argNames], ctx, rs);

  // const f = (/** @type {any[]} */...args) => catchReturn(() =>
  //   EVAL(ast[1], [Object.fromEntries(argNames.map((n, idx) => [n, args[idx]])), ctx], rs)
  // );
  // TODO: Remove macro
  // f.ast = [["catchReturn", ast[1]], ctx, ast[0]];                                              // f.ast compresses more than f.data
  // return f;
});



/** @returns {function(...[*]): Promise<Awaited<*>[]|void>|*|null|undefined} */
_context["->fn"] = _context["toFn"] = _context["defFn"] = makeSF((ast, ctx, rs) => {
  /**
   * Преобразует выражение в функцию.
   *
   * В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
   * Это позволяет вызывать себя рекурсивно.
   *
   * @usage toFn(body, ...argNames)
   * @param body [any] Тело функции
   * @param argNames [string] Имена аргументов функции
   *
   * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
   *
   *          factorial := toFn(if(x < 2, 1, x * $this$(x - 1)), x);\
   *          factorial(5) => 120
   * @category Создание объектов | 31
   */
  const func = (/** @type {any[]} */...args) => catchReturn(() => {
    /** @type {Record<string, any>} */
    const argsCtx = {$this$: func};
    ast.slice(1).forEach((/** @type {AST} */ argAst, /** @type {number} */ i) => {
      // Считаем, что ast начиная с первого - это названия переменных и что они ничем не обернуты
      if (isString(argAst)) {
        argsCtx[argAst] = args[i];
      }
    })
    // Нужно ли UNBOX?
    let result = EVAL(ast[0], [argsCtx, ctx], rs);
    if (isFunction(result)) {                                                         // Непонятно как быть,
      result = result(...args);                                                       //            по-разному можно коллбэк
    }                                                                                 //                                  объявить
    return result;
  });

  return func;
});



_context["=>"] = _context["lambda"] = makeSF((ast, ctx, rs) => {
  /**
   * Создаёт функцию с альтернативным синтаксисом.
   *
   * Поддерживает два варианта вызова:
   * 1. С одним аргументом: arg => body.
   * 2. С кортежем аргументов: (arg1, arg2 ...) => body.
   *
   * В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
   * Это позволяет вызывать себя рекурсивно.
   *
   * @usage arg => body
   * @param arg [string] Имя единственного аргумента
   * @param body [any] Тело функции
   *
   * @usage (...args) => body
   * @param args [string] Имя аргумента
   * @param body [any] Тело функции
   *
   * @example {1, 2, 3}.map(x => x * 2) => [2, 4, 6]
   *          (x, y) => x + y => Функция сложения
   *          lambda((x, y), x + y) => Функция сложения
   *          x => if(x < 2, 1, x * $this$(x - 1)) => Рекурсивная функция факториала
   * @category Создание объектов | 32
   */
  let argNames = [];
  if (ast[0]?.[0] === 'tuple' || ast[0]?.[0] === '()') argNames = ast[0].slice(1);
  else argNames = [ast[0]];
  return EVAL(['->fn', ast[1], ...argNames], ctx, rs);                                    // Подготавливает аргументы в другом порядке и вызывает ->fn
});



_context["count"] = _context["length"] = (a) => {
  /**
   * Возвращает длину массива или строки.
   *
   * @usage count(obj)
   * @param obj [array|string] Объект для подсчёта длины
   *
   * @example count({1, 2, 3}) => 3
   *          count("hello") => 5
   * @category Работа с массивами | 1
   */
  return a.length;
};



_context["empty?"] = _context["empty"] = (a) => {
  /**
   * Проверяет, является ли массив пустым
   *
   * @usage empty(array)
   * @param array [array] Массив
   *
   * @example empty({}) => true
   *          empty({1, 2}) => false
   * @category Работа с массивами | 2
   */
  return isArray(a) ? a.length === 0 : false;
};



_context["reverse"] = (arr) => {
  /**
   * Возвращает массив в обратном порядке.
   *
   * @usage reverse(arr)
   * @param arr [array] Массив
   *
   * @example reverse({1, 2, 3}) => [3, 2, 1]
   *          reverse({1, 2, 3, a = 10}) => [3, 2, 1, a: 10] ## Именованные значения сохраняются
   * @category Работа с массивами | 5
  */
  /** @type {ObjectLike} */
  const res = [];
  Object.entries(arr).reverse().forEach(([key, value]) => {
    if (isNumberLike(key)) {
      res.push(value);
    } else {
      res[key] = value;
    }
  });
  return res;
};



_context["slice"] = (a, b, ...end) => {
  /**
   * Возвращает срез массива или подстроку.
   *
   * @usage slice(arrayOrString, start)
   * @param arrayOrString [array | string] Массив или строка
   * @param start [number] Начальный индекс
   *
   * @usage slice(arrayOrString, start, end)
   * @param arrayOrString [array | string] Массив или строка
   * @param start [number] Начальный индекс
   * @param end [number] Конечный индекс
   *
   * @example slice({1, 2, 3, 4}, 1, 3) => [2, 3]
   *          slice({1, 2, 3, 4}, 1) => [2, 3, 4]
   *          slice("hello world", 0, 5) => "hello"
   *          slice("hello", 1) => "ello"
   * @category Работа с массивами | 10
   */
  if (!isArray(a) && !isString(a)) return [];
  return a.slice(b, end.length > 0 ? end[0] : a.length);
};



_context["concat"] = (...a) => {
  /**
   * Конкатинирует массивы.
   *
   * @usage concat(...arrays)
   * @param arrays [array] Массивы для объединения
   *
   * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
   *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
   *          ## Исключает именованные элементы
   * @category Работа с массивами | 15
   */
  return [].concat.apply([], a)
};



_context["first"] = (a) => {
  /**
   * Возвращает первый элемент массива.
   *
   * @usage first(array)
   * @param array [array] Массив
   *
   * @example first({1, 2, 3}) => 1
   *          first({}) => null
   * @category Работа с массивами | 20
   */
  return a.length > 0 ? a[0] : null;
};



_context["last"] = (a) => {
  /**
   * Возвращает последний элемент массива.
   *
   * @usage last(array)
   * @param array [array] Массив
   *
   * @example last({1, 2, 3}) => 3
   *          last({}) => undefined
   * @category Работа с массивами | 21
   */
  return a[a.length - 1];
};



_context["rest"] = (a) => {
  /**
   * Возвращает все элементы массива кроме первого.
   *
   * @usage rest(array)
   * @param array [array] Массив
   *
   * @example rest({1, 2, 3}) => [2, 3]
   *          rest({1, 2, 3, a = 1}) => [2, 3] ## Исключает именованые аргументы
   * @category Работа с массивами | 22
   */
  return a.slice(1);
};



_context["cons"] = _context["pushStart"] = (/** @type {*} */ a, /** @type {Array<*>} */ b) => {
  /**
   * Добавляет элемент в начало массива
   *
   * @usage cons(element, array)
   * @param element [any] Элемент
   * @param array [array] Массив
   *
   * @example cons(1, {2, 3}) => [1, 2, 3]
   * @category Работа с массивами | 23
   */
  /** @type {Array<*>} */
  const arr = [];
  return arr.concat([a], b);
};



_context["find"] = (arr, fn) => {
  /**
   * Возвращает первый элемент массива, удовлетворяющий условию.
   *
   * Функция `fn` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage find(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для проверки
   *
   * @usage find(arr, value)
   * @param arr [array] Массив
   * @param value [any] Искомое значение
   *
   * @example find({1, 2, 3}, x => x > 1) => 2
   *          find({1, 2, 3}, 2) => 2
   *          find({1, 2, 3}, 6) => undefined
   * @category Работа с массивами | 30
  */
  return isArray(arr) ? arr.find(isFunction(fn) ? fn : ((v) => v == fn)) : undefined;
};



_context["findIndex"] = (arr, fn) => {
  /**
   * Возвращает индекс первого элемента, удовлетворяющего условию.
   *
   * Если элемент не найден, возвращает -1.
   *
   * Функция `fn` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage findIndex(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для проверки
   *
   * @usage findIndex(arr, value)
   * @param arr [array] Массив
   * @param value [any] Искомое значение
   *
   * @example findIndex({1, 2, 3}, x => x > 1) => 1
   *          findIndex({1, 2, 3}, 3) => 2
   *          findIndex({1, 2, 3}, 6) => -1
   * @category Работа с массивами | 31
   */
  return isArray(arr) ? arr.findIndex(isFunction(fn) ? fn : ((v) => v == fn)) : -1;
};



_context["map"] = (arr, fn) => {
  /**
   * Применяет функцию к каждому элементу массива.
   *
   * Функция `fn` может принимать 1 аргумент:
   * - `val` - значение текущего элемента.
   *
   * В качестве функции можно использовать имя LPE функции.
   * @usage map(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для применения
   *
   * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
   *          {1, 2, 3}.map(minus) => [-1, -2, -3]
   * @category Работа с массивами | 35
   */
  return isArray(arr) ? arr.map(it => fn(it)) : [];
};



_context["mapit"] = makeSF((ast, ctx, rs) => {
  /**
   * Преобразует массив с использованием переменных it и idx.
   *
   * it - Текущий элемент массива.
   * idx - Индекс текущего элемента.
   * @usage mapit(array, transformation)
   * @param array [array] Исходный массив
   * @param transformation [any] Выражение для получения преобразованного значения
   *
   * @example mapit({1, 2, 3}, it * 2) => [2, 4, 6]
   * @example mapit({"a", "b", "c"}, it + idx) => ["a0", "b1", "c2"]
   * @category Работа с массивами | 36
   * @tags return-support
   */
  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([array]) => {
      const conditionAST = ["catchReturn", ast[1]];
      return unbox(
        Array.prototype.map.call(array, (it, idx) => EVAL(conditionAST, [{ it, idx }, ctx], rs)),
        (result) => result,
        rs?.streamAdapter,
      );
    },
    rs?.streamAdapter,
  );
});



_context["mapArr"] = (arr, fn) => {
  /**
   * Применяет функцию к каждому элементу массива.
   *
   * Функция `fn` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage mapArr(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для применения
   *
   * @example mapArr({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
   *          {1, 2, 3}.mapArr({1, 2, 3}, (val, idx) => val * idx) => [0, 2, 6]
   * @category Работа с массивами | 37
   */
  return isArray(arr) ? arr.map(fn) : [];
};



_context["filter"] = (arr, fn) => {
  /**
   * Фильтрует массив по предикату.
   *
   * Функция `predicate` может принимать 1 аргумент:
   * - `val` - значение текущего элемента.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage filter(arr, predicate)
   * @param arr [array] Массив
   * @param predicate [function] Функция-предикат
   *
   * @example filter({1, 2, 3, 4}, fn({a}, a > 2)) => [3, 4]
   * @category Работа с массивами | 40
   */
  return isArray(arr) ? arr.filter(it => fn(it)) : [];
};



_context["filterit"] = makeSF((ast, ctx, rs) => {
  /**
   * Фильтрует массив с использованием переменных it и idx.
   *
   * it - Текущий элемент массива.
   * idx - Индекс текущего элемента.
   * @usage filterit(array, condition)
   * @param array [array] Исходный массив
   * @param condition [boolean] Условие
   *
   * @example filterit({1, 2, 3, 4}, it > 2 || idx = 0) => [1, 3, 4]
   * @category Работа с массивами | 41
   * @tags return-support
   */

  return unbox(
    [EVAL(ast[0], ctx, rs)],
    ([array]) => {
      const conditionAST = ["catchReturn", ast[1]];
      return unbox(
        Array.prototype.filter.call(array, (it, idx) => !!EVAL(conditionAST, [{ it, idx }, ctx], rs)),
        (result) => result,
        rs?.streamAdapter,
      );
    },
    rs?.streamAdapter,
  );
});



_context["filterArr"] = (arr, fn) => {
  /**
   * Фильтрует массив по предикату.
   *
   * Функция `predicate` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage filterArr(arr, predicate)
   * @param arr [array] Массив
   * @param predicate [function] Функция-предикат
   *
   * @example filterArr({1, 2, 3, 4}, fn({val, idx}, idx < 3)) => [1, 2, 3]
   * @category Работа с массивами | 42
   */
  return isArray(arr) ? arr.filter(fn) : [];
};



_context["reduce"] = (arr, fn, init) => {
  /**
   * Применяет функцию к элементам массива поступательно и накапливает результат.
   *
   * Функция `fn` может принимать до 2-х аргументов:
   * - `aсс` - накопленный результат.
   * - `val` - значение текущего элемента.
   *
   * В случае, если `arr` не является массивом, возвращается `init`.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage reduce(arr, fn, init)
   * @param arr [array] Массив
   * @param fn [function] Функция для применения
   * @param init [any] Начальное значение
   *
   * @example reduce(\
   *          |  {1, 2, 3},\
   *          |  add,\
   *          |  0\
   *          |) => 6
   * @category Работа с массивами | 45
   */
  return isArray(arr) ? arr.reduce((acc, val) => fn(acc, val), init) : init;
};



_context["reduceArr"] = (arr, fn, init) => {
  /**
   * Применяет функцию к элементам массива поступательно и накапливает результат.
   *
   * Функция `fn` может принимать до 4-х аргументов:
   * - `aсс` - накопленный результат
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В случае, если `arr` не является массивом, возвращается `init`.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage reduce(arr, fn, init)
   * @param arr [array] Массив
   * @param fn [function] Функция для применения
   * @param init [any] Начальное значение
   *
   * @example reduce(
   *          |  {1, 2, 3},
   *          |  (acc, val) => acc + val,
   *          |  0
   *          |) => 6
   *          {1, 2, 3}.reduce((acc, val, idx) => acc + val * idx, 0) => 8
   * @category Работа с массивами | 46
   */
  return isArray(arr) ? arr.reduce(fn, init) : init;
};



_context["sort"] = (a, fn) => {
  /**
   * Сортирует массив.
   *
   * Поддерживает два варианта вызова:
   * 1. Без функции сравнения (стандартная сортировка).
   * 2. С функцией сравнения для пользовательского порядка.
   *
   * Функция изменяет исходный массив (сортирует на месте).
   *
   * Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!).
   * @usage sort(array)
   * @param array [array] Массив для сортировки
   *
   * @usage sort(array, compareFn)
   * @param array [array] Массив для сортировки
   * @param compareFn [function] Функция сравнения формата (a, b) => число
   *                             Если функция возвращает:
   *                             - отрицательное: a идёт перед b
   *                             - положительное: b идёт перед a
   *                             - 0: порядок не меняется
   *
   * @example sort({3, 1, 2}) => [1, 2, 3]
   *          sort({5, 2, 8, 1}) => [1, 2, 5, 8]
   *          sort({"banana", "apple", "cherry"}) => ["apple", "banana", "cherry"]
   *
   * @example sort({5, 2, 8, 1}, (a, b) => a - b) => [1, 2, 5, 8]  (по возрастанию)
   *          sort({5, 2, 8, 1}, (a, b) => b - a) => [8, 5, 2, 1]  (по убыванию)
   *
   *          sort(\
   *          |  { {1, 2}, {3, 1}, {2, 3} },\
   *          |  (a, b) => first(a) - first(b)\
   *          |) => [[1, 2], [2, 3], [3, 1]] (по первому элементу)
   *
   *          sort(\
   *          |  { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },\
   *          |  (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)\
   *          |) => [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
   * @category Работа с массивами | 50
   */
  return isArray(a) ? a.sort(fn) : [];
};



_context["sortBy"] = (a, fn) => {
  /**
   * Сортирует массив по указанному ключу.
   *
   * Функция изменяет исходный массив (сортирует на месте).
   *
   * Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!).
   *
   * @usage sort(array, compareFn)
   * @param array [array] Массив для сортировки
   * @param fn [function] Функция сравнения формата (obj) => значение
   *
   * @example sortBy({{id = 1, name = "John"}, {id = 1, name = "Albert"}}, (obj) => obj.name) => [ { id: 1, name: 'Albert' }, { id: 1, name: 'John' } ]
   *
   * @category Работа с массивами | 51
   */
  return isArray(a) ? a.sort((a, b) => fn(a) > fn(b) ? 1 : -1) : [];
};



_context["some"] = (arr, fn) => {
  /**
   * Возвращает true, если хотя бы один элемент массива удовлетворяет условию.
   *
   * Функция `fn` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage some(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для проверки
   *
   * @usage some(arr, value)
   * @param arr [array] Массив
   * @param value [any] Искомое значение
   *
   * @example some({1, 2, 3}, x => x > 1) => true
   *          some({1, 2, 3}, 3) => true
   *          some({1, 2, 3}, 6) => false
   * @category Работа с массивами | 60
   */
  return isArray(arr) ? arr.some(isFunction(fn) ? fn : ((v) => v == fn)) : false;
};



_context["every"] = (arr, fn) => {
  /**
   * Возвращает true, если все элементы массива удовлетворяют условию.
   *
   * Функция `fn` может принимать до 3-х аргументов:
   * - `val` - значение текущего элемента.
   * - `idx` - индекс текущего элемента.
   * - `arr` - исходный массив.
   *
   * В качестве функции можно использовать имя LPE функции.
   *
   * @usage every(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для проверки
   *
   * @usage every(arr, value)
   * @param arr [array] Массив
   * @param value [any] Искомое значение
   *
   * @example every({1, 2, 3}, x => x > 1) => false
   *          every({1, 2, 3}, 3) => false
   *          every({1, 2, 3}, x => x > 0) => true
   * @category Работа с массивами | 61
   */
  return isArray(arr) ? arr.every(isFunction(fn) ? fn : ((v) => v == fn)) : false;
};



_context["flat"] = (arr, depth) => {
  /**
   * Разглаживает массив до указанной глубины. Глубина по умолчанию равна 1.
   *
   * @usage flat(arr)
   * @param arr [array] Массив
   *
   * @usage flat(arr, depth)
   * @param arr [array] Массив
   * @param depth [number] Глубина рекурсии
   *
   * @example {{1, 2}, 3, {4, {5}}}.flat(1) => [1, 2, 3, 4, [5]]
   *          {{1, 2}, 3, {4, {5}}}.flat() => [1, 2, 3, 4, [5]]
   *          {{1, 2}, 3, {4, {5}}}.flat(2) => [1, 2, 3, 4, 5]
   * @category Работа с массивами | 65
   */
  return isArray(arr) ? arr.flat(depth ?? 1) : arr;
};



_context["frequencies"] = _context["counter"] = (arr) => {
  /**
   * Возвращает объект, содержащий частоты элементов массива.
   *
   * @usage frequencies(arr)
   * @param arr [array] Массив
   *
   * @example frequencies({1, 1, 2, 2, 2, 3}) => {1: 2, 2: 3, 3: 1}
   *          "test words of the test".words().frequencies() => { "test: 2, words: 1, of: 1, the: 1 }
   * @category Работа с массивами | 70
   */
  return isArray(arr) ? arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {}) : {};
};



_context["partition"] = (arr, n) => {
  /**
   * Разбивает массив на части по n элементов.
   *
   * @usage partition(arr, n)
   * @param arr [array] Массив
   * @param n [number] Количество элементов в каждой части
   *
   * @example partition({1, 2, 3, 4, 5}, 2) => [[1, 2], [3, 4], [5]]
   * @category Работа с массивами | 71
   */
  return isArray(arr) ? arr.reduce((acc, _, i) => {
    if (i % n === 0) {
      acc.push([]);
    }
    acc[acc.length - 1].push(arr[i]);
    return acc;
  }, []) : [];
};



_context["distinct"] = (arr, fn) => {
  /**
   * Возвращает массив без повторяющихся элементов с сохранением порядка.
   *
   * @usage distinct(arr)
   * @param arr [array] Массив
   *
   * @usage distinct(arr, fn)
   * @param arr [array] Массив
   * @param fn [function] Функция для сравнения элементов
   *
   * @example distinct({3, 1, 2, 3, 3, 2, 3}) => [3, 1, 2]
   *          distinct({{a = 1}, {a = 2}, {a = 1}}, (a, b) => a.a = b.a) => [{a: 1}, {a: 2}]
   * @category Работа с массивами | 80
  */
  const comparer = fn ?? ((/** @type {*} */ a, /** @type {*} */ b) => a == b);
  return isArray(arr) ? arr.filter((item, index) => arr.findIndex((v) => comparer(v, item)) === index) : arr;
};



_context["union"] = (arrays, fn) => {
  /**
   * Возвращает объединенный массив из всех переданных массивов.
   *
   * @usage union(arrays)
   * @param arrays [Array<Array>] Массивы для объединения
   *
   * @usage union(arrays, fn)
   * @param arrays [Array<Array>] Массивы для объединения
   * @param fn [function] Функция для сравнения элементов
   *
   * @example union({{1, 2}, {3, 4}}) => [1, 2, 3, 4]
   * @category Работа с массивами | 81
   */
  const comparer = fn ?? ((/** @type {*} */ a, /** @type {*} */ b) => a == b);
  if (!isArray(arrays)) {
    return [];
  }
  return arrays
    .filter(el => isArray(el))
    .flat(1)
    .filter((item, idx, arr) => arr.findIndex(v => comparer(item, v)) === idx);
};



_context["intersect"] = (/** @type {Array<Array<*>>} */ arrays, fn) => {
  /**
   * Возвращает пересечение всех переданных массивов.
   *
   * @usage intersect(arrays)
   * @param arrays [Array<Array>] Массивы для пересечения
   *
   * @usage intersect(arrays, fn)
   * @param arrays [Array<Array>] Массивы для пересечения
   * @param fn [function] Функция для сравнения элементов
   *
   * @example intersect({{1, 2}, {2, 3}}) => [2]
   *          intersect({{1, 2, 2, 2}, {2, 3}, {1, 2}}) => [2]
   * @category Работа с массивами | 82
   */
  const comparer = fn ?? ((/** @type {*} */ a, /** @type {*} */ b) => a == b);
  arrays = isArray(arrays) ? arrays.filter(el => isArray(el)) : [];
  if (arrays.length === 0) {
    return [];
  }
  return arrays[0].filter((item, idx, firstArr) =>
    firstArr.findIndex(v => comparer(item, v)) === idx &&
    arrays.slice(1).every(arr => arr.some(val => comparer(item, val)))
  );
};



_context["difference"] = (/** @type {Array<Array<*>>} */ arrays, fn) => {
  /**
   * Возвращает разницу между массивами.
   * Из первого массива извлекаются все элементы, которые содержатся в других массивах.
   *
   * Оставляет повторяющиеся элементы.
   *
   * @usage difference(arrays)
   * @param arrays [Array<Array>] Массивы для вычитания
   *
   * @usage difference(arrays, fn)
   * @param arrays [Array<Array>] Массивы для вычитания
   * @param fn [function] Функция для сравнения элементов
   *
   * @example difference({{1, 2, 1}, {2, 3}}) => [1, 1]
   * @category Работа с массивами | 83
   */
  const compare = fn ?? ((/** @type {*} */ a, /** @type {*} */ b) => a == b);
  arrays = isArray(arrays) ? arrays.filter(el => isArray(el)) : [];
  if (arrays.length === 0) {
    return [];
  }
  return arrays[0].filter(item =>
    !arrays.slice(1).some(arr => arr.some(val => compare(item, val)))
  );
};



_context["uniques"] = (/** @type {Array<Array<*>>} */ arrays, fn) => {
  /**
   * Возвращает уникальные элементы из массивов: элементы, которые есть только в одном из массивов.
   *
   * @usage uniques(arrays)
   * @param arrays [Array<Array>] Массивы для поиска уникальных элементов
   *
   * @usage uniques(arrays, fn)
   * @param arrays [Array<Array>] Массивы для поиска уникальных элементов
   * @param fn [function] Функция для сравнения элементов
   *
   * @example uniques({{1, 2, 1}, {2, 3}}) => [1, 3]
   * @category Работа с массивами | 84
   */
  const compare = fn ?? ((/** @type {*} */ a, /** @type {*} */ b) => a == b);
  arrays = isArray(arrays) ? arrays.filter(el => isArray(el)) : [];
  if (arrays.length === 0) {
    return [];
  }
  return arrays
    .map(arr => arr.filter((item, idx) => arr.findIndex(val => compare(item, val)) === idx))
    .flat()
    .filter((item, idx, arr) =>
      arr.filter((val, id) => id === idx || compare(item, val)).length === 1
    );
};



_context["shuffle"] = (/** @type {Array<*>} */ arr) => {
  /**
   * Перемешивает элементы массива случайным образом.
   *
   * @usage shuffle(arr)
   * @param arr [Array] Массив для перемешивания
   *
   * @example shuffle({1, 2, 3, 4, 5})
   * @category Работа с массивами | 90
   */
  return arr
    .map(el => [el, Math.random()])
    .sort((a, b) => a[1] - b[1])
    .map(el => el[0]);
};



_context["sample"] = (/** @type {Array<*>} */ arr, /** @type {number} */ n) => {
  /**
   * Выбирает случайные элементы из массива.
   *
   *
   * @usage sample(arr)
   * @param arr [Array] Массив для выборки
   *
   * @usage sample(arr, n)
   * @param arr [Array] Массив для выборки
   * @param n [int] Количество элементов для выборки
   *
   * @example sample({1, 2, 3, 4, 5}, 3) => [3, 1, 5]
   *          sample({1, 2, 3, 4, 5}) => 4
   *          sample({1, 2, 3, 4, 5}, 10) => {2, 5, 1, 4, 3}
   * @category Работа с массивами | 91
   */
  const count = isNumber(n) ? n : 1;
  const res = arr
    .map(el => [el, Math.random()])
    .sort((a, b) => a[1] - b[1])
    .map(el => el[0])
    .slice(0, count);
  return count === 1 ? res[0] : res;
};



_context["pluck"] = (c, k) => {
  /**
   * Извлекает значение свойства из каждого элемента массива.
   *
   * @usage pluck(array, key)
   * @param array [array] Массив объектов
   * @param key [string] Ключ свойства
   *
   * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
   * @category Работа с массивами | 95
   */
  // for each array element, get property value, present result as array.
  return isArray(c) ? c.map(el => el[k]) : [];
};



_context["join"] = (a, sep) => {
  /**
   * Объединяет элементы массива в строку через разделителью
   *
   * @usage join(array, separator)
   * @param array [array] Массив
   * @param separator [string] Разделитель
   *
   * @example join({1, 2, 3}, "-") => "1-2-3"
   * @category Работа с массивами | 100
   */
  return isArray(a) ? Array.prototype.join.call(a, sep) : '';
};



_context["joinObj"] = (/** @type {ObjectLike} */ a, sep, fn) => {
  /**
   * Объединяет элементы массива или хэш-таблицы в строку через разделитель.
   *
   * Для преобразования элементов в строку используется функция `fn`, принимающая 2 аргумента:
   * - `key`: ключ элемента (для массивов `key` равен индексу в виде строки).
   * - `value`: значение элемента.
   *
   * Если функция не задана, в строку преобращуются значения элементов.
   *
   *
   * @usage joinObj(obj, separator)
   * @param obj [object | array] Объект
   * @param separator [string] Разделитель
   *
   * @usage joinObj(obj, separator, fn)
   * @param obj [object | array] Объект
   * @param separator [string] Разделитель
   * @param fn [function] Функция преобразования
   *
   * @example joinObj({1, null, 3}, "-") => "1-null-3"
   *          joinObj({a: 12, b: "test"}, "; ", (k, v) => str(k, ": ", v)) => "a: 12; b: test"
   * @category Работа с массивами | 101
   */
  const stringer = isFunction(fn) ? fn : (/** @type {string} */ _, /** @type {*} */ v) => String(v);
  return isObj(a) ? Object.entries(a).map(([k, v]) => stringer(k, v)).join(sep) : '';
};



_context["contains?"] = _context["containsKey"] = (a, b) => {
  /**
   * Проверяет, содержит ли объект указанное свойство.
   *
   * @usage contains(obj, key)
   * @param obj [object] Объект
   * @param key [string] Ключ
   *
   * @example contains({a = 1}, "a") => true
   * @category Работа с хэш-таблицами | 1
   */
  return a.hasOwnProperty(b);
};



_context["get"] = _context["nth"] = (a, b, c) => {
  /**
   * Получает значение свойства объекта.
   *
   * @usage get(obj, key)
   * @param obj [object] Объект
   * @param key [string | number] Ключ
   *
   * @usage get(obj, key, default)
   * @param obj [object] Объект
   * @param key [string | number] Ключ
   * @param default [any] Значение по умолчанию
   *
   * @example get({a: 1}, "a") => 1
   *          get({a: 1}, "b") => undefined
   *          get({a: 1}, "b", "not found") => "not found"
   * @category Работа с хэш-таблицами | 10
   */
  return a.hasOwnProperty(b) ? a[b] : c;
};


_context["set"] = (a, b, c) => {
  /**
   * Устанавливает значение свойства объекта и возвращает объект.
   *
   * @usage set(obj, key, value)
   * @param obj [object] Объект
   * @param key [string] Ключ
   * @param value [any] Значение
   *
   * @example set(Hashmap, "a", 1) => {a: 1}
   *          set({}, 0, 1) => [1]
   * @category Работа с хэш-таблицами | 11
   */
  return (a[b] = c, a);
};



_context["del"] = (a, b) => {
  /**
   * Удаляет свойство из объекта.
   *
   * @usage del(obj, key)
   * @param obj [hashmap] Объект
   * @param key [string] Ключ для удаления
   *
   * @example del({"a"=1, "b"=2}, "a") => true
   * @category Работа с хэш-таблицами | 12
   */
  return delete a[b];
};



_context["keys"] = (a) => {
  /**
   * Возвращает массив ключей объекта.
   *
   * @usage keys(obj)
   * @param obj [object] Объект
   *
   * @example keys({a = 1, b = 2}) => ["a", "b"]
   *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
   * @category Работа с хэш-таблицами | 15
   */
  return Object.keys(a);
};


_context["vals"] = _context["values"] = (a) => {
  /**
   * Возвращает массив значений объекта.
   *
   * @usage vals(obj)
   * @param obj [object] Объект
   *
   * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
   * @category Работа с хэш-таблицами | 16
   */
  return Object.values(a);
};



_context["entries"] = (obj) => {
  /**
   * Возвращает массив пар [ключ, значение] для объекта.
   *
   * @usage entries(obj)
   * @param obj [Array | Object] Объект для получения пар ключ-значение.
   *
   * @example entries({a = 1, b = 2}) => [['a', 1], ['b', 2]]
   * @category Работа с хэш-таблицами | 20
   */
  return Object.entries(obj);
};



_context["fromEntries"] = (obj) => {
  /**
   * Возвращает объект из массива пар [ключ, значение].
   *
   * @usage fromEntries(obj)
   * @param obj [Array<Array>] Массив пар [ключ, значение].
   *
   * @example fromEntries({{'a', 1}, {'b', 2}}) => {a: 1, b: 2}
   * @category Работа с хэш-таблицами | 21
   */
  return Object.fromEntries(obj);
};



_context["select"] = (obj, keys) => {
  /**
   * Возвращает подмножество хэш-таблицы по списку ключей.
   *
   * @usage select(obj, keys)
   * @param obj [Array | Object] Хэш-таблица или массив для выбора ключей
   * @param keys [Array | Object] Список ключей
   *
   * @example select({a = 1, b = 2, c = 3}, {a, c}) => {a: 1, c: 3}
   *          select({1, 2, 3, 4}, {0, 3}) => [1, 4]
   *          select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'}) => [1, 4, user: {id: 1, name: 'John'}]
   *          select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'name'}}) => [1, user: {name: 'John'}]
   *          select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'})) => [{name: 'John'}, {action: 'delete'}] ## Для настройки выборки позиционных аргументов необходимо создавать хэш-таблицу
   *          select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'action'})) => [{id: 1, name: 'John'}, {action: 'delete'}] ## Чтобы взять объект полностью, передаем true
   *          select({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'})) => [{action: 'delete'}] ## Удаляет поле в случае, если мы ожидали структуру
   * @category Работа с хэш-таблицами | 30
   */

  const selection = (/** @type {ObjectLike} */ obj, /** @type {Array<string> | Record<string, boolean | any>} */ selections) => {
    const selectMap = Object.fromEntries(Object.entries(selections).map(([k, v]) => {
      if (isArray(selections) && isNumberLike(k)) {
        return [v, true];
      }
      return [k, v];
    }));

    return Object.entries(selectMap).reduce((/** @type {ObjectLike} */ acc, [key, need]) => {
      if (!Object.hasOwn(obj, key)) {
        return acc;
      }
      if (isObj(need) && !isObj(obj[key])) {
        return acc;
      }
      const value = isObj(need) ? selection(obj[key], need) : obj[key];
      if (isArray(acc) && isNumberLike(key)) {
        acc.push(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, isHash(obj) ? {} : []);
  }

  return selection(obj, keys);
};


_context["omit"] = (obj, keys) => {
  /**
   * Возвращает подмножество хэш-таблицы без указанных ключей.
   *
   * @usage omit(hash, keys)
   * @param obj [Array | Object] Хэш-таблица или массив для удаления ключей
   * @param keys [Array] Список ключей
   *
   * @example omit({a = 1, b = 2, c = 3}, {a, c}) => {b: 2}
   *          omit({1, 2, 3, 4}, {0, 3}) => [2, 3]
   *          omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'}) => [2, 3]
   *          omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'id'}}) => [2, 3, 4, user: {name: 'John'}]
   *          omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'id'}, '1' = {'action'})) => [{name: 'John'}, {id: 2}] ## Для настройки выборки позиционных аргументов необходимо создавать хэш-таблицу
   *          omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'id'})) => [{action: 'delete'}] ## Чтобы исключить объект полностью, передаем true
   *          omit({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'id'})) => [123, {action: 'delete'}] ## Оставляет поле в случае, если мы ожидали структуру
   * @category Работа с хэш-таблицами | 31
   */

  const selection = (/** @type {ObjectLike} */ obj, /** @type {Array<string> | Record<string, boolean | any>} */ selections) => {
    const selectMap = Object.fromEntries(Object.entries(selections).map(([k, v]) => {
      if (isArray(selections) && isNumberLike(k)) {
        return [v, true];
      }
      return [k, v];
    }));

    // reverse для обратного порядка
    return Object.entries(selectMap).reverse().reduce((acc, [key, need]) => {
      if (!Object.hasOwn(obj, key)) {
        return acc;
      }
      if (isObj(need) && !isObj(obj[key])) {
        return acc;
      }
      if (isObj(need)) {
        acc[key] = selection(obj[key], need);
      } else if (isArray(acc) && isNumberLike(key)) {
        acc.splice(+key, 1);
      } else {
        delete acc[key];
      }
      return acc;
    }, obj);
  }

  return selection(structuredClone(obj), keys);
};



_context["compact"] = (obj, depth) => {
  /**
   * Удаляет все `null` и `undefined` значения из объекта.
   *
   * @usage compact(obj, depth)
   * @param obj [Array | Object] Объект для удаления значений.
   *
   * @usage compact(obj, depth)
   * @param obj [Array | Object] Объект для удаления значений.
   * @param depth [number] Глубина рекурсии (по умолчанию 1).
   *
   * @example compact({a = 1, b = null, c = undefined}) => {a: 1}
   *          compact({a = 1, b = {c = null}}, 2) => {a: 1, b: {}}
   *          compact({a = 1, b = {c = null}}, 1) => {a: 1, b: {с = null}}
   * @category Работа с хэш-таблицами | 35
   */
  const compactObj = (/** @type {ObjectLike} */ obj, /** @type {number} */ depth) => {
    if (depth <= 0) return obj;
    const keys = Object.keys(obj);
    for (const key of keys.reverse()) {
      if (obj[key] === null || obj[key] === undefined) {
        if (isArray(obj) && isNumberLike(key)) {
          obj.splice(+key, 1);
        } else {
          delete obj[key];
        }
      } else if (isObj(obj[key])) {
        compactObj(obj[key], depth - 1);
      }
    }
  };

  const clone = structuredClone(obj);
  compactObj(clone, isNumber(depth) ? depth : 1);
  return clone;
};



_context["get_in"] = makeSF((ast, ctx, rs) => {
  /**
   * Получает значение из вложенной структуры по пути ключей.
   *
   * При отсутствии значения по ключу возвращает undefined.
   * @usage get_in(obj, keys)
   * @param obj [object|array] Исходная структура
   * @param keys [array] Массив ключей
   *
   * @usage get_in(obj, ...key)
   * @param obj [object|array] Исходная структура
   * @param key [string] Ключ
   *
   * @example get_in({a = {b = {c = 42}}}, {"a", "b"}) => { c: 42 }
   * @example get_in({a = {b = {10, 11, 12}}}, a, b, 2) => 12
   * @category Работа с хэш-таблицами | 40
   */
  let argsAST = [];

  if (isArray(ast[1]) && isArrayFunction(ast[1][0])) {
    // массив аргументов, ка в классическом get_in в Clojure
    argsAST = ast[1];
  } else {
    // просто список ключей в виде аргументов
    argsAST = ["[", ...ast.slice(1)];
  }

  return unbox(
    [
      isArray(ast[0]) ? EVAL(ast[0], ctx, rs) : ast[0],
      EVAL(argsAST, ctx, rs),
    ],
    ([obj, args]) => {
      return EVAL([".", obj, ...args], ctx, rs);
    },
    rs?.streamAdapter,
  );

});



_context["assoc_in"] = makeSF((ast, ctx, rs) => {
  /**
   * Устанавливает значение во вложенной структуре по пути ключей.
   *
   * @usage assoc_in(obj, keys, value)
   * @param obj [object|array] Целевая структура
   * @param keys [array] Путь ключей
   * @param value [any] Устанавливаемое значение
   *
   * @example begin(\
   *          |  x := Hashmap,\
   *          |  assoc_in(x, {"a", "b", "c"}, 42),\
   *          |) => {c: 42}
   *          ## x == {a: {b: {c: 42}}}
   * @category Работа с хэш-таблицами | 41
  */

  return unbox(
    [EVAL(ast[0], ctx, rs), EVAL(ast[1], ctx, rs)],
    ([origin, path]) => {

      let focus = origin;
      for (let i = 0; i < path.length - 1; i++) {
        if (focus[path[i]] === undefined) {
          // нужно создать
          if (isString(path[i + 1])) {
            focus = focus[path[i]] = {};
          } else {
            focus = focus[path[i]] = [];
          }
        } else {
          focus = focus[path[i]];
        }
      }
      const expr = ["set", focus, path.pop(), ast[2]];
      // Чтобы стрим гарантированно выполнился, сперва выполняем его, а потом просто берем изначальный объект
      return EVAL(["begin", expr, ["$AST$", origin]], ctx, rs);
    },
    rs?.streamAdapter
  );
});



_context["update_in"] = (obj, path, fn, regexpEnable) => {
  /**
   * Устанавливает значение во вложенной структуре по пути ключей используя функцию.
   *
   * Функция принимает 2 аргумента:
   * - `value`: текущее значение.
   * - `path`: путь до ключа.
   *
   * В случае использования регулярных выражений при отсутствии ключа попадающего в регулярное выражение, объект не будет создан.
   *
   * Изменяет и возвращает переданную структуру.
   *
   * @usage update_in(obj, keys, fn)
   * @param obj [object|array] Целевая структура
   * @param keys [array] Путь ключей
   * @param fn [function] Функция обновления
   *
   * @usage update_in(obj, keys, fn, regexpEnable)
   * @param obj [object|array] Целевая структура
   * @param keys [array] Путь ключей
   * @param fn [function] Функция обновления
   * @param regexpEnable [boolean] Включение регулярных выражений
   *
   * @example update_in({a = {b = 10}}, {"a", "b"}, x => x + 1) => {a: {b: 11}}
   *          update_in({=}, {"a", "b"}, x => nvl(x, 0) + 1) => {a: {b: 1}}
   *          update_in({Ivan = {id = 1}, Bob = {id = 2}, Fred = {id = 3, name = "Freddy"}}, {"/.+/", "name"}, (x, path) => nvl(x, path.(0)), true) => {Ivan: {name: "Ivan", id: 1}, Bob: {name: "Bob", id: 2}, Fred: {name: "Freddy", id: 3}}
   * @category Работа с хэш-таблицами | 42
   */

  /**
   * @param {Record<string, any>} obj Object or array
   * @param {Array<string>} path Оставшийся путь до целевого ключа
   * @param {Array<string>} was Путь до текущего ключа
   */
  const updater = (obj, path, was) => {
    const key = String(path[0]);
    let entries;
    if (regexpEnable && key.startsWith("/") && key.endsWith("/")) {
      const regexp = new RegExp(key.slice(1, -1));
      entries = Object.entries(obj).filter(([k, _]) => regexp.test(k));
    } else if (Object.hasOwn(obj, key)) {
      entries = [[key, obj[key]]];
    } else if (path.length > 1) {
      obj[key] = {};
      entries = [[key, obj[key]]];
    } else {
      entries = [[key, undefined]];
    }

    entries.forEach(([key, value]) => {
      if (path.length === 1) {
        obj[key] = fn(value, [...was, path[0]]);
        return;
      }

      if (isObj(value)) {
        updater(value, path.slice(1), [...was, key]);
      }
    });
  }
  if (isObj(obj)) {
    updater(obj, path, []);
  }
  return obj;
};



_context["cp"] = makeSF((ast, ctx, rs) => {
  /**
   * Копирует значение из одной вложенной структуры в другую.
   *
   * Работает как `assoc_in(to, get_in(from))`.
   * @usage cp(from, to)
   * @param from [array] Путь к источнику [source, key1, key2, ...]
   * @param to [array] Путь к назначению [target, key1, key2, ...]
   *
   * @example begin(\
   *          |  x := { a = {b = 10} },\
   *          |  y := { c = {d = 12} },\
   *          |  cp({ x, "a", "b" }, { y, "c", "f"})\
   *          |) => { d: 12, f: 10 }
   *          ## y = { c: { d: 12, f: 10 } }
   * @category Работа с хэш-таблицами | 45
   */
  return unbox(
    [EVAL(ast[0], ctx, rs), EVAL(ast[1], ctx, rs)],
    ([from, to]) => {
      const lpe = ["assoc_in", to[0], ["[", ...to.slice(1)], ["get_in", from[0], ["[", ...from.slice(1)]]];
      return EVAL(lpe, ctx, rs);
    },
    rs?.streamAdapter,
  );
});



_context["merge"] = (/** @type {Array<ObjectLike>} */ hashes, fn, mergeType) => {
  /**
   * Объединяет несколько хэш-таблиц в одну. При использовании массивов в качестве имен ключей используется индекс элемента.
   *
   * При объединении массивов функция возвращает ассоциативный массив. Если массивов при объелинении нет, возвращается хэш-таблица.
   *
   * Без указания функции слияния берет последний встреченный элемент.
   *
   * Можно указать тип слияния, от которого зависят аргументы функции слияния (по умолчанию `sequence`):
   * - `sequence`: Слияние происходит последовательно. Функция слияния принимает 3 аргумента: имя ключа, предыдущее значение и следующее значение.
   * - `sequenceWithFirst`: Слияние происходит последовательно. Функция слияния принимает 4 аргумента: имя ключа, предыдущее значение, следующее значение и флаг, указывающий, является ли это первым вхождением этого ключа.
   * - `full`: Слияние происходит за одну итерацию. Функция слияния принимает 3 аргумента: имя ключа, массив значений для данного ключа и массив флагов, указывающий, присутствовали ли значения для данного ключа.
   *
   * @usage merge(hashes)
   * @param hashes [Array<Object>] Массив хэшей для объединения
   *
   * @usage merge(hashes, fn)
   * @param hashes [Array<Object>] Массив хэшей для объединения
   * @param fn [function] Функция для слияния элементов
   *
   * @usage merge(hashes, fn, type)
   * @param hashes [Array<Object>] Массив хэшей для объединения
   * @param fn [function] Функция для слияния элементов
   * @param type ['sequence'|'full'] Тип слияния
   *
   * @example merge({{a = 1, c = 5}, {a = 3, b = 2}}) => {a: 3, c: 5, b: 2}
   *          merge({{a = {4,5,6}}, {a = {1}, b = 2}}) => {a: [1]}, b: 2} ## Вложенные структуры не сливаются рекурсивно
   *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old) => {a: 1, b: 2} ## Взять первое встреченное значение
   *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old + new) => {a: 4, b: 2} ## Сложить значения
   *          merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals, 'full') => {a: [1, 3], b: [undefined, 2]}
   *          merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals.filterArr((v, idx) => has.(idx)), 'full') => {a: [1, 3], b: [2]}
   *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new, first) => if(first, {new}, old.concat({new})), 'sequenceWithFirst') => {a: [1, 3], b: [2]}
   *          merge({{1, 2, 3}, { 5, 2, 10}}, (key, old, new) => old + new) => [6, 4, 13] ## Слить массивы с позиционным сложением элементов
   * @category Работа с хэш-таблицами | 50
   */
  if (!isFunction(fn) || !["full", "sequenceWithFirst"].includes(mergeType)) {
    mergeType = "sequence";
  }
  const merger = isFunction(fn) ? fn : ((/** @type {string} */ k, /** @type {*} */ a, /** @type {*} */ b) => b);

  /** @type {ObjectLike} */
  const res = hashes.some(h => isArray(h)) ? [] : {};

  if (mergeType === "full") {
    /** @type {string[]} */
    const keys = hashes.flatMap(h => Object.keys(h)).filter((key, idx, arr) => arr.indexOf(key) === idx);
    keys.forEach(key => {
      res[key] = merger(key, hashes.map(h => h[key]), hashes.map(h => Object.hasOwn(h, key)));
    });
  } else {
    hashes.forEach(h => {
      Object.entries(h).forEach(([key, val]) => {
        if (mergeType === "sequenceWithFirst") {
          res[key] = merger(key, res[key], val, !Object.hasOwn(res, key));
        } else {
          res[key] = Object.hasOwn(res, key) ? merger(key, res[key], val) : val;
        }
      });
    });
  }
  return res;
};



_context["mergeDeep"] = (obj1, obj2, fn, manualMerge) => {
  /**
   * Объединяет два хэш-таблицы в одну, при этом обходя все массивы и объекты.
   *
   * Без указания функции слияния берет последний встреченный элемент.
   *
   * Функция слияния принимает 3 аргумента:
   * - `path`: путь до ключа.
   * - `old`: значение из первой хэш-таблицы.
   * - `new`: значение из второй хэш-таблицы.
   *
   * @usage merge(obj1, obj2, fn)
   * @param obj1 [Array | Object] Первая хэш-таблица
   * @param obj2 [Array | Object] Вторая хэш-таблица
   * @param fn [function] Функция для слияния элементов
   *
   * @usage merge(obj1, obj2, fn, manualMerge)
   * @param obj1 [Array | Object] Первая хэш-таблица
   * @param obj2 [Array | Object] Вторая хэш-таблица
   * @param fn [function] Функция для слияния элементов
   * @param manualMerge [boolean] Если true, то вызывать функцию слияния даже в том случае, если в одном из объектов значение не установлено
   *
   * @example mergeDeep({a = 1, c = 5}, {a = 3, b = 2}) => {a: 3, c: 5, b: 2}
   *          mergeDeep({a = {4,5,6}}, {a = {1}, b = 2}) => {a: [1, 5, 6]}, b: 2} ## Поэлементное слияние
   *          mergeDeep({a = {4,5,6}}, {a = {1}, b = 2}, (path, old, new) => old + new) => {a: [5, 5, 6]}, b: 2} ## Поэлементное суммирование
   * @category Работа с хэш-таблицами | 51
   */
  const merger = isFunction(fn) ? fn : (/** @type {string[]} */ k, /** @type {*} */ a, /** @type {*} */ b) => b;

  if (!isArray(obj1) && !isHash(obj1) && !(isArray(obj2) && !isHash(obj2))) {
    throw new Error('Both arguments must be arrays or hashes');
  }

  const mrg = (/** @type {ObjectLike} */ obj1, /** @type {ObjectLike} */ obj2, /** @type {string[]} */ path) => {
    /** @type {ObjectLike} */
    const res = [obj1, obj2].some(h => isArray(h)) ? [] : {};
    const keys = [
      ...Object.keys(obj1),
      ...Object.keys(obj2),
    ].filter((key, idx, arr) => arr.indexOf(key) === idx);

    keys.forEach(key => {
      if (isObj(obj1[key]) && isObj(obj2[key])) {
        res[key] = mrg(obj1[key], obj2[key], [...path, key]);
      } else if (!manualMerge && !(Object.hasOwn(obj1, key) && Object.hasOwn(obj2, key))) {
        res[key] = obj1[key] ?? obj2[key];
      } else {
        res[key] = merger([...path, key], obj1[key], obj2[key]);
      }
    });
    return res;
  }

  return mrg(obj1, obj2, []);
};



_context["makeStruct"] = (from, struct) => {
  /**
   * Создает объект с заданной структурой. Модифицирует переданный объект для соответствия структуре (создает копию).
   *
   * В структуре указаны умалчиваемые значения, которые будут использованы если их нет в from или если тип данных не соответствует ожидаемому.
   *
   * @usage makeStruct(obj, struct)
   * @param obj [array | object] Объект, который необходимо заполнить
   * @param struct [array | object] Объект-схема структуры
   *
   * @example {\
   *          |  a = {1, 2, 3},\
   *          |  b = {c = {}}\
   *          |}.makeStruct(\
   *          |  { a = {b=0}, d = {0,0,0}}\
   *          |) => { a: [ 1, 2, 3, b: 0 ], b: { c: [] }, d: [ 0, 0, 0 ] }
   *          {1, 2, 3}.makeStruct({a=1, b = 2}) => [ 1, 2, 3, a: 1, b: 2 ]
   *          {1, 2, 3}.makeStruct({0,0,0,0,0,0}) => [ 1, 2, 3, 0, 0, 0 ]
   * @category Работа с хэш-таблицами | 55
   */

  const restruct = (/** @type {Record<string, any>} */ struct, /** @type {*} */ from) => {
    if (!isArray(from) && !isHash(from)) {
      return structuredClone(struct);
    }
    /** @type {Record<string, any>} */
    let res;
    if (isHash(struct) && isHash(from)) {
      res = {};
    } else {
      res = [];
    }
    const keys = [
      ...Object.keys(struct),
      ...Object.keys(from),
    ].filter((k, idx, arr) => arr.indexOf(k) === idx);
    for (const k of keys) {
      if (isHash(struct[k]) || isArray(struct[k])) {
        res[k] = restruct(struct[k], from[k]);
      } else if (Object.hasOwn(from, k)) {
        res[k] = from[k];
      } else {
        res[k] = struct[k];
      }
    }
    return res;
  }

  if (!isArray(struct) && !isHash(struct)) {
    throw except("LPE_FUNC_WRONG_ARG_TYPE", "makeStruct", "struct", "Array or Object", typeof struct);
  }

  return restruct(struct, from);
};
