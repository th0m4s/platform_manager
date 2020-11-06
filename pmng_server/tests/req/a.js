const b = require("./b");

function print() {
    console.log("print");
}

function start() {
    b.callA();
}

Promise.resolve().then(start);
module.exports.print = print;