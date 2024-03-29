const express = require("express");
const app = express();
const logger = require("../../platform_logger").logger();
const path = require("path");
const privileges = require("../../privileges");

const stylePath = path.join(__dirname, "static/style.css");
app.get("/style.css", (req, res) => {
    res.sendFile(stylePath);
});

const errorRedirects = {mail: "__HTTPSadmin.__ROOT_DOMAIN/webmail"};
app.get("/", (req, res, next) => {
    let host = req.headers.host;
    if(host.endsWith(process.env.ROOT_DOMAIN)) {
        let redType = host.substring(0, host.length-process.env.ROOT_DOMAIN.length-1);
        let redirect = errorRedirects[redType];
        if(redirect != undefined) {
            res.redirect(redirect.replace(/__ROOT_DOMAIN/g, process.env.ROOT_DOMAIN).replace(/__HTTPS/g, "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s": "") + "://"));
        } else next();
    } else next();
})

const errorPage = path.join(__dirname, "static/port_error.html");
app.all("*", (req, res) => {
    if(req.headers["accept"].includes("application/json")) res.status(404).json({error: true, code: 404, message: "Cannot connect to the final website!"});
    else res.status(404).sendFile(errorPage);
});

function start() {
    app.listen(8099, "127.0.0.1", () => {
        logger.tag("WEB", "Error server started.");
    });
}


if(require.main === module) {
    privileges.drop();
    start();
}


module.exports.start = start;