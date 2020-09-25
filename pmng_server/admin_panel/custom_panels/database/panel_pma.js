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
const mariadb_network = require("../../../plugins/plugin_mariadb").NETWORK_NAME;

async function replaceContents(contents) {
    if(process.env.DB_MODE == "socket") {
        contents = contents.replace(/__ALLOW_ADMIN/g, "true");
        contents = contents.replace(/__DBSOCKET/g, "/var/start/mysqld.sock"); // path of mounted db_socket
        contents = contents.replace(/__DBUSER/g, process.env.DB_USER);
        contents = contents.replace(/__DBPASS/g, process.env.DB_PASSWORD);
        contents = contents.replace(/__DBNAME/g, database_server.DB_NAME);
    } else contents = contents.replace(/__ALLOW_ADMIN/g, "false");

    contents = contents.replace(/__DOMAIN/g, "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") +"://admin." + process.env.ROOT_DOMAIN);

    contents = contents.replace(/__CTRLUSER/g, "root");
    contents = contents.replace(/__CTRLPASS/g, (await plugins_manager.getPluginGlobalConfig("mariadb")).adminPassword);

    contents = contents.replace(/__PMABL/g, process.env.PMA_BLOWFISH);
    contents = contents.replace(/__PMAURI/g, "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") +"://admin." + process.env.ROOT_DOMAIN + "/databases"); // databases is from DatabasePanel.route()

    return contents;
}

function checkAndStart(shouldRestart) {
    return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=panel", "pmng.panel=phpmyadmin"]}}).then(async (containers) => {
        if(containers.length == 0 || shouldRestart || containers[0].data.Labels["pmng.panelversion"] != panel_version) {
            if(containers.length > 0) await containers[0].stop();

            let configFile = path.resolve(__dirname, "config.inc.php");
            let defaultsConfigFile = path.resolve(__dirname, "config.defaults.php");

            let configCtn = await replaceContents((await pfs.readFile(defaultsConfigFile)).toString());
            await pfs.writeFile(configFile, configCtn);


            let createFile = path.resolve(__dirname, "create_tables.inc.sh");
            let defaultsCreateFile = path.resolve(__dirname, "create_tables.defaults.sh");

            let createCtn = await replaceContents((await pfs.readFile(defaultsCreateFile)).toString());
            await pfs.writeFile(createFile, createCtn);
            await pfs.chmod(createFile, "755");

            let Binds = [
                configFile + ":/etc/phpmyadmin/config.inc.php",
                createFile + ":/var/start/create_tables.inc.sh"
            ];

            if(process.env.DB_MODE == "socket") {
                let ssoLoginFile = path.resolve(__dirname, "login.sso.inc.php");
                let defaultsSsoLoginFile = path.resolve(__dirname, "login.sso.defaults.php");
    
                // let ssoPassword = string_utils.generatePassword(16, 24), ssoUsername = "ssologin";
                let ssoLogin = await replaceContents((await pfs.readFile(defaultsSsoLoginFile)).toString());
                await pfs.writeFile(ssoLoginFile, ssoLogin);

                /*let ssoUserResults = await database_server.database.raw("SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = '" + ssoUsername + "') AS 'exists';");
                let ssoUserExists = ssoUserResults[0][0].exists != 0;
                if(!ssoUserExists)
                    await database_server.database.raw("CREATE USER '" + ssoUsername + "' IDENTIFIED BY '" + ssoPassword + "';");
                else database_server.database.raw("ALTER USER '" + ssoUsername + "'@ IDENTIFIED BY '" + ssoPassword + "';");*/

                Binds.push(ssoLoginFile + ":/var/project/public/login.sso.php");
                Binds.push(process.env.DB_SOCKET + ":/var/start/mysqld.sock");
            }

            // now create pma container
            await docker_manager.docker.container.create({
                Image: "pmng/panel-pma",
                Hostname: "phpmyadmin",
                name: "pmng_panel_pma",
                Labels: {
                    "pmng.containertype": "panel",
                    "pmng.panel": "phpmyadmin",
                    "pmng.panelversion": panel_version
                },
                Env: [
                    "PORT=33307"
                ],
                StopTimeout: 1,
                HostConfig: {
                    AutoRemove: true,
                    NetworkMode: mariadb_network,
                    PortBindings: {
                        "33307/tcp": [{HostPort: "33307"}]
                    },
                    Binds
                }
            }).then((container) => {
                return container.start();
            }).then(() => {
                logger.info("phpMyAdmin custom admin panel started.");
            });
        }
    });
}

const panel_version = "9"; // used to restart the panel container if changes are made
const forceRestart = false; // for debug purposes, should not be true on git
class DatabasePanel extends CustomPanel {
    static getHeaderLinks() {
        return [["Databases", "/databases/" + (process.env.DB_MODE == "socket" ? "index.php?server=2" : "")]];
    }

    static async startPanel(mainPanelInstance) {
        mainPanelInstance.addErrorPage("dbsso", "pdo", "SSO database error", "Unable to connect to the SSO database.<br/>Please manually use your credentials to login.", "/databases/");
        mainPanelInstance.addErrorPage("dbsso", "uid", "SSO database error", "Invalid user id from token.<br/>Please manually use your credentials to login.", "/databases/");

        subprocess_util.fakeFork("pma_panel", () => {
            return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=panel", "pmng.panel=phpmyadmin"]}}).then((containers) => {
                return containers.length > 0;
            });
        }, async () => {
            await checkAndStart(true);
        });

        await checkAndStart(forceRestart);
    }

    static route() {
        return "databases";
    }

    static requiresUtils() {
        return false;
    }

    static handleRequest(req, res) {
        httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port: 33307}})
    }
}


module.exports = DatabasePanel;