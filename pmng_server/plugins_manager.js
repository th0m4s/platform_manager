const express = require("express");
const fs = require("fs");
const docker_manager = require("./docker_manager");
const project_manager = require("./project_manager");
const database_server = require("./database_server");
const pfs = require("fs").promises;
const path = require("path");
const bodyParser = require("./admin_panel/body_parser");
const intercom = require("./intercom/intercom_client").connect();
const api_auth = require("./admin_panel/api_controllers/v1/api_auth");
const LibPlugin = require("./plugins/lib_plugin");

let loadedPlugins = {};
/**
 * Gets a plugin object from its name.
 * 
 * Only static methods are available on plugins.
 * @param {name} plugin The name of the requested plugin.
 * @returns {LibPlugin} The requested plugin.
 */
function getPlugin(plugin) {
    if(!loadedPlugins.hasOwnProperty(plugin)) {
        loadedPlugins[plugin] = require("./plugins/plugin_" + plugin);
    }

    return loadedPlugins[plugin];
}

/**
 * Gets the default config for a specific plugin.
 * @param {string} plugin The name of the requested plugin default config.
 * @returns {Object} The requested plugin default config.
 */
function getDefaultConfig(plugin) {
    return getPlugin(plugin).getDefaultConfig();
}

/**
 * Installs a plugin for a specific project.
 * @param {string} plugin The name of the plugin to install.
 * @param {string} projectname The name of the project to install the plugin for.
 * @param {Object} pluginconfig The configuration of that plugin for that project.
 * @returns {Promise} A promise resolved when the plugin is successfully installed.
 */
function install(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).installPlugin(projectname, pluginconfig);
}

function postInstall(plugin, projectname, allconfigs) {
    return getPlugin(plugin).postInstall(projectname, allconfigs);
}

/**
 * Uninstalls a plugin for a specific project.
 * @param {string} plugin The name of the plugin to uninstall.
 * @param {string} projectname The name of the project to uninstall the project for.
 * @param {Object} pluginconfig The configuration of that plugin for that project.
 * @returns {Promise} A promise resolved when the plugin is successfully uninstalled.
 */
function uninstall(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).uninstallPlugin(projectname, pluginconfig);
}

/**
 * Gets the default config form for a specific plugin.
 * @param {string} plugin The name of the requested plugin config form.
 * @returns {{config: string, text: string, small: string | undefined, placeholder: string | undefined, type: string, localCheck: function, remoteCheck: string | undefined, configSaved: function}[]} The requested plugin config form.
 */
function getConfigForm(plugin) {
    return getPlugin(plugin).getConfigForm();
}

function getConfigDetails(plugin) {
    return getPlugin(plugin).getConfigDetails();
}

let configurablePlugins = {};
/**
 * Checks if a plugin can be configured by the user.
 * @param {string} plugin The name of the plugin to check.
 * @returns {boolean} If the plugin can be configured, *true*, *false* otherwise.
 */
function isPluginConfigurable(plugin) {
    if(!configurablePlugins.hasOwnProperty(plugin))
        configurablePlugins[plugin] = getConfigForm(plugin).length > 0;

    return configurablePlugins[plugin];
}

let detailedPlugins = {};
function isPluginDetailed(plugin) {
    if(!detailedPlugins.hasOwnProperty(plugin)) {
        let details = getPlugin(plugin).getUserDetails();
        detailedPlugins[plugin] = details != undefined && details != false && details.type != "none";
    }

    return detailedPlugins[plugin];
}

/**
 * Gets a router for the plugins API route.
 * 
 * It generates a subrouter for each compatible plugin.
 * @returns {express.Router} The plugins router.
 */
