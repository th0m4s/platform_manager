const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const child_process = require("child_process");
const Buildpack = require("./lib_pack");

class NodeBuildpack extends Buildpack {
    static async build(projectname, utils, logger) {
        let pkg = {};

        logger("Analyzing package.json...");
        try {
            pkg = JSON.parse(await utils.readFile("package.json"));
        } catch(error) {
            throw "Cannot build NodeJS project. package.json not found.";
        }
    
        let mainscript = pkg.main || "index.js";
        if(!(await utils.exists("f", mainscript))) {
            throw "Cannot find main file, please check your package.json.";
        }
    
        // check node_modules
        if(await utils.exists("d", "node_modules")) {
            logger("Removing node_modules...");
            if((await utils.execCommand("rm -rf ./node_modules")).err.length > 0) {
                logger("node_modules cannot be deleted.")
                logger("The buildpack will try to override these files.");
            } else logger("User-provided modules removed.");
        }
    
        let npm = true;
        if(await utils.exists("f", "yarn.lock")) {
            npm = false;
        }
    
        let cmd = "";
        if(npm) {
            logger("Installing node modules from npm (please wait)...");
            cmd = "npm install --production && npm cache clean --force";
        } else {
            logger("Installing node modules from yarn (please wait)...");
            cmd = "yarn install --production --frozen-lockfile";
        }

        let {out, err, code} = await utils.execCommand(cmd);
        if(code > 0) throw "Error during modules installation (" + code + "): " + err;
        else logger("Project installed.");
    
        return ["node", mainscript];
    }
}

module.exports = NodeBuildpack;