const express = require("express");
const fs = require("fs");
const docker_manager = require("./docker_manager");
const project_manager = require("./project_manager");
const database_server = require("./database_server");
const intercom = require("./intercom/intercom_client").connect();
const api_auth = require("./admin_panel/api_controllers/v1/api_auth");

let loadedPlugins = {};
function getPlugin(plugin) {
    if(!loadedPlugins.hasOwnProperty(plugin)) {
        loadedPlugins[plugin] = require("./plugins/plugin_" + plugin);
    }

    return loadedPlugins[plugin];
}

function getDefaultConfig(plugin) {
    return getPlugin(plugin).getDefaultConfig();
}

function install(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).installPlugin(projectname, pluginconfig);
}

function uninstall(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).uninstallPlugin(projectname, pluginconfig);
}

function getConfigForm(plugin) {
    return getPlugin(plugin).getConfigForm();
}

let configurablePlugins = {};
function isPluginConfigurable(plugin) {
    if(!configurablePlugins.hasOwnProperty(plugin))
        configurablePlugins[plugin] = getConfigForm(plugin).length > 0;

    return configurablePlugins[plugin];
}

function getRouter() {
    let router = express.Router();

    router.get("/version", (req, res) => res.send("check"));

    // path from main script, not like in require
    for(let filename of fs.readdirSync("./pmng_server/plugins")) {
        if(filename.length > 7 && filename.endsWith(".js")) {
            let pluginname = filename.split(".")[0].substring(7);

            let pluginrouter = express.Router();
            pluginrouter.post("/", (req, res) => {
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
                                    let prom = [];

                                    let inputs = getConfigForm(pluginname), formVerif = {};
                                    for(let configInput of inputs) {
                                        formVerif[configInput.config] = configInput.localCheck || ((x) => Promise.resolve(x));
                                    }

                                    for(let change of changes) {
                                        let configName = change[0];
                                        prom.push(formVerif[configName](change[1]).then((result) => {
                                            pluginConfig[configName] = result;
                                        }));
                                    }

                                    Promise.all(prom).then(() => {
                                        (running ? intercom.sendPromise("dockermng", {command: "stopProject", project: projectname}) : Promise.resolve()).then(() => {
                                            project.plugins[pluginname] = pluginConfig;

                                            project_manager.setPluginsConfig(projectname, project.plugins).then(() => {
                                                let afterProm = [];
                                                for(let configInput of inputs) {
                                                    afterProm.push(configInput.configSaved(projectname, pluginConfig));
                                                }

                                                Promise.allSettled(afterProm).then(() => {
                                                    (running ? intercom.sendPromise("dockermng", {command: "startProject", project: projectname}) : Promise.resolve()).then(() => {
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


module.exports.getDefaultConfig = getDefaultConfig;
module.exports.install = install;
module.exports.uninstall = uninstall;
module.exports.getConfigForm = getConfigForm;
module.exports.isPluginConfigurable = isPluginConfigurable;
module.exports.getPlugin = getPlugin;
module.exports.getRouter = getRouter;
module.exports.getAllConfigs = getAllConfigs;