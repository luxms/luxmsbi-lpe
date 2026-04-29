
/** Генерация локализации

let cat = "";
Object.values(lpe.STDLIB)
.filter(el => lpe.isFunction(el) && el._doc !== undefined)
.filter((el, ind, arr) => arr.findIndex(d => d._doc.index === el._doc.index) === ind)
.sort((a, b) => {
  if (a._doc.category[0] > b._doc.category[0]) {
    return 1;
  } else if (a._doc.category[0] < b._doc.category[0]) {
    return -1;
  } else if (+a._doc.category[1] > +b._doc.category[1]) {
    return 1;
  }
  return -1;
})
.map(el => { return {
    "name": el.lpeName,
    "category": el._doc.category,
    "ru": "/**" + el._doc.source + "*" + "/",
    hash: crypto.createHash('md5').update(el._doc.source.replaceAll(/\n\s+/g, "\n")).digest('hex'),
}}).forEach(el => {
  if (el.category[0] !== cat) {
    if (cat !== "") {
      console.log(`//#endregion ${cat}`);
    }
    cat = el.category[0];
    console.log(`////////////////////////////////`);
    console.log(`////////////////////////////////`);
    console.log(`//#region ${cat}`);
    console.log(`////////////////////////////////`);
    console.log(`////////////////////////////////`);
    console.log(``);
    console.log(``);
  }
  console.log(`//#region ${el.name}`);
  console.log("    " + `"${el.name}": {`);
  console.log("      ru: `" + el.ru.replaceAll(/\n\s+/g, "\n            ").replaceAll("`", "\\`") + "`,");
  console.log("      en: ``,");
  console.log(`      hash: ${el.hash},`);
  console.log("    },");
  console.log(`//#endregion ${el.name}`);
  console.log();
  console.log();
  console.log();
})
console.log(`//#endregion ${cat}`);
 */

