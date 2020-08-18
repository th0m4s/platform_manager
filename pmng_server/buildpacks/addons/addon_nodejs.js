const BuildAddon = require("./lib_addon");
const bent = require("bent");
const fs = require("fs");
const path = require("path");
const latestVersion = "v14.8.0";
const NODE_SERVER = "https://unofficial-builds.nodejs.org/download/release";

class NodeJSAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let nodeVersion = (addonData.version || "latest").toString();
        if(nodeVersion == "latest") nodeVersion = latestVersion;
        else if(!nodeVersion.startsWith("v")) nodeVersion = "v" + nodeVersion;
        
        // same install process as in Dockerfile, but does not allow building from source
        let bentVersionCheck = bent(NODE_SERVER, "HEAD", 200, 301, 404);        
        logger("Checking version...");
        
        let bentVersionResponse;
        try {
            bentVersionResponse = await bentVersionCheck("/" + nodeVersion);
        } catch(error) {
            throw "Cannot check NodeJS version: " + error;
        }
        if(bentVersionResponse.status == 404) throw "This NodeJS version doesn't exist.";

        // will use tar.xz (like in Dockerfile)
        let filename = "node-" + nodeVersion + "-linux-x64-musl.tar.xz";

        let bentVersioned = bent(NODE_SERVER + "/" + nodeVersion + "/"), bentCheckumResp;
        logger("Downloading build checksum...");
        try {
            bentCheckumResp = (await (await bentVersioned("SHASUMS256.txt")).text()).trim();
        } catch(error) {
            throw "Cannot download NodeJS build checksum: " + error;
        }
        
        let buildChecksum = "";
        for(let line of bentCheckumResp.split("\n")) {
            line = line.trim();
            if(line.length > 0) {
                let parts = line.split("  ");
                if(parts.length == 2) {
                    if(parts[1] == filename) {
                        buildChecksum = parts[0];
                        break;
                    }
                }
            }
        }

        if(buildChecksum == "") throw "Cannot find build checksum on the server.";
        
        logger("Downloading NodeJS...");
        let downloadPaths = utils.temporaryFile(filename);
        try {
            let writeStream = fs.createWriteStream(downloadPaths.host);
            let downloadStream = await bentVersioned(filename);

            downloadStream.pipe(writeStream);

            await new Promise((resolve, reject) => {
                downloadStream.on("error", reject);
                downloadStream.on("end", resolve);
            });
        } catch(error) {
            throw "Cannot download NodeJS build: " + error;
        }

        logger("Verifying downloaded file...");
        let tempDir = path.dirname(downloadPaths.container);
        let checkExec = await utils.execCommand("echo \"" + buildChecksum + "  " + filename + "\" | sha256sum -c -s -", undefined, false, "project", tempDir);
        if(checkExec.code != 0) {
            if(checkExec.err.trim() == "") throw "Invalid download checksum! Please try again.";
            else throw "Cannot check build checksum: " + checkExec.err;
        }

        logger("Extracting archive...");
        let extractExec = await utils.execCommand("tar -xJf " + filename + " -C /usr/local --strip-components=1 --no-same-owner", undefined, false, "root", tempDir);
        if(extractExec.code != 0)
            throw "Cannot extract NodeJS archive: " + extractExec.err;

        logger("Creating symlink...");
        let symlinkExec = await utils.execCommand("ln -s /usr/local/bin/node /usr/local/bin/nodejs", undefined, false, "root");
        if(symlinkExec.code != 0) 
            throw "Cannot create NodeJS symlink: " + symlinkExec.err;

        logger("NodeJS " + nodeVersion + " successfully installed.");
    }

    static displayName() {
        return "NodeJS";
    }
}

module.exports = NodeJSAddon;