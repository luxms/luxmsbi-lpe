import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {root, require, encode, decode, jsonLines} from './shared.mjs';
import {runStreamScenario} from './stream-fixtures.mjs';

// Keep LPE print/prn diagnostics out of the newline JSON transport.
console.log = (...values) => console.error(...values);
const lpe = require(resolve(root, 'dist/lpe.js'));

function calendarMatches(value, check, date) {
  const day = offset => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset)).toISOString().slice(0, 10);
  switch (check) {
    case 'utc-date': return value === day(0);
    case 'utc-year-prefix': return typeof value === 'string' && value.startsWith(`${date.getUTCFullYear()}-`);
    case 'utc-week': {
      const monday = -((date.getUTCDay() + 6) % 7);
      return isDeepStrictEqual(value, [day(monday), day(monday + 6)]);
    }
    case 'utc-extend-five': return isDeepStrictEqual(value, [day(0), day(5)]);
    default: throw Object.assign(new Error(`Unknown calendar check ${check}`), {name: 'ProtocolError'});
  }
}

function syntaxDiagnostic(source, options) {
  try { lpe.parse(source, options); }
  catch (error) {
    let diagnostic;
    try { diagnostic = JSON.parse(error.message); }
    catch { throw Object.assign(new Error('Syntax error did not contain a JSON diagnostic'), {name: 'ProtocolError'}); }
    if (!diagnostic || typeof diagnostic !== 'object' || Array.isArray(diagnostic) || (diagnostic.first != null && !Array.isArray(diagnostic.first))) {
      throw Object.assign(new Error('Invalid syntax diagnostic'), {name: 'ProtocolError'});
    }
    return {crs: diagnostic.crs, firstCarets: (diagnostic.first || []).map(token => token.crs)};
  }
  throw Object.assign(new Error('Expected a syntax error, but parsing succeeded'), {name: 'ProtocolError'});
}

function varargProbe(config) {
  const fail = () => { throw Object.assign(new Error('Invalid vararg probe configuration'), {name: 'ProtocolError'}); };
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail();
  function validate(selector) {
    if (!Array.isArray(selector)) fail();
    const [source, key, action = 'value', count] = selector;
    if (['args', 'kwargs', 'trace'].includes(source)) { if (selector.length !== 1) fail(); return; }
    if (source === 'arg' ? !Number.isSafeInteger(key) || key < 0 : source !== 'kwarg' || typeof key !== 'string') fail();
    if (!['value', 'isFunction', 'call', 'calls'].includes(action) || selector.length < 2 || selector.length > 4) fail();
    if (action === 'calls' ? !Number.isSafeInteger(count) || count < 0 || count > 100 : selector.length > 3) fail();
  }
  const result = config.result;
  if (Array.isArray(result)) validate(result);
  else if (result && typeof result === 'object') Object.values(result).forEach(validate);
  else fail();
  let count = 0;
  const events = [];
  const counter = () => ++count;
  return {
    counter, inc: counter,
    track: value => { events.push(value); return value; },
    probeFail: () => { throw new Error('vararg probe failure'); },
    testFunc: lpe.makeVararg(config.template, (...values) => {
      const args = values.at(-2), kwargs = values.at(-1);
      function select([source, key, action = 'value', count]) {
        if (source === 'trace') return events.slice();
        if (source === 'args') return args;
        if (source === 'kwargs') return kwargs;
        const value = source === 'arg' ? (key < values.length - 2 ? values[key] : undefined) : kwargs[key];
        if (action === 'isFunction') return typeof value === 'function';
        if (action === 'call') return value();
        if (action === 'calls') return Array.from({length: count}, () => value());
        return value;
      }
      return Array.isArray(result) ? select(result) : Object.fromEntries(Object.entries(result).map(([key, selector]) => [key, select(selector)]));
    }),
  };
}

