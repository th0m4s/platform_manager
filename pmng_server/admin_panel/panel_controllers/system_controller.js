const express = require('express'), router = express.Router();
const database_server = require("../../database_server");

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

let subprocesses = {
    "main_process": {
        name: "Main process",
        text: "The brain of the platform, it manages all other processes and actions.",
        check: -1
    },
    "dns_server": {
        name: "DNS server",
        text: "Responds to client DNS queries about projects, panels, mails records (also used by challenges and plugins).",
        check: 1
    },
    "root_commands": {
        name: "Root processor",
        text: "Executes commands that require root (uid 0) privileges, ie. for storages mounts.",
        check: 1
    },
    "ftp_server": {
        name: "FTP server",
        text: "Serves a FTP server for the <i>persistent-storage</i> plugin.",
        check: 1
    },
    "local_server": {
        name: "Local server",
        text: "Serves basic connections to execute actions from outside of the Javascript core, ie. for project deployments.",
        check: 1
    },
    "admin_web_server": {
        name: "Admin server",
        text: "The panel you're currently on to manage the platform.",
        check: 0
    },
    "pma_panel": {
        name: "phpMyAdmin panel",
        text: "The phpMyAdmin panel (running in a Docker container) to manage projects and administration databases.",
        check: 2
    },
    "rc_panel": {
        name: "Roundcube panel",
        text: "The Roundcube panel (running in a Docker container) running a webmail.",
        check: 2
    },
    "git_web_server": {
        name: "Git server",
        text: "Binds git to an HTTP server for remote usage.",
        check: 1
    },
    "error_web_server": {
        name: "Error server",
        text: "Handles pages displayed to the users if they request an unkown project/panel.",
        check: 1
    },
    "http_public_server": {
        name: "HTTP cluster master",
        text: "Manages a cluster of HTTP servers that redirect user's connections to the correct project/panel.",
        check: 0
    },
    "https_public_server": {
        name: "HTTPS cluster master",
        text: "Same as HTTP, manages a cluster of HTTPS servers to handle user's requests.",
        check: 0
    }
};

router.get("/subprocesses", (req, res) => {
    req.setPage(res, "Platform subprocesses", "system", "subprocesses");
    res.locals.subprocesses = subprocesses;
    res.locals.hide = [];

    if(process.env.ENABLE_HTTPS.toLowerCase() != "true")
        res.locals.hide.push("https_public_server");

    if(process.env.DB_MODE != "socket")
        res.locals.hide.push("rc_panel");

    res.render("processes/usage");
});


router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/system/subprocesses");});
module.exports = router;