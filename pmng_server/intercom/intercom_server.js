const net = require("net");
const logger = require("../platform_logger").logger();

let subscriptions = {};
let responses = {};

function start() {
    const server = net.createServer();
    server.on("connection", function (connection) {
        let rcvBuffer = "";
        connection.on("data", (buffer) => {
            for(let c of buffer.toString("utf-8")) {
                if(c == "\n") {
                    let currentMessage = rcvBuffer;
                    rcvBuffer = "";

                    let command = currentMessage.substring(0, 4);
                    let value = JSON.parse(currentMessage.substring(5, currentMessage.length));

                    processCommand(connection, command, value);
                } else rcvBuffer += c;
            }
        });
    });

    return new Promise((resolve) => {
        server.listen(8043, "127.0.0.1", () => {
            logger.info("Intercom server started.");
            resolve();
        });
    });
}

// subscriptions and responses can be in global scope because only one server is running
function processCommand(connection, command, value) {
    switch(command) {
        case "subs":
            value.forEach((sub) => {
                if(!subscriptions.hasOwnProperty(sub)) subscriptions[sub] = [];
                subscriptions[sub].push(connection);
            });

            connection.write("stat:" + JSON.stringify({error: false, message: "subscribed"}) + "\n");
            break;
        case "send":
            let subject = value.subject;
            if(subscriptions.hasOwnProperty(subject)) {
                subscriptions[subject].forEach((conn) => {
                    if(!conn.destroyed) conn.write("recv:" + JSON.stringify(value) + "\n");
                });

                responses[value.id] = connection;

                connection.write("stat:" + JSON.stringify({error: false, message: "sent"}) + "\n");
            } else connection.write("stat:" + JSON.stringify({error: false, message: "no subscriptions"}) + "\n");
            break;
        case "resp":
            let id = value.id;
            if(responses.hasOwnProperty(id)) {
                responses[id].write("resp:" + JSON.stringify(value) + "\n");
                delete responses[id];
                connection.write("stat:" + JSON.stringify({error: false, message: "sent"}) + "\n");
            } else connection.write("stat:" + JSON.stringify({error: true, message: "no response id"}) + "\n");
            break;
    }
}

module.exports.start = start;