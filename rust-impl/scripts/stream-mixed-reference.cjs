'use strict';

const lpe = require('../../dist/lpe.js');

// The default audit covers returned payloads; --operands covers mixed expressions.
// Both follow JS shallow unboxing: a Stream operand leaves Promises unawaited.

// Same reference-counted adapter contract as test/test-streams.js.
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
    [...stream.listeners].forEach(listener => listener(value));
  },
  subscribe: (stream, listener) => {
    stream.listeners.add(listener);
    return {dispose: () => stream.listeners.delete(listener)};
  },
};

async function traceMixedStreams() {
  const control = adapter.createStream(0);
  const nestedA = adapter.createStream(10);
  const nestedB = adapter.createStream(20);
  const childA = adapter.createStream(nestedA);
  const childB = adapter.createStream(30);
  let settlePayload;
  let settleBranch;
  const payloadPromise = new Promise(resolve => { settlePayload = resolve; });
  const branchPromise = new Promise(resolve => { settleBranch = resolve; });
  const childAEvents = [];
  const childBEvents = [];
  adapter.subscribe(childA, value => childAEvents.push(value));
  adapter.subscribe(childB, value => childBEvents.push(value));
  const choices = [childA, branchPromise, 42, childB];
  let calls = 0;
  const output = lpe.unbox([control], ([index]) => {
    calls++;
    return choices[index];
  }, adapter);
  const events = [];
  const observer = adapter.subscribe(output, value => events.push(value));
  const streams = [
    ['control', control], ['nested_a', nestedA], ['nested_b', nestedB],
    ['child_a', childA], ['child_b', childB], ['output', output],
  ];
  const identities = new Map([
    ...streams.map(([name, stream]) => [stream, `stream:${name}`]),
    [payloadPromise, 'promise:payload'], [branchPromise, 'promise:branch'],
  ]);
  const normalize = value => {
    if (identities.has(value)) return identities.get(value);
    if (typeof value === 'number' && Number.isFinite(value)) return `scalar:${value}`;
    throw new Error('Unexpected value outside the named mixed-stream scenario');
  };
  const snapshots = [];
  const snapshot = (step, resolution = null) => snapshots.push({
    step,
    value: normalize(output.value),
    resolution: resolution === null ? null : normalize(resolution),
    calls,
    events: events.map(normalize),
    childEvents: {a: childAEvents.map(normalize), b: childBEvents.map(normalize)},
    streams: streams.map(([name, stream]) => ({
      name, value: normalize(stream.value), refs: stream.refs, listeners: stream.listeners.size,
    })),
  });

  snapshot('initial_shallow_child');
  adapter.next(childA, payloadPromise);
  snapshot('child_promise');
  adapter.next(childA, nestedB);
  snapshot('child_stream');
  adapter.next(nestedA, 11);
  adapter.next(nestedB, 21);
  snapshot('nested_updates');
  settlePayload(nestedA);
  const resolvedPayload = await payloadPromise;
  await Promise.resolve();
  snapshot('payload_settled_to_stream', resolvedPayload);
  adapter.next(childA, 7);
  snapshot('child_scalar');
  adapter.next(control, 0);
  snapshot('resolver_same_child');
  adapter.next(control, 1);
  snapshot('childSwitch_to_promise');
  adapter.next(childA, 8);
  snapshot('inactive_child_update');
  settleBranch(childA);
  const resolvedBranch = await branchPromise;
  await Promise.resolve();
  snapshot('branch_settled_to_stream', resolvedBranch);
  adapter.next(control, 2);
  snapshot('childSwitch_to_scalar');
  adapter.next(control, 3);
  snapshot('childSwitch_to_other_stream');
  adapter.next(childA, 9);
  snapshot('previous_child_update');
  adapter.next(childB, payloadPromise);
  snapshot('other_child_fulfilled_promise');
  adapter.next(childB, nestedA);
  snapshot('other_child_stream');
  adapter.next(childB, 31);
  snapshot('other_child_scalar');
  observer.dispose();
  adapter.release(output);
  snapshot('release_output');
  adapter.next(childB, 32);
  adapter.next(control, 0);
  snapshot('updates_after_release');
  return snapshots;
}

async function traceMixedOperands() {
  const traces = [];
  const expressions = [
    'list(s, p)', 'list(p, s)', 'list(s, fetch())', 'list(fetch(), s)',
    'stream() + promise()', 'promise() + stream()',
  ];
  const states = ['pending', 'fulfilled_before', 'rejected_before', 'fulfilled_after', 'rejected_after'];
  for (const expression of expressions) {
    for (const state of states) {
      // Native async callbacks are checked from invocation through settlement.
      if (expression.includes('fetch') && state.endsWith('before')) continue;
      const source = adapter.createStream(2);
      let fulfill;
      let reject;
      const operand = new Promise((resolve, fail) => { fulfill = resolve; reject = fail; });
      // Rejection is an operand state, not an unhandled host error.
      const outcome = operand.then(value => value, error => ({error: error.message}));
      const settle = async () => {
        if (state.startsWith('rejected')) reject(new Error('promise operand rejected'));
        else fulfill(40);
        const resolution = await outcome;
        await Promise.resolve();
        return resolution;
      };
      if (state.endsWith('before')) await settle();
      const calls = {stream: 0, promise: 0, fetch: 0};
      const output = lpe.eval_lpe(expression, {
        s: source,
        p: operand,
        stream: () => { calls.stream++; return source; },
        promise: () => { calls.promise++; return operand; },
        fetch: () => { calls.fetch++; return operand; },
      }, {streamAdapter: adapter});
      if (!adapter.isStream(output)) throw new Error(`Expected immediate Stream: ${expression}, ${state}`);
      const normalize = value => {
        if (value === operand) return 'promise:operand';
        if (Array.isArray(value)) return value.map(normalize);
        if (typeof value === 'number' && Number.isFinite(value)) return `scalar:${value}`;
        if (typeof value === 'string') return value;
        throw new Error(`Unexpected mixed operand payload: ${expression}, ${state}`);
      };
      const events = [];
      const observer = adapter.subscribe(output, value => events.push(value));
      const history = [output.value];
      const snapshots = [];
      const snapshot = (step, resolution = null) => snapshots.push({
        step, resolution,
        value: normalize(output.value),
        history: history.map(normalize),
        events: events.map(normalize),
        calls: {...calls},
        streams: [source, output].map(stream => ({refs: stream.refs, listeners: stream.listeners.size})),
      });
      snapshot('initial');
      adapter.next(source, 4);
      history.push(output.value);
      snapshot('first_update');
      if (state.endsWith('after')) snapshot('settled_without_update', await settle());
      adapter.next(source, 6);
      history.push(output.value);
      snapshot('second_update');
      observer.dispose();
      adapter.release(output);
      snapshot('release_output');
      adapter.next(source, 8);
      snapshot('update_after_release');
      traces.push({expression, state, snapshots});
    }
  }
  return traces;
}

const trace = process.argv.includes('--operands') ? traceMixedOperands : traceMixedStreams;
trace().then(trace => {
  process.stdout.write(JSON.stringify(trace) + '\n');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
