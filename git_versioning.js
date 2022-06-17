const child_process = require("child_process");
const logger = require("./pmng_server/platform_logger").logger();

module.exports.readGitInfo = (disableReject = false) => {
    return new Promise((resolve, reject) => {
        if(process.env.PMNG_GIT_TAG != undefined && process.env.PMNG_GIT_COMMIT != undefined) {
            logger.tagInfo("GIT", "Git information already loaded.");
            logger.tagInfo("GIT", process.env.PMNG_GIT_COMMIT + " (" + process.env.PMNG_GIT_TAG + ")");
            resolve();
        } else {
            child_process.exec("git log -1 --format=oneline", (error, stdout, stderr) => {
                if(error) reject(error);
                else {
                    let logRegex = /^(?<commit>[a-f0-9]{40}) (?:\((?:tag: (?<tag>[^,]+)[^)]*|)\) |).*$/gm;
                    let logResult = logRegex.exec(stdout.trim());

                    if(logResult == null) reject(new Error("Cannot get last commit log!"));
                    else {
                        process.env.PMNG_GIT_COMMIT = logResult.groups["commit"];
                        let logTag = logResult.groups["tag"];

                        if(logTag != undefined) {
                            process.env.PMNG_GIT_TAG = logTag;

                            logger.tagInfo("GIT", process.env.PMNG_GIT_COMMIT + " (" + process.env.PMNG_GIT_TAG + ")");
                            resolve();
                        } else {
                            logger.tagInfo("GIT", "Using 'git describe --tags' to read tag info...");
                            child_process.exec("git describe --tags", (tagError, tagStdout, tagStderr) => {
                                process.env.PMNG_GIT_TAG = tagError == null ? tagStdout.trim().split("-")[0] : "unknown";

                                logger.tagInfo("GIT", process.env.PMNG_GIT_COMMIT + " (" + process.env.PMNG_GIT_TAG + ")");
                                resolve();
                            });
                        }
                    }
                }
            });
        }
    }).catch((error) => {
        if(!disableReject) throw error;
        else logger.tagError("GIT", "Cannot get last commit log!" + (error.message ?? error));
    });
};