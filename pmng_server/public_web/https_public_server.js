const https = require("https");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const intercom = require("../intercom/intercom_client").connect();

function start() {
    const https_options = {};
    
    https.createServer(https_options, web.webServe).listen(443, () => {
        logger.info("https public server started.");

        intercom.send("webStarted", {type: "https"});
    });

    privileges.drop();
    web.registerPortInfo();
}

start();