const docker_manager = require("../docker_manager");
const bent = require("bent");
const pfs = require("fs").promises;
const path = require("path");
const logger = require("../platform_logger").logger();
const Buildpack = require("./lib_pack");

const NODE_SERVER = "https://unofficial-builds.nodejs.org/download/release";
const SUPPORTED_PREFIXES = ["v10", "v12", "v14", "v15"];
class NodeBuildpack extends Buildpack {
    static async build(projectName, projectData, utils, logger, hasAddons) {
        let pkg = {};

        // version in projectData is not the full number, use command instead
        let nodeVersion = (await utils.execCommand("node --version")).out.trim();
        if(!SUPPORTED_PREFIXES.some((prefix) => { return nodeVersion.startsWith(prefix); })) {
            logger("WARNING: You are currently using Node " + nodeVersion + ", which is no longer officially supported!");
            logger("Please switch ASAP to the LTS version (v12), the maintained version (v10) or the latest one (v14).\n");
        } else logger("Building using Node " + nodeVersion + ".");

        if(projectData.version == "latest" && !hasAddons) {
            logger("WARNING: You are using the 'latest' version tag and your project, with time it may not run with");
            logger("the version it was built with. For more consistency, please switch to a specific version tag.\n");
        }

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
            cmd = "yarn install --production --frozen-lockfile && yarn cache clean";
        }

        let {out, err, code} = await utils.execCommand(cmd);
        if(code > 0) throw "Error during modules installation (" + code + "): " + err;
        else logger("Project installed.");
    
        return ["node", mainscript];
    }

    static availableAddons(projectData) {
        return ["openjdk", "python", "buildtools"];
    }

    static async imageDetails(projectData) {
        let requestedVersion = (projectData.version || "latest").toLowerCase();
        let nodeVersions = await getNodeVersions();

        let foundVersion = undefined;
        if(requestedVersion != "latest") {
            if(!requestedVersion.endsWith(".")) {
                if(requestedVersion.startsWith("v")) requestedVersion = requestedVersion.substring(1);
                for(let version of nodeVersions) {
                    if(version.startsWith(requestedVersion)) {
                        foundVersion = version;
                        break;
                    }
                }
            }            
        } else foundVersion = nodeVersions[0];

        if(foundVersion == undefined) return super.imageDetails();
        
        // check if image already exists
        let imageName = getNodeImageName(foundVersion);
        if(await docker_manager.ensureImageExists(imageName)) {
            return {
                image: imageName,
                built: true,
                build: async () => {}
            }
        } else return {
            image: imageName,
            built: false,
            build: () => { return buildNodeVersion(foundVersion); }
        }
    }
}

function getNodeImageName(version) {
    return "pmng/node" + (":" + version || "");
}

async function buildNodeVersion(version) {
    let nodeVersions = await getNodeVersions();
    if(!nodeVersions.includes(version)) throw "Cannot build invalid Node version: " + version;

    let buildSource = await pfs.readFile(path.resolve(__dirname, "..", "docker_images", "node", "Dockerfile"), "utf-8");
    let tag = getNodeImageName(version);

    await docker_manager.ensureImageExists(tag, buildSource.replace(/%nodeVersion%/g, version), {latest: nodeVersions[0] == version});
}

let lastNodeCheck = 0, _nodeVersions = [];
async function getNodeVersions() {
    let currentTime = Math.floor(Date.now()/1000);
    if(currentTime - lastNodeCheck > 3600) {
        let bentVersionList = bent(NODE_SERVER);
        let bentVersionResponse;
        try {
            bentVersionResponse = await bentVersionList("/");
        } catch(error) {
            throw "Cannot list NodeJS versions: " + error;
        }

        let versionsPage = await bentVersionResponse.text();
        _nodeVersions = [...versionsPage.matchAll(/href="v(?<v>[\d.]+)\/"/g)].map((x) => x.groups.v).sort((a, b) => {
            let partsA = a.split(".").map((x) => parseInt(x));
            let partsB = b.split(".").map((x) => parseInt(x));

            for(let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
                if(partsA[i] > partsB[i]) return -1;
                else if(partsA[i] < partsB[i]) return 1;
            }

            if(partsA.length > partsB.length) return -1;
            else if(partsA.length < partsB.length) return 1;
            else return 0;
        });
        lastNodeCheck = currentTime;
    }

    return _nodeVersions;
}

module.exports = NodeBuildpack;
module.exports.NODE_SERVER = NODE_SERVER;