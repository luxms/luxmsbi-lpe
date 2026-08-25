const assert = require('assert');
const lpe = require('../dist/lpe');


function deepEqual(actual, expected, msg) {
  _deepEqual(lpe.eval_lpe(actual), expected, msg || actual);
}

function deepEqualParsed(actual, expected, msg) {
  _deepEqual(lpe.eval_lisp(actual), expected, msg || String(actual));
}

function strictEqual(actual, expected, msg) {
  _strictEqual(lpe.eval_lpe(actual), expected, msg);
}

function strictEqualParsed(actual, expected, msg) {
  _strictEqual(lpe.eval_lisp(actual), expected, msg);
}

function ok(actual, msg) {
  _ok(lpe.eval_lpe(actual), msg);
}

function okParsed(actual, msg) {
  _ok(lpe.eval_lisp(actual), msg);
}


function _deepEqual(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg);
}

function _strictEqual(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
}

function _ok(value, msg) {
  assert.ok(value, msg);
}

/* ============================================================
   Полный набор тестов LPE
   ============================================================ */
describe('LPE Full Test Suite', function() {

  // ==========================================================
  // 1. Константы и базовые значения
  // ==========================================================
  describe('Constants & Basic Values', () => {
    it('boolean constants', () => {
      strictEqualParsed('#t', true);
      strictEqualParsed('#f', false);
      strictEqual('true', true);
      strictEqual('false', false);
    });

    it('null / undefined constants', () => {
      strictEqual('NIL', null);
      strictEqual('null', null);
      strictEqual('undefined', undefined);
    });

    it('global constructors', () => {
      strictEqual('Array', Array);
      strictEqual('Object', Object);
      strictEqual('Date', Date);
      strictEqual('JSON', JSON);
      deepEqual('Hashmap', {});
      deepEqual('Hashmap.a := 123; Hashmap', {});
    });
  });



  // ==========================================================
  // 2. Логические операторы
  // ==========================================================
  describe('Logical Operators', () => {
    describe('eq / = / equal / ==', () => {
      it('равенство с приведением типов', () => {
        strictEqual('eq(1, 1, 1)', true);
        strictEqual('eq(1, "1", 1, 1)', true);
        strictEqual('1 = "1"', true);
        strictEqual('false = {}', true);
        strictEqual('eq(false, {}, 0, "")', true);
        strictEqual('undefined = null', true);
      });
      it('распознаёт неравенство', () => {
        strictEqual('eq(1, 2, 1)', false);
        strictEqual('1 = 3', false);
        strictEqual('false = undefined', false);
        strictEqual('false = null', false);
        strictEqual('false = {=}', false);
      });
    });

    describe('strictEq / ===', () => {
      it('строгое равенство', () => {
        strictEqual('strictEq(1, 1, 1)', true);
        strictEqual('1 === "1"', false);
        strictEqual('false === {}', false);
        strictEqual('false === ""', false);
        strictEqual('false === 0', false);
        strictEqual('{} === ""', false);
        strictEqual('{} === 0', false);
        strictEqual('"" === 0', false);
      });
    });

    describe('strictNe / !==', () => {
      it('строгое равенство', () => {
        strictEqual('strictNe(1, 1, 1)', false);
        strictEqual('strictNe(1, 1, "1")', true);
        strictEqual('1 !== "1"', true);
        strictEqual('false !== {}', true);
        strictEqual('false !== ""', true);
        strictEqual('false !== 0', true);
        strictEqual('{} !== ""', true);
        strictEqual('{} !== 0', true);
        strictEqual('"" !== 0', true);
      });
    });

    describe('neq / != / ne', () => {
      it('отрицание равенства', () => {
        strictEqual('ne(1, 2, 3)', true);
        strictEqual('1 != 2', true);
        strictEqual('1 != 1', false);
        strictEqual('1 != "1"', false);
        strictEqual('false != {}', false);
        strictEqual('false != ""', false);
        strictEqual('false != 0', false);
        strictEqual('{} != ""', false);
        strictEqual('{} != 0', false);
        strictEqual('"" != 0', false);
      });
    });

    describe('lt / <', () => {
      it('возрастающая последовательность', () => {
        strictEqual('lt(1, 2, 3)', true);
        strictEqual('1 < 2', true);
        strictEqual('1 < 2 < 3 < 4 < 5', true);
        strictEqual('1 < 2 < 3 < 3 < 5', false);
        strictEqual('lt(1, 3, 2)', false);
      });
    });

    describe('le / <=', () => {
      it('нестрогое возрастание', () => {
        strictEqual('le(1, 2, 2, 3)', true);
        strictEqual('1 <= 1', true);
        strictEqual('1 <= 1 <= 2 <= 2 <= 3', true);
        strictEqual('1 <= 1 <= 2 <= 1 <= 3', false);
        strictEqual('le(1, 3, 2)', false);
      });
    });

    describe('gt / >', () => {
      it('убывающая последовательность', () => {
        strictEqual('gt(3, 2, 1)', true);
        strictEqual('3 > 2', true);
        strictEqual('3 > 2 > 1 > 0', true);
        strictEqual('3 > 2 > 2 > 0', false);
        strictEqual('gt(3, 1, 2)', false);
      });
    });

    describe('ge / >=', () => {
      it('нестрогое убывание', () => {
        strictEqual('ge(3, 2, 2, 1)', true);
        strictEqual('3 >= 2', true);
        strictEqual('3 >= 2 >= 2 >= 1 >= 1 >= 0', true);
        strictEqual('3 >= 2 >= 2 >= 3 >= 1 >= 0', false);
        strictEqual('ge(3, 1, 2)', false);
      });
    });

    describe('mixed > >= < <=', () => {
      it('Цепочки сравнения', () => {
        // Базовые цепочки
        strictEqual('3 > 2 >= 2 > 1', true);
        strictEqual('1 < 3 > 1', true);
        strictEqual('3 > 1 < 3', true);

        // Простые цепочки с числами
        strictEqual('5 > 4 > 3 > 2 > 1', true);
        strictEqual('1 < 2 < 3 < 4 < 5', true);
        strictEqual('10 >= 10 <= 10', true);
        strictEqual('10 > 10 >= 10', false);
        strictEqual('10 >= 10 > 10', false);

        // Цепочки со смешанными операторами
        strictEqual('2 < 4 <= 4 < 6', true);
        strictEqual('2 < 4 <= 3 < 6', false);
        strictEqual('8 > 6 >= 6 > 4', true);
        strictEqual('8 > 6 >= 7 > 4', false);

        // Длинные цепочки
        strictEqual('1 < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10', true);
        strictEqual('10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 > 1', true);
        strictEqual('1 < 2 < 3 < 4 < 5 > 4 > 3 > 2 > 1', true);
        strictEqual('1 < 3 < 5 < 7 < 9 > 7 > 5 > 3 > 1', true);
        strictEqual('1 < 3 < 5 < 7 < 9 > 7 > 5 > 3 > 0', true);
        strictEqual('1 < 3 < 5 < 7 < 9 > 7 > 5 > 3 > 9', false);

        // Цепочки с отрицательными числами
        strictEqual('-5 < -3 < -1 < 0 < 2', true);
        strictEqual('2 > 0 > -2 > -4 > -6', true);
        strictEqual('-3 < -1 > -5 < 0', true);

        // Комбинированные цепочки
        strictEqual('1 >= 1 >= 1', true);
        strictEqual('1 <= 1 <= 1', true);
        strictEqual('1 > 1 >= 1', false);
        strictEqual('1 >= 1 > 1', false);

        // Сложные смешанные цепочки
        strictEqual('3 < 4 > 2 < 5', true);
        strictEqual('3 < 4 > 5 < 6', false);
        strictEqual('5 >= 4 >= 3 < 4 <= 5', true);
        strictEqual('5 >= 4 >= 3 < 4 <= 3', false);

        // Цепочки с проверкой короткого замыкания
        strictEqual('1 < 2 < 1 < 3 < 4', false);
        strictEqual('5 > 3 > 1 > 0', true);
        strictEqual('5 > 3 > 1 > 2', false);


        // Перемешанные строгие и нестрогие
        strictEqual('1 < 2 <= 3 < 4 <= 5', true);
        strictEqual('5 >= 4 > 3 >= 2 > 1', true);
        strictEqual('1 < 2 <= 2 < 3 <= 4', true);
        strictEqual('1 < 2 <= 1 < 3 <= 4', false);

        // С одинаковыми числами
        strictEqual('5 >= 5 >= 5', true);
        strictEqual('5 <= 5 <= 5', true);
        strictEqual('5 > 5 > 5', false);
        strictEqual('5 < 5 < 5', false);

      });

      it('После false не выполняется', () => {
        deepEqual('x := 0; a := (x := x + 1) < (x := x + 1) > (x := x + 1) > (x := x + 1) > (x := x + 1) > (x := x + 1) > (x := x + 1); {x, a}', [3, false]);
      });
    });

    describe('not', () => {
      it('логическое отрицание', () => {
        strictEqual('not(true)', false);
        strictEqual('not false ', true);
        strictEqual('not(0)', true);
        strictEqual('!1', false);
      });
    });

    describe('and / && (short-circuit)', () => {
      it('возвращает первое ложное или последнее истинное', () => {
        strictEqual('and(5 > 3, 2 < 4)', true);
        strictEqual('and(5 > 3, 2 > 4)', false);
        strictEqual('5 > 3 and 2 < 4 and 10', 10);
      });
      it('не вычисляет лишние аргументы', () => {
        strictEqual('and(false, 1)', false);
        strictEqual('and(0, 1)', 0);
      });
    });

    describe('or / || (short-circuit)', () => {
      it('возвращает первое истинное или последнее ложное', () => {
        strictEqual('or(5 > 3, 10 < 4)', true);
        strictEqual('1 < 0 or false or 2 * 2', 4);
      });
      it('не вычисляет лишние аргументы', () => {
        strictEqual('or(true, throw("err"))', true);
      });
    });

    describe('logicalAnd / logical_and', () => {
      it('строгий булевый И', () => {
        strictEqual('logicalAnd(1, 2, 3)', true);
        strictEqual('logicalAnd(1, 0, 3)', false);
        strictEqual('logicalAnd()', true);
      });
    });

    describe('logicalOr / logical_or', () => {
      it('строгий булевый ИЛИ', () => {
        strictEqual('logicalOr(0, 0, 0)', false);
        strictEqual('logicalOr(0, 1, 0)', true);
        strictEqual('logicalOr()', false);
      });
    });
  });



  // ==========================================================
  // 3. Математические операторы
  // ==========================================================
  describe('Math Operators', () => {
    describe('add / + / plus', () => {
      it('складывает числа', () => {
        strictEqual('add(1, 2, 1)', 4);
        strictEqual('1 + 3', 4);
      });
      it('конкатенирует строки при смешении', () => {
        strictEqual('add(1, "1", 1, 1)', '1111');
      });
      it('функции превращает в "undefined"', () => {
        strictEqual('add(fn({x}, x), 1)', 'undefined1');
      });
    });

    describe('minus / - / subtract', () => {
      it('последовательное вычитание', () => {
        strictEqual('minus(1, 2, 1)', -2);
        strictEqual('1 - 3', -2);
      });
      it('унарный минус', () => {
        strictEqual('minus(5)', -5);
        strictEqual('-3', -3);
      });
    });

    describe('multiply / * / mul', () => {
      it('перемножает аргументы', () => {
        strictEqual('multiply(2, 3, 4)', 24);
        strictEqual('2 * 3 * 4', 24);
      });
    });

    describe('divide / / / div', () => {
      it('последовательное деление', () => {
        strictEqual('div(10, 2, 5)', 1);
        strictEqual('10 / 2 / 5', 1);
      });
      it('обратное число при одном аргументе', () => {
        strictEqual('div(5)', 0.2);
      });
      it('крайний случай: деление на 0', () => {
        strictEqual('div(1, 0)', Infinity);
      });
    });

    describe('rand', () => {
      it('возвращает [0, 1)', () => {
        for (let i = 0; i < 100; i++) {
          const r = lpe.eval_lpe('rand()');
          _ok(r >= 0 && r < 1);
          _ok(typeof r === 'number');
        }
      });
    });

    describe('max', () => {
      it('максимум в массиве', () => {
        strictEqual('max({1, 5, 2, 8, 3})', 8);
      });
      it('не-массив → []', () => {
        deepEqual('max(123)', []);
      });
    });

    describe('min', () => {
      it('минимум в массиве', () => {
        strictEqual('min({1, 5, 2, 8, 3})', 1);
      });
      it('не-массив → []', () => {
        deepEqual('min("abc")', []);
      });
    });
  });



  // ==========================================================
  // 4. Создание объектов
  // ==========================================================
  describe('Object Creation', () => {
    describe('new', () => {
      it('создаёт экземпляр с аргументами', () => {
        const d = lpe.eval_lpe('new(Date, 2023, 0, 1)');
        _ok(d instanceof Date);
        _strictEqual(d.getFullYear(), 2023);
      });
    });

    describe('vector / {', () => {
      it('создаёт массив', () => {
        deepEqual('vector(1, 2, 3)', [1, 2, 3]);
        deepEqual('vector(1, 2, 3, a=21, b=12)', Object.assign([1, 2, 3], { a: 21, b: 12 }));
        deepEqual('{1, 2, 3}', [1, 2, 3]);
        deepEqual('{1, 2, 3, a=21, b=12}', Object.assign([1, 2, 3], { a: 21, b: 12 }));
        deepEqual('{a = 32}', { a: 32 });
        deepEqual('{a = 32, b = {1,2,3}}', { a: 32, b: [1, 2, 3] });
      });
    });

    describe('list / array / [', () => {
      it('создаёт список', () => {
        deepEqual('list(1, 2, 3)', [1, 2, 3]);
        deepEqual('array(1, 2)', [1, 2]);
        deepEqual('[1, 2, 5]', [1, 2, 5]);
      });
    });

    describe('tuple', () => {
      it('гибридный массив', () => {
        deepEqual('tuple(1, 2, 3)', Object.assign([1, 2, 3], {}));
        deepEqual('tuple(a = 32)', Object.assign([], { a: 32 }));
        deepEqual('tuple(1, 2, a = 32)', Object.assign([1, 2], { a: 32 }));
      });
    });

    describe('hash', () => {
      it('пустой хэш', () => {
        deepEqual('hash()', {});
        deepEqual('{=}', {});
      });

      it('создание хэша', () => {
        deepEqual('hash(a = 32, b = {1,2,3})', { a: 32, b: [1, 2, 3] });
        deepEqual('hash(1, 2, 3, a = 32, b = {1,2,3})', { a: 32, b: [1, 2, 3] });
      });
    });

    describe('makeHash', () => {
      it('вычисляет ключи', () => {
        deepEqual('makeHash(1+2 = "test")', {3: 'test'});
        deepEqual('makeHash(5 = "test")', {5: 'test'});
      });
    });

    describe('range', () => {
      it('генерирует диапазоны', () => {
        deepEqual('range(5)', [0, 1, 2, 3, 4]);
        deepEqual('range(1, 5)', [1, 2, 3, 4]);
        deepEqual('range(5, 1, -2)', [5, 3]);
      });
      it('нулевой шаг → 1', () => {
        deepEqual('range(0, 3, 0)', [0, 1, 2]);
      });
      it('пустой диапазон', () => {
        deepEqual('range(3, 0)', []);
      });
    });

    describe('repeat', () => {
      it('повторяет значение', () => {
        deepEqual('repeat(3, 5)', [5, 5, 5]);
      });
      it('перевычисляет выражение каждую итерацию', () => {
        deepEqual('x := 0; repeat(2, x := x + 1)', [1, 2]);
        deepEqual('a := repeat(3, {}); a.(0).(0) := 12; a', [[12], [], []]);
      });
    });

    describe('reshape / ⍴', () => {
      it('циклическое заполнение', () => {
        deepEqual('reshape(5, 1, 2)', [1, 2, 1, 2, 1]);
      });
    });

    describe('zip', () => {
      it('по максимальной длине', () => {
        deepEqual('zip({{1, 2}, {3, 4}})', [[1, 3], [2, 4]]);
        deepEqual('zip({{1, 2}, {3}})', [[1, 3], [2, undefined]]);
        deepEqual('zip({{1, 2}, {3, 4}, {5, 6, 7}})', [[1, 3, 5], [2, 4, 6], [undefined, undefined, 7]]);
      });
      it('по минимальной длине', () => {
        deepEqual('zip({{1}, {2, 3}, {4}}, true)', [[1, 2, 4]]);
      });
    });

    describe('fn', () => {
      it('анонимная функция', () => {
        strictEqual('f := fn({x}, x * x); f(5)', 25);
      });
      it('работает в map', () => {
        deepEqual('{1, 2, 3}.map(fn({x}, x * 2))', [2, 4, 6]);
        deepEqual('{1, 2, 3}.map(fn(x, x * 2))', [2, 4, 6]);
        deepEqual('{1, 2, 3}.map(fn((x), x * 2))', [2, 4, 6]);
        deepEqual('{1, 2, 3}.mapArr(fn((x, idx), x * 2 + idx))', [2, 5, 8]);
        deepEqual('{1, 2, 3}.mapArr(fn({x, idx}, x * 2 + idx))', [2, 5, 8]);
      });
      it('можно вызывать при создании', () => {
        strictEqual('fn({x}, x * x)(5)', 25);
      });
      it('рекурсия', () => {
        strictEqual('factorial := fn({x}, if(x < 2, 1, x * $this$(x - 1))); factorial(5)', 120);
      });
    });

    describe('->fn / toFn / defFn', () => {
      it('преобразование выражения в функцию', () => {
        deepEqual('{1, 2, 3}.mapArr(toFn(x * 2 + idx, x, idx))', [2, 5, 8]);
      });
      it('можно вызывать при создании', () => {
        strictEqual('defFn(x * x, x)(5)', 25);
      });
      it('рекурсия', () => {
        strictEqual('toFn(if(x < 2, 1, x * $this$(x - 1)), x)(5)', 120);
      });
    });

    describe('=> / lambda', () => {
      it('один аргумент', () => {
        deepEqual('{1, 2, 3}.map(x => x * 2)', [2, 4, 6]);
        deepEqual('{1, 2, 3}.map((x) => x * 2)', [2, 4, 6]);
      });
      it('несколько аргументов', () => {
        strictEqual('f := (x, y) => x + y; f(2, 3)', 5);
      });
      it('можно вызывать при создании', () => {
        strictEqual('(x => x * x)(5)', 25);
      });
      it('рекурсия', () => {
        strictEqual('(x => if(x < 2, 1, x * $this$(x - 1)))(5)', 120);
      });
    });
  });



  // ==========================================================
  // 5. Работа с массивами
  // ==========================================================
  describe('Array Operations', () => {
    describe('count / length', () => {
      it('длина массива', () => {
        strictEqual('count({1, 2, 3})', 3);
      });
      it('длина строки', () => {
        strictEqual('length("hello")', 5);
      });
    });

    describe('empty? / empty', () => {
      it('пустой массив', () => {
        strictEqual('empty({})', true);
        strictEqual('empty({1, 2})', false);
      });
      it('не-массив → false', () => {
        strictEqual('empty("abc")', false);
      });
    });

    describe('reverse', () => {
      it('реверс', () => {
        deepEqual('reverse({1, 2, 3})', [3, 2, 1]);
      });
    });

    describe('slice', () => {
      it('срез массива', () => {
        deepEqual('slice({1, 2, 3, 4}, 1, 3)', [2, 3]);
        deepEqual('slice({1, 2, 3, 4}, 1)', [2, 3, 4]);
      });
      it('срез строки', () => {
        strictEqual('slice("hello world", 0, 5)', 'hello');
        strictEqual('slice("hello", 1)', 'ello');
      });
      it('не-массив/строка → []', () => {
        deepEqual('slice(123, 0, 1)', []);
      });
    });

    describe('concat', () => {
      it('конкатенация', () => {
        deepEqual('concat({1, 2}, {3, 4})', [1, 2, 3, 4]);
      });
    });

    describe('first', () => {
      it('первый элемент', () => {
        strictEqual('first({1, 2, 3})', 1);
      });
      it('пустой → null', () => {
        strictEqual('first({})', null);
      });
    });

    describe('last', () => {
      it('последний элемент', () => {
        strictEqual('last({1, 2, 3})', 3);
      });
      it('пустой → undefined', () => {
        strictEqual('last({})', undefined);
      });
    });

    describe('rest', () => {
      it('хвост', () => {
        deepEqual('rest({1, 2, 3})', [2, 3]);
      });
    });

    describe('cons / pushStart', () => {
      it('добавление в начало', () => {
        deepEqual('cons(1, {2, 3})', [1, 2, 3]);
      });
    });

    describe('find', () => {
      it('поиск по значению', () => {
        strictEqual('find({1, 2, 3}, 2)', 2);
        strictEqual('find({1, 2, 3}, 6)', undefined);
      });
      it('поиск по предикату', () => {
        strictEqual('find({1, 2, 3}, fn({x}, x > 1))', 2);
      });
    });

    describe('findIndex', () => {
      it('индекс или -1', () => {
        strictEqual('findIndex({1, 2, 3}, 3)', 2);
        strictEqual('findIndex({1, 2, 3}, 6)', -1);
      });
    });

    describe('map', () => {
      it('унарная функция', () => {
        deepEqual('map({1, 2, 3}, fn({a}, a * 2))', [2, 4, 6]);
      });
      it('не-массив → []', () => {
        deepEqual('map(123, fn({x}, x))', []);
      });
    });

    describe('mapit', () => {
      it('переменные it и idx', () => {
        deepEqual('mapit({1, 2, 3}, it * 2)', [2, 4, 6]);
        deepEqual('mapit({"a", "b", "c"}, it + idx)', ['a0', 'b1', 'c2']);
      });
    });

    describe('mapArr', () => {
      it('доступ к idx и arr', () => {
        deepEqual('mapArr({1, 2, 3}, fn({val, idx}, val * idx))', [0, 2, 6]);
      });
    });

    describe('filter', () => {
      it('унарный предикат', () => {
        deepEqual('filter({1, 2, 3, 4}, fn({a}, a > 2))', [3, 4]);
      });
    });

    describe('filterit', () => {
      it('переменные it и idx', () => {
        deepEqual('filterit({1, 2, 3, 4}, it > 2 || idx = 0)', [1, 3, 4]);
      });
    });

    describe('filterArr', () => {
      it('доступ к idx и arr', () => {
        deepEqual('filterArr({1, 2, 3, 4}, fn({val, idx}, idx < 3))', [1, 2, 3]);
      });
    });

    describe('reduce', () => {
      it('накапливает результат', () => {
        strictEqual('reduce({1, 2, 3}, add, 0)', 6);
      });
      it('не-массив → init', () => {
        strictEqual('reduce(123, add, 42)', 42);
      });
    });

    describe('reduceArr', () => {
      it('4 аргумента у fn', () => {
        strictEqual('reduceArr({1, 2, 3}, fn({acc, val, idx}, acc + val * idx), 0)', 8);
      });
    });

    describe('sort', () => {
      it('сортировка примитивов', () => {
        deepEqual('sort({3, 1, 2})', [1, 2, 3]);
      });
      it('компаратор', () => {
        deepEqual('sort({5, 2, 8, 1}, fn({a, b}, b - a))', [8, 5, 2, 1]);
      });
      it('мутирует исходный массив', () => {
        const arr = [3, 1, 2];
        const res = lpe.eval_lpe('sort(arr)', {arr});
        _deepEqual(res, [1, 2, 3]);
        _deepEqual(arr, [1, 2, 3]);
      });
    });

    describe('sortBy', () => {
      it('сортировка по ключу', () => {
        const input = [{name: 'Ben'}, {name: 'Alice'}, {name: 'Duncan'}];
        const res = lpe.eval_lpe('sortBy(arr, fn({o}, o.name))', {arr: input});
        _deepEqual(res.map(x => x.name), ['Alice', 'Ben', 'Duncan']);
      });
    });

    describe('some', () => {
      it('хотя бы один', () => {
        strictEqual('some({1, 2, 3}, 3)', true);
        strictEqual('some({1, 2, 3}, 6)', false);
      });
    });

    describe('every', () => {
      it('все', () => {
        strictEqual('every({1, 2, 3}, fn({x}, x > 0))', true);
        strictEqual('every({1, 2, 3}, fn({x}, x > 1))', false);
      });
    });

    describe('flat', () => {
      it('разглаживание', () => {
        deepEqual('flat({{1, 2}, 3, {4, {5}}})', [1, 2, 3, 4, [5]]);
        deepEqual('flat({{1, 2}, 3, {4, {5}}}, 2)', [1, 2, 3, 4, 5]);
      });
    });

    describe('frequencies / counter', () => {
      it('частотный анализ', () => {
        deepEqual('frequencies({1, 1, 2, 2, 2, 3})', {1: 2, 2: 3, 3: 1});
      });
    });

    describe('partition', () => {
      it('разбиение на части', () => {
        deepEqual('partition({1, 2, 3, 4, 5}, 2)', [[1, 2], [3, 4], [5]]);
      });
    });

    describe('distinct', () => {
      it('сохраняет порядок', () => {
        deepEqual('distinct({3, 1, 2, 3, 3, 2, 3})', [3, 1, 2]);
      });
      it('кастомный компаратор', () => {
        deepEqual('distinct({{a = 1}, {a = 2}, {a = 1}}, fn({x, y}, x.a = y.a))', [{a: 1}, {a: 2}]);
      });
    });

    describe('union', () => {
      it('объединение без дублей', () => {
        deepEqual('union({{1, 2}, {3, 4}})', [1, 2, 3, 4]);
      });
    });

    describe('intersect', () => {
      it('пересечение', () => {
        deepEqual('intersect({{1, 2}, {2, 3}})', [2]);
      });
    });

    describe('difference', () => {
      it('разность', () => {
        deepEqual('difference({{1, 2, 1}, {2, 3}})', [1, 1]);
      });
    });

    describe('uniques', () => {
      it('уникальные в одном массиве', () => {
        deepEqual('uniques({{1, 2, 1}, {2, 3}})', [1, 3]);
      });
    });

    describe('shuffle', () => {
      it('сохраняет длину', () => {
        const arr = [1, 2, 3, 4, 5];
        const res = lpe.eval_lpe('shuffle(arr)', {arr});
        _strictEqual(res.length, 5);
        _deepEqual(res.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
      });
    });

    describe('sample', () => {
      it('один элемент по умолчанию', () => {
        _ok([1, 2, 3, 4, 5].includes(lpe.eval_lpe('sample({1, 2, 3, 4, 5})')));
        _ok([1, 2, 3, 4, 5].includes(lpe.eval_lpe('sample({1, 2, 3, 4, 5}, 1)')));
      });
      it('n элементов', () => {
        const res = lpe.eval_lpe('sample({1, 2, 3, 4, 5}, 3)');
        _strictEqual(res.length, 3);
      });
      it('n > length → всё', () => {
        const res = lpe.eval_lpe('sample({1, 2, 3, 4, 5}, 10)');
        _strictEqual(res.length, 5);
      });
    });

    describe('pluck', () => {
      it('извлечение свойства', () => {
        deepEqual('pluck({{a=1}, {a=2}}, "a")', [1, 2]);
      });
    });

    describe('join', () => {
      it('склейка массива', () => {
        strictEqual('join({1, 2, 3}, "-")', '1-2-3');
      });
    });

    describe('joinObj', () => {
      it('склейка объекта', () => {
        strictEqual('joinObj({a = 12, b = "test"}, "; ", fn({k, v}, str(k, ": ", v)))', 'a: 12; b: test');
      });
    });
  });



  // ==========================================================
  // 6. Работа с хэш-таблицами
  // ==========================================================
  describe('Hash Operations', () => {
    describe('contains? / containsKey', () => {
      it('own property', () => {
        strictEqual('containsKey({a = 1}, "a")', true);
        strictEqual('containsKey({a = 1}, "b")', false);
      });
    });

    describe('get / nth', () => {
      it('получение значения', () => {
        strictEqual('get({a = 1}, "a")', 1);
        strictEqual('get({a = 1}, "b")', undefined);
        strictEqual('nth({1, 2, 3}, 1)', 2);
      });
      it('default', () => {
        strictEqual('get({a = 1}, "b", "not found")', 'not found');
      });
    });

    describe('set', () => {
      it('устанавливает и возвращает объект', () => {
        deepEqual('set({=}, "a", 1)', {a: 1});
        deepEqual('set({}, "a", 1)', Object.assign([], {a: 1}));
      });
    });

    describe('del', () => {
      it('удаляет свойство', () => {
        strictEqual('del({a=1, b=2}, "a")', true);
      });
    });

    describe('keys', () => {
      it('массив ключей', () => {
        deepEqual('keys({a = 1, b = 2})', ['a', 'b']);
      });
    });

    describe('vals / values', () => {
      it('массив значений', () => {
        deepEqual('vals({1, 2, a = 3, b = 4})', [1, 2, 3, 4]);
      });
    });

    describe('entries', () => {
      it('пары [k,v]', () => {
        deepEqual('entries({a = 1, b = 2})', [['a', 1], ['b', 2]]);
      });
    });

    describe('fromEntries', () => {
      it('собирает объект', () => {
        deepEqual('fromEntries({{"a", 1}, {"b", 2}})', {a: 1, b: 2});
      });
    });

    describe('select', () => {
      it('выборка ключей', () => {
        deepEqual('select({a = 1, b = 2, c = 3}, {a, c})', {a: 1, c: 3});
      });
      it('выборка индексов массива', () => {
        deepEqual('select({1, 2, 3, 4}, {0, 3})', [1, 4]);
      });
    });

    describe('omit', () => {
      it('исключение ключей', () => {
        deepEqual('omit({a = 1, b = 2, c = 3}, {a, c})', {b: 2});
      });
    });

    describe('compact', () => {
      it('удаляет null/undefined', () => {
        deepEqual('compact({a = 1, b = null, c = undefined})', {a: 1});
      });
      it('учитывает глубину', () => {
        deepEqual('compact({a = 1, b = {c = null}}, 2)', {a: 1, b: {}});
      });
    });

    describe('get_in', () => {
      it('вложенное чтение', () => {
        deepEqual('get_in({a = {b = {c = 42}}}, {"a", "b"})', {c: 42});
        strictEqual('get_in({a = {b = {10, 11, 12}}}, a, b, 2)', 12);
      });
      it('отсутствующий путь → undefined', () => {
        strictEqual('get_in({a = 1}, {"b", "c"})', undefined);
      });
    });

    describe('assoc_in', () => {
      it('создаёт промежуточные объекты', () => {
        const res = 'begin(x := Hashmap, assoc_in(x, {"a", "b", "c"}, 42), x)';
        deepEqual(res, {a: {b: {c: 42}}});
      });
    });

    describe('update_in', () => {
      it('обновляет через функцию', () => {
        deepEqual('update_in({a = {b = 10}}, {"a", "b"}, fn({x}, x + 1))', {a: {b: 11}});
      });
      it('regexp ключи', () => {
        const res = lpe.eval_lpe('update_in({Ivan = {id = 1}, Bob = {id = 2}}, {"/.+/", "name"}, fn({x, path}, nvl(x, path.(0))), true)');
        strictEqual(res.Ivan.name, 'Ivan');
        strictEqual(res.Bob.name, 'Bob');
      });
    });

    describe('cp', () => {
      it('копирование между структурами', () => {
        const res = 'begin(x := {a = {b = 10}}, y := {c = {d = 12}}, cp({x, "a", "b"}, {y, "c", "f"}), y)';
        deepEqual(res, {c: {d: 12, f: 10}});
      });
    });

    describe('merge', () => {
      it('последний побеждает', () => {
        deepEqual('merge({{a = 1, c = 5}, {a = 3, b = 2}})', {a: 3, c: 5, b: 2});
      });
      it('кастомный мерджер', () => {
        deepEqual('merge({{a = 1}, {a = 3, b = 2}}, fn({k, old, new}, old + new))', {a: 4, b: 2});
      });
      it('full режим', () => {
        const res = lpe.eval_lpe('merge({{a = 1}, {a = 3, b = 2}}, fn({k, vals, has}, vals), "full")');
        _deepEqual(res.a, [1, 3]);
      });
    });

    describe('mergeDeep', () => {
      it('рекурсивное слияние', () => {
        deepEqual('mergeDeep({a = {4,5,6}}, {a = {1}, b = 2})', {a: [1, 5, 6], b: 2});
      });
    });

    describe('makeStruct', () => {
      it('заполняет недостающие поля', () => {
        deepEqual('makeStruct({1, 2, 3}, {0,0,0,0,0,0})', [1, 2, 3, 0, 0, 0]);
      });
    });
  });



  // ==========================================================
  // 7. Работа со строками
  // ==========================================================
  describe('String Operations', () => {
    describe('str', () => {
      it('конкатенация', () => {
        strictEqual('str(1, 2, 3)', '123');
        strictEqual('str("a", {1,2,3})', 'a[1,2,3]');
        strictEqual('str("a", null)', 'anull');
      });
    });

    describe('split', () => {
      it('разбиение', () => {
        deepEqual('split("a,b,c", ",")', ['a', 'b', 'c']);
      });
    });

    describe('words', () => {
      it('слова по умолчанию', () => {
        deepEqual('words("a, b, c")', ['a', 'b', 'c']);
      });
      it('кастомный регекс', () => {
        deepEqual('words("a-1, test_2", "\\\\w+")', ['a', '1', 'test_2']);
      });
    });

    describe('re_match', () => {
      it('global match', () => {
        deepEqual('re_match("hello123", "[a-z]+", "g")', ['hello']);
      });
      it('null при неудаче', () => {
        strictEqual('re_match("hello123", "[!]+")', null);
      });
      it('r-strings', () => {
        const res = lpe.eval_lpe('re_match("test(aaa)", r"\\((.*)\\)")');
        _ok(res);
        _strictEqual(res[0], '(aaa)');
        _strictEqual(res[1], 'aaa');
      });
      it('обычные строки', () => {
        const res = lpe.eval_lpe('re_match("test(aaa)", "\\\\((.*)\\\\)")');
        _ok(res);
        _strictEqual(res[0], '(aaa)');
        _strictEqual(res[1], 'aaa');
      });
    });

    describe('RegExp', () => {
      it('создаёт RegExp', () => {
        const r = lpe.eval_lpe('RegExp("[0-9]+", "g")');
        _ok(r instanceof RegExp);
        _ok(r.test('123'));
      });
    });
  });



  // ==========================================================
  // 8. Преобразование типов
  // ==========================================================
  describe('Type Conversion', () => {
    it('toAny', () => {
      strictEqual('toAny(42)', 42);
    });
    it('toBool', () => {
      strictEqual('toBool(1)', true);
      strictEqual('toBool(0)', false);
      strictEqual('toBool("")', false);
      strictEqual('toBool("text")', true);
    });
    it('toInt / toNumber', () => {
      strictEqual('toInt("42")', 42);
      strictEqual('toInt(true)', 1);
    });
    it('toStr', () => {
      strictEqual('toStr(42)', '42');
      strictEqual('toStr({1,2,3})', '1,2,3');
    });
    it('jsonParse / read-string', () => {
      deepEqual('json_parse(\'{"a": 1}\')', {a: 1});
    });
    it('jsonStringify', () => {
      strictEqual('jsonStringify({a = 1})', '{"a":1}');
    });
    it('pr_str / jsonJoin', () => {
      strictEqual('pr_str(1, "a", {1,2,3})', '1 "a" [1,2,3]');
    });
    it('astToString / []', () => {
      strictEqual('astToString(123)', '123');
    });
  });



  // ==========================================================
  // 9. Проверки типов
  // ==========================================================
  describe('Type Checks', () => {
    it('isa', () => {
      strictEqual('isa({1,2,3}, Array)', true);
    });
    it('type', () => {
      strictEqual('type(123)', 'number');
      strictEqual('type("hello")', 'string');
    });
    it('classOf', () => {
      strictEqual('classOf({=})', '[object Object]');
      strictEqual('classOf({})', '[object Array]');
      strictEqual('classOf({1,2})', '[object Array]');
    });
    it('isNull', () => {
      strictEqual('isNull(null)', true);
      strictEqual('isNull(undefined)', true);
      strictEqual('isNull(0)', false);
    });
    it('isUndef', () => {
      strictEqual('isUndef(undefined)', true);
      strictEqual('isUndef(null)', false);
    });
    it('isTrue / isFalse', () => {
      strictEqual('isTrue(true)', true);
      strictEqual('isTrue(1)', false);
      strictEqual('isFalse(false)', true);
      strictEqual('isFalse(0)', false);
    });
    it('isBool', () => {
      strictEqual('isBool(true)', true);
      strictEqual('isBool(0)', false);
    });
    it('isNumber', () => {
      strictEqual('isNumber(42)', true);
      strictEqual('isNumber("42")', false);
      strictEqual('isNumber(NaN)', true);
    });
    it('isNumberLike', () => {
      strictEqual('isNumberLike("3.14")', true);
      strictEqual('isNumberLike({})', false);
    });
    it('isString', () => {
      strictEqual('isString("hello")', true);
      strictEqual('isString(123)', false);
    });
    it('isArray', () => {
      strictEqual('isArray({1, 2, 3})', true);
      strictEqual('isArray({a = 1})', false);
    });
    it('isHash', () => {
      strictEqual('isHash({a = 1, b = 2})', true);
      strictEqual('isHash({1, 2, 3})', false);
      strictEqual('isHash(null)', false);
      // Примечание: согласно коду isHash({}) === true (в доке указано false — возможно, устаревшая дока)
      strictEqual('isHash({=})', true);
    });
    it('isObj', () => {
      strictEqual('isObj({1, 2, 3})', true);
      strictEqual('isObj({a = 1})', true);
      strictEqual('isObj(null)', false);
    });
    it('isFunction', () => {
      strictEqual('isFunction(fn({a}, a))', true);
      strictEqual('isFunction(42)', false);
    });
  });



  // ==========================================================
  // 10. Работа с переменными и контекстом
  // ==========================================================
  describe('Variables & Context', () => {
    describe(':= / assign', () => {
      it('присваивание переменной', () => {
        strictEqual('begin(x := 10, x)', 10);
      });
      it('присваивание свойства', () => {
        deepEqual('begin(obj := {}, obj.a := 20, obj)', Object.assign([], {a: 20}));
        deepEqual('begin(obj := {{}}, obj.(0).(0) := 20, obj)', [[20]]);
        deepEqual('begin(obj := {=}, obj.a := 20, obj)', {a: 20});
        deepEqual('begin(obj := {=}, obj.a.b.c := 20, obj)', {a: {b: {c: 20}}});
      });
      it('цепочка присваиваний', () => {
        deepEqual('begin(x := y := z := 10; {x, y, z})', [10, 10, 10]);
      });
    });

    describe('let', () => {
      it('привязки массивом', () => {
        strictEqual('let({{"x", 10}, {"y", 20}}, x + y)', 30);
        strictEqualParsed(["let", [["x", 10], ["y", 20]], ["+", "x", "y"]], 30);
      });
      it('привязки хэшем', () => {
        strictEqual('let({x = 10, y = 20}, x + y)', 30);
        strictEqualParsed(["let", {x: 10, y: 20}, ["+", "x", "y"]], 30);
      });
      it('привязки функцией', () => {
        strictEqual('let(key => if(key = "x", 10, key = "y", 20), x + y)', 30);
        strictEqualParsed(["let", (k) => k === "x" ? 10 : k === "y" ? 20 : undefined, ["+", "x", "y"]], 30);
      });
      it('затенение внешнего scope', () => {
        strictEqual('begin(x := 42, let({x = 1}, x))', 1);
        strictEqual('begin(x := 42, let({x = 1}, x := 12, x))', 12);
        strictEqual('begin(x := 42, let({x = 1}, x := 12); x)', 42);
      });
    });

    describe('let* / letseq / letstar', () => {
      it('последовательные привязки', () => {
        strictEqual('letseq({{"x", 10}, {"y", x * 2}}, y)', 20);
      });
      it('пустые привязки → тело', () => {
        strictEqual('letseq({}, 42)', 42);
      });
    });

    describe('def', () => {
      it('определение в контексте', () => {
        strictEqual('begin(def(x, 42), x)', 42);
      });
    });

    describe('undef', () => {
      it('удаляет переменную', () => {
        strictEqual('begin(x := 42, undef(x), x)', "x");
      });
      it('возвращает удалённое значение', () => {
        strictEqual('begin(x := 42, undef(x))', 42);
      });
      it('удаляет только из текущего scope', () => {
        strictEqual('begin(x := 42, let({{"x", 12}}, undef(x)), x)', 42);
      });
    });

    describe('resolve', () => {
      it('разыменование', () => {
        strictEqual('begin(x := 10, resolve(x))', 10);
      });
    });

    describe('ctx', () => {
      it('выборка переменных', () => {
        deepEqual('begin(x := 10, y := 4, ctx(x, y, z))', {x: 10, y: 4, z: undefined});
      });
    });

    describe('.- / property', () => {
      it('чтение', () => {
        strictEqual('property({a = 1}, "a")', 1);
      });
      it('запись', () => {
        const obj = {a: 1};
        _strictEqual(lpe.eval_lpe('property(obj, "b", 2)', {obj}), 2);
        _strictEqual(obj.b, 2);
      });
    });
  });



  // ==========================================================
  // 11. Управление выполнением
  // ==========================================================
  describe('Control Flow', () => {
    describe('begin', () => {
      it('возвращает последнее', () => {
        strictEqual('begin(1, 2, 3)', 3);
      });
      it('пустой → null', () => {
        strictEqual('begin()', null);
      });
    });

    describe('if', () => {
      it('первое истинное', () => {
        strictEqual('if(5 > 3, "больше", 5 < 3, "меньше", "равны")', 'больше');
      });
      it('ветка else', () => {
        strictEqual('if(5 > 5, "больше", 5 < 5, "меньше", "равны")', 'равны');
      });
      it('без else → undefined', () => {
        strictEqual('if(false, 1)', undefined);
      });
    });

    describe('do', () => {
      it('цикл while', () => {
        strictEqual('begin(x := 0, do(x < 10, x := x + 1), x)', 10);
      });
      it('один аргумент → один раз', () => {
        strictEqual('begin(x := 0, do(x := x + 1), x)', 1);
      });
      it('защита от бесконечного цикла', () => {
        assert.throws(() => {
          lpe.eval_lisp(lpe.parse('begin(x := 0, do(true, x := x + 1))'), undefined, { maxLoopIterations: 10 });
        }, /Error: The maximum number of iterations \(10\) is exceeded\. Check the condition or change the limit in the settings\./);
        assert.throws(() => {
          lpe.eval_lisp(lpe.parse('begin(x := 0, do(true, x := x + 1))'));
        }, /Error: The maximum number of iterations \(100\) is exceeded\. Check the condition or change the limit in the settings\./);
      });
    });

    describe('return', () => {
      it('ранний выход из begin', () => {
        deepEqual('{1, 2, 3, 4}.map(x => begin(if(x < 3, return(-1)), x * 2))', [-1, -1, 6, 8]);
      });
    });

    describe('catchReturn', () => {
      it('ловит return', () => {
        strictEqual('catchReturn(return(42))', 42);
      });
    });

    describe('try', () => {
      it('перехват исключения', () => {
        strictEqual('try(throw("Текст ошибки"), ex, str("Ошибка: ", ex))', 'Ошибка: Текст ошибки');
      });
      it('нет ошибки → значение', () => {
        strictEqual('try(42, ex, 0)', 42);
      });
    });

    describe('nvl / coalesce', () => {
      it('первый не-null', () => {
        strictEqual('nvl(null, undefined, 42)', 42);
        strictEqual('nvl(1, 2, 3)', 1);
      });
      it('0 и false — валидные значения', () => {
        strictEqual('nvl(0, 1)', 0);
        strictEqual('nvl(false, true)', false);
      });
      it('все null → null', () => {
        strictEqual('nvl(null, null)', null);
      });
    });

    describe('throw', () => {
      it('выбрасывает', () => {
        assert.throws(() => lpe.eval_lpe('throw("err")'), /err/);
      });
    });
  });



  // ==========================================================
  // 12. Интерпретатор
  // ==========================================================
  describe('Interpreter', () => {
    describe('eval', () => {
      it('AST в STDLIB', () => {
        strictEqual('eval({"+", 1, 2})', 3);
      });
    });

    describe('eval_ast', () => {
      it('AST в текущем контексте', () => {
        strictEqual('begin(x := 5, eval_ast({"+", x, 2}))', 7);
      });
    });

    describe('eval_lpe', () => {
      it('строка → код', () => {
        strictEqual('eval_lpe("1 + 2")', 3);
      });
    });

    describe('rep', () => {
      it('eval + stringify', () => {
        strictEqual(`rep('["+", 1, 2]')`, '3');
      });
    });

    describe('return', () => {
      it('begin', () => {
        strictEqual(`begin(x := 5; if(x < 10, return(1)); 2)`, 1);
        strictEqual(`begin(x := 10; if(x < 10, return(1)); 2)`, 2);
      });

      it('fn', () => {
        // Если не просто return, то это оборачивается в begin
        strictEqual(`(x => return(1))(5)`, 1);
        deepEqual(`(x => {
          if(x < 0, return(-1));
          if(x = 0, return(0));
          return(1)
        })->>map({-10, 0, 10})`, [-1, 0, 1]);
        strictEqual(`toFn(return(1), x)(5)`, 1);
        strictEqual(`fn({x}, return(1))(5)`, 1);
      });
    });
  });



  // ==========================================================
  // 13. Вызовы и трединг
  // ==========================================================
  describe('Application & Threading', () => {
    describe('identity / ()', () => {
      it('возвращает аргумент', () => {
        strictEqual('identity(5)', 5);
        strictEqual('(1 + 2) * 3', 9);
      });
    });

    describe('apply', () => {
      it('распаковка аргументов', () => {
        strictEqual('apply(fn({a,b,c}, a + b * c), 1, 2, 3)', 7);
      });
    });

    describe('invoke', () => {
      it('вызов метода по имени', () => {
        strictEqual('invoke({1, 2, 3}, "toString")', '1,2,3');
        deepEqual('invoke({1, 2, 3}, "concat", {4, 5, 6})', [1, 2, 3, 4, 5, 6]);
      });
    });

    describe('. / -> / threadFirst', () => {
      it('доступ по индексу/ключу', () => {
        strictEqual('{1, 2, 3}.(1)', 2);
        strictEqual('{a = 2, b = 3}.b', 3);
        strictEqual('{a = 2, b = 3}.\nb', 3);
        strictEqual('{a = 2, b = 3}\n.\nb', 3);
      });
      it('цепочка вызовов', () => {
        strictEqual('{1, 2, 3}\n.reverse()\n\n.\n\nfirst()', 3);
      });
    });

    describe('.. / ->> / threadLast', () => {
      it('подстановка последним', () => {
        deepEqual('fn({a}, a * 2)->>map({1, 2, 3})', [2, 4, 6]);
      });
    });
  });



  // ==========================================================
  // 14. Краевые случаи и интеграция
  // ==========================================================
  describe('Edge Cases & Integration', () => {
    it('сложный begin + do + if', () => {
      const code = `
        begin(
          x := 0,
          do(x < 5, x := x + 1),
          if(x = 5,
            begin(y := x * 2, y),
            -1
          )
        )
      `;
      strictEqual(code, 10);
    });

    it('цепочка мутаций массива', () => {
      const code = `
        begin(
          arr := {3, 1, 2},
          arr := arr.sort(),
          arr := arr.reverse(),
          arr
        )
      `;
      deepEqual(code, [3, 2, 1]);
    });

    it('построение хэша через pipeline', () => {
      const code = `
        begin(
          h := hash(),
          h := set(h, "name", "Alice"),
          h := set(h, "age", 30),
          h := assoc_in(h, {"addr", "city"}, "NYC"),
          merge({h, {active = true}})
        )
      `;
      const res = lpe.eval_lpe(code);
      _strictEqual(res.name, 'Alice');
      _strictEqual(res.active, true);
      _strictEqual(res.addr.city, 'NYC');
    });

    it('ранний return во вложенной fn', () => {
      const code = `
        begin(
          f := fn({x},
            {
              if(x < 0, return("negative")),
              if(x = 0, return("zero")),
              return("positive")
            }
          ),
          { -5, 0, 5 }.map(f)
        )
      `;
      deepEqual(code, ['negative', 'zero', 'positive']);
    });

    it('изоляция контекстов', () => {
      const code = `
        begin(
          let({{"x", 1}},
            let({{"x", 2}}, x)
          )
        )
      `;
      strictEqual(code, 2);
    });

    it('большой range', () => {
      const arr = lpe.eval_lpe('range(1000)');
      _strictEqual(arr.length, 1000);
      _strictEqual(arr[0], 0);
      _strictEqual(arr[999], 999);
    });

    it('глубоко вложенный assoc_in + get_in', () => {
      const code = `
        begin(
          obj := {},
          obj := assoc_in(obj, {"a","b","c","d","e"}, 42),
          get_in(obj, {"a","b","c","d","e"})
        )
      `;
      strictEqual(code, 42);
    });

    it('update_in с созданием промежуточных', () => {
      const code = `
        begin(
          obj := {=},
          obj := update_in(obj, {"a","b"}, fn({x}, nvl(x, 0) + 1)),
          obj
        )
      `;
      deepEqual(code, {a: {b: 1}});
    });

    it('distinct с объектами', () => {
      const code = `
        distinct(
          {{id = 1, name = "A"}, {id = 2, name = "B"}, {id = 1, name = "C"}},
          fn({x, y}, x.id = y.id)
        )
      `;
      const res = lpe.eval_lpe(code);
      _strictEqual(res.length, 2);
    });

    it('merge массивов по индексу', () => {
      deepEqual('merge({{1, 2, 3}, {5, 2, 10}}, fn({k, old, new}, old + new))', [6, 4, 13]);
    });

    it('пустые коллекции', () => {
      strictEqual('first({})', null);
      strictEqual('last({})', undefined);
      deepEqual('rest({})', []);
      deepEqual('distinct({})', []);
      deepEqual('shuffle({})', []);
      deepEqual('frequencies({})', {});
    });

    it('типизация краевых значений', () => {
      strictEqual('isNumber(NaN)', true);
      strictEqual('isNumber(Infinity)', true);
      strictEqual('isNumberLike("0")', true);
      strictEqual('isNumberLike("00")', false);
    });

    it('строковые края', () => {
      strictEqual('str()', '');
      deepEqual('split("", ",")', ['']);
      deepEqual('words("")', []);
      strictEqual('join({}, "-")', '');
    });

  });
});
