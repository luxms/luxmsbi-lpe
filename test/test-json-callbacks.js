const assert = require('assert');
const lpe = require('../dist/lpe');
const denied = error => error.code === 'LPE_SECURITY';
const stringify = value => lpe.eval_lpe('invoke(JSON, "stringify", value)', {value});

describe('JSON callback boundaries', () => {
  it('checks implicit callbacks at every visited object', () => {
    for (const toJSON of [lpe.STDLIB.q, lpe.STDLIB.vector]) {
      for (const value of [{toJSON}, {child: {toJSON}}, {toJSON() { return {child: {toJSON}}; }}]) {
        assert.throws(() => stringify(value), denied);
      }
    }
  });

  it('does not invoke property accessors while serializing', () => {
    let reads = 0;
    for (const key of ['toJSON', 'answer']) {
      const value = Object.defineProperty({}, key, {enumerable:true, get() { reads++; return 42; }});
      assert.throws(() => stringify(value), denied);
    }
    assert.strictEqual(reads, 0);
  });

  it('calls ordinary toJSON and replacer callbacks once with their receivers', () => {
    const calls = [];
    const value = {answer: 42, toJSON(key) { calls.push(['toJSON', key, this === value]); return {answer:this.answer}; }};
    function replacer(key, item) { calls.push(['replacer', key, this[key] === item]); return item; }
    assert.strictEqual(lpe.eval_lpe('invoke(JSON,"stringify",value,replacer)', {value,replacer}), '{"answer":42}');
    assert.deepStrictEqual(calls, [['toJSON','',true], ['replacer','',false], ['replacer','answer',true]]);
  });

  it('preserves standard data formatting and filtering', () => {
    const value = {b:[1,undefined,NaN],a:new Date('2024-01-01T00:00:00Z'),hidden:undefined,callback:()=>42};
    for (const [replacer,space] of [[null,undefined], [null,2], [['a','b'], '--'], [['b','a','b'],20]]) {
      assert.strictEqual(lpe.eval_lpe('invoke(JSON,"stringify",value,replacer,space)', {value,replacer,space}), JSON.stringify(value,replacer,space));
    }
    assert.strictEqual(stringify(JSON.parse('{"__proto__":1,"constructor":2}')), '{"__proto__":1,"constructor":2}');
    assert.strictEqual(stringify(JSON), '{}');
    assert.strictEqual(stringify(undefined), undefined);
    assert.strictEqual(stringify(()=>42), undefined);
  });

  it('retains parsed values, reviver deletion, and numeric boundaries', () => {
    const source = '{"a":1,"b":[2,3],"zero":-0}';
    const reviver = (key,value) => key === 'a' ? undefined : value;
    assert.deepStrictEqual(lpe.eval_lpe('invoke(JSON,"parse",source,reviver)', {source,reviver}), JSON.parse(source,reviver));
    assert.strictEqual(lpe.eval_lpe('invoke(JSON,"parse","1e400")'), Infinity);
  });

  it('rejects circular data and permits repeated sibling references', () => {
    const value = {answer:42};
    assert.strictEqual(stringify([value,value]), '[{"answer":42},{"answer":42}]');
    value.self = value;
    assert.throws(() => stringify(value), TypeError);
  });

  it('reads replacer lists as data and preserves their property order', () => {
    const value = {'2': 'two', '1': 'one', a: 42};
    const replacer = ['2', '1', 'a'];
    replacer.map = () => { throw new Error('not a method call'); };
    assert.strictEqual(lpe.eval_lpe('invoke(JSON,"stringify",value,replacer)', {value,replacer}), '{"2":"two","1":"one","a":42}');
    let reads = 0;
    Object.defineProperty(replacer, 0, {get() { reads++; return 'a'; }});
    assert.throws(() => lpe.eval_lpe('invoke(JSON,"stringify",value,replacer)', {value,replacer}), denied);
    assert.strictEqual(reads, 0);
  });
});
