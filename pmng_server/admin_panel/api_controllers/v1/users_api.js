const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const mail_manager = require("../../../mails/mail_manager");
const project_manager = require("../../../project_manager");
const string_utils = require("../../../string_utils");
const rgit_manager = require("../../../remote_git/remote_git_manager");
const bodyParser = require("../../body_parser");
const api_auth = require("./api_auth");
const usersettings_manager = require("../../usersettings_manager");

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

router.post("/create", bodyParser(), (req, res) => {
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

router.post("/edit/:username", bodyParser(), (req, res) => {
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

                    if(req.body.password != undefined && req.body.password.trim().length >= 8) {
                        update.password = await database_server.hashPassword(req.body.password.trim());
                        await database_server.getPluginKnex().then((plk) => plk.raw("ALTER USER '" + name + "' IDENTIFIED BY '" + req.body.password.trim() + "';"));
                    }

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
                    Promise.all([database_server.database("users").where("name", name).update({dbautopass: newDbautopass}),
                        database_server.getPluginKnex().then((plk) => plk.raw("ALTER USER 'dbau_" + name + "' IDENTIFIED BY '" + newDbautopass + "';"))]).then(() => {
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
router.post("/me", bodyParser(), (req, res) => {
    api_auth(req, res, function(user) {
        let currentPassword = req.body.currentPassword || "";
        database_server.comparePassword(user.id, currentPassword).then(async (result) => {
            if(result != true) throw new Error("Invalid password.");

            let changes = req.body.changes;
            let update = {}; // not using req.body.changes like in /edit/:username

            if(changes.fullname != undefined && changes.fullname.trim().length > 0)
                update.fullname = changes.fullname.trim();
            
            let emailChangeError = false, changingEmail = false, currentNewEmail = undefined;
            if(changes.email != undefined && changes.email.trim().length > 0) {
                currentNewEmail = await database_server.userChangingMail(user.id);
                if(currentNewEmail == undefined) {
                    changingEmail = true;
                    let changeAllowHash = string_utils.generatePassword(32, 32, "abcdef0123456789abcdef");
                    let changeConfirmHash = string_utils.generatePassword(32, 32, "abcdef0123456789abcdef");
                    let newemail = changes.email.trim();
                    await database_server.database("email_changes").insert({user_id: user.id, old_email: user.email, new_email: newemail, allow_hash: changeAllowHash, confirm_hash: changeConfirmHash});
                    
                    let mailLinksStart = "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/panel/login/emailChange/";
                    await mail_manager.sendClientMail(user.email, "Platform Manager - Allow email change", "change_mail_old", {
                        fullname: changes.fullname || user.fullname,
                        username: user.name,
                        newemail,
                        allowlink: mailLinksStart +  "allow/" + changeAllowHash,
                        denylink: mailLinksStart +  "deny/" + changeAllowHash
                    });
                } else emailChangeError = true;
            }

            if(changes.password != undefined && changes.password.trim().length > 0) {
                update.password = await database_server.hashPassword(changes.password.trim());
                await database_server.getPluginKnex().then((plk) => plk.raw("ALTER USER '" + user.name + "' IDENTIFIED BY '" + changes.password.trim() + "';"));
            }

            if(Object.keys(update).length == 0) {
                if(!changingEmail) res.status(400).json({error: true, code: 400, message: "Invalid update: No changes."});
                else res.status(202).json({error: false, code: 202, message: "Email change request created."});
            } else {
                database_server.database("users").where("name", user.name).update(update).then(() => {
                    if(emailChangeError) res.status(206).json({error: false, code: 206, message: "User updated (but new email request failed).", newEmail: currentNewEmail});
                    else res.status(200).json({error: false, code: 200, message: "User updated."});
                }).catch((error) => {
                    res.status(500).json({error: true, code: 500, message: "Cannot update user database: " + error});
                });
            }
        }).catch((error) => {
            res.status(403).json({error: true, code: 403, message: "Cannot update user: " + error});
        });
    });
});

router.get("/me/cancelEmailChange", (req, res) => {
    api_auth(req, res, async function(user) {
        try {
            let currentNewEmail = await database_server.userChangingMail(user.id);
            if(currentNewEmail == undefined) res.status(404).json({error: true, code: 404, message: "This account doesn't have a current email change request."});
            else {
                await database_server.database("email_changes").where("user_id", user.id).andWhere("confirmed_at", null).andWhere("canceled_at", null).update({canceled_at: database_server.database.fn.now()});
                res.status(200).json({error: false, code: 200, message: "Email change request canceled."});    
            }
        } catch(error) {
            res.status(500).json({error: true, code: 500, message: "Cannot cancel request: " + error});
        }
    });
});

router.get("/me/resetdbautopass", (req, res) => {
    api_auth(req, res, function(user) {
        let newDbautopass = string_utils.generatePassword(16, 24);
        Promise.all([database_server.database("users").where("name", user.name).update({dbautopass: newDbautopass}),
            database_server.getPluginKnex().then((plk) => plk.raw("ALTER USER 'dbau_" + user.name + "' IDENTIFIED BY '" + newDbautopass + "';"))]).then(() => {
            res.status(200).json({error: false, code: 200, message: "dbautopass reset."});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: "Cannot reset dbautopass: " + error});
        });
    });
});

router.get("/delete/:username", (req, res) => {
    api_auth(req, res, function(user) {
        // TODO: move a lot of this code to database_server.removeUser
        if(database_server.checkScope(user.scope, "admin")) {
            let name = req.params.username;
            database_server.findUserByName(name).then((existingUser) => {
                if(existingUser != null) {
                    // first get projects
                    // project manager will do everything to remove the projects
                    // not using list(Owned/Collab)Projects because want only the names (and without limit)
                    database_server.database("projects").where("ownerid", existingUser.id).select("name").then((results) => {
                        let promises = [];
                        // could have removed projects lines with foreign keys, but deleting a project requires code to be executed
                        for(let result of results) promises.push(project_manager.deleteProject(result.name));

                        return Promise.all(promises);
                    }).then(() => {
                        // remove own collabs
                        return database_server.database("collabs").where("userid", existingUser.id).select(["id", "projectname"]);
                    }).then((results) => {
                        //let promises = [];
                        for(let result of results) {
                            //promises.push(database_server.database("collabs").where("id", result.id).delete().then(() => {
                                // collabs removed from database with foreign relations
                                intercom.send("projectsevents", {event: "update_collab", project: result.projectname, mode: "remove", collaboratorId: existingUser.id});
                            //}));
                        }

                        //return Promise.all(promises);

                        // now lists git integrations
                        return database_server.database("remote_git_users").where("userid", existingUser.id).select(["remote", "id", "userid"]);
                    }).then((gitUsers) => {
                        // and delete them
                        return Promise.all(gitUsers.map((x) => rgit_manager.getRemote(x.remote).then((remote) => remote.unlinkAccount(x))));
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

router.get("/settings/:setting", (req, res) => {
    api_auth(req, res, (user) => {
        usersettings_manager.getUserSetting(user.id, req.params.setting).then((value) => {
            res.status(200).json({error: false, code: 200, key: req.params.setting, value: value});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: "Cannot get setting: " + (error.message ?? error)});
        });
    })
});

router.post("/settings/:setting", bodyParser(), async (req, res) => {
    api_auth(req, res, (user) => {
        usersettings_manager.setUserSetting(user.id, req.params.setting, req.body.value, true).then(() => {
            res.status(200).json({error: false, code: 200, key: req.params.setting, message: "Setting updated."});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, key: req.params.setting, message: "Cannot set setting: " + (error.message ?? error)});
        });
    });
});


module.exports = router;