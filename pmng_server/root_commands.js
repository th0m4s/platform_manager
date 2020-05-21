const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();
const path = require("path");
const logger = require("./platform_logger").logger();

intercom.subscribe(["rootProcessor"], (message, id) => {
    switch(message.command) {
        case "storagePlugin":
            processStorage(message, id);
            break;
        default:
            intercom.respond(id, {error: true, message: "Unknown root command."});
            break;
    }
});

function processStorage(message, id) {
    let project = message.project, action = message.action;
    let baseDir = path.join(process.env.PLUGINS_PATH, "storages");

    if(project.includes(".")) {
        intercom.respond(id, {error: true, message: "Security test failed. Project name cannot contain '.'."});
        return;
    }

    switch(action) {
        case "mount":
            // TODO: real error detection
            child_process.exec("mount -t auto -o loop ./disks/" + project + ".img ./mounts/" + project, {cwd: baseDir}, () => {
                // uid and gid options for mount are not available for ext4, so set owner with chown
                child_process.exec("chown -R " + process.env.PROC_UID + ":" + process.env.PROC_GID + " ./mounts/" + project, {cwd: baseDir}, () => {
                    intercom.respond(id, {error: false, message: "Project storage directory mounted."});
                });
            });
            break;
        case "unmount":
            child_process.exec("umount ./mounts/" + project, {cwd: baseDir}, () => {
                intercom.respond(id, {error: false, message: "Project storage directory unmounted."});
            });
            break;
    }
}

logger.info("Root commands processor fork started.");