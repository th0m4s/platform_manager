const express = require('express'), router = express.Router();
const api_auth = require("./api_auth");
const mail_manager = require("../../../mails/mail_manager");
const string_utils = require("../../../string_utils");
const unixcrypt = require("unixcrypt");

router.post("/setPasswords", (req, res) => {
    api_auth(req, res, async function(user) {
        let encrypted = req.body.encrypted === true, p = (_p) => (encrypted ? _p : unixcrypt.encrypt(_p));
        let passwords = req.body.passwords;

        if(passwords.length > 0) {
            try {
                let ids = (await mail_manager.getUserMissingPasswords(user.id, user.scope, false)).map((r) => r.id), error = undefined;
                for(let {id} of passwords) {
                    if(!ids.includes(parseInt(id))) {
                        error = id;
                        break;
                    }
                }

                if(error !== undefined) res.status(403).json({error: true, code: 403, message: "Invalid email id given: " + error});
                else {
                    let mailDb = mail_manager.getMailDatabase(), prom = [];
                    for(let {id, password} of passwords) {
                        prom.push(mailDb("virtual_users").where("id", id).update({pwdset: "true", password: p(password)}));
                    }

                    await Promise.all(prom);
                    res.status(200).json({error: false, code: 200, message: "Mail passwords saved."});
                }
            } catch(error) {
                res.status(500).json({error: true, code: 500, message: "Cannot save passwords: " + error});
            }
        } else res.status(400).json({error: true, code: 400, message: "Bad Request: No passwords."});
    });
});

router.post("/users/create", (req, res) => {
    api_auth(req, res, async function(user) {
        try {
            let username = (req.body.username || "").trim(), domainId = parseInt(req.body.domain), quota = (req.body.quota || "100M").trim(), password = (req.body.password || "").trim(), encPassword = (req.body.encrypted == true ? password : unixcrypt.encrypt(password));
            if(username.length == 0 || password.length == 0 || isNaN(domainId)) {
                res.status(400).json({error: true, code: 400, message: "Invalid parameters!"});
            } else {
                let domainResult = await mail_manager.getMailDatabase("virtual_domains").where("id", domainId).andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope, true)).select(["name", "projectname"]);
                if(domainResult.length == 0) {
                    throw "Invalid domain!";
                } else {
                    let domain = domainResult[0].name;
                    let email = username + "@" + domain;
                    let emailResult = await mail_manager.getMailDatabase("virtual_users").where("email", email).count("id AS cnt");
                    if(emailResult[0].cnt > 0) {
                        throw "Email already exists!";
                    } else {
                        let sso_decrypt = string_utils.generatePassword(16, 24), sso_encrypt = unixcrypt.encrypt(sso_decrypt);
                        await mail_manager.getMailDatabase("virtual_users").insert({domain_id: domainId, email, password: encPassword, quota, projectname: domainResult[0].projectname, system: "false", pwdset: "true", sso_encrypt, sso_decrypt});
                        res.status(200).json({error: false, code: 200, message: "Address user added."});
                    }
                }
            }
        } catch(error) {
            res.status(500).json({error: true, code: 500, message: "Cannot added email user: " + error});
        }
    });
});

