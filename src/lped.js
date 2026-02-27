const isArray = (arg) => Object.prototype.toString.call(arg) === '[object Array]';
const isString = (arg) => (typeof arg === 'string');
const isNumber = (arg) => (typeof arg === 'number');
const isBoolean = (arg) => arg === true || arg === false;
const isHash = (arg) => (typeof arg === 'object') && (arg !== null) && !isArray(arg);
const isFunction = (arg) => (typeof arg === 'function');


const OPERATORS = {
  // ...
  'and': '&&',
  'or': '||',
};

// simpleOperators
['+', '-', '*', '=', '@',
  '->', ':=', '<-', '=>',
  '<', '>', '<=', '>='].forEach(op => OPERATORS[op] = true);

const PRIORITY = {
  '=': 40,
  '*': 20,
  '+': 10,
  '-': 10,
  '||': 5,
};

const safeReplace = {
  '\n': '\\n',
  '\r': '\\r',
  '\"': '\\"',
  '\'': '\\\'',
  '\\': '\\\\',
};

function fixString(s) {
  return s.split('').map(char => char in safeReplace ? safeReplace[char] : char).join('');
}


export function deparse(lispExpr, opts) {
  const lint = opts?.lint;

  // Если включен lint и аргументы получаются довольно длинными, будем рисовать их на разных строках с отступом
  function makeMultilineArgs(args, joiner, indentation) {
    const INDENT = ''.padEnd(indentation ?? 2, ' ');
    let oneliner = args.join(joiner + ' ');
    if (lint && (oneliner.includes('\n') || oneliner.length > 120)) {
      const result = args.map((arg, i) => {
        // Сдвигаем на пробелы всех кроме первой строки первого аргумента
        if (i === 0) return arg.split('\n').map((l, i) => (i ? INDENT : '') + l).join('\n');
        return arg.split('\n').map(l => INDENT + l).join('\n');
      }).join(joiner + '\n');
      return result;
    }
    return oneliner;
  }

  function deparseWithOptionalBrackets(sexpr, op) {
    const res = deparse(sexpr);
    if (isArray(sexpr) && sexpr.length && OPERATORS[sexpr[0]]) {

      if (op === sexpr[0]) {
        return res;
      }

      const priority1 = PRIORITY[op];
      const priority2 = PRIORITY[sexpr[0]];

      if (priority1 && priority2 && priority1 < priority2) {                                          // no need on brackets
        return res;
      }

      return '(' + res + ')';
    } else {
      return res;
    }
  }

  function deparseSexpr(sexpr) {
    const op = sexpr[0];
    const args = sexpr.slice(1);
    if (op === '"') return (args[1] ?? '') + '"' + fixString(args[0]) + '"';
    if (op === '\'') return (args[1] ?? '') + '\'' + fixString(args[0]) + '\'';
    if (op === '[]') return (args[1] ?? '') + '[' + fixString(args[0]) + ']';
    if (op === '[') return '[' + args.map(deparse).join(', ') + ']';
    if (op === '()') return '(' + args.map(deparse).join(', ') + ')';
    if (op === '.') return args.map(deparse).join('.');
    if ((op === '-' || op === '+' || op === '#') && args.length === 1) {                            // Унарные операторы
      if (isNumber(args[0]) || isString(args[0])) return op + String(args[0]);
      else return op + deparseWithOptionalBrackets(args[0], op);
    }

    if (OPERATORS[op] === true) {                                                                   // Мультинарные операторы
      return makeMultilineArgs(args.map(arg => deparseWithOptionalBrackets(arg, op)), ' ' + op, 0); // тут отступ 0
    }
    if (isString(OPERATORS[op])) {
      return args.map(arg => deparseWithOptionalBrackets(arg, OPERATORS[op])).join(' ' + OPERATORS[op] + ' ');
    }

    if (op === 'tuple') return '(' + (args.length === 0 ? ',' : args.length === 1 ? deparse(args[0]) + ',' : args.map(deparse).join(', ')) + ')';

    // Функция
    // For word operators like "not" that can be used prefix without brackets (e.g. "not a"),
    // collapse a single '()' argument to avoid double parens:
    //   ["not", ["()", "a"]] → not(a)  (not not((a)))
    // Regular functions preserve explicit brackets:
    //   ["f", ["()", "a"]] → f((a))
    let argsForCall = args;
    if (op in OPERATORS || op === 'not') {
      if (args.length === 1 && isArray(args[0]) && args[0][0] === '()') {
        argsForCall = args[0].slice(1);
      }
    }
    const strArgJoined = makeMultilineArgs(argsForCall.map(deparse), ',', op.length + 1);          // отступ в пробелах
    return op + '(' + strArgJoined + ')';
  }

  function deparse(value) {
    if (isString(value)) {
      return value;

    } else if (isNumber(value)) {
      return value.toString();

    } else if (isBoolean(value)) {
      return value.toString();

    } else if (isArray(value) && value.length === 0) {
      return '[]';

    } else if (value === null) {
      return 'null';

    } else if (isArray(value)) {
      return deparseSexpr(value, opts?.lint);

    } else {
      return String(value);
    }
  }

  // Если begin идет первым оператором, то его депарсим особенным образом
  function deBegin(expr) {
    if (Array.isArray(expr) && expr[0] === 'begin') {
      return expr.slice(1).map(deparse).join(';' + (lint ? '\n' : ' '));
    } else {
      return deparse(expr);
    }
  }

  return deBegin(lispExpr);
}