function hostFixture(name, request) {
  if (!name) return {};
  if (name === 'async') {
    const promise = value => new Promise(done => setTimeout(() => done(value), 2));
    return {promise, asyncDouble: value => promise(value * 2), asyncFail: () => new Promise((_, reject) => setTimeout(() => reject(new Error('async failure')), 2))};
  }
  if (name === 'async-values') {
    const later = value => new Promise(done => setTimeout(() => done(value), 2));
    return {later, ...Object.fromEntries([1, 2, 3, 4].flatMap(n => [[`v${n}`, n], [`p${n}`, later(n)]]))};
  }
  if (name === 'vararg-pair') return {testFunc: lpe.makeVararg(['a', 'b'], (a, b, args, kwargs) => ({a, b, args, kwargs}))};
  if (name === 'vararg-callback') return {testFunc: lpe.makeVararg(['a', 'callback:fn'], (a, callback) => ({a, callbackResult: callback()}))};
  if (name === 'vararg-regex') return {testFunc: lpe.makeVararg([{'[': 'int', '(.)\\1': 'int', '.*(?<=a)b': 'int', 'pre|post': 'int', '.': 'bool'}], (args, kwargs) => kwargs)};
  if (name === 'vararg-probe') return varargProbe(request.vararg);
  if (name === 'async-trace') {
    const events = [];
    return {
      trace: () => events.slice(),
      traceAsync: (label, value) => {
        events.push(`start:${label}`);
        return new Promise(done => setTimeout(() => { events.push(`end:${label}`); done(value); }, 2));
      },
    };
  }
  if (name === 'counter') {
    let value = 0;
    return {counter: () => ++value};
  }
  if (name === 'host-special') return {
    rawAst: lpe.makeSF(ast => ast),
    evalAstHere: lpe.makeSF((ast, ctx, options) => lpe.EVAL(ast[0], ctx, options)),
  };
  if (name === 'host-lookup') return {
    [lpe.$VAR$]: (_, name) => name === 'dynamicValue' ? 42 : name === 'dynamicFn' ? value => value + 1 : undefined,
  };
  if (name === 'host-library') {
    const library = {[lpe.$IS_LIB$]: true, libValue: 7, libFn: () => 42};
    library.libraryValue = () => library.libValue;
    return library;
  }
  if (name === 'host-skip') return [
    {wrapped: () => lpe.makeSkipForm(value => `outer:${value}`)},
    {wrapped: value => `base:${value}`},
  ];
  if (name === 'source-skip') return [
    {toStart: () => lpe.makeSkipForm(value => `Start1 ${value}`)},
    [
      {toStart: lpe.makeSF(() => lpe.makeSkipForm(value => `Ast1 ${value}`, [["'", '20250203'], ["'", 'w']]))},
      {toStart: () => lpe.makeSkipForm(value => `Start2 ${value}`)},
    ],
    {toStart: lpe.makeSF(() => lpe.makeSkipForm(value => `Ast2 ${value}`))},
  ];
  throw Object.assign(new Error(`Unknown host fixture ${name}`), {name: 'ProtocolError'});
}

for await (const line of jsonLines(process.stdin)) {
  const ActualDate = globalThis.Date;
  try {
    const request = decode(JSON.parse(line));
    const options = request.options;
    if (request.clockMillis !== undefined) {
      if (!Number.isSafeInteger(request.clockMillis)) throw new Error('clockMillis must be an integer');
      globalThis.Date = class extends ActualDate {
        constructor(...args) { super(...(args.length ? args : [request.clockMillis])); }
        static now() { return request.clockMillis; }
      };
    }
    if (request.hostFixtures !== undefined && (!Array.isArray(request.hostFixtures) || request.hostFixtures.some(name => typeof name !== 'string'))) throw new Error('hostFixtures must be an array of names');
    const hosts = (request.hostFixtures || []).map(name => hostFixture(name, request));
    const context = hosts.length ? [request.context || {}, ...hosts] : request.context;
    let value;
    switch (request.op) {
      case 'parse': value = lpe.parse(request.source, options); break;
      case 'deparse': value = lpe.deparse(request.ast, options); break;
      case 'eval': value = await lpe.eval_lpe(request.source, context, options); break;
      case 'evalAst': value = await lpe.eval_lisp(request.ast, context, options); break;
      case 'stream': value = runStreamScenario(lpe, request); break;
      case 'api': {
        if (request.name === 'exportType') {
          if (request.export !== 'parse') throw Object.assign(new Error(`Unsupported export ${request.export}`), {name: 'ProtocolError'});
          value = typeof lpe.parse;
        }
        else if (request.name === 'syntaxDiagnostic') value = syntaxDiagnostic(request.source, options);
        else if (request.name === 'calendarInvariant') {
          const before = new Date();
          const actual = await lpe.eval_lpe(request.source, context, options);
          const after = new Date();
          value = calendarMatches(actual, request.check, before) || calendarMatches(actual, request.check, after);
        } else if (['isString', 'isArray', 'isHash', 'isFunction', 'isNumber', 'isNumberLike'].includes(request.name)) {
          const args = request.binding !== undefined ? [lpe.$getvar$(context, request.binding)] : (request.args || []);
          value = lpe[request.name](...args);
        } else if (['$getvar$', '$setvar$', '$var$'].includes(request.name)) {
          value = lpe[request.name](...(request.args || []));
        } else if (request.name === 'EVAL') value = await lpe.EVAL(request.args[0], request.args[1] || {}, options);
        else if (request.name === 'variableAccessors') {
          const mutable = request.context || {};
          const values = [];
          for (const step of request.steps || []) {
            if (!['$var$', '$getvar$', '$setvar$'].includes(step.name)) throw new Error(`Unknown variable API ${step.name}`);
            values.push(step.name === '$getvar$' ? lpe.$getvar$(mutable, step.key, options) : lpe[step.name](mutable, step.key, step.value, options));
          }
          value = {values, context: mutable};
        } else throw Object.assign(new Error(`Unknown API ${request.name}`), {name: 'ProtocolError'});
        break;
      }
      default: throw new Error(`Unknown operation: ${request.op}`);
    }
    process.stdout.write(`${JSON.stringify({ok: true, value: encode(value)})}\n`);
  } catch (error) {
    const kind = error instanceof lpe.LPESyntaxError || error instanceof SyntaxError ? 'SyntaxError' : error?.name || 'Error';
    process.stdout.write(`${JSON.stringify({ok: false, error: {kind, message: String(error?.message ?? error)}})}\n`);
  } finally { globalThis.Date = ActualDate; }
}
