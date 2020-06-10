const logger = require("./platform_logger").logger();
const child_process = require("child_process");
const net = require("net");
const regex_utils = require("./regex_utils");
const database_server = require("./database_server");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const runtime_cache_delay = 10000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const httpProxyServer = require("http-proxy").createProxyServer();

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
const countPublic = enable_https ? 2 : 1, runningPublic = [];

function start() {
    intercom.subscribe(["webStarted"], function(message) {
        if(!runningPublic.includes(message.type)) {
            runningPublic.push(message.type);
        }

        if(runningPublic.length == countPublic) {
            intercom.send("dockermng", {command: "analyzeRunning"});
        }
    });

    // launching 2 processes to handle both HTTP and HTTPS public requests
    logger.info("Separating public servers into forks:");
    logger.info("Forking public http server...");         // path based on platform.js
    child_process.fork("./pmng_server/public_web/http_public_server");

    if(enable_https) {
        logger.info("Forking public https server...");
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

// 8042 is for local server, 8043 for intercom
// projects start at 11000
const errorPort = 8099, special_ports = {"admin": 8080, "git": 8081, "ftp": errorPort}; // ftp is bound to error port when using http
let isInstalled = false;
async function _getPort(host) {
    let special = regex_utils.testSpecial(host);
    if(special !== null) return special_ports[special];
    
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

function getTextHeaders(headers) {
    let resp = "";
    for(let [key, value] of Object.entries(headers)) { resp += key + ": " + value + "\r\n"; }
    return resp + "\r\n";
}

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
}

async function webServe(req, res) {
    httpProxyServer.web(req, res, {target: {host: "127.0.0.1", port: await getPort((req.headers.host || "").trimLeft().split(":")[0])}});
}

async function upgradeRequest(req, socket, head) {
    httpProxyServer.ws(req, socket, head, {target: {host: "127.0.0.1", port: await getPort((req.headers.host || "").trimLeft().split(":")[0])}});
}

httpProxyServer.on("error", function (err, req, res) {
    res.writeHead(500, {
        "Content-Type": "text/plain"
    });
  
    res.end("Connection to the project was closed or impossible to open: " + err);
});

module.exports.start = start;
module.exports.webServe = webServe;
module.exports.registerPortInfo = registerPortInfo;
module.exports.upgradeRequest = upgradeRequest;