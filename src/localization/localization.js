
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

/** @type {Record<string, Record<string, Record<string, string | number>>>} */
export const LOCALE_DOC = {
//#region STDLIB
  "STDLIB": {
//#region add
    "add": {
      en: `/**
            * Adds arguments.
            * @usage add(...args)
            * @param args [any] Values to add
            * @example add(1, 2, 1) => 4
            *          add(1, '1', 1, 1) => '1111'
            *          1 + 3 => 4
            * @category Math Operators | 1
            */`,
      ru: `/**
            * Складывает аргументы.
            * @usage add(...agrs)
            * @param args [any] Значение для сложения
            * @example add(1, 2, 1) => 4
            *          add(1, '1', 1, 1) => '1111'
            *          1 + 3 => 4
            * @category Математические операторы | 1
            */`,
      hash: 1912975015,
    },
//#endregion add




//#region and
    "and": {
      en: `/**
            * Logical AND.
            *
            * Evaluates arguments sequentially, returning the first falsy value
            * or the last truthy value.
            *
            * Arguments after the first falsy value are not evaluated.
            * @usage and(...exprs)
            * @param exprs [boolean] Expressions
            *
            * @example and(5 > 3, 2 < 4) => true
            *          5 > 3 and 2 < 4 and 10 => 10
            * @category Logical Operators | 20
            */`,
      ru: `/**
            * Логическое И.
            *
            * Вычисляет аргументы последовательно, возвращая первое ложное значение
            * или последнее истинное.
            *
            * Аргументы после первого ложного значения не вычисляются.
            * @usage and(...exprs)
            * @param exprs [boolean] Выражения
            *
            * @example and(5 > 3, 2 < 4) => true
            *          5 > 3 and 2 < 4 and 10 => 10
            * @category Логические операторы | 20
            */`,
      hash: 2000346074,
    },
//#endregion and




//#region apply
    "apply": {
      en: `/**
            * Applies a function to a list of arguments.
            *
            * @usage apply(fn, ...args)
            * @param fn [function] Function
            * @param args [any] Function arguments
            *
            * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
            * @category 10
            */`,
      ru: `/**
            * Применяет функцию к списку аргументов.
            *
            * @usage apply(fn, ...args)
            * @param fn [function] Функция
            * @param args [any] Аргументы функции
            *
            * @example apply(fn({a,b,c}, a + b * c), 1, 2, 3) => 7
            * @category 10
            */`,
      hash: 2082370713,
    },
//#endregion apply




//#region assign
    "assign": {
      en: `/**
            * Assignment operator. Returns the variable value after assignment.
            *
            * Supports assignment to variables and object/array properties.
            *
            * @usage assign(lvalue, rvalue)
            * @param lvalue [any] Left part of assignment (variable or property path)
            * @param rvalue [any] Value to assign
            *
            * @example assign(x, 10) => 10
            *          assign(obj.key, 20) => 20  ## obj ==> { key: 20 }
            *          obj.a := (obj.b := 10) => 10  ## obj ==> { a: 10, b: 10 }
            * @category Working with Variables | 1
            */`,
      ru: `/**
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
            */`,
      hash: 989125159,
    },
//#endregion assign




//#region assoc_in
    "assoc_in": {
      en: `/**
            * Sets a value in a nested structure by key path.
            *
            * @usage assoc_in(obj, keys, value)
            * @param obj [object|array] Target structure
            * @param keys [array] Key path
            * @param value [any] Value to set
            *
            * @example begin(\\
            *          |  x := Hashmap,\\
            *          |  assoc_in(x, {"a", "b", "c"}, 42),\\
            *          |) => {c: 42}
            *          ## x == {a: {b: {c: 42}}}
            * @category Working with Hash Tables | 41
            */`,
      ru: `/**
            * Устанавливает значение во вложенной структуре по пути ключей.
            *
            * @usage assoc_in(obj, keys, value)
            * @param obj [object|array] Целевая структура
            * @param keys [array] Путь ключей
            * @param value [any] Устанавливаемое значение
            *
            * @example begin(\\
            *          |  x := Hashmap,\\
            *          |  assoc_in(x, {"a", "b", "c"}, 42),\\
            *          |) => {c: 42}
            *          ## x == {a: {b: {c: 42}}}
            * @category Работа с хэш-таблицами | 41
            */`,
      hash: 352402600,
    },
//#endregion assoc_in




//#region astToString
    "astToString": {
      en: `/**
            * Converts expression AST tree to string.
            *
            * @usage astToString(value)
            * @param value [any] Value
            *
            * @example astToString(123) => "123"
            *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
            * @category Type Conversion | 51
            */`,
      ru: `/**
            * Преобразовать в строку AST дерево выражения.
            *
            * @usage astToString(value)
            * @param value [any] Значение
            *
            * @example astToString(123) => "123"
            *          astToString({1,2,3,a=1,b=2}) => "vector,1,2,3,=,a,1,=,b,2"
            * @category Преобразование типов | 51
            */`,
      hash: 738591351,
    },
//#endregion astToString




//#region begin
    "begin": {
      en: `/**
            * Sequentially executes multiple expressions and returns the result of the last one.
            *
            * @usage begin(...exprs)
            * @param exprs [any] Expressions to execute
            *
            * @example begin(println("Hello"), println("World"), 1 + 2) => 3
            *          ## Prints "Hello", "World" to console
            * @category Execution Control | 1
            * @tags return-support
            */`,
      ru: `/**
            * Последовательно выполняет несколько выражений и возвращает результат последнего.
            *
            * @usage begin(...exprs)
            * @param exprs [any] Выражения для выполнения
            *
            * @example begin(println("Hello"), println("World"), 1 + 2) => 3
            *          ## Выведет "Hello", "World" в консоль
            * @category Управление выполнением | 1
            * @tags return-support
            */`,
      hash: 377995357,
    },
//#endregion begin




//#region bound
    "bound": {
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
      hash: 2134064053,
    },
//#endregion bound




//#region catchReturn
    "catchReturn": {
      en: `/**
            * It catches the call to the [return]($func-return) function and returns the result.
            *
            * @usage catchReturn(expr)
            * @param expr [any] An expression that uses the return function.
            *
            * @category Execution Control | 16
            * @tags hidden
            */`,
      ru: `/**
            * Отлавливает вызов функции [return]($func-return) и возвращает результат.
            *
            * @usage catchReturn(expr)
            * @param expr [any] Выражение, в котором используется функция return.
            *
            * @category Управление выполнением | 16
            * @tags hidden
            */`,
      hash: 191552476,
    },
//#endregion catchReturn




//#region classOf
    "classOf": {
      en: `/**
            * Returns the class name of an object.
            *
            * @usage classOf(obj)
            * @param obj [any] Object
            *
            * @example classOf({}) => "[object Array]"
            * @category Type Checks | 3
            */`,
      ru: `/**
            * Возвращает имя класса объекта.
            *
            * @usage classOf(obj)
            * @param obj [any] Объект
            *
            * @example classOf({}) => "[object Array]"
            * @category Проверки типов | 3
            */`,
      hash: 587201268,
    },
//#endregion classOf




//#region compact
    "compact": {
      en: `/**
            * Removes all \`null\` and \`undefined\` values from the object.
            *
            * @usage compact(obj)
            * @param obj [Array | Object] Object to remove values from.
            *
            * @usage compact(obj, depth)
            * @param obj [Array | Object] Object to remove values from.
            * @param depth [number] Depth of recursion (default is 1).
            *
            * @example compact({a = 1, b = null, c = undefined}) => {a: 1}
            *          compact({a = 1, b = {c = null}}, 2) => {a: 1, b: {}}
            *          compact({a = 1, b = {c = null}}, 1) => {a: 1, b: {с = null}}
            * @category Working with Hash Tables | 35
            */`,
      ru: `/**
            * Удаляет все \`null\` и \`undefined\` значения из объекта.
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
            */`,
      hash: 1856362487,
    },
//#endregion compact




//#region concat
    "concat": {
      en: `/**
            * Concatenates arrays.
            *
            * @usage concat(...arrays)
            * @param arrays [array] Arrays to concatenate
            *
            * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
            *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
            *          ## Excludes named elements
            * @category Working with Arrays | 15
            */`,
      ru: `/**
            * Конкатинирует массивы.
            *
            * @usage concat(...arrays)
            * @param arrays [array] Массивы для объединения
            *
            * @example concat({1, 2}, {3, 4}) => [1, 2, 3, 4]
            *          concat({1, b = 1}, {3, a = 3}) => [1, 3]
            *          ## Исключает именованные элементы
            * @category Работа с массивами | 15
            */`,
      hash: 479411915,
    },
//#endregion concat




//#region cons
    "cons": {
      en: `/**
            * Adds an element to the beginning of an array
            *
            * @usage cons(element, array)
            * @param element [any] Element
            * @param array [array] Array
            *
            * @example cons(1, {2, 3}) => [1, 2, 3]
            * @category Working with Objects | 23
            */`,
      ru: `/**
            * Добавляет элемент в начало массива
            *
            * @usage cons(element, array)
            * @param element [any] Элемент
            * @param array [array] Массив
            *
            * @example cons(1, {2, 3}) => [1, 2, 3]
            * @category Работа с массивами | 23
            */`,
      hash: 587683883,
    },
//#endregion cons




//#region containsKey
    "containsKey": {
      en: `/**
            * Checks if an object contains the specified property.
            *
            * @usage contains(obj, key)
            * @param obj [object] Object
            * @param key [string] Key
            *
            * @example contains({a = 1}, "a") => true
            * @category Working with Hash Tables | 1
            */`,
      ru: `/**
            * Проверяет, содержит ли объект указанное свойство.
            *
            * @usage contains(obj, key)
            * @param obj [object] Объект
            * @param key [string] Ключ
            *
            * @example contains({a = 1}, "a") => true
            * @category Работа с хэш-таблицами | 1
            */`,
      hash: 555730277,
    },
//#endregion containsKey




//#region count
    "count": {
      en: `/**
            * Returns the length of an array or string.
            *
            * @usage count(obj)
            * @param obj [array|string] Object to get length of
            *
            * @example count({1, 2, 3}) => 3
            *          count("hello") => 5
            * @category Working with Arrays | 1
            */`,
      ru: `/**
            * Возвращает длину массива или строки.
            *
            * @usage count(obj)
            * @param obj [array|string] Объект для подсчёта длины
            *
            * @example count({1, 2, 3}) => 3
            *          count("hello") => 5
            * @category Работа с массивами | 1
            */`,
      hash: 819122314,
    },
//#endregion count




//#region counter
    "counter": {
      en: `/**
            * Returns an object containing the frequencies of array elements.
            *
            * @usage frequencies(arr)
            * @param arr [array] Array
            *
            * @example frequencies({1, 1, 2, 2, 2, 3}) => {1: 2, 2: 3, 3: 1}
            *          "test words of the test".words().frequencies() => { "test: 2, words: 1, of: 1, the: 1 }
            * @category Working with Arrays | 70
            */`,
      ru: `/**
            * Возвращает объект, содержащий частоты элементов массива.
            *
            * @usage frequencies(arr)
            * @param arr [array] Массив
            *
            * @example frequencies({1, 1, 2, 2, 2, 3}) => {1: 2, 2: 3, 3: 1}
            *          "test words of the test".words().frequencies() => { "test: 2, words: 1, of: 1, the: 1 }
            * @category Работа с массивами | 70
            */`,
      hash: 752201368,
    },
//#endregion counter




//#region cp
    "cp": {
      en: `/**
            * Copies a value from one nested structure to another.
            *
            * Works like \`assoc_in(to, get_in(from))\`.
            * @usage cp(from, to)
            * @param from [array] Source path [source, key1, key2, ...]
            * @param to [array] Destination path [target, key1, key2, ...]
            *
            * @example begin(\\
            *          |  x := { a = {b = 10} },\\
            *          |  y := { c = {d = 12} },\\
            *          |  cp({ x, "a", "b" }, { y, "c", "f"})\\
            *          |) => { d: 12, f: 10 }
            *          ## y = { c: { d: 12, f: 10 } }
            * @category Working with Hash Tables | 45
            */`,
      ru: `/**
            * Копирует значение из одной вложенной структуры в другую.
            *
            * Работает как \`assoc_in(to, get_in(from))\`.
            * @usage cp(from, to)
            * @param from [array] Путь к источнику [source, key1, key2, ...]
            * @param to [array] Путь к назначению [target, key1, key2, ...]
            *
            * @example begin(\\
            *          |  x := { a = {b = 10} },\\
            *          |  y := { c = {d = 12} },\\
            *          |  cp({ x, "a", "b" }, { y, "c", "f"})\\
            *          |) => { d: 12, f: 10 }
            *          ## y = { c: { d: 12, f: 10 } }
            * @category Работа с хэш-таблицами | 45
            */`,
      hash: 667289349,
    },
//#endregion cp




//#region ctx
    "ctx": {
      en: `/**
            * Get an object with variables.
            *
            * @usage ctx(...key)
            * @param key [string] Variable name
            *
            * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
            *          ctx("x") ## Error: expressions cannot be used in ctx function
            * @category Working with Variables | 16
            */`,
      ru: `/**
            * Получить объект с переменными.
            *
            * @usage ctx(...key)
            * @param key [string] Имя переменной
            *
            * @example begin(x := 10,y := 4, ctx(x, y, z)) => { x: 10, y: 4, z: undefined }
            *          ctx("x") ## Ошибка: в функции ctx нельзя использовать выражения
            * @category Работа с переменными | 16
            */`,
      hash: 590996510,
    },
//#endregion ctx




//#region dateShift
    "dateShift": {
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
      hash: 1152712759,
    },
//#endregion dateShift




//#region def
    "def": {
      en: `/**
            * Defines a variable in the current context.
            *
            * @usage def(name, value)
            * @param name [string] Variable name
            * @param value [any] Value
            *
            * @example def(x, 42) => 42
            * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
            * @category Working with Variables | 10
            */`,
      ru: `/**
            * Определяет переменную в текущем контексте.
            *
            * @usage def(name, value)
            * @param name [string] Имя переменной
            * @param value [any] Значение
            *
            * @example def(x, 42) => 42
            * @example begin(def(pi, 3.14159), 2*pi) => 6.28318
            * @category Работа с переменными | 10
            */`,
      hash: 646380016,
    },
//#endregion def




//#region del
    "del": {
      en: `/**
            * Deletes a property from an object.
            *
            * @usage del(obj, key)
            * @param obj [hashmap] Object
            * @param key [string] Key to delete
            *
            * @example del({"a"=1, "b"=2}, "a") => true
            * @category Working with Hash Tables | 12
            */`,
      ru: `/**
            * Удаляет свойство из объекта.
            *
            * @usage del(obj, key)
            * @param obj [hashmap] Объект
            * @param key [string] Ключ для удаления
            *
            * @example del({"a"=1, "b"=2}, "a") => true
            * @category Работа с хэш-таблицами | 12
            */`,
      hash: 2147018763,
    },
//#endregion del




//#region difference
    "difference": {
      en: `/**
            * Returns the difference between arrays.
            * From the first array, all elements that are contained in other arrays are extracted.
            *
            * Repeating elements are left.
            *
            * @usage difference(arrays)
            * @param arrays [Array<Array>] Arrays to subtract
            *
            * @usage difference(arrays, fn)
            * @param arrays [Array<Array>] Arrays to subtract
            * @param fn [function] Comparison function
            *
            * @example difference({{1, 2, 1}, {2, 3}}) => [1, 1]
            * @category Working with Arrays | 83
            */`,
      ru: `/**
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
            */`,
      hash: 741123726,
    },
//#endregion difference




//#region distinct
    "distinct": {
      en: `/**
            * Returns an array without duplicate elements while preserving the order.
            *
            * @usage distinct(arr)
            * @param arr [array] Array
            *
            * @usage distinct(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Comparison function
            *
            * @example distinct({3, 1, 2, 3, 3, 2, 3}) => [3, 1, 2]
            *          distinct({{a = 1}, {a = 2}, {a = 1}}, (a, b) => a.a = b.a) => [{a: 1}, {a: 2}]
            * @category Working with Arrays | 80
            */`,
      ru: `/**
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
            */`,
      hash: 467414319,
    },
//#endregion distinct




//#region div
    "div": {
      en: `/**
            * Divides the first argument by the rest.
            *
            * If only one argument is provided, returns its reciprocal.
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
            * @category Math Operators | 4
            */`,
      ru: `/**
            * Делит первый аргумент на остальные.
            *
            * Если аргумент один, возвращает обратное число.
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
            * @category Математические операторы | 4
            */`,
      hash: 329340215,
    },
//#endregion div




//#region do
    "do": {
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
            * @example begin(x := 0,\\
            *         |      do(x < 10, x := x + 1)\\
            *         |) => 10
            * @category Execution Control | 10
            */`,
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
            * @example begin(x := 0,\\
            *         |      do(x < 10, x := x + 1)\\
            *         |) => 10
            * @category Управление выполнением | 10
            */`,
      hash: 671602912,
    },
//#endregion do




//#region doty
    "doty": {
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
      hash: 772682043,
    },
//#endregion doty




//#region empty
    "empty": {
      en: `/**
            * Checks if an array is empty
            *
            * @usage empty(array)
            * @param array [array] Array
            *
            * @example empty({}) => true
            *          empty({1, 2}) => false
            * @category Working with Arrays | 2
            */`,
      ru: `/**
            * Проверяет, является ли массив пустым
            *
            * @usage empty(array)
            * @param array [array] Массив
            *
            * @example empty({}) => true
            *          empty({1, 2}) => false
            * @category Работа с массивами | 2
            */`,
      hash: 922227770,
    },
//#endregion empty




//#region entries
    "entries": {
      en: `/**
            * Returns an array of [key, value] pairs for the object.
            *
            * @usage entries(obj)
            * @param obj [Array | Object] Object for getting key-value pairs.
            *
            * @example entries({a = 1, b = 2}) => [['a', 1], ['b', 2]]
            * @category Working with Hash Tables | 20
            */`,
      ru: `/**
            * Возвращает массив пар [ключ, значение] для объекта.
            *
            * @usage entries(obj)
            * @param obj [Array | Object] Объект для получения пар ключ-значение.
            *
            * @example entries({a = 1, b = 2}) => [['a', 1], ['b', 2]]
            * @category Работа с хэш-таблицами | 20
            */`,
      hash: 1525587159,
    },
//#endregion entries




//#region eq
    "eq": {
      en: `/**
            * Checks if all arguments are equal to the first argument
            * @usage eq(compared, ...args)
            * @param compared [any] Value to compare against
            * @param args [any] Values to compare
            * @example eq(1, 2, 1) => false
            *          eq(1, 1, 1, 1) => true
            *          1 = 3 => false
            *          1 = '1' => true
            * @category Logical Operators | 1
            */`,
      ru: `/**
            * Проверяет на равенство всех аргументов первому аргументу
            * @usage eq(compared, ...agrs)
            * @param compared [any] Значение, с которым сравниваем
            * @param args [any] Значение, которое сравниваем
            * @example eq(1, 2, 1) => false
            *          eq(1, 1, 1, 1) => true
            *          1 = 3 => false
            *          1 = '1' => true
            * @category Логические операторы | 1
            */`,
      hash: 1275430290,
    },
//#endregion eq




//#region eval
    "eval": {
      en: `/**
            * Evaluates LPE-AST with STDLIB context. Another context will be unavailable.
            *
            * @usage eval(expr)
            * @param expr [ast] LPE expression
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Interpreter | 2
            */`,
      ru: `/**
            * Вычисляет LPE-AST в контексте STDLIB. Другие контексты будут недоступны.
            *
            * @usage eval(expr)
            * @param expr [ast] LPE-выражение
            *
            * @example eval({"+", 1, 2}) => 3
            * @category Интерпретатор | 2
            */`,
      hash: 640729027,
    },
//#endregion eval




//#region eval_ast
    "eval_ast": {
      en: `/**
            * Evaluates LPE-AST in the same context.
            *
            * @usage eval_ast(expr)
            * @param expr [AST] AST-tree
            *
            * @example eval_ast({"+", 1, 2}) => 3
            * @category Interpreter | 3
            */`,
      ru: `/**
            * Вычисляет LPE-AST в этом же контексте.
            *
            * @usage eval_ast(expr)
            * @param expr [AST] AST-дерево
            *
            * @example eval_ast({"+", 1, 2}) => 3
            * @category Интерпретатор | 3
            */`,
      hash: 519550440,
    },
//#endregion eval_ast




//#region eval_lpe
    "eval_lpe": {
      en: `/**
            * Evaluates LPE code from a string.
            *
            * @usage eval_lpe(str)
            * @param str [string] String with LPE code
            *
            * @example eval_lpe("1 + 2") => 3
            * @category Interpreter | 4
            */`,
      ru: `/**
            * Вычисляет LPE-код из строки.
            *
            * @usage eval_lpe(str)
            * @param str [string] Строка с LPE-кодом
            *
            * @example eval_lpe("1 + 2") => 3
            * @category Интерпретатор | 4
            */`,
      hash: 1904040483,
    },
//#endregion eval_lpe




//#region every
    "every": {
      en: `/**
            * Returns true, if all elements of the array satisfy the condition.
            *
            * Function \`fn\` may take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - the original array.
            *
            * As a function, you can use the name of the LPE function.
            *
            * @usage every(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function for checking
            *
            * @usage every(arr, value)
            * @param arr [array] Array
            * @param value [any] Value to check
            *
            * @example every({1, 2, 3}, x => x > 1) => false
            *          every({1, 2, 3}, 3) => false
            *          every({1, 2, 3}, x => x > 0) => true
            * @category Working with Arrays | 61
            */`,
      ru: `/**
            * Возвращает true, если все элементы массива удовлетворяют условию.
            *
            * Функция \`fn\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
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
            */`,
      hash: 1138553263,
    },
//#endregion every




//#region extend
    "extend": {
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
      hash: 441214202,
    },
//#endregion extend




//#region filter
    "filter": {
      en: `/**
            * Filters an array by predicate.
            *
            * Function \`predicate\` may take 1 argument:
            * - \`val\` - value of the current element.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage filter(arr, predicate)
            * @param arr [array] Array
            * @param predicate [function] Predicate function
            *
            * @example filter({1, 2, 3, 4}, fn({a}, a > 2)) => [3, 4]
            * @category Working with Arrays | 40
            */`,
      ru: `/**
            * Фильтрует массив по предикату.
            *
            * Функция \`predicate\` может принимать 1 аргумент:
            * - \`val\` - значение текущего элемента.
            *
            * В качестве функции можно использовать имя LPE функции.
            *
            * @usage filter(arr, predicate)
            * @param arr [array] Массив
            * @param predicate [function] Функция-предикат
            *
            * @example filter({1, 2, 3, 4}, fn({a}, a > 2)) => [3, 4]
            * @category Работа с массивами | 40
            */`,
      hash: 1710529692,
    },
//#endregion filter




//#region filterArr
    "filterArr": {
      en: `/**
            * Filters an array by predicate.
            *
            * Function \`predicate\` may take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - source array.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage filterArr(arr, predicate)
            * @param arr [array] Array
            * @param predicate [function] Predicate function
            *
            * @example filterArr({1, 2, 3, 4}, fn({val, idx}, idx < 3)) => [1, 2, 3]
            * @category Working with Arrays | 42
            */`,
      ru: `/**
            * Фильтрует массив по предикату.
            *
            * Функция \`predicate\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
            *
            * В качестве функции можно использовать имя LPE функции.
            *
            * @usage filterArr(arr, predicate)
            * @param arr [array] Массив
            * @param predicate [function] Функция-предикат
            *
            * @example filterArr({1, 2, 3, 4}, fn({val, idx}, idx < 3)) => [1, 2, 3]
            * @category Работа с массивами | 42
            */`,
      hash: 1892486673,
    },
//#endregion filterArr




//#region filterit
    "filterit": {
      en: `/**
            * Filters an array using it and idx variables.
            *
            * it - Current array element.
            * idx - Current element index.
            * @usage filterit(array, condition)
            * @param array [array] Source array
            * @param condition [boolean] Condition
            *
            * @example filterit({1, 2, 3, 4}, it > 2 || idx = 0) => [1, 3, 4]
            * @category Working with Arrays | 41
            * @tags return-support
            */`,
      ru: `/**
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
            */`,
      hash: 1741187179,
    },
//#endregion filterit




//#region find
    "find": {
      en: `/**
            * Returns the first element of the array that satisfies the condition.
            *
            * Function \`fn\` can take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - the original array.
            *
            * As a function, you can use the name of the LPE function.
            *
            * @usage find(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function for checking
            *
            * @usage find(arr, value)
            * @param arr [array] Array
            * @param value [any] Value to find
            *
            * @example find({1, 2, 3}, x => x > 1) => 2
            *          find({1, 2, 3}, 2) => 2
            *          find({1, 2, 3}, 6) => undefined
            * @category Working with Arrays | 30
            */`,
      ru: `/**
            * Возвращает первый элемент массива, удовлетворяющий условию.
            *
            * Функция \`fn\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
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
            */`,
      hash: 440592745,
    },
//#endregion find




//#region findIndex
    "findIndex": {
      en: `/**
            * Returns the index of the first element that satisfies the condition.
            *
            * Returns -1 if no element is found.
            *
            * Function \`fn\` can take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - source array.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage findIndex(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function for checking
            *
            * @usage findIndex(arr, value)
            * @param arr [array] Array
            * @param value [any] Value to search for
            *
            * @example findIndex({1, 2, 3}, x => x > 1) => 1
            *          findIndex({1, 2, 3}, 3) => 2
            *          findIndex({1, 2, 3}, 6) => -1
            * @category Working with Arrays | 31
            */`,
      ru: `/**
            * Возвращает индекс первого элемента, удовлетворяющего условию.
            *
            * Если элемент не найден, возвращает -1.
            *
            * Функция \`fn\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
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
            */`,
      hash: 579697866,
    },
//#endregion findIndex




//#region first
    "first": {
      en: `/**
            * Returns the first element of an array.
            *
            * @usage first(array)
            * @param array [array] Array
            *
            * @example first({1, 2, 3}) => 1
            *          first({}) => null
            * @category Working with Arrays | 20
            */`,
      ru: `/**
            * Возвращает первый элемент массива.
            *
            * @usage first(array)
            * @param array [array] Массив
            *
            * @example first({1, 2, 3}) => 1
            *          first({}) => null
            * @category Работа с массивами | 20
            */`,
      hash: 448826592,
    },
//#endregion first




//#region flat
    "flat": {
      en: `/**
            * Flattens the array to the specified depth. The default depth is 1.
            *
            * @usage flat(arr)
            * @param arr [array] Array
            *
            * @usage flat(arr, depth)
            * @param arr [array] Array
            * @param depth [number] Recursion depth
            *
            * @example {{1, 2}, 3, {4, {5}}}.flat(1) => [1, 2, 3, 4, [5]]
            *          {{1, 2}, 3, {4, {5}}}.flat() => [1, 2, 3, 4, [5]]
            *          {{1, 2}, 3, {4, {5}}}.flat(2) => [1, 2, 3, 4, 5]
            * @category Working with Arrays | 65
            */`,
      ru: `/**
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
            */`,
      hash: 2131346450,
    },
//#endregion flat




//#region fn
    "fn": {
      en: `/**
            * Creates an anonymous function.
            *
            * The \`$this$\` variable is a reference to the function itself.
            * This allows calling itself recursively.
            *
            * @usage fn(args, body)
            * @param args [array] List of arguments
            * @param body [any] Function body
            *
            * @example fn({x}, x * x) => square function
            *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
            *
            *          factorial := fn({x}, if(x < 2, 1, x * $this$(x - 1)));\\
            *          factorial(5) => 120
            * @category Creating Objects | 30
            * @tags return-support
            */`,
      ru: `/**
            * Создаёт анонимную функцию.
            *
            * В этой функции доступна переменная \`$this$\`, которая ссылается на саму функцию.
            * Это позволяет вызывать себя рекурсивно.
            *
            * @usage fn(args, body)
            * @param args [array] Список аргументов
            * @param body [any] Тело функции
            *
            * @example fn({x}, x * x) => функция возведения в квадрат
            *          {1, 2, 3}.map(fn({x}, x * 2)) => [2, 4, 6]
            *
            *          factorial := fn({x}, if(x < 2, 1, x * $this$(x - 1)));\\
            *          factorial(5) => 120
            * @category Создание объектов | 30
            * @tags return-support
            */`,
      hash: 874079944,
    },
//#endregion fn




//#region fromEntries
    "fromEntries": {
      en: `/**
            * Returns an object from an array of [key, value] pairs.
            *
            * @usage fromEntries(obj)
            * @param obj [Array<Array>] Array of [key, value] pairs.
            *
            * @example fromEntries({{'a', 1}, {'b', 2}}) => {a: 1, b: 2}
            * @category Working with Hash Tables | 21
            */`,
      ru: `/**
            * Возвращает объект из массива пар [ключ, значение].
            *
            * @usage fromEntries(obj)
            * @param obj [Array<Array>] Массив пар [ключ, значение].
            *
            * @example fromEntries({{'a', 1}, {'b', 2}}) => {a: 1, b: 2}
            * @category Работа с хэш-таблицами | 21
            */`,
      hash: 1676328987,
    },
//#endregion fromEntries




//#region ge
    "ge": {
      en: `/**
            * Checks that each subsequent argument is less than or equal to the previous one.
            *
            * @usage ge(...args)
            * @param args [number] Numbers to compare
            *
            * @example ge(3, 2, 2, 1) => true
            *          ge(3, 1, 2) => false
            *          3 >= 2 => true
            * @category Logical Operators | 8
            */`,
      ru: `/**
            * Проверяет, что каждый последующий аргумент меньше или равен предыдущему.
            *
            * @usage ge(...args)
            * @param args [number] Числа для сравнения
            *
            * @example ge(3, 2, 2, 1) => true
            *          ge(3, 1, 2) => false
            *          3 >= 2 => true
            * @category Логические операторы | 8
            */`,
      hash: 875849248,
    },
//#endregion ge




//#region get
    "get": {
      en: `/**
            * Gets an object property value.
            *
            * @usage get(obj, key)
            * @param obj [object] Object
            * @param key [string | number] Key
            *
            * @usage get(obj, key, default)
            * @param obj [object] Object
            * @param key [string | number] Key
            * @param default [any] Default value
            *
            * @example get({a: 1}, "a") => 1
            *          get({a: 1}, "b") => undefined
            *          get({a: 1}, "b", "not found") => "not found"
            * @category Working with Hash Tables | 10
            */`,
      ru: `/**
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
            */`,
      hash: 348292642,
    },
//#endregion get




//#region get_in
    "get_in": {
      en: `/**
            * Gets a value from a nested structure by key path.
            *
            * Returns undefined if key is missing.
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
            * @category Working with Hash Tables | 40
            */`,
      ru: `/**
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
            */`,
      hash: 1491879806,
    },
//#endregion get_in




//#region gt
    "gt": {
      en: `/**
            * Checks that each subsequent argument is less than the previous one.
            *
            * @usage gt(...args)
            * @param args [number] Numbers to compare
            *
            * @example gt(3, 2, 1) => true
            *          gt(3, 1, 2) => false
            *          3 > 2 => true
            * @category Logical Operators | 7
            */`,
      ru: `/**
            * Проверяет, что каждый последующий аргумент меньше предыдущего.
            *
            * @usage gt(...args)
            * @param args [number] Число для сравнения
            *
            * @example gt(3, 2, 1) => true
            *          gt(3, 1, 2) => false
            *          3 > 2 => true
            * @category Логические операторы | 7
            */`,
      hash: 155714450,
    },
//#endregion gt




//#region hash
    "hash": {
      en: `/**
            * Creates a hashmap from named arguments.
            *
            * With no arguments, returns an empty hash {}.
            *
            * Positional arguments are ignored — for mixed structures use [vector]($func-vector).
            * @usage hash(...kwargs)
            * @param kwargs [any] Named elements
            *
            * @example hash() => {}
            *          hash(a = 1, b = 2) => {a: 1, b: 2}
            *          {=} => {} ## same as hash()
            * @category Creating Objects | 5
            */`,
      ru: `/**
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
            */`,
      hash: 1911594698,
    },
//#endregion hash




//#region hoty
    "hoty": {
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
      hash: 1987061880,
    },
//#endregion hoty




//#region identity
    "identity": {
      en: `/**
            * Returns the passed argument.
            *
            * @usage identity(value)
            * @param value [any] Value
            *
            * @example identity(5) => 5
            *          (1 + 2) * 3 => 9 ## Round brackets are a call to this function
            * @category 1
            */`,
      ru: `/**
            * Возвращает переданный аргумент.
            *
            * @usage identity(value)
            * @param value [any] Значение
            *
            * @example identity(5) => 5
            *          (1 + 2) * 3 => 9 ## Круглые скобки являются вызовом этой функции
            * @category 1
            */`,
      hash: 1822789924,
    },
//#endregion identity




//#region if
    "if": {
      en: `/**
            * Conditional expression.
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
      ru: `/**
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
            */`,
      hash: 1634102927,
    },
//#endregion if




//#region intersect
    "intersect": {
      en: `/**
            * Returns the intersection of all passed arrays.
            *
            * @usage intersect(arrays)
            * @param arrays [Array<Array>] Arrays to intersect
            *
            * @usage intersect(arrays, fn)
            * @param arrays [Array<Array>] Arrays to intersect
            * @param fn [function] Comparison function
            *
            * @example intersect({{1, 2}, {2, 3}}) => [2]
            *          intersect({{1, 2, 2, 2}, {2, 3}, {1, 2}}) => [2]
            * @category Working with Arrays | 82
            */`,
      ru: `/**
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
            */`,
      hash: 493664563,
    },
//#endregion intersect




//#region invoke
    "invoke": {
      en: `/**
            * Calls an object method.
            *
            * @usage invoke(obj, method, ...args)
            * @param obj [object] Object
            * @param method [string] Method name
            * @param args [any] Method arguments
            *
            * @example invoke({1, 2, 3}, "toString") => "1,2,3"
            *          invoke({1, 2, 3}, "push", 4) => [1,2,3,4]
            *          invoke({1, 2, 3}, concat, {4, 5, 6}) => [1,2,3,4,5,6]
            *          invoke({1, 2, 3}, "con" + "cat", {4, 5, 6}) => [1,2,3,4,5,6]
            * @category 12
            */`,
      ru: `/**
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
            */`,
      hash: 2139608020,
    },
//#endregion invoke




//#region isa
    "isa": {
      en: `/**
            * Checks if an object is an instance of a class.
            *
            * @usage isa(obj, class)
            * @param obj [any] Object to check
            * @param class [any] Class
            *
            * @example isa({1,2,3}, Array) => true
            * @category Type Checks | 1
            */`,
      ru: `/**
            * Проверяет, является ли объект экземпляром класса.
            *
            * @usage isa(obj, class)
            * @param obj [any] Проверяемый объект
            * @param class [any] Класс
            *
            * @example isa({1,2,3}, Array) => true
            * @category Проверки типов | 1
            */`,
      hash: 253220558,
    },
//#endregion isa




//#region isArray
    "isArray": {
      en: `/**
            * Checks if an argument is an array.
            *
            * @usage isArray(arg)
            * @param arg [any] Value to check
            *
            * @example isArray({1, 2, 3}) => true
            *          isArray({a = 1}) => false
            *          isArray({1, 2, a = 1}) => true
            *          isArray("hello") => false
            * @category Type Checks | 25
            */`,
      ru: `/**
            * Проверяет, является ли аргумент массивом.
            *
            * @usage isArray(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isArray({1, 2, 3}) => true
            *          isArray({a = 1}) => false
            *          isArray({1, 2, a = 1}) => true
            *          isArray("hello") => false
            * @category Проверки типов | 25
            */`,
      hash: 149753781,
    },
//#endregion isArray




//#region isBool
    "isBool": {
      en: `/**
            * Checks if a value is a boolean.
            *
            * @usage isBool(arg)
            * @param arg [any] Checked value
            *
            * @example isBool(true) => true
            *          isBool(false) => true
            *          isBool(0) => false
            *          isBool("true") => false
            * @category Type Checks | 12
            */`,
      ru: `/**
            * Проверяет, является ли аргумент булевым значением.
            *
            * @usage isBool(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isBool(true) => true
            *          isBool(false) => true
            *          isBool(0) => false
            *          isBool("true") => false
            * @category Проверки типов | 12
            */`,
      hash: 1189753289,
    },
//#endregion isBool




//#region isFalse
    "isFalse": {
      en: `/**
            * Checks if a value is false.
            *
            * @usage isFalse(value)
            * @param value [any] Value to check
            *
            * @example isFalse(false) => true
            *          isFalse(0) => false
            * @category Type Checks | 11
            */`,
      ru: `/**
            * Проверяет, является ли значение false.
            *
            * @usage isFalse(value)
            * @param value [any] Проверяемое значение
            *
            * @example isFalse(false) => true
            *          isFalse(0) => false
            * @category Проверки типов | 11
            */`,
      hash: 1570710738,
    },
//#endregion isFalse




//#region isFunction
    "isFunction": {
      en: `/**
            * Checks if an argument is a function.
            *
            * @usage isFunction(arg)
            * @param arg [any] Checked value
            *
            * @example isFunction((a, b) => a + b) => true
            *          isFunction(fn({a, b}, a + b)) => true
            *          isFunction(42) => false
            * @category Type Checks | 30
            */`,
      ru: `/**
            * Проверяет, является ли аргумент функцией.
            *
            * @usage isFunction(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isFunction((a, b) => a + b) => true
            *          isFunction(fn({a, b}, a + b)) => true
            *          isFunction(42) => false
            * @category Проверки типов | 30
            */`,
      hash: 2141002591,
    },
//#endregion isFunction




//#region isHash
    "isHash": {
      en: `/**
            * Checks if an argument is a hash table (object, but not an array or null).
            *
            * @usage isHash(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isHash({a = 1, b = 2}) => true
            *          isHash(Hashmap) => true
            *          isHash({}) => false
            *          isHash({1, 2, 3}) => false
            *          isHash({1, 2, 3, a = 1}) => false
            *          isHash(null) => false
            *          isHash("object") => false
            * @category Type Checks | 26
            */`,
      ru: `/**
            * Проверяет, является ли аргумент хэш-таблицей (объектом, но не массивом и не null).
            *
            * @usage isHash(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isHash({a = 1, b = 2}) => true
            *          isHash(Hashmap) => true
            *          isHash({}) => false
            *          isHash({1, 2, 3}) => false
            *          isHash({1, 2, 3, a = 1}) => false
            *          isHash(null) => false
            *          isHash("object") => false
            * @category Проверки типов | 26
            */`,
      hash: 1623917542,
    },
//#endregion isHash




//#region isNull
    "isNull": {
      en: `/**
            * Checks if a value is null or undefined.
            *
            * @usage isNull(value)
            * @param value [any] Value to check
            *
            * @example isNull(null) => true
            *          isNull(undefined) => true
            *          isNull(0) => false
            * @category Type Checks | 5
            */`,
      ru: `/**
            * Проверяет, является ли значение null или undefined.
            *
            * @usage isNull(value)
            * @param value [any] Проверяемое значение
            *
            * @example isNull(null) => true
            *          isNull(undefined) => true
            *          isNull(0) => false
            * @category Проверки типов | 5
            */`,
      hash: 1166670683,
    },
//#endregion isNull




//#region isNumber
    "isNumber": {
      en: `/**
            * Checks if a value is a number.
            *
            * @usage isNumber(arg)
            * @param arg [any] Checked value
            *
            * @example isNumber(42) => true
            *          isNumber(3.14) => true
            *          isNumber("42") => false
            *          isNumber(NaN) => true (NaN is a number by typeof)
            * @category Type Checks | 15
            */`,
      ru: `/**
            * Проверяет, является ли аргумент числом.
            *
            * @usage isNumber(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isNumber(42) => true
            *          isNumber(3.14) => true
            *          isNumber("42") => false
            *          isNumber(NaN) => true (NaN является числом по typeof)
            * @category Проверки типов | 15
            */`,
      hash: 1893823407,
    },
//#endregion isNumber




//#region isNumberLike
    "isNumberLike": {
      en: `/**
            * Checks if a value is a number or a number string.
            *
            * @usage isNumberLike(arg)
            * @param arg [any] Checked value
            *
            * @example isNumberLike(42) => true
            *          isNumberLike("3.14") => true
            *          isNumberLike({}) => false
            * @category Type Checks | 16
            */`,
      ru: `/**
            * Проверяет, является ли аргумент числом или числом-строкой.
            *
            * @usage isNumberLike(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isNumberLike(42) => true
            *          isNumberLike("3.14") => true
            *          isNumberLike({}) => false
            * @category Проверки типов | 16
            */`,
      hash: 1603565360,
    },
//#endregion isNumberLike




//#region isObj
    "isObj": {
      en: `/**
            * Checks if an argument is an object or array (not null).
            *
            * @usage isObj(arg)
            * @param arg [any] Checked value
            *
            * @example isObj({a = 1, b = 2}) => true
            *          isObj(Hashmap) => true
            *          isObj({}) => true
            *          isObj({1, 2, 3}) => true
            *          isObj({1, 2, 3, a = 1}) => true
            *          isObj(null) => false
            *          isObj("object") => false
            * @category Type Checks | 27
            */`,
      ru: `/**
            * Проверяет, является ли аргумент хэш-таблицей или массивом (не null).
            *
            * @usage isObj(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isObj({a = 1, b = 2}) => true
            *          isObj(Hashmap) => true
            *          isObj({}) => true
            *          isObj({1, 2, 3}) => true
            *          isObj({1, 2, 3, a = 1}) => true
            *          isObj(null) => false
            *          isObj("object") => false
            * @category Проверки типов | 27
            */`,
      hash: 263012652,
    },
//#endregion isObj




//#region isod
    "isod": {
      en: `/**
            * Returns day of year in ISO format (YYYY-ddd)
            *
            * @usage isod(date)
            * @param date [string] Date
            *
            * @example isod("2024-01-15") => "2024-015"
            * @category Calendar Functions | 24
            */`,
      ru: `/**
            * Возвращает день года в формате ISO (YYYY-ddd)
            *
            * @usage isod(date)
            * @param date [string] Дата
            *
            * @example isod("2024-01-15") => "2024-015"
            * @category Календарные функции | 24
            */`,
      hash: 143974500,
    },
//#endregion isod




//#region isom
    "isom": {
      en: `/**
            * Returns month in ISO format (YYYY-MM)
            *
            * @usage isom(date)
            * @param date [string] Date
            *
            * @example isom("2024-01-15") => "2024-01"
            * @category Calendar Functions | 22
            */`,
      ru: `/**
            * Возвращает месяц в формате ISO (YYYY-MM)
            *
            * @usage isom(date)
            * @param date [string] Дата
            *
            * @example isom("2024-01-15") => "2024-01"
            * @category Календарные функции | 22
            */`,
      hash: 205738103,
    },
//#endregion isom




//#region isoq
    "isoq": {
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
      hash: 761340497,
    },
//#endregion isoq




//#region isow
    "isow": {
      en: `/**
            * Returns week in ISO format (YYYY-Www)
            *
            * @usage isow(date)
            * @param date [string] Date
            *
            * @example isow("2024-01-15") => "2024-W03"
            * @category Calendar Functions | 23
            */`,
      ru: `/**
            * Возвращает неделю в формате ISO (YYYY-Www)
            *
            * @usage isow(date)
            * @param date [string] Дата
            *
            * @example isow("2024-01-15") => "2024-W03"
            * @category Календарные функции | 23
            */`,
      hash: 1653480027,
    },
//#endregion isow




//#region isoy
    "isoy": {
      en: `/**
            * Returns year in ISO format
            *
            * @usage isoy(date)
            * @param date [string] Date
            *
            * @example isoy("2024-01-15") => "2024"
            * @category Calendar Functions | 20
            */`,
      ru: `/**
            * Возвращает год в формате ISO
            *
            * @usage isoy(date)
            * @param date [string] Дата
            *
            * @example isoy("2024-01-15") => "2024"
            * @category Календарные функции | 20
            */`,
      hash: 306358331,
    },
//#endregion isoy




//#region isString
    "isString": {
      en: `/**
            * Checks if an argument is a string.
            *
            * @usage isString(arg)
            * @param arg [any] Value to check
            *
            * @example isString("hello") => true
            *          isString(123) => false
            *          isString({1, 2}) => false
            * @category Type Checks | 20
            */`,
      ru: `/**
            * Проверяет, является ли аргумент строкой.
            *
            * @usage isString(arg)
            * @param arg [any] Проверяемое значение
            *
            * @example isString("hello") => true
            *          isString(123) => false
            *          isString({1, 2}) => false
            * @category Проверки типов | 20
            */`,
      hash: 547106623,
    },
//#endregion isString




//#region isTrue
    "isTrue": {
      en: `/**
            * Checks if a value is true.
            *
            * @usage isTrue(value)
            * @param value [any] Value to check
            *
            * @example isTrue(true) => true
            *          isTrue(1) => false
            * @category Type Checks | 10
            */`,
      ru: `/**
            * Проверяет, является ли значение true.
            *
            * @usage isTrue(value)
            * @param value [any] Проверяемое значение
            *
            * @example isTrue(true) => true
            *          isTrue(1) => false
            * @category Проверки типов | 10
            */`,
      hash: 2084326101,
    },
//#endregion isTrue




//#region isUndef
    "isUndef": {
      en: `/**
            * Checks if a value is undefined.
            *
            * @usage isUndef(value)
            * @param value [any] Checked value
            *
            * @example isUndef(null) => false
            *          isUndef(undefined) => true
            *          isUndef(0) => false
            * @category Type Checks | 6
            */`,
      ru: `/**
            * Проверяет, является ли значение undefined.
            *
            * @usage isUndef(value)
            * @param value [any] Проверяемое значение
            *
            * @example isUndef(null) => false
            *          isUndef(undefined) => true
            *          isUndef(0) => false
            * @category Проверки типов | 6
            */`,
      hash: 1432105315,
    },
//#endregion isUndef




//#region join
    "join": {
      en: `/**
            * Joins array elements into a string with separator
            *
            * @usage join(array, separator)
            * @param array [array] Array
            * @param separator [string] Separator
            *
            * @example join({1, 2, 3}, "-") => "1-2-3"
            * @category Working with Arrays | 100
            */`,
      ru: `/**
            * Объединяет элементы массива в строку через разделителью
            *
            * @usage join(array, separator)
            * @param array [array] Массив
            * @param separator [string] Разделитель
            *
            * @example join({1, 2, 3}, "-") => "1-2-3"
            * @category Работа с массивами | 100
            */`,
      hash: 1197584977,
    },
//#endregion join




//#region joinObj
    "joinObj": {
      en: `/**
            * Joins array or hash table elements into a string with separator.
            *
            * Function \`fn\` is used to convert elements to a string, accepting 2 arguments:
            * - \`key\`: key of the element (for arrays \`key\` is the index as a string).
            * - \`value\`: value of the element.
            *
            * If \`fn\` is not specified, element values are converted to strings.
            *
            *
            * @usage joinObj(obj, separator)
            * @param obj [object | array] Object
            * @param separator [string] Separator
            *
            * @usage joinObj(obj, separator, fn)
            * @param obj [object | array] Object
            * @param separator [string] Separator
            * @param fn [function] String-conversion function
            *
            * @example joinObj({1, null, 3}, "-") => "1-null-3"
            *          joinObj({a: 12, b: "test"}, "; ", (k, v) => str(k, ": ", v)) => "a: 12; b: test"
            * @category Working with Arrays | 101
            */`,
      ru: `/**
            * Объединяет элементы массива или хэш-таблицы в строку через разделитель.
            *
            * Для преобразования элементов в строку используется функция \`fn\`, принимающая 2 аргумента:
            * - \`key\`: ключ элемента (для массивов \`key\` равен индексу в виде строки).
            * - \`value\`: значение элемента.
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
            */`,
      hash: 878092368,
    },
//#endregion joinObj




//#region jsonParse
    "jsonParse": {
      en: `/**
            * Parses JSON-string into object.
            *
            * @usage json_parse(str)
            * @param str [string] JSON-string
            *
            * @example json_parse('{"a": 1}') => {a: 1}
            * @category Type Conversion | 10
            */`,
      ru: `/**
            * Преобразует JSON-строку в объект.
            *
            * @usage json_parse(str)
            * @param str [string] JSON-строка
            *
            * @example json_parse('{"a": 1}') => {a: 1}
            * @category Преобразование типов | 10
            */`,
      hash: 2063693599,
    },
//#endregion jsonParse




//#region jsonStringify
    "jsonStringify": {
      en: `/**
            * Stringifies JSON-object.
            *
            * @usage jsonStringify(obj)
            * @param obj [Object] Object
            *
            * @example jsonStringify({a = 1}) => "{"a": 1}"
            * @category Type Conversion | 11
            */`,
      ru: `/**
            * Преобразует JSON-объект в строку.
            *
            * @usage jsonStringify(obj)
            * @param obj [Object] Объект
            *
            * @example jsonStringify({a = 1}) => "{"a": 1}"
            * @category Преобразование типов | 11
            */`,
      hash: 1546152783,
    },
//#endregion jsonStringify




//#region keys
    "keys": {
      en: `/**
            * Returns an array of object keys.
            *
            * @usage keys(obj)
            * @param obj [object] Object
            *
            * @example keys({a = 1, b = 2}) => ["a", "b"]
            *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
            * @category Working with Hash Tables | 15
            */`,
      ru: `/**
            * Возвращает массив ключей объекта.
            *
            * @usage keys(obj)
            * @param obj [object] Объект
            *
            * @example keys({a = 1, b = 2}) => ["a", "b"]
            *          keys((1, 2, a = 1, b = 2)) => [0, 1, "a", "b"]
            * @category Работа с хэш-таблицами | 15
            */`,
      hash: 499857617,
    },
//#endregion keys




//#region lambda
    "lambda": {
      en: `/**
            * Creates a function with an alternative syntax.
            *
            * Supports two calling variants:
            * 1. With a single argument: arg => body.
            * 2. With a tuple of arguments: (arg1, arg2, ...) => body.
            *
            * The \`$this$\` variable is a reference to the function itself.
            * This allows calling itself recursively.
            *
            * @usage arg => body
            * @param arg [string] The name of the single argument.
            * @param body [any] The function body.
            *
            * @usage (...args) => body
            * @param args [string] The names of the arguments.
            * @param body [any] The function body.
            *
            * @example {1, 2, 3}.map(x => x * 2) => [2, 4, 6]
            *          (x, y) => x + y => Function addition
            *          lambda((x, y), x + y) => Function addition
            *          x => if(x < 2, 1, x * $this$(x - 1)) => Recursive factorial function
            * @category Creating Objects | 32
            */`,
      ru: `/**
            * Создаёт функцию с альтернативным синтаксисом.
            *
            * Поддерживает два варианта вызова:
            * 1. С одним аргументом: arg => body.
            * 2. С кортежем аргументов: (arg1, arg2 ...) => body.
            *
            * В этой функции доступна переменная \`$this$\`, которая ссылается на саму функцию.
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
            */`,
      hash: 1655019252,
    },
//#endregion lambda




//#region last
    "last": {
      en: `/**
            * Returns the last element of an array.
            *
            * @usage last(array)
            * @param array [array] Array
            *
            * @example last({1, 2, 3}) => 3
            *          last({}) => undefined
            * @category Working with Arrays | 21
            */`,
      ru: `/**
            * Возвращает последний элемент массива.
            *
            * @usage last(array)
            * @param array [array] Массив
            *
            * @example last({1, 2, 3}) => 3
            *          last({}) => undefined
            * @category Работа с массивами | 21
            */`,
      hash: 2037984982,
    },
//#endregion last




//#region le
    "le": {
      en: `/**
            * Checks that each subsequent argument is greater than or equal to the previous one.
            *
            * @usage le(...args)
            * @param args [number] Numbers to compare
            *
            * @example le(1, 2, 2, 3) => true
            *          le(1, 3, 2) => false
            *          1 <= 2 => true
            * @category Logical Operators | 6
            */`,
      ru: `/**
            * Проверяет, что каждый последующий аргумент больше или равен предыдущему.
            *
            * @usage le(...args)
            * @param args [number] Числа для сравнения
            *
            * @example le(1, 2, 2, 3) => true
            *          le(1, 3, 2) => false
            *          1 <= 2 => true
            * @category Логические операторы | 6
            */`,
      hash: 811852221,
    },
//#endregion le




//#region let
    "let": {
      en: `/**
            * Creates local variable bindings and executes expressions in their context.
            *
            * The object of the bindings can be one of:
            * - \`Array<[VarName, Value]>\` - list of key-value pairs
            * - \`Hash\` - object with keys and values
            * - \`Function\` - a function for getting the value of a variable
            *
            * The function accepts the following arguments:
            * - \`key' - the name of a variable or function
            * - \`value' - the value of the variable that needs to be set to it. If we want to get a value, then we can omit value or pass \`undefined'
            * - \`options\` - an object with additional options
            *
            * If \`bindings\` is a hash table, a new context object will not be created.
            * If the values of variables are reassigned, the changes will be reflected in the passed object.
            *
            * @usage let(bindings, ...exprs)
            * @param bindings [Array | Object | Function] List of bindings or function for getting the value of a variable
            * @param exprs [any] Expressions to execute in the context of bindings
            *
            * @example let({{"x", 10}, {"y", 20}}, x + y) => 30
            *          let({{"name", "Alice"}}, println("Hello,", name), name) => Alice
            *          ## Console output: "Hello, Alice"
            *          let({x = 10, y = 20}, x + y) => 30
            *          let((key) => if(key = "x", 10, key = "y", 20), x + y) => 30
            * @category Working with Variables | 5
            * @tags return-support
            */`,
      ru: `/**
            * Создаёт локальные привязки переменных и выполняет выражения в их контексте.
            *
            * В качестве объекта привязок может быть одно из:
            * - \`Array<[VarName, Value]>\` - список пар ключ-значение
            * - \`Hash\` - объект с ключами и значениями
            * - \`Function\` - функция для получения значения переменной
            *
            * Функция принимает следующие аргументы:
            * - \`key\` - имя переменной или функции
            * - \`value\` - значение переменной, которое нужно ей установить. Если мы хотим получить значение, то value можно не передавать или передать \`undefined\`
            * - \`options\` - объект с дополнительными опциями
            *
            * В случае, если в качестве \`bindings\` передается хэш-таблица, новый объект контекста не будет создан.
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
            */`,
      hash: 1327858170,
    },
//#endregion let




//#region letseq
    "letseq": {
      en: `/**
            * Create local bindings sequentially: each subsequent binding
            * sees the previous ones (unlike let, where bindings are independent).
            *
            * \`VAR ... RETURN\` compiles to that function.
            *
            * @usage let*(bindings, ...exprs)
            * @param bindings [array] List of bindings [[key, value], ...]
            * @param exprs [any] Expression for evaluating with the bindings
            *
            * @example letseq({{"x", 10}, {"y", x * 2}}, y) => 20
            * @category Working with Variables | 6
            * @tags return-support
            */`,
      ru: `/**
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
            */`,
      hash: 1739595036,
    },
//#endregion letseq




//#region list
    "list": {
      en: `/**
            * Creates a list (array) from arguments
            *
            * @usage list(...args)
            * @param args [any] List elements
            *
            * @example list(1, 2, 3) => [1, 2, 3]
            *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
            * @category Creating Objects | 3
            */`,
      ru: `/**
            * Создаёт список (массив) из аргументов
            *
            * @usage list(...args)
            * @param args [any] Элементы списка
            *
            * @example list(1, 2, 3) => [1, 2, 3]
            *          list(1, 2, 3, a = 1, b = 2) => [1, 2, 3, false, false]
            * @category Создание объектов | 3
            */`,
      hash: 1608801175,
    },
//#endregion list




//#region logicalAnd
    "logicalAnd": {
      en: `/**
            * Logical AND. Returns true if all expressions are truthy.
            *
            * Returns true or false.
            * @usage logicalAnd(...exprs)
            * @param exprs [boolean] Expressions
            *
            * @category Logical Operators | 22
            */`,
      ru: `/**
            * Логическое И. Возвращает true, если все выражения истинны.
            *
            * Возвращает true или false.
            * @usage logicalAnd(...exprs)
            * @param exprs [boolean] Выражения для проверки
            *
            * @category Логические операторы | 22
            */`,
      hash: 1375384767,
    },
//#endregion logicalAnd




//#region logicalOr
    "logicalOr": {
      en: `/**
            * Logical OR. Returns true if at least one of the expressions is truthy.
            *
            * Returns true or false.
            * @usage logicalOr(...exprs)
            * @param exprs [boolean] Expressions
            * @example logicalOr(0, 0, 0)
            *
            * @category Logical Operators | 23
            */`,
      ru: `/**
            * Логическое ИЛИ. Возвращает true, если хотя бы одно из выражений истинно.
            *
            * Возвращает true или false.
            * @usage logicalOr(...exprs)
            * @param exprs [boolean] Выражения для проверки
            * @example logicalOr(0, 0, 0)
            *
            * @category Логические операторы | 23
            */`,
      hash: 409073755,
    },
//#endregion logicalOr




//#region lt
    "lt": {
      en: `/**
            * Checks that each subsequent argument is greater than the previous one.
            *
            * @usage lt(...args)
            * @param args [number] Numbers to compare
            *
            * @example lt(1, 2, 3) => true
            *          lt(1, 3, 2) => false
            *          1 < 2 => true
            * @category Logical Operators | 5
            */`,
      ru: `/**
            * Проверяет, что каждый последующий аргумент больше предыдущего.
            *
            * @usage lt(...args)
            * @param args [number] Число для сравнения
            *
            * @example lt(1, 2, 3) => true
            *          lt(1, 3, 2) => false
            *          1 < 2 => true
            * @category Логические операторы | 5
            */`,
      hash: 402172003,
    },
//#endregion lt




//#region makeHash
    "makeHash": {
      en: `/**
            * Creates a hashmap from named arguments.
            *
            * With no arguments, returns an empty hash.
            *
            * Position arguments are ignored — for mixed structures, use [vector]($func-vector).
            *
            * Unlike [hash]($func-hash), this function evaluates expressions written as key names.
            *
            * @usage makeHash(...kwargs)
            * @param kwargs [any] Named elements
            *
            * @example makeHash() => {}
            *          makeHash(a = 1, b = 2) => {a: 1, b: 2}
            *          makeHash(1+2 = 'test') => {3: 'test'}
            * @category Creating Objects | 6
            */`,
      ru: `/**
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
            */`,
      hash: 944030172,
    },
//#endregion makeHash




//#region makeStruct
    "makeStruct": {
      en: `/**
            * Creates an object with a given structure. Modifies the passed object to match the structure (creates a copy).
            *
            * Specifies default values that will be used if they are not present in the source or if the data type does not match the expected one.
            *
            * @usage makeStruct(obj, struct)
            * @param obj [array | object] Object to fill
            * @param struct [array | object] Object schema for the structure
            *
            * @example {\\
            *          |  a = {1, 2, 3},\\
            *          |  b = {c = {}}\\
            *          |}.makeStruct(\\
            *          |  { a = {b=0}, d = {0,0,0}}\\
            *          |) => { a: [ 1, 2, 3, b: 0 ], b: { c: [] }, d: [ 0, 0, 0 ] }
            *          {1, 2, 3}.makeStruct({a=1, b = 2}) => [ 1, 2, 3, a: 1, b: 2 ]
            *          {1, 2, 3}.makeStruct({0,0,0,0,0,0}) => [ 1, 2, 3, 0, 0, 0 ]
            * @category Working with Hash Tables | 55
            */`,
      ru: `/**
            * Создает объект с заданной структурой. Модифицирует переданный объект для соответствия структуре (создает копию).
            *
            * В структуре указаны умалчиваемые значения, которые будут использованы если их нет в from или если тип данных не соответствует ожидаемому.
            *
            * @usage makeStruct(obj, struct)
            * @param obj [array | object] Объект, который необходимо заполнить
            * @param struct [array | object] Объект-схема структуры
            *
            * @example {\\
            *          |  a = {1, 2, 3},\\
            *          |  b = {c = {}}\\
            *          |}.makeStruct(\\
            *          |  { a = {b=0}, d = {0,0,0}}\\
            *          |) => { a: [ 1, 2, 3, b: 0 ], b: { c: [] }, d: [ 0, 0, 0 ] }
            *          {1, 2, 3}.makeStruct({a=1, b = 2}) => [ 1, 2, 3, a: 1, b: 2 ]
            *          {1, 2, 3}.makeStruct({0,0,0,0,0,0}) => [ 1, 2, 3, 0, 0, 0 ]
            * @category Работа с хэш-таблицами | 55
            */`,
      hash: 1095006651,
    },
//#endregion makeStruct




//#region map
    "map": {
      en: `/**
            * Applies a function to each element of an array.
            *
            * Function \`fn\` may take 1 argument:
            * - \`val\` - value of the current element.
            *
            * You can use LPE function name as the function argument.
            * @usage map(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function to apply
            *
            * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
            *          {1, 2, 3}.map(minus) => [-1, -2, -3]
            * @category Working with Arrays | 35
            */`,
      ru: `/**
            * Применяет функцию к каждому элементу массива.
            *
            * Функция \`fn\` может принимать 1 аргумент:
            * - \`val\` - значение текущего элемента.
            *
            * В качестве функции можно использовать имя LPE функции.
            * @usage map(arr, fn)
            * @param arr [array] Массив
            * @param fn [function] Функция для применения
            *
            * @example map({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
            *          {1, 2, 3}.map(minus) => [-1, -2, -3]
            * @category Работа с массивами | 35
            */`,
      hash: 268487195,
    },
//#endregion map




//#region mapArr
    "mapArr": {
      en: `/**
            * Applies a function to each element of an array.
            *
            * Function \`fn\` may take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - source array.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage mapArr(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function to apply
            *
            * @example mapArr({1, 2, 3}, fn({a}, a * 2)) => [2, 4, 6]
            *          {1, 2, 3}.mapArr({1, 2, 3}, (val, idx) => val * idx) => [0, 2, 6]
            * @category Working with Arrays | 37
            */`,
      ru: `/**
            * Применяет функцию к каждому элементу массива.
            *
            * Функция \`fn\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
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
            */`,
      hash: 638603261,
    },
//#endregion mapArr




//#region mapit
    "mapit": {
      en: `/**
            * Transforms an array using it and idx variables.
            *
            * it - Current array element.
            * idx - Current element index.
            * @usage mapit(array, transformation)
            * @param array [array] Source array
            * @param transformation [any] Expression to get transformed value
            *
            * @example mapit({1, 2, 3}, it * 2) => [2, 4, 6]
            * @example mapit({"a", "b", "c"}, it + idx) => ["a0", "b1", "c2"]
            * @category Working with Arrays | 36
            * @tags return-support
            */`,
      ru: `/**
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
            */`,
      hash: 1832309643,
    },
//#endregion mapit




//#region max
    "max": {
      en: `/**
            * Finds the maximum number in an array.
            *
            * @usage max(array)
            * @param array [array<number>] Array of numbers
            *
            * @example max({1, 5, 2, 8, 3}) => 8
            * @category Mathematical Functions | 10
            */`,
      ru: `/**
            * Находит максимальное число в массиве.
            *
            * @usage max(array)
            * @param array [array<number>] Массив чисел
            *
            * @example max({1, 5, 2, 8, 3}) => 8
            * @category Математические функции | 10
            */`,
      hash: 1986843396,
    },
//#endregion max




//#region merge
    "merge": {
      en: `/**
            * Join several hash tables into one. When using arrays as key names, the index of the element is used.
            *
            * Associative array is returned when joining arrays. If there are no arrays to join, a hash table is returned.
            *
            * When no merge function is specified, the last encountered element is used.
            *
            * Type of merge function can be specified, which determines the arguments passed to the merge function (default \`sequence\`):
            * - \`sequence\`: Sequential merge. The merge function takes 3 arguments: the key name, the previous value and the next value.
            * - \`sequenceWithFirst\`: Sequential merge. The merge function takes 4 arguments: the key name, the previous value, the next value and a flag indicating whether this is the first occurrence of this key.
            * - \`full\`: Full merge. The merge function takes 3 arguments: the key name, an array of values for this key and an array of flags indicating whether values for this key were present.
            *
            * @usage merge(hashes)
            * @param hashes [Array<Object>] Array of hashes to merge
            *
            * @usage merge(hashes, fn)
            * @param hashes [Array<Object>] Array of hashes to merge
            * @param fn [function] Function to merge elements
            *
            * @usage merge(hashes, fn, type)
            * @param hashes [Array<Object>] Array of hashes to merge
            * @param fn [function] Function to merge elements
            * @param type ['sequence'|'full'] Type of merge
            *
            * @example merge({{a = 1, c = 5}, {a = 3, b = 2}}) => {a: 3, c: 5, b: 2}
            *          merge({{a = {4,5,6}}, {a = {1}, b = 2}}) => {a: [1]}, b: 2} ## Structore are not merged recursively
            *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old) => {a: 1, b: 2} ## Get the first encountered value
            *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old + new) => {a: 4, b: 2} ## Sum values
            *          merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals, 'full') => {a: [1, 3], b: [undefined, 2]}
            *          merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals.filterArr((v, idx) => has.(idx)), 'full') => {a: [1, 3], b: [2]}
            *          merge({{a = 1}, {a = 3, b = 2}}, (key, old, new, first) => if(first, {new}, old.concat({new})), 'sequenceWithFirst') => {a: [1, 3], b: [2]}
            *          merge({{1, 2, 3}, { 5, 2, 10}}, (key, old, new) => old + new) => [6, 4, 13] ## Merge array elements with positional addition
            * @category Working with Hash Tables | 50
            */`,
      ru: `/**
            * Объединяет несколько хэш-таблиц в одну. При использовании массивов в качестве имен ключей используется индекс элемента.
            *
            * При объединении массивов функция возвращает ассоциативный массив. Если массивов при объелинении нет, возвращается хэш-таблица.
            *
            * Без указания функции слияния берет последний встреченный элемент.
            *
            * Можно указать тип слияния, от которого зависят аргументы функции слияния (по умолчанию \`sequence\`):
            * - \`sequence\`: Слияние происходит последовательно. Функция слияния принимает 3 аргумента: имя ключа, предыдущее значение и следующее значение.
            * - \`sequenceWithFirst\`: Слияние происходит последовательно. Функция слияния принимает 4 аргумента: имя ключа, предыдущее значение, следующее значение и флаг, указывающий, является ли это первым вхождением этого ключа.
            * - \`full\`: Слияние происходит за одну итерацию. Функция слияния принимает 3 аргумента: имя ключа, массив значений для данного ключа и массив флагов, указывающий, присутствовали ли значения для данного ключа.
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
            */`,
      hash: 1521169873,
    },
//#endregion merge




//#region mergeDeep
    "mergeDeep": {
      en: `/**
            * Merge two hash tables into one, traversing all arrays and objects.
            *
            * With no merge function specified, the last encountered value is used.
            *
            * Merge function takes 3 arguments:
            * - \`path\`: key path.
            * - \`old\`: value from the first hash table.
            * - \`new\`: value from the second hash table.
            *
            * @usage merge(obj1, obj2, fn)
            * @param obj1 [Array | Object] The first hash table.
            * @param obj2 [Array | Object] The second hash table.
            * @param fn [function] The merge function.
            *
            * @usage merge(obj1, obj2, fn, manualMerge)
            * @param obj1 [Array | Object] The first hash table.
            * @param obj2 [Array | Object] The second hash table.
            * @param fn [function] The merge function.
            * @param manualMerge [boolean] If true, then call the merge function even if the value is not set in one of the objects.
            *
            * @example mergeDeep({a = 1, c = 5}, {a = 3, b = 2}) => {a: 3, c: 5, b: 2}
            *          mergeDeep({a = {4,5,6}}, {a = {1}, b = 2}) => {a: [1, 5, 6]}, b: 2} ## Merge objects by element
            *          mergeDeep({a = {4,5,6}}, {a = {1}, b = 2}, (path, old, new) => old + new) => {a: [5, 5, 6]}, b: 2} ## Sum by element
            * @category Working with Hash Tables | 51
            */`,
      ru: `/**
            * Объединяет два хэш-таблицы в одну, при этом обходя все массивы и объекты.
            *
            * Без указания функции слияния берет последний встреченный элемент.
            *
            * Функция слияния принимает 3 аргумента:
            * - \`path\`: путь до ключа.
            * - \`old\`: значение из первой хэш-таблицы.
            * - \`new\`: значение из второй хэш-таблицы.
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
            */`,
      hash: 1837853742,
    },
//#endregion mergeDeep




//#region min
    "min": {
      en: `/**
            * Finds the minimum number in an array.
            *
            * @usage min(array)
            * @param array [array<number>] Array of numbers
            *
            * @example min([1, 5, 2, 8, 3]) => 1
            * @category Mathematical Functions | 11
            */`,
      ru: `/**
            * Находит минимальное число в массиве.
            *
            * @usage min(array)
            * @param array [array<number>] Массив чисел
            *
            * @example min([1, 5, 2, 8, 3]) => 1
            * @category Математические функции | 11
            */`,
      hash: 952094560,
    },
//#endregion min




//#region minus
    "minus": {
      en: `/**
            * Subtracts subsequent arguments from the first one.
            *
            * If only one argument is provided, its value is negated.
            * @usage minus(value, ...args)
            * @param value [number] Minuend
            * @param args [number] Subtrahends
            * @usage minus(value)
            * @param value [number] Value to negate
            * @example minus(1, 2, 1) => -2
            *          minus(5) => -5
            *          1 - 3 => -2
            *          -3 => -3
            * @category Math Operators | 2
            */`,
      ru: `/**
            * Вычитает из первого аргумента остальные.
            *
            * Если аргумент один, его значение инвертируется.
            * @usage minus(value, ...agrs)
            * @param value [number] Уменьшаемое
            * @param args [number] Вычитаемое
            * @usage minus(value)
            * @param value [number] Значение для инвертирования
            * @example minus(1, 2, 1) => -2
            *          minus(5) => -5
            *          1 - 3 => -2
            *          -3 => -3
            * @category Математические операторы | 2
            */`,
      hash: 1124790561,
    },
//#endregion minus




//#region moty
    "moty": {
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
      hash: 1455635007,
    },
//#endregion moty




//#region mul
    "mul": {
      en: `/**
            * Multiplies arguments.
            *
            * @usage multiply(...args)
            * @param args [number] Numbers to multiply
            * @example multiply(2, 3, 4) => 24
            *          2 * 3 * 4 => 24
            * @category Math Operators | 3
            */`,
      ru: `/**
            * Умножает аргументы.
            *
            * @usage multiply(...args)
            * @param args [number] Число для умножения
            * @example multiply(2, 3, 4) => 24
            *          2 * 3 * 4 => 24
            * @category Математические операторы | 3
            */`,
      hash: 1017606828,
    },
//#endregion mul




//#region ne
    "ne": {
      en: `/**
            * Checks that not all arguments are equal to the first one.
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Value to compare
            * @param args [any] Values to compare
            *
            * @example ne(1, 2, 3) => true
            *          ne(1, 1, 2) => true
            *          ne(1, 1, 1) => false
            *          1 != 1 => false
            *          1 != 2 => true
            *          1 != '1' => false
            * @category Logical Operators | 3
            */`,
      ru: `/**
            * Проверяет, что не все аргументы равны первому.
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Значение для сравнения
            * @param args [any] Значения для сравнения
            *
            * @example ne(1, 2, 3) => true
            *          ne(1, 1, 2) => true
            *          ne(1, 1, 1) => false
            *          1 != 1 => false
            *          1 != 2 => true
            *          1 != '1' => false
            * @category Логические операторы | 3
            */`,
      hash: 1640497342,
    },
//#endregion ne




//#region new
    "new": {
      en: `/**
            * Creates a new instance of a class
            *
            * @usage new(class, ...args)
            * @param class [function] Class
            * @param args [any] Constructor arguments
            *
            * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
            * @category Creating Objects | 1
            */`,
      ru: `/**
            * Создаёт новый экземпляр класса
            *
            * @usage new(class, ...args)
            * @param class [function] Класс
            * @param args [any] Аргументы конструктора
            *
            * @example new(Date, 2023, 0, 1) => Date object (2023-01-01)
            * @category Создание объектов | 1
            */`,
      hash: 686152304,
    },
//#endregion new




//#region not
    "not": {
      en: `/**
            * Logical NOT.
            *
            * @usage not(value)
            * @param value [any] Value to negate
            *
            * @example not true => false
            *          not(false) => true
            *          !0 => true
            * @category Logical Operators | 10
            */`,
      ru: `/**
            * Логическое отрицание.
            *
            * @usage not(value)
            * @param value [any] Значение для отрицания
            *
            * @example not true => false
            *          not(false) => true
            *          !0 => true
            * @category Базовые операторы | 10
            */`,
      hash: 472896977,
    },
//#endregion not




//#region now
    "now": {
      en: `/**
            * Returns current date in YYYY-MM-DD format
            *
            * @usage today()
            *
            * @example today() => "2024-01-15" (depends on current date)
            * @category Calendar Functions | 1
            */`,
      ru: `/**
            * Возвращает текущую дату в формате YYYY-MM-DD
            *
            * @usage today()
            *
            * @example today() => "2024-01-15" (зависит от текущей даты)
            * @category Календарные функции | 1
            */`,
      hash: 1886431714,
    },
//#endregion now




//#region nvl
    "nvl": {
      en: `/**
            * Returns the first non-null/undefined argument.
            *
            * If no arguments are provided, it returns null.
            *
            * If a suitable argument is found, it returns it and does not evaluate the remaining arguments.
            *
            * @usage nvl(...arg)
            * @param arg [any] Arguments
            *
            * @example nvl(null, undefined, 42) => 42
            *          nvl(1, 2, 3) => 1
            */`,
      ru: `/**
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
            */`,
      hash: 1449928402,
    },
//#endregion nvl




//#region omit
    "omit": {
      en: `/**
            * Returns a subset of a hash table or array without specified keys.
            *
            * @usage omit(hash, keys)
            * @param obj [Array | Object] Hash table or array to remove keys from.
            * @param keys [Array] List of keys to remove.
            *
            * @example omit({a = 1, b = 2, c = 3}, {a, c}) => {b: 2}
            *          omit({1, 2, 3, 4}, {0, 3}) => [2, 3]
            *          omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'}) => [2, 3]
            *          omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'id'}}) => [2, 3, 4, user: {name: 'John'}]
            *          omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'id'}, '1' = {'action'})) => [{name: 'John'}, {id: 2}] ## For positional arguments, a hash table must be created
            *          omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'id'})) => [{action: 'delete'}] ## To exclude the object fully, pass true
            *          omit({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'id'})) => [123, {action: 'delete'}] ## Removes the field if we expected a structure
            * @category Working with Hash Tables | 31
            */`,
      ru: `/**
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
            */`,
      hash: 988604879,
    },
//#endregion omit




//#region or
    "or": {
      en: `/**
            * Logical OR.
            *
            * Evaluates arguments sequentially, returning the first truthy value
            * or the last falsy value.
            *
            * Arguments after the first truthy value are not evaluated.
            * @usage or(...exprs)
            * @param exprs [boolean] Expressions
            *
            * @example or(5 > 3, 10 < 4) => true
            *          1 < 0 or false or 2 * 2 => 4
            * @category Logical Operators | 21
            */`,
      ru: `/**
            * Логическое ИЛИ.
            *
            * Вычисляет аргументы последовательно, возвращая первое истинное значение
            * или последнее ложное.
            *
            * Аргументы после первого истинного значения не вычисляются.
            * @usage or(...exprs)
            * @param exprs [boolean] Выражения
            *
            * @example or(5 > 3, 10 < 4) => true
            *          1 < 0 or false or 2 * 2 => 4
            * @category Логические операторы | 21
            */`,
      hash: 326174544,
    },
//#endregion or




//#region partition
    "partition": {
      en: `/**
            * Splits the array into parts of n elements.
            *
            * @usage partition(arr, n)
            * @param arr [array] Array
            * @param n [number] Number of elements in each part
            *
            * @example partition({1, 2, 3, 4, 5}, 2) => [[1, 2], [3, 4], [5]]
            * @category Working with Arrays | 71
            */`,
      ru: `/**
            * Разбивает массив на части по n элементов.
            *
            * @usage partition(arr, n)
            * @param arr [array] Массив
            * @param n [number] Количество элементов в каждой части
            *
            * @example partition({1, 2, 3, 4, 5}, 2) => [[1, 2], [3, 4], [5]]
            * @category Работа с массивами | 71
            */`,
      hash: 113265484,
    },
//#endregion partition




//#region pluck
    "pluck": {
      en: `/**
            * Extracts property value from each array element.
            *
            * @usage pluck(array, key)
            * @param array [array] Array of objects
            * @param key [string] Property key
            *
            * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
            * @category Working with Arrays | 95
            */`,
      ru: `/**
            * Извлекает значение свойства из каждого элемента массива.
            *
            * @usage pluck(array, key)
            * @param array [array] Массив объектов
            * @param key [string] Ключ свойства
            *
            * @example pluck({{a=1}, {a=2}}, "a") => [1, 2]
            * @category Работа с массивами | 95
            */`,
      hash: 411869938,
    },
//#endregion pluck




//#region pr_str
    "pr_str": {
      en: `/**
            * Converts values to JSON strings and joins with spaces.
            *
            * @usage pr_str(...args)
            * @param args [any] Values
            *
            * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
            * @category Type Conversion | 50
            */`,
      ru: `/**
            * Преобразует значения в JSON-строки и объединяет через пробел.
            *
            * @usage pr_str(...args)
            * @param args [any] Значения
            *
            * @example pr_str(1, 'a', {1, 2, 3}) => '1 "a" [1,2,3]'
            * @category Преобразование типов | 50
            */`,
      hash: 1428898934,
    },
//#endregion pr_str




//#region print
    "print": {
      en: `/**
            * Prints values to console (without JSON formatting).
            *
            * @usage print(...args)
            * @param args [any] Values to print
            *
            * @example print("Hello", "World") => Hello World
            *          print(1, 2, 3) => 1 2 3
            *          print({1,{1,{1,{1}}}}) => [ 1, [ 1, [ 1, [Array] ] ] ]
            * @category Output | 3
            */`,
      ru: `/**
            * Выводит значения в консоль (без JSON форматирования).
            *
            * @usage print(...args)
            * @param args [any] Значения для вывода
            *
            * @example print("Hello", "World") => Hello World
            *          print(1, 2, 3) => 1 2 3
            *          print({1,{1,{1,{1}}}}) => [ 1, [ 1, [ 1, [Array] ] ] ]
            * @category Вывод | 3
            */`,
      hash: 912747390,
    },
//#endregion print




//#region println
    "println": {
      en: `/**
            * Prints values to console. If the value is not a string, it is output as JSON.
            *
            * @usage println(...args)
            * @param args [any] Values to print
            *
            * @example println("Hello", "World") => Hello World
            *          println({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
            * @category Output | 1
            */`,
      ru: `/**
            * Выводит значения в консоль. В случае, если значение не является строкой, оно выводится как JSON.
            *
            * @usage println(...args)
            * @param args [any] Значения для вывода
            *
            * @example println("Hello", "World") => Hello World
            *          println({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
            * @category Вывод | 1
            */`,
      hash: 27216519,
    },
//#endregion println




//#region prn
    "prn": {
      en: `/**
            * Prints JSON representation of values to console. Strings are wrapped in double quotes.
            *
            * @usage prn(...args)
            * @param args [any] Values to print
            *        prn({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
            *
            * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
            * @category Output | 2
            */`,
      ru: `/**
            * Выводит JSON-представление значений в консоль. Строки оборачиваются в двойные кавычки.
            *
            * @usage prn(...args)
            * @param args [any] Значения для вывода
            *
            * @example prn(1, "a", {1, 2, 'c'}) => 1 "a" [1,2,"c"]
            *          prn({1,{1,{1,{1}}}}) => [1,[1,[1,[1]]]]
            * @category Вывод | 2
            */`,
      hash: 163245954,
    },
//#endregion prn




//#region property
    "property": {
      en: `/**
            * Gets or sets an object property.
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
            * @category Working with Variables | 20
            */`,
      ru: `/**
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
            */`,
      hash: 919889759,
    },
//#endregion property




//#region q
    "q": {
      en: `/**
            * Creates a string or retrieves the value of a variable.
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
            * @category 5
            */`,
      ru: `/**
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
            */`,
      hash: 1782123871,
    },
//#endregion q




//#region qoty
    "qoty": {
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
      hash: 874860358,
    },
//#endregion qoty




//#region rand
    "rand": {
      en: `/**
            * Returns a random number between 0 and 1.
            *
            * @usage rand()
            *
            * @example rand() => 0.123456789
            * @category Mathematical Functions | 1
            */`,
      ru: `/**
            * Возвращает случайное число от 0 до 1.
            *
            * @usage rand()
            *
            * @example rand() => 0.123456789
            * @category Математические функции | 1
            */`,
      hash: 1774352275,
    },
//#endregion rand




//#region range
    "range": {
      en: `/**
            * Returns an array of numbers in the range [start, end) with step.
            *
            * @usage range(end)
            * @param end [number] Ends the range
            *
            * @usage range(start, end)
            * @param start [number] Starts the range
            * @param end [number] Ends the range
            *
            * @usage range(start, end, step)
            * @param start [number] Starts the range
            * @param end [number] Ends the range
            * @param step [number] Step
            *
            * @example range(5) => [0, 1, 2, 3, 4]
            *          range(1, 5) => [1, 2, 3, 4]
            *          range(5, 1, -2) => [5, 3]
            * @category Creating Objects | 10
            */`,
      ru: `/**
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
            */`,
      hash: 1025851473,
    },
//#endregion range




//#region re_match
    "re_match": {
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
            * @category Working with strings | 20
            */`,
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
            *          re_match("test(aaa)", "\\\\((.*)\\\\)").0 => '(aaa)'
            *          re_match("test(aaa)", "\\\\((.*)\\\\)").1 => 'aaa'
            *          re_match("hello123", "[!]+") => null
            * @category Работа со строками | 20
            */`,
      hash: 878742887,
    },
//#endregion re_match




//#region reduce
    "reduce": {
      en: `/**
            * Applies a function to the elements of an array sequentially and accumulates the result.
            *
            * Function \`fn\` may take up to 2 arguments:
            * - \`aсс\` - accumulated result.
            * - \`val\` - value of the current element.
            *
            * If \`arr\` is not an array, \`init\` is returned.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage reduce(arr, fn, init)
            * @param arr [array] Array
            * @param fn [function] Function to apply
            * @param init [any] Initial value
            *
            * @example reduce(\\
            *          |  {1, 2, 3},\\
            *          |  add,\\
            *          |  0\\
            *          |) => 6
            * @category Working with Arrays | 45
            */`,
      ru: `/**
            * Применяет функцию к элементам массива поступательно и накапливает результат.
            *
            * Функция \`fn\` может принимать до 2-х аргументов:
            * - \`aсс\` - накопленный результат.
            * - \`val\` - значение текущего элемента.
            *
            * В случае, если \`arr\` не является массивом, возвращается \`init\`.
            *
            * В качестве функции можно использовать имя LPE функции.
            *
            * @usage reduce(arr, fn, init)
            * @param arr [array] Массив
            * @param fn [function] Функция для применения
            * @param init [any] Начальное значение
            *
            * @example reduce(\\
            *          |  {1, 2, 3},\\
            *          |  add,\\
            *          |  0\\
            *          |) => 6
            * @category Работа с массивами | 45
            */`,
      hash: 663203094,
    },
//#endregion reduce




//#region reduceArr
    "reduceArr": {
      en: `/**
            * Applies a function to the elements of an array sequentially and accumulates the result.
            *
            * Function \`fn\` may take up to 4 arguments:
            * - \`aсс\` - accumulated result.
            * - \`val\` - current element value.
            * - \`idx\` - current element index.
            * - \`arr\` - original array.
            *
            * If \`arr\` is not an array, \`init\` is returned.
            *
            * As a function, you can use the name of an LPE function.
            *
            * @usage reduce(arr, fn, init)
            * @param arr [array] Array
            * @param fn [function] Function to apply
            * @param init [any] Initial value
            *
            * @example reduce(\\
            *          |  {1, 2, 3},\\
            *          |  (acc, val) => acc + val,\\
            *          |  0\\
            *          |) => 6
            *          {1, 2, 3}.reduce((acc, val, idx) => acc + val * idx, 0) => 8
            * @category Working with arrays | 46
            */`,
      ru: `/**
            * Применяет функцию к элементам массива поступательно и накапливает результат.
            *
            * Функция \`fn\` может принимать до 4-х аргументов:
            * - \`aсс\` - накопленный результат
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
            *
            * В случае, если \`arr\` не является массивом, возвращается \`init\`.
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
            */`,
      hash: 2100606594,
    },
//#endregion reduceArr




//#region RegExp
    "RegExp": {
      en: `/**
            * Creates a regular expression.
            *
            * @usage regexp(pattern, flags)
            * @param pattern [string] Regular expression pattern
            * @param flags [string] Regular expression flags
            *
            * @example regexp("[0-9]+", "g") => /[0-9]+/g
            * @category Working with strings | 21
            */`,
      ru: `/**
            * Создаёт регулярное выражение.
            *
            * @usage regexp(pattern, flags)
            * @param pattern [string] Шаблон регулярного выражения
            * @param flags [string] Флаги регулярного выражения
            *
            * @example regexp("[0-9]+", "g") => /[0-9]+/g
            * @category Работа со строками  | 21
            */`,
      hash: 9488951,
    },
//#endregion RegExp




//#region rep
    "rep": {
      en: `/**
            * Evaluates string-AST and returns JSON representation of the result.
            *
            * @usage rep(str)
            * @param str [string] String with AST-tree
            *
            * @example rep('["+", 1, 2]') => "3"
            * @category Interpreter | 1
            */`,
      ru: `/**
            * Вычисляет AST в виде строки и возвращает JSON-представление результата.
            *
            * @usage rep(str)
            * @param str [string] Строка с AST-деревом
            *
            * @example rep('["+", 1, 2]') => "3"
            * @category Интерпретатор | 1
            */`,
      hash: 2040254940,
    },
//#endregion rep




//#region repeat
    "repeat": {
      en: `/**
            * Creates an array of repeated values n times.
            *
            * Every value is computed anew on each iteration.
            *
            * @usage repeat(n, val)
            * @param n [number] Number of repetitions
            * @param val [any] Value to repeat
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
            * @category Creating Objects | 15
            */`,
      ru: `/**
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
            */`,
      hash: 2081105240,
    },
//#endregion repeat




//#region reshape
    "reshape": {
      en: `/**
            * Creates an array of specified length, filling it with values cyclically.
            *
            * @usage reshape(len, ...values)
            * @param len [number] Array length
            * @param values [any] Values to fill with
            *
            * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
            * @category Creating Objects | 16
            */`,
      ru: `/**
            * Создаёт массив заданной длины, заполняя его значениями по циклу.
            *
            * @usage reshape(len, ...values)
            * @param len [number] Длина массива
            * @param values [any] Значения для заполнения
            *
            * @example reshape(5, 1, 2) => [1, 2, 1, 2, 1]
            * @category Создание объектов | 16
            */`,
      hash: 2114404977,
    },
//#endregion reshape




//#region resolve
    "resolve": {
      en: `/**
            * Get variable value.
            *
            * @usage resolve(name)
            * @param name [string] Variable name
            *
            * @example resolve(x) => value of variable x
            * @category Working with Variables | 15
            */`,
      ru: `/**
            * Получить значение переменной.
            *
            * @usage resolve(name)
            * @param name [string] Имя переменной
            *
            * @example resolve(x) => значение переменной x
            * @category Работа с переменными | 15
            */`,
      hash: 729238455,
    },
//#endregion resolve




//#region rest
    "rest": {
      en: `/**
            * Returns all array elements except the first.
            *
            * @usage rest(array)
            * @param array [array] Array
            *
            * @example rest({1, 2, 3}) => [2, 3]
            *          rest({1, 2, 3, a = 1}) => [2, 3] ## Excludes named arguments
            * @category Working with Arrays | 22
            */`,
      ru: `/**
            * Возвращает все элементы массива кроме первого.
            *
            * @usage rest(array)
            * @param array [array] Массив
            *
            * @example rest({1, 2, 3}) => [2, 3]
            *          rest({1, 2, 3, a = 1}) => [2, 3] ## Исключает именованые аргументы
            * @category Работа с массивами | 22
            */`,
      hash: 988753788,
    },
//#endregion rest




//#region return
    "return": {
      en: `/**
            * Interrupts the execution of the current function and returns the result.
            *
            * Works for [created functions]($func-fn), [let]($func-let) and [begin]($func-begin).
            *
            * @usage return(value)
            * @param value [any] Returned value.
            *
            * @example {1, 2, 3, 4}.map(x =>\\
            *          |  begin(\\
            *          |     if(x < 3, return(-1)),\\
            *          |     x * 2\\
            *          |  )\\
            *          |) => [-1, -1, 6, 8]
            * @category Execution Control | 15
            */`,
      ru: `/**
            * Прерывает выполнение текущей функции и возвращает результат.
            *
            * Работает для [созданных функций]($func-fn), [let]($func-let) и [begin]($func-begin).
            *
            * @usage return(value)
            * @param value [any] Возвращаемое значение.
            *
            * @example {1, 2, 3, 4}.map(x =>\\
            *          |  begin(\\
            *          |     if(x < 3, return(-1)),\\
            *          |     x * 2\\
            *          |  )\\
            *          |) => [-1, -1, 6, 8]
            * @category Управление выполнением | 15
            */`,
      hash: 380130529,
    },
//#endregion return




//#region reverse
    "reverse": {
      en: `/**
            * Reverses the array.
            *
            * @usage reverse(arr)
            * @param arr [array] Array
            *
            * @example reverse({1, 2, 3}) => [3, 2, 1]
            *          reverse({1, 2, 3, a = 10}) => [3, 2, 1, a: 10] ## Named values are preserved
            * @category Working with Arrays | 5
            */`,
      ru: `/**
            * Возвращает массив в обратном порядке.
            *
            * @usage reverse(arr)
            * @param arr [array] Массив
            *
            * @example reverse({1, 2, 3}) => [3, 2, 1]
            *          reverse({1, 2, 3, a = 10}) => [3, 2, 1, a: 10] ## Именованные значения сохраняются
            * @category Работа с массивами | 5
            */`,
      hash: 570154402,
    },
//#endregion reverse




//#region sample
    "sample": {
      en: `/**
            * Selects random elements from an array.
            *
            *
            * @usage sample(arr)
            * @param arr [Array] Array to sample
            *
            * @usage sample(arr, n)
            * @param arr [Array] Array to sample
            * @param n [int] Count of elements to sample
            *
            * @example sample({1, 2, 3, 4, 5}, 3) => [3, 1, 5]
            *          sample({1, 2, 3, 4, 5}) => 4
            *          sample({1, 2, 3, 4, 5}, 10) => {2, 5, 1, 4, 3}
            * @category Working with Arrays | 91
            */`,
      ru: `/**
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
            */`,
      hash: 1532412998,
    },
//#endregion sample




//#region select
    "select": {
      en: `/**
            * Returns a subset of a hash table or array by a list of keys.
            *
            * @usage select(obj, keys)
            * @param obj [Array | Object] Hash table or array to select keys from.
            * @param keys [Array | Object] List of keys to select.
            *
            * @example select({a = 1, b = 2, c = 3}, {a, c}) => {a: 1, c: 3}
            *          select({1, 2, 3, 4}, {0, 3}) => [1, 4]
            *          select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'}) => [1, 4, user: {id: 1, name: 'John'}]
            *          select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'name'}}) => [1, user: {name: 'John'}]
            *          select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'})) => [{name: 'John'}, {action: 'delete'}] ## For positional arguments, a hash table must be created
            *          select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'action'})) => [{id: 1, name: 'John'}, {action: 'delete'}] ## To take the object fully, pass true
            *          select({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'})) => [{action: 'delete'}] ## Removes the field if we expected a structure
            * @category Working with Hash Tables | 30
            */`,
      ru: `/**
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
            */`,
      hash: 1926445981,
    },
//#endregion select




//#region set
    "set": {
      en: `/**
            * Sets an object property value and returns the object.
            *
            * @usage set(obj, key, value)
            * @param obj [object] Object
            * @param key [string] Key
            * @param value [any] Value
            *
            * @example set(Hashmap, "a", 1) => {a: 1}
            *          set({}, 0, 1) => [1]
            * @category Working with Hash Tables | 11
            */`,
      ru: `/**
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
            */`,
      hash: 97319139,
    },
//#endregion set




//#region set_options
    "set_options": {
      en: `/**
            * Sets execution options for an expression
            *
            * @usage set_options(options, expr)
            * @param options [object|array] Options (object or array of key-value pairs)
            * @param expr [any] Expression to execute with options
            *
            * @category Interpreter | 100
            * @tags hidden
            */`,
      ru: `/**
            * Устанавливает опции выполнения для выражения.
            *
            * @usage set_options(options, expr)
            * @param options [object|array] Опции (объект или массив пар ключ-значение)
            * @param expr [any] Выражение для выполнения с опциями
            *
            * @category Интерпретатор | 100
            * @tags hidden
            */`,
      hash: 617945251,
    },
//#endregion set_options




//#region shuffle
    "shuffle": {
      en: `/**
            * Randomly shuffles the elements of an array.
            *
            * @usage shuffle(arr)
            * @param arr [Array] Array to shuffle
            *
            * @example shuffle({1, 2, 3, 4, 5})
            * @category Working with Arrays | 90
            */`,
      ru: `/**
            * Перемешивает элементы массива случайным образом.
            *
            * @usage shuffle(arr)
            * @param arr [Array] Массив для перемешивания
            *
            * @example shuffle({1, 2, 3, 4, 5})
            * @category Работа с массивами | 90
            */`,
      hash: 1032248163,
    },
//#endregion shuffle




//#region slice
    "slice": {
      en: `/**
            * Returns a slice of an array or a substring.
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
            * @category Working with Arrays | 10
            */`,
      ru: `/**
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
            */`,
      hash: 1294742411,
    },
//#endregion slice




//#region some
    "some": {
      en: `/**
            * Returns true, if at least one element of the array satisfies the condition.
            *
            * Function \`fn\` may take up to 3 arguments:
            * - \`val\` - value of the current element.
            * - \`idx\` - index of the current element.
            * - \`arr\` - the original array.
            *
            * As a function, you can use the name of the LPE function.
            *
            * @usage some(arr, fn)
            * @param arr [array] Array
            * @param fn [function] Function for checking
            *
            * @usage some(arr, value)
            * @param arr [array] Array
            * @param value [any] Value to check
            *
            * @example some({1, 2, 3}, x => x > 1) => true
            *          some({1, 2, 3}, 3) => true
            *          some({1, 2, 3}, 6) => false
            * @category Working with Arrays | 60
            */`,
      ru: `/**
            * Возвращает true, если хотя бы один элемент массива удовлетворяет условию.
            *
            * Функция \`fn\` может принимать до 3-х аргументов:
            * - \`val\` - значение текущего элемента.
            * - \`idx\` - индекс текущего элемента.
            * - \`arr\` - исходный массив.
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
            */`,
      hash: 124688058,
    },
//#endregion some




//#region sort
    "sort": {
      en: `/**
            * Sorts an array.
            *
            * Supports two call variants:
            * 1. Without comparison function (standard sorting).
            * 2. With comparison function for custom ordering.
            *
            * The function modifies the original array (sorts in place).
            *
            * For strings, standard sorting is based on Unicode codes (not lexicographic!).
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
            *          sort(\\
            *          |  { {1, 2}, {3, 1}, {2, 3} },\\
            *          |  (a, b) => first(a) - first(b)\\
            *          |) => [[1, 2], [2, 3], [3, 1]] (by first element)
            *
            *          sort(\\
            *          |  { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },\\
            *          |  (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)\\
            *          |) => [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
            * @category Working with Arrays | 50
            */`,
      ru: `/**
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
            *          sort(\\
            *          |  { {1, 2}, {3, 1}, {2, 3} },\\
            *          |  (a, b) => first(a) - first(b)\\
            *          |) => [[1, 2], [2, 3], [3, 1]] (по первому элементу)
            *
            *          sort(\\
            *          |  { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },\\
            *          |  (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)\\
            *          |) => [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
            * @category Работа с массивами | 50
            */`,
      hash: 1807416593,
    },
//#endregion sort




//#region sortBy
    "sortBy": {
      en: `/**
            * Sorts an array by a specified key.
            *
            * Function modifies the original array (sorts in place).
            *
            * For strings, standard sorting is based on Unicode codes (not lexicographic!).
            *
            * @usage sort(array, compareFn)
            * @param array [array] Array to sort
            * @param fn [function] Comparison function of format (obj) => value
            *
            * @example sortBy({{id = 1, name = "John"}, {id = 1, name = "Albert"}}, (obj) => obj.name) => [ { id: 1, name: 'Albert' }, { id: 1, name: 'John' } ]
            *
            * @category Working with Arrays | 51
            */`,
      ru: `/**
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
            */`,
      hash: 287248500,
    },
//#endregion sortBy




//#region split
    "split": {
      en: `/**
            * Splits a string by separator.
            *
            * @usage split(str, separator)
            * @param str [string] String
            * @param separator [string] Separator
            *
            * @example split("a,b,c", ",") => ["a", "b", "c"]
            * @category Working with strings | 10
            */`,
      ru: `/**
            * Разбивает строку по разделителю.
            *
            * @usage split(str, separator)
            * @param str [string] Строка
            * @param separator [string] Разделитель
            *
            * @example split("a,b,c", ",") => ["a", "b", "c"]
            * @category Работа со строками | 10
            */`,
      hash: 637778973,
    },
//#endregion split




//#region str
    "str": {
      en: `/**
            * Converts arguments to string and joins them.
            *
            * @usage str(...args)
            * @param args [any] Values to convert
            *
            * @example str(1, 2, 3) => "123"
            *          str("a", 1) => "a1"
            *          str("a", {1,2,3}) => "a[1,2,3]"
            *          str("a", null) => "anull"
            * @category Working with strings | 1
            */`,
      ru: `/**
            * Преобразует аргументы в строку и объединяет.
            *
            * @usage str(...args)
            * @param args [any] Значения для преобразования
            *
            * @example str(1, 2, 3) => "123"
            *          str("a", 1) => "a1"
            *          str("a", {1,2,3}) => "a[1,2,3]"
            *          str("a", null) => "anull"
            * @category Работа со строками | 1
            */`,
      hash: 780113748,
    },
//#endregion str




//#region strictEq
    "strictEq": {
      en: `/**
            * Checks if all arguments are strictly equal to the first argument.
            *
            * @usage strictEq(compared, ...agrs)
            * @param compared [any] Value to compare against
            * @param args [any] Values to compare
            * @example strictEq(1, 2, 1) => false
            *          strictEq(1, 1, 1, 1) => true
            *          1 === 3 => false
            *          1 === '1' => false
            * @category Logical Operators | 2
            */`,
      ru: `/**
            * Проверяет на строгое равенство всех аргументов первому аргументу.
            *
            * @usage strictEq(compared, ...agrs)
            * @param compared [any] Значение, с которым сравниваем
            * @param args [any] Значение, которое сравниваем
            * @example strictEq(1, 2, 1) => false
            *          strictEq(1, 1, 1, 1) => true
            *          1 === 3 => false
            *          1 === '1' => false
            * @category Логические операторы | 2
            */`,
      hash: 1315606304,
    },
//#endregion strictEq




//#region strictNe
    "strictNe": {
      en: `/**
            * Checks that not all arguments are strictly equal to the first one.
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Value to compare against
            * @param args [any] Values to compare against
            *
            * @example strictEq(1, 2, 3) => true
            *          strictEq(1, 1, 2) => true
            *          strictEq(1, 1, 1) => false
            *          strictEq(1, 1, '1') => true
            *          1 !== 1 => false
            *          1 !== 2 => true
            *          1 !== '1' => true
            * @category Logical Operators | 4
            */`,
      ru: `/**
            * Проверяет, что не все аргументы строго равны первому.
            *
            * @usage neq(compared, ...args)
            * @param compared [any] Значение для сравнения
            * @param args [any] Значения для сравнения
            *
            * @example strictEq(1, 2, 3) => true
            *          strictEq(1, 1, 2) => true
            *          strictEq(1, 1, 1) => false
            *          strictEq(1, 1, '1') => true
            *          1 !== 1 => false
            *          1 !== 2 => true
            *          1 !== '1' => true
            * @category Логические операторы | 4
            */`,
      hash: 1257361343,
    },
//#endregion strictNe




//#region threadFirst
    "threadFirst": {
      en: `/**
            * If the right argument is a function call, allows sequential calls (thread-first).
            *
            * Inserts the result of the left expression as the first argument in the next call.
            *
            * If the right argument is a numeric or string constant,
            * attempts to get the value from the left expression object using the right expression as key.
            *
            * To access array elements, use numeric indices in parentheses: a.(0), a.(1).(0), etc.
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
            *          {{1}}.(0).(0) => 1
            * @category 20
            */`,
      ru: `/**
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
            */`,
      hash: 2110505306,
    },
//#endregion threadFirst




//#region threadLast
    "threadLast": {
      en: `/**
            * Allows sequential calls (thread-last).
            *
            * Inserts the previous result as the last argument in the next call.
            *
            * @usage expression->>func(...args)
            * @param expression [any] Value to be inserted as the last argument in the function
            * @param func [function] Function to call
            * @param args [any] Additional function arguments
            *
            * @example fn({a}, a * 2)->>map({1, 2, 3}) => [2, 4, 6]
            *          ## Executed similarly to "map({1, 2, 3}, fn({a}, a * 2))"
            * @category 21
            */`,
      ru: `/**
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
            */`,
      hash: 489402072,
    },
//#endregion threadLast




//#region throw
    "throw": {
      en: `/**
            * Throws an exception.
            *
            * @usage throw(error)
            * @param error [string] Error to throw
            *
            * @example throw("Error message")
            * @category Exceptions | 1
            */`,
      ru: `/**
            * Выбрасывает исключение.
            *
            * @usage throw(error)
            * @param error [string] Ошибка для выбрасывания
            *
            * @example throw("Error message")
            * @category Исключения | 1
            */`,
      hash: 1182581091,
    },
//#endregion throw




//#region toAny
    "toAny": {
      en: `/**
            * Converts value to any (returns as is).
            *
            * @usage toAny(value)
            * @param value [any] Original value
            *
            * @example toAny(42) => 42
            *          toAny("hello") => "hello"
            * @category Type Conversion | 1
            */`,
      ru: `/**
            * Преобразует значение в any (возвращает как есть).
            *
            * @usage toAny(value)
            * @param value [any] Исходное значение
            *
            * @example toAny(42) => 42
            *          toAny("hello") => "hello"
            * @category Преобразование типов | 1
            */`,
      hash: 296726790,
    },
//#endregion toAny




//#region toBool
    "toBool": {
      en: `/**
            * Converts value to boolean type.
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
      ru: `/**
            * Преобразует значение в булевый тип.
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
      hash: 1656973934,
    },
//#endregion toBool




//#region toEnd
    "toEnd": {
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
      hash: 2020371437,
    },
//#endregion toEnd




//#region toFn
    "toFn": {
      en: `/**
            * Converts an expression to a function
            *
            * The \`$this$\` variable is a reference to the function itself.
            * This allows calling itself recursively.
            *
            * @usage toFn(body, ...argNames)
            * @param body [any] Function body
            * @param argNames [string] Function argument names
            *
            * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
            *
            *          factorial := toFn(if(x < 2, 1, x * $this$(x - 1)), x);\\
            *          factorial(5) => 120
            * @category Creating Objects | 31
            */`,
      ru: `/**
            * Преобразует выражение в функцию.
            *
            * В этой функции доступна переменная \`$this$\`, которая ссылается на саму функцию.
            * Это позволяет вызывать себя рекурсивно.
            *
            * @usage toFn(body, ...argNames)
            * @param body [any] Тело функции
            * @param argNames [string] Имена аргументов функции
            *
            * @example {1, 2, 3}.map(toFn(x * 2, x)) => [2, 4, 6]
            *
            *          factorial := toFn(if(x < 2, 1, x * $this$(x - 1)), x);\\
            *          factorial(5) => 120
            * @category Создание объектов | 31
            */`,
      hash: 1167565763,
    },
//#endregion toFn




//#region toInt
    "toInt": {
      en: `/**
            * Converts value to number.
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
      ru: `/**
            * Преобразует значение в число.
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
      hash: 1723605126,
    },
//#endregion toInt




//#region toStart
    "toStart": {
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
      hash: 352006318,
    },
//#endregion toStart




//#region toStr
    "toStr": {
      en: `/**
            * Converts value to string.
            *
            * @usage toStr(value)
            * @param value [any] Original value
            *
            * @example toStr(42) => "42"
            *          toStr(true) => "true"
            *          toStr({1, 2, 3}) => "1,2,3"
            * @category Type Conversion | 4
            */`,
      ru: `/**
            * Преобразует значение в строку.
            *
            * @usage toStr(value)
            * @param value [any] Исходное значение
            *
            * @example toStr(42) => "42"
            *          toStr(true) => "true"
            *          toStr({1, 2, 3}) => "1,2,3"
            * @category Преобразование типов | 4
            */`,
      hash: 1018889414,
    },
//#endregion toStr




//#region try
    "try": {
      en: `/**
            * Exception handling.
            *
            * @usage try(expr, errorName, catch)
            * @param expr [any] Expression to execute
            * @param errorName [string] Name to access the exception object
            * @param catch [any] Expression to execute on error
            *
            * @example try(throw("Error text"), ex, println("Error:", ex)) => Error: Error text
            * @category Exceptions | 2
            */`,
      ru: `/**
            * Обработка исключений.
            *
            * @usage try(expr, errorName, catch)
            * @param expr [any] Выражение для выполнения
            * @param errorName [string] Имя, по которому можно обратиться к объекту исключения
            * @param catch [any] Выражение для выполнения при ошибке
            *
            * @example try(throw("Текст ошибки"), ex, println("Ошибка:", ex)) => Ошибка: Текст ошибки
            * @category Исключения | 2
            */`,
      hash: 1930385362,
    },
//#endregion try




//#region tuple
    "tuple": {
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
            * @category Creating Objects | 4
            */`,
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
            *          (1, 2, 3) => [1, 2, 3] ## Перечисление в скобках является вызовом функции tuple
            * @category Создание объектов | 4
            */`,
      hash: 664995242,
    },
//#endregion tuple




//#region type
    "type": {
      en: `/**
            * Returns the type of a value.
            *
            * @usage type(value)
            * @param value [any] Value to check
            *
            * @example type(123) => "number"
            *          type("hello") => "string"
            * @category Type Checks | 2
            */`,
      ru: `/**
            * Возвращает тип значения.
            *
            * @usage type(value)
            * @param value [any] Проверяемое значение
            *
            * @example type(123) => "number"
            *          type("hello") => "string"
            * @category Проверки типов | 2
            */`,
      hash: 332772203,
    },
//#endregion type




//#region undef
    "undef": {
      en: `/**
            * Removes a variable from the current context and returns its value.
            *
            * @usage undef(name)
            * @param name [string] Variable name
            *
            * @example begin(\\
            *          |  x := 42,\\
            *          |  undef(x),\\
            *          |  x\\
            *          |) => undefined
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  undef(x)\\
            *          |) => 42 ## Function returns the value of the removed variable
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  let({{x, 12}}, prn(x), undef(x), prn(x)),\\
            *          |  x\\
            *          |) => 42
            *          ## First prints 12, then 42
            *          ## The local variable x is removed, but the global one remains
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  varName := "x",\\
            *          |  undef(_"varName"),\\
            *          |  x\\
            *          |) => undefined
            *          ## If the expression is passed, it is evaluated
            *          ## The variable with the name equal to the expression value is removed
            * @category Working with Variables | 11
            */`,
      ru: `/**
            * Удаляет переменную из текущего контекста и возвращает её значение.
            *
            * @usage undef(name)
            * @param name [string] Имя переменной
            *
            * @example begin(\\
            *          |  x := 42,\\
            *          |  undef(x),\\
            *          |  x\\
            *          |) => undefined
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  undef(x)\\
            *          |) => 42 ## Сама функция возвращает значение удаленной переменной
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  let({{x, 12}}, prn(x), undef(x), prn(x)),\\
            *          |  x\\
            *          |) => 42
            *          ## Напечатается сперва 12, затем 42
            *          ## При этом удалится локальная переменная x, а глобальная останется
            *
            *          begin(\\
            *          |  x := 42,\\
            *          |  varName := "x",\\
            *          |  undef(_"varName"),\\
            *          |  x\\
            *          |) => undefined
            *          ## Если передано выражение, то оно вычислится
            *          ## Удалится переменная, имя которой равно значению выражения
            * @category Работа с переменными | 11
            */`,
      hash: 1230170341,
    },
//#endregion undef




//#region union
    "union": {
      en: `/**
            * Returns the union of all passed arrays.
            *
            * @usage union(arrays)
            * @param arrays [Array<Array>] Arrays to union
            *
            * @usage union(arrays, fn)
            * @param arrays [Array<Array>] Arrays to union
            * @param fn [function] Comparison function
            *
            * @example union({{1, 2}, {3, 4}}) => [1, 2, 3, 4]
            * @category Working with Arrays | 81
            */`,
      ru: `/**
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
            */`,
      hash: 696705230,
    },
//#endregion union




//#region uniques
    "uniques": {
      en: `/**
            * Returns unique elements from arrays: elements that are present only in one of the arrays.
            *
            * @usage uniques(arrays)
            * @param arrays [Array<Array>] Arrays to find unique elements
            *
            * @usage uniques(arrays, fn)
            * @param arrays [Array<Array>] Arrays to find unique elements
            * @param fn [function] Comparison function
            *
            * @example uniques({{1, 2, 1}, {2, 3}}) => [1, 3]
            * @category Working with Arrays | 84
            */`,
      ru: `/**
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
            */`,
      hash: 1291678334,
    },
//#endregion uniques




//#region update_in
    "update_in": {
      en: `/**
            * Sets a value in a nested structure by key path using a function.
            *
            * Function accepts 2 arguments:
            * - \`value\`: current value.
            * - \`path\`: key path.
            *
            * If \`path\` is a regular expression, the object is not created if no key matches.
            *
            * Returns the updated structure.
            *
            * @usage update_in(obj, keys, fn)
            * @param obj [object|array] Target structure
            * @param keys [array] Path keys
            * @param fn [function] Update function
            *
            * @usage update_in(obj, keys, fn, regexpEnable)
            * @param obj [object|array] Target structure
            * @param keys [array] Path keys
            * @param fn [function] Update function
            * @param regexpEnable [boolean] Enable regular expressions
            *
            * @example update_in({a = {b = 10}}, {"a", "b"}, x => x + 1) => {a: {b: 11}}
            *          update_in({=}, {"a", "b"}, x => nvl(x, 0) + 1) => {a: {b: 1}}
            *          update_in({Ivan = {id = 1}, Bob = {id = 2}, Fred = {id = 3, name = "Freddy"}}, {"/.+/", "name"}, (x, path) => nvl(x, path.(0)), true) => {Ivan: {name: "Ivan", id: 1}, Bob: {name: "Bob", id: 2}, Fred: {name: "Freddy", id: 3}}
            * @category Working with Hash Tables | 42
            */`,
      ru: `/**
            * Устанавливает значение во вложенной структуре по пути ключей используя функцию.
            *
            * Функция принимает 2 аргумента:
            * - \`value\`: текущее значение.
            * - \`path\`: путь до ключа.
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
            */`,
      hash: 1917698144,
    },
//#endregion update_in




//#region vals
    "vals": {
      en: `/**
            * Returns an array of object values.
            *
            * @usage vals(obj)
            * @param obj [object] Object
            *
            * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
            * @category Working with Hash Tables | 16
            */`,
      ru: `/**
            * Возвращает массив значений объекта.
            *
            * @usage vals(obj)
            * @param obj [object] Объект
            *
            * @example vals({1, 2, a = 3, b = 4}) => [1, 2, 3, 4]
            * @category Работа с хэш-таблицами | 16
            */`,
      hash: 682095610,
    },
//#endregion vals




//#region vector
    "vector": {
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
            * @category Creating Objects | 2
            */`,
      ru: `/**
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
            */`,
      hash: 193838222,
    },
//#endregion vector




//#region words
    "words": {
      en: `/**
            * Splits a string into words.
            *
            * @usage words(str)
            * @param str [string] String
            *
            * @usage words(str, regexp)
            * @param str [string] String
            * @param regexp [string] Regular expression for defining a word
            *
            * @example words("a, b, c") => ["a", "b", "c"]
            *          words("a-1, test_2 - 322 __432__") => ["a-1", "test_2", "322", "__432__"]
            *          words("a-1, test_2 - 322 __432__", r"\\w+") => ["a", "1", "test_2", "322", "__432__"]
            * @category Working with strings | 11
            */`,
      ru: `/**
            * Разбивает строку на слова.
            *
            * @usage words(str)
            * @param str [string] Строка
            *
            * @usage words(str, regexp)
            * @param str [string] Строка
            * @param regexp [string] Регулярное выражение для определения слова
            *
            * @example words("a, b, c") => ["a", "b", "c"]
            *          words("a-1, test_2 - 322 __432__") => ["a-1", "test_2", "322", "__432__"]
            *          words("a-1, test_2 - 322 __432__", r"\\w+") => ["a", "1", "test_2", "322", "__432__"]
            * @category Работа со строками | 11
            */`,
      hash: 1055745355,
    },
//#endregion words




//#region woty
    "woty": {
      en: `/**
            * Returns week number in year (1-53)
            *
            * @usage woty(date)
            * @param date [string] Date
            *
            * @example woty("2024-01-15") => 3
            * @category Calendar Functions | 34
            */`,
      ru: `/**
            * Возвращает номер недели в году (1-53)
            *
            * @usage woty(date)
            * @param date [string] Дата
            *
            * @example woty("2024-01-15") => 3
            * @category Календарные функции | 34
            */`,
      hash: 1876405633,
    },
//#endregion woty




//#region year
    "year": {
      en: `/**
            * Returns year as number
            *
            * @usage year(date)
            * @param date [string] Date
            *
            * @example year("2024-01-15") => 2024
            * @category Calendar Functions | 30
            */`,
      ru: `/**
            * Возвращает год как число
            *
            * @usage year(date)
            * @param date [string] Дата
            *
            * @example year("2024-01-15") => 2024
            * @category Календарные функции | 30
            */`,
      hash: 1149522513,
    },
//#endregion year




//#region zip
    "zip": {
      en: `/**
            * Joins arrays by index into tuples.
            *
            * @usage zip(arrays)
            * @param arrays [Array<Array>] Arrays to zip
            *
            * @usage zip(arrays, minimize)
            * @param arrays [Array<Array>] Arrays to zip
            * @param minimize [boolean] Minimize result length to the length of the shortest input array
            *
            * @example zip({{1, 2}, {3, 4}}) => [[1, 3], [2, 4]]
            *          zip({{1, 2}, {3}}) => [[1, 3], [2, undefined]]
            *          zip({{1}, {2, 3}, {4}}) => [[1, 2, 4], [undefined, 3, undefined]]
            *          zip({{1}, {2, 3}, {4}}, true) => [[1, 2, 4]]
            * @category Creating Objects | 20
            */`,
      ru: `/**
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
            */`,
      hash: 245278541,
    },
//#endregion zip

},
//#endregion STDLIB



};
