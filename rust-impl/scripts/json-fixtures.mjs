import {resolve} from 'node:path';
import {root, encode} from './shared.mjs';
import {artifact} from './artifacts.mjs';

const cases = [];
function add(id, source, expected, context = {}) {
  cases.push({id:`json:${id}`, group:'Portable JSON object', origin:'rust-impl/scripts/json-fixtures.mjs',
    evidence:'independent-expectation', request:{op:'eval',source,context:encode(context)}, expected});
}
const value = (id, source, expected, context) => add(id, source, {ok:true,value:encode(expected)}, context);
const error = (id, source, kind, context) => add(id, source, {ok:false,error:{kind}}, context);
for (const method of ['invoke(JSON,"parse",text)', 'JSON ~> parse(text)', 'apply(JSON ~> parse,text)', 'apply(get(JSON,"parse"),text)']) {
  for (const [text, expected] of [
    ['{"a":"b"}',{a:'b'}], ['[true,null,42,"😀"]',[true,null,42,'😀']],
    ['-0',-0], ['1e400',Infinity], ['-1e400',-Infinity], ['9007199254740993',9007199254740992],
    ['{"b":1,"a":2,"b":3}',{b:3,a:2}], ['{"$lpe":"undefined"}',{$lpe:'undefined'}],
    ['"\\ud83d\\ude00"','😀'], ['"󰀀"','󰀀'],
  ]) value(`parse/${method}/${text}`,method,expected,{text});
}
for (const text of ['', '{', '[1,]', '{"a":1,}', '01', 'NaN', 'undefined', 'null true', '"\n"'])
  error(`parse-error/${text}`,'invoke(JSON,"parse",text)','SyntaxError',{text});
for (const method of ['invoke(JSON,"stringify",value)', 'JSON ~> stringify(value)', 'apply(JSON ~> stringify,value)', 'apply(get(JSON,"stringify"),value)']) {
  for (const [input, expected] of [
    [{a:'b'},'{"a":"b"}'], [[true,null,42,'😀'],'[true,null,42,"😀"]'],
    [undefined,undefined], [NaN,'null'], [-0,'0'], [Infinity,'null'], [1e21,'1e+21'], [1e-7,'1e-7'],
    [{a:undefined,b:1},'{"b":1}'], [[undefined,NaN,Infinity],'[null,null,null]'],
    [{b:1,'10':2,'2':3,a:4},'{"2":3,"10":2,"b":1,"a":4}'],
    ['"\n\t\\\b\f\r\u0000','"\\\"\\n\\t\\\\\\b\\f\\r\\u0000"'],
  ]) value(`stringify/${method}/${JSON.stringify(encode(input))}`,method,expected,{value:input});
}
value('tags-are-data','invoke(JSON,"stringify",invoke(JSON,"parse",text))','{"$lpe":"undefined"}',{text:'{"$lpe":"undefined"}'});
value('object-type','type(JSON)','object');
value('object-keys','keys(JSON)',[]);
value('object-serialize','invoke(JSON,"stringify",JSON)','{}');
value('method-metadata','[get(JSON,"parse").name,get(JSON,"parse").length,get(JSON,"stringify").name,get(JSON,"stringify").length]', ['parse',2,'stringify',3]);
value('parse-coercion','[invoke(JSON,"parse",42),invoke(JSON,"parse",true),invoke(JSON,"parse",null)]',[42,true,null]);
value('reviver','invoke(JSON,"parse",text,(key,value)=>if(isNumber(value),value*2,value))',{a:2,b:[4,6]}, {text:'{"a":1,"b":[2,3]}'});
value('reviver-deletion','invoke(JSON,"parse",text,(key,value)=>if(key="a",undefined,value))',{b:2},{text:'{"a":1,"b":2}'});
value('reviver-root-deletion','invoke(JSON,"parse",text,(key,value)=>undefined)',undefined,{text:'42'});
value('replacer','invoke(JSON,"stringify",value,(key,item)=>if(key="a",undefined,item))','{"b":2}',{value:{a:1,b:2}});
value('property-list','invoke(JSON,"stringify",value,["b","a","b",true,null])','{"b":2,"a":1}',{value:{a:1,b:2,c:3}});
value('pretty','invoke(JSON,"stringify",value,null,2)','{\n  "a": [\n    1,\n    2\n  ]\n}',{value:{a:[1,2]}});
value('pretty-limit','invoke(JSON,"stringify",value,null,100)','{\n          "a": 1\n}',{value:{a:1}});
value('pretty-string','invoke(JSON,"stringify",value,null,"--")','{\n--"a": 1\n}',{value:{a:1}});
value('function-omission','invoke(JSON,"stringify",{a=(x=>x),b=1})','{"b":1}');
value('to-json','invoke(JSON,"stringify",{toJSON=(key=>[key,42])})','["",42]');
error('circular','begin(obj:={=},obj.self:=obj,invoke(JSON,"stringify",obj))','TypeError');
for (const source of ['set(JSON,"parse",x=>x)', 'del(JSON,"parse")', 'get(JSON,"constructor")',
  'invoke(JSON,"parse","1",if)', 'invoke(JSON,"stringify",1,if)']) error(source,source,'LPESecurityError');
artifact(resolve(root,'rust-impl/fixtures/json.cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log(`Prepared ${cases.length} JSON cases.`);
