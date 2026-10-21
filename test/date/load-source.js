const path = require("path");
const { pathToFileURL } = require("url");
const { transformFileSync } = require("@babel/core");

const cache = new Map();

// Позволяет проверять внутренние модули, не добавляя их в публичный API LPE.
module.exports = function loadSource(filename) {
  const resolved = require.resolve(filename);
  if (cache.has(resolved)) return cache.get(resolved).exports;

  const loaded = { exports: {} };
  cache.set(resolved, loaded);
  const { code } = transformFileSync(resolved, {
    babelrc: false,
    configFile: false,
    comments: false,
    presets: [["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }]],
  });
  const sourceRequire = (name) => name.startsWith(".")
    ? loadSource(path.resolve(path.dirname(resolved), name))
    : require(name);
  const evaluate = new Function("require", "module", "exports",
    code + "\n//# sourceURL=" + pathToFileURL(resolved).href);
  evaluate(sourceRequire, loaded, loaded.exports);
  return loaded.exports;
};
