const Plugin = require("./lib_plugin");
const database_server = require("../database_server");
const CAN_FORCE_HTTPS = process.env.ENABLE_HTTPS.toLowerCase() == "true";

async function checkBoolean(value) {
    if(typeof value == "boolean") return value;
    
    value = value.toLowerCase();
    if(value == "true") return true;
    else if(value == "false") return false;
    else throw "Invalid type: Not a boolean.";
}

class AutoRedirectPlugin extends Plugin {
    static webInterceptors() {
        return this._parentInterceptors({
            async requestInterceptor(projectname, pluginconfig, req, portdetails, res) {
                try {
                    if(!pluginconfig.onlyGET || req.method == "GET") {
                        let canHTTPS = CAN_FORCE_HTTPS, canWWW = false;
    
                        if(portdetails.custom) {
                            let domainResult = await database_server.database("domains").where("domain", portdetails.host).select(["allow_https", "enablesub"]);
                            if(domainResult.length == 1) {
                                domainResult = domainResult[0];
                                canHTTPS = canHTTPS && domainResult.allow_https == "true";
                                canWWW = domainResult.enablesub == "true";
                            }
                        }
    
                        let currentIsHTTPS = req.socket.encrypted;
                        let shouldHTTPS = false, shouldWWW = false;
    
                        if(canHTTPS && !currentIsHTTPS && pluginconfig.forceHTTPS) shouldHTTPS = true;
                        if(canWWW && !portdetails.host.startsWith("www.") && pluginconfig.forceWWW) shouldWWW = true;
    
                        if(shouldHTTPS || shouldWWW) {
                            res.setHeader("Location", ((currentIsHTTPS || shouldHTTPS) ? "https" : "http") + "://" + (shouldWWW ? "www." : "") + portdetails.host + req.url);
                            res.writeHead(302, "Found");
                            res.end();
                        }
                    }
                } catch(error) {
                    // fail silently, its just a redirect
                }
            }
        });
    }

    static getDefaultConfig() {
        return {
            forceHTTPS: true,
            forceWWW: false,
            onlyGET: true
        };
    }

    static getConfigForm() {
        return [
            {config: "forceHTTPS", text: "Force HTTPS access", small: "Redirects the users to the HTTPS version of the website if HTTPS is enabled and if they try to access it with HTTP.", type: "checkbox", localCheck: checkBoolean},
            {config: "forceWWW", text: "Force www prefix for custom domains", small: "If subdomains are enabled for the custom domain, the user will be forced to use the www prefix.", type: "checkbox", localCheck: checkBoolean},
            {config: "forceWWW", text: "Redirect only GET requests", small: "Only redirect GET requests to avaid issues with APIs.", type: "checkbox", localCheck: checkBoolean}
        ];
    }

    // no prepareRouter because booleans are already validated
    static getConfigDetails() {
        return {
            saved: async (projectname, oldconfig, newconfig) => undefined,
            needRestart: (projectname, oldconfig, newconfig) => false
        };
    }
}

module.exports = AutoRedirectPlugin;