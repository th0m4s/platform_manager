const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const docker_manager = require("../../docker_manager");
const logger = require("../../platform_logger").logger();

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else if(!database_server.checkScope(req.user.scope, "system")) {
        req.flash("warn", "You don't have enough privileges to access this page.");
        res.redirect("/panel/dashboard");
    } else next();
});

router.get("/", (req, res) => {
    req.setPage(res, "List of platform subprocesses", "processes", "platform");
    // TODO: instead of hardcoding subprocesses, use a list from subprocess_util
    res.locals.subprocesses = {
        "root_commands": {
            name: "Root commands processor",
            usage: "Executes commands that require root (uid 0) privileges, ie. for storages mounts.",
            special: 0
        },
        "ftp_server": {
            name: "FTP server",
            usage: "Serves a FTP server for the <i>persistent-storage</i> plugin.",
            special: 0
        },
        "local_server": {
            name: "Local server",
            usage: "Serves basic connections to execute actions from outside of the Javascript core, ie. for project deployments.",
            special: 0
        },
        "admin_web_server": {
            name: "Admin server",
            usage: "The panel you're currently on to manage the platform.",
            special: 2
        },
        "git_web_server": {
            name: "Git server",
            usage: "Binds git to an HTTP server for remote usage.",
            special: 0
        },
        "error_web_server": {
            name: "Error server",
            usage: "Handles pages displayed to the users if they request an unkown project/panel.",
            special: 0
        },
        "http_public_server": {
            name: "Public HTTP cluster master",
            usage: "Manages a cluster of HTTP servers that redirect user's connections to the correct project/panel.",
            special: 1
        }
    };

    if(process.env.ENABLE_HTTPS.toLowerCase() == "true") {
        res.locals.subprocesses["https_public_server"] = {
            name: "Public HTTPS cluster master",
            usage: "Same as HTTP, manages a cluster of HTTPS servers to handle user's requests.",
            special: 1
        };
    }

    res.render("processes/platform");
});


router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/processes");});
module.exports = router;