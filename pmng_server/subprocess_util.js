const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();

/**
 * @callback OnExited
 * @param {number} code The exit code of the process (if applicable).
 * @param {string} signal The exit signal of the process.
 */

/**
 * Forks a process from a JS file, restart it automatically when necessary and uses callbacks events.
 * @param {string} file The JS file to fork.
 * @param {string} id The process internal name
 * @param {function} onForking Callback executed when a new fork is created.
 * @param {OnExited} onExited Callback executed when the fork closed unexpectedly.
 */
function fork(file, id, onForking, onExited) {
    let subp, shouldRestart = true, restarting = false;
    let startProcess = (restart, code, signal) => {
        if(restart && !restarting) onExited(code, signal);
        restarting = false;

        onForking();
        subp = child_process.fork(file);
    }

    startProcess(false);

    subp.addListener("exit", (code, signal) => {
        if(shouldRestart) startProcess(true, code, signal);
        else subp = undefined;
    });

    intercom.subscribe(["subprocess:" + id], (message, respond) => {
        let command = message.command;
        switch(command) {
            case "restart":
                restarting = true;
                subp.kill(); // restart process by killing it (on exit will be called)
                respond({error: false, message: "Restart signal sent. Wait and check for isRunning if necessary."});
                break;
            case "isRunning":
                respond({error: false, running: subp != undefined && subp.exitCode === null});
                break;
        }
    });

    return {getProcess: () => subp};
}

/**
 * Forks a JS file, restart it automatically and displays status messages.
 * @param {string} file The JS file to fork.
 * @param {string} id The process internal name.
 * @param {string} name The process display name for status messages.
 */
function forkNamed(file, id, name) {
    return fork(file, id, () => {
        logger.info("Forking " + name + "...");
    }, (code, signal) => {
        logger.info("Process of " + name + " exited unexpectedly (" + code + ").");
    });
}


module.exports.fork = fork;
module.exports.forkNamed = forkNamed;