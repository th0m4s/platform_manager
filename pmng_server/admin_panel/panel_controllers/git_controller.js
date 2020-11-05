const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const rgit_manager = require("../../remote_git/remote_git_manager");

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else next();
});

router.get("/:remote/auth", async (req, res, next) => {
    let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());

    if(remote == undefined) {
        req.flash("warning", "This remote doesn't exist.");
        res.redirect("/panel/users/me");
    } else {
        remote.auth(req, res, next);
    }
});

let handleCallback = async (req, res, next) => {
    let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());

    if(remote == undefined) {
        req.flash("warning", "This remote doesn't exist.");
        res.redirect("/panel/users/me");
    } else {
        remote.authCallback(req, res, next);
    }
}

router.route("/:remote/auth/callback").get(handleCallback).post(handleCallback);

router.all("/*", function(req, res) { res.redirect("/panel/users/me"); });
module.exports = router;