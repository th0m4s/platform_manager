const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const passport = require('passport');
const project_manager = require("../../project_manager");
const logger = require('simple-node-logger').createSimpleLogger();

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else next();
});

router.get("/list", function(req, res) {
    req.setPage(res, "Projects list", "projects", "list");
    res.render("projects/list");
});

router.get("/create", function(req, res) {
    req.setPage(res, "Create a new project", "projects", "create");
    res.render("projects/details");
});

router.get("/edit/:projectname", function(req, res) {
    project_manager.getProject(req.params.projectname, true).then((project) => {
        Promise.all([database_server.database("domains").where("projectname", req.params.projectname).select("*"), database_server.database("collabs").where("projectname", req.params.projectname).select("*")]).then(([domains, collabs]) => {
            let domainsRes = [];
            domains.forEach((domain) => {
                domainsRes.push({domain: domain.domain, enablesub: domain.enablesub == "true"});
            });

            let collabsProm = [];
            collabs.forEach((collab) => {
                collabsProm.push(database_server.database("users").where("id", collab.userid).select("name"));
            });

            Promise.all(collabsProm).then((results) => {
                let collabsRes = [];
                results.forEach((result) => {
                    if(result.length == 1) collabsRes.push(result[0].name);
                })

                res.locals.edit = project;
                res.locals.edit.domains = domainsRes;
                res.locals.edit.collabs = collabsRes;
    
                req.setPage(res, "Edit a project", "projects", "edit");
                res.render("projects/details");
            });
        });
    }).catch(() => {
        req.flash("warn", "Unable to find this project.");
        res.redirect("/panel/projects/list");
    })
});

router.get("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/projects/list");});
module.exports = router;