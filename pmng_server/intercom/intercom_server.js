const pmng = require("../../pmng_lib");

const net = require("net");
const logger = new pmng.Logger();

class IntercomServer {
    #subscriptions = {};
    #responses = {};
    #server = undefined;

    constructor() {
        this.#server = net.createServer();
        this.#server.on("connection", function (connection) {
            connection.on("error", () => {});
    
            connection.write('stat:{\"msg\":\"welcome\"}\n');
    
            let rcvBuffer = "";
            connection.on("data", (buffer) => {
                for(let c of buffer.toString("utf-8")) {
                    if(c == "\n") {
                        let currentMessage = rcvBuffer;
                        rcvBuffer = "";
    
                        let command = currentMessage.substring(0, 4);
                        let value = JSON.parse(currentMessage.substring(5, currentMessage.length));
    
                        tihs.#processCommand(connection, command, value);
                    } else rcvBuffer += c;
                }
            });
        });
    }

    start() {
        return new Promise((resolve) => {
            server.listen(8043, "127.0.0.1", () => {
                logger.info("Intercom server started.");
                resolve();
            });
        });
    }

    #processCommand(connection, command, value) {
        switch(command) {
            case "subs":
                value.forEach((sub) => {
                    if(!this.#subscriptions.hasOwnProperty(sub)) this.#subscriptions[sub] = [];
                    this.#subscriptions[sub].push(connection);
                });
    
                if(!connection.destroyed) connection.write("stat:" + JSON.stringify({error: false, message: "subscribed"}) + "\n");
                break;
            case "send":
                let subject = value.subject;
                if(this.#subscriptions.hasOwnProperty(subject)) {
                    this.#subscriptions[subject].forEach((conn) => {
                        if(!conn.destroyed) conn.write("recv:" + JSON.stringify(value) + "\n");
                    });
    
                    this.#responses[value.id] = connection;
    
                    if(!connection.destroyed) connection.write("stat:" + JSON.stringify({error: false, message: "sent"}) + "\n");
                } else if(!connection.destroyed) connection.write("stat:" + JSON.stringify({error: true, message: "no subscriptions"}) + "\n");
                break;
            case "resp":
                let id = value.id;
                if(this.#responses.hasOwnProperty(id)) {
                    this.#responses[id].write("resp:" + JSON.stringify(value) + "\n");
                    delete this.#responses[id];
                    if(!connection.destroyed) connection.write("stat:" + JSON.stringify({error: false, message: "sent"}) + "\n");
                } else if(!connection.destroyed) connection.write("stat:" + JSON.stringify({error: true, message: "no response id"}) + "\n");
                break;
        }
    }
}

module.exports = IntercomServer;