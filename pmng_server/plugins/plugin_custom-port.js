const docker_manager = require("../docker_manager");

function startGlobalPlugin(plugindirectory) {

}

function startProjectPlugin(projectname, containerconfig, network, plugincontainername, pluginconfig) {

}

async function stopProjectPlugin(projectname) {

}

function projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
    
}

function installPlugin(projectname, pluginconfig) {

}

function uninstallPlugin(projectname, pluginconfig) {

}

async function getUsage(projectname) {
    return {type: "not_measurable"};
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
                res.json({valid, message: valid ? "Valid port." : "Port already in use."});
            }).catch((error) => {
                res.json({valid: false, message: "Cannot check port: " + error});
            });
        }
    });
}

let invalidPorts = [33306, 3306];
async function isPortValid(port) {
    if(port < 1024 || (port >= 8000 && port <= 8999) || (port >= 49152 && port <= 49999) || invalidPorts.includes(port)) return false;
}

function getConfigForm() {
    return [
        {config: "port", name: "Custom port", label: "With a custom port, a second port is bound from the server to your project via the CUSTOM_PORT environment variable.", type: "number", localCheck: isPortValid, remoteCheck: "/checkPort/"}
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