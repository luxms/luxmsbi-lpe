import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {root, require} from './shared.mjs';

const babel = require('@babel/parser');
export const compatibilityScope = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/scope.json'), 'utf8'));
export const sourceFiles = [...readdirSync(resolve(root, 'src/context')).filter(n => n.endsWith('.js')).map(n => `src/context/${n}`), 'src/lib/datetime.js', 'src/lisp.js'];
export const testFiles = readdirSync(resolve(root, 'test')).filter(n => n.endsWith('.js')).sort().map(n => `test/${n}`);
export const parseFile = file => babel.parse(readFileSync(resolve(root, file), 'utf8'), {sourceType: 'unambiguous'});
export const parseExpression = text => babel.parseExpression(text);
export class RequestReference {
  constructor(request) { this.request = request; }
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

// Intentionally not an evaluator: no function calls, getters, constructors or
// arbitrary test code are executed while extracting independently authored data.
export function literal(node, env = new Map()) {
  if (!node) return undefined;
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return node.value;
  if (node.type === 'NullLiteral') return null;
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
    if (node.type === 'VariableDeclarator' && ['_context', 'STDLIB', 'DATE_TIME'].includes(node.id.name) && node.init?.type === 'ObjectExpression') {
      for (const property of node.init.properties) {
        if (!property.computed && property.key) add(property.key.name ?? property.key.value, file, property);
      }
    }
  });
  return result;
}
