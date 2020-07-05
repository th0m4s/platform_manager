const http = require("http");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const cluster = require("cluster");

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
// same line as in web_server.js

function start() {
    let serve = web.webServe;

    if(enable_https) {
        serve = (req, res) => {
            res.writeHead(302, {Location: "https://" + req.headers.host + req.url});
            res.end();
        };
    }

    let httpServer = http.createServer(serve).listen(80, () => {
        logger.info(`[HTTP CLUSTER] public server pid:${process.pid},child:${cluster.worker.id} started.`);

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