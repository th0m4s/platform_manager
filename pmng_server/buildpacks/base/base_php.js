const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const child_process = require("child_process");
const Buildpack = require("../lib_pack");

class BasePHPBuildpack extends Buildpack {
    static async build(projectname, deployFolder, logger) {
        logger("Analyzing project...");
    
        try {
            let stats = await pfs.stat(path.resolve(deployFolder, "public"));
            if(!stats.isDirectory()) throw new Error(); // will be catched and rethrown with message
        } catch(error) {
            throw new Error("Cannot build PHP project. Only files in the public directory are served and no matching directory was found.");
        }
    
        let baseContents = await pfs.readdir(deployFolder);
        if(baseContents.some((name) => {
            return name.endsWith(".php");
        })) {
            logger("Warning: You placed PHP files in the project root, and will not be served as they are not in the public directory.");
        }
    
        // check vendor for composer packages
        try {
            let vendorPath = path.resolve(deployFolder, "vendor");
            await pfs.access(vendorPath);
            logger("Removing vendor...");
            await rmfr(vendorPath);
            logger("User-provided vendor directory removed.");
        } catch(error) {
            // no vendor dir is normal
        }
    
        let hasComposer = false;
        try {
            await pfs.access(path.resolve(deployFolder, "composer.json"));
            hasComposer = true;
        } catch(error) {}
    
    
        if(hasComposer) {
            logger("Installing dependencies using composer...");
            let install_process = child_process.spawn("/bin/bash", ["-c", "composer install --no-dev -o"], {cwd: deployFolder});
            await new Promise((resolve, reject) => {
                let error = "";
                install_process.stderr.on("data", (data) => {
                    error += data;
                });
    
                install_process.on("exit", (exitcode, signal) => {
                    if(exitcode === null || exitcode > 0) { // composer echoes everything on stderr, so check by using exitcode or termsign
                        reject("Error during composer installation (" + exitcode + ", " + signal + "): " + error);
                    } else {
                        logger("Project installed.");
                        resolve();
                    }
                });
            });
        } else logger("No composer.json file found. No package to install.");
    
        return ["/var/start/entrypoint.sh"]; // all php based should use this entrypoint script (except if return is changed in the child buildpack)
    }
}


module.exports = BasePHPBuildpack;