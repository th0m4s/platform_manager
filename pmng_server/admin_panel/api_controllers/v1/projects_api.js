const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const projects_manager = require("../../../project_manager");
const plugins_manager = require("../../../plugins_manager");
const docker_manager = require("../../../docker_manager");
const plans_manager = require("../../../plans_manager");
const api_auth = require("./api_auth");
const intercom = require("../../../intercom/intercom_client").connect();

const forbidden_names = ["www", "git", "admin", "ftp", "ns1", "ns2"];
// same values as in regex_utils

router.get("/forbiddennames", (req, res) => {
    res.json(forbidden_names);
});

router.get("/list/owned/:after/:limit", function(req, res) {
    api_auth(req, res, function(user) {
        let after = parseInt(req.params.after), limit = parseInt(req.params.limit);
        if(isNaN(after) || isNaN(limit)) {
            res.status(400).json({error: true, code: 400, message: "after and limit parameters should be integers."});
        } else {
            projects_manager.listOwnedProjects(user.id, after, limit, true).then((results) => {
                res.status(200).json({error: false, code: 200, results: results});
            });
        }        
    });
});

router.get("/list/collabs/:after/:limit", function(req, res) {
    api_auth(req, res, function(user) {
        let after = parseInt(req.params.after), limit = parseInt(req.params.limit);
        if(isNaN(after) || isNaN(limit)) {
            res.status(400).json({error: true, code: 400, message: "after and limit parameters should be integers."});
        } else {
            projects_manager.listCollabProjects(user.id, after, limit, true).then((results) => {
                res.status(200).json({error: false, code: 200, results: results});
            });
        }        
    });
});

router.get("/delete/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
            return projects_manager.deleteProject(projectname);
        }).then(() => {
            res.status(200).json({error: false, code: 200, message: "Project successfully deleted."});
        }).catch((err) => {
            res.json({error: true, code: 500, message: "Unable to delete project: " + err});
        });
    });
});

