const child_process = require("child_process");
const net = require("net");
const http = require("http");
const regex_utils = require("./regex_utils");
const database_server = require("./database_server");
// const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const runtime_cache_delay = 10000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const httpProxyServer = require("http-proxy").createProxyServer();
const pfs = require("fs").promises;
const path = require("path");
const cluster = require("cluster");
const logger = require("./platform_logger").logger();
const subprocess_util = require("./subprocess_util");

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
// const countPublic = enable_https ? 2 : 1, runningPublic = [];

/**
 * Starts all required web servers (public HTTP, HTTPS if enabled and private git, error and admin subservers).
 */
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

    subprocess_util.forkNamed("./pmng_server/public_web/http_public_server", "http_public_server", "public http master server");

    if(enable_https)
        subprocess_util.forkNamed("./pmng_server/public_web/https_public_server", "https_public_server", "public https master server");

    // privileges.drop();
    // privileges are not dropped from main process, but in all subprocesses

    subprocess_util.forkNamed("./pmng_server/admin_panel/admin_server", "admin_web_server", "admin web server");
    subprocess_util.forkNamed("./pmng_server/git_server", "git_web_server", "git web server");
    subprocess_util.forkNamed("./pmng_server/error_panel/error_server", "error_web_server", "error web server");
}

/**
 * Caches the error page to send when a socket error is encountered.
 * Must be called by each public subprocess server.
 */
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
/**
 * Registers intercom ports subscription to associate each host with a port given by docker_manager.js.
 */
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
/**
 * Manages a cluster of servers based on the number of connections per second.
 * @param {number} maxConnPerSec The maximum number of connections per second for a single process. The master will attempt
 * to spawn or kill processes while they meet the *minFork* and *maxFork* guidelines.
 * @param {number} minFork The minimum number of processes.
 * @param {number} maxFork The maximum number of processes. Servers will not spawn if this limit is reached.
 * @param {string} clusterName The name of the cluster for logging purposes.
 */
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
/**
 * Called by registerClusterMaster. Method responsible for spawning and killing processes.
 * Should not be called directly!
 * @param {*} maxConnPerSec The maximum number of connections per second for a single process.
 * @param {*} minFork The minimum number of spawned servers.
 * @param {*} maxFork The maximum number of available running servers.
 * @param {*} seconds The elasped time in seconds since the last call of this function.
 * Used to calculate the number of connections per second for the cluster.
 */
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

/**
 * Handles a single connection from a public server.
 * @param {http.IncomingMessage} req The client incoming message.
 * @param {http.ServerResponse} res The server response to be sent back.
 */
async function webServe(req, res) {
    connCount++;
    httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port: await getPort((req.headers.host || "").trimLeft().split(":")[0])}});
}

/**
 * Upgrades a standart HTTP connection to a WebSocket connection.
 * @param {http.IncomingMessage} req The client incoming message.
 * @param {net.Socket} socket The associated socket for this connection.
 * @param {Buffer} head The current head of the connection.
 */
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