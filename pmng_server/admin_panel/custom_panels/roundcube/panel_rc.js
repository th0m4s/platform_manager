const docker_manager = require("../../../docker_manager");
const plugins_manager = require("../../../plugins_manager");
const string_utils = require("../../../string_utils");
const subprocess_util = require("../../../subprocess_util");
const database_server = require("../../../database_server");
const mail_manager = require("../../../mails/mail_manager");
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
            await docker_manager.ensureImageExists("pmng/panel-rc", "file:" + path.resolve(__dirname, "../../..", "docker_images", "mails", "alpine-roundcube"), {latest: true, adminLogs: true});

            let rcSqlUser = "roundcube", rcSqlPassword = string_utils.generatePassword(16, 24);
            await database_server.database.raw("CREATE DATABASE IF NOT EXISTS `" + RC_DBNAME + "`;");
            await database_server.database.raw("GRANT ALL PRIVILEGES ON `" + RC_DBNAME + "`.* TO '" + rcSqlUser + "'@'%' IDENTIFIED BY '" + rcSqlPassword + "';");
            let sqlArgs = {__DBNAME: RC_DBNAME, __DBSOCKET: "/var/start/mysqld.sock", __DBUSER: rcSqlUser, __DBPASS: rcSqlPassword};

            let configFile = path.resolve(__dirname, "config.inc.php");
            let defaultsConfigFile = path.resolve(__dirname, "config.defaults.php");

            let configCtn = string_utils.replaceArgs((await pfs.readFile(defaultsConfigFile)).toString(), Object.assign({__RCDESKEY: process.env.RC_DESKEY, __ROOT_DOMAIN: process.env.ROOT_DOMAIN, __enableSSL: process.env.ENABLE_HTTPS.toLowerCase() == "true"}, sqlArgs));
            await pfs.writeFile(configFile, configCtn);

            let initDbFile = path.resolve(__dirname, "init_db.inc.sh");
            let defaultsInitDbFile = path.resolve(__dirname, "init_db.defaults.sh");

            let initDbCtn = string_utils.replaceArgs((await pfs.readFile(defaultsInitDbFile)).toString(), sqlArgs);
            await pfs.writeFile(initDbFile, initDbCtn);
            await pfs.chmod(initDbFile, "755");

            let ssoPluginFile = path.resolve(__dirname, "pmng_sso.inc.php");
            let defaultsSsoPluginFile = path.resolve(__dirname, "pmng_sso.defaults.php");

            let mainSqlArgs = {__MAIL_DBNAME: mail_manager.MAIL_DBNAME, __DBSOCKET: "/var/start/mysqld.sock", __DBNAME: database_server.DB_NAME, __DBUSER: process.env.DB_USER, __DBPASS: process.env.DB_PASSWORD};
            let ssoPluginCtn = string_utils.replaceArgs((await pfs.readFile(defaultsSsoPluginFile)).toString(), mainSqlArgs);
            await pfs.writeFile(ssoPluginFile, ssoPluginCtn);

            let aliasesPluginFile = path.resolve(__dirname, "pmng_aliases.inc.php");
            let defaultsAliasesPluginFile = path.resolve(__dirname, "pmng_aliases.defaults.php");

            let aliasesPluginCtn = string_utils.replaceArgs((await pfs.readFile(defaultsAliasesPluginFile)).toString(), Object.assign({}, mainSqlArgs, {__DBNAME: mail_manager.MAIL_DBNAME}));
            await pfs.writeFile(aliasesPluginFile, aliasesPluginCtn);

            let Binds = [
                configFile + ":/var/project/public/config/config.inc.php",
                ssoPluginFile + ":/var/project/public/plugins/pmng_sso/pmng_sso.php",
                aliasesPluginFile + ":/var/project/public/plugins/pmng_aliases/pmng_aliases.php",
                initDbFile + ":/var/start/init_db.inc.sh",
                process.env.DB_SOCKET + ":/var/start/mysqld.sock"
            ];

            logger.tag("WEB", "Starting RC panel container...");

            // now create rc container
            return docker_manager.docker.container.create({
                Image: "pmng/panel-rc",
                Hostname: "roundcube",
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
                logger.tag("WEB", "Starting RC panel container...");
                return container.start();
            }).then(() => {
                logger.tag("WEB", "Roundcube custom admin panel started.");
                return true;
            }).catch((error) => {
                logger.tagError("WEB", "Cannot create or the start the RC panel: " + error);
                return false;
            });
        } else return true; // already started
    });
}

const panel_version = "19";
const forceRestart = process.env.NODE_ENV == "development";
class WebmailPanel extends CustomPanel {
    static setHeaderLinks(headerLinks) {
        if(process.env.DB_MODE == "socket") {
            headerLinks.mails.list.webmail = {
                name: "Webmail",
                type: "link",
                link: "/webmail/",
                allHeader: true,
                access: true
            };
        }
    }

    static async startPanel(mainPanelInstance) {
        if(process.env.DB_MODE == "socket") {
            mainPanelInstance.addErrorPage("mailsso", "pdo", "SSO database error", "Unable to connect to the SSO database.<br/>Please manually use your credentials to login.", "/webmail/");
            mainPanelInstance.addErrorPage("mailsso", "uid", "SSO database error", "Unable to find a matching email account based on your request.<br/>Please manually use your credentials to login.", "/webmail/");
            mainPanelInstance.addErrorPage("mailsso", "scope", "Permission error", "Your account access scope doesn't permit you to access this account.", "/webmail/");

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

    static handleRequest(req, res) {
        httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port: 8025}});
    }
}


module.exports = WebmailPanel;