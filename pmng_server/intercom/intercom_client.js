const net = require("net");

function connect() {
    let connection = net.createConnection(8043);
    let subs = {}, waitingResp = {};

    let rcvBuffer = "";
    connection.on("data", (buffer) => {
        for(let c of buffer.toString("utf-8")) {
            if(c == "\n") {
                let currentMessage = rcvBuffer;
                rcvBuffer = "";

                let command = currentMessage.substring(0, 4);
                let value = JSON.parse(currentMessage.substring(5, currentMessage.length));

                processCommand(connection, command, value, subs, waitingResp);
            } else rcvBuffer += c;
        }
    });

    return {
        subscribe: function(subjects, callback) {
            connection.write("subs:" + JSON.stringify(subjects) + "\n");
            subjects.forEach((subject) => {
                if(!subs.hasOwnProperty(subject)) subs[subject] = [];
                subs[subject].push(callback);
            });
        },
        send: function(subject, message, responseCallback) {
            let id = Math.floor(Math.random()*((2**32)-1));
            waitingResp[id] = responseCallback || (() => {});
            connection.write("send:" + JSON.stringify({subject: subject, message: message, id: id}) + "\n");
        },
        sendPromise: function(subject, message, options = {timeout: 20, autoReject: true}) {
            let respProm = new Promise((resolve, reject) => {
                this.send(subject, message, (response) => {
                    if(autoReject && response.error !== undefined && response.error === true) return reject(response.message);
                    else return resolve(response.message || response);
                });
            });
            return options.timeout > 0 ? Promise.race([new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject("Intercom response timed out.");
                }, options.timeout*1000);
            }), respProm]) : respProm;
        }/*,
        respond: function(id, message) {
            connection.write("resp:" + JSON.stringify({id: id, message: message}) + "\n");
        }*/
    }
}

// subs and waitingResp cannot be in global scope because each connect() has it's own arrays
function processCommand(connection, command, value, subs, waitingResp) {
    switch(command) {
        case "recv":
            let subject = value.subject;
            if(subs.hasOwnProperty(subject)) {
                connection.write("stat:" + JSON.stringify({error: false, message: "received " + subject}) + "\n");

                subs[subject].forEach((cb) => {
                    cb(value.message, (response) => {
                        connection.write("resp:" + JSON.stringify({id: value.id, message: response}) + "\n");
                    });
                })
            } else connection.write("stat:" + JSON.stringify({error: true, message: "unknown subject " + subject + " for client"}) + "\n");
            break;
        case "resp":
            let id = value.id;
            if(waitingResp.hasOwnProperty(id)) {
                connection.write("stat:" + JSON.stringify({error: false, message: "received response " + id}) + "\n");

                waitingResp[id](value.message);
                delete waitingResp[id];
            } else connection.write("stat:" + JSON.stringify({error: true, message: "unknown responseid " + id + " for client"}) + "\n");
            break;
    }
}


module.exports.connect = connect;