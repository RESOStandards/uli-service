const path = require("path");
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');

module.exports = {
  context: path.join(__dirname, "client"),
  entry: ["./App.js"],
  output: {
    path: path.join(__dirname, "./server/public/dist"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: ['@babel/preset-env', '@babel/react'],
          plugins: ["@babel/plugin-proposal-class-properties", "@babel/plugin-transform-runtime", "js-logger"]
        }
      }, {
        test: /\.s?[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          'postcss-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ]
  },
  resolve: {
    alias: {
      assets: path.resolve(__dirname, 'client/assets/'),
      components: path.resolve(__dirname, 'client/components/'),
      apis: path.resolve(__dirname, 'client/apis/'),
      helpers: path.resolve(__dirname, 'client/helpers/'),
      constants: path.resolve(__dirname, 'client/constants'),
      contexts: path.resolve(__dirname, 'client/contexts'),
      styles: path.resolve(__dirname, 'client/styles'),
      commonConstants: path.resolve(__dirname, 'server/commonConstants'),
    }
  },
  plugins: [
    new CaseSensitivePathsPlugin(),
    new AssetsPlugin({ filename: 'assets.json' })
  ],
  watchOptions: {
    ignored: /node_modules/
  }
};
