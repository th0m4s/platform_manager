
const plans_manager = require("../plans_manager");
const string_utils = require("../string_utils");
const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager"), plugin_ps = plugins_manager.getPlugin("persistent-storage");
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
    if(storageInput.endsWith("B")) storageInput = storageInput.substr(0, storageInput.length-1);
    // as we need block size of 4096 (default), we cannot use powers of 10, so force powers of 2^10
    let storage = string_utils.parseBytesSize(storageInput);
    if(isNaN(storage)) return Promise.reject("Invalid storage input: Malformed number.");
    if(!plugin_ps.isCorrectSize(storage)) return Promise.reject("Invalid storage size. Must be a multiple of " + plugin_ps.BLOCK_SIZE + " bytes.");

    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results.length == 0) throw "No user for project.";
        else return plans_manager.userMaxStorage(results[0].ownerid).then((maxStorage) => {
            if(maxStorage > 0 && storage > maxStorage) throw "Storage quota exceeded.";
            else return storage;
        });
    });
}

function checkCpus(cpus, projectname) {
    cpus = parseFloat(cpus);
    if(isNaN(cpus)) return Promise.reject("CPUS should be a number.");
    if(cpus > 0 && cpus <= 1) return Promise.resolve(cpus);
    else return Promise.reject("CPUS should be included inside ]0;1]");
}

async function configSaved(projectname, newconfig, oldconfig) {
    if(newconfig.storage != oldconfig.storage) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("persistent-storage"))
            await plugin_ps.updateFilesize(projectname, oldconfig.storage, newconfig.storage);
    }

    // memory change doesn't need special callback, new memory will be used on restart (always true, see getConfigDetails)
}

class PlanLimiterPlugin extends Plugin {
   static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig, flags) {
        let memory = pluginconfig.memory;
        if(memory >= 4)
            containerconfig.HostConfig.Memory = memory*1024*1024;
    
        return containerconfig
    }

    static getDefaultConfig() {
        return {memory: 0, storage: 0, cpus: 0.5};
    }

    static getConfigForm() {
        return [
            {config: "memory", text: "Memory size", small: "Sets a specific memory amount for the project in megabytes. It cannot be below 4M and cannot be over your account limits. Enter 0 to use your maximum allowed memory size.", placeholder: "Enter a memory amount or 0 to disable this limit", type: "number", localCheck: checkMemory, remoteCheck: "/checkMemory/"},
            {config: "storage", text: "Storage size", small: "Sets a specific storage size for the <i>persistent-storage</i> plugin in bytes. Only works if the plugin is enabled on this project. Can use size prefixes.", placeholder: "Enter a storage size or 0 to disable this limit", type: "text", localCheck: checkStorage, remoteCheck: "/checkStorage/"},
            {config: "cpus", text: "CPU count", small: "Sets the number of allocated CPUs for this project. 0.5 means 50% of a CPU, 1.5 means 1 CPU and 50% of a second one...", placeholder: "Enter a number of CPU cores to allocate (defaults to 0.5)", type: "text", localCheck: checkCpus, remoteCheck: "/checkCpus/"}
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

        router.get("/checkCpus/:projectname/:storage?", (req, res) => {
            let storage = req.params.storage || "";
            checkCpus(storage, req.params.projectname).then(() => {
                res.json({valid: true, message: "Valid CPU count."});
            }).catch((error) => {
                res.json({valid: false, message: "Invalid CPU count: " + error});
            });
        });
    
        return router;
    }

    static getConfigDetails() {
        return {
            saved: configSaved,
            needRestart: (projectname, oldconfig, newconfig) => true,
            detailsText: ""
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
            if(config.cpus > 0) {
                enabled = true;
                texts.push("CPU count set to " + config.cpus + ".");   
            }

            return {type: "custom_text", text: !enabled ? "Plugin disabled." : texts.join(" ")};
        } else return {type: "measure_error"};
    }
}

module.exports = PlanLimiterPlugin;