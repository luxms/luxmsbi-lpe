import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {root, require} from './shared.mjs';

const babel = require('@babel/parser');
export const compatibilityScope = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/scope.json'), 'utf8'));
export const sourceFiles = [...readdirSync(resolve(root, 'src/context')).filter(n => n.endsWith('.js')).map(n => `src/context/${n}`), 'src/lib/date/date.js', 'src/lib/date/time.js', 'src/lisp.js'];
function findTests(directory) {
  return readdirSync(resolve(root, directory), {withFileTypes: true}).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? findTests(file) : entry.name.endsWith('.js') ? [file] : [];
  }).sort();
}
export const testFiles = findTests('test');
export const parseFile = file => babel.parse(readFileSync(resolve(root, file), 'utf8'), {sourceType: 'unambiguous'});
export const parseExpression = text => babel.parseExpression(text);
export class RequestReference {
  constructor(request) { this.request = request; }
}
export class StaticCallback {
  constructor(body, env) { this.body = body; this.env = new Map(env); }
}
export function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(n => walk(n, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
export function callName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'MemberExpression' && !node.computed) return `${callName(node.object)}.${node.property.name}`;
  return '';
}

// A bounded static interpreter for independent test data only. It never calls
// LPE or arbitrary test functions; the small pure-operation allowlist below
// expands tables without deriving expectations from the implementation.
export function literal(node, env = new Map()) {
  if (!node) return undefined;
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return node.value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'ArrowFunctionExpression' && node.params.length === 0 && node.body.type !== 'BlockStatement')
    return new StaticCallback(node.body, env);
  if (node.type === 'Identifier') {
    if (env.has(node.name)) {
      const value = env.get(node.name);
      if (value instanceof RequestReference) throw new Error(`API result ${node.name} is not an independent literal`);
      return value;
    }
    if (node.name === 'undefined') return undefined;
    if (node.name === 'NaN') return NaN;
    if (node.name === 'Infinity') return Infinity;
    throw new Error(`nonliteral identifier ${node.name}`);
  }
  if (node.type === 'ArrayExpression') return node.elements.map(n => literal(n, env));
  if (node.type === 'ObjectExpression') {
    return Object.fromEntries(node.properties.map(p => {
      if (p.type !== 'ObjectProperty' || p.computed) throw new Error('computed/spread object');
      return [p.key.name ?? p.key.value, literal(p.value, env)];
    }));
  }
  if (node.type === 'UnaryExpression') {
    const value = literal(node.argument, env);
    if (node.operator === '-') return -value;
    if (node.operator === '+') return +value;
    if (node.operator === '!') return !value;
    throw new Error(`unary ${node.operator}`);
  }
  if (node.type === 'BinaryExpression') {
    const left = literal(node.left, env), right = literal(node.right, env);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return left / right;
  }
  if (node.type === 'MemberExpression') {
    if (callName(node) === 'Number.MAX_VALUE') return Number.MAX_VALUE;
    const object = literal(node.object, env);
    const key = node.computed ? literal(node.property, env) : node.property.name;
    const descriptor = Object.getOwnPropertyDescriptor(Object(object), key);
    if (descriptor && 'value' in descriptor) return descriptor.value;
  }
  if (node.type === 'CallExpression') {
    const name = callName(node.callee);
    const values = node.arguments.map(argument => literal(argument, env));
    if (name === 'JSON.stringify') return JSON.stringify(values[0]);
    if (name === 'JSON.parse') return JSON.parse(values[0]);
    if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
      const receiver = literal(node.callee.object, env);
      const method = node.callee.property.name;
      if (typeof receiver === 'string' && ['toUpperCase', 'toLowerCase', 'trim', 'slice'].includes(method))
        return String.prototype[method].apply(receiver, values);
      if (Array.isArray(receiver) && method === 'slice') return Array.prototype.slice.apply(receiver, values);
    }
  }
  if (node.type === 'TemplateLiteral') return node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? String(literal(node.expressions[i], env)) : '')).join('');
  if (node.type === 'TaggedTemplateExpression' && callName(node.tag) === 'String.raw' && !node.quasi.expressions.length) return node.quasi.quasis[0].value.raw;
  throw new Error(`nonliteral ${node.type}`);
}

export function declarations() {
  const result = new Map();
  const add = (name, file, node) => {
    if (typeof name !== 'string') return;
    const list = result.get(name) || [];
    list.push(`${file}:${node.loc.start.line}`);
    result.set(name, list);
  };
  for (const file of sourceFiles) walk(parseFile(file), node => {
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.object.name === '_context') {
      try { add(node.left.computed ? literal(node.left.property) : node.left.property.name, file, node); } catch {}
    }
    if (node.type === 'VariableDeclarator' && ['_context', 'STDLIB', 'DATE_TIME', 'DATE_FUNCTIONS', 'TIME_FUNCTIONS'].includes(node.id.name) && node.init?.type === 'ObjectExpression') {
      for (const property of node.init.properties) {
        if (!property.computed && property.key) add(property.key.name ?? property.key.value, file, property);
      }
    }
  });
  return result;
}
