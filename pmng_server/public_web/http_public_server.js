const http = require("http");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const cluster = require("cluster");
const regex_utils = require("../regex_utils");
const database_server = require("../database_server");
const project_manager = require("../project_manager");

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
// same line as in web_server.js

let databaseInstalled = false;

function start() {
    let serve = web.webServe;

    if(enable_https) {
        let redirect = (req, res) => {
            res.writeHead(302, {Location: "https://" + req.headers.host + req.url});
            res.end();
        };

        serve = async (req, res) => {
            let host = req.headers.host || "";
            if(host == "") return redirect(req, res);

            if(host == process.env.ROOT_DOMAIN || await regex_utils.testSpecial(host) !== null) return redirect(req, res);

            if(!databaseInstalled) {
                databaseInstalled = await database_server.isInstalled();
            }

            if(!databaseInstalled) {
                return redirect(req, res);
            }

            let project = regex_utils.testProject(host);
            if(project !== null) {
                // is project exists required ? (projectAllowHttps returns false is results.length == 0)
                if((await project_manager.projectExists(project)) && (await database_server.projectAllowHttps(project))) 
                    return redirect(req, res);
            }

            let customProject = await regex_utils.testCustom(host);
            if(customProject !== null) {
                let sanitized = host;
                if(sanitized.startsWith("www."))
                    sanitized = sanitized.substring(4, sanitized.length);

                if((await project_manager.projectExists(customProject)) && (await database_server.projectAllowHttps(customProject))
                    && (await database_server.domainAllowHttps(sanitized))) return redirect(req, res);
            }

            web.webServe(req, res);
        };
    }

    let httpServer = http.createServer(/*(req, res) => {
        req.socket.on("error", (error) => {
            console.warn("socket error", error);
        });

        serve(req, res);
    }*/serve).listen(80, () => {
        logger.info(`[HTTP CLUSTER] public server ${process.pid} (worker #${cluster.worker.id}) started.`);

        // intercom.send("webStarted", {type: "http"});
    });

    httpServer.on("upgrade", web.upgradeRequest);

    privileges.drop();
    web.registerPortInfo();
}

if(cluster.isMaster) {
    logger.info("[HTTP CLUSTER] Master process started.");
    web.registerClusterMaster(process.env.CLUSTER_MAX_SEC_CONN_HTTP || process.env.CLUSTER_MAX_SEC_CONN,
        process.env.CLUSTER_MIN_CHILDREN_HTTP || process.env.CLUSTER_MIN_CHILDREN,
        process.env.CLUSTER_MAX_CHILDREN_HTTP || process.env.CLUSTER_MAX_CHILDREN, "HTTP CLUSTER");
} else {
    start();
}