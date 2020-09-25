const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const project_manager = require("../../../project_manager");
const string_utils = require("../../../string_utils");
const api_auth = require("./api_auth");

router.get("/exists/:username", (req, res) => {
    api_auth(req, res, function(user) {
        database_server.findUserId(req.params.username).then((id) => {
            res.status(200).json({error: false, code: 200, message: "User found", exists: true, id});
        }).catch((err) => {
            res.status(200).json({error: false, code: 200, message: "User not found.", exists: false});
        });
    });
});

router.get("/list", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            database_server.database("users").select(["id", "name", "fullname", "email", "scope"]).then((results) => {
                res.status(200).json({error: false, code: 200, message: "Users list.", users: results});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot list users: " + error});
            });
        } else {
            res.status(403).json({error: true, code: 403, message: "Not enough permissions to list users."});
        }
    });
});

router.post("/create", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            let {name, fullname, email, password, scope} = req.body;
            if(name == undefined || fullname == undefined || email == undefined || password == undefined || scope == undefined
                || name.length == 0 || fullname.length == 0 || password.length < 8 || email.length == 0 || isNaN(parseInt(scope))) {
                res.status(400).json({error: true, code: 409, message: "Invalid parameters."});
            } else {
                database_server.findUserByName(name).then((existingUser) => {
                    if(existingUser == null) {
                        database_server.addUser(name, fullname, password, email, scope, 1).then(() => {
                            res.status(200).json({error: false, code: 200, message: "User added into the database."});
                        }).catch((error) => {
                            res.status(500).json({error: true, code: 500, message: "Cannot add this user to the database: " + error});
                        });
                    } else res.status(409).json({error: true, code: 409, message: "A user already exists with this name."});
                }).catch((error) => {
                    res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
                });
            }
        } else {
            res.status(403).json({error: true, code: 403, message: "Not enough permissions to create a user."});
        }
    });
});

router.post("/edit/:username", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            let name = req.params.username;
            database_server.findUserByName(name).then(async (existingUser) => {
                if(existingUser != null) {
                    let update = {}; // not using req.body for security reasons (password needs to be hashed and cannot edit name column)

                    if(req.body.fullname != undefined && req.body.fullname.trim().length > 0)
                        update.fullname = req.body.fullname.trim();
                    
                    if(req.body.email != undefined && req.body.email.trim().length > 0)
                        update.email = req.body.email.trim();

                    if(req.body.scope != undefined) {
                        let scope = parseInt(req.body.scope);
                        if(!isNaN(scope) && scope > 0 && scope < 100) update.scope = scope;
                    }

                    if(req.body.password != undefined && req.body.password.trim().length >= 8)
                        update.password = await database_server.hashPassword(req.body.password.trim());

                    if(Object.keys(update).length == 0) res.status(400).json({error: true, code: 400, message: "Invalid update: No changes."});
                    else {
                        database_server.database("users").where("name", name).update(update).then(() => {
                            res.status(200).json({error: false, code: 200, message: "User updated."});
                        }).catch((error) => {
                            res.status(500).json({error: true, code: 500, message: "Cannot update user database: " + error});
                        });
                    }
                } else res.status(404).json({error: true, code: 404, message: "This user doesn't exist."});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        } else {
            res.status(403).json({error: true, code: 403, message: "Not enough permissions to edit this user."});
        }
    });
});

router.get("/edit/:username/resetdbautopass", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            let name = req.params.username;
            database_server.findUserByName(name).then(async (existingUser) => {
                if(existingUser != null) {
                    let newDbautopass = string_utils.generatePassword(16, 24);
                    database_server.database("users").where("name", name).update({dbautopass: newDbautopass}).then(() => {
                        res.status(200).json({error: false, code: 200, message: "User dbautopass reset."});
                    }).catch((error) => {
                        res.status(500).json({error: true, code: 500, message: "Cannot reset user dbautopass: " + error});
                    });
                } else res.status(404).json({error: true, code: 404, message: "This user doesn't exist."});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        } else {
            res.status(403).json({error: true, code: 403, message: "Not enough permissions to reset this user's dbautopass."});
        }
    });
});

// edition of current account
router.post("/me", (req, res) => {
    api_auth(req, res, function(user) {
        let currentPassword = req.body.currentPassword || "";
        database_server.comparePassword(user.id, currentPassword).then(async (result) => {
            if(result != true) throw new Error("Invalid password.");

            let changes = req.body.changes;
            let update = {}; // not using req.body.changes like in /edit/:username

            if(changes.fullname != undefined && changes.fullname.trim().length > 0)
                update.fullname = changes.fullname.trim();
            
            if(changes.email != undefined && changes.email.trim().length > 0)
                update.email = changes.email.trim();

            if(changes.password != undefined && changes.password.trim().length > 0)
                update.password = await database_server.hashPassword(changes.password);

            if(Object.keys(update).length == 0) res.status(400).json({error: true, code: 400, message: "Invalid update: No changes."});
            else {
                database_server.database("users").where("name", user.name).update(update).then(() => {
                    res.status(200).json({error: false, code: 200, message: "User updated."});
                }).catch((error) => {
                    res.status(500).json({error: true, code: 500, message: "Cannot update user database: " + error});
                });
            }
        }).catch((error) => {
            res.status(403).json({error: true, code: 403, message: "Cannot update user: " + error});
        });
    });
});

router.get("/me/resetdbautopass", (req, res) => {
    api_auth(req, res, function(user) {
        let newDbautopass = string_utils.generatePassword(16, 24);
        database_server.database("users").where("name", user.name).update({dbautopass: newDbautopass}).then(() => {
            res.status(200).json({error: false, code: 200, message: "dbautopass reset."});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: "Cannot reset dbautopass: " + error});
        });
    });
});

router.get("/delete/:username", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            let name = req.params.username;
            database_server.findUserByName(name).then((existingUser) => {
                if(existingUser != null) {
                    
                    // first get projects
                    // project manager will do everything to remove the projects
                    // not using list(Owned/Collab)Projects because want only the names (and without limit)
                    database_server.database("projects").where("ownerid", existingUser.id).select("name").then((results) => {
                        let promises = [];
                        for(let result of results) promises.push(project_manager.deleteProject(result.name));

                        return Promise.all(promises);
                    }).then(() => {
                        // remove own collabs
                        return database_server.database("collabs").where("userid", existingUser.id).select(["id", "projectname"]);
                    }).then((results) => {
                        let promises = [];
                        for(let result of results) {
                            promises.push(database_server.database("collabs").where("id", result.id).delete().then(() => {
                                intercom.send("projectsevents", {event: "update_collab", project: result.projectname, mode: "remove", collaboratorId: existingUser.id});
                            }));
                        }

                        return Promise.all(promises);
                    }).then(() => {
                        // remove user
                        return database_server.removeUser(name);
                    }).then(() => {
                        res.status(200).json({error: false, code: 200, message: "User deleted."});
                    }).catch((error) => {
                        res.status(500).json({error: true, code: 500, message: "Cannot delete this user: " + error});
                    });

                } else res.status(404).json({error: true, code: 404, message: "This user doesn't exist."});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        } else {
            res.status(403).json({error: true, code: 403, message: "Not enough permissions to delete this user."});
        }
    });
});

module.exports = router;