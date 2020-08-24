const BuildAddon = require("./lib_addon");

class PythonAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let pythonVersion = (addonData.version || "latest").toString();
        if(pythonVersion == "latest") pythonVersion = "3";

        if(!(["2", "3"].includes(pythonVersion))) {
            throw "Invalid Python version. Builds only support python2 and python3.";
        } else {
            if(addonData.dev == true) pythonVersion += "-dev";
            logger("Installing python" + pythonVersion + " (please wait, it might take a moment)...");
            let resp = await utils.execCommand("apk add --no-cache python" + pythonVersion, undefined, false, "root");
            if(resp.err.trim().length > 0) throw resp.err;
            logger("python" + pythonVersion + " installed.");
        }
    }

    static displayName() {
        return "Python";
    }
}

module.exports = PythonAddon;