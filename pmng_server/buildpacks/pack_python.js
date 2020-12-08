const docker_manager = require("../docker_manager");
const bent = require("bent");
const pfs = require("fs").promises;
const path = require("path");
const logger = require("../platform_logger").logger();
const Buildpack = require("./lib_pack");

const PYTHON_SERVER = "https://www.python.org/ftp/python/";
class PythonBuildpack extends Buildpack {
    static async build(projectName, projectData, utils, logger, hasAddons) {
        if(await utils.exists("f", "requirements.txt")) {
            logger("Installing PIP requirements (please wait)...");
            let {out, err, code} = await utils.execCommand("pip install -r requirements.txt");
            if(code > 0) throw "Error during modules installation (" + code + "): " + err;
            else logger("Project installed.");
        } else logger("No modules to install.");
    
        return ["python", "index.py"];
    }

    static availableAddons(projectData) {
        return ["openjdk", "nodejs", "buildtools"];
    }

    static async imageDetails(projectData) {
        let requestedVersion = (projectData.version || "latest").toLowerCase();
        let pythonVersions = await getPythonVersions();

        let foundVersion = undefined;
        if(requestedVersion != "latest") {
            if(!requestedVersion.endsWith(".")) {
                if(requestedVersion.startsWith("v")) requestedVersion = requestedVersion.substring(1);
                for(let version of pythonVersions) {
                    if(version.startsWith(requestedVersion)) {
                        foundVersion = version;
                        break;
                    }
                }
            }            
        } else foundVersion = pythonVersions[0];

        if(foundVersion == undefined) return super.imageDetails();
        
        // check if image already exists
        let imageName = getPythonImageName(foundVersion);
        if(await docker_manager.ensureImageExists(imageName)) {
            return {
                image: imageName,
                built: true,
                build: async () => {}
            }
        } else return {
            image: imageName,
            built: false,
            build: () => { return buildPythonVersion(foundVersion); }
        }
    }
}

function getPythonImageName(version) {
    return "pmng/python" + (":" + version || "");
}

async function buildPythonVersion(version) {
    let pythonVersions = await getPythonVersions();
    if(!pythonVersions.includes(version)) throw "Cannot build invalid Python version: " + version;

    let buildSource = await pfs.readFile(path.resolve(__dirname, "..", "docker_images", "python", "Dockerfile"), "utf-8");
    let tag = getPythonImageName(version);

    await docker_manager.ensureImageExists(tag, buildSource.replace(/%pythonVersion%/g, version), {latest: pythonVersions[0] == version});
}

let lastVersCheck = 0, _pythonVersions = [];
async function getPythonVersions() {
    let currentTime = Math.floor(Date.now()/1000);
    if(currentTime - lastVersCheck > 3600) {
        let bentVersionList = bent(PYTHON_SERVER);
        let bentVersionResponse;
        try {
            bentVersionResponse = await bentVersionList("/");
        } catch(error) {
            throw "Cannot list Python versions: " + error;
        }

        let versionsPage = await bentVersionResponse.text();
        _pythonVersions = [...versionsPage.matchAll(/href="(?<v>[\d.]+)\/"/g)].map((x) => x.groups.v).filter((x) => {let c = x.charCodeAt(0); return c >= 48 && c <= 58; }).sort((a, b) => {
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
        lastVersCheck = currentTime;
    }

    return _pythonVersions;
}

module.exports = PythonBuildpack;
module.exports.PYTHON_SERVER = PYTHON_SERVER;