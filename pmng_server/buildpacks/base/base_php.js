const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const child_process = require("child_process");
const Buildpack = require("../lib_pack");

class BasePHPBuildpack extends Buildpack {
    static async build(projectName, projectData, utils, logger, hasAddons) {
        logger("Analyzing project...");
    
        if(!utils.exists("d", "public")) {
            throw "Cannot build PHP project. Only files in the public directory are served and no matching directory was found.";
        }
    
        let baseContents = (await utils.execCommand("ls -1")).out.split("\n");
        if(baseContents.some((name) => {
            return name.endsWith(".php");
        })) {
            logger("WARNING: You placed PHP files in the project root, and will not be served as they are not in the public directory.");
        }
    
        // check vendor for composer packages
        if(await utils.exists("d", "vendor")) {
            logger("Removing vendor...");
            if((await utils.execCommand("rm -rf ./vendor")).err.length > 0) {
                logger("vendor cannot be deleted.")
                logger("The buildpack will try to override these files.");
            } else logger("User-provided vendor removed.");
        }
    
        let hasComposer = await utils.exists("f", "composer.json");
    
        if(hasComposer) {
            logger("Installing dependencies using composer...");
            let {out, err, code} = await utils.execCommand("composer install --no-dev -o");
            if(code > 0) {
                throw "Error during composer installation (exitcode: " + code + "): " + err; 
            } else logger("Project installed.")
        } else logger("No composer.json file found. No package to install.");
    
        return ["/var/start/entrypoint.sh"]; // all php based should use this entrypoint script (except if return is changed in the child buildpack)
    }

    static availableAddons(projectData) {
        return ["nodejs"];
    }
}


module.exports = BasePHPBuildpack;