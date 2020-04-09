const docker_manager = require("../docker_manager");

function startPlugin(projectname, containerconfig, network, plugincontainer, pluginconfig) {
    return docker_manager.docker.container.create({
        Image: "redis:alpine",
        Hostname: "redis",
        name: plugincontainer,
        Labels: {
            "pmng.containertype": "plugin",
            "pmng.projectname": projectname
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

/*function stopPlugin(projectname, plugincontainer) {

}*/


module.exports.startPlugin = startPlugin;
// module.exports.stopPlugin = stopPlugin;
module.exports.defaultConfig = {
    discoveryType: "single-node"
};