const docker_manager = require("../docker_manager");

function startGlobalPlugin(plugindirectory) {

}

function startProjectPlugin(projectname, containerconfig, network, plugincontainer, pluginconfig) {
    return docker_manager.docker.container.create({
        Image: "redis:alpine",
        Hostname: "redis",
        name: plugincontainer,
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

function projectContainerCreated(projectname, containerconfig, pluginconfig) {
    
}

function installPlugin(projectname, pluginconfig) {

}

function uninstallPlugin(projectname, pluginconfig) {

}

function getDefaultConfig() {
    return {
        discoveryType: "single-node"
    };
}


module.exports.startGlobalPlugin = startGlobalPlugin;
module.exports.startProjectPlugin = startProjectPlugin;
module.exports.projectContainerCreated = projectContainerCreated;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;

module.exports.getDefaultConfig = getDefaultConfig;