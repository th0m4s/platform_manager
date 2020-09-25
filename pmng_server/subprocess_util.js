const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();

/**
 * @callback OnExited
 * @param {number} code The exit code of the process (if applicable).
 * @param {string} signal The exit signal of the process.
 */

/**
 * @typedef{{getProcess: function, restart: function, isRunning: Function<boolean>}} Subfork
 */

/**
 * Creates intercom handler for a process that doesn't belong to a file with custom restart and isRunning methods.
 * @param {string} id Internal process name.
 * @param {function} isRunning Should returns *true* if the fake fork is running, *false* otherwise.
 * @param {function} restart Should restart the fake fork.
 */
function fakeFork(id, isRunning, restart) {
    intercom.subscribe(["subprocess:" + id], async (message, respond) => {
        let command = message.command;
        switch(command) {
            case "restart":
                await restart();
                respond({error: false, message: "Restart signal sent. Wait and check for isRunning if necessary."});
                break;
            case "isRunning":
                respond({error: false, running: await isRunning()});
                break;
        }
    });
}

/**
 * Forks a process from a JS file, restart it automatically when necessary and uses callbacks events.
 * @param {string} file The JS file to fork.
 * @param {string} id The process internal name
 * @param {function} onForking Callback executed when a new fork is created.
 * @param {OnExited} onExited Callback executed when the fork closed unexpectedly.
 * @param {function} onRestart Callback executed when a restart is requested.
 * @returns {Subfork} An object representing the running process and util functions.
 */
function fork(file, id, onForking, onExited, onRestart) {
    let subp, shouldRestart = true, restarting = false;
    let startProcess = (restart, code, signal) => {
        if(restart && !restarting) onExited(code, signal);
        restarting = false;

        onForking();
        subp = child_process.fork(file);

        subp.addListener("exit", (code, signal) => {
            if(shouldRestart) startProcess(true, code, signal);
            else subp = undefined;
        });
    }

    startProcess(false);

    let restart = () => {
        restarting = true;
        onRestart();
        subp.kill(); // restart process by killing it (on exit will be called)
    }

    let isRunning = () => {
        return subp != undefined && subp.exitCode === null;
    }

    intercom.subscribe(["subprocess:" + id], (message, respond) => {
        let command = message.command;
        switch(command) {
            case "restart":
                restart();
                respond({error: false, message: "Restart signal sent. Wait and check for isRunning if necessary."});
                break;
            case "isRunning":
                respond({error: false, running: isRunning()});
                break;
        }
    });

    return {getProcess: () => subp, restart, isRunning};
}

/**
 * Forks a JS file, restart it automatically and displays status messages.
 * @param {string} file The JS file to fork.
 * @param {string} id The process internal name.
 * @param {string} name The process display name for status messages.
 * @returns {Subfork} An object representing the running process and util functions.
 */
function forkNamed(file, id, name) {
    return fork(file, id, () => {
        logger.info("Forking " + name + "...");
    }, (code, signal) => {
        logger.info("Process of " + name + " exited unexpectedly (" + code + ").");
    }, () => {
        logger.info("Process of " + name + " is being restarted.");
    });
}

function responder() {
    intercom.subscribe(["subprocesses"], (message, respond) => {
        let timeout = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject({error: true, message: "Timeout exceeded. Please try again (maybe the name is incorrect)."});
            }, 5000);
        });

        let subpId = message.id;
        switch(message.command) {
            case "restart":
                Promise.race([timeout, intercom.sendPromise("subprocess:" + subpId, {command: "restart"}, {autoReject: false, autoResolve: false})]).then(respond).catch(respond);
                break;
            case "check": // like api request
            case "isRunning": // like per project intercom
                Promise.race([timeout, intercom.sendPromise("subprocess:" + subpId, {command: "isRunning"}, {autoReject: false, autoResolve: false})]).then(respond).catch(respond);
                break;
        }
    });
}


module.exports.fork = fork;
module.exports.forkNamed = forkNamed;
module.exports.fakeFork = fakeFork;
module.exports.responder = responder;