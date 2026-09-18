const assert = require('assert');
const lpe = require('../dist/lpe');

// Независимый от хоста адаптер: счётчики позволяют проверять владение подписками.
function createAdapter() {
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
  return adapter;
}

describe('Streams through an external adapter', () => {
  it('combines current values and later updates', () => {
    const adapter = createAdapter();
    const a = adapter.createStream(2);
    const b = adapter.createStream(3);
    const result = lpe.eval_lpe('a + b', {a, b}, {streamAdapter: adapter});
    assert.strictEqual(result.value, 5);
    adapter.next(a, 4);
    assert.strictEqual(result.value, 7);
    adapter.next(b, 8);
    assert.strictEqual(result.value, 12);
    adapter.release(result);
    assert.strictEqual(a.refs, 1);
    assert.strictEqual(b.refs, 1);
    assert.strictEqual(a.listeners.size + b.listeners.size, 0);
  });

  it('switches the selected branch and unsubscribes from the previous one', () => {
    const adapter = createAdapter();
    const flag = adapter.createStream(true);
    const a = adapter.createStream(2);
    const b = adapter.createStream(3);
    const result = lpe.eval_lpe('if(flag, a, b)', {flag, a, b}, {streamAdapter: adapter});
    assert.strictEqual(result.value, 2);
    adapter.next(flag, false);
    assert.strictEqual(result.value, 3);
    assert.strictEqual(a.listeners.size, 0);
    assert.strictEqual(a.refs, 1);
    adapter.next(a, 100);
    assert.strictEqual(result.value, 3);
    adapter.next(b, 4);
    assert.strictEqual(result.value, 4);
    adapter.release(result);
    assert.strictEqual(b.refs, 1);
    assert.strictEqual(flag.refs, 1);
    assert.strictEqual(b.listeners.size + flag.listeners.size, 0);
  });

  it('reuses the same returned stream without duplicate subscriptions', () => {
    const adapter = createAdapter();
    const flag = adapter.createStream(1);
    const child = adapter.createStream(2);
    const result = lpe.unbox([flag], () => child, adapter);
    adapter.next(flag, 2);
    assert.strictEqual(child.refs, 2);
    assert.strictEqual(child.listeners.size, 1);
    adapter.release(result);
    assert.strictEqual(child.refs, 1);
  });

  it('can switch from a stream result to a scalar', () => {
    const adapter = createAdapter();
    const flag = adapter.createStream(true);
    const child = adapter.createStream(2);
    const result = lpe.eval_lpe('if(flag, child, 42)', {flag, child}, {streamAdapter: adapter});
    adapter.next(flag, false);
    assert.strictEqual(result.value, 42);
    assert.strictEqual(child.refs, 1);
    assert.strictEqual(child.listeners.size, 0);
    adapter.release(result);
  });

  it('balances subscriptions when a stream occurs in multiple arguments', () => {
    const adapter = createAdapter();
    const a = adapter.createStream(2);
    const result = lpe.eval_lpe('a + a', {a}, {streamAdapter: adapter});
    adapter.next(a, 3);
    assert.strictEqual(result.value, 6);
    adapter.release(result);
    assert.strictEqual(a.refs, 1);
    assert.strictEqual(a.listeners.size, 0);
  });
});
