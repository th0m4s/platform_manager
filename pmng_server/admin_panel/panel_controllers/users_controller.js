const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const rgit_manager = require("../../remote_git/remote_git_manager");
const usersettings_manager = require("../usersettings_manager");

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else next();
});

router.get("/", (req, res) => {
    res.redirect("/panel/users/me");
});

router.get("/me", async (req, res) => {
    req.setPage(res, "Account", "account", "me"); // not using the correct users/me because it would highlight users for admin users
    res.locals.user = req.user;
    res.locals.newEmail = await database_server.userChangingMail(req.user.id);
    res.locals.remoteGits = await rgit_manager.listRemotesDetails(req.user.id);
    res.locals.settingsData = usersettings_manager.SETTINGS;
    res.render("users/me");
});

router.get("/all", (req, res) => {
    if(!database_server.checkScope(req.user.scope, "admin")) {
        req.flash("warn", "You don't have enough privileges to access this page.");
        res.redirect("/panel/users/me");
    } else {
        req.setPage(res, "List of users", "users", "all");
        res.locals.currentUsername = req.user.name;
        res.render("users/all");
    }
});

router.get("/create", (req, res) => {
    req.setPage(res, "Create a new user", "users", "create");
    res.render("users/manage");
});

router.get("/edit/:username", (req, res) => {
    if(!database_server.checkScope(req.user.scope, "admin")) {
        req.flash("warn", "You don't have enough privileges to access this page.");
        res.redirect("/panel/users/me");
    } else {
        database_server.findUserByName(req.params.username).then((user) => {
            if(user == null) {
                req.flash("warn", "This user doesn't exist.");
                res.redirect("/panel/users/all");
            } else {
                req.setPage(res, "Edit a user", "users", "edit");
                res.locals.edit = user;
                res.render("users/manage");
            }
        });
    }
});


router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/users/me");});
module.exports = router;