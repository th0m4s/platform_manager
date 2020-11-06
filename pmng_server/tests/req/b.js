const a = require("./a");

function callA() {
    a.print();
}


module.exports.callA = callA;