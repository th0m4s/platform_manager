const net = require("net");
const express = require("express");
const http = require("http");
const serv_one = express(), serv_two = express(), serv_unk = express();

serv_one.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
serv_one.get("/status", (req, resp) => {resp.send('<script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>' + t)});
serv_one.listen(4001);

serv_two.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
serv_two.get("/status", (req, resp) => {resp.send('<script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>' + t)});
serv_two.listen(4002);

serv_unk.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
serv_unk.get("/status", (req, resp) => {resp.json({status: "online from unknown server"})});
serv_unk.listen(4003);

function getPort(host) {
    switch(host.split(":")[0]) {
        case "local_one":
            return 4001;
        case "local_two":
            return 4002;
        default:
            return 4003;
    }
    
}

/*net.createServer(function(from) {
    var buffer = [], line = "";
    var to = null;
    from.on("data", (data) => {
        if(to == null) {
            var content = data.toString("utf-8");
            for(var i in content) {
                var c = content.charAt(i);
                if(c == "\n") {
                    if(line.toLowerCase().startsWith("host:")) {
                        to = net.createConnection({host: "localhost", port: getPort(line.substring(5, line.length).trimLeft())});
                        to.pipe(from);
                    }
                    buffer.push(line);
                    line = "";
                } else if(c != "\r") line += c;
            }

            if(to != null) {
                to.write(buffer.join("\r\n") + "\r\n");
            }
        } else to.write(data);
    });


}).listen(8080);*/

function getTextHeaders(headers) {
    let resp = "";
    for(let [key, value] of Object.entries(headers)) { resp += key + ": " + value + "\r\n"; }
    return resp + "\r\n";
}

http.createServer().listen(8080);