const {spawn} = require('node:child_process');

// Keep the execution deadline independent of Node/Babel startup. The child
// sends a ready message after importing the modules it is about to exercise.
module.exports = function runIsolated(script, {startup = 5000, execution = 1500} = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', script], {stdio:['ignore','pipe','pipe','ipc']});
    let stdout = '', stderr = '', error, ready = false, timer;
    const deadline = (duration, phase) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        error = Object.assign(new Error(`Isolated test ${phase} timed out`), {code:'ETIMEDOUT'});
        child.kill('SIGKILL');
      }, duration);
    };
    deadline(startup, 'startup');
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', value => {stdout += value;});
    child.stderr.on('data', value => {stderr += value;});
    child.on('message', message => {
      if (message?.ready === true && !ready) {ready = true; deadline(execution, 'execution');}
    });
    child.on('error', value => {error = value;});
    child.on('close', status => {
      clearTimeout(timer);
      if (!ready && status === 0 && !error) error = new Error("Isolated test exited before readiness");
      resolve({status, stdout, stderr, error});
    });
  });
};