router.post("/users/edit/:mailid", (req, res) => {
    api_auth(req, res, function(user) {
        let id = parseInt(req.params.mailid);
        if(isNaN(id)) {
            res.status(400).json({error: true, code: 400, message: "Invalid mail id, not an integer."});
        } else {
            mail_manager.getMailDatabase("virtual_users").where("id", id).andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope, true)).then(async (existingMail) => {
                if(existingMail.length == 0) {
                    res.status(404).json({error: true, code: 404, message: "This address doesn't exist or you don't have enough permission to edit it."});
                } else {
                    let update = {}; // not using req.body for security reasons

                    if(req.body.quota != undefined && req.body.quota.trim().length > 0)
                        update.quota = req.body.quota.trim();

                    if(req.body.password != undefined && req.body.password.trim().length >= 8)
                        update.password = (req.body.encrypted ? req.body.password.trim() : unixcrypt.encrypt(req.body.password.trim()));

                    if(Object.keys(update).length == 0) res.status(400).json({error: true, code: 400, message: "Invalid update: No changes."});
                    else {
                        mail_manager.getMailDatabase("virtual_users").where("id", id).update(update).then(() => {
                            res.status(200).json({error: false, code: 200, message: "Email address updated."});
                        }).catch((error) => {
                            res.status(500).json({error: true, code: 500, message: "Cannot update address: " + error});
                        });
                    }
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        }
    });
});

router.get("/users/resetssopassword/:mailid", (req, res) => {
    api_auth(req, res, function(user) {
        let id = parseInt(req.params.mailid);
        if(isNaN(id)) {
            res.status(400).json({error: true, code: 400, message: "Invalid mail id, not an integer."});
        } else {
            mail_manager.getMailDatabase("virtual_users").where("id", id).andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope, true)).then(async (existingMail) => {
                if(existingMail.length == 0) {
                    res.status(404).json({error: true, code: 404, message: "This address doesn't exist or you don't have enough permission to reset its SSO password."});
                } else {
                    let sso_decrypt = string_utils.generatePassword(16, 24), sso_encrypt = unixcrypt.encrypt(sso_decrypt);
                    mail_manager.getMailDatabase("virtual_users").where("id", id).update({sso_encrypt, sso_decrypt}).then(() => {
                        res.status(200).json({error: false, code: 200, message: "Mail SSO password reset."});
                    }).catch((error) => {
                        res.status(500).json({error: true, code: 500, message: "Cannot reset mail SSO password: " + error});
                    });
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        }
    });
});

router.get("/users/delete/:mailid", (req, res) => {
    api_auth(req, res, function(user) {
        let id = parseInt(req.params.mailid);
        if(isNaN(id)) {
            res.status(400).json({error: true, code: 400, message: "Invalid mail id, not an integer."});
        } else {
            mail_manager.getMailDatabase("virtual_users").where("id", id).andWhere("system", "false").andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope, true)).then(async (existingMail) => {
                if(existingMail.length == 0) {
                    res.status(404).json({error: true, code: 404, message: "This address doesn't exist or you don't have enough permission to delete it."});
                } else {
                    mail_manager.getMailDatabase("virtual_users").where("id", id).delete().then(() => {
                        res.status(200).json({error: false, code: 200, message: "Mail user deleted."});
                    }).catch((error) => {
                        res.status(500).json({error: true, code: 500, message: "Cannot delete user row: " + error});
                    });
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        }
    });
});


router.post("/aliases/create", (req, res) => {
    api_auth(req, res, async function(user) {
        try {
            let sourceUser = (req.body.sourceUser || "").trim(), sourceDomainId = parseInt(req.body.sourceDomainId), destination = (req.body.destination || "").trim();
            if(sourceUser.length == 0 || destination.length == 0 || isNaN(sourceDomainId)) {
                res.status(400).json({error: true, code: 400, message: "Invalid parameters!"});
            } else {
                let domainResult = await mail_manager.getMailDatabase("virtual_domains").where("id", sourceDomainId).andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope)).select(["name", "projectname"]);
                if(domainResult.length == 0) {
                    throw "Invalid domain!";
                } else {
                    let domain = domainResult[0].name;
                    let email = sourceUser + "@" + domain;
                    let aliasResult = await mail_manager.getMailDatabase("virtual_aliases").where("destination", destination).count("id AS cnt");
                    if(aliasResult[0].cnt > 0) {
                        throw "Alias already exists!";
                    } else {
                        await mail_manager.getMailDatabase("virtual_aliases").insert({domain_id: sourceDomainId, source: email, destination, projectname: domainResult[0].projectname, system: "false"});
                        res.status(200).json({error: false, code: 200, message: "Mail alias added."});
                    }
                }
            }
        } catch(error) {
            res.status(500).json({error: true, code: 500, message: "Cannot added email alias: " + error});
        }
    });
});

router.post("/aliases/edit/:aliasid", (req, res) => {
    api_auth(req, res, function(user) {
        let id = parseInt(req.params.aliasid);
        if(isNaN(id)) {
            res.status(400).json({error: true, code: 400, message: "Invalid alias id, not an integer."});
        } else {
            let newDestination = (req.body.destination || "").trim();
            if(newDestination.length > 0) {
                mail_manager.getMailDatabase("virtual_aliases").where("id", id).andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope)).then(async (existingAlias) => {
                    if(existingAlias.length == 0) {
                        res.status(404).json({error: true, code: 404, message: "This alias doesn't exist or you don't have enough permission to edit it."});
                    } else {
                        mail_manager.getMailDatabase("virtual_aliases").where("id", id).update({destination: newDestination}).then(() => {
                            res.status(200).json({error: false, code: 200, message: "Alias edited."});
                        }).catch((error) => {
                            res.status(500).json({error: true, code: 500, message: "Cannot update alias: " + error});
                        })
                    }
                });
            } else {
                res.status(400).json({error: true, code: 400, message: "Missing destination."});
            }
        }
    });
});

router.get("/aliases/delete/:aliasid", (req, res) => {
    api_auth(req, res, function(user) {
        let id = parseInt(req.params.aliasid);
        if(isNaN(id)) {
            res.status(400).json({error: true, code: 400, message: "Invalid alias id, not an integer."});
        } else {
            mail_manager.getMailDatabase("virtual_aliases").where("id", id).andWhere("system", "false").andWhere(mail_manager.knexProjectnameSelector(user.id, user.scope, true)).then(async (existingAlias) => {
                if(existingAlias.length == 0) {
                    res.status(404).json({error: true, code: 404, message: "This alias doesn't exist or you don't have enough permission to delete it."});
                } else {
                    mail_manager.getMailDatabase("virtual_aliases").where("id", id).delete().then(() => {
                        res.status(200).json({error: false, code: 200, message: "Alias deleted."});
                    }).catch((error) => {
                        res.status(500).json({error: true, code: 500, message: "Cannot delete alias row: " + error});
                    });
                }
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: "Cannot check existing database: " + error});
            });
        }
    });
});

module.exports = router;