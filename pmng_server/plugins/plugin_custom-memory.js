
const plans_manager = require("../plans_manager");
const project_manager = require("../project_manager");
const database_server = require("../database_server");
const Plugin = require("./lib_plugin");

function isMemoryValid(memory, projectname) {
    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results.length == 0) return false;
        else return plans_manager.userMaxMemory(results[0].ownerid).then((maxMemory) => {
            return (maxMemory <= 0 || memory <= maxMemory) && (memory == 0 || memory >= 4);
        });
    });
}

function localCheck(memory, projectname) {
    memory = parseInt(memory);
    return isMemoryValid(memory, projectname).then((result) => {
        if(!result) throw "Invalid memory amount.";
        else return memory;
    });
}

class CustomMemoryPlugin extends Plugin {
   static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        let memory = pluginconfig.memory;
        if(memory >= 4)
            containerconfig.HostConfig.Memory = memory*1024*1024;
    
        return containerconfig
    }

    static getDefaultConfig() {
        return {memory: 0};
    }

    static getConfigForm() {
        return [
            {config: "memory", text: "Memory size", small: "Sets a specific memory amount for the project in MB. It cannot be below 4 MB and cannot be over your account limits. Enter 0 to use your maximum allowed memory size.", placeholder: "Enter a memory amount or 0 to disable the plugin", type: "number", localCheck, remoteCheck: "/checkMemory/"}
        ];
    }

    static prepareRouter(router) {
        router.get("/checkMemory/:projectname/:memory?", (req, res) => {
            let memory = parseInt(req.params.memory || "");
            if(isNaN(memory)) {
                res.json({valid: false, message: "Memory should be a number."});
            } else {
                isMemoryValid(memory, req.params.projectname).then((valid) => {
                    res.json({valid, message: valid ? "Valid amount/setting." : "Invalid amount/setting."});
                }).catch((error) => {
                    res.json({valid: false, message: "Cannot check memory amount: " + error});
                });
            }
        });
    
        return router;
    }

    static async getUsage(projectname) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("custom-memory")) {
            let text = project.plugins["custom-memory"].memory == 0 ? "Plugin disabled (maximum memory used)." : "Memory limited to " + project.plugins["custom-memory"].memory + " MB.";
            return {type: "custom_text", text};
        } else return {type: "measure_error"};
    }
}

module.exports = CustomMemoryPlugin;