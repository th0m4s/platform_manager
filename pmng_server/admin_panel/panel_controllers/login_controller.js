const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const string_utils = require("../../string_utils");
const mail_manager = require("../../mails/mail_manager");
const passport = require('passport');
const logger = require("../../platform_logger").logger();

router.all("/", function(req, res, next) {
    if(req.user != null) {
        req.flash("info", "Welcome back!");
        res.redirect("/panel/dashboard");
    }
    else next();
});

router.get("/logout", async function(req, res) {
    if(req.user !== undefined) {
        await database_server.revokeKey(req.user.key);

        delete req.session.account;
        req.logout();
        req.flash("info", "Logout successful.");
    } else req.flash("warn", "You were not logged in.");
    res.redirect("/panel/login");
});

let SSO_TYPES = {"database": "/databases/login.sso.php", "webmail": "/webmail/"}
router.post('/', (req, res, next) => {
    let ssotype = req.body.sso;
    let ssoredirect = ssotype == undefined ? undefined : SSO_TYPES[ssotype];

    let successRedirect = "/panel/dashboard", failureRedirect = "/panel/login";
    if(ssoredirect != undefined) {
        failureRedirect = "/panel/login/sso/" + ssotype;
        successRedirect = failureRedirect;

        let query = req.body.query;
        if(query != undefined && query != "") {
            query = JSON.parse(Buffer.from(query, "base64").toString("ascii"));
            for(let [key, value] of Object.entries(query)) {
                if(successRedirect.includes("?")) successRedirect += "&";
                else successRedirect += "?";
                successRedirect += key + "=" + value;
            }
        }
    }

    passport.authenticate('local', { session: true, successRedirect, failureRedirect, failureFlash: true, successFlash: "Login successful." })(req, res, next);
});

router.get("/", async function(req, res) {
    if(await database_server.isInstalled()) {
        req.setPage(res, "Login");
        res.locals.sso = undefined;
        res.locals.query = undefined;
        res.render("login/login");
    } else {
        res.redirect("/panel/login/install");
    }
});

router.get("/sso/:sso_type", async (req, res) => {
    if(await database_server.isInstalled()) {
        let ssotype = req.params.sso_type;
        let ssoredirect = SSO_TYPES[ssotype];
        if(ssoredirect == undefined) {
            res.redirect("/panel/login");
        } else {
            if(req.user != undefined) {
                if(ssoredirect.includes("?")) ssoredirect += "&";
                else ssoredirect += "?";
                ssoredirect = ssoredirect + "key=" + req.user.key;

                for(let [key, value] of Object.entries(req.query)) {
                    ssoredirect += "&" + key + "=" + value;
                }

                res.redirect(ssoredirect);
            } else {
                req.setPage(res, "Login");
                res.locals.sso = ssotype;
                res.locals.query = req.query;
                res.render("login/login");
            }
        }
    } else {
        res.redirect("/panel/login/install");
    }
});

router.get("/passwordReset", async (req, res) => {
    if(await database_server.isInstalled()) {
        req.setPage(res, "Password lost");
        res.render("login/preset_request");
    } else {
        res.redirect("/panel/login/install");
    }
});

router.get("/passwordReset/:resetHash", async (req, res) => {
    if(await database_server.isInstalled()) {
        let resetHash = req.params.resetHash;
        if(resetHash.length != 32) {
            req.flash("warn", "Invalid link. Please try again.");
            res.redirect("/panel/login/passwordReset");
        } else {
            database_server.database("password_resets").where("hash", resetHash).andWhere("used_at", null).select("id").then((results) => {
                if(results.length == 0) {
                    req.flash("warn", "Invalid link (maybe it has expired). Please try again.");
                    res.redirect("/panel/login/passwordReset");
                } else {
                    req.setPage(res, "Password reset");
                    res.locals.hash = resetHash;
                    res.render("login/preset_change");
                }
            }).catch((error) => {
                req.flash("danger", "Cannot check reset link: " + error);
                res.redirect("/panel/login/passwordReset");
            });
        }
    } else {
        res.redirect("/panel/login/install");
    }
});

