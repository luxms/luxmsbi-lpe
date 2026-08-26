import { isArray, makeSF } from "../lib/utils";
import { EVAL } from "../lisp";
import unbox from "../lisp.unbox";




const logicalSequencedOperators = ["<", "<=", ">", ">="];

/**
 * @param {string} op
 * @param {Array<any>} args
 */
function compareFn(op, args) {
  /** @type {Record<string, (a: any, b: any) => boolean>} */
  const fn = {
    "<": (a, b) => a < b,
    "<=": (a, b) => a <= b,
    ">": (a, b) => a > b,
    ">=": (a, b) => a >= b,
  };
  return args.every((_, i) => i === 0 ? true : fn[op](args[i - 1], args[i]));
}


/** @type {ContextObject} */
export const CONTEXT_LOGICAL = {
};

/** @type {ContextFunctionsObject} */
const _context = CONTEXT_LOGICAL;



_context["="] = _context["eq"] = _context["equal"] = _context["=="] = (...args) => {
  /**
    * Проверяет на равенство всех аргументов первому аргументу
    * @usage eq(compared, ...agrs)
    * @param compared [any] Значение, с которым сравниваем
    * @param args [any] Значение, которое сравниваем
    * @example eq(1, 2, 1) => false
    *          eq(1, 1, 1, 1) => true
    *          1 = 3 => false
    *          1 = '1' => true
    * @category Логические операторы | 1
    */
  return args.every(v => v == args[0]);
};



_context["==="] = _context["strictEq"] = (...args) => {
  /**
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
    */
  return args.every(v => v === args[0]);
};



_context["!="] = _context["neq"] = _context["ne"] = (...args) => {
  /**
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
    */
  return !args.every(v => v == args[0]);
};



_context["!=="] = _context["strictNe"] = (...args) => {
  /**
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
    */
  return args.some(v => v !== args[0]);
};



_context["<"] = _context["lt"] = _context["less"] = makeSF((ast, ctx, rs) => {
  /**
    * Проверяет, что каждый последующий аргумент больше предыдущего.
    *
    * @usage lt(...args)
    * @param args [number] Число для сравнения
    *
    * @example lt(1, 2, 3) => true
    *          lt(1, 3, 2) => false
    *          1 < 2 => true
    *          1 < 2 < 3 < 4 => true
    *          1 < 10 >= 3 => true
    * @category Логические операторы | 5
    */
  const op = "<";
  if (ast.length === 2 && isArray(ast[1]) && logicalSequencedOperators.includes(ast[1][0])) {
    return unbox(
      [EVAL(ast[0], ctx, rs), EVAL(ast[1][1], ctx, rs)],
      ([a, b]) => {
        // Если false, второе не пытаемся выполнять
        if (!compareFn(op, [a, b])) {
          return false;
        }
        // ast[1][1] уже выполнен
        return EVAL([ast[1][0], ["$AST$", b], ...ast[1].slice(2)], ctx, rs);
      },
      rs?.streamAdapter,
    );
  }
  return unbox(
    ast.map((/** @type {AST} */ arg) => EVAL(arg, ctx, rs)),
    (args) => compareFn(op, args),
    rs?.streamAdapter,
  );
});



_context["<="] = _context["le"] = _context["lte"] = makeSF((ast, ctx, rs) => {
  /**
    * Проверяет, что каждый последующий аргумент больше или равен предыдущему.
    *
    * @usage le(...args)
    * @param args [number] Числа для сравнения
    *
    * @example le(1, 2, 2, 3) => true
    *          le(1, 3, 2) => false
    *          1 <= 2 => true
    *          1 <= 2 <= 2 <= 4 => true
    *          1 <= 10 > 3 => true
    * @category Логические операторы | 6
    */
  const op = "<=";
  if (ast.length === 2 && isArray(ast[1]) && logicalSequencedOperators.includes(ast[1][0])) {
    return unbox(
      [EVAL(ast[0], ctx, rs), EVAL(ast[1][1], ctx, rs)],
      ([a, b]) => {
        // Если false, второе не пытаемся выполнять
        if (!compareFn(op, [a, b])) {
          return false;
        }
        // ast[1][1] уже выполнен
        return EVAL([ast[1][0], ["$AST$", b], ...ast[1].slice(2)], ctx, rs);
      },
      rs?.streamAdapter,
    );
  }
  return unbox(
    ast.map((/** @type {AST} */ arg) => EVAL(arg, ctx, rs)),
    (args) => compareFn(op, args),
    rs?.streamAdapter,
  );
});



