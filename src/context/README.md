# Общие {#general}


## Функция nvl {#function-nvl}


Возвращает первый не-null/undefined аргумент.

При отсутствии аргументов возвращает null.

При нахождении подходящего аргумента возвращает его и не выполняет остальные аргументы.


<br />


**Алиасы**
- `coalesce`
- `nvl`


<br />


**Использование**

`nvl(...arg)`
* **arg** [*[Any](../typing#type-any)*] - Аргументы


<br />


**Пример**:
```javascript
nvl(null, undefined, 42)
// Результат: 42

nvl(1, 2, 3)
// Результат: 1




```


<br />





<br />





## Функция identity {#function-identity}


Возвращает переданный аргумент.


<br />


**Алиасы**
- `identity`
- `()`


<br />


**Использование**

`identity(value)`
* **value** [*[Any](../typing#type-any)*] - Значение


<br />


**Пример**:
```javascript
identity(5)
// Результат: 5

(1 + 2) * 3
// Результат: 9
// Круглые скобки являются вызовом этой функции
```


<br />





<br />





## Функция q {#function-q}


Создает строку или получает значение переменной.


<br />


**Алиасы**
- `q`
- `'`
- `"`


<br />


**Использование**

`"value"`
* **value** [*[String](../typing#type-string)*] - Значение

`_"variable"`
* **variable** [*[String](../typing#type-string)*] - Имя переменной


<br />


**Пример**:
```javascript
"hello"
// Результат: "hello"

begin(x := 12, _"x")
// Результат: 12

begin(x := 12, q("x", "_"))
// Результат: 12
```


<br />





<br />





## Функция apply {#function-apply}


Применяет функцию к списку аргументов.


<br />


**Использование**

`apply(fn, ...args)`
* **fn** [*[Function](../typing#type-function)*] - Функция
* **args** [*[Any](../typing#type-any)*] - Аргументы функции


<br />


**Пример**:
```javascript
apply(fn({a,b,c}, a + b * c), 1, 2, 3)
// Результат: 7
```


<br />





<br />





## Функция invoke {#function-invoke}


Вызов метода объекта.


<br />


**Алиасы**
- `_call_obj_meth_`
- `invoke`


<br />


**Использование**

`invoke(obj, method, ...args)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **method** [*[String](../typing#type-string)*] - Имя метода
* **args** [*[Any](../typing#type-any)*] - Аргументы метода


<br />


**Пример**:
```javascript
invoke({1, 2, 3}, "toString")
// Результат: "1,2,3"

invoke({1, 2, 3}, "push", 4)
// Результат: [1,2,3,4]

invoke({1, 2, 3}, concat, {4, 5, 6})
// Результат: [1,2,3,4,5,6]

invoke({1, 2, 3}, "con" + "cat", {4, 5, 6})
// Результат: [1,2,3,4,5,6]
```


<br />





<br />





## Функция threadFirst {#function-threadfirst}


Если правый аргумент - вызов функции, позволяет выполнять последовательные вызовы (thread-first).

Подставляет результат левого выражения первым аргументом в следующий вызов.

Если правый аргумент - числовая или строковая константа,
пытаемся взять значение объекта левого выражения по ключю правого выражения.

Для обращения к элементам массива используйте числовые индексы в круглых скобках: a.(0), a.(1).(0) и т.д.


<br />


**Алиасы**
- `threadFirst`
- `->`
- `.`


<br />


**Использование**

`explression.func(...args)`
* **explression** [*[Any](../typing#type-any)*] - Значение, подставляемое первым аргументом в функцию
* **func** [*[Function](../typing#type-function)*] - Вызываемая функция
* **args** [*[Any](../typing#type-any)*] - Остальные аргументы функции

`obj.key`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Объект из которого необходимо взять значение по ключу
* **key** [*[String](../typing#type-string)* | *[Number](../typing#type-number)*] - Ключ (строковая константа должна быть без кавычек)


<br />


**Примеры**:
```javascript
date.dateShift(-1, "m").toStart("m")
// Результат: Дата начала предыдущего месяца
```

```javascript
{1, 2, 3}.(1)
// Результат: 2

{a = 2, b = 3}.b
// Результат: 3

{{1}}.(0).(0)
// Результат: 1

"test".(2)
// Результат: "s"
```


<br />





<br />





## Функция threadLast {#function-threadlast}


Позволяет выполнять последовательных вызовов (thread-last).

Подставляет предыдущий результат последним аргументом в следующий вызов.


<br />


**Алиасы**
- `threadLast`
- `->>`
- `..`


<br />


**Использование**

`expression->>func(...args)`
* **explression** [*[Any](../typing#type-any)*] - Значение, подставляемое последним аргументом в функцию
* **func** [*[Function](../typing#type-function)*] - Вызываемая функция
* **args** [*[Any](../typing#type-any)*] - Остальные аргументы функции


<br />


**Пример**:
```javascript
fn({a}, a * 2)->>map({1, 2, 3})
// Результат: [2, 4, 6]
// Выполняется аналогично "map({1, 2, 3}, fn({a}, a * 2))"
```


<br />





<br />


# Базовые операторы {#basic-operators}


## Функция not {#function-not}


Логическое отрицание.


<br />


**Алиасы**
- `!`
- `not`


<br />


**Использование**

`not(value)`
* **value** [*[Any](../typing#type-any)*] - Значение для отрицания


<br />


**Пример**:
```javascript
not true
// Результат: false

not(false)
// Результат: true

!0
// Результат: true
```


<br />





<br />


# Математические операторы {#math-operators}


## Функция add {#function-add}


Складывает аргументы.


<br />


**Алиасы**
- `plus`
- `add`
- `+`


<br />


**Использование**

`add(...agrs)`
* **args** [*[Any](../typing#type-any)*] - Значение для сложения


<br />


**Пример**:
```javascript
add(1, 2, 1)
// Результат: 4

add(1, '1', 1, 1)
// Результат: '1111'

1 + 3
// Результат: 4
```


<br />





<br />





## Функция minus {#function-minus}


Вычитает из первого аргумента остальные.

Если аргумент один, его значение инвертируется.


<br />


**Алиасы**
- `subtract`
- `minus`
- `-`


<br />


**Использование**

`minus(value, ...agrs)`
* **value** [*[Number](../typing#type-number)*] - Уменьшаемое
* **args** [*[Number](../typing#type-number)*] - Вычитаемое

`minus(value)`
* **value** [*[Number](../typing#type-number)*] - Значение для инвертирования


<br />


**Пример**:
```javascript
minus(1, 2, 1)
// Результат: -2

minus(5)
// Результат: -5

1 - 3
// Результат: -2

-3
// Результат: -3
```


<br />





<br />





## Функция mul {#function-mul}


Умножает аргументы.


<br />


**Алиасы**
- `multiply`
- `mul`
- `*`


<br />


**Использование**

`multiply(...args)`
* **args** [*[Number](../typing#type-number)*] - Число для умножения


<br />


**Пример**:
```javascript
multiply(2, 3, 4)
// Результат: 24

2 * 3 * 4
// Результат: 24
```


<br />





<br />





## Функция div {#function-div}


Делит первый аргумент на остальные.

Если аргумент один, возвращает обратное число.


<br />


**Алиасы**
- `divide`
- `div`
- `/`


<br />


**Использование**

`div(value, ...args)`
* **value** [*[Number](../typing#type-number)*] - Делимое
* **args** [*[Number](../typing#type-number)*] - Делитель

`div(value)`
* **value** [*[Number](../typing#type-number)*] - Число для получения обратного значения


<br />


**Пример**:
```javascript
div(10, 2, 5)
// Результат: 1

div(5)
// Результат: 0.2

10 / 2 / 5
// Результат: 1
```


<br />





<br />


# Логические операторы {#logical-operators}


## Функция eq {#function-eq}


Проверяет на равенство всех аргументов первому аргументу


<br />


**Алиасы**
- `==`
- `equal`
- `eq`
- `=`


<br />


**Использование**

`eq(compared, ...agrs)`
* **compared** [*[Any](../typing#type-any)*] - Значение, с которым сравниваем
* **args** [*[Any](../typing#type-any)*] - Значение, которое сравниваем


<br />


**Пример**:
```javascript
eq(1, 2, 1)
// Результат: false

eq(1, 1, 1, 1)
// Результат: true

1 = 3
// Результат: false

1 = '1'
// Результат: true
```


<br />





<br />





## Функция strictEq {#function-stricteq}


Проверяет на строгое равенство всех аргументов первому аргументу.


<br />


**Алиасы**
- `strictEq`
- `===`


<br />


**Использование**

`strictEq(compared, ...agrs)`
* **compared** [*[Any](../typing#type-any)*] - Значение, с которым сравниваем
* **args** [*[Any](../typing#type-any)*] - Значение, которое сравниваем


<br />


**Пример**:
```javascript
strictEq(1, 2, 1)
// Результат: false

strictEq(1, 1, 1, 1)
// Результат: true

1 === 3
// Результат: false

1 === '1'
// Результат: false
```


<br />





<br />





## Функция ne {#function-ne}


Проверяет, что не все аргументы равны первому.


<br />


**Алиасы**
- `ne`
- `neq`
- `!=`


<br />


**Использование**

`neq(compared, ...args)`
* **compared** [*[Any](../typing#type-any)*] - Значение для сравнения
* **args** [*[Any](../typing#type-any)*] - Значения для сравнения


<br />


**Пример**:
```javascript
ne(1, 2, 3)
// Результат: true

ne(1, 1, 2)
// Результат: true

ne(1, 1, 1)
// Результат: false

1 != 1
// Результат: false

1 != 2
// Результат: true

1 != '1'
// Результат: false
```


<br />





<br />





## Функция strictNe {#function-strictne}


Проверяет, что не все аргументы строго равны первому.


<br />


**Алиасы**
- `strictNe`
- `!==`


<br />


**Использование**

`neq(compared, ...args)`
* **compared** [*[Any](../typing#type-any)*] - Значение для сравнения
* **args** [*[Any](../typing#type-any)*] - Значения для сравнения


<br />


**Пример**:
```javascript
strictEq(1, 2, 3)
// Результат: true

strictEq(1, 1, 2)
// Результат: true

strictEq(1, 1, 1)
// Результат: false

strictEq(1, 1, '1')
// Результат: true

1 !== 1
// Результат: false

1 !== 2
// Результат: true

1 !== '1'
// Результат: true
```


<br />





<br />





## Функция lt {#function-lt}


Проверяет, что каждый последующий аргумент больше предыдущего.


<br />


**Алиасы**
- `less`
- `lt`
- `<`


<br />


**Использование**

`lt(...args)`
* **args** [*[Number](../typing#type-number)*] - Число для сравнения


<br />


**Пример**:
```javascript
lt(1, 2, 3)
// Результат: true

lt(1, 3, 2)
// Результат: false

1 < 2
// Результат: true

1 < 2 < 3 < 4
// Результат: true

1 < 10 >= 3
// Результат: true
```


<br />





<br />





## Функция le {#function-le}


Проверяет, что каждый последующий аргумент больше или равен предыдущему.


<br />


**Алиасы**
- `lte`
- `le`
- `<=`


<br />


**Использование**

`le(...args)`
* **args** [*[Number](../typing#type-number)*] - Числа для сравнения


<br />


**Пример**:
```javascript
le(1, 2, 2, 3)
// Результат: true

le(1, 3, 2)
// Результат: false

1 <= 2
// Результат: true

1 <= 2 <= 2 <= 4
// Результат: true

1 <= 10 > 3
// Результат: true
```


<br />





<br />





## Функция gt {#function-gt}


Проверяет, что каждый последующий аргумент меньше предыдущего.


<br />


**Алиасы**
- `greater`
- `gt`
- `>`


<br />


**Использование**

`gt(...args)`
* **args** [*[Number](../typing#type-number)*] - Число для сравнения


<br />


**Пример**:
```javascript
gt(3, 2, 1)
// Результат: true

gt(3, 1, 2)
// Результат: false

3 > 2
// Результат: true

4 > 3 > 2 > 1
// Результат: true

10 > 4 < 6
// Результат: true
```


<br />





<br />





## Функция ge {#function-ge}


Проверяет, что каждый последующий аргумент меньше или равен предыдущему.


<br />


**Алиасы**
- `gte`
- `ge`
- `>=`


<br />


**Использование**

`ge(...args)`
* **args** [*[Number](../typing#type-number)*] - Числа для сравнения


<br />


**Пример**:
```javascript
ge(3, 2, 2, 1)
// Результат: true

ge(3, 1, 2)
// Результат: false

3 >= 2
// Результат: true

4 >= 2 >= 2 >= 1
// Результат: true

10 >= 4 < 6
// Результат: true
```


<br />





<br />





## Функция and {#function-and}


Логическое И.

Вычисляет аргументы последовательно, возвращая первое ложное значение
или последнее истинное.

Аргументы после первого ложного значения не вычисляются.


<br />


**Алиасы**
- `and`
- `&&`


<br />


**Использование**

`and(...exprs)`
* **exprs** [*[Boolean](../typing#type-boolean)*] - Выражения


<br />


**Пример**:
```javascript
and(5 > 3, 2 < 4)
// Результат: true

5 > 3 and 2 < 4 and 10
// Результат: 10
```


<br />





<br />





## Функция or {#function-or}


Логическое ИЛИ.

Вычисляет аргументы последовательно, возвращая первое истинное значение
или последнее ложное.

Аргументы после первого истинного значения не вычисляются.


<br />


**Алиасы**
- `or`
- `||`


<br />


**Использование**

`or(...exprs)`
* **exprs** [*[Boolean](../typing#type-boolean)*] - Выражения


<br />


**Пример**:
```javascript
or(5 > 3, 10 < 4)
// Результат: true

1 < 0 or false or 2 * 2
// Результат: 4
```


<br />





<br />





## Функция logicalAnd {#function-logicaland}


Логическое И. Возвращает true, если все выражения истинны.

Возвращает true или false.


<br />


**Алиасы**
- `logical_and`
- `logicalAnd`


<br />


**Использование**

`logicalAnd(...exprs)`
* **exprs** [*[Boolean](../typing#type-boolean)*] - Выражения для проверки


<br />





<br />





## Функция logicalOr {#function-logicalor}


Логическое ИЛИ. Возвращает true, если хотя бы одно из выражений истинно.

Возвращает true или false.


<br />


**Алиасы**
- `logical_or`
- `logicalOr`


<br />


**Использование**

`logicalOr(...exprs)`
* **exprs** [*[Boolean](../typing#type-boolean)*] - Выражения для проверки


<br />


**Пример**:
```javascript
logicalOr(0, 0, 0)


```


<br />





<br />


# Вывод {#output}


## Функция println {#function-println}


Выводит значения в консоль. В случае, если значение не является строкой, оно выводится как JSON.


<br />


**Использование**

`println(...args)`
* **args** [*[Any](../typing#type-any)*] - Значения для вывода


<br />


**Пример**:
```javascript
println("Hello", "World")
// Результат: Hello World

println({1,{1,{1,{1}}}})
// Результат: [1,[1,[1,[1]]]]
```


<br />





<br />





## Функция prn {#function-prn}


Выводит JSON-представление значений в консоль. Строки оборачиваются в двойные кавычки.


<br />


**Использование**

`prn(...args)`
* **args** [*[Any](../typing#type-any)*] - Значения для вывода


<br />


**Пример**:
```javascript
prn(1, "a", {1, 2, 'c'})
// Результат: 1 "a" [1,2,"c"]

prn({1,{1,{1,{1}}}})
// Результат: [1,[1,[1,[1]]]]
```


<br />





<br />





## Функция print {#function-print}


Выводит значения в консоль (без JSON форматирования).


<br />


**Использование**

`print(...args)`
* **args** [*[Any](../typing#type-any)*] - Значения для вывода


<br />


**Пример**:
```javascript
print("Hello", "World")
// Результат: Hello World

print(1, 2, 3)
// Результат: 1 2 3

print({1,{1,{1,{1}}}})
// Результат: [ 1, [ 1, [ 1, [Array] ] ] ]
```


<br />





<br />


# Управление выполнением {#execution-control}


## Функция begin {#function-begin}


Последовательно выполняет несколько выражений и возвращает результат последнего.


<br />


**Использование**

`begin(...exprs)`
* **exprs** [*[Any](../typing#type-any)*] - Выражения для выполнения


<br />


**Пример**:
```javascript
begin(println("Hello"), println("World"), 1 + 2)
// Результат: 3
// Выведет "Hello", "World" в консоль
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция if {#function-if}


Получение выражения по условию.


<br />


**Использование**

`if(cond1, then1, cond2, then2, ..., else)`
* **cond** [*[Boolean](../typing#type-boolean)*] - Условие
* **then** [*[Any](../typing#type-any)*] - Выражение, выполняемое если условие истинно
* **else** [*[Any](../typing#type-any)*] - Выражение, выполняемое если все условия ложны

`if(cond1, then1, cond2, then2, ...)`
* **cond** [*[Boolean](../typing#type-boolean)*] - Условие
* **then** [*[Any](../typing#type-any)*] - Выражение, выполняемое если условие истинно


<br />


**Пример**:
```javascript
if(5 > 3, "больше", 5 < 3, "меньше", "равны")
// Результат: "больше"

if(5 > 5, "больше", 5 < 5, "меньше", "равны")
// Результат: "равны"

if(5 > 5, "больше", 5 < 5, "меньше")
// Результат: undefined
```


<br />





<br />





## Функция do {#function-do}


Выполнение выражения в цикле до тех пор, пока условие выполняется.

Если условие отсутствует, выполняется единыжды.

Условие вычисляется после выполнения выражения.


<br />


**Использование**

`do(condition, expr)`
* **condition** [*[Boolean](../typing#type-boolean)*] - Условие
* **expr** [*[Any](../typing#type-any)*] - Выражения для выполнения

`do(expr)`
* **expr** [*[Any](../typing#type-any)*] - Выражения для выполнения единыжды


<br />


**Пример**:
```javascript
begin(x := 0,
       do(x < 10, x := x + 1)
 )
// Результат: 10
```


<br />





<br />





## Функция return {#function-return}


Прерывает выполнение текущей функции и возвращает результат.

Работает для [созданных функций](#function-fn), [let](#function-let) и [begin](#function-begin).


<br />


**Использование**

`return(value)`
* **value** [*[Any](../typing#type-any)*] - Возвращаемое значение.


<br />


**Пример**:
```javascript
{1, 2, 3, 4}.map(x =>
   begin(
      if(x < 3, return(-1)),
      x * 2
   )
 )
// Результат: [-1, -1, 6, 8]
```


<br />





<br />


# Исключения {#exceptions}


## Функция throw {#function-throw}


Выбрасывает исключение.


<br />


**Использование**

`throw(error)`
* **error** [*[String](../typing#type-string)*] - Ошибка для выбрасывания


<br />


**Пример**:
```javascript
throw("Error message")
```


<br />





<br />





## Функция try {#function-try}


Обработка исключений.


<br />


**Использование**

`try(expr, errorName, catch)`
* **expr** [*[Any](../typing#type-any)*] - Выражение для выполнения
* **errorName** [*[String](../typing#type-string)*] - Имя, по которому можно обратиться к объекту исключения
* **catch** [*[Any](../typing#type-any)*] - Выражение для выполнения при ошибке


<br />


**Пример**:
```javascript
try(throw("Текст ошибки"), ex, println("Ошибка:", ex))
// Результат: Ошибка: Текст ошибки
```


<br />





<br />


# Интерпретатор {#interpreter}


## Функция rep {#function-rep}


Вычисляет AST в виде строки и возвращает JSON-представление результата.


<br />


**Использование**

`rep(str)`
* **str** [*[String](../typing#type-string)*] - Строка с AST-деревом


<br />


**Пример**:
```javascript
rep('["+", 1, 2]')
// Результат: "3"
```


<br />





<br />





## Функция eval {#function-eval}


Вычисляет LPE-AST в контексте STDLIB. Другие контексты будут недоступны.


<br />


**Использование**

`eval(expr)`
* **expr** [*[AST](../typing#type-ast)*] - LPE-выражение


<br />


**Пример**:
```javascript
eval({"+", 1, 2})
// Результат: 3
```


<br />





<br />





## Функция eval_ast {#function-eval_ast}


Вычисляет LPE-AST в этом же контексте.


<br />


**Использование**

`eval_ast(expr)`
* **expr** [*[AST](../typing#type-ast)*] - AST-дерево


<br />


**Пример**:
```javascript
eval_ast({"+", 1, 2})
// Результат: 3
```


<br />





<br />





## Функция eval_lpe {#function-eval_lpe}


Вычисляет LPE-код из строки.


<br />


**Использование**

`eval_lpe(str)`
* **str** [*[String](../typing#type-string)*] - Строка с LPE-кодом


<br />


**Пример**:
```javascript
eval_lpe("1 + 2")
// Результат: 3
```


<br />





<br />


# Проверки типов {#type-checks}


## Функция isa {#function-isa}


Проверяет, является ли объект экземпляром класса.


<br />


**Использование**

`isa(obj, class)`
* **obj** [*[Any](../typing#type-any)*] - Проверяемый объект
* **class** [*[Any](../typing#type-any)*] - Класс


<br />


**Пример**:
```javascript
isa({1,2,3}, Array)
// Результат: true
```


<br />





<br />





## Функция type {#function-type}


Возвращает тип значения.


<br />


**Использование**

`type(value)`
* **value** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
type(123)
// Результат: "number"

type("hello")
// Результат: "string"
```


<br />





<br />





## Функция classOf {#function-classof}


Возвращает имя класса объекта.


<br />


**Использование**

`classOf(obj)`
* **obj** [*[Any](../typing#type-any)*] - Объект


<br />


**Пример**:
```javascript
classOf({})
// Результат: "[object Array]"
```


<br />





<br />





## Функция isNull {#function-isnull}


Проверяет, является ли значение null или undefined.


<br />


**Алиасы**
- `isNull`
- `null?`


<br />


**Использование**

`isNull(value)`
* **value** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isNull(null)
// Результат: true

isNull(undefined)
// Результат: true

isNull(0)
// Результат: false
```


<br />





<br />





## Функция isUndef {#function-isundef}


Проверяет, является ли значение undefined.


<br />


**Алиасы**
- `isUndefined`
- `isUndef`
- `undefined?`


<br />


**Использование**

`isUndef(value)`
* **value** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isUndef(null)
// Результат: false

isUndef(undefined)
// Результат: true

isUndef(0)
// Результат: false
```


<br />





<br />





## Функция isTrue {#function-istrue}


Проверяет, является ли значение true.


<br />


**Алиасы**
- `isTrue`
- `true?`


<br />


**Использование**

`isTrue(value)`
* **value** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isTrue(true)
// Результат: true

isTrue(1)
// Результат: false
```


<br />





<br />





## Функция isFalse {#function-isfalse}


Проверяет, является ли значение false.


<br />


**Алиасы**
- `isFalse`
- `false?`


<br />


**Использование**

`isFalse(value)`
* **value** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isFalse(false)
// Результат: true

isFalse(0)
// Результат: false
```


<br />





<br />





## Функция isBool {#function-isbool}


Проверяет, является ли аргумент булевым значением.


<br />


**Алиасы**
- `isBool`
- `bool?`


<br />


**Использование**

`isBool(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isBool(true)
// Результат: true

isBool(false)
// Результат: true

isBool(0)
// Результат: false

isBool("true")
// Результат: false
```


<br />





<br />





## Функция isNumber {#function-isnumber}


Проверяет, является ли аргумент числом.


<br />


**Алиасы**
- `isNumber`
- `number?`


<br />


**Использование**

`isNumber(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isNumber(42)
// Результат: true

isNumber(3.14)
// Результат: true

isNumber("42")
// Результат: false

isNumber(NaN)
// Результат: true (NaN является числом по typeof)
```


<br />





<br />





## Функция isNumberLike {#function-isnumberlike}


Проверяет, является ли аргумент числом или числом-строкой.


<br />


**Алиасы**
- `isNumberLike`
- `numberlike?`


<br />


**Использование**

`isNumberLike(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isNumberLike(42)
// Результат: true

isNumberLike("3.14")
// Результат: true

isNumberLike({})
// Результат: false
```


<br />





<br />





## Функция isString {#function-isstring}


Проверяет, является ли аргумент строкой.


<br />


**Алиасы**
- `isString`
- `string?`


<br />


**Использование**

`isString(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isString("hello")
// Результат: true

isString(123)
// Результат: false

isString({1, 2})
// Результат: false
```


<br />





<br />





## Функция isArray {#function-isarray}


Проверяет, является ли аргумент массивом.


<br />


**Алиасы**
- `isArray`
- `list?`


<br />


**Использование**

`isArray(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isArray({1, 2, 3})
// Результат: true

isArray({a = 1})
// Результат: false

isArray({1, 2, a = 1})
// Результат: true

isArray("hello")
// Результат: false
```


<br />





<br />





## Функция isHash {#function-ishash}


Проверяет, является ли аргумент хэш-таблицей (объектом, но не массивом и не null).


<br />


**Алиасы**
- `isHash`
- `hash?`


<br />


**Использование**

`isHash(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isHash({a = 1, b = 2})
// Результат: true

isHash(Hashmap)
// Результат: true

isHash({})
// Результат: false

isHash({1, 2, 3})
// Результат: false

isHash({1, 2, 3, a = 1})
// Результат: false

isHash(null)
// Результат: false

isHash("object")
// Результат: false
```


<br />





<br />





## Функция isObj {#function-isobj}


Проверяет, является ли аргумент хэш-таблицей или массивом (не null).


<br />


**Алиасы**
- `isObj`
- `obj?`


<br />


**Использование**

`isObj(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isObj({a = 1, b = 2})
// Результат: true

isObj(Hashmap)
// Результат: true

isObj({})
// Результат: true

isObj({1, 2, 3})
// Результат: true

isObj({1, 2, 3, a = 1})
// Результат: true

isObj(null)
// Результат: false

isObj("object")
// Результат: false
```


<br />





<br />





## Функция isFunction {#function-isfunction}


Проверяет, является ли аргумент функцией.


<br />


**Алиасы**
- `isFunction`
- `func?`


<br />


**Использование**

`isFunction(arg)`
* **arg** [*[Any](../typing#type-any)*] - Проверяемое значение


<br />


**Пример**:
```javascript
isFunction((a, b) => a + b)
// Результат: true

isFunction(fn({a, b}, a + b))
// Результат: true

isFunction(42)
// Результат: false
```


<br />





<br />


# Преобразование типов {#type-conversion}


## Функция toAny {#function-toany}


Преобразует значение в any (возвращает как есть).


<br />


**Алиасы**
- `toAny`
- `->any`


<br />


**Использование**

`toAny(value)`
* **value** [*[Any](../typing#type-any)*] - Исходное значение


<br />


**Пример**:
```javascript
toAny(42)
// Результат: 42

toAny("hello")
// Результат: "hello"
```


<br />





<br />





## Функция toBool {#function-tobool}


Преобразует значение в булевый тип.


<br />


**Алиасы**
- `toBool`
- `->bool`


<br />


**Использование**

`toBool(value)`
* **value** [*[Any](../typing#type-any)*] - Исходное значение


<br />


**Пример**:
```javascript
toBool(1)
// Результат: true

toBool(0)
// Результат: false

toBool("")
// Результат: false

toBool("text")
// Результат: true
```


<br />





<br />





## Функция toInt {#function-toint}


Преобразует значение в число.


<br />


**Алиасы**
- `toNumber`
- `toInt`
- `->int`


<br />


**Использование**

`toInt(value)`
* **value** [*[Any](../typing#type-any)*] - Исходное значение


<br />


**Пример**:
```javascript
toInt("42")
// Результат: 42

toInt(3.14)
// Результат: 3.14

toInt(true)
// Результат: 1

toInt(false)
// Результат: 0
```


<br />





<br />





## Функция toStr {#function-tostr}


Преобразует значение в строку.


<br />


**Алиасы**
- `toStr`
- `->str`


<br />


**Использование**

`toStr(value)`
* **value** [*[Any](../typing#type-any)*] - Исходное значение


<br />


**Пример**:
```javascript
toStr(42)
// Результат: "42"

toStr(true)
// Результат: "true"

toStr({1, 2, 3})
// Результат: "1,2,3"
```


<br />





<br />





## Функция jsonParse {#function-jsonparse}


Преобразует JSON-строку в объект.


<br />


**Алиасы**
- `json_parse`
- `jsonParse`
- `read-string`


<br />


**Использование**

`json_parse(str)`
* **str** [*[String](../typing#type-string)*] - JSON-строка


<br />


**Пример**:
```javascript
json_parse('{"a": 1}')
// Результат: {a: 1}
```


<br />





<br />





## Функция jsonStringify {#function-jsonstringify}


Преобразует JSON-объект в строку.


<br />


**Использование**

`jsonStringify(obj)`
* **obj** [*[Object](../typing#type-object)*] - Объект


<br />


**Пример**:
```javascript
jsonStringify({a = 1})
// Результат: "{"a": 1}"
```


<br />





<br />





## Функция pr_str {#function-pr_str}


Преобразует значения в JSON-строки и объединяет через пробел.


<br />


**Алиасы**
- `jsonJoin`
- `pr_str`


<br />


**Использование**

`pr_str(...args)`
* **args** [*[Any](../typing#type-any)*] - Значения


<br />


**Пример**:
```javascript
pr_str(1, 'a', {1, 2, 3})
// Результат: '1 "a" [1,2,3]'
```


<br />





<br />





## Функция astToString {#function-asttostring}


Преобразовать в строку AST дерево выражения.


<br />


**Алиасы**
- `astToString`
- `[]`


<br />


**Использование**

`astToString(value)`
* **value** [*[Any](../typing#type-any)*] - Значение


<br />


**Пример**:
```javascript
astToString(123)
// Результат: "123"

astToString({1,2,3,a=1,b=2})
// Результат: "vector,1,2,3,=,a,1,=,b,2"
```


<br />





<br />


# Работа с переменными {#working-with-variables}


## Функция assign {#function-assign}


Оператор присваивания. Возвращает значение переменной после присваивания.

Поддерживает присваивание в переменные и в свойства объектов/массивов.


<br />


**Алиасы**
- `assign`
- `:=`


<br />


**Использование**

`assign(lvalue, rvalue)`
* **lvalue** [*[Any](../typing#type-any)*] - Левая часть присваивания (переменная или путь к свойству)
* **rvalue** [*[Any](../typing#type-any)*] - Присваиваемое значение


<br />


**Пример**:
```javascript
assign(x, 10)
// Результат: 10

assign(obj.key, 20)
// Результат: 20
// obj ==> { key: 20 }

obj.a := (obj.b := 10)
// Результат: 10
// obj ==> { a: 10, b: 10 }
```


<br />





<br />





## Функция let {#function-let}


Создаёт локальные привязки переменных и выполняет выражения в их контексте.

В качестве объекта привязок может быть одно из:
- `Array<[VarName, Value]>` - список пар ключ-значение
- `Hash` - объект с ключами и значениями
- `Function` - функция для получения значения переменной

Функция принимает следующие аргументы:
- `key` - имя переменной или функции
- `value` - значение переменной, которое нужно ей установить. Если мы хотим получить значение, то value можно не передавать или передать `undefined`
- `options` - объект с дополнительными опциями

В случае, если в качестве `bindings` передается хэш-таблица, новый объект контекста не будет создан.
Если будут переприсвоены значения переменных, изменения будут отражены на переданном объекте.


<br />


**Использование**

`let(bindings, ...exprs)`
* **bindings** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)* | *[Function](../typing#type-function)*] - Список привязок или функция для получения значения переменной
* **exprs** [*[Any](../typing#type-any)*] - Выражения для выполнения в контексте привязок


<br />


**Пример**:
```javascript
let({{"x", 10}, {"y", 20}}, x + y)
// Результат: 30

let({{"name", "Alice"}}, println("Hello,", name), name)
// Результат: Alice
// Вывод в консоль: "Hello, Alice"

let({x = 10, y = 20}, x + y)
// Результат: 30

let((key) => if(key = "x", 10, key = "y", 20), x + y)
// Результат: 30
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция letseq {#function-letseq}


Создаёт локальные привязки переменных последовательно: каждая следующая привязка
видит предыдущие (в отличие от let, где привязки независимы).

Это форма, в которую компилируется VAR ... RETURN.


<br />


**Алиасы**
- `letstar`
- `letseq`
- `let*`


<br />


**Использование**

`let*(bindings, ...exprs)`
* **bindings** [*[Array](../typing#type-array)*] - Список привязок [[имя, значение], ...]
* **exprs** [*[Any](../typing#type-any)*] - Выражения для выполнения в контексте привязок


<br />


**Пример**:
```javascript
letseq({{"x", 10}, {"y", x * 2}}, y)
// Результат: 20
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция def {#function-def}


Определяет переменную в текущем контексте.


<br />


**Использование**

`def(name, value)`
* **name** [*[String](../typing#type-string)*] - Имя переменной
* **value** [*[Any](../typing#type-any)*] - Значение


<br />


**Примеры**:
```javascript
def(x, 42)
// Результат: 42
```

```javascript
begin(def(pi, 3.14159), 2*pi)
// Результат: 6.28318
```


<br />





<br />





## Функция undef {#function-undef}


Удаляет переменную из текущего контекста и возвращает её значение.


<br />


**Использование**

`undef(name)`
* **name** [*[String](../typing#type-string)*] - Имя переменной


<br />


**Пример**:
```javascript
begin(
   x := 42,
   undef(x),
   x
 )
// Результат: undefined



begin(
   x := 42,
   undef(x)
 )
// Результат: 42
// Сама функция возвращает значение удаленной переменной



begin(
   x := 42,
   let({{x, 12}}, prn(x), undef(x), prn(x)),
   x
 )
// Результат: 42
// Напечатается сперва 12, затем 42
// При этом удалится локальная переменная x, а глобальная останется



begin(
   x := 42,
   varName := "x",
   undef(_"varName"),
   x
 )
// Результат: undefined
// Если передано выражение, то оно вычислится
// Удалится переменная, имя которой равно значению выражения
```


<br />





<br />





## Функция resolve {#function-resolve}


Получить значение переменной.


<br />


**Использование**

`resolve(name)`
* **name** [*[String](../typing#type-string)*] - Имя переменной


<br />


**Пример**:
```javascript
resolve(x)
// Результат: значение переменной x
```


<br />





<br />





## Функция ctx {#function-ctx}


Получить объект с переменными.


<br />


**Использование**

`ctx(...key)`
* **key** [*[String](../typing#type-string)*] - Имя переменной


<br />


**Пример**:
```javascript
begin(x := 10,y := 4, ctx(x, y, z))
// Результат: { x: 10, y: 4, z: undefined }

ctx("x")
// Ошибка: в функции ctx нельзя использовать выражения
```


<br />





<br />





## Функция property {#function-property}


Получает или устанавливает свойство объекта.


<br />


**Алиасы**
- `property`
- `.-`


<br />


**Использование**

`property(obj, propName)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Объект
* **propName** [*[String](../typing#type-string)*] - Имя свойства

`property(obj, propName, value)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Объект
* **propName** [*[String](../typing#type-string)*] - Имя свойства
* **value** [*[Any](../typing#type-any)*] - Значение для установки


<br />


**Пример**:
```javascript
property({a = 1}, "a")
// Результат: 1

property({a = 1}, "b", 2)
// Результат: 2
// Значение объекта: { a:1, b:2 }
```


<br />





<br />


# Создание объектов {#creating-objects}


## Функция new {#function-new}


Создаёт новый экземпляр класса


<br />


**Использование**

`new(class, ...args)`
* **class** [*[Function](../typing#type-function)*] - Класс
* **args** [*[Any](../typing#type-any)*] - Аргументы конструктора


<br />


**Пример**:
```javascript
new(Date, 2023, 0, 1)
// Результат: Date object (2023-01-01)
```


<br />





<br />





## Функция hash {#function-hash}


Создаёт гибридный массив (kwargs array) из аргументов.

При передаче именнованных аргументов добавляет их как именованные свойства.

При отсутствии kwargs создаёт обычный массив.
При отсутствии args создаёт хэш-таблицу.


<br />


**Алиасы**
- `{`
- `vector`
- `tuple`
- `hash`


<br />


**Использование**

`vector(...args, ...kwargs)`
* **args** [*[Any](../typing#type-any)*] - Элементы позиционного массива
* **kwargs** [*[Any](../typing#type-any)*] - Именованные элементы объекта


<br />


**Пример**:
```javascript
vector(1, 2, 3)
// Результат: [1, 2, 3]

vector(1, 2, a = 3, b = 4)
// Результат: [1, 2, a: 3, b: 4]

vector(a = 3, b = 4)
// Результат: {a: 3, b: 4}
```


<br />





<br />





## Функция list {#function-list}


Создаёт список (массив) из аргументов


<br />


**Алиасы**
- `[`
- `array`
- `list`


<br />


**Использование**

`list(...args)`
* **args** [*[Any](../typing#type-any)*] - Элементы списка


<br />


**Пример**:
```javascript
list(1, 2, 3)
// Результат: [1, 2, 3]

list(1, 2, 3, a = 1, b = 2)
// Результат: [1, 2, 3, false, false]
```


<br />





<br />





## Функция makeHash {#function-makehash}


Создаёт хэш-таблицу из именованных аргументов.

Без аргументов возвращает пустая хэш-таблица.

Позиционные аргументы игнорируются — для смешанных структур используйте [vector](#function-hash).

В отличие от [hash](#function-hash), эта функция выполняет выражения, записанные в качестве имен ключей.


<br />


**Использование**

`makeHash(...kwargs)`
* **kwargs** [*[Any](../typing#type-any)*] - Именованные элементы


<br />


**Пример**:
```javascript
makeHash()
// Результат: {}

makeHash(a = 1, b = 2)
// Результат: {a: 1, b: 2}

makeHash(1+2 = 'test')
// Результат: {3: 'test'}
```


<br />





<br />





## Функция range {#function-range}


Возвращает массив чисел в диапазоне [start, end) с шагом step.


<br />


**Использование**

`range(end)`
* **end** [*[Number](../typing#type-number)*] - Конечное значение

`range(start, end)`
* **start** [*[Number](../typing#type-number)*] - Начальное значение
* **end** [*[Number](../typing#type-number)*] - Конечное значение

`range(start, end, step)`
* **start** [*[Number](../typing#type-number)*] - Начальное значение
* **end** [*[Number](../typing#type-number)*] - Конечное значение
* **step** [*[Number](../typing#type-number)*] - Шаг


<br />


**Пример**:
```javascript
range(5)
// Результат: [0, 1, 2, 3, 4]

range(1, 5)
// Результат: [1, 2, 3, 4]

range(5, 1, -2)
// Результат: [5, 3]
```


<br />





<br />





## Функция repeat {#function-repeat}


Создает массив из повторений значения n раз.

Каждое значение вычисляется заново на каждой итерации.


<br />


**Использование**

`repeat(n, val)`
* **n** [*[Number](../typing#type-number)*] - Количество повторений
* **val** [*[Any](../typing#type-any)*] - Значение для повторения


<br />


**Пример**:
```javascript
repeat(3, 5)
// Результат: [5, 5, 5]

begin(

x := 0,

repeat(2, x := x + 1)

)
// Результат: [1, 2]

repeat(3, x := nvl(_"x", 0) + 1)
// Результат: [1, 2, 3]

begin(

arr := repeat(2, {}),

arr.(0).(0) := 12,

arr

)
// Результат: [[12], []]
```


<br />





<br />





## Функция reshape {#function-reshape}


Создаёт массив заданной длины, заполняя его значениями по циклу.


<br />


**Алиасы**
- `reshape`
- `⍴`


<br />


**Использование**

`reshape(len, ...values)`
* **len** [*[Number](../typing#type-number)*] - Длина массива
* **values** [*[Any](../typing#type-any)*] - Значения для заполнения


<br />


**Пример**:
```javascript
reshape(5, 1, 2)
// Результат: [1, 2, 1, 2, 1]
```


<br />





<br />





## Функция zip {#function-zip}


Объединяет массивы по индексам в кортежи.


<br />


**Использование**

`zip(arrays)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для объединения

`zip(arrays, minimize)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для объединения
* **minimize** [*[Boolean](../typing#type-boolean)*] - Минимизировать длину результата до минимальной длины входных массивов


<br />


**Пример**:
```javascript
zip({{1, 2}, {3, 4}})
// Результат: [[1, 3], [2, 4]]

zip({{1, 2}, {3}})
// Результат: [[1, 3], [2, undefined]]

zip({{1}, {2, 3}, {4}})
// Результат: [[1, 2, 4], [undefined, 3, undefined]]

zip({{1}, {2, 3}, {4}}, true)
// Результат: [[1, 2, 4]]
```


<br />





<br />





## Функция fn {#function-fn}


Создаёт анонимную функцию.

В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
Это позволяет вызывать себя рекурсивно.


<br />


**Использование**

`fn(args, body)`
* **args** [*[Array](../typing#type-array)*] - Список аргументов
* **body** [*[Any](../typing#type-any)*] - Тело функции


<br />


**Пример**:
```javascript
fn({x}, x * x)
// Результат: функция возведения в квадрат

{1, 2, 3}.map(fn({x}, x * 2))
// Результат: [2, 4, 6]



factorial := fn({x}, if(x < 2, 1, x * $this$(x - 1)));
factorial(5)
// Результат: 120
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция toFn {#function-tofn}


Преобразует выражение в функцию.

В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
Это позволяет вызывать себя рекурсивно.


<br />


**Алиасы**
- `defFn`
- `toFn`
- `->fn`


<br />


**Использование**

`toFn(body, ...argNames)`
* **body** [*[Any](../typing#type-any)*] - Тело функции
* **argNames** [*[String](../typing#type-string)*] - Имена аргументов функции


<br />


**Пример**:
```javascript
{1, 2, 3}.map(toFn(x * 2, x))
// Результат: [2, 4, 6]



factorial := toFn(if(x < 2, 1, x * $this$(x - 1)), x);
factorial(5)
// Результат: 120
```


<br />





<br />





## Функция lambda {#function-lambda}


Создаёт функцию с альтернативным синтаксисом.

Поддерживает два варианта вызова:
1. С одним аргументом: arg => body.
2. С кортежем аргументов: (arg1, arg2 ...) => body.

В этой функции доступна переменная `$this$`, которая ссылается на саму функцию.
Это позволяет вызывать себя рекурсивно.


<br />


**Алиасы**
- `lambda`
- `=>`


<br />


**Использование**

`arg => body`
* **arg** [*[String](../typing#type-string)*] - Имя единственного аргумента
* **body** [*[Any](../typing#type-any)*] - Тело функции

`(...args) => body`
* **args** [*[String](../typing#type-string)*] - Имя аргумента
* **body** [*[Any](../typing#type-any)*] - Тело функции


<br />


**Пример**:
```javascript
{1, 2, 3}.map(x => x * 2)
// Результат: [2, 4, 6]

(x, y) => x + y
// Результат: Функция сложения

lambda((x, y), x + y)
// Результат: Функция сложения

x => if(x < 2, 1, x * $this$(x - 1))
// Результат: Рекурсивная функция факториала
```


<br />





<br />


# Работа с массивами {#working-with-arrays}


## Функция count {#function-count}


Возвращает длину массива или строки.


<br />


**Алиасы**
- `length`
- `count`


<br />


**Использование**

`count(obj)`
* **obj** [*[Array](../typing#type-array)* | *[String](../typing#type-string)*] - Объект для подсчёта длины


<br />


**Пример**:
```javascript
count({1, 2, 3})
// Результат: 3

count("hello")
// Результат: 5
```


<br />





<br />





## Функция empty {#function-empty}


Проверяет, является ли массив пустым


<br />


**Алиасы**
- `empty`
- `empty?`


<br />


**Использование**

`empty(array)`
* **array** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
empty({})
// Результат: true

empty({1, 2})
// Результат: false
```


<br />





<br />





## Функция reverse {#function-reverse}


Возвращает массив в обратном порядке.


<br />


**Использование**

`reverse(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
reverse({1, 2, 3})
// Результат: [3, 2, 1]

reverse({1, 2, 3, a = 10})
// Результат: [3, 2, 1, a: 10]
// Именованные значения сохраняются
```


<br />





<br />





## Функция slice {#function-slice}


Возвращает срез массива или подстроку.


<br />


**Использование**

`slice(arrayOrString, start)`
* **arrayOrString** [*[Array](../typing#type-array)* | *[String](../typing#type-string)*] - Массив или строка
* **start** [*[Number](../typing#type-number)*] - Начальный индекс

`slice(arrayOrString, start, end)`
* **arrayOrString** [*[Array](../typing#type-array)* | *[String](../typing#type-string)*] - Массив или строка
* **start** [*[Number](../typing#type-number)*] - Начальный индекс
* **end** [*[Number](../typing#type-number)*] - Конечный индекс


<br />


**Пример**:
```javascript
slice({1, 2, 3, 4}, 1, 3)
// Результат: [2, 3]

slice({1, 2, 3, 4}, 1)
// Результат: [2, 3, 4]

slice("hello world", 0, 5)
// Результат: "hello"

slice("hello", 1)
// Результат: "ello"
```


<br />





<br />





## Функция concat {#function-concat}


Конкатинирует массивы.


<br />


**Использование**

`concat(...arrays)`
* **arrays** [*[Array](../typing#type-array)*] - Массивы для объединения


<br />


**Пример**:
```javascript
concat({1, 2}, {3, 4})
// Результат: [1, 2, 3, 4]

concat({1, b = 1}, {3, a = 3})
// Результат: [1, 3]
// Исключает именованные элементы
```


<br />





<br />





## Функция first {#function-first}


Возвращает первый элемент массива.


<br />


**Использование**

`first(array)`
* **array** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
first({1, 2, 3})
// Результат: 1

first({})
// Результат: null
```


<br />





<br />





## Функция last {#function-last}


Возвращает последний элемент массива.


<br />


**Использование**

`last(array)`
* **array** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
last({1, 2, 3})
// Результат: 3

last({})
// Результат: undefined
```


<br />





<br />





## Функция rest {#function-rest}


Возвращает все элементы массива кроме первого.


<br />


**Использование**

`rest(array)`
* **array** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
rest({1, 2, 3})
// Результат: [2, 3]

rest({1, 2, 3, a = 1})
// Результат: [2, 3]
// Исключает именованые аргументы
```


<br />





<br />





## Функция cons {#function-cons}


Добавляет элемент в начало массива


<br />


**Алиасы**
- `pushStart`
- `cons`


<br />


**Использование**

`cons(element, array)`
* **element** [*[Any](../typing#type-any)*] - Элемент
* **array** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
cons(1, {2, 3})
// Результат: [1, 2, 3]
```


<br />





<br />





## Функция find {#function-find}


Возвращает первый элемент массива, удовлетворяющий условию.

Функция `fn` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`find(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для проверки

`find(arr, value)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **value** [*[Any](../typing#type-any)*] - Искомое значение


<br />


**Пример**:
```javascript
find({1, 2, 3}, x => x > 1)
// Результат: 2

find({1, 2, 3}, 2)
// Результат: 2

find({1, 2, 3}, 6)
// Результат: undefined
```


<br />





<br />





## Функция findIndex {#function-findindex}


Возвращает индекс первого элемента, удовлетворяющего условию.

Если элемент не найден, возвращает -1.

Функция `fn` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`findIndex(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для проверки

`findIndex(arr, value)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **value** [*[Any](../typing#type-any)*] - Искомое значение


<br />


**Пример**:
```javascript
findIndex({1, 2, 3}, x => x > 1)
// Результат: 1

findIndex({1, 2, 3}, 3)
// Результат: 2

findIndex({1, 2, 3}, 6)
// Результат: -1
```


<br />





<br />





## Функция map {#function-map}


Применяет функцию к каждому элементу массива.

Функция `fn` может принимать 1 аргумент:
- `val` - значение текущего элемента.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`map(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для применения


<br />


**Пример**:
```javascript
map({1, 2, 3}, fn({a}, a * 2))
// Результат: [2, 4, 6]

{1, 2, 3}.map(minus)
// Результат: [-1, -2, -3]
```


<br />





<br />





## Функция mapit {#function-mapit}


Преобразует массив с использованием переменных it и idx.

it - Текущий элемент массива.
idx - Индекс текущего элемента.


<br />


**Использование**

`mapit(array, transformation)`
* **array** [*[Array](../typing#type-array)*] - Исходный массив
* **transformation** [*[Any](../typing#type-any)*] - Выражение для получения преобразованного значения


<br />


**Примеры**:
```javascript
mapit({1, 2, 3}, it * 2)
// Результат: [2, 4, 6]
```

```javascript
mapit({"a", "b", "c"}, it + idx)
// Результат: ["a0", "b1", "c2"]
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция mapArr {#function-maparr}


Применяет функцию к каждому элементу массива.

Функция `fn` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`mapArr(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для применения


<br />


**Пример**:
```javascript
mapArr({1, 2, 3}, fn({a}, a * 2))
// Результат: [2, 4, 6]

{1, 2, 3}.mapArr({1, 2, 3}, (val, idx) => val * idx)
// Результат: [0, 2, 6]
```


<br />





<br />





## Функция filter {#function-filter}


Фильтрует массив по предикату.

Функция `predicate` может принимать 1 аргумент:
- `val` - значение текущего элемента.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`filter(arr, predicate)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **predicate** [*[Function](../typing#type-function)*] - Функция-предикат


<br />


**Пример**:
```javascript
filter({1, 2, 3, 4}, fn({a}, a > 2))
// Результат: [3, 4]
```


<br />





<br />





## Функция filterit {#function-filterit}


Фильтрует массив с использованием переменных it и idx.

it - Текущий элемент массива.
idx - Индекс текущего элемента.


<br />


**Использование**

`filterit(array, condition)`
* **array** [*[Array](../typing#type-array)*] - Исходный массив
* **condition** [*[Boolean](../typing#type-boolean)*] - Условие


<br />


**Пример**:
```javascript
filterit({1, 2, 3, 4}, it > 2 || idx = 0)
// Результат: [1, 3, 4]
```


<br />


> Функция перехватывает вызов функции [return()](#function-return)
{.is-info}





<br />





## Функция filterArr {#function-filterarr}


Фильтрует массив по предикату.

Функция `predicate` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`filterArr(arr, predicate)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **predicate** [*[Function](../typing#type-function)*] - Функция-предикат


<br />


**Пример**:
```javascript
filterArr({1, 2, 3, 4}, fn({val, idx}, idx < 3))
// Результат: [1, 2, 3]
```


<br />





<br />





## Функция reduce {#function-reduce}


Применяет функцию к элементам массива поступательно и накапливает результат.

Функция `fn` может принимать до 2-х аргументов:
- `aсс` - накопленный результат.
- `val` - значение текущего элемента.

В случае, если `arr` не является массивом, возвращается `init`.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`reduce(arr, fn, init)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для применения
* **init** [*[Any](../typing#type-any)*] - Начальное значение


<br />


**Пример**:
```javascript
reduce(
   {1, 2, 3},
   add,
   0
 )
// Результат: 6
```


<br />





<br />





## Функция reduceArr {#function-reducearr}


Применяет функцию к элементам массива поступательно и накапливает результат.

Функция `fn` может принимать до 4-х аргументов:
- `aсс` - накопленный результат
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В случае, если `arr` не является массивом, возвращается `init`.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`reduce(arr, fn, init)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для применения
* **init** [*[Any](../typing#type-any)*] - Начальное значение


<br />


**Пример**:
```javascript
reduce(

{1, 2, 3},

(acc, val)
// Результат: acc + val,

0

)
// Результат: 6

{1, 2, 3}.reduce((acc, val, idx) => acc + val * idx, 0)
// Результат: 8
```


<br />





<br />





## Функция sort {#function-sort}


Сортирует массив.

Поддерживает два варианта вызова:
1. Без функции сравнения (стандартная сортировка).
2. С функцией сравнения для пользовательского порядка.

Функция изменяет исходный массив (сортирует на месте).

Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!).


<br />


**Использование**

`sort(array)`
* **array** [*[Array](../typing#type-array)*] - Массив для сортировки

`sort(array, compareFn)`
* **array** [*[Array](../typing#type-array)*] - Массив для сортировки
* **compareFn** [*[Function](../typing#type-function)*] - Функция сравнения формата (a, b) => число
Если функция возвращает:
- отрицательное: a идёт перед b
- положительное: b идёт перед a
- 0: порядок не меняется


<br />


**Примеры**:
```javascript
sort({3, 1, 2})
// Результат: [1, 2, 3]

sort({5, 2, 8, 1})
// Результат: [1, 2, 5, 8]

sort({"banana", "apple", "cherry"})
// Результат: ["apple", "banana", "cherry"]


```

```javascript
sort({5, 2, 8, 1}, (a, b) => a - b)
// Результат: [1, 2, 5, 8]  (по возрастанию)

sort({5, 2, 8, 1}, (a, b) => b - a)
// Результат: [8, 5, 2, 1]  (по убыванию)



sort(
   { {1, 2}, {3, 1}, {2, 3} },
   (a, b) => first(a) - first(b)
 )
// Результат: [[1, 2], [2, 3], [3, 1]] (по первому элементу)



sort(
   { {name = 'Ben'}, {name = 'Alice'}, {name = 'Duncan'} },
   (a, b) => if(a.name > b.name, 1, a.name < b.name, -1, 0)
 )
// Результат: [ { name: 'Alice' }, { name: 'Ben' }, { name: 'Duncan' } ]
```


<br />





<br />





## Функция sortBy {#function-sortby}


Сортирует массив по указанному ключу.

Функция изменяет исходный массив (сортирует на месте).

Для строк стандартная сортировка основана на Unicode-кодах (не лексикографическая!).


<br />


**Использование**

`sort(array, compareFn)`
* **array** [*[Array](../typing#type-array)*] - Массив для сортировки
* **fn** [*[Function](../typing#type-function)*] - Функция сравнения формата (obj) => значение


<br />


**Пример**:
```javascript
sortBy({{id = 1, name = "John"}, {id = 1, name = "Albert"}}, (obj) => obj.name)
// Результат: [ { id: 1, name: 'Albert' }, { id: 1, name: 'John' } ]


```


<br />





<br />





## Функция some {#function-some}


Возвращает true, если хотя бы один элемент массива удовлетворяет условию.

Функция `fn` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`some(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для проверки

`some(arr, value)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **value** [*[Any](../typing#type-any)*] - Искомое значение


<br />


**Пример**:
```javascript
some({1, 2, 3}, x => x > 1)
// Результат: true

some({1, 2, 3}, 3)
// Результат: true

some({1, 2, 3}, 6)
// Результат: false
```


<br />





<br />





## Функция every {#function-every}


Возвращает true, если все элементы массива удовлетворяют условию.

Функция `fn` может принимать до 3-х аргументов:
- `val` - значение текущего элемента.
- `idx` - индекс текущего элемента.
- `arr` - исходный массив.

В качестве функции можно использовать имя LPE функции.


<br />


**Использование**

`every(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для проверки

`every(arr, value)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **value** [*[Any](../typing#type-any)*] - Искомое значение


<br />


**Пример**:
```javascript
every({1, 2, 3}, x => x > 1)
// Результат: false

every({1, 2, 3}, 3)
// Результат: false

every({1, 2, 3}, x => x > 0)
// Результат: true
```


<br />





<br />





## Функция flat {#function-flat}


Разглаживает массив до указанной глубины. Глубина по умолчанию равна 1.


<br />


**Использование**

`flat(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив

`flat(arr, depth)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **depth** [*[Number](../typing#type-number)*] - Глубина рекурсии


<br />


**Пример**:
```javascript
{{1, 2}, 3, {4, {5}}}.flat(1)
// Результат: [1, 2, 3, 4, [5]]

{{1, 2}, 3, {4, {5}}}.flat()
// Результат: [1, 2, 3, 4, [5]]

{{1, 2}, 3, {4, {5}}}.flat(2)
// Результат: [1, 2, 3, 4, 5]
```


<br />





<br />





## Функция counter {#function-counter}


Возвращает объект, содержащий частоты элементов массива.


<br />


**Алиасы**
- `counter`
- `frequencies`


<br />


**Использование**

`frequencies(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив


<br />


**Пример**:
```javascript
frequencies({1, 1, 2, 2, 2, 3})
// Результат: {1: 2, 2: 3, 3: 1}

"test words of the test".words().frequencies()
// Результат: { "test: 2, words: 1, of: 1, the: 1 }
```


<br />





<br />





## Функция partition {#function-partition}


Разбивает массив на части по n элементов.


<br />


**Использование**

`partition(arr, n)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **n** [*[Number](../typing#type-number)*] - Количество элементов в каждой части


<br />


**Пример**:
```javascript
partition({1, 2, 3, 4, 5}, 2)
// Результат: [[1, 2], [3, 4], [5]]
```


<br />





<br />





## Функция distinct {#function-distinct}


Возвращает массив без повторяющихся элементов с сохранением порядка.


<br />


**Использование**

`distinct(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив

`distinct(arr, fn)`
* **arr** [*[Array](../typing#type-array)*] - Массив
* **fn** [*[Function](../typing#type-function)*] - Функция для сравнения элементов


<br />


**Пример**:
```javascript
distinct({3, 1, 2, 3, 3, 2, 3})
// Результат: [3, 1, 2]

distinct({{a = 1}, {a = 2}, {a = 1}}, (a, b) => a.a = b.a)
// Результат: [{a: 1}, {a: 2}]
```


<br />





<br />





## Функция union {#function-union}


Возвращает объединенный массив из всех переданных массивов.


<br />


**Использование**

`union(arrays)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для объединения

`union(arrays, fn)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для объединения
* **fn** [*[Function](../typing#type-function)*] - Функция для сравнения элементов


<br />


**Пример**:
```javascript
union({{1, 2}, {3, 4}})
// Результат: [1, 2, 3, 4]
```


<br />





<br />





## Функция intersect {#function-intersect}


Возвращает пересечение всех переданных массивов.


<br />


**Использование**

`intersect(arrays)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для пересечения

`intersect(arrays, fn)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для пересечения
* **fn** [*[Function](../typing#type-function)*] - Функция для сравнения элементов


<br />


**Пример**:
```javascript
intersect({{1, 2}, {2, 3}})
// Результат: [2]

intersect({{1, 2, 2, 2}, {2, 3}, {1, 2}})
// Результат: [2]
```


<br />





<br />





## Функция difference {#function-difference}


Возвращает разницу между массивами.
Из первого массива извлекаются все элементы, которые содержатся в других массивах.

Оставляет повторяющиеся элементы.


<br />


**Использование**

`difference(arrays)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для вычитания

`difference(arrays, fn)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для вычитания
* **fn** [*[Function](../typing#type-function)*] - Функция для сравнения элементов


<br />


**Пример**:
```javascript
difference({{1, 2, 1}, {2, 3}})
// Результат: [1, 1]
```


<br />





<br />





## Функция uniques {#function-uniques}


Возвращает уникальные элементы из массивов: элементы, которые есть только в одном из массивов.


<br />


**Использование**

`uniques(arrays)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для поиска уникальных элементов

`uniques(arrays, fn)`
* **arrays** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массивы для поиска уникальных элементов
* **fn** [*[Function](../typing#type-function)*] - Функция для сравнения элементов


<br />


**Пример**:
```javascript
uniques({{1, 2, 1}, {2, 3}})
// Результат: [1, 3]
```


<br />





<br />





## Функция shuffle {#function-shuffle}


Перемешивает элементы массива случайным образом.


<br />


**Использование**

`shuffle(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив для перемешивания


<br />


**Пример**:
```javascript
shuffle({1, 2, 3, 4, 5})
```


<br />





<br />





## Функция sample {#function-sample}


Выбирает случайные элементы из массива.


<br />


**Использование**

`sample(arr)`
* **arr** [*[Array](../typing#type-array)*] - Массив для выборки

`sample(arr, n)`
* **arr** [*[Array](../typing#type-array)*] - Массив для выборки
* **n** [*[Number](../typing#type-number)*] - Количество элементов для выборки


<br />


**Пример**:
```javascript
sample({1, 2, 3, 4, 5}, 3)
// Результат: [3, 1, 5]

sample({1, 2, 3, 4, 5})
// Результат: 4

sample({1, 2, 3, 4, 5}, 10)
// Результат: {2, 5, 1, 4, 3}
```


<br />





<br />





## Функция pluck {#function-pluck}


Извлекает значение свойства из каждого элемента массива.


<br />


**Использование**

`pluck(array, key)`
* **array** [*[Array](../typing#type-array)*] - Массив объектов
* **key** [*[String](../typing#type-string)*] - Ключ свойства


<br />


**Пример**:
```javascript
pluck({{a=1}, {a=2}}, "a")
// Результат: [1, 2]
```


<br />





<br />





## Функция join {#function-join}


Объединяет элементы массива в строку через разделителью


<br />


**Использование**

`join(array, separator)`
* **array** [*[Array](../typing#type-array)*] - Массив
* **separator** [*[String](../typing#type-string)*] - Разделитель


<br />


**Пример**:
```javascript
join({1, 2, 3}, "-")
// Результат: "1-2-3"
```


<br />





<br />





## Функция joinObj {#function-joinobj}


Объединяет элементы массива или хэш-таблицы в строку через разделитель.

Для преобразования элементов в строку используется функция `fn`, принимающая 2 аргумента:
- `key`: ключ элемента (для массивов `key` равен индексу в виде строки).
- `value`: значение элемента.

Если функция не задана, в строку преобращуются значения элементов.


<br />


**Использование**

`joinObj(obj, separator)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Объект
* **separator** [*[String](../typing#type-string)*] - Разделитель

`joinObj(obj, separator, fn)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Объект
* **separator** [*[String](../typing#type-string)*] - Разделитель
* **fn** [*[Function](../typing#type-function)*] - Функция преобразования


<br />


**Пример**:
```javascript
joinObj({1, null, 3}, "-")
// Результат: "1-null-3"

joinObj({a: 12, b: "test"}, "; ", (k, v) => str(k, ": ", v))
// Результат: "a: 12; b: test"
```


<br />





<br />


# Работа с хэш-таблицами {#working-with-hash-tables}


## Функция containsKey {#function-containskey}


Проверяет, содержит ли объект указанное свойство.


<br />


**Алиасы**
- `containsKey`
- `contains?`


<br />


**Использование**

`contains(obj, key)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **key** [*[String](../typing#type-string)*] - Ключ


<br />


**Пример**:
```javascript
contains({a = 1}, "a")
// Результат: true
```


<br />





<br />





## Функция nth {#function-nth}


Получает значение свойства объекта.


<br />


**Алиасы**
- `nth`
- `get`


<br />


**Использование**

`get(obj, key)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **key** [*[String](../typing#type-string)* | *[Number](../typing#type-number)*] - Ключ

`get(obj, key, default)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **key** [*[String](../typing#type-string)* | *[Number](../typing#type-number)*] - Ключ
* **default** [*[Any](../typing#type-any)*] - Значение по умолчанию


<br />


**Пример**:
```javascript
get({a: 1}, "a")
// Результат: 1

get({a: 1}, "b")
// Результат: undefined

get({a: 1}, "b", "not found")
// Результат: "not found"
```


<br />





<br />





## Функция set {#function-set}


Устанавливает значение свойства объекта и возвращает объект.


<br />


**Использование**

`set(obj, key, value)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **key** [*[String](../typing#type-string)*] - Ключ
* **value** [*[Any](../typing#type-any)*] - Значение


<br />


**Пример**:
```javascript
set(Hashmap, "a", 1)
// Результат: {a: 1}

set({}, 0, 1)
// Результат: [1]
```


<br />





<br />





## Функция del {#function-del}


Удаляет свойство из объекта.


<br />


**Использование**

`del(obj, key)`
* **obj** [*[Object](../typing#type-object)*] - Объект
* **key** [*[String](../typing#type-string)*] - Ключ для удаления


<br />


**Пример**:
```javascript
del({"a"=1, "b"=2}, "a")
// Результат: true
```


<br />





<br />





## Функция keys {#function-keys}


Возвращает массив ключей объекта.


<br />


**Использование**

`keys(obj)`
* **obj** [*[Object](../typing#type-object)*] - Объект


<br />


**Пример**:
```javascript
keys({a = 1, b = 2})
// Результат: ["a", "b"]

keys((1, 2, a = 1, b = 2))
// Результат: [0, 1, "a", "b"]
```


<br />





<br />





## Функция vals {#function-vals}


Возвращает массив значений объекта.


<br />


**Алиасы**
- `values`
- `vals`


<br />


**Использование**

`vals(obj)`
* **obj** [*[Object](../typing#type-object)*] - Объект


<br />


**Пример**:
```javascript
vals({1, 2, a = 3, b = 4})
// Результат: [1, 2, 3, 4]
```


<br />





<br />





## Функция entries {#function-entries}


Возвращает массив пар [ключ, значение] для объекта.


<br />


**Использование**

`entries(obj)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Объект для получения пар ключ-значение.


<br />


**Пример**:
```javascript
entries({a = 1, b = 2})
// Результат: [['a', 1], ['b', 2]]
```


<br />





<br />





## Функция fromEntries {#function-fromentries}


Возвращает объект из массива пар [ключ, значение].


<br />


**Использование**

`fromEntries(obj)`
* **obj** [*[Array](../typing#type-array)<[Array](../typing#type-array)>*] - Массив пар [ключ, значение].


<br />


**Пример**:
```javascript
fromEntries({{'a', 1}, {'b', 2}})
// Результат: {a: 1, b: 2}
```


<br />





<br />





## Функция select {#function-select}


Возвращает подмножество хэш-таблицы по списку ключей.


<br />


**Использование**

`select(obj, keys)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Хэш-таблица или массив для выбора ключей
* **keys** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Список ключей


<br />


**Пример**:
```javascript
select({a = 1, b = 2, c = 3}, {a, c})
// Результат: {a: 1, c: 3}

select({1, 2, 3, 4}, {0, 3})
// Результат: [1, 4]

select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'})
// Результат: [1, 4, user: {id: 1, name: 'John'}]

select({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'name'}})
// Результат: [1, user: {name: 'John'}]

select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'}))
// Результат: [{name: 'John'}, {action: 'delete'}]
// Для настройки выборки позиционных аргументов необходимо создавать хэш-таблицу

select({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'action'}))
// Результат: [{id: 1, name: 'John'}, {action: 'delete'}]
// Чтобы взять объект полностью, передаем true

select({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'action'}))
// Результат: [{action: 'delete'}]
// Удаляет поле в случае, если мы ожидали структуру
```


<br />





<br />





## Функция omit {#function-omit}


Возвращает подмножество хэш-таблицы без указанных ключей.


<br />


**Использование**

`omit(hash, keys)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Хэш-таблица или массив для удаления ключей
* **keys** [*[Array](../typing#type-array)*] - Список ключей


<br />


**Пример**:
```javascript
omit({a = 1, b = 2, c = 3}, {a, c})
// Результат: {b: 2}

omit({1, 2, 3, 4}, {0, 3})
// Результат: [2, 3]

omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, 3, 'user'})
// Результат: [2, 3]

omit({1, 2, 3, 4, user = {id = 1, name = 'John'}}, {0, user = {'id'}})
// Результат: [2, 3, 4, user: {name: 'John'}]

omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = {'id'}, '1' = {'action'}))
// Результат: [{name: 'John'}, {id: 2}]
// Для настройки выборки позиционных аргументов необходимо создавать хэш-таблицу

omit({{id = 1, name = 'John'}, {id = 2, action = 'delete'}}, makeHash('0' = true, '1' = {'id'}))
// Результат: [{action: 'delete'}]
// Чтобы исключить объект полностью, передаем true

omit({123, {id = 2, action = 'delete'}}, makeHash('0' = {'name'}, '1' = {'id'}))
// Результат: [123, {action: 'delete'}]
// Оставляет поле в случае, если мы ожидали структуру
```


<br />





<br />





## Функция compact {#function-compact}


Удаляет все `null` и `undefined` значения из объекта.


<br />


**Использование**

`compact(obj, depth)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Объект для удаления значений.

`compact(obj, depth)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Объект для удаления значений.
* **depth** [*[Number](../typing#type-number)*] - Глубина рекурсии (по умолчанию 1).


<br />


**Пример**:
```javascript
compact({a = 1, b = null, c = undefined})
// Результат: {a: 1}

compact({a = 1, b = {c = null}}, 2)
// Результат: {a: 1, b: {}}

compact({a = 1, b = {c = null}}, 1)
// Результат: {a: 1, b: {с = null}}
```


<br />





<br />





## Функция get_in {#function-get_in}


Получает значение из вложенной структуры по пути ключей.

При отсутствии значения по ключу возвращает undefined.


<br />


**Использование**

`get_in(obj, keys)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Исходная структура
* **keys** [*[Array](../typing#type-array)*] - Массив ключей

`get_in(obj, ...key)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Исходная структура
* **key** [*[String](../typing#type-string)*] - Ключ


<br />


**Примеры**:
```javascript
get_in({a = {b = {c = 42}}}, {"a", "b"})
// Результат: { c: 42 }
```

```javascript
get_in({a = {b = {10, 11, 12}}}, a, b, 2)
// Результат: 12
```


<br />





<br />





## Функция assoc_in {#function-assoc_in}


Устанавливает значение во вложенной структуре по пути ключей.


<br />


**Использование**

`assoc_in(obj, keys, value)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Целевая структура
* **keys** [*[Array](../typing#type-array)*] - Путь ключей
* **value** [*[Any](../typing#type-any)*] - Устанавливаемое значение


<br />


**Пример**:
```javascript
begin(
   x := Hashmap,
   assoc_in(x, {"a", "b", "c"}, 42),
 )
// Результат: {c: 42}
// x == {a: {b: {c: 42}}}
```


<br />





<br />





## Функция update_in {#function-update_in}


Устанавливает значение во вложенной структуре по пути ключей используя функцию.

Функция принимает 2 аргумента:
- `value`: текущее значение.
- `path`: путь до ключа.

В случае использования регулярных выражений при отсутствии ключа попадающего в регулярное выражение, объект не будет создан.

Изменяет и возвращает переданную структуру.


<br />


**Использование**

`update_in(obj, keys, fn)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Целевая структура
* **keys** [*[Array](../typing#type-array)*] - Путь ключей
* **fn** [*[Function](../typing#type-function)*] - Функция обновления

`update_in(obj, keys, fn, regexpEnable)`
* **obj** [*[Object](../typing#type-object)* | *[Array](../typing#type-array)*] - Целевая структура
* **keys** [*[Array](../typing#type-array)*] - Путь ключей
* **fn** [*[Function](../typing#type-function)*] - Функция обновления
* **regexpEnable** [*[Boolean](../typing#type-boolean)*] - Включение регулярных выражений


<br />


**Пример**:
```javascript
update_in({a = {b = 10}}, {"a", "b"}, x => x + 1)
// Результат: {a: {b: 11}}

update_in({=}, {"a", "b"}, x => nvl(x, 0) + 1)
// Результат: {a: {b: 1}}

update_in({Ivan = {id = 1}, Bob = {id = 2}, Fred = {id = 3, name = "Freddy"}}, {"/.+/", "name"}, (x, path) => nvl(x, path.(0)), true)
// Результат: {Ivan: {name: "Ivan", id: 1}, Bob: {name: "Bob", id: 2}, Fred: {name: "Freddy", id: 3}}
```


<br />





<br />





## Функция cp {#function-cp}


Копирует значение из одной вложенной структуры в другую.

Работает как `assoc_in(to, get_in(from))`.


<br />


**Использование**

`cp(from, to)`
* **from** [*[Array](../typing#type-array)*] - Путь к источнику [source, key1, key2, ...]
* **to** [*[Array](../typing#type-array)*] - Путь к назначению [target, key1, key2, ...]


<br />


**Пример**:
```javascript
begin(
   x := { a = {b = 10} },
   y := { c = {d = 12} },
   cp({ x, "a", "b" }, { y, "c", "f"})
 )
// Результат: { d: 12, f: 10 }
// y = { c: { d: 12, f: 10 } }
```


<br />





<br />





## Функция merge {#function-merge}


Объединяет несколько хэш-таблиц в одну. При использовании массивов в качестве имен ключей используется индекс элемента.

При объединении массивов функция возвращает ассоциативный массив. Если массивов при объелинении нет, возвращается хэш-таблица.

Без указания функции слияния берет последний встреченный элемент.

Можно указать тип слияния, от которого зависят аргументы функции слияния (по умолчанию `sequence`):
- `sequence`: Слияние происходит последовательно. Функция слияния принимает 3 аргумента: имя ключа, предыдущее значение и следующее значение.
- `sequenceWithFirst`: Слияние происходит последовательно. Функция слияния принимает 4 аргумента: имя ключа, предыдущее значение, следующее значение и флаг, указывающий, является ли это первым вхождением этого ключа.
- `full`: Слияние происходит за одну итерацию. Функция слияния принимает 3 аргумента: имя ключа, массив значений для данного ключа и массив флагов, указывающий, присутствовали ли значения для данного ключа.


<br />


**Использование**

`merge(hashes)`
* **hashes** [*[Array](../typing#type-array)<[Object](../typing#type-object)>*] - Массив хэшей для объединения

`merge(hashes, fn)`
* **hashes** [*[Array](../typing#type-array)<[Object](../typing#type-object)>*] - Массив хэшей для объединения
* **fn** [*[Function](../typing#type-function)*] - Функция для слияния элементов

`merge(hashes, fn, type)`
* **hashes** [*[Array](../typing#type-array)<[Object](../typing#type-object)>*] - Массив хэшей для объединения
* **fn** [*[Function](../typing#type-function)*] - Функция для слияния элементов
* **type** [*'sequence'* | *'full'*] - Тип слияния


<br />


**Пример**:
```javascript
merge({{a = 1, c = 5}, {a = 3, b = 2}})
// Результат: {a: 3, c: 5, b: 2}

merge({{a = {4,5,6}}, {a = {1}, b = 2}})
// Результат: {a: [1]}, b: 2}
// Вложенные структуры не сливаются рекурсивно

merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old)
// Результат: {a: 1, b: 2}
// Взять первое встреченное значение

merge({{a = 1}, {a = 3, b = 2}}, (key, old, new) => old + new)
// Результат: {a: 4, b: 2}
// Сложить значения

merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals, 'full')
// Результат: {a: [1, 3], b: [undefined, 2]}

merge({{a = 1}, {a = 3, b = 2}}, (key, vals, has) => vals.filterArr((v, idx) => has.(idx)), 'full')
// Результат: {a: [1, 3], b: [2]}

merge({{a = 1}, {a = 3, b = 2}}, (key, old, new, first) => if(first, {new}, old.concat({new})), 'sequenceWithFirst')
// Результат: {a: [1, 3], b: [2]}

merge({{1, 2, 3}, { 5, 2, 10}}, (key, old, new) => old + new)
// Результат: [6, 4, 13]
// Слить массивы с позиционным сложением элементов
```


<br />





<br />





## Функция mergeDeep {#function-mergedeep}


Объединяет два хэш-таблицы в одну, при этом обходя все массивы и объекты.

Без указания функции слияния берет последний встреченный элемент.

Функция слияния принимает 3 аргумента:
- `path`: путь до ключа.
- `old`: значение из первой хэш-таблицы.
- `new`: значение из второй хэш-таблицы.


<br />


**Использование**

`merge(obj1, obj2, fn)`
* **obj1** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Первая хэш-таблица
* **obj2** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Вторая хэш-таблица
* **fn** [*[Function](../typing#type-function)*] - Функция для слияния элементов

`merge(obj1, obj2, fn, manualMerge)`
* **obj1** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Первая хэш-таблица
* **obj2** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Вторая хэш-таблица
* **fn** [*[Function](../typing#type-function)*] - Функция для слияния элементов
* **manualMerge** [*[Boolean](../typing#type-boolean)*] - Если true, то вызывать функцию слияния даже в том случае, если в одном из объектов значение не установлено


<br />


**Пример**:
```javascript
mergeDeep({a = 1, c = 5}, {a = 3, b = 2})
// Результат: {a: 3, c: 5, b: 2}

mergeDeep({a = {4,5,6}}, {a = {1}, b = 2})
// Результат: {a: [1, 5, 6]}, b: 2}
// Поэлементное слияние

mergeDeep({a = {4,5,6}}, {a = {1}, b = 2}, (path, old, new) => old + new)
// Результат: {a: [5, 5, 6]}, b: 2}
// Поэлементное суммирование
```


<br />





<br />





## Функция makeStruct {#function-makestruct}


Создает объект с заданной структурой. Модифицирует переданный объект для соответствия структуре (создает копию).

В структуре указаны умалчиваемые значения, которые будут использованы если их нет в from или если тип данных не соответствует ожидаемому.


<br />


**Использование**

`makeStruct(obj, struct)`
* **obj** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Объект, который необходимо заполнить
* **struct** [*[Array](../typing#type-array)* | *[Object](../typing#type-object)*] - Объект-схема структуры


<br />


**Пример**:
```javascript
{
   a = {1, 2, 3},
   b = {c = {}}
 }.makeStruct(
   { a = {b=0}, d = {0,0,0}}
 )
// Результат: { a: [ 1, 2, 3, b: 0 ], b: { c: [] }, d: [ 0, 0, 0 ] }

{1, 2, 3}.makeStruct({a=1, b = 2})
// Результат: [ 1, 2, 3, a: 1, b: 2 ]

{1, 2, 3}.makeStruct({0,0,0,0,0,0})
// Результат: [ 1, 2, 3, 0, 0, 0 ]
```


<br />





<br />


# Работа со строками {#working-with-strings}


## Функция str {#function-str}


Преобразует аргументы в строку и объединяет.


<br />


**Использование**

`str(...args)`
* **args** [*[Any](../typing#type-any)*] - Значения для преобразования


<br />


**Пример**:
```javascript
str(1, 2, 3)
// Результат: "123"

str("a", 1)
// Результат: "a1"

str("a", {1,2,3})
// Результат: "a[1,2,3]"

str("a", null)
// Результат: "anull"
```


<br />





<br />





## Функция lower {#function-lower}


Преобразует строку в нижний регистр.


<br />


**Использование**

`lower(str)`
* **str** [*[String](../typing#type-string)*] - Строка


<br />


**Пример**:
```javascript
lower("Hello")
// Результат: "hello"

"TeST".lower()
// Результат: "test"
```


<br />





<br />





## Функция upper {#function-upper}


Преобразует строку в верхний регистр.


<br />


**Использование**

`upper(str)`
* **str** [*[String](../typing#type-string)*] - Строка


<br />


**Пример**:
```javascript
upper("Hello")
// Результат: "HELLO"

"TesT".upper()
// Результат: "TEST"
```


<br />





<br />





## Функция split {#function-split}


Разбивает строку по разделителю.


<br />


**Использование**

`split(str, separator)`
* **str** [*[String](../typing#type-string)*] - Строка
* **separator** [*[String](../typing#type-string)*] - Разделитель


<br />


**Пример**:
```javascript
split("a,b,c", ",")
// Результат: ["a", "b", "c"]
```


<br />





<br />





## Функция words {#function-words}


Разбивает строку на слова.


<br />


**Использование**

`words(str)`
* **str** [*[String](../typing#type-string)*] - Строка

`words(str, regexp)`
* **str** [*[String](../typing#type-string)*] - Строка
* **regexp** [*[String](../typing#type-string)*] - Регулярное выражение для определения слова


<br />


**Пример**:
```javascript
words("a, b, c")
// Результат: ["a", "b", "c"]

words("a-1, test_2 - 322 __432__")
// Результат: ["a-1", "test_2", "322", "__432__"]

words("a-1, test_2 - 322 __432__", r"\w+")
// Результат: ["a", "1", "test_2", "322", "__432__"]
```


<br />





<br />





## Функция indexOf {#function-indexof}


Возвращает индекс первого вхождения подстроки в строку.


<br />


**Использование**

`indexOf(str, substr)`
* **str** [*[String](../typing#type-string)*] - Строка
* **substr** [*[String](../typing#type-string)*] - Подстрока

`indexOf(str, substr, start)`
* **str** [*[String](../typing#type-string)*] - Строка
* **substr** [*[String](../typing#type-string)*] - Подстрока
* **start** [*[Number](../typing#type-number)*] - Начальный индекс поиска


<br />


**Пример**:
```javascript
indexOf("hello", "e")
// Результат: 1

"hello".indexOf("e")
// Результат: 1

indexOf("hello", "world")
// Результат: -1

indexOf("test test", "st")
// Результат: 2

indexOf("test test", "st", 3)
// Результат: 7

indexOf("test test", "", 3)
// Результат: 3

indexOf("test test", "", 1000)
// Результат: 9
```


<br />





<br />





## Функция re_match {#function-re_match}


Проверяет соответствие строки регулярному выражению. Возвращает попадания.


<br />


**Использование**

`re_match(text, regexp)`
* **text** [*[String](../typing#type-string)*] - Текст
* **regexp** [*[String](../typing#type-string)*] - Регулярное выражение

`re_match(text, regexp, flags)`
* **text** [*[String](../typing#type-string)*] - Текст
* **regexp** [*[String](../typing#type-string)*] - Регулярное выражение
* **flags** [*[String](../typing#type-string)*] - Флаги


<br />


**Пример**:
```javascript
re_match("hello123", "[a-z]+", "g")
// Результат: ["hello"]

re_match("hello123", "[!]+", "g")
// Результат: null

re_match("hello123", "[a-z]+")
// Результат: ReMath object

re_match("test(aaa)", "\\((.*)\\)").0
// Результат: '(aaa)'

re_match("test(aaa)", r"\((.*)\)").1
// Результат: 'aaa'

re_match("hello123", "[!]+")
// Результат: null
```


<br />





<br />





## Функция RegExp {#function-regexp}


Создаёт регулярное выражение.


<br />


**Использование**

`regexp(pattern, flags)`
* **pattern** [*[String](../typing#type-string)*] - Шаблон регулярного выражения
* **flags** [*[String](../typing#type-string)*] - Флаги регулярного выражения


<br />


**Пример**:
```javascript
regexp("[0-9]+", "g")
// Результат: /[0-9]+/g
```


<br />





<br />





## Функция trim {#function-trim}


Удаляет пробелы и символы переноса строки в начале и конце строки.


<br />


**Использование**

`trim(str)`
* **str** [*[String](../typing#type-string)*] - Строка


<br />


**Пример**:
```javascript
trim("  hello  ")
// Результат: "hello"
```


<br />





<br />





## Функция trimStart {#function-trimstart}


Удаляет пробелы и символы переноса строки в начале строки.


<br />


**Использование**

`trimStart(str)`
* **str** [*[String](../typing#type-string)*] - Строка


<br />


**Пример**:
```javascript
trimStart("  hello  ")
// Результат: "hello  "
```


<br />





<br />





## Функция trimEnd {#function-trimend}


Удаляет пробелы и символы переноса строки в конце строки.


<br />


**Использование**

`trimEnd(str)`
* **str** [*[String](../typing#type-string)*] - Строка


<br />


**Пример**:
```javascript
trimEnd("  hello  ")
// Результат: "  hello"
```


<br />





<br />





## Функция padStart {#function-padstart}


Добавляет символы в начало строки до указанной длины.


<br />


**Использование**

`padStart(str, len, ch)`
* **str** [*[String](../typing#type-string)*] - Строка
* **len** [*[Number](../typing#type-number)*] - Длина строки
* **ch** [*[String](../typing#type-string)*] - Символ для добавления


<br />


**Пример**:
```javascript
padStart("hello", 10, " ")
// Результат: "     hello"

"10".padStart(5, "0")
// Результат: "00010"
```


<br />





<br />





## Функция padEnd {#function-padend}


Добавляет символы в начало строки до указанной длины.


<br />


**Использование**

`padEnd(str, len, ch)`
* **str** [*[String](../typing#type-string)*] - Строка
* **len** [*[Number](../typing#type-number)*] - Длина строки
* **ch** [*[String](../typing#type-string)*] - Символ для добавления


<br />


**Пример**:
```javascript
padEnd("hello", 10, " ")
// Результат: "hello     "

"10".padEnd(5, "0")
// Результат: "10000"
```


<br />





<br />





## Функция replace {#function-replace}


Заменяет первое вхождение подстроки в строке на указанню подстроку.


<br />


**Использование**

`replace(str, search, replacement)`
* **str** [*[String](../typing#type-string)*] - Строка
* **search** [*[String](../typing#type-string)*] - Подстрока или регулярное выражение для поиска
* **replacement** [*[String](../typing#type-string)*] - Подстрока для замены


<br />


**Пример**:
```javascript
replace("helloween", "e", "[e]")
// Результат: "h[e]lloween"

replace("helloween", RegExp(r"(e{2,})"), "[$1]")
// Результат: "hellow[ee]n"
```


<br />





<br />





## Функция replaceAll {#function-replaceall}


Заменяет все вхождения подстроки в строке на указанню подстроку.


<br />


**Использование**

`replaceAll(str, search, replacement)`
* **str** [*[String](../typing#type-string)*] - Строка
* **search** [*[String](../typing#type-string)*] - Подстрока или регулярное выражение с ключом "g" для поиска
* **replacement** [*[String](../typing#type-string)*] - Подстрока для замены


<br />


**Пример**:
```javascript
replaceAll("helloween", "e", "[e]")
// Результат: "h[e]llow[e][e]n"

replaceAll("helloween engeneer", RegExp(r"([en]+)", "g"), "[$1]")
// Результат: "h[e]llow[een] [en]g[enee]r"

replaceAll("+1 234 567 89-98", RegExp(r"\d", "g"), "*")
// Результат: "+* *** *** **-**"
```


<br />





<br />





## Функция startsWith {#function-startswith}


Проверяет, начинается ли строка с указанной подстроки.


<br />


**Использование**

`startsWith(str, search)`
* **str** [*[String](../typing#type-string)*] - Строка
* **search** [*[String](../typing#type-string)*] - Подстрока для поиска


<br />


**Пример**:
```javascript
startsWith("hello", "hell")
// Результат: true

startsWith("hello", "world")
// Результат: false
```


<br />





<br />





## Функция endsWith {#function-endswith}


Проверяет, заканчивается ли строка указанной подстрокой.


<br />


**Использование**

`endsWith(str, search)`
* **str** [*[String](../typing#type-string)*] - Строка
* **search** [*[String](../typing#type-string)*] - Подстрока для поиска


<br />


**Пример**:
```javascript
endsWith("hello", "lo")
// Результат: true

endsWith("hello", "world")
// Результат: false
```


<br />





<br />





## Функция includes {#function-includes}


Проверяет, содержит ли строка указанную подстроку.


<br />


**Использование**

`includes(str, search)`
* **str** [*[String](../typing#type-string)*] - Строка
* **search** [*[String](../typing#type-string)*] - Подстрока для поиска


<br />


**Пример**:
```javascript
includes("hello", "lo")
// Результат: true

includes("hello", "el")
// Результат: true

includes("hello", "world")
// Результат: flase
```


<br />





<br />


# Математические функции {#mathematical-functions}


## Функция rand {#function-rand}


Возвращает случайное число от 0 до 1.


<br />


**Использование**

`rand()`



<br />


**Пример**:
```javascript
rand()
// Результат: 0.123456789
```


<br />





<br />





## Функция max {#function-max}


Находит максимальное число в массиве.


<br />


**Использование**

`max(array)`
* **array** [*[Array](../typing#type-array)<[Number](../typing#type-number)>*] - Массив чисел


<br />


**Пример**:
```javascript
max({1, 5, 2, 8, 3})
// Результат: 8
```


<br />





<br />





## Функция min {#function-min}


Находит минимальное число в массиве.


<br />


**Использование**

`min(array)`
* **array** [*[Array](../typing#type-array)<[Number](../typing#type-number)>*] - Массив чисел


<br />


**Пример**:
```javascript
min([1, 5, 2, 8, 3])
// Результат: 1
```


<br />





<br />


# Календарные функции {#calendar-functions}


## Функция now {#function-now}


Возвращает текущую дату в формате YYYY-MM-DD


<br />


**Алиасы**
- `today`
- `now`


<br />


**Использование**

`today()`



<br />


**Пример**:
```javascript
today()
// Результат: "2024-01-15" (зависит от текущей даты)
```


<br />





<br />





## Функция toStart {#function-tostart}


Возвращает начало периода


<br />


**Использование**

`toStart(date, unit)`
* **date** [*[String](../typing#type-string)*] - Дата
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'

`toStart(unit)`
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Период (для текущей даты)


<br />


**Пример**:
```javascript
toStart("2024-01-15", 'm')
// Результат: "2024-01-01"

toStart("2024-01-15", 'q')
// Результат: "2024-01-01"

toStart('y')
// Результат: начало текущего года
```


<br />





<br />





## Функция toEnd {#function-toend}


Возвращает конец периода


<br />


**Использование**

`toEnd(date, unit)`
* **date** [*[String](../typing#type-string)*] - Дата
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'

`toEnd(unit)`
* **unit** [*[String](../typing#type-string)*] - Период (для текущей даты)


<br />


**Пример**:
```javascript
toEnd("2024-01-15", 'm')
// Результат: "2024-01-31"

toEnd("2024-01-15", 'q')
// Результат: "2024-03-31"

toEnd('y')
// Результат: конец текущего года
```


<br />





<br />





## Функция dateShift {#function-dateshift}


Сдвигает дату на указанное количество единиц времени

Поддерживает несколько вариантов вызова:
1. С указанием начальной даты: dateShift(start, delta, unit)
2. С начальной датой по умолчанию (сегодня): dateShift(delta, unit)
3. С массивом дат: dateShift([start1, start2], delta, unit) сдвигает обе даты


<br />


**Использование**

`dateShift(start, delta, unit)`
* **start** [*[String](../typing#type-string)*] - Начальная дата (YYYY-MM-DD)
* **delta** [*[Number](../typing#type-number)*] - Величина сдвига (положительная или отрицательная)
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения: 'd'/'day', 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'

`dateShift(delta, unit)`
* **delta** [*[Number](../typing#type-number)*] - Величина сдвига
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения

`dateShift([start1, start2], delta, unit)`
* **dates** [*[Array](../typing#type-array)*] - Массив дат
* **delta** [*[Number](../typing#type-number)*] - Величина сдвига
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения


<br />


**Пример**:
```javascript
dateShift("2024-01-15", 5, 'd')
// Результат: "2024-01-20"

dateShift("2024-01-15", -1, 'm')
// Результат: "2023-12-15"

dateShift(3, 'd')
// Результат: сдвигает сегодняшнюю дату на 3 дня

dateShift(["2024-01-01", "2024-01-31"], 1, 'm')
// Результат: ["2024-02-01", "2024-02-29"]
```


<br />





<br />





## Функция bound {#function-bound}


Возвращает границы периода (начало и конец)


<br />


**Использование**

`bound(date, unit)`
* **date** [*[String](../typing#type-string)*] - Дата (YYYY-MM-DD)
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Период: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'

`bound(unit)`
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Период (для текущей даты)


<br />


**Пример**:
```javascript
bound("2024-01-15", 'm')
// Результат: ["2024-01-01", "2024-01-31"]

bound("2024-01-15", 'q')
// Результат: ["2024-01-01", "2024-03-31"]

bound('w')
// Результат: границы текущей недели
```


<br />





<br />





## Функция extend {#function-extend}


Расширяет период, сдвигая конечную дату


<br />


**Использование**

`extend(start, delta, unit)`
* **start** [*[String](../typing#type-string)*] - Начальная дата
* **delta** [*[Number](../typing#type-number)*] - Величина расширения
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения: 'w'/'week', 'm'/'month', 'q'/'quarter', 'y'/'year'

`extend(delta, unit)`
* **delta** [*[Number](../typing#type-number)*] - Величина расширения
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения (от текущей даты)

`extend([start, end], delta, unit)`
* **period** [*[Array](../typing#type-array)*] - Период [начало, конец]
* **delta** [*[Number](../typing#type-number)*] - Величина расширения
* **unit** [*[DateUnit](../typing#type-dateunit)*] - Единица измерения


<br />


**Примеры**:
```javascript
extend("2024-01-01", 5, 'd')
// Результат: ["2024-01-01", "2024-01-06"]
```

```javascript
extend(["2024-01-01", "2024-01-31"], 1, 'm')
// Результат: ["2024-01-01", "2024-02-29"]
```


<br />





<br />





## Функция isoy {#function-isoy}


Возвращает год в формате ISO


<br />


**Использование**

`isoy(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
isoy("2024-01-15")
// Результат: "2024"
```


<br />





<br />





## Функция isoq {#function-isoq}


Возвращает квартал в формате ISO (YYYY-Qx)


<br />


**Использование**

`isoq(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
isoq("2024-01-15")
// Результат: "2024-Q1"

isoq("2024-05-15")
// Результат: "2024-Q2"
```


<br />





<br />





## Функция isom {#function-isom}


Возвращает месяц в формате ISO (YYYY-MM)


<br />


**Использование**

`isom(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
isom("2024-01-15")
// Результат: "2024-01"
```


<br />





<br />





## Функция isow {#function-isow}


Возвращает неделю в формате ISO (YYYY-Www)


<br />


**Использование**

`isow(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
isow("2024-01-15")
// Результат: "2024-W03"
```


<br />





<br />





## Функция isod {#function-isod}


Возвращает день года в формате ISO (YYYY-ddd)


<br />


**Использование**

`isod(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
isod("2024-01-15")
// Результат: "2024-015"
```


<br />





<br />





## Функция year {#function-year}


Возвращает год как число


<br />


**Использование**

`year(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
year("2024-01-15")
// Результат: 2024
```


<br />





<br />





## Функция hoty {#function-hoty}


Возвращает номер полугодия (1 или 2)


<br />


**Использование**

`hoty(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
hoty("2024-01-15")
// Результат: 1

hoty("2024-07-15")
// Результат: 2
```


<br />





<br />





## Функция qoty {#function-qoty}


Возвращает номер квартала (1-4)


<br />


**Использование**

`qoty(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
qoty("2024-01-15")
// Результат: 1

qoty("2024-10-15")
// Результат: 4
```


<br />





<br />





## Функция moty {#function-moty}


Возвращает номер месяца (1-12)


<br />


**Использование**

`moty(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
moty("2024-01-15")
// Результат: 1

moty("2024-12-15")
// Результат: 12
```


<br />





<br />





## Функция woty {#function-woty}


Возвращает номер недели в году (1-53)


<br />


**Использование**

`woty(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Пример**:
```javascript
woty("2024-01-15")
// Результат: 3
```


<br />





<br />





## Функция doty {#function-doty}


Возвращает номер дня в году (1-366)


<br />


**Использование**

`doty(date)`
* **date** [*[String](../typing#type-string)*] - Дата


<br />


**Примеры**:
```javascript
doty("2024-01-15")
// Результат: 15
```

```javascript
doty("2024-12-31")
// Результат: 366 (високосный год)
```


<br />
