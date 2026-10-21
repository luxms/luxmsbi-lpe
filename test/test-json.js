const assert = require('assert');
const lpe = require('../dist/lpe');
const parse = (text, extra = '') => lpe.eval_lpe(`invoke(JSON, 'parse', text${extra})`, {text});
const stringify = (value, extra = '') => lpe.eval_lpe(`invoke(JSON, 'stringify', value${extra})`, {value});

describe('Portable JSON methods', () => {
  it('parses objects through invoke and method access', () => {
    assert.deepStrictEqual(parse('{"a":"b"}'), {a:'b'});
    assert.deepStrictEqual(lpe.eval_lpe(`apply(get(JSON,'parse'),text)`, {text:'[1,true,null]'}), [1,true,null]);
  });
  it('preserves tag-shaped JSON as ordinary data', () => {
    assert.deepStrictEqual(parse('{"$lpe":"undefined"}'), {$lpe:'undefined'});
  });
  it('preserves negative zero and converts large numeric tokens', () => {
    assert(Object.is(parse('-0'), -0));
    assert.strictEqual(parse('1e400'), Infinity);
    assert.strictEqual(parse('9007199254740993'), 9007199254740992);
  });
  it('rejects malformed JSON', () => {
    for (const text of ['', '[1,]', '{"a":1,}', '01', 'null true']) assert.throws(() => parse(text), SyntaxError);
  });
  it('supports reviver values and deletions', () => {
    assert.deepStrictEqual(parse('{"a":1,"b":[2]}', ',(key,value)=>if(isNumber(value),value*2,value)'), {a:2,b:[4]});
    assert.deepStrictEqual(parse('{"a":1,"b":2}', ',(key,value)=>if(key="a",undefined,value)'), {b:2});
    assert.strictEqual(parse('42', ',(key,value)=>undefined'), undefined);
  });
  it('stringifies object data and JavaScript numeric values', () => {
    assert.strictEqual(stringify({a:'b'}), '{"a":"b"}');
    assert.strictEqual(stringify([undefined,NaN,Infinity,-0]), '[null,null,null,0]');
    assert.strictEqual(stringify({a:undefined,b:1}), '{"b":1}');
    assert.strictEqual(stringify(undefined), undefined);
  });
  it('uses JavaScript integer-key ordering', () => {
    assert.strictEqual(stringify({b:1,'10':2,'2':3,a:4}), '{"2":3,"10":2,"b":1,"a":4}');
  });
  it('supports replacers and property lists', () => {
    assert.strictEqual(stringify({a:1,b:2}, ',(key,item)=>if(key="a",undefined,item)'), '{"b":2}');
    assert.strictEqual(stringify({a:1,b:2,c:3}, ',["b","a","b",true,null]'), '{"b":2,"a":1}');
  });
  it('supports indentation with a ten-character limit', () => {
    assert.strictEqual(stringify({a:1}, ',null,100'), '{\n          "a": 1\n}');
    assert.strictEqual(stringify({a:1}, ',null,"--"'), '{\n--"a": 1\n}');
  });
  it('keeps reserved parsed fields as data', () => {
    const text = '{"constructor":1,"__proto__":2}';
    assert.strictEqual(stringify(parse(text)), text);
    assert.throws(() => lpe.eval_lpe('get(value,"constructor")', {value:parse(text)}), error=>error.name==='LPESecurityError');
  });
  it('rejects circular data', () => {
    const value = {}; value.self = value;
    assert.throws(() => stringify(value), TypeError);
  });
});
