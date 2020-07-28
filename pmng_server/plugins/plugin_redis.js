const docker_manager = require("../docker_manager");

function startGlobalPlugin(plugindirectory) {

}

function startProjectPlugin(projectname, containerconfig, network, plugincontainername, pluginconfig) {
    return docker_manager.docker.container.create({
        Image: "redis:alpine",
        Hostname: "redis",
        name: plugincontainername,
        Labels: {
            "pmng.containertype": "plugin",
            "pmng.projectname": projectname,
            "pmng.pluginname": "redis"
        },
        Env: ["discovery.type=" + pluginconfig.discoveryType],
        HostConfig: {
            AutoRemove: true,
            NetworkMode: network
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [network]: {
                    Aliases: ["redis"] // same as hostname   
                }
            }
        }
    }).then((container) => {
        return container.start();
    }).then(() => {
        return containerconfig;
    });
}

async function stopProjectPlugin(projectname) {
    // per-project plugin container auto stopped
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
        discoveryType: "single-node"
    };
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