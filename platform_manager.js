#!/usr/bin/env node
const logger_tools = require("./pmng_server/platform_logger");
// should be using subprocess_util instead of child_process

if(process.getuid() > 0) {
    console.error("Platform Manager master process should be run with root privileges.");
    process.exit(1);
}

(async function() {
    const pmng_directory = __dirname;
    process.chdir(pmng_directory);

    require("dotenv").config();
    process.env.HOME = process.env.PROC_HOME;
    // home is set to /root by default because program is started as root
    // but some scripts like git are executed with user perm

    // logger preparation requires env variables
    await logger_tools.prepare();
    const logger = logger_tools.logger(true);

    logger.info("PLATFORM MANAGER IS STARTING!");

    let PRODUCTION = true;
    if(process.env.NODE_ENV != undefined || process.env.NODE_ENV == "development") {
        PRODUCTION = false;
        logger.info("Running in development.");
    } else logger.info("Running in production.");
    logger.isDebug = !PRODUCTION;

    // reading git info
    await require("./git_versioning").readGitInfo(true);

    logger.info("Starting intercom server...");
    await require("./pmng_server/intercom/intercom_server").start();

    // enabling stats after intercom started
    logger.enableStats();

    let subprocess_util = require("./pmng_server/subprocess_util");

    // start process stats
    require("./pmng_server/process_stats").pidId("main_process");

    // starting subprocessed responder to centralize commands/timeouts
    subprocess_util.responder();

    subprocess_util.forkNamed("./pmng_server/root_commands", "root_commands", "root commands processor");

    // indicating that docker main instance should be on this process
    await require("./pmng_server/docker_manager").maininstance();
    
    // even if both next scripts don't require docker, docker is a requirement for the program (no need to start these if docker is not running)
    require("./pmng_server/dns_server").master();

    subprocess_util.forkNamed("./pmng_server/ftp_server/ftp_server", "ftp_server", "FTP server");

    // docker is started and running, so start scripts that require docker
    logger.info("Starting all web servers...");
    require("./pmng_server/web_server").start();

    subprocess_util.forkNamed("./pmng_server/local_server/local_main", "local_server", "local server");
 
    // all subprocesses (except root_commands and web cluster masters for port binding - platform_manager to restart stopped) should have dropped their privileges when started
    // check using ps -aux
})();