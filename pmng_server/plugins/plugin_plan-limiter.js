
const plans_manager = require("../plans_manager");
const string_utils = require("../string_utils");
const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager");
const database_server = require("../database_server");
const Plugin = require("./lib_plugin");

function checkMemory(memory, projectname) {
    memory = parseInt(memory);
    if(isNaN(memory)) return Promise.reject("Memory should be a number.");
    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results.length == 0) throw "No user for project.";
        else return plans_manager.userMaxMemory(results[0].ownerid).then((maxMemory) => {
            if(memory > 0 && memory < 4) throw "Memory needs to be above 4M.";
            else if(maxMemory > 0 && memory > maxMemory) throw "Memory quota exceeded.";
            else return memory;
        });
    });
}

function checkStorage(storageInput, projectname) {
    let storage = string_utils.parseBytesSize(storageInput);
    if(isNaN(storage)) return Promise.reject("Invalid storage input: Malformed number.");

    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results.length == 0) throw "No user for project.";
        else return plans_manager.userMaxStorage(results[0].ownerid).then((maxStorage) => {
            if(maxStorage > 0 && storage > maxStorage) throw "Storage quota exceeded.";
            else return storage;
        });
    });
}

async function configSaved(projectname, newconfig, oldconfig) {
    if(newconfig.storage != oldconfig.storage)
        await plugins_manager.getPlugin("persistent-storage").updateFilesize(projectname, oldconfig.storage, newconfig.storage);

    // memory change doesn't need special callback, new memory will be used on restart (always true, see getConfigDetails)
}

class PlanLimiterPlugin extends Plugin {
   static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        let memory = pluginconfig.memory;
        if(memory >= 4)
            containerconfig.HostConfig.Memory = memory*1024*1024;
    
        return containerconfig
    }

    static getDefaultConfig() {
        return {memory: 0, storage: 0};
    }

    static getConfigForm() {
        return [
            {config: "memory", text: "Memory size", small: "Sets a specific memory amount for the project in megabytes. It cannot be below 4M and cannot be over your account limits. Enter 0 to use your maximum allowed memory size.", placeholder: "Enter a memory amount or 0 to disable this limit", type: "number", localCheck: checkMemory, remoteCheck: "/checkMemory/"},
            {config: "storage", text: "Storage size", small: "Sets a specific storage size for the <i>persistent-storage</i> plugin in bytes. Only works if the plugin is enabled on this project. Can use size prefixes.", placeholder: "Enter a storage size or 0 to disable this limit", type: "text", localCheck: checkStorage, remoteCheck: "/checkStorage/"}
        ];
    }

    static prepareRouter(router) {
        router.get("/checkMemory/:projectname/:memory?", (req, res) => {
            let memory = parseInt(req.params.memory || "");
            checkMemory(memory, req.params.projectname).then(() => {
                res.json({valid: true, message: "Valid memory."});
            }).catch((error) => {
                res.json({valid: false, message: "Invalid memory: " + error});
            });
        });

        router.get("/checkStorage/:projectname/:storage?", (req, res) => {
            let storage = req.params.storage || "";
            checkStorage(storage, req.params.projectname).then(() => {
                res.json({valid: true, message: "Valid storage size."});
            }).catch((error) => {
                res.json({valid: false, message: "Invalid storage size: " + error});
            });
        });
    
        return router;
    }

    static getConfigDetails() {
        return {
            saved: configSaved,
            needRestart: (projectname, oldconfig, newconfig) => true
        };
    }

    static async getUsage(projectname) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("plan-limiter")) {
            let enabled = false, texts = [];
            let config = project.plugins["plan-limiter"];
            if(config.memory > 0) {
                enabled = true;
                texts.push("Memory limited to " + string_utils.formatBytes(config.memory*1024*1024, 0) + ".");
            }
            if(config.storage > 0) {
                enabled = true;
                texts.push("Storage limited to " + string_utils.formatBytes(config.storage, 1) + ".");
            }

            return {type: "custom_text", text: !enabled ? "Plugin disabled." : texts.join(" ")};
        } else return {type: "measure_error"};
    }
}

module.exports = PlanLimiterPlugin;