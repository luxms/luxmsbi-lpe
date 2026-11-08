const assert = require('node:assert/strict');
const runIsolated = require('./date/run-isolated');

describe('Isolated source-test deadlines', () => {
  it('allows module startup to exceed the execution deadline', async () => {
    const result = await runIsolated(`
      setTimeout(() => {process.send({ready:true}); process.stdout.write('ok');}, 200);
    `, {startup:3000,execution:100});
    assert.ifError(result.error);
    assert.equal(result.status,0);
    assert.equal(result.stdout,'ok');
  }).timeout(5000);

  it('terminates synchronous loops after the ready message', async () => {
    const result = await runIsolated('process.send({ready:true}); while(true) {}', {startup:3000,execution:100});
    assert.equal(result.error?.code,'ETIMEDOUT');
    assert.match(result.error.message,/execution timed out/);
    assert.equal(result.status,null);
  }).timeout(5000);
});
