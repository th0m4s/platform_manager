const https = require("https");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const intercom = require("../intercom/intercom_client").connect();
const regex_utils = require("../regex_utils");
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");

function start() {
    const https_options = {
        SNICallback: (serverName, cb) => {
            regex_utils.testCustom(serverName).then((project) => {
                let serverFile = serverName;
                if(project == null) {
                    serverFile = process.env.ROOT_DOMAIN;
                } else {
                    if(serverFile.startsWith("www.")) serverFile = serverFile.substring(4);
                    // should be done for each subdomaines
                    // subdomains are the same as in regex_utils
                }

                return greenlock_manager.getSecureContext(serverFile);
            }).then((context) => {
                cb(null, context);
            }).catch((error) => {
                logger.error("Cannot create secure context for domain " + serverName + ":" + error);
                cb(error);
            });
        }
    };
    
    https.createServer(https_options, web.webServe).listen(443, () => {
        logger.info("https public server started.");

        intercom.send("webStarted", {type: "https"});
    });

    privileges.drop();
    web.registerPortInfo();
}

start();