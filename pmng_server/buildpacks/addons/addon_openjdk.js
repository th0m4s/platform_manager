const BuildAddon = require("./lib_addon");

class OpenJDKAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let jdkVersion = (addonData.version || "latest").toString();
        if(jdkVersion == "latest") jdkVersion = "11";

        if(!(["7", "8", "9", "10", "11"].includes(jdkVersion))) {
            throw "Invalid OpenJDK version. Only versions 7 to 11 are supported (with OpenJDK 7.0 being deprecated).";
        } else {
            logger("Installing OpenJDK (please wait, it might take a moment)...");
            let resp = await utils.execCommand("apk add --no-cache openjdk" + jdkVersion + "-jre", undefined, false, "root");
            if(resp.err.trim().length > 0) throw resp.err;
            logger("OpenJDK installed.");
        }
    }

    static displayName() {
        return "OpenJDK";
    }
}

module.exports = OpenJDKAddon;