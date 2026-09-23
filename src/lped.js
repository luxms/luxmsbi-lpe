const isArray = (arg) => Object.prototype.toString.call(arg) === '[object Array]';
const isString = (arg) => (typeof arg === 'string');
const isNumber = (arg) => (typeof arg === 'number');
const isBoolean = (arg) => arg === true || arg === false;


// Те же binding powers, что у Pratt-парсера в lpep.js.
const PRIORITY = Object.create(null);
for (const [priority, operators] of [
  [2, [':']], [20, [':=', '<-']], [21, ['=>']],
  [30, ['and', 'or', 'nor', 'nand', 'car', 'cdr', '⍴', 'in', 'is']],
  [40, ['~', '!~', '=', '==', '===', '!==', '!=', '<', '<=', '>', '>=', '<>', '@']],
  [50, ['+', '-', '#']], [60, ['*', '/']],
  [70, ['.', '..', '->', '->>']], [90, ['::']],
]) for (const op of operators) PRIORITY[op] = priority;
const SPELLING = {and: '&&', or: '||', nor: '⍱', nand: '⍲', car: '⊣', cdr: '⊢'};
const LEFT_ASSOC = new Set(['<-', '=>', '+', '-', '#', '*', '/', '.', '..', '->', '->>']);
const CALLABLE_OPERATORS = new Set(['and', 'or', 'nor', 'nand', 'car', 'cdr']);
const isUnary = (expr) => isArray(expr) && expr.length === 2 && ['+', '-', '#', '@', 'not'].includes(expr[0]);

function fixString(s) {
  return s.replace(/[\\'"\x00-\x1f]/g, char => ({
    '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f',
    '"': '\\"', "'": "\\'", '\\': '\\\\',
  }[char] ?? '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));
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

  function priority(expr) {
    if (!isArray(expr) || !expr.length || !isString(expr[0])) return 100;
    if (isUnary(expr)) return 70;
    if (CALLABLE_OPERATORS.has(expr[0]) && expr.length !== 3) return 80;
    return PRIORITY[expr[0]] ?? 100;
  }

  function needsBrackets(expr, bp, side, op) {
    const childBP = priority(expr);
    return !(side === 'right' && isUnary(expr)) && (childBP < bp || (childBP === bp &&
      (side === 'right' ? LEFT_ASSOC.has(op) : !isUnary(expr) && !LEFT_ASSOC.has(expr[0]))));
  }

  function operand(expr, bp, side, op, wordNames = false) {
    if (!needsBrackets(expr, bp, side, op)) return deparse(expr, wordNames);
    // and(and(a,b),c) нельзя превратить в (a && b) && c: это добавляет узел ().
    if (isArray(expr) && (CALLABLE_OPERATORS.has(expr[0]) || wordNames && ['in', 'is', 'not'].includes(expr[0]))) {
      return call(expr[0], expr.slice(1), undefined, wordNames);
    }
    return '(' + deparse(expr) + ')';
  }

  // Первый токен после запятой парсер читает в другом scope: in/is/not могут быть именами.
  // wordNames передаём только до первого токена аргумента, не внутрь его подвыражений.
  function call(op, args, renderedArgs, wordNames = false) {
    const name = isArray(op) ? operand(op, 80, 'left', '(', wordNames) : String(op);
    const text = makeMultilineArgs(renderedArgs ?? args.map((arg, i) => arg === undefined ? '' : deparse(arg, i > 0)), ',', name.length + 1);
    return name + '(' + text + ')';
  }

  function deparseSexpr(sexpr, wordNames) {
    const op = sexpr[0];
    const args = sexpr.slice(1);
    if (op === '"' || op === "'") {
      const prefix = args[1] ?? '';
      return prefix + op + (prefix === 'r' ? args[0] : fixString(args[0])) + op;
    }
    if (op === '[]') return (args[1] ?? '') + '[' + args[0] + ']';
    if (op === '[') return '[' + args.map(arg => deparse(arg)).join(', ') + ']';
    if (op === '()') return '(' + args.map(arg => deparse(arg)).join(', ') + ')';
    if (op === 'tuple') return '(' + (args.length === 0 ? ',' : args.length === 1 ? deparse(args[0]) + ',' : args.map(arg => deparse(arg)).join(', ')) + ')';
    if (op === 'let*' && args.length === 2 && isArray(args[0]) && args[0][0] === '[' &&
        args[0].length > 1 && args[0].slice(1).every(binding => isArray(binding) && binding[0] === '[' && binding.length === 3)) {
      return args[0].slice(1).map(binding => 'VAR ' + binding[1] + ' = ' + deparse(binding[2])).join(lint ? '\n' : ' ') +
        (lint ? '\n' : ' ') + 'RETURN ' + deparse(args[1]);
    }
    if (isUnary(sexpr)) {
      const text = operand(args[0], 70, 'right', 'unary');
      return op === 'not' ? '!' + text : op + (op === '-' && text.startsWith('-') ? ' ' : '') + text;
    }
    if (wordNames && ['in', 'is'].includes(op)) return call(op, args);
    if (isString(op) && Object.prototype.hasOwnProperty.call(PRIORITY, op)) {
      if (CALLABLE_OPERATORS.has(op) && (args.length !== 2 ||
          args.some((arg, i) => needsBrackets(arg, PRIORITY[op], i ? 'right' : 'left', op)))) return call(op, args);
      const parts = args.map((arg, i) => operand(arg, PRIORITY[op], i ? 'right' : 'left', op, i === 0 && wordNames));
      // После запятой lexer допускает эти имена; в infix-позиции это уже ключевые слова.
      if (CALLABLE_OPERATORS.has(op) && /^(not|and|or|in|is)\b/.test(parts[1])) return call(op, args, parts);
      if (op === '.') return parts.reduce((text, part) => text + (/\d$/.test(text) ? ' .' : '.') + part);
      return makeMultilineArgs(parts, ' ' + (SPELLING[op] ?? op), 0);
    }
    return call(op, args, undefined, wordNames);
  }

  function deparse(value, wordNames = false) {
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
      return deparseSexpr(value, wordNames);

    } else {
      return String(value);
    }
  }

  // Если begin идет первым оператором, то его депарсим особенным образом
  function deBegin(expr) {
    if (Array.isArray(expr) && expr[0] === 'begin' && expr.length > 2) {
      const args = expr.slice(1);
      const parts = args.map(arg => deparse(arg));
      if (args.includes(undefined) || parts.some(text => /^(not|and|or|in|is)\b/.test(text))) return call('begin', args);
      return parts.join(';' + (lint ? '\n' : ' '));
    } else {
      return deparse(expr);
    }
  }

  return deBegin(lispExpr);
}
