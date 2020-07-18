const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const net = require("net");
const regex_utils = require("./regex_utils");
const database_server = require("./database_server");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const runtime_cache_delay = 10000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const httpProxyServer = require("http-proxy").createProxyServer();
const pfs = require("fs").promises;
const path = require("path");
const cluster = require("cluster");

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
// const countPublic = enable_https ? 2 : 1, runningPublic = [];

function start() {
    /*intercom.subscribe(["webStarted"], function(message) {
        if(!runningPublic.includes(message.type)) {
            runningPublic.push(message.type);
        }

        if(runningPublic.length == countPublic) {
            intercom.send("dockermng", {command: "analyzeRunning"});
        }
    });*/

    intercom.send("dockermng", {command: "analyzeRunning"});

    // launching 2 processes to handle both HTTP and HTTPS public requests
    // each process will be the master of a cluster of web servers
    logger.info("Separating public servers into forks:");
    logger.info("Forking public http master process...");         // path based on platform.js
    child_process.fork("./pmng_server/public_web/http_public_server");

    if(enable_https) {
        logger.info("Forking public https master process...");
        child_process.fork("./pmng_server/public_web/https_public_server");
    }

    privileges.drop();

    logger.info("Forking admin web server...");
    child_process.fork("./pmng_server/admin_panel/admin_server");

    logger.info("Forking git web server...");
    child_process.fork("./pmng_server/git_server");

    logger.info("Forking error web server...");
    child_process.fork("./pmng_server/error_panel/error_server");
}

async function prepareSocketError() {
    let style = (await pfs.readFile(path.join(__dirname, "./error_panel/static/style.css"))).toString();
    errorPageCache = (await pfs.readFile(path.join(__dirname, "./error_panel/static/socket_error.html"))).toString();
    errorPageCache = errorPageCache.replace("style_cache", style);
}

// 8042 is for local server, 8043 for intercom
// projects start at 11000
const errorPort = 8099, special_ports = {"admin": 8080, "git": 8081, "ftp": errorPort}; // ftp is bound to error port when using http
let isInstalled = false;
async function _getPort(host) {
    host = host.toLowerCase();

    let isDefault = false;
    if(host == process.env.ROOT_DOMAIN) isDefault = true;

    if(!isDefault) {
        let special = regex_utils.testSpecial(host);
        if(special !== null) {
            if(special == "www") isDefault = true;
            else return special_ports[special];
        }
    }

    if(isDefault) {
        if(portMappings.hasOwnProperty("default")) return portMappings["default"];
        else return errorPort;
    }
    
    if(isInstalled !== true) {
        isInstalled = await database_server.isInstalled();
        if(isInstalled !== true) return errorPort;
    }

    let project = regex_utils.testProject(host);
    if(project !== null) {
        if(portMappings.hasOwnProperty(project)) return portMappings[project];
        else return errorPort;
    }

    let custom = await regex_utils.testCustom(host);
    if(custom != null) {
        if(portMappings.hasOwnProperty(custom)) return portMappings[custom];
        else return errorPort;
    }

    return errorPort;
}; const getPort = runtime_cache(_getPort);

/*function getTextHeaders(headers) {
    let resp = "";
    for(let [key, value] of Object.entries(headers)) { resp += key + ": " + value + "\r\n"; }
    return resp + "\r\n";
}*/

let portMappings = {};
// called by each process using portMappings
function registerPortInfo() {
    intercom.subscribe(["portBroadcast"], function(message) {
        switch(message.command) {
            case "addPort":
                portMappings[message.project] = message.port;
                break;
            case "remPort":
                if(portMappings.hasOwnProperty(message.project)) {
                    delete portMappings[message.project];
                }

                break;
        }
    });

    intercom.sendPromise("dockermng", {command: "requestPorts"}).then((actualPorts) => {
        portMappings = Object.assign(portMappings, actualPorts);
    });

    prepareSocketError();
}

let secConnInterval = -1, connCount = 0;
// called by each cluster master process
function registerClusterMaster(maxConnPerSec, minFork, maxFork, clusterName) {
    if(secConnInterval == -1) {
        let intervalSeconds = 10;
        secConnInterval = setInterval(() => {
            updateCluster(maxConnPerSec, minFork, maxFork, intervalSeconds);
        }, 1000*intervalSeconds);
        updateCluster(maxConnPerSec, minFork, maxFork, 1);

        cluster.on('exit', (worker, code, signal) => {
            if (worker.exitedAfterDisconnect === true) {
                currentClosing.splice(currentClosing.indexOf(worker.id), 1);
                logger.info(`[${clusterName}] Worker #${worker.id} exited successfully to reduce usage.`);
            } else {
                logger.warn(`[${clusterName}] Worker #${worker.id} exited unexpectedly (${code}, ${signal}). Restarting a fork...`);
                cluster.fork();
            }
        });
    }
}

let currentClosing = [];
function updateCluster(maxConnPerSec, minFork, maxFork, seconds) {
    let workersForConn = connCount / maxConnPerSec / seconds;
    connCount = 0;
    workersForConn = Math.max(Math.min(Math.max(workersForConn, minFork), maxFork), 1);
    let actualCount = Object.keys(cluster.workers).length - currentClosing.length;
    if(actualCount < workersForConn) {
        for(let i = 0; i < workersForConn - actualCount; i++) {
            cluster.fork();
        }
    } else if(actualCount > workersForConn) {
        let workers = Object.entries(cluster.workers), index = 0;
        for(let i = 0; i < actualCount - workersForConn; i++) {
            if(!currentClosing.includes(workers[index][0])) {
                currentClosing.push(workers[index][0]);
                workers[index][1].kill();
                index++;
            } else i--;
        }
    }
}

async function webServe(req, res) {
    connCount++;
    httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port: await getPort((req.headers.host || "").trimLeft().split(":")[0])}});
}

async function upgradeRequest(req, socket, head) {
    connCount++;
    httpProxyServer.ws(req, socket, head, {xfwd: true, target: {host: "127.0.0.1", port: await getPort((req.headers.host || "").trimLeft().split(":")[0])}});
}

let errorPageCache = "";
httpProxyServer.on("error", function (err, req, res) {
    res.writeHead(200, {
        "Content-Type": "text/html"
    });

    if(errorPageCache == "") res.end("Could not connect to server: " + err);
    else res.end(errorPageCache.replace("error_message", err));
});

module.exports.start = start;
module.exports.webServe = webServe;
module.exports.registerPortInfo = registerPortInfo;
module.exports.registerClusterMaster = registerClusterMaster;
module.exports.upgradeRequest = upgradeRequest;