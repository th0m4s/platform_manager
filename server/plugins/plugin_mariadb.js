const intercom = require("../intercom/intercom_client").connect();
const string_utils = require("../string_utils");
const Knex = require("knex");
const mdb = require('knex-mariadb');
const logger = require('simple-node-logger').createSimpleLogger();
const docker_manager = require("../docker_manager");

const networkName = "pmng_gplugin_mariadb_net";
async function startGlobalPlugin(plugindirectory, globalconfig, setconfig) {
    // only called once by the docker manager to load plugins
    // setconfig is a callback to save the config of the plugin

    if(globalconfig.adminPassword == undefined) {
        globalconfig.adminPassword = string_utils.generatePassword(28, 40);
        await setconfig(globalconfig);
    }

    await docker_manager.docker.container.list({filters: {label: ["pmng.containertype=globalplugin", "pmng.pluginname=mariadb"]}}).then(async (containers) => {
        if(containers.length == 0) {
            let networks = await docker_manager.docker.network.list({filters: {name: [networkName]}});
            if(networks.length == 0) {
                // no mariadb network, create it
                await docker_manager.docker.network.create({
                    Name: networkName,
                    CheckDuplicates: true,
                    Driver: "bridge", // default
                    Labels: {
                        "pmng.globalplugin": "mariadb"
                    }
                });
            }

            // now create gplugin container
            await docker_manager.docker.container.create({
                Image: "pmng/plugin-mariadb",
                Hostname: "mariadb",
                name: "pmng_gplugin_mariadb",
                Labels: {
                    "pmng.containertype": "globalplugin",
                    "pmng.pluginname": "mariadb"
                },
                HostConfig: {
                    AutoRemove: true,
                    NetworkMode: networkName,
                    PortBindings: {
                        "3306/tcp": [{HostPort: "33306"}]
                    }
                },
                Binds: [
                    plugindirectory + ":/var/lib/mysql"
                ],
                Env: [
                    "MYSQL_ROOT_PASSWORD=" + globalconfig.adminPassword
                ],
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkName]: {
                            Aliases: ["mariadb"] // same as hostname   
                        }
                    }
                }
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

    intercom.subscribe(["plugin_mariadb"], async (message, id) => {
        let projectname = message.project, projectconfig = message.projectconfig;
        switch(message.command) {
            case "project_installPlugin": 
                await knex.raw("CREATE USER 'dbu_" + projectname + "' IDENTIFIED BY '" + projectconfig.password + "';");
                await knex.raw("CREATE DATABASE `db_" + projectname + "`;");
                await knex.raw("GRANT ALL PRIVILEGES ON `db_" + projectname + "`.* TO 'dbu_" + projectname + "'@'%';");
                await knex.raw("FLUSH PRIVILEGES;");
                intercom.respond(id, {error: false, message: "Plugin installed."});
                break;
            case "project_uninstallPlugin": 
                await knex.raw("DROP USER 'dbu_" + projectname + "';");
                await knex.raw("DROP DATABASE `db_" + projectname + "`;");
                await knex.raw("FLUSH PRIVILEGES;");
                intercom.respond(id, {error: false, message: "Plugin uninstalled."});
                break;
        }
    });
}

function startProjectPlugin(projectname, containerconfig, network, plugincontainer, pluginconfig) {
    // mariadb is resolved as the container of the mariadb server into the mariadb docker bridge network
    containerconfig.Env = containerconfig.Env.concat(["DB_HOST=mariadb", "DB_PORT=3306", "DB_USER=dbu_" + projectname, "DB_PASSWORD=" + pluginconfig.password, "DB_NAME=db_" + projectname]);
    return containerconfig;
}

function projectContainerCreated(projectname, containerconfig, pluginconfig) {
    return docker_manager.docker.network.list({filters: {name: [networkName]}}).then((networks) => {
        if(networks.length == 1) {
            return networks[0].connect({
                Container: containerconfig.name
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


module.exports.startGlobalPlugin = startGlobalPlugin;
module.exports.startProjectPlugin = startProjectPlugin;
module.exports.projectContainerCreated = projectContainerCreated;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;

module.exports.getDefaultConfig = getDefaultConfig;