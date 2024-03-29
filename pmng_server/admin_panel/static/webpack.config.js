const path = require("path");
const glob = require("glob");
const MomentLocalesPlugin = require("moment-locales-webpack-plugin");

let config = {
    mode: "production",
    entry: glob.sync(path.join(__dirname, "src", "**.js")).reduce(function(obj, el) {
        obj[path.parse(el).name] = el;
        return obj
    }, {}),
    externals: [
        function(context, request, callback) {
            if (/^moment$/.test(request) && context.includes("node_modules")){
                return callback(null, "root " + request);
            } else if(/^jquery$/.test(request) && (context.includes("typeahead") || context.includes("tagsinput"))) {
                return callback(null, "root $");
            }
    
            callback();
        }
    ],
    optimization: {
        moduleIds: "hashed" 
    },
    output: {
        path: path.join(__dirname, "dist", "js"),
        filename: "./[name].dist.js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                use: [{
                    loader: "file-loader",
                    options: {
                        outputPath: "../fonts",
                        publicPath: "/static/fonts",
                        name: "[name].[ext]"
                    }
                }],
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