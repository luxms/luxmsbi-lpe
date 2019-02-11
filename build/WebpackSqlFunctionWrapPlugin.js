/**
 *  Plugin to wrap module in postgres CREATE FUNCTION
 */

var fs = require('fs');
var path = require('path');
var ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers');
var ConcatSource = require('webpack-sources').ConcatSource;
var sqlPrefix = fs.readFileSync(path.resolve(__dirname, './prefix.sql'), 'utf8');
var sqlSuffix = fs.readFileSync(path.resolve(__dirname, './suffix.sql'), 'utf8');


function WebpackSqlFunctionWrapPlugin(options) {
  // Setup the plugin instance with options...
  this.options = options;
}

WebpackSqlFunctionWrapPlugin.prototype.apply = function(compiler) {
  var options = this.options;

  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('optimize-chunk-assets', (chunks, callback) => {

      chunks.forEach(function (chunk) {
        if ('isInitial' in chunk && !chunk.isInitial()) {
          return;
        }

        var files = chunk.files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, {options}));
        files.forEach(function (file) {
          compilation.assets[file] = new ConcatSource(
              sqlPrefix, 
              compilation.assets[file], 
              sqlSuffix);
        });
      });

      callback();
    });
  });
};

module.exports = WebpackSqlFunctionWrapPlugin;