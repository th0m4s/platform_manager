const LOG_FILE = "/var/log/pmng/pmng.log";
const fs = require("fs"), pfs = fs.promises, path = require("path");
const child_process = require("child_process");

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
        return pfs.mkdir(logDir).catch((folderexists) => {}).then(() => {
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

function _setLogPerm(logDir) {
    return new Promise((resolve) => {
        child_process.execSync('chown -R ' + process.env.PROC_UID + ':root "' + logDir + '"');
        // cannot use string names as uid and gid with (p)fs.chown (and it's sometimes buggy - ie. throw error but set perm)
        resolve();
    }).then(() => {
        return pfs.chmod(logDir, "700");
    });
}

function _logrotate() {
    return new Promise((resolve) => {
        child_process.execSync("logrotate /etc/logrotate.d/pmng");
        resolve();
    });
}

let _logger = undefined;
// simple logger is both file and console
function logger() {
    // logger stored outside to only open file once per thread
    if(_logger == undefined) _logger = require('simple-node-logger').createSimpleLogger(LOG_FILE)
    return _logger;
}

module.exports.logger = logger;
module.exports.prepare = prepare;