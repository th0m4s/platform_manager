const logger_tools = require("./pmng_server/platform_logger");
const child_process = require('child_process');

async function startPlatform() {
    const pmng_directory = __dirname;
    process.chdir(pmng_directory);

    require("dotenv").config();
    process.env.HOME = process.env.PROC_HOME;
    // home is set to /root by default because program is started as root
    // but some scripts like git are executed with user perm

    // logger preparation requires env variables
    await logger_tools.prepare();
    const logger = logger_tools.logger();

    logger.info("PLATFORM MANAGER IS STARTING!");

    let PRODUCTION = true;
    if(process.env.NODE_ENV != undefined || process.env.NODE_ENV == "development") {
        PRODUCTION = false;
        logger.info("Running in development.");
    } else logger.info("Running in production.");
    logger.isDebug = !PRODUCTION;

    logger.info("Starting intercom server...");
    await require("./pmng_server/intercom/intercom_server").start();

    // indicating that docker main instance should be on this process
    await require("./pmng_server/docker_manager").maininstance();
    
    // even if both next scripts don't require docker, docker is a requirement for the program (no need to start these if docker is not running)
    logger.info("Forking DNS server...");
    child_process.fork("./pmng_server/dns_server");

    logger.info("Forking FTP server...");
    child_process.fork("./pmng_server/ftp_server/ftp_server");

    // docker is started and running, so start scripts that require docker
    logger.info("Starting all web servers...");
    require("./pmng_server/web_server").start();

    // priveleges dropped from web_server
    logger.info("Forking local server...");
    child_process.fork("./pmng_server/local_server");

    // all processes should have dropped their privileges when started
    // check using ps -aux
}

startPlatform();