router.get("/isrunning/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, false).then(() => {
            docker_manager.isProjectContainerRunning(projectname).then((result) => {
                res.json({error: false, code: 200, running: result, message: "Container" + (!result ? " not":"") + " running."});
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

router.get("/create", (req, res) => {
    api_auth(req, res, function(user) {
        plans_manager.canUserCreateProject(user).then((canCreate) => {
            res.status(200).json({error: false, code: 200, message: "User can" + (canCreate ? "" : "not") + " create project.", canCreate});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: "Cannot check plan usage: " + error});
        });
    });
});

router.post("/create", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.body.projectname;
        if(projectname == undefined) {
            return res.status(400).json({error: true, code: 400, message: "Missing parameter."});
        } else if(forbidden_names.includes(projectname.toLowerCase())) {
            return res.status(400).json({error: true, code: 400, message: "Forbidden name."});
        }

        let userenv = req.body.userenv || {};
        let pluginnames = req.body.pluginnames || [];
        let collaborators = req.body.collaborators || [];
        let customdomains = req.body.customdomains || [];

        projects_manager.addProject(projectname, user.id, userenv, pluginnames).then((id) => {
            let domProm = [], collabsProm = [];
            customdomains.forEach((domain) => {
                if(domain !== "") domProm.push(projects_manager.addCustomDomain(projectname, domain.domain, domain.enablesub == true || domain.enablesub == "true", domain.full_dns == true || domain.full_dns == "true"));
            });

            Promise.all(domProm).then(() => {
                collaborators.forEach((collaborator) => {
                    if(collaborator.trim().length > 0) {
                        collabsProm.push(projects_manager.addCollaborator(projectname, collaborator, "view").then((collaboratorId) => {
                            intercom.send("projectsevents", {event: "add_collab", collaboratorId, manageable: false, project: {name: projectname, id, type: null, version: 0}, running: false});
                        }));
                    }
                });

                return Promise.all(collabsProm);
            }).then(() => {
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
                let needRestart = req.body.restart == "true", needStart = needRestart;
                let promises = [];

                let currentRunning = false;
    
                docker_manager.isProjectContainerRunning(projectname).then((running) => {
                    currentRunning = running;
                    return running && needRestart ? intercom.sendPromise("dockermng", {command: "stopProject", project: projectname}) : Promise.reject();
                    //                                                                          do not start container at the end because it would not be a restart
                }).catch(() => {
                    // could not stop project, will require a manual restart
                    needStart = false; 
                }).then(() => {
                    if(differences.plugins.add.length > 0 || differences.plugins.remove.length > 0) {
                        differences.plugins.add.forEach((item) => {
                            originalproject.plugins[item] = plugins_manager.getDefaultConfig(item);
                            promises.push(plugins_manager.install(item, projectname, originalproject.plugins[item]));
                        });
        
                        differences.plugins.remove.forEach((item) => {
                            promises.push(plugins_manager.uninstall(item, projectname, originalproject.plugins[item]));
                            delete originalproject.plugins[item];
                        });
        
                        promises.push(database_server.database("projects").where("name", projectname).update({plugins: originalproject.plugins}).then(() => {
                            let postInstalls = [];

                            differences.plugins.add.forEach((item) => {
                                postInstalls.push(plugins_manager.postInstall(item, projectname, originalproject.plugins));
                            });

                            return Promise.all(postInstalls);
                        }));
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
                        promises.push(projects_manager.addCollaborator(projectname, item, "view").then((collaboratorId) => {
                            intercom.send("projectsevents", {event: "add_collab", collaboratorId, manageable: false, running: currentRunning, project: {name: projectname, id: originalproject.id, type: originalproject.type, version: originalproject.version}});
                        }));
                    });
        
                    differences.collabs.remove.forEach((item) => {
                        promises.push(database_server.findUserId(item).then((id) => {
                            intercom.send("projectsevents", {event: "update_collab", project: projectname, mode: "remove", collaboratorId: id});
                            return database_server.database("collabs").where("projectname", projectname).andWhere("userid", id).delete();
                        }));
                    });
        
                    differences.domains.add.forEach((item) => {
                        promises.push(projects_manager.addCustomDomain(projectname, item.domain, item.enablesub == true || item.enablesub == "true", item.full_dns == true || item.full_dns == "true"));
                    });
        
                    differences.domains.remove.forEach((item) => {
                        intercom.send("greenlock", {command: "removeCustom", domain: item});
                        promises.push(database_server.database("domains").where("domain", item).delete());
                    });
        
                    differences.domains.modify.forEach((item) => {
                        let full_dns = item.new_fulldns == true || item.new_fulldns == "true" ? "true" : "false";
                        intercom.send("greenlock", {command: "edition", domain: item.domain, full_dns}); // call both remove then add
                        promises.push(database_server.database("domains").where("domain", item.domain).update({enablesub: (item.new_enablesub == true || item.new_enablesub == "true" ? "true" : "false"), full_dns}));
                    });
        
                    Promise.all(promises).then(() => {
                        projects_manager.invalidCachedDomain(projectname);
                        projects_manager.invalidateCachedProject(projectname);
                        // invalidated cache required to start the project

                        return needStart ? intercom.sendPromise("dockermng", {command: "startProject", project: projectname}) : Promise.resolve();
                    }).then(() => {
                        res.json({error: false, code: 200, message: "Project modified."});
                    }).catch((err) => {
                        res.status(500).json({error: true, code: 500, message: "Unable to modify project: " + err});
                    });
                })
            });
        }).catch((response) => {
            res.status(response.code).json(response);
        });
    });
});

function getUsageForPlugin(projectname, pluginname) {
    return plugins_manager.getPlugin(pluginname).getUsage(projectname).then((usage) => {
        return {plugin: pluginname, usage: usage};
    });
}

router.get("/usage/:projectname", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, false).then(() => {
            projects_manager.getProject(projectname).then((project) => {
                let prom = [];
                for(let plugin in project.plugins) {
                    prom.push(getUsageForPlugin(projectname, plugin));
                }

                Promise.allSettled(prom).then((results) => {
                    let usage = {};
                    for(let result of results) {
                        usage[result.value.plugin] = result.value.usage;
                    }

                    res.status(200).json({error: false, code: 200, usage: usage, message: "Usage retrieved."});
                });
            });
        });
    });
});

router.post("/updatecollab/:collabid/:collabmode", function(req, res) {
    api_auth(req, res, function(user) {
        let collabid = parseInt(req.params.collabid), newmode = req.params.collabmode;
        if(isNaN(collabid)) {
            res.status(400).json({error: true, code: 400, message: "Not a valid integer given as a collaboration id."});
        } else if(!(["view", "manage"].includes(newmode))) {
            res.status(400).json({error: true, code: 400, message: "Not a valid collaboration mode given."});
        } else {
            database_server.database("collabs").where("id", collabid).select("*").then((results) => {
                if(results.length != 1) {
                    res.status(400).json({error: true, code: 400, message: "Unable to find this collaboration."});
                } else {
                    if(results[0].userid == user.id) {
                        res.status(400).json({error: true, code: 400, message: "Unable to edit your own collaboration mode."});
                    } else {
                        let projectname = results[0].projectname;
                        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
                            database_server.database("collabs").where("id", collabid).update({mode: newmode}).then(() => {
                                database_server.database("collabs").where("id", collabid).select("userid").then((collabResults) => {
                                    if(collabResults.length == 1) intercom.send("projectsevents", {event: "update_collab", project: projectname, mode: newmode, collaboratorId: collabResults[0].userid});
                                });

                                res.status(200).json({error: false, code: 200, message: "Collaboration mode changed."});
                            }).catch((error) => {
                                res.status(500).json({error: true, code: 500, message: "Unable to edit this collaboration: " + error});
                            });
                        }).catch(() => {
                            res.status(403).json({error: true, code: 403, message: "Not authorized to modify this collaboration."});
                        });
                    }
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Unable to fetch this collaboration."});
            });
        }
    });
});

