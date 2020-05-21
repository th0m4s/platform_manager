const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const child_process = require("child_process");

async function build(projectname, deployFolder, logger) {
    let pkg = {};
    // TODO: build in a container and get result with archive

    logger("Analyzing package.json...");
    try {
        // do not use require as it caches the file
        pkg = JSON.parse(await pfs.readFile(path.resolve(deployFolder, "package.json")));
    } catch(error) {
        throw new Error("Cannot build NodeJS project. package.json not found.");
    }

    let mainscript = pkg.main || "index.js";
    try {
        await pfs.access(path.resolve(deployFolder, mainscript));
    } catch(error) {
        throw new Error("Cannot find main file.");
    }

    // check node_modules
    try {
        let modulesPath = path.resolve(deployFolder, "node_modules");
        await pfs.access(modulesPath);
        logger("Removing node_modules...");
        await rmfr(modulesPath);
        logger("User-provided modules removed.");
    } catch(error) {
        // no modules dir is normal
    }

    let npm = true;
    try {
        await pfs.access(path.resolve(deployFolder, "yarn.lock"));
        npm = false;
    } catch(error) {}

    let cmd = "";
    if(npm) {
        logger("Installing node modules from npm...");
        cmd = "npm install --production";
    } else {
        logger("Installing node modules from yarn...");
        cmd = "yarn install --production --frozen-lockfile";
    }

    let install_process = child_process.spawn("/bin/bash", ["-c", cmd], {cwd: deployFolder});
    await new Promise((resolve, reject) => {
        let error = "";
        install_process.stderr.on("data", (data) => {
            error += data;
        });

        install_process.on("exit", (exitcode, signal) => {
            if(exitcode === null || exitcode > 0) {
                reject("Error during modules installation (" + exitcode + ", " + signal + "): " + error);
            } else {
                logger("Project installed.");
                resolve();
            }
        });
    });

    return ["node", mainscript];
}


module.exports.build = build;