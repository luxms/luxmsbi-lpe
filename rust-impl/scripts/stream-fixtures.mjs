import {encode} from './shared.mjs';

export function runStreamScenario(lpe, request) {
  const fail = message => { throw Object.assign(new Error(message), {name: 'ProtocolError'}); };
  if (!request.sources || typeof request.sources !== 'object' || Array.isArray(request.sources)) fail('stream sources must be an object');
  if (Object.hasOwn(request.sources, 'result')) fail('stream source name result is reserved');
  const direct = request.unboxReturn !== undefined;
  if (direct ? typeof request.unboxReturn !== 'string' || request.source !== undefined : typeof request.source !== 'string') {
    fail('stream requires either source or unboxReturn');
  }
  if (request.steps !== undefined && !Array.isArray(request.steps)) fail('stream steps must be an array');

  let result;
  const events = [];
  // Match test/test-streams.js ownership and Set iteration, including repeated args.
  class Stream {
    constructor(value, dispose = () => {}) {
      this.value = value;
      this.refs = 1;
      this.listeners = new Set();
      this.dispose = dispose;
    }
  }
  const adapter = {
    createStream: (value, dispose) => new Stream(value, dispose),
    isStream: value => value instanceof Stream,
    getLastValue: stream => stream.value,
    retain: stream => { stream.refs++; },
    release: stream => { if (--stream.refs === 0) stream.dispose(); },
    next: (stream, value) => {
      stream.value = value;
      // No observer subscription or initialization event; freeze mutable payloads now.
      if (stream === result) events.push(encode(value));
      [...stream.listeners].forEach(listener => listener(value));
    },
    subscribe: (stream, listener) => {
      stream.listeners.add(listener);
      return {dispose: () => stream.listeners.delete(listener)};
    },
  };
  const sources = Object.fromEntries(Object.entries(request.sources).map(([name, value]) => [name, adapter.createStream(value)]));
  const source = name => {
    if (typeof name !== 'string' || !Object.hasOwn(sources, name)) fail(`Unknown stream source ${String(name)}`);
    return sources[name];
  };
  if (direct) {
    const input = source(request.unboxInput || 'flag');
    const child = source(request.unboxReturn);
    result = lpe.unbox([input], () => child, adapter);
  } else result = lpe.eval_lpe(request.source, {...sources}, {streamAdapter: adapter});

  const snapshot = () => ({
    value: encode(adapter.isStream(result) ? adapter.getLastValue(result) : result),
    sources: Object.fromEntries(Object.entries(sources).map(([name, stream]) => [name, {
      value: encode(stream.value), refs: stream.refs, listeners: stream.listeners.size,
    }])),
    events: events.slice(),
  });
  const snapshots = [snapshot()];
  for (const step of request.steps || []) {
    if (!step || !['next', 'release', 'retain'].includes(step.op)) fail(`Unknown stream step ${String(step?.op)}`);
    const stream = step.name === 'result' ? result : source(step.name);
    if (!adapter.isStream(stream)) fail(`Stream step target ${String(step.name)} is not a stream`);
    if (step.op === 'next') adapter.next(stream, step.value);
    else adapter[step.op](stream);
    snapshots.push(snapshot());
  }
  return {snapshots};
}
