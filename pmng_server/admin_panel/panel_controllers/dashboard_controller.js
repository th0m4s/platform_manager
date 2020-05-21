const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const passport = require('passport');

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else next();
});

router.get("/", function(req, res) {
    req.setPage(res, "Dashboard", "home");
    res.render("dashboard/dashboard");
});

router.all("/*", function(req, res) {res.redirect("/panel/dashboard")});
module.exports = router;