export const LOCALE_DOC = {
  "STDLIB": {
////////////////////////////////
////////////////////////////////
//#region Базовые операторы
////////////////////////////////
////////////////////////////////


//#region assign
    "assign": {
      ru: `/**
            * Оператор присваивания. Возвращает значение переменной после присваивания
            *
            * Поддерживает присваивание в переменные и в свойства объектов/массивов
            *
            * @usage assign(lvalue, rvalue)
            * @param lvalue [any] Левая часть присваивания (переменная или путь к свойству)
            * @param rvalue [any] Присваиваемое значение
            *
            * @example assign(x, 10) => 10
            *          assign(obj.key, 20) => 20  ## obj ==> { key: 20 }
            *          obj.a := (obj.b := 10) => 10  ## obj ==> { a: 10, b: 10 }
            * @category Базовые операторы | 1
            */`,
      en: `/**
            * Assignment operator. Returns the variable value after assignment
            *
            * Supports assignment to variables and object/array properties
            *
            * @usage assign(lvalue, rvalue)
            * @param lvalue [any] Left part of assignment (variable or property path)
            * @param rvalue [any] Value to assign
            *
            * @example assign(x, 10) => 10
            *          assign(obj.key, 20) => 20  ## obj ==> { key: 20 }
            *          obj.a := (obj.b := 10) => 10  ## obj ==> { a: 10, b: 10 }
            * @category Basic Operators | 1
            */`,
      hash: 1220500553,
    },
//#endregion assign



//#region add
    "add": {
      ru: `/**
            * Складывает аргументы
            * @usage add(...agrs)
            * @param args [any] Значение для сложения
            * @example add(1, 2, 1) => 4
            *          add(1, '1', 1, 1) => '1111'
            *          1 + 3 => 4
            * @category Базовые операторы | 2
            */`,
      en: `/**
            * Adds arguments
            * @usage add(...args)
            * @param args [any] Values to add
            * @example add(1, 2, 1) => 4
            *          add(1, '1', 1, 1) => '1111'
            *          1 + 3 => 4
            * @category Basic Operators | 2
            */`,
      hash: 850596397,
    },
//#endregion add



//#region minus
    "minus": {
      ru: `/**
            * Вычитает из первого аргумента остальные
            *
            * Если аргумент один, его значение инвертируется
            * @usage minus(value, ...agrs)
            * @param value [number] Уменьшаемое
            * @param args [number] Вычитаемое
            * @usage minus(value)
            * @param value [number] Значение для инвертирования
            * @example minus(1, 2, 1) => -2
            *          minus(5) => -5
            *          1 - 3 => -2
            * @category Базовые операторы | 3
            */`,
      en: `/**
            * Subtracts subsequent arguments from the first one
            *
            * If only one argument is provided, its value is negated
            * @usage minus(value, ...args)
            * @param value [number] Minuend
            * @param args [number] Subtrahends
            * @usage minus(value)
            * @param value [number] Value to negate
            * @example minus(1, 2, 1) => -2
            *          minus(5) => -5
            *          1 - 3 => -2
            * @category Basic Operators | 3
            */`,
      hash: 1516973748,
    },
//#endregion minus



//#region mul
    "mul": {
      ru: `/**
            * Умножает аргументы
            *
            * @usage multiply(...args)
            * @param args [number] Число для умножения
            * @example multiply(2, 3, 4) => 24
            *          2 * 3 * 4 => 24
            * @category Базовые операторы | 4
            */`,
      en: `/**
            * Multiplies arguments
            *
            * @usage multiply(...args)
            * @param args [number] Numbers to multiply
            * @example multiply(2, 3, 4) => 24
            *          2 * 3 * 4 => 24
            * @category Basic Operators | 4
            */`,
      hash: 1425134824,
    },
//#endregion mul



//#region div
    "div": {
      ru: `/**
            * Делит первый аргумент на остальные
            *
            * Если аргумент один, возвращает обратное число
            * @usage div(value, ...args)
            * @param value [number] Делимое
            * @param args [number] Делитель
            *
            * @usage div(value)
            * @param value [number] Число для получения обратного значения
            *
            * @example div(10, 2, 5) => 1
            *          div(5) => 0.2
            *          10 / 2 / 5 => 1
            * @category Базовые операторы | 5
            */`,
      en: `/**
            * Divides the first argument by the rest
            *
            * If only one argument is provided, returns its reciprocal
            * @usage div(value, ...args)
            * @param value [number] Dividend
            * @param args [number] Divisors
            *
            * @usage div(value)
            * @param value [number] Number to get reciprocal of
            *
            * @example div(10, 2, 5) => 1
            *          div(5) => 0.2
            *          10 / 2 / 5 => 1
            * @category Basic Operators | 5
            */`,
      hash: 1417154825,
    },
//#endregion div



//#region eq
    "eq": {
      ru: `/**
            * Проверяет на равенство всех аргументов первому аргументу
            * @usage eq(compared, ...agrs)
            * @param compared [any] Значение, с которым сравниваем
            * @param args [any] Значение, которое сравниваем
            * @example eq(1, 2, 1) => false
            *          eq(1, 1, 1, 1) => true
            *          1 = 3 => false
            * @category Базовые операторы | 6
            */`,
      en: `/**
            * Checks if all arguments are equal to the first argument
            * @usage eq(compared, ...args)
            * @param compared [any] Value to compare against
            * @param args [any] Values to compare
            * @example eq(1, 2, 1) => false
            *          eq(1, 1, 1, 1) => true
            *          1 = 3 => false
            * @category Basic Operators | 6
            */`,
      hash: 1987338757,
    },
//#endregion eq



//#region ne
    "ne": {
      ru: `/**
            * Проверяет, что не все аргументы равны первому
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Значение для сравнения
            * @param args [any] Значения для сравнения
            *
            * @example ne(1, 2, 3) => true
            *          ne(1, 1, 2) => true
            *          ne(1, 1, 1) => false
            *          1 != 2 => true
            * @category Базовые операторы | 7
            */`,
      en: `/**
            * Checks that not all arguments are equal to the first one
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Value to compare
            * @param args [any] Values to compare
            *
            * @example ne(1, 2, 3) => true
            *          ne(1, 1, 2) => true
            *          ne(1, 1, 1) => false
            *          1 != 2 => true
            * @category Basic Operators | 7
            */`,
      hash: 772014558,
    },
//#endregion ne



//#region lt
    "lt": {
      ru: `/**
            * Проверяет, что каждый последующий аргумент больше предыдущего
            *
            * @usage lt(...args)
            * @param args [number] Число для сравнения
            *
            * @example lt(1, 2, 3) => true
            *          lt(1, 3, 2) => false
            *          1 < 2 < 3 => true
            * @category Базовые операторы | 8
            */`,
      en: `/**
            * Checks that each subsequent argument is greater than the previous one
            *
            * @usage lt(...args)
            * @param args [number] Numbers to compare
            *
            * @example lt(1, 2, 3) => true
            *          lt(1, 3, 2) => false
            *          1 < 2 < 3 => true
            * @category Basic Operators | 8
            */`,
      hash: 519906209,
    },
//#endregion lt



//#region gt
    "gt": {
      ru: `/**
            * Проверяет, что каждый последующий аргумент меньше предыдущего
            *
            * @usage gt(...args)
            * @param args [number] Число для сравнения
            *
            * @example gt(3, 2, 1) => true
            *          gt(3, 1, 2) => false
            *          3 > 2 > 1 => true
            * @category Базовые операторы | 9
            */`,
      en: `/**
            * Checks that each subsequent argument is less than the previous one
            *
            * @usage gt(...args)
            * @param args [number] Numbers to compare
            *
            * @example gt(3, 2, 1) => true
            *          gt(3, 1, 2) => false
            *          3 > 2 > 1 => true
            * @category Basic Operators | 9
            */`,
      hash: 132343633,
    },
//#endregion gt



//#region le
    "le": {
      ru: `/**
            * Проверяет, что каждый последующий аргумент больше или равен предыдущему
            *
            * @usage le(...args)
            * @param args [number] Числа для сравнения
            *
            * @example le(1, 2, 2, 3) => true
            *          le(1, 3, 2) => false
            *          1 <= 2 <= 2 <= 3 => true
            * @category Базовые операторы | 10
            */`,
      en: `/**
            * Checks that each subsequent argument is greater than or equal to the previous one
            *
            * @usage le(...args)
            * @param args [number] Numbers to compare
            *
            * @example le(1, 2, 2, 3) => true
            *          le(1, 3, 2) => false
            *          1 <= 2 <= 2 <= 3 => true
            * @category Basic Operators | 10
            */`,
      hash: 1918861581,
    },
//#endregion le



//#region ge
    "ge": {
      ru: `/**
            * Проверяет, что каждый последующий аргумент меньше или равен предыдущему
            *
            * @usage ge(...args)
            * @param args [number] Числа для сравнения
            *
            * @example ge(3, 2, 2, 1) => true
            *          ge(3, 1, 2) => false
            *          3 >= 2 >= 2 >= 1 => true
            * @category Базовые операторы | 11
            */`,
      en: `/**
            * Checks that each subsequent argument is less than or equal to the previous one
            *
            * @usage ge(...args)
            * @param args [number] Numbers to compare
            *
            * @example ge(3, 2, 2, 1) => true
            *          ge(3, 1, 2) => false
            *          3 >= 2 >= 2 >= 1 => true
            * @category Basic Operators | 11
            */`,
      hash: 773632845,
    },
//#endregion ge



//#region not
    "not": {
      ru: `/**
            * Логическое отрицание
            *
            * @usage not(value)
            * @param value [any] Значение для отрицания
            *
            * @example not true => false
            *          not(false) => true
            *          not 0 => true
            * @category Базовые операторы | 20
            */`,
      en: `/**
            * Logical NOT
            *
            * @usage not(value)
            * @param value [any] Value to negate
            *
            * @example not true => false
            *          not(false) => true
            *          not 0 => true
            * @category Basic Operators | 20
            */`,
      hash: 375737648,
    },
//#endregion not



//#region and
    "and": {
      ru: `/**
            * Логического И
            *
            * Вычисляет аргументы последовательно, возвращая первое ложное значение
            * или последнее истинное
            *
            * Аргументы после первого ложного значения не вычисляются
            * @usage and(...exprs)
            * @param exprs [boolean] Выражения
            *
            * @example and(5 > 3, 2 < 4) => true
            *          5 > 3 and 2 < 4 and 10 => 10
            * @category Базовые операторы | 21
            */`,
      en: `/**
            * Logical AND
            *
            * Evaluates arguments sequentially, returning the first falsy value
            * or the last truthy value
            *
            * Arguments after the first falsy value are not evaluated
            * @usage and(...exprs)
            * @param exprs [boolean] Expressions
            *
            * @example and(5 > 3, 2 < 4) => true
            *          5 > 3 and 2 < 4 and 10 => 10
            * @category Basic Operators | 21
            */`,
      hash: 133939371,
    },
//#endregion and



//#region or
    "or": {
      ru: `/**
            * Логическое ИЛИ
            *
            * Вычисляет аргументы последовательно, возвращая первое истинное значение
            * или последнее ложное
            *
            * Аргументы после первого истинного значения не вычисляются
            * @usage or(...exprs)
            * @param exprs [boolean] Выражения
            *
            * @example or(5 > 3, 10 < 4) => true
            *          1 < 0 or false or 2 * 2 => 4
            * @category Базовые операторы | 22
            */`,
      en: `/**
            * Logical OR
            *
            * Evaluates arguments sequentially, returning the first truthy value
            * or the last falsy value
            *
            * Arguments after the first truthy value are not evaluated
            * @usage or(...exprs)
            * @param exprs [boolean] Expressions
            *
            * @example or(5 > 3, 10 < 4) => true
            *          1 < 0 or false or 2 * 2 => 4
            * @category Basic Operators | 22
            */`,
      hash: 642265607,
    },
//#endregion or



//#region logical_or
    "logical_or": {
      ru: `/**
            * Логическое ИЛИ
            *
            * Возвращает true или false
            *
            * > Текстовый оператор \`||\` парсится в \`or\`, из-за чего при выполнении \`1 || 2\` будет вызываться функция \`or\`.
            * <is-warning />
            * @usage logical-or(...exprs)
            * @param exprs [boolean] Выражения для проверки
            *
            * @category Базовые операторы | 23
            */`,
      en: `/**
            * Logical OR
            *
            * Returns true or false
            *
            * > The text operator \`||\` is parsed as \`or\`, so when executing \`1 || 2\`, the \`or\` function will be called.
            * <is-warning />
            * @usage logical-or(...exprs)
            * @param exprs [boolean] Expressions to check
            *
            * @category Basic Operators | 23
            */`,
      hash: 1172969,
    },
//#endregion logical_or



//#region logical_and
    "logical_and": {
      ru: `/**
            * Логическое И
            *
            * Возвращает true или false
            *
            * > Текстовый оператор \`&&\` парсится в \`and\`, из-за чего при выполнении \`1 && 2\` будет вызываться функция \`and\`.
            * <is-warning />
            * @usage logical-and(...exprs)
            * @param exprs [boolean] Выражения для проверки
            *
            * @category Базовые операторы | 24
            */`,
      en: `/**
            * Logical AND
            *
            * Returns true or false
            *
            * > The text operator \`&&\` is parsed as \`and\`, so when executing \`1 && 2\`, the \`and\` function will be called.
            * <is-warning />
            * @usage logical-and(...exprs)
            * @param exprs [boolean] Expressions to check
            *
            * @category Basic Operators | 24
            */`,
      hash: 763742261,
    },
//#endregion logical_and



//#region q
    "q": {
      ru: `/**
            * Оператор строки или получения переменной
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
            * @category Базовые операторы | 29
            */`,
      en: `/**
            * String or variable access operator
            *
            * @usage "value"
            * @param value [string] Value
            *
            * @usage _"variable"
            * @param variable [string] Variable name
            *
            * @example "hello" => "hello"
            *          begin(x := 12, _"x") => 12
            *          begin(x := 12, q("x", "_")) => 12
            * @category Basic Operators | 29
            */`,
      hash: 762726864,
    },
//#endregion q



//#region threadFirst
    "threadFirst": {
      ru: `/**
            * Если правый аргумент - вызов функции, позволяет выполнять последовательные вызовов (thread-first)
            *
            * Подставляет результат левого выражения первым аргументом в следующий вызов
            *
            * Если правый аргумент - числовая или строковая константа,
            * пытаемся взять значение объекта левого выражения по ключю правого выражения
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
            * @example {1, 2, 3}.1 => 2
            *          {a = 2, b = 3}.b => 3
            * @category Базовые операторы | 30
            */`,
      en: `/**
            * If the right argument is a function call, allows sequential calls (thread-first)
            *
            * Inserts the result of the left expression as the first argument in the next call
            *
            * If the right argument is a numeric or string constant,
            * attempts to get the value from the left expression object using the right expression as key
            *
            * @usage expression.func(...args)
            * @param expression [any] Value to be inserted as the first argument in the function
            * @param func [function] Function to call
            * @param args [any] Additional function arguments
            *
            * @usage obj.key
            * @param obj [object | array] Object from which to get value by key
            * @param key [string | number] Key (string constant must be without quotes)
            *
            * @example date.dateShift(-1, "m").toStart("m") => Start date of previous month
            * @example {1, 2, 3}.1 => 2
            *          {a = 2, b = 3}.b => 3
            * @category Basic Operators | 30
            */`,
      hash: 1677976009,
    },
//#endregion threadFirst



//#region threadLast
    "threadLast": {
      ru: `/**
            * Позволяет выполнять последовательных вызовов (thread-last)
            *
            * Подставляет предыдущий результат последним аргументом в следующий вызов
            *
            * @usage expression->>func(...args)
            * @param explression [any] Значение, подставляемое последним аргументом в функцию
            * @param func [function] Вызываемая функция
            * @param args [any] Остальные аргументы функции
            *
            * @example fn({a}, a * 2)->>map({1, 2, 3}) => [2, 4, 6]
            *          ## Выполняется аналогично "map({1, 2, 3}, fn({a}, a * 2))"
            * @category Базовые операторы | 31
            */`,
      en: `/**
            * Allows sequential calls (thread-last)
            *
            * Inserts the previous result as the last argument in the next call
            *
            * @usage expression->>func(...args)
            * @param expression [any] Value to be inserted as the last argument in the function
            * @param func [function] Function to call
            * @param args [any] Additional function arguments
            *
            * @example fn({a}, a * 2)->>map({1, 2, 3}) => [2, 4, 6]
            *          ## Executed similarly to "map({1, 2, 3}, fn({a}, a * 2))"
            * @category Basic Operators | 31
            */`,
      hash: 2118300754,
    },
//#endregion threadLast



//#region invoke
    "invoke": {
      ru: `/**
            * Вызова метода объекта
            *
            * @usage invoke(obj, method, ...args)
            * @param obj [object] Объект
            * @param method [string] Имя метода
            * @param args [any] Аргументы метода
            *
            * @example invoke({1, 2, 3}, "toString") => "1,2,3"
            *          invoke({1, 2, 3}, concat, {4, 5, 6}) => [1,2,3,4,5,6]
            *          invoke({1, 2, 3}, "con" + "cat", {4, 5, 6}) => [1,2,3,4,5,6]
            * @category Базовые операторы | 40
            */`,
      en: `/**
            * Calls an object method
            *
            * @usage invoke(obj, method, ...args)
            * @param obj [object] Object
            * @param method [string] Method name
            * @param args [any] Method arguments
            *
            * @example invoke({1, 2, 3}, "toString") => "1,2,3"
            *          invoke({1, 2, 3}, concat, {4, 5, 6}) => [1,2,3,4,5,6]
            *          invoke({1, 2, 3}, "con" + "cat", {4, 5, 6}) => [1,2,3,4,5,6]
            * @category Basic Operators | 40
            */`,
      hash: 536811214,
    },
//#endregion invoke



//#region apply
    "apply": {
      ru: `/**
            * Применяет функцию к списку аргументов
            *
            * @usage apply(fn, ...args)
            * @param fn [function] Функция
            * @param args [any] Аргументы функции
            *
            * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
            * @category Базовые операторы | 41
            */`,
      en: `/**
            * Applies a function to a list of arguments
            *
            * @usage apply(fn, ...args)
            * @param fn [function] Function
            * @param args [any] Function arguments
            *
            * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
            * @category Basic Operators | 41
            */`,
      hash: 1581126420,
    },
//#endregion apply



//#endregion Базовые операторы
////////////////////////////////
////////////////////////////////
//#region Внутренние функции
////////////////////////////////
////////////////////////////////


//#region _call_obj_meth_
    "_call_obj_meth_": {
      ru: `/**
            * Вызывает метод объекта (внутренняя функция для макроса invoke)
            *
            * @usage _call_obj_meth_(obj, method, ...args)
            * @param obj [object] Объект
            * @param method [string] Имя метода
            * @param args [any] Аргументы метода
            *
            * @example _call_obj_meth_([1,2,3], "push", 4) => 4
            *          ## массив становится [1,2,3,4]
            * @category Внутренние функции | 1
            * @tags hidden
            */`,
      en: `/**
            * Calls an object method (internal function for invoke macro)
            *
            * @usage _call_obj_meth_(obj, method, ...args)
            * @param obj [object] Object
            * @param method [string] Method name
            * @param args [any] Method arguments
            *
            * @example _call_obj_meth_([1,2,3], "push", 4) => 4
            *          ## array becomes [1,2,3,4]
            * @category Internal Functions | 1
            * @tags hidden
            */`,
      hash: 247943456,
    },
//#endregion _call_obj_meth_



//#endregion Внутренние функции
////////////////////////////////
////////////////////////////////
//#region Вывод
////////////////////////////////
////////////////////////////////


//#region println
    "println": {
      ru: `/**
            * Выводит значения в консоль
            *
            * @usage println(...args)
            * @param args [any] Значения для вывода
            *
            * @example println("Hello", "World") => Hello World
            * @category Вывод | 1
            */`,
      en: `/**
            * Prints values to console
            *
            * @usage println(...args)
            * @param args [any] Values to print
            *
            * @example println("Hello", "World") => Hello World
            * @category Output | 1
            */`,
      hash: 1480640110,
    },
//#endregion println



//#region prn
    "prn": {
      ru: `/**
            * Выводит JSON-представление значений в консоль. Строки оборачиваются в двойные кавычки.
            *
            * @usage prn(...args)
            * @param args [any] Значения для вывода
            *
            * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
            * @category Вывод | 2
            */`,
      en: `/**
            * Prints JSON representation of values to console. Strings are wrapped in double quotes.
            *
            * @usage prn(...args)
            * @param args [any] Values to print
            *
            * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
            * @category Output | 2
            */`,
      hash: 1429852484,
    },
//#endregion prn



//#region print
    "print": {
      ru: `/**
            * Выводит значения в консоль (без форматирования)
            *
            * @usage print(...args)
            * @param args [any] Значения для вывода
            *
            * @example print("Hello", "World") => Hello World
            * @example print(1, 2, 3) => 1 2 3
            * @category Вывод | 3
            */`,
      en: `/**
            * Prints values to console (without formatting)
            *
            * @usage print(...args)
            * @param args [any] Values to print
            *
            * @example print("Hello", "World") => Hello World
            * @example print(1, 2, 3) => 1 2 3
            * @category Output | 3
            */`,
      hash: 1430612185,
    },
//#endregion print



//#endregion Вывод
////////////////////////////////
////////////////////////////////
//#region Интерпретатор
////////////////////////////////
////////////////////////////////


//#region rep
    "rep": {
      ru: `/**
            * Вычисляет AST и возвращает JSON-представление результата
            *
            * @usage rep(str)
            * @param str [string] Строка с LPE-кодом
            *
            * @example rep('["+", 1, 2]') => "3"
            * @category Интерпретатор | 1
            */`,
      en: `/**
            * Evaluates AST and returns JSON representation of the result
            *
            * @usage rep(str)
            * @param str [string] String with LPE code
            *
            * @example rep('["+", 1, 2]') => "3"
            * @category Interpreter | 1
            */`,
      hash: 821728943,
    },
//#endregion rep



//#region eval
    "eval": {
      ru: `/**
            * Вычисляет LPE-AST в контексте STDLIB
            *
            * @usage eval(expr)
            * @param expr [ast] LPE-выражение
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Интерпретатор | 2
            */`,
      en: `/**
            * Evaluates LPE-AST with STDLIB context
            *
            * @usage eval(expr)
            * @param expr [ast] LPE expression
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Interpreter | 2
            */`,
      hash: 1566833786,
    },
//#endregion eval



//#region eval
    "eval_ast": {
      ru: `/**
            * Вычисляет LPE-AST
            *
            * @usage eval(expr)
            * @param expr [ast] LPE-выражение
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Интерпретатор | 3
            */`,
      en: `/**
            * Evaluates LPE-AST
            *
            * @usage eval(expr)
            * @param expr [ast] LPE expression
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Interpreter | 3
            */`,
      hash: 1693133156,
    },
//#endregion eval



//#region eval_lpe
    "eval_lpe": {
      ru: `/**
            * Вычисляет LPE-код из строки
            *
            * @usage eval_lpe(str)
            * @param str [string] Строка с LPE-кодом
            *
            * @example eval_lpe("1 + 2") => 3
            * @category Интерпретатор | 4
            */`,
      en: `/**
            * Evaluates LPE code from a string
            *
            * @usage eval_lpe(str)
            * @param str [string] String with LPE code
            *
            * @example eval_lpe("1 + 2") => 3
            * @category Interpreter | 4
            */`,
      hash: 1807085207,
    },
//#endregion eval_lpe



//#endregion Интерпретатор
////////////////////////////////
////////////////////////////////
//#region Исключения
////////////////////////////////
////////////////////////////////


//#region throw
    "throw": {
      ru: `/**
            * Выбрасывает исключение
            *
            * @usage throw(error)
            * @param error [string] Ошибка для выбрасывания
            *
            * @example throw("Error message")
            * @category Исключения | 1
            */`,
      en: `/**
            * Throws an exception
            *
            * @usage throw(error)
            * @param error [string] Error to throw
            *
            * @example throw("Error message")
            * @category Exceptions | 1
            */`,
      hash: 402427087,
    },
//#endregion throw



//#region try
    "try": {
      ru: `/**
            * Обработка исключений
            *
            * @usage try(expr, errorName, catch)
            * @param expr [any] Выражение для выполнения
            * @param errorName [string] Имя, по которому можно обратиться к объекту исключения
            * @param catch [any] Выражение для выполнения при ошибке
            *
            * @example try(throw("Текст ошибки"), ex, println("Ошибка:", ex)) => Ошибка: Текст ошибки
            * @category Исключения | 2
            */`,
      en: `/**
            * Exception handling
            *
            * @usage try(expr, errorName, catch)
            * @param expr [any] Expression to execute
            * @param errorName [string] Name to access the exception object
            * @param catch [any] Expression to execute on error
            *
            * @example try(throw("Error text"), ex, println("Error:", ex)) => Error: Error text
            * @category Exceptions | 2
            */`,
      hash: 22383858,
    },
//#endregion try



//#endregion Исключения
////////////////////////////////
////////////////////////////////
//#region Календарные функции
////////////////////////////////
////////////////////////////////


//#region now
    "now": {
      ru: `/**
            * Возвращает текущую дату в формате YYYY-MM-DD
            *
            * @usage today()
            *
            * @example today() => "2024-01-15" (зависит от текущей даты)
            * @category Календарные функции | 1
            */`,
      en: `/**
            * Returns current date in YYYY-MM-DD format
            *
            * @usage today()
            *
            * @example today() => "2024-01-15" (depends on current date)
            * @category Calendar Functions | 1
            */`,
      hash: 2040176380,
    },
//#endregion now



//#region toStart
    "toStart": {
      ru: `/**
            * Возвращает начало периода
            *
            * @usage toStart(date, unit)
            * @param date [string] Дата
            * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage toStart(unit)
            * @param unit [DateUnit] Период (для текущей даты)
            *
            * @example toStart("2024-01-15", 'm') => "2024-01-01"
            *          toStart("2024-01-15", 'q') => "2024-01-01"
            *          toStart('y') => начало текущего года
            * @category Календарные функции | 5
            */`,
      en: `/**
            * Returns the start of a period
            *
            * @usage toStart(date, unit)
            * @param date [string] Date
            * @param unit [DateUnit] Period: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage toStart(unit)
            * @param unit [DateUnit] Period (for current date)
            *
            * @example toStart("2024-01-15", 'm') => "2024-01-01"
            *          toStart("2024-01-15", 'q') => "2024-01-01"
            *          toStart('y') => start of current year
            * @category Calendar Functions | 5
            */`,
      hash: 1005613334,
    },
//#endregion toStart



//#region toEnd
    "toEnd": {
      ru: `/**
            * Возвращает конец периода
            *
            * @usage toEnd(date, unit)
            * @param date [string] Дата
            * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage toEnd(unit)
            * @param unit [string] Период (для текущей даты)
            *
            * @example toEnd("2024-01-15", 'm') => "2024-01-31"
            *          toEnd("2024-01-15", 'q') => "2024-03-31"
            *          toEnd('y') => конец текущего года
            * @category Календарные функции | 6
            */`,
      en: `/**
            * Returns the end of a period
            *
            * @usage toEnd(date, unit)
            * @param date [string] Date
            * @param unit [DateUnit] Period: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage toEnd(unit)
            * @param unit [string] Period (for current date)
            *
            * @example toEnd("2024-01-15", 'm') => "2024-01-31"
            *          toEnd("2024-01-15", 'q') => "2024-03-31"
            *          toEnd('y') => end of current year
            * @category Calendar Functions | 6
            */`,
      hash: 2037337847,
    },
//#endregion toEnd



//#region dateShift
    "dateShift": {
      ru: `/**
            * Сдвигает дату на указанное количество единиц времени
            *
            * Поддерживает несколько вариантов вызова:
            * 1. С указанием начальной даты: dateShift(start, delta, unit)
            * 2. С начальной датой по умолчанию (сегодня): dateShift(delta, unit)
            * 3. С массивом дат: dateShift([start1, start2], delta, unit) сдвигает обе даты
            *
            * @usage dateShift(start, delta, unit)
            * @param start [string] Начальная дата (YYYY-MM-DD)
            * @param delta [number] Величина сдвига (положительная или отрицательная)
            * @param unit [DateUnit] Единица измерения: 'd'/'day', 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage dateShift(delta, unit)
            * @param delta [number] Величина сдвига
            * @param unit [DateUnit] Единица измерения
            *
            * @usage dateShift([start1, start2], delta, unit)
            * @param dates [array] Массив дат
            * @param delta [number] Величина сдвига
            * @param unit [DateUnit] Единица измерения
            *
            * @example dateShift("2024-01-15", 5, 'd') => "2024-01-20"
            *          dateShift("2024-01-15", -1, 'm') => "2023-12-15"
            *          dateShift(3, 'd') => сдвигает сегодняшнюю дату на 3 дня
            *          dateShift(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-02-01", "2024-02-29"]
            * @category Календарные функции | 7
            */`,
      en: `/**
            * Shifts a date by a specified number of time units
            *
            * Supports multiple call variants:
            * 1. With start date specified: dateShift(start, delta, unit)
            * 2. With default start date (today): dateShift(delta, unit)
            * 3. With array of dates: dateShift([start1, start2], delta, unit) shifts both dates
            *
            * @usage dateShift(start, delta, unit)
            * @param start [string] Start date (YYYY-MM-DD)
            * @param delta [number] Shift amount (positive or negative)
            * @param unit [DateUnit] Time unit: 'd'/'day', 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage dateShift(delta, unit)
            * @param delta [number] Shift amount
            * @param unit [DateUnit] Time unit
            *
            * @usage dateShift([start1, start2], delta, unit)
            * @param dates [array] Array of dates
            * @param delta [number] Shift amount
            * @param unit [DateUnit] Time unit
            *
            * @example dateShift("2024-01-15", 5, 'd') => "2024-01-20"
            *          dateShift("2024-01-15", -1, 'm') => "2023-12-15"
            *          dateShift(3, 'd') => shifts today's date by 3 days
            *          dateShift(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-02-01", "2024-02-29"]
            * @category Calendar Functions | 7
            */`,
      hash: 1010561875,
    },
//#endregion dateShift



//#region bound
    "bound": {
      ru: `/**
            * Возвращает границы периода (начало и конец)
            *
            * @usage bound(date, unit)
            * @param date [string] Дата (YYYY-MM-DD)
            * @param unit [DateUnit] Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage bound(unit)
            * @param unit [DateUnit] Период (для текущей даты)
            *
            * @example bound("2024-01-15", 'm') => ["2024-01-01", "2024-01-31"]
            *          bound("2024-01-15", 'q') => ["2024-01-01", "2024-03-31"]
            *          bound('w') => границы текущей недели
            * @category Календарные функции | 10
            */`,
      en: `/**
            * Returns period boundaries (start and end)
            *
            * @usage bound(date, unit)
            * @param date [string] Date (YYYY-MM-DD)
            * @param unit [DateUnit] Period: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage bound(unit)
            * @param unit [DateUnit] Period (for current date)
            *
            * @example bound("2024-01-15", 'm') => ["2024-01-01", "2024-01-31"]
            *          bound("2024-01-15", 'q') => ["2024-01-01", "2024-03-31"]
            *          bound('w') => boundaries of current week
            * @category Calendar Functions | 10
            */`,
      hash: 1065710309,
    },
//#endregion bound



//#region extend
    "extend": {
      ru: `/**
            * Расширяет период, сдвигая конечную дату
            *
            * @usage extend(start, delta, unit)
            * @param start [string] Начальная дата
            * @param delta [number] Величина расширения
            * @param unit [DateUnit] Единица измерения: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage extend(delta, unit)
            * @param delta [number] Величина расширения
            * @param unit [DateUnit] Единица измерения (от текущей даты)
            *
            * @usage extend([start, end], delta, unit)
            * @param period [array] Период [начало, конец]
            * @param delta [number] Величина расширения
            * @param unit [DateUnit] Единица измерения
            *
            * @example extend("2024-01-01", 5, 'd') => ["2024-01-01", "2024-01-06"]
            * @example extend(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-01-01", "2024-02-29"]
            * @category Календарные функции | 11
            */`,
      en: `/**
            * Extends a period by shifting the end date
            *
            * @usage extend(start, delta, unit)
            * @param start [string] Start date
            * @param delta [number] Extension amount
            * @param unit [DateUnit] Time unit: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'
            *
            * @usage extend(delta, unit)
            * @param delta [number] Extension amount
            * @param unit [DateUnit] Time unit (from current date)
            *
            * @usage extend([start, end], delta, unit)
            * @param period [array] Period [start, end]
            * @param delta [number] Extension amount
            * @param unit [DateUnit] Time unit
            *
            * @example extend("2024-01-01", 5, 'd') => ["2024-01-01", "2024-01-06"]
            * @example extend(["2024-01-01", "2024-01-31"], 1, 'm') => ["2024-01-01", "2024-02-29"]
            * @category Calendar Functions | 11
            */`,
      hash: 1468477186,
    },
//#endregion extend



//#region isoy
    "isoy": {
      ru: `/**
            * Возвращает год в формате ISO
            *
            * @usage isoy(date)
            * @param date [string] Дата
            *
            * @example isoy("2024-01-15") => "2024"
            * @category Календарные функции | 20
            */`,
      en: `/**
            * Returns year in ISO format
            *
            * @usage isoy(date)
            * @param date [string] Date
            *
            * @example isoy("2024-01-15") => "2024"
            * @category Calendar Functions | 20
            */`,
      hash: 1036865957,
    },
//#endregion isoy



//#region isoq
    "isoq": {
      ru: `/**
            * Возвращает квартал в формате ISO (YYYY-Qx)
            *
            * @usage isoq(date)
            * @param date [string] Дата
            *
            * @example isoq("2024-01-15") => "2024-Q1"
            *          isoq("2024-05-15") => "2024-Q2"
            * @category Календарные функции | 21
            */`,
      en: `/**
            * Returns quarter in ISO format (YYYY-Qx)
            *
            * @usage isoq(date)
            * @param date [string] Date
            *
            * @example isoq("2024-01-15") => "2024-Q1"
            *          isoq("2024-05-15") => "2024-Q2"
            * @category Calendar Functions | 21
            */`,
      hash: 1267447457,
    },
//#endregion isoq



//#region isom
    "isom": {
      ru: `/**
            * Возвращает месяц в формате ISO (YYYY-MM)
            *
            * @usage isom(date)
            * @param date [string] Дата
            *
            * @example isom("2024-01-15") => "2024-01"
            * @category Календарные функции | 22
            */`,
      en: `/**
            * Returns month in ISO format (YYYY-MM)
            *
            * @usage isom(date)
            * @param date [string] Date
            *
            * @example isom("2024-01-15") => "2024-01"
            * @category Calendar Functions | 22
            */`,
      hash: 1625369651,
    },
//#endregion isom



//#region isow
    "isow": {
      ru: `/**
            * Возвращает неделю в формате ISO (YYYY-Www)
            *
            * @usage isow(date)
            * @param date [string] Дата
            *
            * @example isow("2024-01-15") => "2024-W03"
            * @category Календарные функции | 23
            */`,
      en: `/**
            * Returns week in ISO format (YYYY-Www)
            *
            * @usage isow(date)
            * @param date [string] Date
            *
            * @example isow("2024-01-15") => "2024-W03"
            * @category Calendar Functions | 23
            */`,
      hash: 1411821749,
    },
//#endregion isow



//#region isod
    "isod": {
      ru: `/**
            * Возвращает день года в формате ISO (YYYY-ddd)
            *
            * @usage isod(date)
            * @param date [string] Дата
            *
            * @example isod("2024-01-15") => "2024-015"
            * @category Календарные функции | 24
            */`,
      en: `/**
            * Returns day of year in ISO format (YYYY-ddd)
            *
            * @usage isod(date)
            * @param date [string] Date
            *
            * @example isod("2024-01-15") => "2024-015"
            * @category Calendar Functions | 24
            */`,
      hash: 118973092,
    },
//#endregion isod



//#region year
    "year": {
      ru: `/**
            * Возвращает год как число
            *
            * @usage year(date)
            * @param date [string] Дата
            *
            * @example year("2024-01-15") => 2024
            * @category Календарные функции | 30
            */`,
      en: `/**
            * Returns year as number
            *
            * @usage year(date)
            * @param date [string] Date
            *
            * @example year("2024-01-15") => 2024
            * @category Calendar Functions | 30
            */`,
      hash: 990014645,
    },
//#endregion year



//#region hoty
    "hoty": {
      ru: `/**
            * Возвращает номер полугодия (1 или 2)
            *
            * @usage hoty(date)
            * @param date [string] Дата
            *
            * @example hoty("2024-01-15") => 1
            *          hoty("2024-07-15") => 2
            * @category Календарные функции | 31
            */`,
      en: `/**
            * Returns half of the year number (1 or 2)
            *
            * @usage hoty(date)
            * @param date [string] Date
            *
            * @example hoty("2024-01-15") => 1
            *          hoty("2024-07-15") => 2
            * @category Calendar Functions | 31
            */`,
      hash: 146533368,
    },
//#endregion hoty



//#region qoty
    "qoty": {
      ru: `/**
            * Возвращает номер квартала (1-4)
            *
            * @usage qoty(date)
            * @param date [string] Дата
            *
            * @example qoty("2024-01-15") => 1
            *          qoty("2024-10-15") => 4
            * @category Календарные функции | 32
            */`,
      en: `/**
            * Returns quarter number (1-4)
            *
            * @usage qoty(date)
            * @param date [string] Date
            *
            * @example qoty("2024-01-15") => 1
            *          qoty("2024-10-15") => 4
            * @category Calendar Functions | 32
            */`,
      hash: 134810040,
    },
//#endregion qoty



//#region moty
    "moty": {
      ru: `/**
            * Возвращает номер месяца (1-12)
            *
            * @usage moty(date)
            * @param date [string] Дата
            *
            * @example moty("2024-01-15") => 1
            *          moty("2024-12-15") => 12
            * @category Календарные функции | 33
            */`,
      en: `/**
            * Returns month number (1-12)
            *
            * @usage moty(date)
            * @param date [string] Date
            *
            * @example moty("2024-01-15") => 1
            *          moty("2024-12-15") => 12
            * @category Calendar Functions | 33
            */`,
      hash: 527688067,
    },
//#endregion moty



//#region woty
    "woty": {
      ru: `/**
            * Возвращает номер недели в году (1-53)
            *
            * @usage woty(date)
            * @param date [string] Дата
            *
            * @example woty("2024-01-15") => 3
            * @category Календарные функции | 34
            */`,
      en: `/**
            * Returns week number in year (1-53)
            *
            * @usage woty(date)
            * @param date [string] Date
            *
            * @example woty("2024-01-15") => 3
            * @category Calendar Functions | 34
            */`,
      hash: 2071284685,
    },
//#endregion woty



//#region doty
    "doty": {
      ru: `/**
            * Возвращает номер дня в году (1-366)
            *
            * @usage doty(date)
            * @param date [string] Дата
            *
            * @example doty("2024-01-15") => 15
            * @example doty("2024-12-31") => 366 (високосный год)
            * @category Календарные функции | 35
            */`,
      en: `/**
            * Returns day number in year (1-366)
            *
            * @usage doty(date)
            * @param date [string] Date
            *
            * @example doty("2024-01-15") => 15
            * @example doty("2024-12-31") => 366 (leap year)
            * @category Calendar Functions | 35
            */`,
      hash: 1068219097,
    },
//#endregion doty



//#endregion Календарные функции
////////////////////////////////
////////////////////////////////
//#region Макросы
////////////////////////////////
////////////////////////////////


//#region firstArg
    "firstArg": {
      ru: `/**
            * Возвращает первый аргумент
            * @usage firstArg(...args)
            * @param args [any] Выражения
            *
            * @example firstArg(1, 2, 3) => 1
            * @category Макросы | 1
            */`,
      en: `/**
            * Returns the first argument
            * @usage firstArg(...args)
            * @param args [any] Expressions
            *
            * @example firstArg(1, 2, 3) => 1
            * @category Macros | 1
            */`,
      hash: 1789207788,
    },
//#endregion firstArg



//#region macroexpand
    "macroexpand": {
      ru: `/**
            * Раскрывает макрос без его выполнения
            *
            * @usage macroexpand(expr)
            * @param expr [any] Выражение
            *
            * @category Макросы | 8
            */`,
      en: `/**
            * Expands a macro without executing it
            *
            * @usage macroexpand(expr)
            * @param expr [any] Expression
            *
            * @category Macros | 8
            */`,
      hash: 561870073,
    },
//#endregion macroexpand



//#endregion Макросы
////////////////////////////////
////////////////////////////////
//#region Математические функции
////////////////////////////////
////////////////////////////////


//#region rand
    "rand": {
      ru: `/**
            * Возвращает случайное число от 0 до 1
            *
            * @usage rand()
            *
            * @example rand() => 0.123456789
            * @category Математические функции | 7
            */`,
      en: `/**
            * Returns a random number between 0 and 1
            *
            * @usage rand()
            *
            * @example rand() => 0.123456789
            * @category Mathematical Functions | 7
            */`,
      hash: 1956481019,
    },
//#endregion rand



//#region max
    "max": {
      ru: `/**
            * Находит максимальное число в массиве
            *
            * @usage max(array)
            * @param array [array] Массив чисел
            *
            * @example max({1, 5, 2, 8, 3}) => 8
            * @category Математические функции | 10
            */`,
      en: `/**
            * Finds the maximum number in an array
            *
            * @usage max(array)
            * @param array [array] Array of numbers
            *
            * @example max({1, 5, 2, 8, 3}) => 8
            * @category Mathematical Functions | 10
            */`,
      hash: 338272959,
    },
//#endregion max



//#region min
    "min": {
      ru: `/**
            * Находит минимальное число в массиве
            *
            * @usage min(array)
            * @param array [array] Массив чисел
            *
            * @example min([1, 5, 2, 8, 3]) => 1
            * @category Математические функции | 11
            */`,
      en: `/**
            * Finds the minimum number in an array
            *
            * @usage min(array)
            * @param array [array] Array of numbers
            *
            * @example min([1, 5, 2, 8, 3]) => 1
            * @category Mathematical Functions | 11
            */`,
      hash: 1455114709,
    },
//#endregion min



//#endregion Математические функции
////////////////////////////////
////////////////////////////////
//#region Преобразование типов
////////////////////////////////
////////////////////////////////


//#region toAny
    "toAny": {
      ru: `/**
            * Преобразует значение в any (возвращает как есть)
            *
            * @usage toAny(value)
            * @param value [any] Исходное значение
            *
            * @example toAny(42) => 42
            *          toAny("hello") => "hello"
            * @category Преобразование типов | 1
            */`,
      en: `/**
            * Converts value to any (returns as is)
            *
            * @usage toAny(value)
            * @param value [any] Original value
            *
            * @example toAny(42) => 42
            *          toAny("hello") => "hello"
            * @category Type Conversion | 1
            */`,
      hash: 179809716,
    },
//#endregion toAny



//#region toBool
    "toBool": {
      ru: `/**
            * Преобразует значение в булевый тип
            *
            * @usage toBool(value)
            * @param value [any] Исходное значение
            *
            * @example toBool(1) => true
            *          toBool(0) => false
            *          toBool("") => false
            *          toBool("text") => true
            * @category Преобразование типов | 2
            */`,
      en: `/**
            * Converts value to boolean type
            *
            * @usage toBool(value)
            * @param value [any] Original value
            *
            * @example toBool(1) => true
            *          toBool(0) => false
            *          toBool("") => false
            *          toBool("text") => true
            * @category Type Conversion | 2
            */`,
      hash: 217678126,
    },
//#endregion toBool



//#region toInt
    "toInt": {
      ru: `/**
            * Преобразует значение в число
            *
            * @usage toInt(value)
            * @param value [any] Исходное значение
            *
            * @example toInt("42") => 42
            *          toInt(3.14) => 3.14
            *          toInt(true) => 1
            *          toInt(false) => 0
            * @category Преобразование типов | 3
            */`,
      en: `/**
            * Converts value to number
            *
            * @usage toInt(value)
            * @param value [any] Original value
            *
            * @example toInt("42") => 42
            *          toInt(3.14) => 3.14
            *          toInt(true) => 1
            *          toInt(false) => 0
            * @category Type Conversion | 3
            */`,
      hash: 720341576,
    },
//#endregion toInt



//#region toStr
    "toStr": {
      ru: `/**
            * Преобразует значение в строку
            *
            * @usage toStr(value)
            * @param value [any] Исходное значение
            *
            * @example toStr(42) => "42"
            *          toStr(true) => "true"
            *          toStr({1, 2, 3}) => "1,2,3"
            * @category Преобразование типов | 4
            */`,
      en: `/**
            * Converts value to string
            *
            * @usage toStr(value)
            * @param value [any] Original value
            *
            * @example toStr(42) => "42"
            *          toStr(true) => "true"
            *          toStr({1, 2, 3}) => "1,2,3"
            * @category Type Conversion | 4
            */`,
      hash: 1023661636,
    },
//#endregion toStr



//#region astToString
    "astToString": {
      ru: `/**
            * Преобразовать в строку AST дерево выражения
            *
            * @usage astToString(value)
            * @param value [any] Значение
            *
            * @example astToString(123) => "123"
            *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
            * @category Преобразование типов | 10
            */`,
      en: `/**
            * Converts expression AST tree to string
            *
            * @usage astToString(value)
            * @param value [any] Value
            *
            * @example astToString(123) => "123"
            *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
            * @category Type Conversion | 10
            */`,
      hash: 1960694766,
    },
//#endregion astToString



//#region pr_str
    "pr_str": {
      ru: `/**
            * Преобразует значения в JSON-строки и объединяет через пробел
            *
            * @usage pr_str(...args)
            * @param args [any] Значения
            *
            * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
            * @category Преобразование типов | 11
            */`,
      en: `/**
            * Converts values to JSON strings and joins with spaces
            *
            * @usage pr_str(...args)
            * @param args [any] Values
            *
            * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
            * @category Type Conversion | 11
            */`,
      hash: 79820235,
    },
//#endregion pr_str



//#region str
    "str": {
      ru: `/**
            * Преобразует аргументы в строку и объединяет
            *
            * @usage str(...args)
            * @param args [any] Значения для преобразования
            *
            * @example str(1, 2, 3) => "123"
            *          str("a", 1) => "a1"
            *          str("a", {1,2,3}) => "a[1,2,3]"
            * @category Преобразование типов | 12
            */`,
      en: `/**
            * Converts arguments to string and joins them
            *
            * @usage str(...args)
            * @param args [any] Values to convert
            *
            * @example str(1, 2, 3) => "123"
            *          str("a", 1) => "a1"
            *          str("a", {1,2,3}) => "a[1,2,3]"
            * @category Type Conversion | 12
            */`,
      hash: 539160551,
    },
//#endregion str



//#region json_parse
    "json_parse": {
      ru: `/**
            * Преобразует JSON-строку в объект
            *
            * @usage json_parse(str)
            * @param str [string] JSON-строка
            *
            * @example json_parse('{"a": 1}') => {a: 1}
            * @category Преобразование типов | 13
            */`,
      en: `/**
            * Parses JSON string into an object
            *
            * @usage json_parse(str)
            * @param str [string] JSON string
            *
            * @example json_parse('{"a": 1}') => {a: 1}
            * @category Type Conversion | 13
            */`,
      hash: 1535779618,
    },
//#endregion json_parse



//#endregion Преобразование типов
////////////////////////////////
////////////////////////////////
//#region Type Checks
////////////////////////////////
////////////////////////////////


//#region isa
    "isa": {
      ru: `/**
            * Проверяет, является ли объект экземпляром класса
            *
            * @usage isa(obj, class)
            * @param obj [any] Проверяемый объект
            * @param class [any] Класс
            *
            * @example isa({1,2,3}, Array) => true
            * @category Проверки типов | 1
            */`,
      en: `/**
            * Checks if an object is an instance of a class
            *
            * @usage isa(obj, class)
            * @param obj [any] Object to check
            * @param class [any] Class
            *
            * @example isa({1,2,3}, Array) => true
            * @category Type Checks | 1
            */`,
      hash: 1371434136,
    },
//#endregion isa



//#region type
    "type": {
      ru: `/**
            * Возвращает тип значения
            *
            * @usage type(value)
            * @param value [any] Проверяемое значение
            *
            * @example type(123) => "number"
            *          type("hello") => "string"
            * @category Проверки типов | 2
            */`,
      en: `/**
            * Returns the type of a value
            *
            * @usage type(value)
            * @param value [any] Value to check
            *
            * @example type(123) => "number"
            *          type("hello") => "string"
            * @category Type Checks | 2
            */`,
      hash: 160095415,
    },
//#endregion type



//#region isNull
    "isNull": {
      ru: `/**
            * Проверяет, является ли значение null или undefined
            *
            * @usage isNull(value)
            * @param value [any] Проверяемое значение
            *
            * @example isNull(null) => true
            *          isNull(undefined) => true
            *          isNull(0) => false
            * @category Проверки типов | 3
            */`,
      en: `/**
            * Checks if a value is null or undefined
            *
            * @usage isNull(value)
            * @param value [any] Value to check
            *
            * @example isNull(null) => true
            *          isNull(undefined) => true
            *          isNull(0) => false
            * @category Type Checks | 3
            */`,
      hash: 74569589,
    },
//#endregion isNull



//#region isTrue
    "isTrue": {
      ru: `/**
            * Проверяет, является ли значение true
            *
            * @usage isTrue(value)
            * @param value [any] Проверяемое значение
            *
            * @example isTrue(true) => true
            *          isTrue(1) => false
            * @category Проверки типов | 4
            */`,
      en: `/**
            * Checks if a value is true
            *
            * @usage isTrue(value)
            * @param value [any] Value to check
            *
            * @example isTrue(true) => true
            *          isTrue(1) => false
            * @category Type Checks | 4
            */`,
      hash: 1569513900,
    },
//#endregion isTrue



//#region isFalse
    "isFalse": {
      ru: `/**
            * Проверяет, является ли значение false
            *
            * @usage isFalse(value)
            * @param value [any] Проверяемое значение
            *
            * @example isFalse(false) => true
            *          isFalse(0) => false
            * @category Проверки типов | 5
            */`,
      en: `/**
            * Checks if a value is false
            *
            * @usage isFalse(value)
            * @param value [any] Value to check
            *
            * @example isFalse(false) => true
            *          isFalse(0) => false
            * @category Type Checks | 5
            */`,
      hash: 2036846555,
    },
//#endregion isFalse



//#region classOf
    "classOf": {
      ru: `/**
            * Возвращает имя класса объекта
            *
            * @usage classOf(obj)
            * @param obj [any] Объект
            *
            * @example classOf({}) => "[object Array]"
            * @category Проверки типов | 6
            */`,
      en: `/**
            * Returns the class name of an object
            *
            * @usage classOf(obj)
            * @param obj [any] Object
            *
            * @example classOf({}) => "[object Array]"
            * @category Type Checks | 6
            */`,
      hash: 132582099,
    },
//#endregion classOf



//#region isArray
    "isArray": {
      ru: `/**
            * Проверяет, является ли аргумент массивом
            *
            * @usage isArray(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isArray({1, 2, 3}) => true
            *          isArray({a = 1}) => false
            *          isArray({1, 2, a = 1}) => true
            *          isArray("hello") => false
            * @category Проверки типов | 7
            */`,
      en: `/**
            * Checks if an argument is an array
            *
            * @usage isArray(arg)
            * @param arg [any] Value to check
            *
            * @example isArray({1, 2, 3}) => true
            *          isArray({a = 1}) => false
            *          isArray({1, 2, a = 1}) => true
            *          isArray("hello") => false
            * @category Type Checks | 7
            */`,
      hash: 737360713,
    },
//#endregion isArray



//#region isString
    "isString": {
      ru: `/**
            * Проверяет, является ли аргумент строкой
            *
            * @usage isString(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isString("hello") => true
            *          isString(123) => false
            *          isString({1, 2}) => false
            * @category Проверки типов | 8
            */`,
      en: `/**
            * Checks if an argument is a string
            *
            * @usage isString(arg)
            * @param arg [any] Value to check
            *
            * @example isString("hello") => true
            *          isString(123) => false
            *          isString({1, 2}) => false
            * @category Type Checks | 8
            */`,
      hash: 1601485705,
    },
//#endregion isString



//#endregion Проверки типов
////////////////////////////////
////////////////////////////////
//#region Работа с объектами
////////////////////////////////
////////////////////////////////


//#region identity
    "identity": {
      ru: `/**
            * Возвращает переданный аргумент
            *
            * @usage identity(value)
            * @param value [any] Значение
            *
            * @example identity(5) => 5
            * @category Работа с объектами | 1
            */`,
      en: `/**
            * Returns the passed argument
            *
            * @usage identity(value)
            * @param value [any] Value
            *
            * @example identity(5) => 5
            * @category Working with Objects | 1
            */`,
      hash: 2047586402,
    },
//#endregion identity



//#region split
    "split": {
      ru: `/**
            * Разбивает строку по разделителю
            *
            * @usage split(str, separator)
            * @param str [string] Строка
            * @param separator [string] Разделитель
            *
            * @example split("a,b,c", ",") => ["a", "b", "c"]
            * @category Работа с объектами | 10
            */`,
      en: `/**
            * Splits a string by separator
            *
            * @usage split(str, separator)
            * @param str [string] String
            * @param separator [string] Separator
            *
            * @example split("a,b,c", ",") => ["a", "b", "c"]
            * @category Working with Objects | 10
            */`,
      hash: 586964082,
    },
//#endregion split



//#region join
    "join": {
      ru: `/**
            * Объединяет элементы массива в строку через разделитель
            *
            * @usage join(array, separator)
            * @param array [array] Массив
            * @param separator [string] Разделитель
            *
            * @example join({1, 2, 3}, "-") => "1-2-3"
            * @category Работа с объектами | 11
            */`,
      en: `/**
            * Joins array elements into a string with separator
            *
            * @usage join(array, separator)
            * @param array [array] Array
            * @param separator [string] Separator
            *
            * @example join({1, 2, 3}, "-") => "1-2-3"
            * @category Working with Objects | 11
            */`,
      hash: 156121924,
    },
//#endregion join



//#region map
    "map": {
      ru: `/**
            * Применяет функцию к каждому элементу массива
            *
            * В качестве функции можно использовать имя LPE функции
            * @usage map(arr, fn)
            * @param arr [array] Массив
            * @param fn [function] Функция для применения
            *
            * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
            *          map({1, 2, 3}, minus) => [-1, -2, -3]
            * @category Работа с объектами | 20
            */`,
      en: `/**
            * Applies a function to each element of an array
            *
            * You can use LPE function name as the function argument
            * @usage map(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function to apply
            *
            * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
            *          map({1, 2, 3}, minus) => [-1, -2, -3]
            * @category Working with Objects | 20
            */`,
      hash: 844956379,
    },
//#endregion map



//#region filter
    "filter": {
      ru: `/**
            * Фильтрует массив по предикату
            *
            * @usage filter(arr, predicate)
            * @param arr [array] Массив
            * @param predicate [function] Функция-предикат
            *
            * @example filter([1, 2, 3, 4], fn({a}, a > 2)) => [3, 4]
            * @category Работа с объектами | 21
            */`,
      en: `/**
            * Filters an array by predicate
            *
            * @usage filter(arr, predicate)
            * @param arr [array] Array
            * @param predicate [function] Predicate function
            *
            * @example filter([1, 2, 3, 4], fn({a}, a > 2)) => [3, 4]
            * @category Working with Objects | 21
            */`,
      hash: 1629772173,
    },
//#endregion filter



//#region mapit
    "mapit": {
      ru: `/**
            * Преобразует массив с использованием переменных it и idx
            *
            * it - Текущий элемент массива
            * idx - Индекс текущего элемента
            * @usage mapit(array, transformation)
            * @param array [array] Исходный массив
            * @param transformation [any] Выражение для получения преобразованного значения
            *
            * @example mapit({1, 2, 3}, it * 2) => [2, 4, 6]
            * @example mapit({"a", "b", "c"}, it + idx) => ["a0", "b1", "c2"]
            * @category Работа с объектами | 23
            */`,
      en: `/**
            * Transforms an array using it and idx variables
            *
            * it - Current array element
            * idx - Current element index
            * @usage mapit(array, transformation)
            * @param array [array] Source array
            * @param transformation [any] Expression to get transformed value
            *
            * @example mapit({1, 2, 3}, it * 2) => [2, 4, 6]
            * @example mapit({"a", "b", "c"}, it + idx) => ["a0", "b1", "c2"]
            * @category Working with Objects | 23
            */`,
      hash: 1300429776,
    },
//#endregion mapit



//#region filterit
    "filterit": {
      ru: `/**
            * Фильтрует массив с использованием переменных it и idx
            *
            * it - Текущий элемент массива
            * idx - Индекс текущего элемента
            * @usage filterit(array, condition)
            * @param array [array] Исходный массив
            * @param condition [boolean] Условие
            *
            * @example filterit({1, 2, 3, 4}, it > 2 || idx = 0) => [1, 3, 4]
            * @category Работа с объектами | 24
            */`,
      en: `/**
            * Filters an array using it and idx variables
            *
            * it - Current array element
            * idx - Current element index
            * @usage filterit(array, condition)
            * @param array [array] Source array
            * @param condition [boolean] Condition
            *
            * @example filterit({1, 2, 3, 4}, it > 2 || idx = 0) => [1, 3, 4]
            * @category Working with Objects | 24
            */`,
      hash: 1120400627,
    },
//#endregion filterit



//#region sort
    "sort": {
      ru: `/**
            * Сортирует массив
            *
            * Поддерживает два варианта вызова:
            * 1. Без функции сравнения (стандартная сортировка)
            * 2. С функцией сравнения для пользовательского порядка
            *
            * Функция изменяет исходный массив (сортирует на месте)
            *
            * Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!)
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
            * @category Работа с объектами | 25
            */`,
      en: `/**
            * Sorts an array
            *
            * Supports two call variants:
            * 1. Without comparison function (standard sorting)
            * 2. With comparison function for custom ordering
            *
            * The function modifies the original array (sorts in place)
            *
            * For strings, standard sorting is based on Unicode codes (not lexicographic!)
            * @usage sort(array)
            * @param array [array] Array to sort
            *
            * @usage sort(array, compareFn)
            * @param array [array] Array to sort
            * @param compareFn [function] Comparison function of format (a, b) => number
            *                             If function returns:
            *                             - negative: a comes before b
            *                             - positive: b comes before a
            *                             - 0: order unchanged
            *
            * @example sort({3, 1, 2}) => [1, 2, 3]
            *          sort({5, 2, 8, 1}) => [1, 2, 5, 8]
            *          sort({"banana", "apple", "cherry"}) => ["apple", "banana", "cherry"]
            *
            * @example sort({5, 2, 8, 1}, (a, b) => a - b) => [1, 2, 5, 8]  (ascending)
            *          sort({5, 2, 8, 1}, (a, b) => b - a) => [8, 5, 2, 1]  (descending)
            *
            *          sort(\
            *          |  { {1, 2}, {3, 1}, {2, 3} },\
            *          |  (a, b) => first(a) - first(b)\
            *          |) => [[1, 2], [2, 3], [3, 1]] (by first element)
            *
            *          sort(\
            *          |  { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },\
            *          |  (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)\
            *          |) => [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
            * @category Working with Objects | 25
            */`,
      hash: 93439855,
    },
//#endregion sort



//#region pluck
    "pluck": {
      ru: `/**
            * Извлекает значение свойства из каждого элемента массива
            *
            * @usage pluck(array, key)
            * @param array [array] Массив объектов
            * @param key [string] Ключ свойства
            *
            * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
            * @category Работа с объектами | 26
            */`,
      en: `/**
            * Extracts property value from each array element
            *
            * @usage pluck(array, key)
            * @param array [array] Array of objects
            * @param key [string] Property key
            *
            * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
            * @category Working with Objects | 26
            */`,
      hash: 321033324,
    },
//#endregion pluck



//#region keys
    "keys": {
      ru: `/**
            * Возвращает массив ключей объекта
            *
            * @usage keys(obj)
            * @param obj [object] Объект
            *
            * @example keys({a = 1, b = 2}) => ["a", "b"]
            *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
            * @category Работа с объектами | 27
            */`,
      en: `/**
            * Returns an array of object keys
            *
            * @usage keys(obj)
            * @param obj [object] Object
            *
            * @example keys({a = 1, b = 2}) => ["a", "b"]
            *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
            * @category Working with Objects | 27
            */`,
      hash: 795609131,
    },
//#endregion keys



//#region vals
    "vals": {
      ru: `/**
            * Возвращает массив значений объекта
            *
            * @usage vals(obj)
            * @param obj [object] Объект
            *
            * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
            * @category Работа с объектами | 28
            */`,
      en: `/**
            * Returns an array of object values
            *
            * @usage vals(obj)
            * @param obj [object] Object
            *
            * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
            * @category Working with Objects | 28
            */`,
      hash: 525014368,
    },
//#endregion vals



//#region count
    "count": {
      ru: `/**
            * Возвращает длину массива или строки
            *
            * @usage count(obj)
            * @param obj [array|string] Объект для подсчёта длины
            *
            * @example count([1, 2, 3]) => 3
            *          count("hello") => 5
            * @category Работа с объектами | 30
            */`,
      en: `/**
            * Returns the length of an array or string
            *
            * @usage count(obj)
            * @param obj [array|string] Object to get length of
            *
            * @example count([1, 2, 3]) => 3
            *          count("hello") => 5
            * @category Working with Objects | 30
            */`,
      hash: 1046237556,
    },
//#endregion count



//#region empty
    "empty": {
      ru: `/**
            * Проверяет, является ли массив пустым
            *
            * @usage empty(array)
            * @param array [array] Массив
            *
            * @example empty([]) => true
            *          empty([1, 2]) => false
            * @category Работа с объектами | 31
            */`,
      en: `/**
            * Checks if an array is empty
            *
            * @usage empty(array)
            * @param array [array] Array
            *
            * @example empty([]) => true
            *          empty([1, 2]) => false
            * @category Working with Objects | 31
            */`,
      hash: 439280572,
    },
//#endregion empty



//#region rest
    "rest": {
      ru: `/**
            * Возвращает все элементы массива кроме первого
            *
            * @usage rest(array)
            * @param array [array] Массив
            *
            * @example rest({1, 2, 3}) => [2, 3]
            *          rest({1, 2, 3, a = 1}) => [2, 3] ## Исключает именованые аргументы
            * @category Работа с объектами | 32
            */`,
      en: `/**
            * Returns all array elements except the first
            *
            * @usage rest(array)
            * @param array [array] Array
            *
            * @example rest({1, 2, 3}) => [2, 3]
            *          rest({1, 2, 3, a = 1}) => [2, 3] ## Excludes named arguments
            * @category Working with Objects | 32
            */`,
      hash: 1855391631,
    },
//#endregion rest



//#region cons
    "cons": {
      ru: `/**
            * Добавляет элемент в начало массива
            *
            * @usage cons(element, array)
            * @param element [any] Элемент
            * @param array [array] Массив
            *
            * @example cons(1, {2, 3}) => [1, 2, 3]
            * @category Работа с объектами | 33
            */`,
      en: `/**
            * Adds an element to the beginning of an array
            *
            * @usage cons(element, array)
            * @param element [any] Element
            * @param array [array] Array
            *
            * @example cons(1, {2, 3}) => [1, 2, 3]
            * @category Working with Objects | 33
            */`,
      hash: 1886208712,
    },
//#endregion cons



//#region slice
    "slice": {
      ru: `/**
            * Возвращает срез массива или подстроку
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
            * @category Работа с объектами | 34
            */`,
      en: `/**
            * Returns a slice of an array or a substring
            *
            * @usage slice(arrayOrString, start)
            * @param arrayOrString [array | string] Array or string
            * @param start [number] Start index
            *
            * @usage slice(arrayOrString, start, end)
            * @param arrayOrString [array | string] Array or string
            * @param start [number] Start index
            * @param end [number] End index
            *
            * @example slice({1, 2, 3, 4}, 1, 3) => [2, 3]
            *          slice({1, 2, 3, 4}, 1) => [2, 3, 4]
            *          slice("hello world", 0, 5) => "hello"
            *          slice("hello", 1) => "ello"
            * @category Working with Objects | 34
            */`,
      hash: 197658129,
    },
//#endregion slice



//#region concat
    "concat": {
      ru: `/**
            * Конкатинирует массивы
            *
            * @usage concat(...arrays)
            * @param arrays [array] Массивы для объединения
            *
            * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
            *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
            *          ## Исключает именованные элементы
            * @category Работа с объектами | 35
            */`,
      en: `/**
            * Concatenates arrays
            *
            * @usage concat(...arrays)
            * @param arrays [array] Arrays to concatenate
            *
            * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
            *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
            *          ## Excludes named elements
            * @category Working with Objects | 35
            */`,
      hash: 361561247,
    },
//#endregion concat



//#region first
    "first": {
      ru: `/**
            * Возвращает первый элемент массива
            *
            * @usage first(array)
            * @param array [array] Массив
            *
            * @example first({1, 2, 3}) => 1
            *          first({}) => null
            * @category Работа с объектами | 37
            */`,
      en: `/**
            * Returns the first element of an array
            *
            * @usage first(array)
            * @param array [array] Array
            *
            * @example first({1, 2, 3}) => 1
            *          first({}) => null
            * @category Working with Objects | 37
            */`,
      hash: 280015904,
    },
//#endregion first



//#region last
    "last": {
      ru: `/**
            * Возвращает последний элемент массива
            *
            * @usage last(array)
            * @param array [array] Массив
            *
            * @example last({1, 2, 3}) => 3
            *          last({}) => undefined
            * @category Работа с объектами | 38
            */`,
      en: `/**
            * Returns the last element of an array
            *
            * @usage last(array)
            * @param array [array] Array
            *
            * @example last({1, 2, 3}) => 3
            *          last({}) => undefined
            * @category Working with Objects | 38
            */`,
      hash: 1041564930,
    },
//#endregion last



//#endregion Работа с объектами
////////////////////////////////
////////////////////////////////
//#region Работа с переменными
////////////////////////////////
////////////////////////////////


//#region let
    "let": {
      ru: `/**
            * Создаёт локальные привязки переменных и выполняет выражения в их контексте
            *
            * @usage let(bindings, ...exprs)
            * @param bindings [array] Список привязок
            * @param exprs [any] Выражения для выполнения в контексте привязок
            *
            * @example let({{"x", 10}, {"y", 20}}, x + y) => 30
            *          let({{"name", "Alice"}}, println("Hello,", name), name) => Alice
            *          ## Вывод в консоль: "Hello, Alice"
            * @category Работа с переменными | 1
            */`,
      en: `/**
            * Creates local variable bindings and executes expressions in their context
            *
            * @usage let(bindings, ...exprs)
            * @param bindings [array] List of bindings
            * @param exprs [any] Expressions to execute in the binding context
            *
            * @example let({{"x", 10}, {"y", 20}}, x + y) => 30
            *          let({{"name", "Alice"}}, println("Hello,", name), name) => Alice
            *          ## Console output: "Hello, Alice"
            * @category Working with Variables | 1
            */`,
      hash: 1308939040,
    },
//#endregion let


//#region let*
    "let*": {
      ru: `/**
            * Создаёт локальные привязки переменных последовательно: каждая следующая привязка
            * видит предыдущие (в отличие от let, где привязки независимы).
            * Это форма, в которую компилируется VAR ... RETURN.
            *
            * @usage let*(bindings, ...exprs)
            * @param bindings [array] Список привязок [[имя, значение], ...]
            * @param exprs [any] Выражения для выполнения в контексте привязок
            *
            * @example let*({{"x", 10}, {"y", x * 2}}, y) => 20
            * @category Работа с переменными | 1
            */`,
      en: `/**
            * Creates local variable bindings sequentially: each subsequent binding
            * sees the previous ones (unlike let, where bindings are independent).
            * This is the form that VAR ... RETURN compiles to.
            *
            * @usage let*(bindings, ...exprs)
            * @param bindings [array] List of bindings [[name, value], ...]
            * @param exprs [any] Expressions to execute in the binding context
            *
            * @example let*({{"x", 10}, {"y", x * 2}}, y) => 20
            * @category Working with Variables | 1
            */`,
      hash: 211280403,
    },
//#endregion let*



//#region def
    "def": {
      ru: `/**
            * Определяет переменную в текущем контексте
            *
            * @usage def(name, value)
            * @param name [string] Имя переменной
            * @param value [any] Значение
            *
            * @example def(x, 42) => 42
            * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
            * @category Работа с переменными | 2
            */`,
      en: `/**
            * Defines a variable in the current context
            *
            * @usage def(name, value)
            * @param name [string] Variable name
            * @param value [any] Value
            *
            * @example def(x, 42) => 42
            * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
            * @category Working with Variables | 2
            */`,
      hash: 195032475,
    },
//#endregion def



//#region define
    "define": {
      ru: `/**
            * Определение функций с поддержкой статических переменных
            * и выполнение последующих аргументов с этими функциями в контексте
            *
            * Описание аргументов функции:
            * - Для указания позиционного аргумента используется имя аргумента: \`n\`;
            * - Для указания позиционного аргумента с умалчиваемым значением: \`n = 10\`;
            * - Для указания статической переменной, общей для всех вызовов этой функции: \`$n = 10\`
            *
            * Статические переменные будут храниться в переменной \`this\`
            * @usage define(...{name, ...args, funcBody}, ...expr)
            * @param name [string] Имя функции
            * @param args [array | string] Описание аргументов функции
            * @param funcBody [string] Тело функции
            * @param expr [any] Выражения выполняемые
            *
            * @example define(\
            *          |  { factorial, n,\
            *          |    "if(n < 2, 1, n * factorial(n - 1))"\
            *          |  },\
            *          |  factorial(4)\
            *          |) => 24
            * @example define(\
            *          |  { incr, $inc = 0,\
            *          |    "this.inc := this.inc + 1"\
            *          |  },\
            *          |  incr(), incr(), incr()\
            *          |) => 3
            *          ## Считает количество вызовов этой функции используя статическую переменную
            * @example define(\
            *          |  { func, a, b = 5 * 2,\
            *          |    "a + b"\
            *          |  },\
            *          |  func(1, 2) + func(3)\
            *          |) => 16
            * @category Работа с переменными | 3
            */`,
      en: `/**
            * Defines functions with support for static variables
            * and executes subsequent arguments with these functions in context
            *
            * Function argument description:
            * - To specify a positional argument, use argument name: \`n\`;
            * - To specify a positional argument with default value: \`n = 10\`;
            * - To specify a static variable shared across all calls of this function: \`$n = 10\`
            *
            * Static variables will be stored in the \`this\` variable
            * @usage define(...{name, ...args, funcBody}, ...expr)
            * @param name [string] Function name
            * @param args [array | string] Function argument description
            * @param funcBody [string] Function body
            * @param expr [any] Expressions to execute
            *
            * @example define(\
            *          |  { factorial, n,\
            *          |    "if(n < 2, 1, n * factorial(n - 1))"\
            *          |  },\
            *          |  factorial(4)\
            *          |) => 24
            * @example define(\
            *          |  { incr, $inc = 0,\
            *          |    "this.inc := this.inc + 1"\
            *          |  },\
            *          |  incr(), incr(), incr()\
            *          |) => 3
            *          ## Counts the number of calls to this function using a static variable
            * @example define(\
            *          |  { func, a, b = 5 * 2,\
            *          |    "a + b"\
            *          |  },\
            *          |  func(1, 2) + func(3)\
            *          |) => 16
            * @category Working with Variables | 3
            */`,
      hash: 1772689145,
    },
//#endregion define



//#region ctx
    "ctx": {
      ru: `/**
            * Получить объект с переменными
            *
            * @usage ctx(...key)
            * @param key [string] Имя переменной
            *
            * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
            *          ctx("x") ## Ошибка: в функции ctx нельзя использовать выражения
            * @category Работа с переменными | 5
            */`,
      en: `/**
            * Get an object with variables
            *
            * @usage ctx(...key)
            * @param key [string] Variable name
            *
            * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
            *          ctx("x") ## Error: expressions cannot be used in ctx function
            * @category Working with Variables | 5
            */`,
      hash: 1586964360,
    },
//#endregion ctx



//#region resolve
    "resolve": {
      ru: `/**
            * Получить значение переменной
            *
            * @usage resolve(name)
            * @param name [string] Имя переменной
            *
            * @example resolve(x) => значение переменной x
            * @category Работа с переменными | 10
            */`,
      en: `/**
            * Get variable value
            *
            * @usage resolve(name)
            * @param name [string] Variable name
            *
            * @example resolve(x) => value of variable x
            * @category Working with Variables | 10
            */`,
      hash: 509690486,
    },
//#endregion resolve



//#region containsKey
    "containsKey": {
      ru: `/**
            * Проверяет, содержит ли объект указанное свойство
            *
            * @usage contains(obj, key)
            * @param obj [object] Объект
            * @param key [string] Ключ
            *
            * @example contains({a = 1}, "a") => true
            * @category Работа с переменными | 11
            */`,
      en: `/**
            * Checks if an object contains the specified property
            *
            * @usage contains(obj, key)
            * @param obj [object] Object
            * @param key [string] Key
            *
            * @example contains({a = 1}, "a") => true
            * @category Working with Variables | 11
            */`,
      hash: 1681880296,
    },
//#endregion containsKey



//#region property
    "property": {
      ru: `/**
            * Получает или устанавливает свойство объекта
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
            * @category Работа с переменными | 12
            */`,
      en: `/**
            * Gets or sets an object property
            *
            * @usage property(obj, propName)
            * @param obj [object | array] Object
            * @param propName [string] Property name
            *
            * @usage property(obj, propName, value)
            * @param obj [object | array] Object
            * @param propName [string] Property name
            * @param value [any] Value to set
            *
            * @example property({a = 1}, "a") => 1
            *          property({a = 1}, "b", 2) => 2 ## Object value: { a:1, b:2 }
            * @category Working with Variables | 12
            */`,
      hash: 1478971176,
    },
//#endregion property



//#region del
    "del": {
      ru: `/**
            * Удаляет свойство из объекта
            *
            * @usage del(obj, key)
            * @param obj [hashmap] Объект
            * @param key [string] Ключ для удаления
            *
            * @example del({"a"=1, "b"=2}, "a") => true
            * @category Работа с переменными | 13
            */`,
      en: `/**
            * Deletes a property from an object
            *
            * @usage del(obj, key)
            * @param obj [hashmap] Object
            * @param key [string] Key to delete
            *
            * @example del({"a"=1, "b"=2}, "a") => true
            * @category Working with Variables | 13
            */`,
      hash: 1284605818,
    },
//#endregion del



//#region get
    "get": {
      ru: `/**
            * Получает значение свойства объекта
            *
            * @usage get(obj, key)
            * @param obj [object] Объект
            * @param key [string | number] Ключ
            *
            * @example get({a: 1}, "a") => 1
            * @category Работа с переменными | 20
            */`,
      en: `/**
            * Gets an object property value
            *
            * @usage get(obj, key)
            * @param obj [object] Object
            * @param key [string | number] Key
            *
            * @example get({a: 1}, "a") => 1
            * @category Working with Variables | 20
            */`,
      hash: 247342074,
    },
//#endregion get



//#region set
    "set": {
      ru: `/**
            * Устанавливает значение свойства объекта и возвращает объект
            *
            * @usage set(obj, key, value)
            * @param obj [object] Объект
            * @param key [string] Ключ
            * @param value [any] Значение
            *
            * @example set(Hashmap, "a", 1) => {a: 1}
            *          set({}, 0, 1) => [1]
            * @category Работа с переменными | 21
            */`,
      en: `/**
            * Sets an object property value and returns the object
            *
            * @usage set(obj, key, value)
            * @param obj [object] Object
            * @param key [string] Key
            * @param value [any] Value
            *
            * @example set(Hashmap, "a", 1) => {a: 1}
            *          set({}, 0, 1) => [1]
            * @category Working with Variables | 21
            */`,
      hash: 865954788,
    },
//#endregion set



//#region get_in
    "get_in": {
      ru: `/**
            * Получает значение из вложенной структуры по пути ключей
            *
            * При отсутствии значения по ключу возвращает undefined
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
            * @category Работа с переменными | 22
            */`,
      en: `/**
            * Gets a value from a nested structure by key path
            *
            * Returns undefined if key is missing
            * @usage get_in(obj, keys)
            * @param obj [object|array] Source structure
            * @param keys [array] Array of keys
            *
            * @usage get_in(obj, ...key)
            * @param obj [object|array] Source structure
            * @param key [string] Key
            *
            * @example get_in({a = {b = {c = 42}}}, {"a", "b"}) => { c: 42 }
            * @example get_in({a = {b = {10, 11, 12}}}, a, b, 2) => 12
            * @category Working with Variables | 22
            */`,
      hash: 1384009166,
    },
//#endregion get_in



//#region assoc_in
    "assoc_in": {
      ru: `/**
            * Устанавливает значение во вложенной структуре по пути ключей
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
            * @category Работа с переменными | 23
            */`,
      en: `/**
            * Sets a value in a nested structure by key path
            *
            * @usage assoc_in(obj, keys, value)
            * @param obj [object|array] Target structure
            * @param keys [array] Key path
            * @param value [any] Value to set
            *
            * @example begin(\
            *          |  x := Hashmap,\
            *          |  assoc_in(x, {"a", "b", "c"}, 42),\
            *          |) => {c: 42}
            *          ## x == {a: {b: {c: 42}}}
            * @category Working with Variables | 23
            */`,
      hash: 1138430016,
    },
//#endregion assoc_in



//#region cp
    "cp": {
      ru: `/**
            * Копирует значение из одной вложенной структуры в другую
            *
            * Работает как \`assoc_in(to, get_in(from))\`
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
            * @category Работа с переменными | 24
            */`,
      en: `/**
            * Copies a value from one nested structure to another
            *
            * Works like \`assoc_in(to, get_in(from))\`
            * @usage cp(from, to)
            * @param from [array] Source path [source, key1, key2, ...]
            * @param to [array] Destination path [target, key1, key2, ...]
            *
            * @example begin(\
            *          |  x := { a = {b = 10} },\
            *          |  y := { c = {d = 12} },\
            *          |  cp({ x, "a", "b" }, { y, "c", "f"})\
            *          |) => { d: 12, f: 10 }
            *          ## y = { c: { d: 12, f: 10 } }
            * @category Working with Variables | 24
            */`,
      hash: 492324068,
    },
//#endregion cp



//#endregion Работа с переменными
////////////////////////////////
////////////////////////////////
//#region Работа со строками
////////////////////////////////
////////////////////////////////


//#region re_match
    "re_match": {
      ru: `/**
            * Проверяет соответствие строки регулярному выражению. Возвращает попадания.
            *
            * @usage re_match(text, regexp)
            * @param text [string] Текст
            * @param regexp [string] Регулярное выражение
            *
            * @usage re_match(text, regexp, flags)
            * @param text [string] Текст
            * @param regexp [string] Регулярное выражение
            * @param flags [string] Флаги
            *
            * @example re_match("hello123", "[a-z]+", "g") => ["hello"]
            *          re_match("hello123", "[!]+", "g") => null
            *          re_match("hello123", "[a-z]+") => ReMath object
            *          re_match("test(aaa)", "\\((.*)\\)").0 => '(aaa)'
            *          re_match("test(aaa)", "\\((.*)\\)").1 => 'aaa'
            *          re_match("hello123", "[!]+") => null
            * @category Работа со строками | 3
            */`,
      en: `/**
            * Checks string against regular expression. Returns matches.
            *
            * @usage re_match(text, regexp)
            * @param text [string] Text
            * @param regexp [string] Regular expression
            *
            * @usage re_match(text, regexp, flags)
            * @param text [string] Text
            * @param regexp [string] Regular expression
            * @param flags [string] Flags
            *
            * @example re_match("hello123", "[a-z]+", "g") => ["hello"]
            *          re_match("hello123", "[!]+", "g") => null
            *          re_match("hello123", "[a-z]+") => ReMath object
            *          re_match("test(aaa)", "\\((.*)\\)").0 => '(aaa)'
            *          re_match("test(aaa)", "\\((.*)\\)").1 => 'aaa'
            *          re_match("hello123", "[!]+") => null
            * @category Working with strings | 3
            */`,
      hash: 1312072238,
    },
//#endregion re_match



//#endregion Работа со строками
////////////////////////////////
////////////////////////////////
//#region Создание объектов
////////////////////////////////
////////////////////////////////


//#region list
    "list": {
      ru: `/**
            * Создаёт список (массив) из аргументов
            *
            * @usage list(...args)
            * @param args [any] Элементы списка
            *
            * @example list(1, 2, 3) => [1, 2, 3]
            *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
            * @category Создание объектов | 1
            */`,
      en: `/**
            * Creates a list (array) from arguments
            *
            * @usage list(...args)
            * @param args [any] List elements
            *
            * @example list(1, 2, 3) => [1, 2, 3]
            *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
            * @category Creating Objects | 1
            */`,
      hash: 1078272595,
    },
//#endregion list



//#region tuple
    "tuple": {
      ru: `/**
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
            *          (1, 2, 3) => [1, 2, 3] ## Перечисление в скобказ является вызовом функции tuple
            * @category Создание объектов | 2
            */`,
      en: `/**
            * Creates a hybrid array (kwargs array) from arguments
            *
            * When named arguments are passed, adds them as named properties
            * @usage tuple(...args, ...kwargs)
            * @param args [any] Positional array elements
            * @param kwargs [any] Named object elements
            *
            * @example tuple(1, 2, 3, a=1, b=2) => [1, 2, 3, a: 1, b: 2]
            *          tuple(1, 2, 3) => [1, 2, 3]
            *          tuple(a=1, b=2) => [a: 1, b: 2] ## Is an array
            *          (1, 2, 3) => [1, 2, 3] ## Parenthesized list is a call to tuple function
            * @category Creating Objects | 2
            */`,
      hash: 1997530006,
    },
//#endregion tuple



//#region vector
    "vector": {
      ru: `/**
            * Создаёт гибридный массив (kwargs array) из аргументов.
            *
            * При передаче именнованных аргументов добавляет их как именованные свойства.
            *
            * При отсутствии kwargs создаёт обычный массив.
            * При отсутствии args создаёт Hashmap.
            * @usage vector(...args, ...kwargs)
            * @param args [any] Элементы позиционного массива
            * @param kwargs [any] Именованные элементы объекта
            *
            * @example vector(1, 2, 3) => [1, 2, 3]
            *          vector(1, 2, a = 3, b = 4) => [1, 2, a: 3, b: 4]
            *          vector(a = 3, b = 4) => {a: 3, b: 4}
            * @category Создание объектов | 3
            */`,
      en: `/**
            * Creates a hybrid array (kwargs array) from arguments.
            *
            * When named arguments are passed, adds them as named properties.
            *
            * When no kwargs, creates a regular array.
            * When no args, creates a Hashmap.
            * @usage vector(...args, ...kwargs)
            * @param args [any] Positional array elements
            * @param kwargs [any] Named object elements
            *
            * @example vector(1, 2, 3) => [1, 2, 3]
            *          vector(1, 2, a = 3, b = 4) => [1, 2, a: 3, b: 4]
            *          vector(a = 3, b = 4) => {a: 3, b: 4}
            * @category Creating Objects | 3
            */`,
      hash: 1313761137,
    },
//#endregion vector


//#region hash
    "hash": {
      ru: `/**
            * Создаёт хэш-таблицу из именованных аргументов.
            *
            * Без аргументов возвращает пустой хэш {}.
            * Позиционные аргументы игнорируются — для смешанных структур используйте vector.
            *
            * Литерал \`{=}\` в исходнике компилируется в вызов hash() и тоже даёт пустой хэш —
            * это удобно, потому что \`{}\` означает пустой массив.
            *
            * @usage hash(...kwargs)
            * @param kwargs [any] Именованные элементы
            *
            * @example hash() => {}
            *          hash(a = 1, b = 2) => {a: 1, b: 2}
            *          {=} => {} ## то же, что hash()
            * @category Создание объектов | 4
            */`,
      en: `/**
            * Creates a hashmap from named arguments.
            *
            * With no arguments, returns an empty hash {}.
            * Positional arguments are ignored — for mixed structures use vector.
            *
            * The literal \`{=}\` in source compiles to a call of hash() and also gives an
            * empty hash — useful, because \`{}\` means an empty array.
            *
            * @usage hash(...kwargs)
            * @param kwargs [any] Named elements
            *
            * @example hash() => {}
            *          hash(a = 1, b = 2) => {a: 1, b: 2}
            *          {=} => {} ## same as hash()
            * @category Creating Objects | 4
            */`,
      hash: 1444867549,
    },
//#endregion hash



//#region reshape
    "reshape": {
      ru: `/**
            * Создаёт массив заданной длины, заполняя его значениями по циклу
            *
            * @usage reshape(len, ...values)
            * @param len [number] Длина массива
            * @param values [any] Значения для заполнения
            *
            * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
            * @category Создание объектов | 4
            */`,
      en: `/**
            * Creates an array of specified length, filling it with values cyclically
            *
            * @usage reshape(len, ...values)
            * @param len [number] Array length
            * @param values [any] Values to fill with
            *
            * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
            * @category Creating Objects | 4
            */`,
      hash: 11664818,
    },
//#endregion reshape



//#region fn
    "fn": {
      ru: `/**
            * Создаёт анонимную функцию
            *
            * @usage fn(args, body)
            * @param args [array] Список аргументов
            * @param body [any] Тело функции
            *
            * @example fn({x}, x * x) => функция возведения в квадрат
            *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
            * @category Создание объектов | 10
            */`,
      en: `/**
            * Creates an anonymous function
            *
            * @usage fn(args, body)
            * @param args [array] List of arguments
            * @param body [any] Function body
            *
            * @example fn({x}, x * x) => square function
            *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
            * @category Creating Objects | 10
            */`,
      hash: 815486661,
    },
//#endregion fn



//#region toFn
    "toFn": {
      ru: `/**
            * Преобразует выражение в JavaScript функцию
            *
            * @usage toFn(body, ...argNames)
            * @param body [any] Тело функции
            * @param argNames [string] Имена аргументов функции
            *
            * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
            * @category Создание объектов | 11
            */`,
      en: `/**
            * Converts an expression to a JavaScript function
            *
            * @usage toFn(body, ...argNames)
            * @param body [any] Function body
            * @param argNames [string] Function argument names
            *
            * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
            * @category Creating Objects | 11
            */`,
      hash: 1080737901,
    },
//#endregion toFn



//#region new
    "new": {
      ru: `/**
            * Создаёт новый экземпляр класса
            *
            * @usage new(class, ...args)
            * @param class [function] Класс
            * @param args [any] Аргументы конструктора
            *
            * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
            * @category Создание объектов | 20
            */`,
      en: `/**
            * Creates a new instance of a class
            *
            * @usage new(class, ...args)
            * @param class [function] Class
            * @param args [any] Constructor arguments
            *
            * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
            * @category Creating Objects | 20
            */`,
      hash: 1011092337,
    },
//#endregion new



//#region RegExp
    "RegExp": {
      ru: `/**
            * Создаёт регулярное выражение
            *
            * @usage regexp(pattern, flags)
            * @param pattern [string] Шаблон регулярного выражения
            * @param flags [string] Флаги регулярного выражения
            *
            * @example regexp("[0-9]+", "g") => /[0-9]+/g
            * @category Создание объектов | 30
            */`,
      en: `/**
            * Creates a regular expression
            *
            * @usage regexp(pattern, flags)
            * @param pattern [string] Regular expression pattern
            * @param flags [string] Regular expression flags
            *
            * @example regexp("[0-9]+", "g") => /[0-9]+/g
            * @category Creating Objects | 30
            */`,
      hash: 1109638226,
    },
//#endregion RegExp



//#endregion Создание объектов
////////////////////////////////
////////////////////////////////
//#region Управление выполнением
////////////////////////////////
////////////////////////////////


//#region begin
    "begin": {
      ru: `/**
            * Последовательно выполняет несколько выражений и возвращает результат последнего
            *
            * @usage begin(...exprs)
            * @param exprs [any] Выражения для выполнения
            *
            * @example begin(println("Hello"), println("World"), 1 + 2) => 3
            *          ## Выведет "Hello", "World" в консоль
            * @category Управление выполнением | 1
            */`,
      en: `/**
            * Sequentially executes multiple expressions and returns the result of the last one
            *
            * @usage begin(...exprs)
            * @param exprs [any] Expressions to execute
            *
            * @example begin(println("Hello"), println("World"), 1 + 2) => 3
            *          ## Prints "Hello", "World" to console
            * @category Execution Control | 1
            */`,
      hash: 1191938344,
    },
//#endregion begin



//#region if
    "if": {
      ru: `/**
            * Получение выражения по условию
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
            */`,
      en: `/**
            * Conditional expression
            *
            * @usage if(cond1, then1, cond2, then2, ..., else)
            * @param cond [boolean] Condition
            * @param then [any] Expression to execute if condition is true
            * @param else [any] Expression to execute if all conditions are false
            *
            * @usage if(cond1, then1, cond2, then2, ...)
            * @param cond [boolean] Condition
            * @param then [any] Expression to execute if condition is true
            *
            * @example if(5 > 3, "greater", 5 < 3, "less", "equal") => "greater"
            *          if(5 > 5, "greater", 5 < 5, "less", "equal") => "equal"
            *          if(5 > 5, "greater", 5 < 5, "less") => undefined
            * @category Execution Control | 5
            */`,
      hash: 265405151,
    },
//#endregion if



//#region do
    "do": {
      ru: `/**
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
            */`,
      en: `/**
            * Executes an expression in a loop while condition is true.
            *
            * If condition is omitted, executes once.
            *
            * Condition is evaluated after expression execution.
            * @usage do(condition, expr)
            * @param condition [boolean] Condition
            * @param expr [any] Expressions to execute
            *
            * @usage do(expr)
            * @param expr [any] Expressions to execute once
            *
            * @example begin(x := 0,\
            *         |      do(x < 10, x := x + 1)\
            *         |) => 10
            * @category Execution Control | 10
            */`,
      hash: 2103299426,
    },
//#endregion do



//#region set_options
    "set_options": {
      ru: `/**
            * Устанавливает опции выполнения для выражения
            *
            * @usage set_options(options, expr)
            * @param options [object|array] Опции (объект или массив пар ключ-значение)
            * @param expr [any] Выражение для выполнения с опциями
            *
            * @example set_options({wantCallable = true}, minus) => LPE функция "minus"
            *          set_options({{wantCallable, true}}, minus) => LPE функция "minus"
            * @category Управление выполнением | 15
            */`,
      en: `/**
            * Sets execution options for an expression
            *
            * @usage set_options(options, expr)
            * @param options [object|array] Options (object or array of key-value pairs)
            * @param expr [any] Expression to execute with options
            *
            * @example set_options({wantCallable = true}, minus) => LPE function "minus"
            *          set_options({{wantCallable, true}}, minus) => LPE function "minus"
            * @category Execution Control | 15
            */`,
      hash: 1002942511,
    },
//#endregion set_options



//#endregion Управление выполнением
  }
};