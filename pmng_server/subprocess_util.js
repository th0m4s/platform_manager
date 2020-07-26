const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();

function fork(file, id, onForking, onExited) {
    let subp, shouldRestart = true;
    let startProcess = (restart) => {
        if(restart) onExited(code, signal);

        onForking();
        subp = child_process.fork(file);
    }

    startProcess(false);

    subp.addListener("exit", (code, signal) => {
        if(shouldRestart) startProcess(true);
        else subp = undefined;
    });

    intercom.subscribe(["subprocess:" + id], (message, respond) => {
        let command = message.command;
        switch(command) {
            case "restart":
                startProcess(true);
                respond({error: false, message: "Restart signal sent. Check for isRunning if necessary."});
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