const webpack = require("webpack");
const path = require("path");
const glob = require("glob");
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

let config = {
    mode: "production",
    entry: glob.sync(path.join(__dirname, "src", "**.js")).reduce(function(obj, el){
      obj[path.parse(el).name] = el;
      return obj
   },{}),
    output: {
      path: path.join(__dirname, "dist", "js"),
      filename: "./[name].dist.js"
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    performance : {
      hints : false
    },
    plugins: [
      new MomentLocalesPlugin()
    ]
    // still displays warning about locales.....
  }
  
  module.exports = config;