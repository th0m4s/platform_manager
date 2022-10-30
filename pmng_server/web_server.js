const net = require("net");
const http = require("http");
const regex_utils = require("./regex_utils");
const database_server = require("./database_server");
// const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const runtime_cache_delay = 10000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const http2proxy = require("http2-proxy");
const pfs = require("fs").promises;
const path = require("path");
const cluster = require("cluster");
const platformLogger = require("./platform_logger");
const logger = platformLogger.logger();
const webLogger = platformLogger.getWebAccess();
const connectionsLogger = platformLogger.getConnectionsAccess();
const CONNECTIONS_LOG = process.env.CONNECTIONS_LOG?.toLowerCase() == "true", DEBUG_HTTP_S_ERRORS = process.env.DEBUG_HTTP_S_ERRORS?.toLowerCase() == "true";
const subprocess_util = require("./subprocess_util");
const plugins_manager = require("./plugins_manager");
const ip_manager = require("./ip_manager");
const isIP = require("is-ip");

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

    // launching 2 processes to handle both HTTP and HTTPS public requests
    // each process will be the master of a cluster of web servers
    logger.tag("WEB", "Separating public servers into forks:");

    subprocess_util.forkNamed("./pmng_server/public_web/http_public_server", "http_public_server", "public http master server");

    if(enable_https)
        subprocess_util.forkNamed("./pmng_server/public_web/https_public_server", "https_public_server", "public https master server");

    // privileges.drop();
    // privileges are not dropped from main process, but in all subprocesses

    subprocess_util.forkNamed("./pmng_server/admin_panel/admin_server", "admin_web_server", "admin web server");

    // NOTE: this also includes the FTP server to reduce the number of node processes
    subprocess_util.forkNamed("./pmng_server/secondary_servers/secondary_servers", "secondary_servers", "secondary servers");
    // subprocess_util.forkNamed("./pmng_server/git_server", "git_web_server", "git web server");
    // subprocess_util.forkNamed("./pmng_server/error_panel/error_server", "error_web_server", "error web server");

    // globally stores current http challenges
    registerHttpChallenges(true);
}

/**
 * Caches the error page to send when a socket error is encountered.
 * Must be called by each public subprocess server.
 */
async function prepareSocketError() {
    let style = (await pfs.readFile(path.join(__dirname, "./secondary_servers/error_panel/static/style.css"))).toString();
    errorPageCache = (await pfs.readFile(path.join(__dirname, "./secondary_servers/error_panel/static/socket_error.html"))).toString();
    errorPageCache = errorPageCache.replace("style_cache", style);
}

// 8041 for local web server, 8042 for local net server, 8043 for intercom
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

let serverTimingConfig = {};
function updateServerTimingConfig(projectname, config) {
    let list = new net.BlockList();
    for(let rule of config.rules) {
        let parts = rule.split("/");
        let family = "ipv" + (isIP.v4(parts[0]) ? "4" : "6");
        if(parts.length == 1) {
            list.addAddress(parts[0], family);
        } else if(parts.length == 2) {
            list.addSubnet(parts[0], parseInt(parts[1]), family);
        }
    }

    serverTimingConfig[projectname] = {enabled: config.enabled, desc: config.desc, list};
}

let portMappings = {};
/**
 * Registers intercom ports subscription to associate each host with a port given by docker_manager.js and http challenges
 */
