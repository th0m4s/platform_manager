const intercom = require("../intercom/intercom_client").connect();
const string_utils = require("../string_utils");
const Knex = require("knex");
const mdb = require('knex-mariadb');
const logger = require('simple-node-logger').createSimpleLogger();
const docker_manager = require("../docker_manager");
const path = require("path");
const fs = require("fs"), pfs = fs.promises;
const runtime_cache_delay = 30000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const Plugin = require("./lib_plugin");
const plugins_manager = require("../plugins_manager");
const project_manager = require("../project_manager");
const database_server = require("../database_server");

const PLUGIN_CONTAINER_NAME = "pmng_gplugin_mariadb";
const NETWORK_NAME = PLUGIN_CONTAINER_NAME + "_net";

function getKnex(password) {
    return Knex({
        client: mdb,
        connection: {
            host: "localhost",
            user: "root",
            port: "33306",
            password
        }
    });
}

function _getDatabasesSizes() {
    return intercom.sendPromise("plugin_mariadb", {command: "databasesSizes"});
}; const getDatabasesSizes = runtime_cache(_getDatabasesSizes);

async function updatePrivileges(project, collaboratorId, mode, knex) {
    let collaboratorName = (await database_server.findUserById(collaboratorId)).name;

    await knex.raw("GRANT ALL PRIVILEGES ON `db_" + project + "`.* TO '" + collaboratorName + "'@'%';");
    // add all then remove, privileges are not flushed yet
    // TODO: maybe grant/revoke in one command
    await knex.raw("REVOKE ALL PRIVILEGES ON `db_" + project + "`.* FROM '" + collaboratorName + "'@'%';");

    if(mode != "remove") {
        await knex.raw("GRANT " + (mode == "manage" ? "ALL PRIVILEGES" : "SELECT, SHOW VIEW") + " ON `db_" + project + "`.* TO '" + collaboratorName + "'@'%';");
    }

    await knex.raw("FLUSH PRIVILEGES;");
}

