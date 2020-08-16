const BuildAddon = require("./lib_addon");

class OpenJDKAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let jdkVersion = (addonData.version || "latest").toString();
        if(jdkVersion == "latest") jdkVersion = "11";

        if(!(["8", "11"].includes(jdkVersion))) {
            throw "Invalid OpenJDK version. Only versions 8 and 11 are supported.";
        } else {
            logger("Installing OpenJDK (please wait, it might take a moment)...");
            let resp = await utils.execCommand("apk add --no-cache openjdk" + jdkVersion + "-jre", undefined, false, "root");
            if(resp.err.trim().length > 0) throw resp.err;
            logger("OpenJDK installed.");
        }
    }
}

module.exports = OpenJDKAddon;