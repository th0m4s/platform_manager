const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const projects_manager = require("../../../project_manager");
const plugins_manager = require("../../../plugins_manager");
const docker_manager = require("../../../docker_manager");
const api_auth = require("./api_auth");
const rmfr = require("rmfr");
const intercom = require("../../../intercom/intercom_client").connect();
const logger = require('simple-node-logger').createSimpleLogger();

router.get("/list/owned/:after/:limit", function(req, res) {
    api_auth(req, res, function(user) {
        let after = parseInt(req.params.after), limit = parseInt(req.params.limit);
        if(isNaN(after) || isNaN(limit)) {
            res.status(405).json({error: true, code: 405, message: "after and limit parameters should be integers."});
        } else {
            projects_manager.listOwnedProjects(user.id, after, limit).then((results) => {
                res.status(200).json({error: false, code: 200, results: results});
            });
        }        
    });
});

router.get("/list/collabs/:after/:limit", function(req, res) {
    api_auth(req, res, function(user) {
        let after = parseInt(req.params.after), limit = parseInt(req.params.limit);
        if(isNaN(after) || isNaN(limit)) {
            res.status(405).json({error: true, code: 405, message: "after and limit parameters should be integers."});
        } else {
            projects_manager.listCollabProjects(user.id, after, limit).then((results) => {
                res.status(200).json({error: false, code: 200, results: results});
            });
        }        
    });
});

router.get("/delete/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
            Promise.all([
                database_server.database("projects").where("name", projectname).delete(),
                database_server.database("domains").where("projectname", projectname).delete(),
                database_server.database("collabs").where("projectname", projectname).delete(),
                rmfr(projects_manager.getProjectFolder(projectname))
            ]).then(() => {
                projects_manager.invalidCachedDomain(projectname);
                projects_manager.invalidateCachedProject(projectname);
                res.status(200).json({error: false, code: 200, message: "Project successfully deleted."});
            }).catch((err) => {
                res.json({error: true, code: 500, message: "Unable to delete project: " + err});
            });
        }).catch((response) => {
            res.status(response.code).json(response);
        });
    });
});

router.get("/isrunning/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, false).then(() => {
            docker_manager.isProjectContainerRunning(projectname).then((result) => {
                res.json({error: false, code: 200, running: result, message: "Container " + (!result ? "not":"") + " running."});
            }).catch((err) => {
                res.json({error: true, code: 500, message: "Unable to check state: " + err});
            });
        }).catch((response) => {
            res.status(response.code).json(response);
        })
    });
});

router.get("/arerunning/:projectnames", function(req, res) {
    api_auth(req, res, function(user) {
        let askprojectnames = req.params.projectnames.split(",");
        let promises = [];
        askprojectnames.forEach((askedproject) => {
            promises.push(projects_manager.canAccessProject(askedproject, user.id, false));
        });

        Promise.allSettled(promises).then((results) => {
            let allowedprojects = [];

            results.forEach((result) => {
                if(result.status == "fulfilled") allowedprojects.push(result.value);
            });

            if(allowedprojects.length > 0) {
                docker_manager.areProjectContainersRunning(allowedprojects).then((results) => {
                    res.json({error: false, code: 200, message: "States fetched from Docker.", results: results});
                }).catch((err) => {
                    res.json({error: true, code: 500, message: "Unable to check states: " + err});
                });
            } else {
                res.status(403).json({error: true, code: 403, message: "You don't have access to any of these projects or they don't exist."});
            }            
        });
    });
});

router.get("/start/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
            intercom.sendPromise("dockermng", {command: "startProject", project: projectname}).then(() => {
                res.status(200).json({error: false, code: 200, message: "Project started."});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot start project: " + error});
            });
        }).catch((response) => {
            console.warn(response);
            res.status(500).json(response);
        });
    });
});

router.get("/stop/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
            intercom.sendPromise("dockermng", {command: "stopProject", project: projectname}).then(() => {
                res.status(200).json({error: false, code: 200, message: "Project stopped."});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot stop project: " + error});
            });
        }).catch((response) => {
            console.warn(response);
            res.status(500).json(response);
        });
    });
});

