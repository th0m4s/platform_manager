const http = require("http");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const intercom = require("../intercom/intercom_client").connect();

function start() {
    let httpServer = http.createServer(web.webServe).listen(80, () => {
        logger.info("http public server started.");

        intercom.send("webStarted", {type: "http"});
    });

    httpServer.on("upgrade", web.upgradeRequest);

    privileges.drop();
    web.registerPortInfo();
}

start();