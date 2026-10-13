import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {root, require, encode} from './shared.mjs';

const lpe = require(resolve(root, 'dist/lpe.js'));
const source = readFileSync(resolve(root, 'rust-impl/fixtures/production/layout.lpe'), 'utf8');
const structure = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/production/layout-structure.json'), 'utf8'));
const cases = JSON.parse(readFileSync(resolve(root, 'rust-impl/fixtures/production-layout.cases.json'), 'utf8'));

test('production layout preserves its structure and widget order', () => {
  assert.ok(source.startsWith('lpe:vbox('));
  const ast = lpe.parse(source);
  const calls = {};
  const widgets = [];
  const tabs = [];
  function visit(node) {
    if (!Array.isArray(node)) return;
    calls[node[0]] = (calls[node[0]] || 0) + 1;
    if (node[0] === '#') widgets.push(node[1]);
    if (node[0] === '.' && node[2]?.[0] === 'mapIt') {
      const click = node[2][1].find(arg => arg?.[0] === '=' && arg[1] === 'onClick');
      tabs.push([node[1], click[2][1][1]]);
    }
    node.slice(1).forEach(visit);
  }
  visit(ast);
  assert.deepEqual({root: ast[0], calls, widgets, tabs}, structure);
});

for (const fixture of cases) {
  test(fixture.id, async () => {
    const {request, expected} = fixture;
    if (fixture.kind === 'roundtrip') {
      assert.equal(request.source.replace(/\r\n/g, '\n'), source);
      const ast = lpe.parse(request.source, request.options);
      assert.deepEqual(ast, lpe.parse(source));
      let current = ast;
      let first;
      for (let cycle = 0; cycle < 3; cycle++) {
        const rendered = lpe.deparse(current, request.options);
        if (cycle) assert.equal(rendered, first);
        first = rendered;
        current = lpe.parse(rendered, request.options);
        assert.deepEqual(current, ast);
      }
    } else {
      const context = structuredClone(request.context);
      const value = request.op === 'eval'
        ? await lpe.eval_lpe(request.source, context)
        : await lpe.eval_lisp(request.ast, context);
      assert.deepEqual(encode(value), expected.value);
    }
  });
}
