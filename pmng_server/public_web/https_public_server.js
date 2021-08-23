const https = require("https");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const regex_utils = require("../regex_utils");
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");

const wantCluster = true;
const cluster = wantCluster ? require("cluster") : undefined;

/**
 * Starts a child server responsible for handling HTTPS connections.
 */
function start() {
    const https_options = {
        trace: true,
        SNICallback: (serverName, cb) => {
            regex_utils.testCustom(serverName).then((project) => {
                let serverFile = serverName;
                if(project == null) {
                    let otherFound = false;
                    for(let domain of regex_utils.OTHER_DOMAINS) {
                        if(serverName.endsWith(domain)) {
                            otherFound = true;
                            serverFile = domain;
                            break;
                        }
                    }

                    if(!otherFound) serverFile = process.env.ROOT_DOMAIN;
                } else {
                    if(serverFile.startsWith("www.")) serverFile = serverFile.substring(4);
                    // should be done for each subdomaines
                    // subdomains are the same as in regex_utils
                }

                return greenlock_manager.getSecureContext(serverFile);
            }).then((context) => {
                cb(null, context);
            }).catch((error) => {
                logger.tagError("HTTPS CLUSTER", "Cannot create secure context for domain " + serverName + ":" + error);
                cb(error);
            });
        }
    };

    let httpsServer = https.createServer(https_options, (req, res) => {web.webServe(req, res)}).listen(443, () => {
        if(wantCluster) logger.tag("HTTPS CLUSTER", `public server ${process.pid} (worker #${cluster.worker.id}) started.`);
        else logger.tag("HTTPS CLUSTER", "public only server started.");

        // intercom.send("webStarted", {type: "https"});
    });

    // let fs = require("fs")
    // let testServer = https.createServer({key: fs.readFileSync("/etc/pmng/pmng_server/https/greenlock.d/live/tomanager.ml/privkey.pem", "utf-8"), cert: fs.readFileSync("/etc/pmng/pmng_server/https/greenlock.d/live/tomanager.ml/fullchain.pem", "utf-8")}, function (req, res) {res.writeHead(200);res.end("hello world\n");}).listen(8001, () => logger.info("Test HTTPS server started."));

    // httpsServer.on("tlsClientError", (err) => console.warn("tlsClientError", err));
    // httpsServer.on("clientError", (err) => console.warn("clientError", err));
    process.on("uncaughtException", (err, origin) => console.warn("uncaughtException", err, origin));

    httpsServer.on("upgrade", web.upgradeRequest);

    privileges.drop();
    web.registerIntercomThread();
}

if(wantCluster && cluster.isMaster) {
    logger.tag("HTTPS CLUSTER", "Master process started.");
    web.registerClusterMaster(process.env.CLUSTER_MAX_SEC_CONN_HTTPS || process.env.CLUSTER_MAX_SEC_CONN,
        process.env.CLUSTER_MIN_CHILDREN_HTTPS || process.env.CLUSTER_MIN_CHILDREN,
        process.env.CLUSTER_MAX_CHILDREN_HTTPS || process.env.CLUSTER_MAX_CHILDREN, "HTTPS CLUSTER");
} else {
    start();
}