router.post("/removecollab/:collabid", function(req, res) {
    api_auth(req, res, function(user) {
        let collabid = parseInt(req.params.collabid);
        if(isNaN(collabid)) {
            res.status(400).json({error: true, code: 400, message: "Not a valid integer given as a collaboration id."});
        } else {
            database_server.database("collabs").where("id", collabid).select("*").then((results) => {
                if(results.length != 1) {
                    res.status(400).json({error: true, code: 400, message: "Unable to find this collaboration."});
                } else {
                    if(results[0].userid == user.id) {
                        res.status(400).json({error: true, code: 400, message: "Unable to remove your own collaboration."});
                    } else {
                        let projectname = results[0].projectname;
                        projects_manager.canAccessProject(projectname, user.id, true).then(() => {
                            database_server.database("collabs").where("id", collabid).select("userid").then((collabResults) => {
                                database_server.database("collabs").where("id", collabid).delete().then(() => {
                                    if(collabResults.length == 1) intercom.send("projectsevents", {event: "update_collab", project: projectname, mode: "remove", collaboratorId: collabResults[0].userid});

                                    res.status(200).json({error: false, code: 200, message: "Collaboration removed."});
                                }).catch((error) => {
                                    res.status(500).json({error: true, code: 500, message: "Unable to remove this collaboration: " + error});
                                });
                            }).catch((error) => {
                                res.status(500).json({error: true, code: 500, message: "Unable to access this collaboration: " + error});
                            });
                        }).catch(() => {
                            res.status(403).json({error: true, code: 403, message: "Not authorized to remove this collaboration."});
                        });
                    }
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Unable to fetch this collaboration."});
            });
        }
    });
});


router.post("/removedomain/:domainid", function(req, res) {
    api_auth(req, res, function(user) {
        let domainid = parseInt(req.params.domainid);
        if(isNaN(domainid)) {
            res.status(400).json({error: true, code: 400, message: "Not a valid integer given as a custom domain id."});
        } else {
            database_server.database("domains").where("id", domainid).select("*").then((results) => {
                if(results.length != 1) {
                    res.status(400).json({error: true, code: 400, message: "Unable to find this custom domain."});
                } else {
                    let projectname = results[0].projectname;
                    projects_manager.canAccessProject(projectname, user.id, true).then(() => {
                        intercom.send("greenlock", {command: "removeCustom", domain: results[0].domain});
                        database_server.database("domains").where("id", domainid).delete().then(() => {
                            res.status(200).json({error: false, code: 200, message: "Custom domain removed."});
                        }).catch((error) => {
                            res.status(500).json({error: true, code: 500, message: "Unable to remove this custom domain: " + error});
                        });
                    }).catch(() => {
                        res.status(403).json({error: true, code: 403, message: "Not authorized to remove this custom domain."});
                    });
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Unable to fetch this custom domain."});
            });
        }
    });
});

// TODO: why not this in plugins_api (because it doesn't have a separate file)
// TODO: what about catch errors here?
router.get("/pluginDetails/:projectname/:pluginname", (req, res) => {
    api_auth(req, res, function(user) {
        let projectname = req.params.projectname;
        projects_manager.canAccessProject(projectname, user.id, false).then(() => {
            projects_manager.getProject(projectname).then((project) => {
                let pluginname = req.params.pluginname;
                let plugins = project.plugins;

                if(plugins[pluginname] == undefined) {
                    res.status(404).json({error: true, code: 404, message: "Invalid plugin for this project."});
                } else {
                    let details = plugins_manager.getPlugin(pluginname).getUserDetails(projectname, plugins[pluginname]) || {type: "none"};
                    res.status(200).json({error: false, code: 200, message: "Plugin user details.", details});
                }
            });
        });
    });
});

module.exports = router;