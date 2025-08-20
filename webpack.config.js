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
  plugins: [],
  devtool: isDev ? 'cheap-module-source-map' : 'source-map',      // inline-source-map
};
