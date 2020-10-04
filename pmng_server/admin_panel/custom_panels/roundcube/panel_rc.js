const docker_manager = require("../../../docker_manager");
const plugins_manager = require("../../../plugins_manager");
const string_utils = require("../../../string_utils");
const subprocess_util = require("../../../subprocess_util");
const database_server = require("../../../database_server");
const path = require("path");
const pfs = require("fs").promises;
const httpProxyServer = require("http-proxy").createProxyServer();
const CustomPanel = require("../lib_panel");
const logger = require("../../../platform_logger").logger();

const RC_DBNAME = "roundcube";
function checkAndStart(shouldRestart) {
    return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=panel", "pmng.panel=roundcube"]}}).then(async (containers) => {
        if(containers.length == 0 || shouldRestart || containers[0].data.Labels["pmng.panelversion"] != panel_version) {
            if(containers.length > 0) await containers[0].stop();

            let rcSqlUser = "roundcube", rcSqlPassword = string_utils.generatePassword(16, 24);
            await database_server.database.raw("CREATE DATABASE IF NOT EXISTS `" + RC_DBNAME + "`;");
            await database_server.database.raw("GRANT ALL PRIVILEGES ON `" + RC_DBNAME + "`.* TO '" + rcSqlUser + "'@'%' IDENTIFIED BY '" + rcSqlPassword + "';");
            let sqlArgs = {__DBNAME: RC_DBNAME, __DBSOCKET: "/var/start/mysqld.sock", __DBUSER: rcSqlUser, __DBPASS: rcSqlPassword};

            let configFile = path.resolve(__dirname, "config.inc.php");
            let defaultsConfigFile = path.resolve(__dirname, "config.defaults.php");

            let configCtn = string_utils.replaceArgs((await pfs.readFile(defaultsConfigFile)).toString(), Object.assign({__RCDESKEY: process.env.RC_DESKEY, __ROOT_DOMAIN: process.env.ROOT_DOMAIN}, sqlArgs));
            await pfs.writeFile(configFile, configCtn);

            let initDbFile = path.resolve(__dirname, "init_db.inc.sh");
            let defaultsInitDbFile = path.resolve(__dirname, "init_db.defaults.sh");

            let initDbCtn = string_utils.replaceArgs((await pfs.readFile(defaultsInitDbFile)).toString(), sqlArgs);
            await pfs.writeFile(initDbFile, initDbCtn);
            await pfs.chmod(initDbFile, "755");

            let Binds = [
                configFile + ":/var/project/public/config/config.inc.php",
                initDbFile + ":/var/start/init_db.inc.sh",
                process.env.DB_SOCKET + ":/var/start/mysqld.sock"
            ];

            // now create rc container
            return docker_manager.docker.container.create({
                Image: "pmng/panel-rc",
                Hostname: "rouncube",
                name: "pmng_panel_rc",
                Labels: {
                    "pmng.containertype": "panel",
                    "pmng.panel": "roundcube",
                    "pmng.panelversion": panel_version
                },
                Env: [
                    "PORT=8025"
                ],
                StopTimeout: 1,
                HostConfig: {
                    AutoRemove: true,
                    NetworkMode: "bridge",
                    PortBindings: {
                        "8025/tcp": [{HostPort: "8025"}]
                    },
                    Binds
                }
            }).then((container) => {
                return container.start();
            }).then(() => {
                logger.info("Rouncube custom admin panel started.");
                return true;
            }).catch((error) => {
                logger.error("Cannot start RC panel: " + error);
                return false;
            });
        } else return true; // already started
    });
}

const panel_version = "8";   // |
const forceRestart = false;  // | like pma_panel
class WebmailPanel extends CustomPanel {
    static getHeaderLinks() {
        // not using custom headers because webmail link is inside mails menu
    }

    static async startPanel(mainPanelInstance) {
        if(process.env.DB_MODE == "socket") {
            subprocess_util.fakeFork("rc_panel", () => {
                return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=panel", "pmng.panel=roundcube"]}}).then((containers) => {
                    return containers.length > 0;
                });
            }, async () => {
                await checkAndStart(true);
            });
    
            return checkAndStart(forceRestart);
        } else {
            subprocess_util.fakeFork("rc_panel", () => {
                return false;
            }, async () => {
                throw "Cannot run Roundcube without a socket connection to the main database.";
            });

            return false;
        }
    }

    static route() {
        return "webmail";
    }

    static requiresUtils() {
        return false;
    }

    static handleRequest(req, res) {
        httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port: 8025}});
    }
}


module.exports = WebmailPanel;