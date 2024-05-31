/**
 *
 *  webpack config
 *
 */

var path = require('path');
var args = require('args-parser')(process.argv);

const NODE_ENV = process.env.NODE_ENV || 'production';
// console.log(NODE_ENV);

const isDev = (NODE_ENV === 'development');
const isProduction = (NODE_ENV === 'production');
const isTest = (NODE_ENV === 'test');

module.exports = {
    entry: "./src/index.js",
    // watch: true,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: "lpe.js",
      library: 'lpe',
      libraryTarget: "umd"
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
    plugins: [
      // new WebpackAutoInject({
      //   SHORT: 'LPE',
      //   SILENT: false,
      //   PACKAGE_JSON_PATH: './package.json',
      //   PACKAGE_JSON_INDENT: 2,
      //   components: {
      //     AutoIncreaseVersion: true,
      //     InjectAsComment: true,
      //     InjectByTag: false,
      //   },
      //   componentsOptions: {
      //     AutoIncreaseVersion: {
      //       runInWatchMode: false,
      //     },
      //     InjectAsComment: {
      //       tag: 'Version: {version} - {date}',
      //       dateFormat: 'yyyy/mm/dd HH:MM:ss',
      //       multiLineCommentType: true,
      //     },
      //   },
      // }),
    ],
    devtool: isDev ? 'eval-inline-source-map' : 'sourcemap',
};
