const LOG_FILE = "/var/log/pmng/pmng.log";
const fs = require("fs"), pfs = fs.promises, path = require("path");
const child_process = require("child_process");
const nodeLogger = require('simple-node-logger');

/**
 * Prepares the current platform logger by rotating old files and created new ones.
 * @returns {Promise} A promise resolved when all the preparation has been done.
 */
async function prepare() {
    // run as root by maininstance
    let logDir = path.dirname(LOG_FILE);
    try {
        await pfs.stat(LOG_FILE);
        try {
            pfs.access(LOG_FILE);
        } catch(noperm) {
            return _setLogPerm(logDir).then(() => {
                return _logrotate();
            });
        }

        return _logrotate();
    } catch(notexist) {
        return pfs.mkdir(logDir).catch(() => {}).then(() => {
            return new Promise((resolve) => {
                child_process.execSync('touch "' + LOG_FILE + '"');
                // cannot easily touch a file with node fs
                resolve();
            });
        }).then(() => {
            return _setLogPerm(logDir);
        }).then(() => {
            return _logrotate();
        });
    }
}

/**
 * Sets the correct permissions on the log directory.
 * @param {string} logDir The log directory.
 * @returns {Promise} A promise resolved when the permissions are correct.
 */
function _setLogPerm(logDir) {
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
function _logrotate() {
    return new Promise((resolve) => {
        child_process.execSync("logrotate /etc/logrotate.d/pmng");
        resolve();
    });
}

let _logger = undefined;
// simple logger is both file and console
/**
 * Returns a logger object used by any thread to write to the console and the platform log file.
 * 
 * Only one logger object is available per thread to limit filesystem usage.
 * @returns {nodeLogger.Logger} A logger object.
 */
function logger() {
    // logger stored outside to only open file once per thread
    if(_logger == undefined) {
        _logger = nodeLogger.createSimpleLogger({
            logFilePath: LOG_FILE,
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
        });
    
        process.on("unhandledRejection", (reason) => {
            _logger.error("An unhandled rejection occured: " + reason);
        });

        require("./process_stats").stats();
    }

    return _logger;
}

module.exports.logger = logger;
module.exports.prepare = prepare;
module.exports.LOG_FILE = LOG_FILE;