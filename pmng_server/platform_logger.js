const LOG_FILE = "/var/log/pmng/pmng.log";
const ACCESS_FILE = "/var/log/pmng/access.log";
const CONNECTIONS_FILE = "/var/log/pmng/connections.log";

const fs = require("fs"), pfs = fs.promises, path = require("path");
const child_process = require("child_process");
const cluster = require("cluster");
const nodeLogger = require("simple-node-logger");

class Logger {
    static #loggerForThread = null;

    static get LOG_FILE() {
        return LOG_FILE;
    }

    static get ACCESS_FILE() {
        return ACCESS_FILE;
    }

    static get CONNECTIONS_FILE() {
        return CONNECTIONS_FILE;
    }

    /**
     * Returns a logger object used by any thread to write to the console and the platform log file.
     * 
     * Only one logger object is available per thread to limit filesystem usage.
     * @returns {nodeLogger.Logger} A logger object.
     */
    constructor() {
        // kinda tricky because the returned logger is not an instance of this class but a nodeLogger.Logger instance

        if(Logger.#loggerForThread == undefined) {
            let _logger = nodeLogger.createSimpleLogger({
                logFilePath: this.LOG_FILE,
                timestampFormat: "YYYY-MM-DDTHH:mm:ss.SSSZ"
            });

            let tagLogger = (tag, name, array) => _logger[name](`[${tag}] ${array.join(" ")}`);
            _logger.tagInfo = (tag, ...arguments) => tagLogger(tag, "info", arguments);
            _logger.tag = _logger.tagInfo;
            _logger.tagLog = _logger.tagInfo;

            _logger.tagWarn = (tag, ...arguments) => tagLogger(tag, "warn", arguments);
            _logger.tagError = (tag, ...arguments) => tagLogger(tag, "error", arguments);

            // per process handlers (including intercom stats)
            process.on("uncaughtExceptionMonitor", (exception) => {
                _logger.fatal("PLATFORM MANAGER ENCOUNTERED A FATAL EXCEPTION!");
                _logger.fatal(exception);
                _logger.fatal("FATAL EXCEPTION TRACE");
                _logger.fatal(exception?.stack);
            });
        
            process.on("unhandledRejection", (reason) => {
                _logger.error("An unhandled rejection occured:\n" + (reason.stack ?? reason.toString()));
            });

            require("./process_stats").stats();
            Logger.#loggerForThread = _logger;
        }

        return Logger.#loggerForThread;
    }

    /**
     * Prepares the current platform logger by rotating old files and created new ones.
     * @returns {Promise} A promise resolved when all the preparation has been done.
     */
    static async prepare() {
        // run as root by maininstance
        let logDir = path.dirname(this.LOG_FILE);
        try {
            await pfs.stat(this.LOG_FILE);
            try {
                pfs.access(this.LOG_FILE);
            } catch(noperm) {
                return this.#setLogPerm(logDir).then(() => {
                    return this.#logrotate();
                });
            }
        } catch(notexist) {
            await pfs.mkdir(logDir).catch(() => {}).then(() => {
                return new Promise((resolve) => {
                    child_process.execSync('touch "' + this.LOG_FILE + '"');
                    // cannot easily touch a file with node fs
                    resolve();
                });
            })
        }
        await this.#setLogPerm(logDir);


        // TODO: rewrite code (just a copy/paster of log_file)
        let accessDir = path.dirname(this.ACCESS_FILE);
        try {
            await pfs.stat(this.ACCESS_FILE);
            try {
                pfs.access(this.ACCESS_FILE);
            } catch(noperm) {
                return this.#setLogPerm(accessDir).then(() => {
                    return this.#logrotate();
                });
            }

            return this.#logrotate();
        } catch(notexist) {
            await pfs.mkdir(accessDir).catch(() => {}).then(() => {
                return new Promise((resolve) => {
                    child_process.execSync('touch "' + this.ACCESS_FILE + '"');
                    resolve();
                });
            });
        }
        await this.#setLogPerm(accessDir);

        let connectDir = path.dirname(this.CONNECTIONS_FILE);
        try {
            await pfs.stat(this.CONNECTIONS_FILE);
            try {
                pfs.access(this.CONNECTIONS_FILE);
            } catch(noperm) {
                return this.#setLogPerm(connectDir).then(() => {
                    return this.#logrotate();
                });
            }

            return this.#logrotate();
        } catch(notexist) {
            await pfs.mkdir(connectDir).catch(() => {}).then(() => {
                return new Promise((resolve) => {
                    child_process.execSync('touch "' + this.CONNECTIONS_FILE + '"');
                    resolve();
                });
            });
        }
        await this.#setLogPerm(connectDir);

        return this.#logrotate();
    }

    /**
     * Sets the correct permissions on the log directory.
     * @param {string} logDir The log directory.
     * @returns {Promise} A promise resolved when the permissions are correct.
     */
    static #setLogPerm(logDir) {
        return new Promise((resolve) => {
            child_process.execSync('chown -R ' + process.env.PROC_UID + ':root "' + logDir + '"');
            // TODO: why not (p)fs.chown?
            resolve();
        }).then(() => {
            return pfs.chmod(logDir, "700");
        });
    }

    /**
     * Rotates the log files with logrotate and a specific configuration file.
     * @returns {Promise} A promise resolved when the files are rotated/compressed.
     */
    static #logrotate() {
        return new Promise((resolve) => {
            child_process.execSync("logrotate /etc/logrotate.d/pmng");
            resolve();
        });
    }

    static getWebAccess() {
        let writeStream = fs.createWriteStream(ACCESS_FILE, {flags: "a", encoding: "utf8"});
        return (req, res, originalPort) => {
            writeStream.write([req.socket.remoteAddress, this.#beautifyReqPort(req, originalPort) + (cluster.isMaster ? "master" : "#" + cluster.worker.id), process.pid, "[" + new Date().toISOString() + "]", "\"" + req.method + " " + req.headers["host"] + req.url + " HTTP/" + req.httpVersion + "\"", res.statusCode, req.socket.localPort != undefined ? finishedResSize(res) : "closed"].join(" ") + "\n");
        }
    }
    
    static getConnectionsAccess() {
        let writeStream = fs.createWriteStream(CONNECTIONS_FILE, {flags: "a", encoding: "utf8"});
        return (req, res) => {
            writeStream.write([new Date().toISOString(), req.socket.remoteAddress].join(" ") + "\n");
        }
    }
    
    static #beautifyReqPort(req, originalPort) {
        let port = req.socket.localPort ?? originalPort;
        if(port == 80) return "HTTP";
        else if(port == 443) return "HTTPS";
        else return port;
    }

    // from https://www.reddit.com/r/node/comments/6sa8fu/express_recording_size_of_response_sent/
    static finishedResSize(res) {
        if ("_contentLength" in res){
            return res["_contentLength"];
        } else if(res.hasHeader("content-length")) {
            return res.getHeader("content-length");
        } else return -1;
    }
}

module.exports = Logger;