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
    } else next();
});

router.get("/list", (req, res) => {
    req.setPage(res, "List of docker container", "docker", "list");
    res.render("docker/list");
});

router.get("/details/:nameorid", (req, res) => {
    let nameOrId = req.params.nameorid;
    res.locals.value = nameOrId;
    req.setPage(res, "Details of container", "docker", "details");
    res.render("docker/details");
});


router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/docker/list");});
module.exports = router;