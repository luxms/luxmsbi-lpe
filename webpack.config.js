/**
 *
 *  webpack config
 *
 */

const path = require('path');
const NODE_ENV = process.env.NODE_ENV || 'production';
const isDev = (NODE_ENV === 'development');
const isProduction = (NODE_ENV === 'production');
const isTest = (NODE_ENV === 'test');



class CustomPlugin {
  constructor(hook, plaginName, callback) {
    this.callback = callback;
    this.hook = hook;
    this.plaginName = plaginName;
  }

  apply(compiler) {
    if (this.hook) {
      compiler.hooks[this.hook].tap(this.plaginName, (compilation) => {
        if (this.callback) {
          this.callback(compilation);
        }
      });
    }
  }
}


const symbols = {
  "!": "\x1b[0m",           // Сбросить цвет
  "_": "\x1b[37m",          // Цвет обычного текста
  "=": "\x1b[36m",          // Цвет рамки
  "R": "\x1b[31m",          // Красный
  "G": "\x1b[32m",          // Зеленый
  "Y": "\x1b[33m",          // Желтый
  "B": "\x1b[34m",          // Синий
  "P": "\x1b[35m",          // Фиолетовый
  "C": "\x1b[36m",          // Циан
  "W": "\x1b[37m",          // Белый
};
const symbolRegex = new RegExp(`\\[([${Object.keys(symbols).join('')}])`, 'g');


/** @param {Array<string>} texts */
function prnTable(texts) {
  const pad = "  ";
  const maxLength = Math.max(...texts.map(t => t.replaceAll(symbolRegex, "").length));
  const paddedTexts = texts.map(t => t + "".padEnd(maxLength - t.replaceAll(symbolRegex, "").length, " "));

  const table = [
    `[=╔${"═".repeat(maxLength + pad.length * 2)}╗[!`,
    ...paddedTexts.map(t => `[=║${pad}[_${t}${pad}[=║[!`),
    `[=╚${"═".repeat(maxLength + pad.length * 2)}╝[!`,
  ]
  console.log(table.map(text => text.replaceAll(symbolRegex, (match) => symbols[match[1]])).join('\n'));
}


function nodocFunctionExcepted(funcName) {
  return !funcName.endsWith("$$CONTEXT_NAME$$");
}


module.exports = {
  entry: "./src/index.js",
  // watch: true,
  optimization: {
    minimize: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "lpe.js",
    library: 'lpe',
    globalObject: 'this',
    libraryTarget: 'umd',
  },
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [{
      test: /.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
    }]
  },
  optimization: {
    minimize: false,
  },
  devtool: isDev ? 'cheap-module-source-map' : 'source-map',      // inline-source-map
  stats: 'none',
  plugins: [
    new CustomPlugin("afterEmit", "PrintDocWarningsPlugin", () => {
      const lpe = require('./dist/lpe.js');
      const DOC_WARNINGS = lpe.DOC_WARNINGS;
      if (Object.keys(DOC_WARNINGS?.NODOC ?? {}).filter(nodocFunctionExcepted).length > 0) {
        console.warn(`DOC WARING: documentation for some functions undefined!`);
        Object.keys(DOC_WARNINGS.NODOC).filter(nodocFunctionExcepted).sort().forEach(funcName => {
          console.warn(`DOC WARING: not found documentation for function [${funcName}].`);
        });
      }
      if (Object.keys(DOC_WARNINGS?.LOC_UNDEFINED ?? {}).length > 0) {
        console.warn(`DOC WARING: localizations for some functions undefined!`);
        Object.keys(DOC_WARNINGS.LOC_UNDEFINED).sort().forEach(funcName => {
          console.warn(`DOC WARING: not found localization for function [${funcName}].`);
        });
      }
      if (Object.keys(DOC_WARNINGS?.LOC_OUTDATED ?? {}).length > 0) {
        console.warn(`DOC WARING: localizations for some functions was outdated!`);
        const outdates = Object.entries(DOC_WARNINGS.LOC_OUTDATED)
          .map(([hash, funcNames]) => {
            return Object.keys(funcNames).map(name => [name, hash]);
          })
          .flat()
          .sort((a, b) => a[0].localeCompare(b[0]));

        const funcNameLength = Math.max(...outdates.map(([name]) => name.length + 2));
        outdates.forEach(([name, hash]) => {
          console.warn(`DOC WARING: ${("["+name+"]").padEnd(funcNameLength)}    localization was outdated. Current hash: ${hash}`);
        });
      }
    }),


    new CustomPlugin("done", "PrintBuildStatsPlugin", (stats) => {
      const time = stats.endTime - stats.startTime;
      const warnings = stats.compilation.warnings;
      const errors = stats.compilation.errors;
      const lpe = require('./dist/lpe.js');
      const DOC_WARNINGS = lpe.DOC_WARNINGS;

      if (errors.length > 0 || warnings.length > 0) {
        console.log(`\n\n\x1b[33m%s\x1b[0m\n`, "Ошибки и предупреждения:");
        console.log(stats.toString({
            colors: true,  // Включает цвета
            warnings: true,
            errors: true
        }));
      }

      console.log("\n\n");
      prnTable([
        errors.length === 0
        ? `Сборка успешно завершена!`
        : `[RERROR: [_Сборка завершена с ошибками!`,
        ``,
        `[YВремя: [_${time}ms`,
        `[YРазмер: [_${(stats.compilation.assets['lpe.js'].size() / 1024).toFixed(2)} KB`,
        ``,
        `[YОшибок: [_${errors.length}`,
        `[YПредупреждений: [_${warnings.length}`,
        ``,
        `[YНедокументированные функции: [_${Object.keys(DOC_WARNINGS.NODOC).filter(nodocFunctionExcepted).length}`,
        `[YНелокализованные функции: [_${Object.keys(DOC_WARNINGS.LOC_UNDEFINED).length}`,
        `[YЛокализация не обновлена: [_${Object.values(DOC_WARNINGS.LOC_OUTDATED).map(el => Object.keys(el)).flat().length}`,
      ]);

    }),
  ],
};