function registerIntercomThread() {
    setInterval(() => {
        process.send({action: "counter", count: connCount});
        connCount = 0;
    }, clusterUpdateInterval*1000);

    intercom.subscribe(["portBroadcast"], (message) => {
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

    intercom.subscribe(["server-timing_update"], (message) => {
        updateServerTimingConfig(message.project, message.config);
    });

    intercom.subscribe(["updateplugins"], (message) => {
        loadPluginsForProject(message.projectname);
    });

    // only process remove and set (get are in start)
    registerHttpChallenges(false);

    intercom.sendPromise("dockermng", {command: "requestPorts"}).then((actualPorts) => {
        portMappings = Object.assign(portMappings, actualPorts);
    });

    intercom.sendPromise("server-timing_request").then((data) => {
        Object.entries(data).forEach(([project, config]) => updateServerTimingConfig(project, config));
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

let currentClosing = [], currentStarting = [], closeWait = 0;
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
        closeWait = 0;
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
        closeWait += clusterUpdateInterval;
        if(closeWait >= 10) {
            let workers = Object.entries(cluster.workers), index = 0;
            for(let i = 0; i < actualCount - workersForConn; i++) {
                if(!currentClosing.includes(workers[index][0])) {
                    currentClosing.push(workers[index][0]);
                    workers[index][1].kill();
                    index++;
                } else i--;
            }
        }
    } else if(actualCount == workersForConn) closeWait = 0;
}

let pluginsPerProject = {};
/**
 * Stores in cache (ie. doesn't return) the plugins for a specific project from the database
 * @param {string} projectname The project to load the plugins for.
 * @returns {Promise<void>} A promise resolved when the plugins are cached.
 */
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
    let startTime = process.uptime();

    req.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S req error", error);
        }
    });

    res.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S res error", error);
        }
    });

    req.socket.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S req socket error", error);
        }
    });

    res.socket.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S res socket error", error);
        }
    });

    let originalPort = req.socket.localPort;
    res.once("finish", () => {
        webLogger(req, res, originalPort);
    });

    res.socket.once("close", () => {
        if(!res.writableEnded) webLogger(req, res, originalPort);
        res.end();

        res.removeAllListeners();
        req.removeAllListeners();
    });

    if(CONNECTIONS_LOG) connectionsLogger(req, res);

    let host = getHost(req.headers);
    if(host == undefined) {
        res.writeHead(400, {
            "Content-Type": "text/html"
        });

        let message = "Your browser didn't include a <i>" + (req.httpVersionMajor == 1 ? "Host" : ":authority") + "</i> header in this request.";
        if(errorPageCache == "") res.end("<h2>400 Bad Request!</h2><p>" + message + "</p>");
        else res.end(errorPageCache.replace("error_message", "400 Bad Request: " + message));
        return;
    }

    let domain = host.trimLeft().split(":")[0];

    connCount++;
    if(req.method == "GET" && regex_utils.isACMEChallenge(req.url)) {
        let challenges = httpChallenges[domain];
        if(challenges != undefined) {
            let token = req.url.split("/")[3], challenge = challenges[token];
            if(challenge == undefined) res.end("wrong challenge"); // TODO: why not just proxy as if challenges didnt exist?
            else res.end(challenge);

            return; // don't continue to specific port, res is already ended
        }
    }
    
    let modifiedDomain = regex_utils.getModifiedFromOtherDomains(domain), different = modifiedDomain != domain;
    let portDetails = await getPortDetails(modifiedDomain), port = portDetails.port, protocol = req.socket.encrypted === true ? "https://" : "http://";
    
    if(different && (portDetails.isSpecial || !(parseInt(req.headers["content-length"]) > 0)) && req.headers?.connection?.toLowerCase() != "upgrade") {
        res.writeHead(301, {
            Location: protocol + modifiedDomain + req.url
        }).end();
    } else if(modifiedDomain == "default." + process.env.ROOT_DOMAIN) {
        res.writeHead(301, {
            Location: protocol + process.env.ROOT_DOMAIN
        }).end();
    } else {
        if(!portDetails.isSpecial) {
            let projectname = portDetails.project;

            let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            let serverTimingEnabled = serverTimingConfig[projectname]?.enabled == true && serverTimingConfig[projectname].list.check(ip, "ipv" + (isIP.v4(ip) ? "4" : "6"));
            let serverTimingDesc = serverTimingConfig[projectname]?.desc;
            res.addServerTiming = (name, duration, description) => {
                if(!serverTimingEnabled) return;
                let existing = res.getHeader("Server-Timing");
                if (existing == undefined) existing = [];
                else if(!Array.isArray(existing)) existing = [existing];

                existing.push(name + ";dur=" + duration.toFixed(3) + (serverTimingDesc && description != undefined ? ";desc=\"" + description + "\"" : ""));
                res.setHeader("Server-Timing", existing);
            }

            res.addServerTiming("routing", (process.uptime() - startTime) * 1000, "Request to project details");

            if(pluginsPerProject[projectname] == undefined) await loadPluginsForProject(projectname);
            for(let [pluginname, pluginconfig] of (pluginsPerProject[projectname] ?? [])) {
                let interceptor = getPluginInterceptors(pluginname);
                if(interceptor !== false) {
                    await interceptor.requestInterceptor(projectname, pluginconfig, req, portDetails, res);
                    if(res.writableEnded) break; // plugin stopped the response, so we stop here
                }
            }
        }

        res.addServerTiming?.("total_proxy", (process.uptime() - startTime) * 1000, "Reception to proxying");

        let reqHostname = getHost(req.headers);
        if(!res.writableEnded) http2proxy.web(req, res, {hostname: "127.0.0.1", port, onReq: (req, { headers }) => {
            headers["x-forwarded-for"] = req.socket.remoteAddress
            headers["x-forwarded-proto"] = req.socket.encrypted ? "https" : "http"
            headers["x-forwarded-host"] = reqHostname ?? "undefined";
        }, onRes: (req, res, proxyRes) => {
            let resHeaders = proxyRes.headers, newLocation = resHeaders["location"];
            if(newLocation != undefined && reqHostname != undefined) {
                resHeaders["location"] =  newLocation.replace(new RegExp("http:\\/\\/(localhost|(172|127|10)\\.[\\d.]+):" + port), "http" + (process.env.ENABLE_HTTPS?.toLowerCase() == "true" ? "s" : "") + "://" + reqHostname)
            }

            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res);
        }}, webErrorHandler);
    }
}

