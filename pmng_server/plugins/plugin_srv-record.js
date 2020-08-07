const project_manager = require("../project_manager");
const plugins_manager = require("../plugins_manager");
const database_server = require("../database_server");
const regex_utils = require("../regex_utils");
const intercom = require("../intercom/intercom_client").connect();
const Plugin = require("./lib_plugin");
const dns = require("native-dns");

async function checkService(service) {
    if(service.includes(" ")) throw "Invalid service name.";
    else return service;
}

async function checkProtocol(protocol) {
    protocol = protocol.toLowerCase();
    if(["udp", "tcp"].includes(protocol)) return protocol;
    else throw "Invalid protocol.";
}

async function checkPort(port) {
    port = parseInt(port);
    if(isNaN(port)) throw "Port is not a valid number.";
    else if(port < 0 || port > 65535) throw "Invalid port in range.";
    else return port;
}

// -1 is invalid
// 0 is remote
// 1 local with specific port
// 2 local with project port
function configMode(config) {
    if(config.target == ":host") {
        return config.port > 0 ? 1 : 2;
    } else {
        return config.port > 0 ? 0 : -1;
    }
}

function configModeText(config) {
    let mode = configMode(config);
    switch(mode) {
        case -1:
            return "Invalid port for given target.";
        case 0:
            return config.target + " and port " + config.port + ".";
        case 1:
            return "port " + config.port + " on the platform.";
        case 2:
            return "the dynamic port of the project."; 
    }
}

// port or custom-port if enabled
// TODO: try to save these results
function getProjectPort(projectname) {
    return intercom.sendPromise("plugin_custom-port", {command: "getPort", project: projectname}).then((customResponse) => {
        return customResponse.port;
    }).catch(() => {
        return intercom.sendPromise("dockermng", {command: "getPort", project: projectname}).then((projectResponse) => {
            return projectResponse.port;
        });
    });
}

async function getRecord(dnsName, projectname) {
    try {
        let config = configsCache[projectname];
        if(config == undefined) return undefined;
        return dns.SRV({
            name: `_${config.service}._${config.protocol}.${dnsName}`,
            ttl: process.env.DNS_TTL,
            priority: 0,
            weight: 10,
            port: config.port == 0 ? await getProjectPort(projectname) : config.port,
            target: config.target == ":host" ? process.env.ROOT_DOMAIN : config.target
        });
    } catch {
        return undefined;
    }
}

function cacheProject(projectname, config) {
    return intercom.sendPromise("plugin_srv-record", {command: "setConfig", project: projectname, config});
}

let configsCache = {};
class SRVRecordPlugin extends Plugin {
    static startGlobalPlugin(plugindirectory) {
        database_server.isInstalled().then((installed) => {
            if(installed) {
                plugins_manager.getAllConfigs("srv-record").then((configs) => {
                    for(let [project, config] of Object.entries(configs)) {
                        if(configMode(config) >= 0) configsCache[project] = config;
                    }
                });
            }
        });

        intercom.subscribe(["plugin_srv-record"], (message, respond) => {
            let command = message.command;
            switch(command) {
                case "dns":
                    regex_utils.testProjectOrCustom(message.dnsName).then((projectname) => {
                        if(projectname != null) {
                            getRecord(message.dnsName, projectname).then((record) => {
                                if(record == undefined) respond([]);
                                else respond([record]);
                            });
                        } else respond([]);
                    }).catch(() => respond([]));
                    break;
                case "setConfig":
                    configsCache[message.project] = message.config;
                    respond({error: false});
                    break;
            }
        });
    }

    static initializeHooks() {
        intercom.send("dnsHooks", {subject: "plugin_srv-record", message: {command: "dns"}, types: ["SRV"]});
    }

    static getDefaultConfig() {
        return {service: "service", protocol: "tcp", target: process.env.ROOT_DOMAIN, port: 0};
    }

    static getConfigForm() {
        return [
            {config: "service", text: "Service", placeholder: "Name of the service record", type: "text", localCheck: checkService, remoteCheck: "/checkService/"},
            {config: "protocol", text: "Protocol", placeholder: "tcp or udp", type: "text", localCheck: checkProtocol, remoteCheck: "/checkProtocol/"},
            {config: "target", text: "Target", small: "Use :host to dynamically redirect to the platform host.", placeholder: "The target of the service", type: "text"},
            {config: "port", text: "Port", small: "Enter 0 to dynamically use the port of the project (only available if target is :host). If <i>custom-port</i> is enabled, it will be used instead.", placeholder: "The port on the target for the service", type: "number", localCheck: checkPort, remoteCheck: "/checkPort/"}
        ];
    }

    static getConfigDetails() {
        return {
            saved: cacheProject,
            restart: false
        };
    }

    static prepareRouter(router) {
        router.get("/checkService/:service?", async (req, res) => {
            checkService(req.params.service || "").then(() => {
                res.json({valid: true, message: "Valid service."});
            }).catch((message) => {
                res.json({valid: false, message});
            });
        });

        router.get("/checkProtocol/:protocol?", async (req, res) => {
            checkProtocol(req.params.protocol || "").then(() => {
                res.json({valid: true, message: "Valid protocol."});
            }).catch((message) => {
                res.json({valid: false, message});
            });
        });

        router.get("/checkPort/:port?", async (req, res) => {
            checkPort(req.params.port || "").then(() => {
                res.json({valid: true, message: "Valid port."});
            }).catch((message) => {
                res.json({valid: false, message});
            });
        });

        return router;
    }

    static async getUsage(projectname) {
        let project = await project_manager.getProject(projectname);
        if(project.plugins.hasOwnProperty("srv-record")) {
            let config = project.plugins["srv-record"], mode = configMode(config);
            return {type: "custom_text", text: (mode >= 0 ? "Redirecting protocol " + config.protocol.toUpperCase() + " of <i>" + config.service + "</i> to " : "") + configModeText(config)};
        } else return {type: "measure_error"};
    }
}

module.exports = SRVRecordPlugin;