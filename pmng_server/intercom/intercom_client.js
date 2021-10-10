const net = require("net");
const logger = require("../platform_logger").logger();

/**
 * @typedef {{subscribe: (subjects: string[], callback: (message: object, respond: (response: object) => void) => void) => boolean,
 *  send: (subject: string, message: object, responseCallback: (response: object) => void) => boolean,
 *  sendPromise: (subject: string, message: object) => Promise<object>,
 *  changeConfig: (newConfig: {timeout?: number, autoReject?: boolean, autoResolve?: boolean}) => void}} IntercomClient 
 */

/**
 * Starts a connection to the intercom server and return a newly created client object.
 * Multiple clients may exist per process.
 * @returns {IntercomClient} The connected intercom client.
 */
function connect() {
    let internalConnect = () => {
        let conn = net.createConnection(8043);
        conn.on("data", (buffer) => {
            for(let c of buffer.toString("utf-8")) {
                if(c == "\n") {
                    let currentMessage = rcvBuffer;
                    rcvBuffer = "";
    
                    let command = currentMessage.substring(0, 4);
                    let value = JSON.parse(currentMessage.substring(5, currentMessage.length));
    
                    processCommand(conn, command, value, subs, waitingResp);
                } else rcvBuffer += c;
            }
        });

        conn.on("error", (error) => {
            logger.tagError("ITC_CLIENT", "Intercom client encountered an error on " + process.argv[1].split("/").pop() + ": " + error);
        });

        return conn;
    }

    let connection = internalConnect();
    let subs = {}, waitingResp = {};
    let defaultConfig = {timeout: 20, autoReject: true, autoResolve: true};

    let rcvBuffer = "";

    let checkConnection = () => {
        try {
            if(connection == undefined || connection.destroyed)
                connection = internalConnect();

            return true;
        } catch(_) {
            return false;
        }
    }

    return {
        subscribe: function(subjects, callback) {
            if(!checkConnection()) return false;

            connection.write("subs:" + JSON.stringify(subjects) + "\n");
            subjects.forEach((subject) => {
                if(!subs.hasOwnProperty(subject)) subs[subject] = [];
                subs[subject].push(callback);
            });

            return true;
        },
        send: function(subject, message, responseCallback) {
            if(!checkConnection()) return false;

            let id = Math.floor(Math.random()*((2**32)-1));
            if(responseCallback != undefined) waitingResp[id] = responseCallback;
            connection.write("send:" + JSON.stringify({subject: subject, message: message, id: id}) + "\n");

            return true;
        },
        sendPromise: function(subject, message, {timeout = defaultConfig.timeout, autoReject = defaultConfig.autoReject, autoResolve = defaultConfig.autoResolve} = {}) {
            let respProm = new Promise((resolve, reject) => {
                let sent = this.send(subject, message, (response) => {
                    if(autoReject && response.error !== undefined && response.error === true) return reject(response.message);
                    else return resolve(autoResolve ? (response.message || response) : response);
                });

                if(!sent) reject("No connection available!");
            });
            return timeout > 0 ? Promise.race([new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject("Intercom response timed out.");
                }, timeout*1000);
            }), respProm]) : respProm;
        }/*,
        respond: function(id, message) {
            connection.write("resp:" + JSON.stringify({id: id, message: message}) + "\n");
        }*/,
        changeConfig(newConfig = defaultConfig) {
            defaultConfig = Object.assign(defaultConfig, newConfig);
        }
    }
}

// subs and waitingResp cannot be in global scope because each connect() has it's own arrays
/**
 * Process a received command from the socket.
 * @param {net.Socket} connection The socket that connects this client and the server.
 * @param {string} command The command received by the socket.
 * @param {{subject: string, message: object}} value The parsed and received object containing a *subject* property and a *message* property.
 * @param {{[subject: string]: ((message: object, respond: (response: object) => void) => void)[]}} subs All the subscriptions for this client.
 * @param {{[responseId: number]: (response: object) => void}} waitingResp All the response callbacks for this client.
 */
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

                if(waitingResp[id] != undefined) {
                    waitingResp[id](value.message);
                    delete waitingResp[id];
                }
            } else connection.write("stat:" + JSON.stringify({error: true, message: "unknown responseid " + id + " for client"}) + "\n");
            break;
    }
}


module.exports.connect = connect;