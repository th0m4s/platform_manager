const net = require("net");

class IntercomClient {
    #connection = undefined;
    #rcvBuffer = "";
    #closed = false;
    
    #subs = {};
    #waitingResp = {};

    #defaultConfig = {timeout: 20, autoReject: true, autoResolve: true};

    /**
     * Starts a connection to the intercom server and return a newly created client object.
     * Multiple clients may exist per process.
     * @returns {IntercomClient} The connected intercom client.
     */
    constructor() {
        this.#connection = this.#internalConnect();
    }

    #internalConnect() {
        let conn = net.createConnection(8043);
        conn.on("data", (buffer) => {
            for(let c of buffer.toString("utf-8")) {
                if(c == "\n") {
                    let currentMessage = this.#rcvBuffer;
                    this.#rcvBuffer = "";
    
                    let command = currentMessage.substring(0, 4);
                    let value = JSON.parse(currentMessage.substring(5, currentMessage.length));
    
                    this.#processCommand(conn, command, value, subs, waitingResp);
                } else this.#rcvBuffer += c;
            }
        });

        this.#closed = false;
        return conn;
    }

    reconnect() {
        this.#checkConnection();
    }

    close() {
        this.#connection.destroy();
        this.#connection = undefined;

        this.#closed = true;

        this.#subs = {};
        this.#waitingResp = {};
        this.#rcvBuffer = "";
    }

    #checkConnection() {
        try {
            if(this.#closed) throw new Error("closed!");

            if(this.#connection == undefined || this.#connection.destroyed)
                this.#connection = this.#internalConnect();

            return true;
        } catch(_) {
            return false;
        }
    }

    /**
     * Process a received command from the socket.
     * @param {string} command The command received by the socket.
     * @param {{subject: string, message: object}} value The parsed and received object containing a *subject* property and a *message* property.
     */
    #processCommand(command, value) {
        switch(command) {
            case "recv":
                let subject = value.subject;
                if(this.#subs.hasOwnProperty(subject)) {
                    this.#connection.write("stat:" + JSON.stringify({error: false, message: "received " + subject}) + "\n");

                    this.#subs[subject].forEach((cb) => {
                        cb(value.message, (response) => {
                            this.#connection.write("resp:" + JSON.stringify({id: value.id, message: response}) + "\n");
                        });
                    })
                } else this.#connection.write("stat:" + JSON.stringify({error: true, message: "unknown subject " + subject + " for client"}) + "\n");
                break;
            case "resp":
                let id = value.id;
                if(this.#waitingResp.hasOwnProperty(id)) {
                    this.#connection.write("stat:" + JSON.stringify({error: false, message: "received response " + id}) + "\n");

                    if(this.#waitingResp[id] != undefined) {
                        this.#waitingResp[id](value.message);
                        delete this.#waitingResp[id];
                    }
                } else this.#connection.write("stat:" + JSON.stringify({error: true, message: "unknown responseid " + id + " for client"}) + "\n");
                break;
        }
    }

    subscribe(subjects, callback) {
        if(!this.#checkConnection()) return false;

        this.#connection.write("subs:" + JSON.stringify(subjects) + "\n");
        subjects.forEach((subject) => {
            if(!this.#subs.hasOwnProperty(subject)) this.#subs[subject] = [];
            this.#subs[subject].push(callback);
        });

        return true;
    }

    send(subject, message, responseCallback) {
        if(!checkConnection()) return false;

        let id = Math.floor(Math.random()*((2**32)-1));
        if(responseCallback != undefined) this.#waitingResp[id] = responseCallback;
        this.#connection.write("send:" + JSON.stringify({subject: subject, message: message, id: id}) + "\n");

        return true;
    }

    sendPromise(subject, message, {timeout = this.#defaultConfig.timeout, autoReject = this.#defaultConfig.autoReject, autoResolve = this.#defaultConfig.autoResolve} = {}) {
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
    }

    changeConfig(newConfig = this.#defaultConfig) {
        this.#defaultConfig = Object.assign(this.#defaultConfig, newConfig);
    }
}

module.exports = IntercomClient;