const express = require('express'), router = express.Router();
const database_server = require("../database_server");
const login_utils = require("./login_utils");

const session = require("express-session");
const KnexSessionStore = require("connect-session-knex")(session);
const flash = require('express-flash-messages');

const store = new KnexSessionStore({
    knex: database_server.database,
    tablename: "panel_sessions"
});

const passport = require('passport'), PassportLocalStrategy = require('passport-local').Strategy;

let errorCategories = {"default": {"unknown": {title: "Unknown error", message: "An unknown occured and was redirecting to this page.", link: undefined}}};
/**
 * Registers an error page for the panel.
 * @param {string} category Category of the error.
 * @param {string} error Error identifier of the error.
 * @param {string} title Title of the error panel.
 * @param {string} message Body of the error.
 * @param {*} link *false* to hide the link, *undefined* to redirect to the dashboard or a *string*.
 */
function addErrorPage(category, error, title, message, link) {
    if(errorCategories[category] == undefined) errorCategories[category] = {};
    
    if(errorCategories[category] != undefined) {
        errorCategories[category][error] = {title, message, link};
    }
}

let routerReady = false;
function getRouter(headerLinks) {
    if(!routerReady) {
        router.use(flash());
        router.use(session({
            secret: process.env.SESSION_SECRET,
            cookie: {
                maxAge: 1000*60*60*24*2, // 2 days
                path: "/panel"
            },
            resave: true,
            saveUninitialized: false,
            store: store
        }));

        
        router.use(passport.initialize()); router.use(passport.session());
        passport.use(new PassportLocalStrategy({passReqToCallback: true}, async function(req, username, password, done) {
                try {
                    let {auth, user, tries, retryIn, sessionAccount} = await login_utils.loginUser(username, password, "session");

                    if(auth === true) {
                        req.session.account = sessionAccount;
                        return done(null, user);
                    } else if(tries > 0) {
                        return done(null, false, {message: "Invalid credentials." + (tries <= 3 ? " " + tries + " attempt" + (tries == 1 ? "" : "s") + " remaining." : "")}); // Incorrect password.
                    } else {
                        let retryText = retryIn > 60 ? Math.ceil(retryIn/60) + " minutes" : (retryIn == 1 ? "1 second" : retryIn + " seconds");
                        return done(null, false, {message: "Too many invalid login attempts. Please try again in " + retryText + "."});
                    }
                } catch(err) {
                    return done(err);
                }
            }
        ));

        passport.serializeUser(function(user, done) {
            done(null, user.key);
        });
        
        passport.deserializeUser(async function(key, done) {
            try {
                let user = await database_server.findUserByKey(key);

                if(user != null) {
                    user.key = key;
                    done(null, user);
                } else done("Unable to deserialize user.");
            } catch(e) {
                done(e);
            }
        });

        // helper from https://stackoverflow.com/questions/41069593/how-do-i-handle-errors-in-passport-deserializeuser
        // passportjs docs doesn't explain how to handle deserialization errors
        router.use(function(err, req, res, next) {
            if (err) {
                req.logout();
                if (req.originalUrl == "/panel/login") {
                    next();
                } else {
                    req.flash("error", "You've been logged out: " + (err.message || err));
                    res.redirect("/panel/login");
                }
            } else {
                next();
            }
        });

        router.get("*", function(req, res, next) {
            if(req.user != null && !req.url.startsWith("/login") && req.session.account.mailsNeedPwd && req.url != "/mails/setPasswords") {
                res.redirect("/panel/mails/setPasswords");
                return;
            }

            req.setPage = function(r, title, active, sub) { r.locals.page = {title: title, active: active || "none", sub: sub || "none"}; }
            res.locals.site = {title: "Platform Manager"};
            res.locals.user = req.user;
            res.locals.headerLinks = headerLinks;
            res.locals.allHeader = true;
            req.setAllHeader = (allHeader) => { res.locals.allHeader = allHeader; }
            
            res.locals.isActive = function(page, sub) {
                sub = sub || "*";
                return this.page.active == page && (this.page.sub == sub || sub == "*") ? "active" : "";
            }

            res.locals.hasAccess = function(access) {
                return database_server.checkScope(this.user.scope, access);
            }

            res.locals.startPageScript = function(script, requirements = []) {
                return "<script>$(document).ready(() => {loadAndInit(\"" + script + "\"" + (requirements.length > 0 ? ", " + JSON.stringify(requirements) : "") + ");});</script>";
            }

            res.locals.instantFinishLoad = function() {
                return "<script>$(document).ready(instantFinishLoad);</script>"
            }

            res.locals.isEdit = function() {
                return this.edit != undefined;
            }

            res.locals.getIfEdit = function(text, noedit = "") {
                return this.edit == undefined ? noedit : text;
            }

            res.locals.getEditParam = function(param) {
                if(param == "" || this.edit == undefined) return "";
                else return this.edit[param];
            }

            next();
        });

        router.get("/", function(req, res) {
            res.redirect(301, "/panel/login");
        });

        router.all("/error/:category/:error", (req, res) => {
            let category = req.params.category, error = req.params.error;
            if(errorCategories[category] == undefined) category = "default";
            if(errorCategories[category][error] == undefined) error = "unknown";

            let errorPage = errorCategories[category][error];

            req.setPage(res, "Error", "error");
            res.locals.error = errorPage;
            res.render("default/error");
        });

        router.use("/login", require("./panel_controllers/login_controller"));
        router.use("/dashboard", require("./panel_controllers/dashboard_controller"));
        router.use("/projects", require("./panel_controllers/projects_controller"));
        router.use("/docker", require("./panel_controllers/docker_controller"));
        router.use("/system", require("./panel_controllers/system_controller"));
        router.use("/users", require("./panel_controllers/users_controller"));
        router.use("/mails", require("./panel_controllers/mails_controller"));
        router.use("/git", require("./panel_controllers/git_controller"));

        routerReady = true;
    }

    return router;
}

module.exports.getRouter = getRouter;
module.exports.addErrorPage = addErrorPage;