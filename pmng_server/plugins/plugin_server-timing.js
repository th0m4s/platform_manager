const intercom = require("../intercom/intercom_client").connect();
const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager");
const database_server = require("../database_server");
const isIP = require("is-ip");
const isCIDR = require("is-cidr");
const Plugin = require("./lib_plugin");

async function checkBoolean(value) {
    if(typeof value == "boolean") return value;
    
    value = value.toLowerCase();
    if(value == "true") return true;
    else if(value == "false") return false;
    else throw "Invalid type: Not a boolean.";
}

async function checkRules(rules) {
    rules = rules.split(",");
    let invalid = rules.filter((x) => isCIDR(x) == 0 && !isIP(x));
    if(invalid.length > 0) throw (invalid.length == 1 ? "Invalid rule: " : "Invalid rules: ") + invalid.join(", ");
    return rules;
}

let configCache = {};
class ServerTimingPlugin extends Plugin {
    static async startGlobalPlugin(plugindirectory) {
        database_server.isInstalled().then((installed) => {
            if(installed) {
                plugins_manager.getAllConfigs("server-timing").then((configs) => {
                    for(let [project, config] of Object.entries(configs)) {
                        configCache[project] = config;
                    }
                });
            }
        });

        intercom.subscribe(["server-timing_request"], (message, respond) => {
            respond(configCache);
        });
    }

    static getDefaultConfig() {
        return {enabled: false, rules: ""};
    }

    static getConfigForm() {
        return [
            {config: "enabled", text: "Enable plugin (set to <i>true</i> to enable the <i>Server-Timing</i> header for matching requests)", type: "checkbox", localCheck: checkBoolean},
            {config: "desc", text: "Include descriptions (causes larger HTTP headers because of additional text description)", type: "checkbox", localCheck: checkBoolean},
            {config: "rules", text: "Match IP rules", small: "Comma separated list of IP or subnets for which the Server-Timing header should be sent.", type: "text", localCheck: checkRules, remoteCheck: "/checkRules/"}
        ];
    }

    static getConfigDetails() {
        return {
            saved: async (projectname, config) => {
                configCache[projectname] = config;
                intercom.send("server-timing_update", {project: projectname, config});
            },
            needRestart: (projectname, oldconfig, newconfig) => false,
            detailsText: ""
        };
    }

    static prepareRouter(router) {
        router.get("/checkRules/:projectname/:rules(*)", async (req, res) => {
            checkRules(req.params.rules || "").then(() => {
                res.json({valid: true, message: "Valid rules."});
            }).catch((message) => {
                res.json({valid: false, message});
            });
        });

        return router;
    }

    static async getUsage(projectname) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("server-timing")) {
            let config = project.plugins["server-timing"];
            return {type: "custom_text", text: "<i>Server-Timing</i> header " + (config.enabled ? "enabled" : "disabled") + "."};
        } else return {type: "measure_error"};
    }
}

module.exports = ServerTimingPlugin;