const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const child_process = require("child_process");
const Buildpack = require("../lib_pack");
const forbidden_no_public_root_files = [".pmng.json"];

async function moveDirectory(source, dest, root = false) {
    try {
        await pfs.mkdir(dest);
    } catch(e) {
        if(e.code != "EEXIST") throw e;
    }

    let subs = await Promise.all((await pfs.readdir(source)).map((x) => pfs.stat(path.join(source, x)).then((stat) => {
        return [x, stat];
    })));

    let current = [];
    for(let [name, stat] of subs) {

        if(stat.isDirectory() && (!root || name != "public")) {
            current.push(moveDirectory(path.join(source, name), path.join(dest, name)));
        } else if(stat.isFile() && (!root || !forbidden_no_public_root_files.includes(name))) {
            current.push(pfs.rename(path.join(source, name), path.join(dest, name)));
        }
    }

    return Promise.all(current);
}

class BasePHPBuildpack extends Buildpack {
    static async build(projectName, projectData, utils, logger, hasAddons) {
        logger("Analyzing project...");
    
        if(projectData.create_public == true) {
            logger("Moving files to public directory...");
            let hostDirectory = utils.getBuildHostDirectory();
            await moveDirectory(hostDirectory, path.join(hostDirectory, "public"), true);
        }

        if(!utils.exists("d", "public"))
            throw "Cannot build PHP project. Only files in the public directory are served and it was not found (to use livestorage, enable the option from the persistent-storage plugin options).";

        if(!utils.exists("d", "temp"))
            await utils.execCommand("mkdir ./temp");
    
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
        return ["nodejs", "python", "buildtools", "webapp", "appbinary"];
    }

    // php images are required in docker_manager because panels are based on these images
    static _imageDetails(image) {
        return {
            image,
            built: true,
            build: async () => {}
        } 
    }
}


module.exports = BasePHPBuildpack;