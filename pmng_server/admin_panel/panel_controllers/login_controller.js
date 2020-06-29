const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
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

        req.logout();
        req.flash("info", "Logout successful.");
    } else req.flash("warn", "You were not logged in.");
    res.redirect("/panel/login");
});

router.post('/', passport.authenticate('local', { session: true, successRedirect: '/panel/dashboard', failureRedirect: '/panel/login', failureFlash: true, successFlash: "Login successful." }));
router.get("/", async function(req, res) {
    if(await database_server.isInstalled()) {
        req.setPage(res, "Login");
        res.render("login/login");
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
            await database_server.addUser(req.body.name, req.body.fullname, req.body.password, req.body.email, 1); // TODO: use constant instead of 1

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
        logger.info("WEB Database installed.");
        req.flash("success", "Database successfully installed.");

        res.redirect("/panel/login/install/user");
    } else {
        logger.error("WEB Unable to install database.");
        req.flash("danger", "Unable to install database. See logs for details.");

        res.redirect("/panel/login/install/database");
    }
});

module.exports = router;