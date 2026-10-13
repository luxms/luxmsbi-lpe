import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {artifact} from './artifacts.mjs';
import {root, require, encode} from './shared.mjs';

const lpe = require(resolve(root, 'dist/lpe.js'));
const origin = 'rust-impl/fixtures/production/layout.lpe';
const source = readFileSync(resolve(root, origin), 'utf8');
const structure = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/production/layout-structure.json'), 'utf8'));
const nodes = [];
function visit(node) {
  if (!Array.isArray(node)) return;
  nodes.push(node);
  node.slice(1).forEach(visit);
}
visit(lpe.parse(source));

const cases = [];
function add(id, request, expected, extra = {}) {
  cases.push({id: `production-layout:${id}`, group: 'production-layout', origin,
    evidence: 'production-input-authored-expectation', request: encode(request), expected, ...extra});
}
for (const [ending, text] of [['lf', source], ['crlf', source.replace(/\n/g, '\r\n')]]) {
  for (const lint of [false, true]) {
    add(`roundtrip/${ending}/${lint ? 'formatted' : 'compact'}`,
      {op: 'parse', source: text, options: {lint}},
      {ok: true, relation: 'three stable parse/deparse cycles'},
      {kind: 'roundtrip', evidence: 'production-metamorphic-relation', covers: {apis: ['parse', 'deparse']}});
  }
}

function evaluate(id, ast, context, value) {
  // Only inputs are extracted with JS. Expected values are authored below,
  // never obtained by executing either interpreter.
  const expected = {ok: true, value};
  add(`${id}/ast`, {op: 'evalAst', ast, context}, expected, {covers: {apis: ['eval_lisp']}});
  add(`${id}/source`, {op: 'eval', source: lpe.deparse(ast), context}, expected, {covers: {apis: ['eval_lpe']}});
}

for (const [tabs, active] of structure.tabs) {
  const matches = nodes.filter(node => node[0] === '.' && node[1] === tabs && node[2]?.[0] === 'mapIt');
  assert.equal(matches.length, 1, `Expected exactly one ${tabs}.mapIt expression`);
  const wrap = matches[0][2][1];
  assert.equal(wrap[0], 'wrap');
  const property = name => {
    const matches = wrap.slice(2).filter(node => node[0] === '=' && node[1] === name);
    assert.equal(matches.length, 1, `Expected exactly one ${tabs}.${name} argument`);
    return matches[0][2];
  };
  assert.deepEqual(wrap[1], ['.', 'it', 'title']);
  assert.deepEqual(property('onClick'), ['begin', ['<-', active, 'it']]);
  const title = '\u0422\u0443\u0440\u0438\u043d\u0434\u0443\u0441\u0442\u0440\u0438\u044f';
  evaluate(`${tabs}/title`, wrap[1], {it: {id: 2, title}}, title);
  for (const [state, selection, color, background] of [
    ['selected', {id: 2}, '#4457EC', '#fff'],
    ['unselected', {id: 1}, '#A6A6A6', 'transparent'],
    ['coercing-id', {id: '2'}, '#4457EC', '#fff'],
    ['missing-id', {}, '#A6A6A6', 'transparent'],
  ]) {
    const context = {it: {id: 2, title}, [active]: selection};
    evaluate(`${tabs}/${state}/color`, property('color'), context, color);
    evaluate(`${tabs}/${state}/background`, property('backgroundColor'), context, background);
  }
}

artifact(resolve(root, 'rust-impl/fixtures/production-layout.cases.json'), `${JSON.stringify(cases, null, 2)}\n`);
console.log(`Prepared ${cases.length} production layout round-trip and evaluation fixtures.`);
