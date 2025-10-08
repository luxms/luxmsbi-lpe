const isArray = (arg) => Object.prototype.toString.call(arg) === '[object Array]';
const isString = (arg) => (typeof arg === 'string');
const isNumber = (arg) => (typeof arg === 'number');
const isBoolean = (arg) => arg === true || arg === false;
const isHash = (arg) => (typeof arg === 'object') && (arg !== null) && !isArray(arg);
const isFunction = (arg) => (typeof arg === 'function');


const OPERATORS = {
  '+': true,
  '-': true,
  '*': true,
  '/': true,
  '=': true,
  '@': true,
  'and': '&&',
  'or': '||',
};

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
  if (op === '->') return args.map(deparse).join('.');
  if ((op === '-' || op === '+' || op === '#') && args.length === 1) {
    if (isNumber(args[0]) || isString(args[0])) return op + String(args[0]);
    else return op + deparseWithOptionalBrackets(args[0], op);
  }

  if (OPERATORS[op] === true) {
    return args.map(arg => deparseWithOptionalBrackets(arg, op)).join(' ' + op + ' ');
  }
  if (isString(OPERATORS[op])) {
    return args.map(arg => deparseWithOptionalBrackets(arg, OPERATORS[op])).join(' ' + OPERATORS[op] + ' ');
  }

  if (op === 'begin') return args.map(deparse).join('; ');
  if (op === 'tuple') return '(' + (args.length === 0 ? ',' : args.length === 1 ? deparse(args[0]) + ',' : args.map(deparse).join(', ')) + ')';


  return op + '(' + sexpr.slice(1).map(deparse).join(', ') + ')';
}


export function deparse(lispExpr, options) {
  if (isString(lispExpr)) {
    return lispExpr;

  } else if (isNumber(lispExpr)) {
    return lispExpr.toString();

  } else if (isBoolean(lispExpr)) {
    return lispExpr.toString();

  } else if (isArray(lispExpr) && lispExpr.length === 0) {
    return '[]';

  } else if (lispExpr === null) {
    return 'null';

  } else if (isArray(lispExpr)) {
    return deparseSexpr(lispExpr);

  } else {
    return String(lispExpr);
  }
}