router.post("/passwordReset", async (req, res) => {
    if(await database_server.isInstalled()) {
        let email = (req.body.email || "").trim();
        if(email.length == 0) {
            req.flash("warn", "Missing email.");
            res.redirect("/panel/login/passwordReset");
        } else {
            database_server.database("users").where("email", email).select(["id", "name", "fullname", "email"]).then((results) => {
                let prom = new Promise((resolve) => {
                    setTimeout(resolve, Math.floor(Math.random()*800)+800);
                });

                if(results.length > 0) {
                    let hash = string_utils.generatePassword(32, 32, "abcdef0123456789abcdef"), user = results[0];
                    prom = database_server.database("password_resets").insert({hash, user_id: user.id}).then(() => {
                        return mail_manager.sendClientMail(user.email, "Platform Manager - Password reset", "password_lost", 
                            {fullname: user.fullname, username: user.name, resetlink: "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/panel/login/passwordReset/" + hash, email: user.email});
                    });
                }

                prom.then(() => {
                    req.flash("success", "If this mail corresponds to a user in our database, you will soon receive a mail with instructions to reset your password.");
                    res.redirect("/panel/login");
                }).catch((error) => {
                    req.flash("danger", "Cannot reset password: " + error);
                    res.redirect("/panel/login/passwordReset");
                });
            }).catch((error) => {
                req.flash("danger", "Cannot check account in the database: " + error);
                res.redirect("/panel/login/passwordReset");
            });
        }
    } else {
        res.redirect("/panel/login/install");
    }
});

router.get("/install", async function(req, res) {
    if(!(await database_server.hasDatabase())) {
        res.redirect("/panel/login/install/database");
    } else if(!(await database_server.hasAdminUser())) {
        res.redirect("/panel/login/install/user");
    } else {
        res.redirect("/panel/login");
    }
});

router.get("/install/database", async function(req, res) {
    if(!(await database_server.hasDatabase())) {
        req.setPage(res, "Database installation");
        res.render("login/install_db");
    } else if(!(await database_server.hasAdminUser())) {
        req.flash("info", "Database already installed. Please create an admin user.");
        res.redirect("/panel/login/install/user");
    } else {
        req.flash("warn", "Database already installed.");
        res.redirect("/panel/login");
    }
});

router.get("/install/user", async function(req, res) {
    if(!(await database_server.hasDatabase())) {
        req.flash("warn", "Cannot create admin user: database not installed.");
        res.redirect("/panel/login/install/database");
    } else if(!(await database_server.hasAdminUser())) {
        req.setPage(res, "Admin user creation");
        res.render("login/install_user");
    } else {
        req.flash("warn", "Admin user already created.");
        res.redirect("/panel/login");
    }
});

router.post("/install/user", async function(req, res) {
    if(!(await database_server.hasDatabase())) {
        req.flash("warn", "Cannot create admin user: database not installed.");
        res.redirect("/panel/login/install/database");
    } else if(!(await database_server.hasAdminUser())) {
        try {
            await database_server.addUser(req.body.name, req.body.fullname, req.body.password, req.body.email, 1, 2); // TODO: use constant instead of '1' and '2' for scope and plan

            req.flash("success", "User created. Please login.");
            res.redirect("/panel/login");
        } catch(e) {
            logger.warn(e);

            req.flash("danger", "Unable to create admin user.");
            res.redirect("/panel/login/install/user");
        }
    } else {
        req.flash("warn", "Admin user already created.");
        res.redirect("/panel/login");
    }
});

router.get("/install/confirm", async function(req, res) {
    logger.info("WEB Installing database...");
    if(await database_server.installDatabase()) {
        logger.info("Database installed.");
        req.flash("success", "Database successfully installed.");

        res.redirect("/panel/login/install/user");
    } else {
        logger.error("Unable to install database.");
        req.flash("danger", "Unable to install database. See logs for details.");

        res.redirect("/panel/login/install/database");
    }
});

module.exports = router;