class MariaDBPlugin extends Plugin {
    static async startGlobalPlugin(plugindirectory, globalconfig, setconfig) {
        if(globalconfig.adminPassword == undefined) {
            globalconfig.adminPassword = string_utils.generatePassword(28, 40);
            await setconfig(globalconfig);
        }

        await docker_manager.docker.container.list({filters: {label: ["pmng.containertype=globalplugin", "pmng.pluginname=mariadb"]}}).then(async (containers) => {
            if(containers.length == 0) {
                await docker_manager.docker.network.list({filters: {name: [NETWORK_NAME]}}).then((networks) => {
                    if(networks.length > 0) {
                        for(let network of networks) {
                            return network.status().then((network) => {
                                let prom = [];

                                for(let cid of Object.keys(network.data.Containers)) {
                                    prom.push(network.disconnect({
                                        Container: cid
                                    }));
                                }

                                return Promise.all(prom).then(() => {
                                    return network.remove();
                                })
                            });
                        }
                    }
                });

                let dataDir = path.join(plugindirectory, "data");
                try {
                    await pfs.access(dataDir);
                } catch(error) {
                    await pfs.mkdir(dataDir);
                }

                let configDir = path.join(plugindirectory, "config");
                try {
                    await pfs.access(configDir);
                } catch(error) {
                    await pfs.mkdir(configDir);
                }

                // create network
                await docker_manager.docker.network.create({
                    Name: NETWORK_NAME,
                    CheckDuplicates: true,
                    Driver: "bridge", // default
                    Labels: {
                        "pmng.networktype": "gplugin",
                        "pmng.pluginname": "mariadb"
                    }
                });

                // now create gplugin container
                return docker_manager.docker.container.create({
                    Image: "pmng/plugin-mariadb",
                    Hostname: "mariadb",
                    name: PLUGIN_CONTAINER_NAME,
                    Labels: {
                        "pmng.containertype": "globalplugin",
                        "pmng.pluginname": "mariadb"
                    },
                    HostConfig: {
                        AutoRemove: true,
                        NetworkMode: NETWORK_NAME,
                        PortBindings: {
                            "3306/tcp": [{HostPort: "33306"}] // 3306 is host mariadb server: bind guest server to 33306 on host
                        },
                        Binds: [
                            dataDir + ":/var/lib/mysql",
                            configDir + ":/etc/my.cnf.d"
                        ]
                    },
                    NetworkingConfig: {
                        EndpointsConfig: {
                            [NETWORK_NAME]: {
                                Aliases: ["mariadb"] // same as hostname
                            }
                        }
                    },
                    Env: [
                        "MYSQL_ROOT_PASSWORD=" + globalconfig.adminPassword
                    ]
                }).then((container) => {
                    return container.start();
                });
            }
        });

        const knex = getKnex(globalconfig.adminPassword);

        intercom.subscribe(["projectsevents"], (message, respond) => {
            let collaboratorId = message.collaboratorId, project = message.project;
            switch(message.event) {
                case "add_collab":
                    updatePrivileges(project.name, collaboratorId, message.manageable ? "manage" : "view", knex);
                case "update_collab":
                    updatePrivileges(project, collaboratorId, message.mode, knex);
                    break;
            }
        });

        // TODO: keep intercom? because we have localKnex()
        // localKnex was created to create users accounts in each process without transmitting real user passwords on intercom
        // at least keep projectsevents
        intercom.subscribe(["plugin_mariadb"], async (message, respond) => {
            let projectname = message.project || "", projectconfig = message.projectconfig || "";
            switch(message.command) {
                case "project_installPlugin":
                    let username = (await database_server.findUserById((await project_manager.getProject(projectname)).ownerid)).name;

                    await knex.raw("CREATE USER 'dbu_" + projectname + "' IDENTIFIED BY '" + projectconfig.password + "';");
                    await knex.raw("CREATE DATABASE `db_" + projectname + "`;");
                    await knex.raw("GRANT ALL PRIVILEGES ON `db_" + projectname + "`.* TO 'dbu_" + projectname + "'@'%';");
                    await knex.raw("GRANT ALL PRIVILEGES ON `db_" + projectname + "`.* TO '" + username + "'@'%';");
                    await knex.raw("FLUSH PRIVILEGES;");
                    respond({error: false, message: "Plugin installed."});
                    break;
                case "project_uninstallPlugin": 
                    await knex.raw("DROP USER 'dbu_" + projectname + "';");
                    await knex.raw("DROP DATABASE `db_" + projectname + "`;");
                    await knex.raw("FLUSH PRIVILEGES;");
                    respond({error: false, message: "Plugin uninstalled."});
                    break;
                case "databasesSizes":
                    knex.raw('SELECT table_schema "db", SUM(data_length + index_length) "bytes_size" FROM information_schema.tables GROUP BY table_schema;').then((result) => {
                        let sizes = {};
                        for(let db of result[0]) {
                            sizes[db.db] = db.bytes_size;
                        }

                        respond(sizes);
                    });
                    break;
            }
        });
    }

    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        // mariadb is resolved as the container of the mariadb server into the mariadb docker bridge network
        containerconfig.Env = containerconfig.Env.concat(["DB_HOST=mariadb", "DB_PORT=3306", "DB_USER=dbu_" + projectname, "DB_PASSWORD=" + pluginconfig.password, "DB_NAME=db_" + projectname]);
        return containerconfig;
    }

    static stopProjectPlugin(projectname, pluginconfig, networkname) {
        return docker_manager.docker.network.list({filters: {name: [networkname]}}).then((networks) => {
            if(networks.length == 1) {
                return networks[0].disconnect({
                    Container: PLUGIN_CONTAINER_NAME
                });
            }
        });
    }

    static projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        return docker_manager.docker.network.list({filters: {name: [networkname]}}).then((networks) => {
            if(networks.length == 1) {
                return networks[0].connect({
                    Container: PLUGIN_CONTAINER_NAME,
                    EndpointConfig: {
                        Aliases: ["mariadb"]
                    }
                });
            }
        });
    }

    static installPlugin(projectname, pluginconfig) {
        return intercom.sendPromise("plugin_mariadb", {command: "project_installPlugin", project: projectname, projectconfig: pluginconfig});
    }

    static uninstallPlugin(projectname, pluginconfig) {
        return intercom.sendPromise("plugin_mariadb", {command: "project_uninstallPlugin", project: projectname});
    }

    static getDefaultConfig() {
        // force a new password to be generated if the plugin is removed and reinstalled
        return {password: string_utils.generatePassword(16, 24)};
    }

    static getUsage(projectname) {
        return getDatabasesSizes().then((sizes) => {
            if(sizes.hasOwnProperty("db_" + projectname)) {
                let size = sizes["db_" + projectname];
                return {type: "unlimited", value: size, formatted: string_utils.formatBytes(size) + " of used database space."};
            } else {
                return {type: "unlimited", value: 0, formatted: "No data to evaluate (0 bytes used)."};
                // we cannot know if no value means an error, because an empty database will not appear in the sizes
            }
        });
    }

    static getUserDetails(projectname, pluginconfig) {
        if(projectname == undefined) return true;
        else return {type: "html", html: "Connection details (only works from your project):"
            + "<ul><li><b>Host:</b> mariadb</li><li><b>Database name:</b> db_" + projectname + "</li><li><b>Username:</b> dbu_" + projectname + "</li><li><b>Password:</b> <span class='hidden-details'>" + pluginconfig.password + "</span></li></ul>"}
    }

    static async localKnex() {
        return getKnex((await plugins_manager.getPluginGlobalConfig("mariadb")).adminPassword);
    }
}

module.exports = MariaDBPlugin;
module.exports.NETWORK_NAME = NETWORK_NAME;