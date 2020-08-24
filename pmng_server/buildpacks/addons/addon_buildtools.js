const BuildAddon = require("./lib_addon");

class BuildToolsAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let allowed_packages = {
            "make": "make",
            "gcc": "gcc",
            "g++": "g++"
        };        

        let tools = addonData.tools || [];
        if(tools.length == 0) logger("No build tool to install.");
        else {
            for(let tool of tools) {
                let alpinePkg = allowed_packages[tool];
                if(alpinePkg != undefined) {
                    logger("Installing build tool " + tool + (alpinePkg == tool ? "..." : " (package " + alpinePkg + ")..."));
                    let resp = await utils.execCommand("apk add --no-cache " + alpinePkg, undefined, false, "root");
                    if(resp.err.trim().length > 0) throw resp.err;
                } else throw "Tool '" + tool + "' doesn't exist. Cannot continue building addon.";
            }

            logger("All requested build tools are installed.");
        }
    }

    static displayName() {
        return "Build Tools";
    }
}

module.exports = BuildToolsAddon;