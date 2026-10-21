const fs = require('node:fs');
const path = require('node:path');
const Mocha = require('mocha');

const root = path.resolve(__dirname, '../..');
const mocha = new Mocha({reporter: 'dot'});
function addTests(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) addTests(file);
    else if (entry.name.endsWith('.js')) mocha.addFile(file);
  }
}
addTests(path.join(root, 'test'));
mocha.run(failures => { process.exitCode = failures ? 1 : 0; });
