const BuildAddon = require("./lib_addon");
const bent = require("bent");
const fs = require("fs"), pfs = fs.promises;
const path = require("path");
const plugins_manager = require("../../plugins_manager");

class WebAppAddon extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let webapp = addonData.webapp;
        if(webapp == undefined) throw "No webapp was provided for the addon.";

        // TODO: add version choice
        // TODO: add checksum check
        switch(webapp) {
            case "wordpress":
                let bentWordpress = bent("https://wordpress.org/"), filename = "latest.tar.gz";

                logger("Downloading Wordpress...");
                let downloadPaths = utils.temporaryFile(filename);
                try {
                    let writeStream = fs.createWriteStream(downloadPaths.host);
                    let downloadStream = await bentWordpress(filename);

                    downloadStream.pipe(writeStream);

                    await new Promise((resolve, reject) => {
                        downloadStream.on("error", reject);
                        downloadStream.on("end", resolve);
                    });
                } catch(error) {
                    throw "Cannot download Wordpress: " + error;
                }

                // check if public dir exists, and create it if missing (because extract requires this directory)
                if(!utils.exists("d", "public"))
                    await utils.execCommand("mkdir ./public");

                logger("Extracting archive...");
                let tempDir = path.dirname(downloadPaths.container);
                let extractExec = await utils.execCommand("tar -xzf " + filename + " -C /var/project/public --strip-components=1 --no-same-owner", undefined, false, "project", tempDir);
                if(extractExec.code != 0)
                    throw "Cannot extract Wordpress archive: " + extractExec.err;
                logger("Wordpress files added to the project.\n");

                try {
                    // try to automatically setup database, so user will just have to enter website name and admin user info
                    logger("Saving database settings...");

                    let pluginconfig = await plugins_manager.getConfig("mariadb", projectName);
                    if(pluginconfig == undefined)
                        throw "WARNING: Plugin mariadb is not enabled for this project. A database is required to run Wordpress.";

                    let defaultSettings = (await pfs.readFile(path.resolve(__dirname, "files", "wp-config.defaults.php"))).toString("utf-8");
                    // not using getenv() because this file can be overwritten when settings are changed
                    defaultSettings = defaultSettings.replace("__dbname", "db_" + projectName);
                    defaultSettings = defaultSettings.replace("__dbuser", "dbu_" + projectName);
                    defaultSettings = defaultSettings.replace("__dbpass", pluginconfig.password);

                    await utils.writeFile("public/wp-config.php", defaultSettings);
                    logger("Wordpress was successfully installed into your project.");
                } catch(error) {
                    logger("The installer could not set the default values for the database connection:");
                    logger(error);
                    logger("You'll have to manually setup the database according to the details from your admin panel.");
                }

                break;
            default:
                throw "Invalid webapp provided. Cannot build addon.";
        }
    }

    static displayName() {
        return "WebApp";
    }
}

module.exports = WebAppAddon;