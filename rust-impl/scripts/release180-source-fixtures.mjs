// Explicit expansions of upstream tests that use subprocesses or mutable data.
// Expected dates use host UTC arithmetic, never either LPE implementation.
import {resolve} from 'node:path';
import {root, encode} from './shared.mjs';
import {artifact} from './artifacts.mjs';
const cases = [];
function add(id, group, request, value, kind) {
  cases.push({id:`release180-source:${id}`,group:'Expanded JS 1.8 source tests',origin:group,
    evidence:'independent-expectation', covers:{groups:[group]}, request:encode(request),
    expected:kind ? {ok:false,error:{kind}} : {ok:true,value:encode(value)}});
}
const call = (name,...values) => ({op:'evalAst',ast:[name,...values.map(value=>['$AST$',value])]});
for (const year of [1999,2000,2001,2023,2024]) for (let month=0; month<12;month++) {
  const end=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  for (const day of [1,15,end]) for (const delta of [-7,-1,0,1,7]) {
    const start=new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
    const expected=new Date(Date.UTC(year,month,day+delta)).toISOString().slice(0,10);
    add(`calendar/${start}/${delta}`,'test/date/date.js:726',call('dateShift',start,delta,'d'),expected);
  }
}
for (const unit of ['d','w','m','q','y']) for (const delta of [Infinity,-Infinity,NaN,...(['w','q'].includes(unit)?[Number.MAX_VALUE]:[])]) {
  for(const fn of ['dateShift','extend']) for(const start of ['2024-01-15',['2024-01-01','2024-01-15']])
    add(`finite/${fn}/${unit}/${delta}/${JSON.stringify(start)}`,'test/date/date.js:744',call(fn,start,delta,unit),null,'RangeError');
}
const billion=1000000000n;
for(const start of ['2023-12-31 23:59:59.999999999','2024-02-28 23:59:59.000000001','2024-02-29 00:00:00.123456789','2024-01-15 00:00:00.000000000']) {
  const [seconds,fraction]=start.split('.');
  const ns=BigInt(Date.parse(seconds.replace(' ','T')+'Z'))*1000000n+BigInt(fraction);
  for(const delta of [-86400n*billion,-3600n*billion,-60n*billion,-1250000000n,-125000000n,-1000000n,-1n,0n,1n,1000000n,125000000n,1250000000n,60n*billion,3600n*billion,86400n*billion]) {
    const shifted=ns+delta;
    const expected=new Date(Number(shifted/billion)*1000).toISOString().slice(0,19).replace('T',' ')+'.'+String(shifted%billion).padStart(9,'0');
    add(`nanoseconds/${start}/${delta}`,'test/date/time.js:154',call('dateTimeShift',start,Number(delta)/1e9,'s'),expected);
  }
}
for(const [fn,args,expected] of [
  ['dateTimeShift',['2024-03-10 01:30:00',2,'h'],'2024-03-10 03:30:00'],
  ['dateTimeShift',['2024-03-10 01:30:00-05:00',2,'h'],'2024-03-10 03:30:00-05:00'],
  ['toStart',['2024-03-10 03:30:00','h'],'2024-03-10 03:00:00'],
]) add(`dst/${fn}/${args[0]}`,'test/date/time.js:278',call(fn,...args),expected);
for (const source of [
  'f"{"x"}"', "f'{'x'}'", 'f"a{"b"}c"', 'f"{""}{"x"}{1}"',
  'f"{1}{2}"', 'f"{(1 + 2)}"', 'f"value: {-1}"',
  'f"{f\'nested {"x"}\'}"', 'f"{{text}{"{"}"', String.raw`rf"a\n{"x"}"`,
]) for(const lint of [false,true]) {
  add(`roundtrip/${lint}/${source}`,'test/test-fstring-boundaries.js:12',{op:'parse',source,options:{lint}},undefined);
  Object.assign(cases.at(-1),{kind:'roundtrip',expected:{ok:true,relation:'three stable parse/deparse cycles'}});
}
add('incomplete-interpolation','test/test-lpe-functions.js:1774',{op:'eval',source:'f"{1-}2{2}"'},null,'SyntaxError');
add('update-regex','test/test-deparse-lpe-functions.js:914',{op:'eval',source:'VAR res = update_in({Ivan={id=1},Bob={id=2}},{"/.+/","name"},fn({x,path},nvl(x,path.(0))),true) RETURN [res.Ivan.name,res.Bob.name]'},['Ivan','Bob']);
const context={value:{},key:'__proto__',path:['__proto__'],expression:['get',['$AST$',{}],['q','__proto__']]};
for(const source of ['get_in(value,key)','get_in(value,path)','get(value,key)','property(value,identity(key))',
  'value ~> (key)','identity(get_in(value,key))','map([value],item=>get_in(item,key))',
  'apply(get,value,key)','eval(expression)','let([["item",value]],get_in(item,key))',
  'if(true,get(value,key),0)','get_in(value,"missing",key)'])
  add(`composed/${source}`,'test/test-security.js:36',{op:'eval',source,context},null,'LPESecurityError');
add('array-data','test/test-security.js:122',{op:'eval',source:'[get_in(items,1),get_in(text,0)]',context:{items:['probe',42],text:'other',other:['wrong']}},[42,'o']);
for(const source of ['set(vector,"__isSpecialForm",true)','vector.__ast := [1]','get(vector,"__docFunction")','values(vector)'])
  add(`internals/${source}`,'test/test-security.js:168',{op:'eval',source},null,'LPESecurityError');
add('assoc-path','test/test-security.js:238',{op:'eval',source:'begin(assoc_in(obj,path,42),[obj,path])',context:{obj:{},path:['items',0,'value']}},[{items:[{value:42}]},['items',0,'value']]);
add('copy-array','test/test-security.js:245',{op:'eval',source:'begin(cp([source,sourceKey],[target,targetKey]),target.value)',context:{source:['probe',42],target:[],sourceKey:1,targetKey:'value',value:'wrong'}},42);
add('then-special','test/test-unsafe.js:114',{op:'eval',source:'{then=q}'},null,'LPESecurityError');
artifact(resolve(root,'rust-impl/fixtures/release180-source.cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log(`Prepared ${cases.length} explicit source expansions.`);
