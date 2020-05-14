const webpack = require("webpack");
const path = require("path");

let config = {
    mode: "development",
    entry: path.join(__dirname, "src", "base.js"),
    output: {
      path: path.join(__dirname, "dist"),
      filename: "./bundle.js"
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    }
  }
  
  module.exports = config;