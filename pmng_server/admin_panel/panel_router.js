const express = require('express'), router = express.Router();
const database_server = require("../database_server");

const session = require("express-session");
const KnexSessionStore = require("connect-session-knex")(session);
const flash = require('express-flash-messages');
const string_utils = require("../string_utils");

const store = new KnexSessionStore({
    knex: database_server.database,
    tablename: "panel_sessions"
});

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

const passport = require('passport'), PassportLocalStrategy = require('passport-local').Strategy;
router.use(passport.initialize()); router.use(passport.session());
passport.use(new PassportLocalStrategy(async function(username, password, done) {
        try {
            let user = await database_server.findUserByName(username);
            if(user == null) return done(null, false, {message: "Unable to find this user."});

            let check = await database_server.comparePassword(user.id, password);

            if(check) {
                let key = await database_server.generateKey(user.id, "session");
                user.key = key;

                await database_server.getPluginKnex().then((pluginKnex) => {
                    return pluginKnex.raw("SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = 'pmng_" + username + "') AS 'exists';").then((results) => {
                        let values = results[0]; // raw always give array of results and columns defs
                        let exists = values[0].exists != 0;

                        if(!exists)
                            return pluginKnex.raw("CREATE USER 'pmng_" + username + "' IDENTIFIED BY '" + password + "';");
                    });
                });

                return done(null, user);

            }
            else return done(null, false, {message: "Incorrect password."});
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

router.get("*", function(req, res, next) {
    req.setPage = function(r, title, active, sub) { r.locals.page = {title: title, active: active || "none", sub: sub || "none"}; }
    res.locals.site = {title: "Platform Manager"};
    res.locals.user = req.user;
    
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
})

router.get("/", function(req, res) {
    res.redirect("/panel/login");
});

router.use("/login", require("./panel_controllers/login_controller"));
router.use("/dashboard", require("./panel_controllers/dashboard_controller"));
router.use("/projects", require("./panel_controllers/projects_controller"));
router.use("/docker", require("./panel_controllers/docker_controller"));
router.use("/processes", require("./panel_controllers/processes_controller"));

module.exports = router;