class Plugin {
    static async startGlobalPlugin(plugindirectory, globalconfig, setconfig) { }

    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        return containerconfig;
    }

    static async stopProjectPlugin(projectname, pluginconfig, networkname) { }
    static async projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) { }

    static async installPlugin(projectname, pluginconfig) { }
    static async postInstall(projectname, allconfigs) { }
    static async uninstallPlugin(projectname, pluginconfig) { }

    static initializeHooks() { }

    static getDefaultConfig() { return {}; }
    static getConfigForm() { return []; }
    static getConfigDetails() { return { needRestart: (projectname, newconfig, oldconfig) => true, saved: async (projectname, newconfig, oldconfig) => undefined, detailsText: "" }; };

    static getUserDetails(projectname, pluginconfig) { return projectname == undefined ? false : {type: "none"}; }

    static prepareRouter(router) { return router; }

    static async getUsage(projectname) {
        return {type: "not_measurable"};
    }
}

module.exports = Plugin;