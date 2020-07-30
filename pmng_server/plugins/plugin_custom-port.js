const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager");
const intercom = require("../intercom/intercom_client").connect();

function projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) { }

async function stopProjectPlugin(projectname) { }
async function installPlugin(projectname, pluginconfig) { }
async function uninstallPlugin(projectname, pluginconfig) { }

function startProjectPlugin(projectname, containerconfig, network, plugincontainername, pluginconfig) {
    let port = pluginconfig.port;
    containerconfig.Env = containerconfig.Env.concat(["CUSTOM_PORT=" + port]);
    containerconfig.HostConfig.PortBindings[port + "/tcp"] = [{HostPort: port.toString()}];
    containerconfig.ExposedPorts[port + "/tcp"] = {};

    return containerconfig
}


async function getUsage(projectname) {
    let project = await project_manager.getProject(projectname);
    if(project.plugins.hasOwnProperty("custom-port")) {
        let text = project.plugins["custom-port"].port == 0 ? "Plugin disabled." : "Custom port bound to " + project.plugins["custom-port"].port + ".";
        return {type: "custom_text", text};
    } else return {type: "measure_error"};
}

function getDefaultConfig() {
    return {
        port: 0
    };
}

function prepareRouter(router) {
    router.get("/checkPort/:port", (req, res) => {
        let port = parseInt(req.params.port);
        if(isNaN(port)) {
            res.json({valid: false, message: "Port should be a number."});
        } else {
            isPortValid(port).then((valid) => {
                res.json({valid, message: valid ? "Valid port." : "Invalid port."});
            }).catch((error) => {
                res.json({valid: false, message: "Cannot check port: " + error});
            });
        }
    });

    return router;
}

let invalidPorts = [33306, 3306];
async function isPortValid(port) {
    return !(port < 1024 || port > 65535 || (port >= 8000 && port <= 8999) || (port >= 49152 && port <= 49999) || invalidPorts.includes(port)
        || (await intercom.sendPromise("plugin_custom-port", {command: "checkPort", port}).then((response) => response.used)));
}

let customPortsCache = {};
function startGlobalPlugin(plugindirectory) {
    plugins_manager.getAllConfigs("custom-port").then((configs) => {
        for(let [project, config] of Object.entries(configs)) {
            if(config.port > 0) customPortsCache[project] = config.port
        }
    });

    intercom.subscribe(["plugin_custom-port"], (message, respond) => {
        let command = message.command, project = message.project, port = message.port;
        switch(command) {
            case "setPort":
                if(port == 0) delete customPortsCache[project];
                else customPortsCache[project] = port;
                break;
            case "checkPort":
                respond({used: Object.values(customPortsCache).includes(port)});
                break;
        }
    });
}

function portSaved(project, port) {
    return intercom.sendPromise("plugin_custom-port", {command: "setPort", project, port: port});
}

function localCheck(port) {
    port = parseInt(port);
    return isPortValid(port).then((result) => {
        if(!result) throw new Error("Invalid port.");
        else return port;
    });
}

function getConfigForm() {
    return [
        {config: "port", text: "Custom port", small: "With a custom port, a second port is bound from the server to your project via the CUSTOM_PORT environment variable.", placeholder: "Enter a custom port or 0 to disable the plugin", type: "number", localCheck, remoteCheck: "/checkPort/", configSaved}
    ];
}


module.exports.startGlobalPlugin = startGlobalPlugin;
module.exports.startProjectPlugin = startProjectPlugin;
module.exports.stopProjectPlugin = stopProjectPlugin;
module.exports.projectContainerCreated = projectContainerCreated;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;
module.exports.getUsage = getUsage;
module.exports.prepareRouter = prepareRouter;
module.exports.getConfigForm = getConfigForm;

module.exports.getDefaultConfig = getDefaultConfig;