// TODO: check memory usage for large responses
/*httpProxyServer.on("proxyRes", (proxyRes, req, res) => {
    for(let [header, value] of Object.entries(proxyRes.headers))
        res.setHeader(header, value);
    res.writeHead(proxyRes.statusCode, proxyRes.statusMessage);

    proxyRes.on("data", (chunk) => {
        res.write(chunk);
    });
    proxyRes.on("end", () =>  {
        res.end();
        proxyRes.removeAllListeners();
    });
});*/

function getHost(headers) {
    return headers["host"] ?? headers[":authority"];
}

/**
 * Upgrades a standard HTTP connection to a WebSocket connection.
 * @param {http.IncomingMessage} req The client incoming message.
 * @param {net.Socket} socket The associated socket for this connection.
 * @param {Buffer} head The current head of the connection.
 */
async function upgradeRequest(req, socket, head) {
    req.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S upgraded req error", error);
        }
    });

    req.socket.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S upgraded req socket error", error);
        }
    });

    socket.on("error", (error) => {
        if(DEBUG_HTTP_S_ERRORS) {
            console.log("HTTP/S upgraded socket error", error);
        }
    });

    // connCount++;
    let host = getHost(req.headers);
    if(host == undefined) return;

    http2proxy.ws(req, socket, head, {hostname: "127.0.0.1", port: (await getPortDetails(host.trimLeft().split(":")[0])).port, onReq: (req, { headers }) => {
        headers["x-forwarded-for"] = req.socket.remoteAddress;
        headers["x-forwarded-proto"] = req.socket.encrypted ? "https" : "http";
        headers["x-forwarded-host"] = host;
    }}, wsErrorHandler);
}

let errorPageCache = "";
function webErrorHandler(err, req, res) {
    try {
        if(err) {
            if(req.headers["accept"].includes("application/json")) {
                res.writeHead(502, {
                    "Content-Type": "application/json"
                });
    
                res.end(JSON.stringify({error: true, code: 502, message: "Cannot connect to the website!", detais: err}));
            } else {
                res.writeHead(502, {
                    "Content-Type": "text/html"
                });
            
                if(errorPageCache == "") res.end("<p>Could not connect to server: " + err + "</p>");
                else res.end(errorPageCache.replace("error_message", "Oops, it looks like we cannot get a working connection to this website!<br/>" + err));
            }
        }
    } catch(error) {
        // already an error, fail silently (not sure if its good tbh)
    }
}

function wsErrorHandler(err, req, socket, head) {
    try {
        if(err) {
            socket.destroy();
        }
    } catch(error) {
        // already an error, fail silently (not sure if its good tbh)
    }
}


module.exports.start = start;
module.exports.webServe = webServe;
module.exports.registerIntercomThread = registerIntercomThread;
module.exports.registerClusterMaster = registerClusterMaster;
module.exports.upgradeRequest = upgradeRequest;