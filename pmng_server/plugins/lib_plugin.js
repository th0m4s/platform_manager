class Plugin {
    static async startGlobalPlugin(plugindirectory, globalconfig, setconfig) { }

    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig, flags) {
        return containerconfig;
    }

    static async projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) { }
    static async stopProjectPlugin(projectname, pluginconfig, networkname) { }

    static isProjectBased() { return true; }
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

    static webInterceptors() {
        return this._parentInterceptors();
    }

    // util method to default missing interceptors to lib_plugin.js interceptors
    static _parentInterceptors(interceptors = {}) {
        let parentInterceptors = {
            async requestInterceptor(projectname, pluginconfig, req, portdetails, res) { },

            async responseHeadInterceptor(projectname, pluginconfig, data) {
                // data: {status: {code: number, message: string}, headers: Object}

                // should return true to stop all remaining interceptors, false to stop remaining interceptors but keep body interceptors
                // and undefined to continue all interceptors
            },

            responseBodyInterceptor(projectname, pluginconfig, input, output) {
                input.pipe(output);
            }
        };

        return Object.fromEntries(Object.keys(parentInterceptors).map((x) => [x, interceptors[x] ?? parentInterceptors[x]]));
    }
}

module.exports = Plugin;