const logger = require('simple-node-logger').createSimpleLogger();
const child_process = require('child_process');
require("dotenv").config();

let PRODUCTION = true;
if(process.env.NODE_ENV != undefined || process.env.NODE_ENV == "development") {
    PRODUCTION = false;
    logger.info("Running in development.");
} else logger.info("Running in production.");
logger.isDebug = !PRODUCTION;

logger.info("Forking intercom server...");
child_process.fork("./server/intercom/intercom_server");

logger.info("Forking DNS server...");
child_process.fork("./server/dns_server");

logger.info("Forking FTP server...");
child_process.fork("./server/ftp_server/ftp_server");

logger.info("Starting all web servers...");
require("./server/web_server").start();

// priveleges dropped from web_server
logger.info("Forking local server...");
child_process.fork("./server/local_server");

// indicating that docker main instance should be on this process
require("./server/docker_manager").maininstance();

// all processes should have dropped their privileges when started
// check using ps -aux