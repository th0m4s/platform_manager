const net = require("net");
const http = require("http");
const regex_utils = require("./regex_utils");
const database_server = require("./database_server");
// const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const runtime_cache_delay = 10000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const httpProxyServer = require("http-proxy").createProxyServer({selfHandleResponse: true});
const pfs = require("fs").promises;
const path = require("path");
const cluster = require("cluster");
const platformLogger = require("./platform_logger");
const logger = platformLogger.logger();
const webLogger = platformLogger.getWebAccess();
const subprocess_util = require("./subprocess_util");
const plugins_manager = require("./plugins_manager");
const ip_manager = require("./ip_manager");

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

    // globally stores current http challenges
    registerHttpChallenges(true);
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
const errorPort = 8099, special_ports = {"admin": 8080, "git": 8081, "ftp": errorPort, "mail": errorPort}; // ftp/mail are bound to error port when using http
const errorDetails = {isSpecial: true, port: errorPort, special: "error"};
let isInstalled = false;
async function _getPortDetails(host) {
    host = host.toLowerCase();

    let isDefault = false;
    if(host == process.env.ROOT_DOMAIN) isDefault = true;

    if(!isDefault) {
        let special = regex_utils.testSpecial(host);
        if(special !== null) {
            if(special == "www") isDefault = true;
            else return {isSpecial: true, port: special_ports[special], special};
        }
    }

    if(isDefault) {
        if(portMappings.hasOwnProperty("default")) return {isSpecial: false, port: portMappings["default"], project: "default", custom: false};
        else return errorDetails;
    }
    
    if(isInstalled !== true) {
        isInstalled = await database_server.isInstalled();
        if(isInstalled !== true) return errorDetails;
    }

    let {project, custom} = await regex_utils.testProjectOrCustom(host);
    if(project !== null) {
        if(portMappings.hasOwnProperty(project)) return {isSpecial: false, port: portMappings[project], project, custom, host};
        else return errorDetails;
    }

    return errorDetails;
}; const getPortDetails = runtime_cache(_getPortDetails);

/*function getTextHeaders(headers) {
    let resp = "";
    for(let [key, value] of Object.entries(headers)) { resp += key + ": " + value + "\r\n"; }
    return resp + "\r\n";
}*/

let portMappings = {};
/**
 * Registers intercom ports subscription to associate each host with a port given by docker_manager.js and http challenges
 */
function registerIntercomThread() {
    setInterval(() => {
        process.send({action: "counter", count: connCount});
        connCount = 0;
    }, clusterUpdateInterval*1000);

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

    intercom.subscribe(["updateplugins"], (message) => {
        loadPluginsForProject(message.projectname);
    });

    // only process remove and set (get are in start)
    registerHttpChallenges(false);

    intercom.sendPromise("dockermng", {command: "requestPorts"}).then((actualPorts) => {
        portMappings = Object.assign(portMappings, actualPorts);
    });

    prepareSocketError();
}

let httpChallenges = {};
/**
 * Registers the intercom HTTP challenges handler to receive updates about Greenlock HTTP challenges.
 * @param {boolean} bindGet If set to *true*, this handler will also respond to requests to get existing challenges.
 */
function registerHttpChallenges(bindGet = false) {
    intercom.subscribe(["httpChallenges"], (message, respond) => {
        let command = message.command, domain = message.domain, token = message.token;
        switch(command) {
            case "set":
                if(httpChallenges[domain] == undefined) httpChallenges[domain] = {};
                httpChallenges[domain][token] = message.contents;


                respond({error: false});
                break;
            case "remove":
                if(httpChallenges[domain] != undefined) {
                    delete httpChallenges[domain][token];
                    if(Object.keys(httpChallenges[domain]).length == 0) delete httpChallenges[domain];
                }

                respond({error: false});
                break;
            case "get":
                if(bindGet) {
                    let challenges = httpChallenges[domain];
                    if(challenges == undefined) respond({error: true});
                    else {
                        let challenge = challenges[token];
                        if(challenge == undefined) respond({error: true});
                        else respond({error: false, contents: challenge});
                    }
                }

                break;
        }
    });
}

let secConnInterval = -1, connCount = 0;
const clusterUpdateInterval = 1;
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
        secConnInterval = setInterval(() => {
            updateCluster(maxConnPerSec, minFork, maxFork, clusterUpdateInterval, clusterName);
        }, 1000*clusterUpdateInterval);
        updateCluster(maxConnPerSec, minFork, maxFork, 1, clusterName);

        cluster.on('exit', (worker, code, signal) => {
            if (worker.exitedAfterDisconnect === true) {
                currentClosing.splice(currentClosing.indexOf(worker.id), 1);
                logger.tag(clusterName, `Worker #${worker.id} exited successfully to reduce usage (${Object.keys(cluster.workers).length} running).`);
            } else {
                logger.tagWarn(clusterName, `Worker #${worker.id} exited unexpectedly (${code}, ${signal}). Restarting a fork...`);
                cluster.fork();
            }
        });

        cluster.on("message", (worker, message) => {
            // per worker online message is handled in updateCluster
            switch(message.action) {
                case "counter":
                    connCount += message.count;
                    break;
            }
        });
    }
}

let currentClosing = [], currentStarting = [];
/**
 * Called by registerClusterMaster. Method responsible for spawning and killing processes.
 * Should not be called directly!
 * @param {number} maxConnPerSec The maximum number of connections per second for a single process.
 * @param {number} minFork The minimum number of spawned servers.
 * @param {number} maxFork The maximum number of available running servers.
 * @param {number} seconds The elasped time in seconds since the last call of this function.
 * @param {string} clusterName The name of the cluster for logging purposes.
 * Used to calculate the number of connections per second for the cluster.
 */
