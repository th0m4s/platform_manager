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
child_process.fork("./pmng_server/intercom/intercom_server");

logger.info("Forking DNS server...");
child_process.fork("./pmng_server/dns_server");

logger.info("Forking FTP server...");
child_process.fork("./pmng_server/ftp_server/ftp_server");

// indicating that docker main instance should be on this process
require("./pmng_server/docker_manager").maininstance().then(() => {
    // docker is started and running, so start scripts that require docker
    logger.info("Starting all web servers...");
    require("./pmng_server/web_server").start();

    // priveleges dropped from web_server
    logger.info("Forking local server...");
    child_process.fork("./pmng_server/local_server");
});

// all processes should have dropped their privileges when started
// check using ps -aux