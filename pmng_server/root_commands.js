const child_process = require("child_process");
const intercom = require("./intercom/intercom_client").connect();
const path = require("path");
const pfs = require("fs").promises;
const fs_utils = require("./fs_utils");
const logger = require("./platform_logger").logger();

intercom.subscribe(["rootProcessor"], (message, respond) => {
    switch(message.command) {
        case "storagePlugin":
            processStorage(message, respond);
            break;
        case "mailManager":
            processMail(message, respond);
            break;
        default:
            respond({error: true, message: "Unknown root command."});
            break;
    }
});

/**
 * Process an intercom message specifically crafted with an action from the mail manager.
 * @param {Object} message The original intercom message with storage specific parameters.
 * @param {(response: object) => void} respond The intercom respond callback.
 */
async function processMail(message, respond) {
    let paths = message.paths, action = message.action;

    switch(action) {
        case "convert":
            try {
                await fs_utils.moveDirectory(paths.maildirectory, paths.vhostsDirectory, [], ["vhosts"]);
                logger.tag("MAIL", "Copied vhosts files to new directory.");

                try {
                    await pfs.mkdir(paths.pfSpool);
                    logger.tag("MAIL", "Created postfix spool directory...");
                } catch(error) {
                    if(error.code != "EEXIST") throw error;
                }

                respond({error: false, message: "Converted!"});
            } catch(error) {
                respond({error: true, message: error});
            }
            break;
    }
}

/**
 * Process an intercom message specifically crafted with a permanent storage action.
 * @param {Object} message The original intercom message with storage specific parameters.
 * @param {(response: object) => void} respond The intercom respond callback.
 */
function processStorage(message, respond) {
    let project = message.project, action = message.action;
    let baseDir = path.join(process.env.PLUGINS_PATH, "storages");

    if(project.includes(".") || project.includes("&") || project.includes(">") || project.includes("|") || project.includes(";")) {
        respond({error: true, message: "Security test failed. Project name cannot contain special characters."});
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

logger.tag("ROOT", "Root commands processor fork started.");