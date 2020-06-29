const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();
const path = require("path");
const logger = require("./platform_logger").logger();

intercom.subscribe(["rootProcessor"], (message, respond) => {
    switch(message.command) {
        case "storagePlugin":
            processStorage(message, respond);
            break;
        default:
            respond({error: true, message: "Unknown root command."});
            break;
    }
});

function processStorage(message, respond) {
    let project = message.project, action = message.action;
    let baseDir = path.join(process.env.PLUGINS_PATH, "storages");

    if(project.includes(".")) {
        respond({error: true, message: "Security test failed. Project name cannot contain '.'."});
        return;
    }

    switch(action) {
        case "mount":
            // TODO: real error detection
            child_process.exec("mount -t auto -o loop ./disks/" + project + ".img ./mounts/" + project, {cwd: baseDir}, () => {
                // uid and gid options for mount are not available for ext4, so set owner with chown
                child_process.exec("chown -R " + process.env.PROC_UID + ":" + process.env.PROC_GID + " ./mounts/" + project, {cwd: baseDir}, () => {
                    respond({error: false, message: "Project storage directory mounted."});
                });
            });
            break;
        case "unmount":
            child_process.exec("umount ./mounts/" + project, {cwd: baseDir}, () => {
                respond({error: false, message: "Project storage directory unmounted."});
            });
            break;
    }
}

logger.info("Root commands processor fork started.");