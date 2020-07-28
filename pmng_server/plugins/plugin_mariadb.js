const intercom = require("../intercom/intercom_client").connect();
const string_utils = require("../string_utils");
const Knex = require("knex");
const mdb = require('knex-mariadb');
const logger = require('simple-node-logger').createSimpleLogger();
const docker_manager = require("../docker_manager");
const path = require("path");
const fs = require("fs"), pfs = fs.promises;
const runtime_cache_delay = 30000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});

const PLUGIN_CONTAINER_NAME = "pmng_gplugin_mariadb";
async function startGlobalPlugin(plugindirectory, globalconfig, setconfig) {
    // only called once by the docker manager to load plugins
    // setconfig is a callback to save the config of the plugin

    if(globalconfig.adminPassword == undefined) {
        globalconfig.adminPassword = string_utils.generatePassword(28, 40);
        await setconfig(globalconfig);
    }

    await docker_manager.docker.container.list({filters: {label: ["pmng.containertype=globalplugin", "pmng.pluginname=mariadb"]}}).then(async (containers) => {
        if(containers.length == 0) {

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

            // now create gplugin container
            await docker_manager.docker.container.create({
                Image: "pmng/plugin-mariadb",
                Hostname: "mariadb",
                name: PLUGIN_CONTAINER_NAME,
                Labels: {
                    "pmng.containertype": "globalplugin",
                    "pmng.pluginname": "mariadb"
                },
                HostConfig: {
                    AutoRemove: true,
                    NetworkMode: "bridge",
                    PortBindings: {
                        "3306/tcp": [{HostPort: "33306"}] // 3306 is host mariadb server: bind guest server to 33306 on host
                    },
                    Binds: [
                        dataDir + ":/var/lib/mysql",
                        configDir + ":/etc/my.cnf.d"
                    ]
                },
                Env: [
                    "MYSQL_ROOT_PASSWORD=" + globalconfig.adminPassword
                ]
            }).then((container) => {
                return container.start();
            });
        }
    });

    const knex = Knex({
        client: mdb,
        connection: {
            host: "localhost",
            user: "root",
            port: "33306",
            password: globalconfig.adminPassword
        }
    });

    intercom.subscribe(["plugin_mariadb"], async (message, respond) => {
        let projectname = message.project || "", projectconfig = message.projectconfig || "";
        switch(message.command) {
            case "project_installPlugin": 
                await knex.raw("CREATE USER 'dbu_" + projectname + "' IDENTIFIED BY '" + projectconfig.password + "';");
                await knex.raw("CREATE DATABASE `db_" + projectname + "`;");
                await knex.raw("GRANT ALL PRIVILEGES ON `db_" + projectname + "`.* TO 'dbu_" + projectname + "'@'%';");
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

function startProjectPlugin(projectname, containerconfig, network, plugincontainername, pluginconfig) {
    // mariadb is resolved as the container of the mariadb server into the mariadb docker bridge network
    containerconfig.Env = containerconfig.Env.concat(["DB_HOST=mariadb", "DB_PORT=3306", "DB_USER=dbu_" + projectname, "DB_PASSWORD=" + pluginconfig.password, "DB_NAME=db_" + projectname]);
    return containerconfig;
}

function stopProjectPlugin(projectname, projectConfig, projectNetworkName) {
    return docker_manager.docker.network.list({filters: {name: [projectNetworkName]}}).then((networks) => {
        if(networks.length == 1) {
            return networks[0].disconnect({
                Container: PLUGIN_CONTAINER_NAME
            });
        }
    });
}

function projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
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

function installPlugin(projectname, pluginconfig) {
    // global config not available, because called from any "thread"
    return intercom.sendPromise("plugin_mariadb", {command: "project_installPlugin", project: projectname, projectconfig: pluginconfig});
}

function uninstallPlugin(projectname, pluginconfig) {
    // global config not available, because called from any "thread"
    return intercom.sendPromise("plugin_mariadb", {command: "project_uninstallPlugin", project: projectname});
}

function getDefaultConfig() {
    // force a new password to be generated if the plugin is removed and reinstalled
    return {password: string_utils.generatePassword(16, 24)};
}

function _getDatabasesSizes() {
    return intercom.sendPromise("plugin_mariadb", {command: "databasesSizes"});
}; const getDatabasesSizes = runtime_cache(_getDatabasesSizes);

function getUsage(projectname) {
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


module.exports.startGlobalPlugin = startGlobalPlugin;
module.exports.startProjectPlugin = startProjectPlugin;
module.exports.stopProjectPlugin = stopProjectPlugin;
module.exports.projectContainerCreated = projectContainerCreated;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;
module.exports.getUsage = getUsage;
module.exports.prepareRouter = () => {};
module.exports.getConfigForm = () => [];

module.exports.getDefaultConfig = getDefaultConfig;