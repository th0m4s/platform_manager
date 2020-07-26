const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();

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

function forkNamed(file, id, name) {
    return fork(file, id, () => {
        logger.info("Forking " + name + "...");
    }, (code, signal) => {
        logger.info("Process of " + name + " exited unexpectedly (" + code + ").");
    });
}


module.exports.fork = fork;
module.exports.forkNamed = forkNamed;