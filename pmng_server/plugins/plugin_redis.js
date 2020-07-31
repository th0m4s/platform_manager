const docker_manager = require("../docker_manager");
const Plugin = require("./lib_plugin");

class RedisPlugin extends Plugin {
    static startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
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
                NetworkMode: networkname
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [networkname]: {
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

    static getDefaultConfig() {
        return {
            discoveryType: "single-node"
        };
    }

    static async getUsage() {
        return {type: "not_measurable"};
    }
}

module.exports = RedisPlugin;