function getRouter() {
    let router = express.Router();

    router.get("/version", (req, res) => res.send("check"));

    // path from main script, not like in require
    for(let filename of fs.readdirSync("./pmng_server/plugins")) {
        if(filename.length > 7 && filename.endsWith(".js") && filename.startsWith("plugin_")) {
            let pluginname = filename.split(".")[0].substring(7);

            let pluginrouter = express.Router();
            pluginrouter.post("/", bodyParser(), (req, res) => {
                api_auth(req, res, (user) => {
                    let changes = req.body.changes;
                    if(changes.length == 0) {
                        res.json({error: true, message: "No changes made."});
                    } else {
                        let projectname = req.body.project;
                        project_manager.canAccessProject(projectname, user.id, true).then(() => {
                            project_manager.getProject(projectname, true).then((project) => {
                                docker_manager.isProjectContainerRunning(projectname).then((running) => {
                                    let pluginConfig = project.plugins[pluginname];
                                    let oldconfig = Object.assign({}, pluginConfig);
                                    let prom = [];

                                    let configDetails = getConfigDetails(pluginname);
                                    let inputs = getConfigForm(pluginname), formVerif = {};
                                    for(let configInput of inputs) {
                                        formVerif[configInput.config] = configInput.localCheck || ((x) => Promise.resolve(x));
                                    }

                                    for(let change of changes) {
                                        let configName = change[0];
                                        prom.push(formVerif[configName](change[1], projectname).then((result) => {
                                            pluginConfig[configName] = result;
                                        }));
                                    }
                                    
                                    let needRestart = configDetails.needRestart(projectname, pluginConfig, oldconfig);
                                    Promise.all(prom).then(() => {
                                        (running && needRestart ? intercom.sendPromise("dockermng", {command: "stopProject", project: projectname}) : Promise.resolve()).then(() => {
                                            project.plugins[pluginname] = pluginConfig;

                                            project_manager.setPluginsConfig(projectname, project.plugins).then(() => {
                                                configDetails.saved(projectname, pluginConfig, oldconfig).then(() => {
                                                    (running && needRestart ? intercom.sendPromise("dockermng", {command: "startProject", project: projectname}) : Promise.resolve()).then(() => {
                                                        res.json({error: false, message: "Plugin configuration saved."});
                                                    }).catch((error) => {
                                                        res.json({error: true, message: "The configuration was saved, but the project didn't restart. Please start it manually from your panel (" + error + ")."});
                                                    });
                                                });
                                            }).catch((error) => {
                                                res.json({error: true, message: "Cannot save configuration: " + error + "<br/>Warning: The project was stopped!"});
                                            });
                                        }).catch((error) => {
                                            res.json({error: true, message: "Cannot stop project: " + error});
                                        });
                                    }).catch((error) => {
                                        res.json({error: true, message: "Invalid change: " + error});
                                    });                                    
                                }).catch((error) => {
                                    res.json({error: true, message: "Cannot check running project: " + error});
                                });
                            }).catch((error) => {
                                res.json({error: true, message: "Cannot fetch (or edit) project: " + error});
                            });
                        }).catch((error) => {
                            res.json({error: true, message: "Cannot access project: " + error});
                        });
                    }
                });
            });

            pluginrouter = getPlugin(pluginname).prepareRouter(pluginrouter);
            if(pluginrouter != undefined) router.use("/" + pluginname, pluginrouter);
        }
    }

    return router;
}

/**
 * Selects all the configurations of a plugin for each project using it.
 * @param {string} pluginname The plugin for which to select all the configurations.
 * @returns {Object} An object with each config as a property, available through the name of each project.
 */
function getAllConfigs(pluginname) {
    return database_server.database("projects").select(["plugins", "name"]).then((results) => {
        let configs = {};

        for(let result of results) {
            let allConfig = JSON.parse(result.plugins);
            if(allConfig[pluginname] != undefined) configs[result.name] = allConfig[pluginname];
        }

        return configs;
    });
}

function getConfig(pluginname, projectname) {
    // not get project nor getAllConfigs because only want part of all the information
    return database_server.database("projects").where("name", projectname).select("plugins").then((results) => {
        if(results.length == 0) return undefined;
        
        let plugins = JSON.parse(results[0].plugins);
        return plugins[pluginname];
    });
}

/**
 * Waits for all the platform processes to be started.
 * @returns {Promise} A promise resolved when all the platform hooks are started.
 */
function waitForHooks() {
    let requiredHooks = {
        "dns": false
    };

    return new Promise((resolve) => {
        intercom.subscribe(["hookStarted"], (message) => {
            requiredHooks[message.hook] = true;
    
            if(!Object.values(requiredHooks).includes(false)) {
                resolve();
            }
        });
    });
}

let allGlobal = undefined;
// not used by docker_manager when starting global plugins
// TODO: add save here and move code from docker_manager
async function getPluginGlobalConfig(pluginname) {
    if(allGlobal == undefined) allGlobal = JSON.parse(await pfs.readFile(path.resolve(process.env.PLUGINS_PATH, "config.json")));

    return allGlobal[pluginname];
}


module.exports.getDefaultConfig = getDefaultConfig;
module.exports.install = install;
module.exports.postInstall = postInstall;
module.exports.uninstall = uninstall;
module.exports.getConfigForm = getConfigForm;
module.exports.getConfigDetails = getConfigDetails;
module.exports.isPluginConfigurable = isPluginConfigurable;
module.exports.isPluginDetailed = isPluginDetailed;
module.exports.getPlugin = getPlugin;
module.exports.getRouter = getRouter;
module.exports.getConfig = getConfig;
module.exports.getAllConfigs = getAllConfigs;
module.exports.waitForHooks = waitForHooks;
module.exports.getPluginGlobalConfig = getPluginGlobalConfig;