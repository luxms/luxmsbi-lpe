// Independent portable expectations for the JS 1.8 safe language contract.
import {resolve} from 'node:path';
import {root, encode} from './shared.mjs';
import {artifact} from './artifacts.mjs';

const cases = [];
function add(id, source, expected, context = {}) {
  cases.push({id: `release180:${id}`, group: 'JS 1.8 safe compatibility',
    origin: 'rust-impl/scripts/release180-fixtures.mjs', evidence: 'independent-expectation',
    request: {op: 'eval', source, context: encode(context)}, expected});
}
const value = (id, source, result, context) => add(id, source, {ok:true, value:encode(result)}, context);
const error = (id, source, kind = 'LPESecurityError', context) => add(id, source, {ok:false,error:{kind}}, context);
for (const key of ['constructor','prototype','__proto__','caller','callee','arguments',
  '__defineGetter__','__defineSetter__','__lookupGetter__','__lookupSetter__']) {
  for (const source of ['get(obj,key)', 'get_in(obj,key)', 'property(obj,identity(key))', 'obj.(key)',
    'set(obj,key,1)', 'del(obj,key)', 'fromEntries([[key,1]])',
    'assoc_in(obj,["new",key],1)', 'update_in(obj,["new",key],x=>1)',
    'let([[key,1]],42)', 'makeHash(key=1)', 'frequencies([key])']) {
    error(`${key}/${source}`, source, 'LPESecurityError', {obj:{},key});
  }
  error(`read-own/${key}`, 'get(obj,key)', 'LPESecurityError', {obj:{[key]:42},key});
  error(`values/${key}`, 'values(obj)', 'LPESecurityError', {obj:{[key]:42}});
  error(`merge/${key}`, 'merge([{},obj])', 'LPESecurityError', {obj:{[key]:42}});
  error(`bind/${key}`, `${key} := 1`);
  error(`undef/${key}`, `undef(${JSON.stringify(key)})`);
  error(`parameter/${key}`, `apply(fn([${key}],42),1)`);
}
for (const key of [true,false,null,undefined,{},[1]]) {
  for (const source of ['get(obj,key)', 'get_in(obj,[key])', 'set(obj,key,1)', 'property(obj,identity(key))'])
    error(`key-type/${JSON.stringify(key)}/${source}`,source,'LPESecurityError',{obj:{},key});
}
for (const source of ['apply(if,true,1,2)','apply(eval_lpe,"1+1")','map([1],if)',
  'get(fn,"__ast")','values(fn)','set(fn,"name",1)']) {
  error(`call/${source}`,source,'LPESecurityError',{ });
  if (source.includes('fn')) cases.at(-1).request.source = `let([["fn",x=>x]],${source})`;
}
value('array-is-data', 'get_in(items,1)', 42, {items:['+',42,99]});
value('string-is-data', 'get_in(text,0)', 'o', {text:'other',other:['wrong']});
value('quoted-root', 'get_in("obj",["a",1,"b"])',42,{obj:{a:[null,{b:42}]}});
value('own-undefined', 'get(obj,"a",9)',undefined,{obj:{a:undefined}});
value('assoc-path-stable','begin(obj:={=},p:=["a",0,"b"],assoc_in(obj,p,42),[obj,p])',
  [{a:[{b:42}]},['a',0,'b']]);
value('copy-data','begin(cp([source,sourceKey],[target,targetKey]),target)',{answer:42},
  {source:['+',42,99],sourceKey:1,target:{},targetKey:'answer',answer:'wrong'});
value('frequencies-primitives','frequencies([true,false,true,null,undefined])',
  {true:2,false:1,null:1,undefined:1});
for (const source of ['{then=if}', 'identity({then=vector})', 'get({a={then=q}},"a")'])
  error(`then-callback/${source}`, source);
value('uncalled-parameter', 'isFunction(fn([constructor],42))', true);
value('closure-apply','apply((x,y)=>x+y,20,22)',42);
value('closure-map','map([1,2,3],x=>x*2)',[2,4,6]);
for (const source of ['get_in(obj,["absent","constructor"])','assoc_in(obj,[],1)','update_in(obj,[],x=>1)'])
  error(`path/${source}`,source,source.includes('constructor')?'LPESecurityError':'TypeError',{obj:{}});
for (const [source,result] of [
  [`f'hello {1+1}'`,'hello 2'], [`f'{{literal} {"x"}'`,'{literal} x'],
  [`f'outer {f"inner {2*3}"}'`,'outer inner 6'], [`f'{"x"}{"y"}'`,'xy'],
  [`begin(x3y:=12,_f'x{1+2}y')`,12], [`fJSON'{{"a":{1+1}}'`,{a:2}],
  [`JSON'{"a":1}'`,{a:1}], [`AST'1+2'`,['+',1,2]], [`EVAL'20+22'`,42],
  [`begin(x:=40,fEVAL'x+{2}')`,42], [`begin(def("str>ARR",v=>[v]),ARR'text')`,['text']],
]) value(`string/${source}`,source,result);
for (const [source,result] of [
  [`dateTimeShift('2024-01-31 12:34:56',1,'m')`,'2024-02-29 12:34:56'],
  [`dateTimeShift('2100-01-31T23:59:59.000000001+03:30',1,'m')`,'2100-02-28 23:59:59.000000001+03:30'],
  [`dateTimeShift('2024-01-01 00:00:00.1Z',-0.2,'s')`,'2023-12-31 23:59:59.9Z'],
  [`dateTimeShift('0000-01-01',1,'d')`,'0000-01-02 00:00:00'],
  [`dateShift('2024-01-15 23:30:00',2,' HOUR ')`,'2024-01-16 01:30:00'],
  [`toStart('2024-01-15T12:34:56.123+03:00','mi')`,'2024-01-15 12:34:00+03:00'],
  [`toEnd('2024-01-15','d')`,'2024-01-15 23:59:59'],
  [`bound('2024-01-15','d')`,['2024-01-15','2024-01-15 23:59:59']],
  [`extract('2024-01-15 12:34:56.123-03:30','n')`,34],
  [`extend(['2024-01-15 12:00:00+03:00','2024-01-15 09:00:00Z'],-1,'s')`,
    ['2024-01-15 08:59:59Z','2024-01-15 12:00:00+03:00']],
]) value(`time/${source}`,source,result);
for (const text of ['2023-02-29','2024-13-01','2024-01-01 24:00:00','2024-01-01 12:60:00',
  '2024-01-01 00:00:60','2024-01-01 00:00:00+24:00','2024-01-01 00:00:00.1234567890'])
  error(`invalid-date/${text}`,`dateTimeShift(${JSON.stringify(text)},0,'s')`,'RangeError');
for (const source of [`dateTimeShift('9999-12-31',1,'d')`,`dateTimeShift('0000-01-01',-1,'m')`,
  `dateTimeShift('2024-01-01',1.5,'m')`,`dateTimeShift('2024-01-01','1','s')`,
  `dateShift('2024-01-01',NaN,'d')`]) error(`invalid-shift/${source}`,source,'RangeError');
artifact(resolve(root,'rust-impl/fixtures/release180.cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log(`Prepared ${cases.length} JS 1.8 safe language cases.`);