function updateCluster(maxConnPerSec, minFork, maxFork, seconds, clusterName) {
    // called on the master, so conncount is not synced with webServe and upgradeRequest, so use cluster process comm to send counter messages
    let originalCount = connCount;
    let workersForConn = connCount / maxConnPerSec / seconds;
    connCount = 0;
    workersForConn = Math.max(Math.min(Math.max(workersForConn, minFork), maxFork), 1);
    let actualCount = Object.keys(cluster.workers).length - currentClosing.length;
    if(actualCount < workersForConn) {
        for(let i = 0; i < workersForConn - actualCount - currentStarting.length; i++) {
            logger.tag(clusterName, `Starting new worker... (actually ${Object.keys(cluster.workers).length} running, ${currentClosing.length} closing, because of ${originalCount} connections).`);
            let worker = cluster.fork();

            let rdnId = Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
            currentStarting.push(rdnId);

            let workerTimeout = setTimeout(() => {
                currentStarting.splice(currentStarting.indexOf(rdnId), 1);
                logger.tagWarn(clusterName, `Worker ${worker.id} could not start correctly, killing process...`);
                worker.process.kill(1);
            }, 5000);

            worker.on("online", () => {
                clearTimeout(workerTimeout);
                currentStarting.splice(currentStarting.indexOf(rdnId), 1);
            });
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

let pluginsPerProject = {};
async function loadPluginsForProject(projectname) {
    let results = await database_server.database("projects").where("name", projectname).select("plugins");
    if(results.length == 1)
        pluginsPerProject[projectname] = Object.entries(JSON.parse(results[0].plugins));
}

let interceptors = {};
function getPluginInterceptors(pluginname) {
    if(interceptors[pluginname] == undefined) {
        let plugin = plugins_manager.getPlugin(pluginname);
        interceptors[pluginname] = plugin.hasOwnProperty("webInterceptors") ? plugin.webInterceptors() : false;
    }

    return interceptors[pluginname];
}

/**
 * Handles a single connection from a public server.
 * @param {http.IncomingMessage} req The client incoming message.
 * @param {http.ServerResponse} res The server response to be sent back.
 */
async function webServe(req, res) {
    let originalPort = req.socket.localPort;
    res.on("finish", () => {
        webLogger(req, res, originalPort);
    });

    res.on("close", () => {
        if(!res.writableEnded) webLogger(req, res, originalPort);
    });

    connCount++;
    if(req.method == "GET" && regex_utils.isACMEChallenge(req.url)) {
        let domain = req.headers.host, challenges = httpChallenges[domain];
        if(challenges != undefined) {
            let token = req.url.split("/")[3], challenge = challenges[token];
            if(challenge == undefined) res.end("wrong challenge"); // TODO: why not just proxy as if challenges didnt exist?
            else res.end(challenge);

            return; // don't continue to specific port, res is already ended
        }
    }
    
    let portDetails = await getPortDetails((req.headers.host || "").trimLeft().split(":")[0]), port = portDetails.port;
    if(!portDetails.isSpecial) {
        let projectname = portDetails.project;
        if(pluginsPerProject[projectname] == undefined) await loadPluginsForProject(projectname);
        for(let [pluginname, pluginconfig] of (pluginsPerProject[projectname] ?? [])) {
            let interceptor = getPluginInterceptors(pluginname);
            if(interceptor !== false) {
                await interceptor.requestInterceptor(projectname, pluginconfig, req, portDetails, res);
                if(res.writableEnded) break; // plugin stopped the response, so we stop here
            }
        }
    }

    if(!res.writableEnded) httpProxyServer.web(req, res, {xfwd: true, target: {host: "127.0.0.1", port}});
}

httpProxyServer.on("proxyRes", (proxyRes, req, res) => {
    for(let [header, value] of Object.entries(proxyRes.headers))
        res.setHeader(header, value);
    res.writeHead(proxyRes.statusCode, proxyRes.statusMessage);

    proxyRes.on("data", (chunk) => {
        res.write(chunk);
    });
    proxyRes.on("end", () =>  {
        res.end();
    });
});

/**
 * Upgrades a standard HTTP connection to a WebSocket connection.
 * @param {http.IncomingMessage} req The client incoming message.
 * @param {net.Socket} socket The associated socket for this connection.
 * @param {Buffer} head The current head of the connection.
 */
async function upgradeRequest(req, socket, head) {
    connCount++;
    httpProxyServer.ws(req, socket, head, {xfwd: true, target: {host: "127.0.0.1", port: await getPortDetails((req.headers.host || "").trimLeft().split(":")[0]).port}});
}

let errorPageCache = "";
httpProxyServer.on("error", function (err, req, res) {
    try {
        res.writeHead(502, {
            "Content-Type": "text/html"
        });
    
        if(errorPageCache == "") res.end("<p>Could not connect to server: " + err + "</p>");
        else res.end(errorPageCache.replace("error_message", err));
    } catch(error) {
        // already an error, fail silently
    }
});


module.exports.start = start;
module.exports.webServe = webServe;
module.exports.registerIntercomThread = registerIntercomThread;
module.exports.registerClusterMaster = registerClusterMaster;
module.exports.upgradeRequest = upgradeRequest;