const fs = require('node:fs');
const path = require('node:path');
const Mocha = require('mocha');

const root = path.resolve(__dirname, '../..');
const mocha = new Mocha({reporter: 'dot'});
for (const file of fs.readdirSync(path.join(root, 'test')).sort()) {
  if (/^test.*\.js$/.test(file)) mocha.addFile(path.join(root, 'test', file));
}
mocha.run(failures => { process.exitCode = failures ? 1 : 0; });
