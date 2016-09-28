var nodeExternals = require('webpack-node-externals')
var path = require('path')

module.exports = {
  context: __dirname,
  entry: './src/app.js',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'app-bundle.js'
  },
  target: 'node',
  externals: [nodeExternals()],
  node: {
    fs: 'empty',
    console: false,
    global: true,
    process: true,
    Buffer: true,
    __filename: 'mock',
    __dirname: 'mock',
    setImmediate: true
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader', // 'babel-loader' is also a legal name to reference
        query: {
          presets: [ 'stage-0', 'es2015' ]
        }
      },
      { test: /\.json/, loader: 'json' }
    ]
  }
}