router.post("/create", function(req, res) {
    api_auth(req, res, function(user) {
        if(req.body.projectname == undefined) {
            return res.status(400).json({error: true, code: 400, message: "Missing parameter."});
        }

        let userenv = req.body.userenv || {};
        let pluginnames = req.body.pluginnames || [];
        let collaborators = req.body.collaborators || [];
        let customdomains = req.body.customdomains || [];

        projects_manager.addProject(req.body.projectname, user.id, userenv, pluginnames).then(() => {
            let prom = [];
            customdomains.forEach((domain) => {
                if(domain !== "") prom.push(projects_manager.addCustomDomain(req.body.projectname, domain.domain, domain.enablesub == true || domain.enablesub == "true"));
            });
            collaborators.forEach((collaborator) => {
                if(collaborator.trim().length > 0) prom.push(projects_manager.addCollaborator(req.body.projectname, collaborator, "manage"));
            });

            (prom.length > 0 ? Promise.all(prom) : Promise.resolve()).then(() => {
                res.status(200).json({error: false, code: 200, message: "Project successfully created."});
            }).catch((err) => {
                res.json({error: true, code: 409, message: "Project created, but one or more custom domains or collaborators were not added.", details: err});
            });
        }).catch((err) => {
            res.status(500).json({error: true, code: 500, message: "Unable to create project", details: err.message});
        });
    });
});

router.post("/edit/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
            projects_manager.getProject(projectname).then((originalproject) => {
                let differences = JSON.parse(req.body.differences);
                let promises = [];
    
                if(differences.plugins.add.length > 0 || differences.plugins.remove.length > 0) {
                    differences.plugins.add.forEach((item) => {
                        originalproject.plugins[item] = plugins_manager.getDefaultConfig(item);
                    });
    
                    differences.plugins.remove.forEach((item) => {
                        delete originalproject.plugins[item];
                    });
    
                    promises.push(database_server.database("projects").where("name", projectname).update({plugins: originalproject.plugins}));
                }
    
                if(differences.env.add.length > 0 || differences.env.remove.length > 0 || differences.env.modify.length > 0) {
                    differences.env.add.forEach((item) => {
                        originalproject.userenv[item.key] = item.value;
                    });
    
                    differences.env.remove.forEach((item) => {
                        delete originalproject.userenv[item];
                    });
    
                    differences.env.modify.forEach((item) => {
                        originalproject.userenv[item.key] = item.newvalue;
                    });
    
                    promises.push(database_server.database("projects").where("name", projectname).update({userenv: originalproject.userenv}));
                }
    
                differences.collabs.add.forEach((item) => {
                    promises.push(projects_manager.addCollaborator(projectname, item, "manage"));
                });
    
                differences.collabs.remove.forEach((item) => {
                    promises.push(database_server.findUserId(item).then((id) => {
                        return database_server.database("collabs").where("projectname", projectname).andWhere("userid", id).delete();
                    }));
                });
    
                differences.domains.add.forEach((item) => {
                    promises.push(projects_manager.addCustomDomain(projectname, item.domain, item.enablesub == true || item.enablesub == "true"));
                });
    
                differences.domains.remove.forEach((item) => {
                    promises.push(database_server.database("domains").where("domain", item).delete());
                });
    
                differences.domains.modify.forEach((item) => {
                    promises.push(database_server.database("domains").where("domain", item.domain).update({enablesub: (item.newstate == true || item.newstate == "true" ? "true" : "false")}));
                });
    
                Promise.all(promises).then(() => {
                    res.json({error: false, code: 200, message: "Project modified."});
    
                    projects_manager.invalidCachedDomain(projectname);
                    projects_manager.invalidateCachedProject(projectname);
                }).catch((err) => {
                    res.status(500).json({error: true, code: 500, message: "Unable to modify project: " + err});
                });
            });
        }).catch((response) => {
            res.status(response.code).json(response);
        });
    });
});

module.exports = router;