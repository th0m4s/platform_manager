const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager");
const database_server = require("../database_server");
const intercom = require("../intercom/intercom_client").connect();
const Plugin = require("./lib_plugin");

let invalidPorts = [33306, 3306];
async function isPortValid(port) {
    return !(port < 1024 || port > 65535 || port == 33306 || port == 33307 || (port >= 8000 && port <= 8999) || (port >= 21001 && port <= 21999) || (port >= 49152 && port <= 49999) || invalidPorts.includes(port)
        || (await intercom.sendPromise("plugin_custom-port", {command: "checkPort", port}).then((response) => response.used)));
}

let customPortsCache = {};
function portSaved(project, config) {
    return intercom.sendPromise("plugin_custom-port", {command: "setPort", project, port: config.port});
}

function localCheck(port, projectname) {
    port = parseInt(port);
    return isPortValid(port).then((result) => {
        if(!result) throw "Invalid port.";
        else return port;
    });
}

class CustomPortPlugin extends Plugin {
    static async startGlobalPlugin(plugindirectory) {
        database_server.isInstalled().then((installed) => {
            if(installed) {
                plugins_manager.getAllConfigs("custom-port").then((configs) => {
                    for(let [project, config] of Object.entries(configs)) {
                        if(config.port > 0) customPortsCache[project] = config.port
                    }
                });
            }
        });
    
        intercom.subscribe(["plugin_custom-port"], (message, respond) => {
            let command = message.command, project = message.project, port = message.port;
            switch(command) {
                case "setPort":
                    if(port == 0) delete customPortsCache[project];
                    else customPortsCache[project] = port;
    
                    respond({error: false}); // force respond because portSaved and uninstallPlugin require promise
                    break;
                case "checkPort":
                    respond({used: Object.values(customPortsCache).includes(port)});
                    break;
                case "getPort":
                    if(customPortsCache.hasOwnProperty(project)) respond({error: false, port: customPortsCache[project]});
                    else respond({error: true});
                    break;
            }
        });
    }

    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig, flags) {
        let port = pluginconfig.port;
        if(port > 0) {
            containerconfig.Env = containerconfig.Env.concat(["CUSTOM_PORT=" + port]);
            containerconfig.HostConfig.PortBindings[port + "/tcp"] = [{HostPort: port.toString()}];
            containerconfig.ExposedPorts[port + "/tcp"] = {};
        }
    
        return containerconfig
    }

    static uninstallPlugin(projectname, pluginconfig) {
        return intercom.sendPromise("plugin_custom-port", {command: "setPort", project: projectname, port: 0});
    }

    static getDefaultConfig() {
        return {port: 0};
    }

    static getConfigForm() {
        return [
            {config: "port", text: "Custom port", small: "With a custom port, a second port is bound from the server to your project via the CUSTOM_PORT environment variable.", placeholder: "Enter a custom port or 0 to disable the plugin", type: "number", localCheck, remoteCheck: "/checkPort/"}
        ];
    }

    static getConfigDetails() {
        return {
            saved: portSaved,
            needRestart: (projectname, oldconfig, newconfig) => true,
            detailsText: ""
        };
    }

    static prepareRouter(router) {
        router.get("/checkPort/:projectname/:port?", (req, res) => {
            let port = parseInt(req.params.port || "");
            if(isNaN(port)) {
                res.json({valid: false, message: "Port should be a number."});
            } else {
                isPortValid(port, req.params.projectname).then((valid) => {
                    res.json({valid, message: valid ? "Valid port." : "Invalid port."});
                }).catch((error) => {
                    res.json({valid: false, message: "Cannot check port: " + error});
                });
            }
        });
    
        return router;
    }

    static async getUsage(projectname) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("custom-port")) {
            let text = project.plugins["custom-port"].port == 0 ? "Plugin disabled." : "Custom port bound to " + project.plugins["custom-port"].port + ".";
            return {type: "custom_text", text};
        } else return {type: "measure_error"};
    }
}

module.exports = CustomPortPlugin;