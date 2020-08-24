const BuildAddon = require("./lib_addon");
const allowed_packages = {
    "make": "make",
    "gcc": "gcc"
};

class BuildToolsAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let pythonVersion = (addonData.version || "latest").toString();
        if(pythonVersion == "latest") pythonVersion = "3";

        if(!(["2", "3"].includes(pythonVersion))) {
            throw "Invalid Python version. Builds only support python2 and python3.";
        } else {
            logger("Installing python" + pythonVersion + " (please wait, it might take a moment)...");
            let resp = await utils.execCommand("apk add --no-cache python" + pythonVersion, undefined, false, "root");
            if(resp.err.trim().length > 0) throw resp.err;
            logger("python" + pythonVersion + " installed.");
        }
        
        let tools = addonData.tools || [];
        if(tools.length == 0) logger("No build tool to install.");
        else {
            for(let tool of tools) {
                let package = allowed_packages[tool];
                if(package != undefined) {
                    logger("Installing build tool " + tool + (package == tool ? "..." : " (package " + package + ")..."));
                    let resp = await utils.execCommand("apk add --no-cache " + package, undefined, false, "root");
                    if(resp.err.trim().length > 0) throw resp.err;
                } else throw "Tool '" + tool + "' doesn't exist. Cannot continue building addon.";
            }

            logger("All requested build tools are installed.");
        }
    }

    static displayName() {
        return "Python";
    }
}

module.exports = BuildToolsAddon;