_context[">"] = _context["gt"] = _context["greater"] = makeSF((ast, ctx, rs) => {
  /**
    * Проверяет, что каждый последующий аргумент меньше предыдущего.
    *
    * @usage gt(...args)
    * @param args [number] Число для сравнения
    *
    * @example gt(3, 2, 1) => true
    *          gt(3, 1, 2) => false
    *          3 > 2 => true
    *          4 > 3 > 2 > 1 => true
    *          10 > 4 < 6 => true
    * @category Логические операторы | 7
    */
  const op = ">";
  if (ast.length === 2 && isArray(ast[1]) && logicalSequencedOperators.includes(ast[1][0])) {
    return unbox(
      [EVAL(ast[0], ctx, rs), EVAL(ast[1][1], ctx, rs)],
      ([a, b]) => {
        // Если false, второе не пытаемся выполнять
        if (!compareFn(op, [a, b])) {
          return false;
        }
        // ast[1][1] уже выполнен
        return EVAL([ast[1][0], ["$AST$", b], ...ast[1].slice(2)], ctx, rs);
      },
      rs?.streamAdapter,
    );
  }
  return unbox(
    ast.map((/** @type {AST} */ arg) => EVAL(arg, ctx, rs)),
    (args) => compareFn(op, args),
    rs?.streamAdapter,
  );
});



_context[">="] = _context["ge"] = _context["gte"] = makeSF((ast, ctx, rs) => {
  /**
    * Проверяет, что каждый последующий аргумент меньше или равен предыдущему.
    *
    * @usage ge(...args)
    * @param args [number] Числа для сравнения
    *
    * @example ge(3, 2, 2, 1) => true
    *          ge(3, 1, 2) => false
    *          3 >= 2 => true
    *          4 >= 2 >= 2 >= 1 => true
    *          10 >= 4 < 6 => true
    * @category Логические операторы | 8
    */
  const op = ">=";
  if (ast.length === 2 && isArray(ast[1]) && logicalSequencedOperators.includes(ast[1][0])) {
    return unbox(
      [EVAL(ast[0], ctx, rs), EVAL(ast[1][1], ctx, rs)],
      ([a, b]) => {
        // Если false, второе не пытаемся выполнять
        if (!compareFn(op, [a, b])) {
          return false;
        }
        // ast[1][1] уже выполнен
        return EVAL([ast[1][0], ["$AST$", b], ...ast[1].slice(2)], ctx, rs);
      },
      rs?.streamAdapter,
    );
  }
  return unbox(
    ast.map((/** @type {AST} */ arg) => EVAL(arg, ctx, rs)),
    (args) => compareFn(op, args),
    rs?.streamAdapter,
  );
});



_context["not"] = _context["!"] = a => {
  /**
   * Логическое отрицание.
   *
   * @usage not(value)
   * @param value [any] Значение для отрицания
   *
   * @example not true => false
   *          not(false) => true
   *          !0 => true
   * @category Базовые операторы | 10
   */
  return !a;
};



const andSF = _context["&&"] = _context["and"] = makeSF((ast, ctx, rs) => {
  /**
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
   */
  if (ast.length === 0) return true;

  const cond = EVAL(ast[0], ctx, rs);
  if (ast.length === 1) {
    return cond;
  }
  return unbox(
    [cond],
    ([evaledCond]) => evaledCond && andSF(ast.slice(1), ctx, rs),
    rs?.streamAdapter
  );
});



const orSF = _context["||"] = _context["or"] = makeSF((ast, ctx, rs) => {
  /**
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
   */
  if (ast.length === 0) return false;

  const cond = EVAL(ast[0], ctx, rs);
  if (ast.length === 1) {
    return cond;
  }
  return unbox(
    [cond],
    ([evaledCond]) => evaledCond || orSF(ast.slice(1), ctx, rs),
    rs?.streamAdapter
  );
});



const landSF = _context["logicalAnd"] = _context["logical_and"] = makeSF((ast, ctx, rs) => {
  /**
   * Логическое И. Возвращает true, если все выражения истинны.
   *
   * Возвращает true или false.
   * @usage logicalAnd(...exprs)
   * @param exprs [boolean] Выражения для проверки
   *
   * @category Логические операторы | 22
   */
  if (ast.length === 0) return true;

  const cond = EVAL(["toBool", ast[0]], ctx, rs);
  if (ast.length === 1) {
    return cond;
  }
  return unbox(
    [cond],
    ([evaledCond]) => evaledCond && landSF(ast.slice(1), ctx, rs),
    rs?.streamAdapter
  );
});



const lorSF = _context["logicalOr"] = _context["logical_or"] = makeSF((ast, ctx, rs) => {
  /**
   * Логическое ИЛИ. Возвращает true, если хотя бы одно из выражений истинно.
   *
   * Возвращает true или false.
   * @usage logicalOr(...exprs)
   * @param exprs [boolean] Выражения для проверки
   * @example logicalOr(0, 0, 0)
   *
   * @category Логические операторы | 23
   */
  if (ast.length === 0) return false;

  const cond = EVAL(["toBool", ast[0]], ctx, rs);
  if (ast.length === 1) {
    return cond;
  }
  return unbox(
    [cond],
    ([evaledCond]) => evaledCond || lorSF(ast.slice(1), ctx, rs),
    rs?.streamAdapter
  );
});
