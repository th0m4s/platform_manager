const logger = require("../platform_logger").logger();
const intercom = require("../intercom/intercom_client").connect();

const express = require("express");
const localWeb = express();

/**
 * Middleware to check for only local requests
 * @param {express.Request} req The express request to check
 * @param {express.Response} res The express response object
 * @param {express.NextFunction} next A function for the next express callback
 */
function checkReqSource(req, res, next) {
    let source = req.socket.remoteAddress;
    if(source == "127.0.0.1" || source == "localhost" || source == "::1") next();
    else res.status(403).json({error: true, code: 403, message: "Unauthorized source."});
}

localWeb.get("/restart/:subprocess", checkReqSource, async (req, res) => {
    let subpId = req.params.subprocess;
    logger.tag("LWEB", "Local web server received restart request for " + subpId + ".");

    let respPromise = intercom.sendPromise("subprocesses", {id: subpId, command: "restart"});

    try {
        let resp = await Promise.race([respPromise, new Promise((resolve, reject) => {
            setTimeout(() => {
                reject("Intercom restart command from local web server timed out.");
            }, 7500);
        })]);

        if(resp?.error === true) {
            res.status(501).json({error: true, code: 501, message: error?.message ?? error});
        } else {
            res.json({error: false, code: 200, message: "Subprocess restart command sent!"});
        }
    } catch(error) {
        res.status(500).json({error: true, code: 500, message: error?.message ?? error});
    }
});

function start() {
    localWeb.listen(8041, "127.0.0.1", () => {
        logger.tag("LWEB", "Local web server started.");
    });
}


module.exports.start = start;