const http = require("http");
const web = require("../web_server");
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const intercom = require("../intercom/intercom_client").connect();

const enable_https = process.env.ENABLE_HTTPS.toLowerCase() == "true";
// same line as in web_server.js

function start() {
    let serve = web.webServe;

    if(enable_https) {
        serve = (req, res) => {
            res.writeHead(302, {Location: "https://" + req.headers.host + req.url});
            res.end();
        };
    }

    let httpServer = http.createServer(serve).listen(80, () => {
        logger.info("http public server started.");

        intercom.send("webStarted", {type: "http"});
    });

    httpServer.on("upgrade", web.upgradeRequest);

    privileges.drop();
    web.registerPortInfo();
}

start();