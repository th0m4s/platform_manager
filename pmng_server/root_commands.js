const pmng = require("../pmng_lib");

const path = require("path");
const child_process = require("child_process");

const logger = new pmng.Logger();

class RootCommandsProcessor {
    #intercom = new pmng.Intercom.Client();

    constructor() {
        this.#intercom.subscribe(["rootProcessor"], (message, respond) => {
            switch(message.command) {
                case "storagePlugin":
                    this.#processStorage(message, respond);
                    break;
                default:
                    respond({error: true, message: "Unknown root command."});
                    break;
            }
        });

        logger.info("Root commands processor fork started.");
    }

    /**
     * Process an intercom message specifically crafted with a permanent storage action.
     * @param {Object} message The original intercom message with storage specific parameters.
     * @param {(response: object) => void} respond The intercom respond callback.
     */
    #processStorage(message, respond) {
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

    dispose() {
        this.#intercom.close();
    }
}

if(module === require.main) {
    new RootCommandsProcessor();
} else {
    module.exports = RootCommandsProcessor;
}