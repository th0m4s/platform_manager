const logger = require('simple-node-logger').createSimpleLogger();
const child_process = require("child_process");
const net = require("net");
const regex_utils = require("./regex_utils");
const project_manager = require("./project_manager");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();

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
    child_process.fork("./server/public_web/http_public_server");

    if(enable_https) {
        logger.info("Forking public https server...");
        child_process.fork("./server/public_web/https_public_server");
    }

    privileges.drop();

    logger.info("Forking admin web server...");
    child_process.fork("./server/admin_panel/admin_server");

    logger.info("Forking error web server...");
    child_process.fork("./server/error_server");

    logger.info("Forking git web server...");
    child_process.fork("./server/git_server");

    logger.info("Forking error web server...");
    child_process.fork("./server/error_panel/error_server");
}

// 8042 is for local server, 8043 for intercom
// projects start at 11000
const special_ports = {"admin": 8080, "git": 8081}, errorPort = 8099;
async function getPort(host) {
    let special = regex_utils.testSpecial(host);
    if(special !== null) return special_ports[special];
    
    let project = regex_utils.testProject(host);
    if(project !== null) {
        if(portMappings.hasOwnProperty(project)) return portMappings[project];
        else return errorPort;
    }

    let custom = await regex_utils.testCustom(host);
    if(custom != null) {
        if(portMappings.hasOwnProperty(project)) return portMappings[project];
        else return errorPort;
    }

    return errorPort;
}

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
    let to = net.createConnection({host: "localhost", port: await getPort(req.headers.host.trimLeft())});
    to.on("data", (data) => {
        req.socket.write(data);
    });
    to.write(req.method + " " + req.url + " HTTP/" + req.httpVersion + "\r\n");
    to.write(getTextHeaders(req.headers));
    req.on("data", (data) => {
        to.write(data);
    }); // .pipe() doesn't work ....
    to.setKeepAlive(true);
}

module.exports.start = start;
module.exports.webServe = webServe;
module.exports.registerPortInfo = registerPortInfo;