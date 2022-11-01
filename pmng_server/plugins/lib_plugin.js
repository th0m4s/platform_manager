class Plugin {
    static async startGlobalPlugin(plugindirectory, globalconfig, setconfig) { }

    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig, flags) {
        return containerconfig;
    }

    static async projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) { }
    static async stopProjectPlugin(projectname, pluginconfig, networkname) { } // plugins containers are automatically stopped if they specify the pmng.projectname label

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
                // data: {status: number, headers: Object}

                // should return true to stop all remaining interceptors, false to stop remaining interceptors but keep body interceptors
                // and something else to continue all interceptors
                // if return type is int, it will be the new status code
                // else, if return has an int status property, it will be interpreted as a status code
                // in the last case, the return object will be the headers

                // headers can also be modified in-place, whereas status cannot
            },

            responseBodyInterceptor(projectname, pluginconfig, input, output) {
                input.pipe(output);

                // should return true to stop all remaining interceptors
            }
        };

        return Object.fromEntries(Object.keys(parentInterceptors).map((x) => [x, interceptors[x] ?? parentInterceptors[x]]));
    }
}

module.exports = Plugin;