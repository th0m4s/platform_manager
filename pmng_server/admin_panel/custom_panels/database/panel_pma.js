const docker_manager = require("../../../docker_manager");
const plugins_manager = require("../../../plugins_manager");
const path = require("path");
const pfs = require("fs").promises;
const httpProxyServer = require("http-proxy").createProxyServer();
const CustomPanel = require("../lib_panel");
const mariadb_network = require("../../../plugins/plugin_mariadb").NETWORK_NAME;

async function replaceContents(contents) {
    if(process.env.DB_MODE == "socket") {
        contents = contents.replace("__ALLOW_ADMIN", "true");
        contents = contents.replace("__DBSOCKET", process.env.DB_SOCKET);
        contents = contents.replace("__DBUSER", process.env.DB_USER);
        contents = contents.replace("__DBPASS", process.env.DB_PASSWORD);
    } else contents = contents.replace("__ALLOW_ADMIN", "false");

    contents = contents.replace("__CTRLUSER", "root");
    contents = contents.replace("__CTRLPASS", (await plugins_manager.getPluginGlobalConfig("mariadb")).adminPassword);

    contents = contents.replace("__PMABL", process.env.PMA_BLOWFISH);
    contents = contents.replace("__PMAURI", "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") +"://admin." + process.env.ROOT_DOMAIN + "/databases"); // databases is from DatabasePanel.route()

    return contents;
}

class DatabasePanel extends CustomPanel {
    static async startPanel() {
        await docker_manager.docker.container.list({filters: {label: ["pmng.containertype=panel", "pmng.panel=phpmyadmin"]}}).then(async (containers) => {
            if(containers.length == 0) {
    
                let configFile = path.resolve(__dirname, "config.inc.php");
                let defaultsConfigFile = path.resolve(__dirname, "config.defaults.php");
    
                let configCtn = await replaceContents((await pfs.readFile(defaultsConfigFile)).toString());
                await pfs.writeFile(configFile, configCtn);


                let createFile = path.resolve(__dirname, "create_tables.inc.sh");
                let defaultsCreateFile = path.resolve(__dirname, "create_tables.defaults.sh");

                let createCtn = await replaceContents((await pfs.readFile(defaultsCreateFile)).toString());
                await pfs.writeFile(createFile, createCtn);
                await pfs.chmod(createFile, "755");
    
                // now create pma container
                await docker_manager.docker.container.create({
                    Image: "pmng/panel-pma",
                    Hostname: "phpmyadmin",
                    name: "pmng_panel_pma",
                    Labels: {
                        "pmng.containertype": "panel",
                        "pmng.panel": "phpmyadmin"
                    },
                    Env: [
                        "PORT=33307"
                    ],
                    StopTimeout: 3,
                    HostConfig: {
                        AutoRemove: true,
                        NetworkMode: mariadb_network,
                        PortBindings: {
                            "33307/tcp": [{HostPort: "33307"}]
                        },
                        Binds: [
                            configFile + ":/etc/phpmyadmin/config.inc.php",
                            createFile + ":/var/start/create_tables.inc.sh"
                        ]
                    }
                }).then((container) => {
                    return container.start();
                });
            }
        });
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