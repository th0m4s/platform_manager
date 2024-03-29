const express = require('express'), router = express.Router();
const database_server = require("../database_server");
const plugins_manager = require("../plugins_manager");
//const nocache = require("nocache");

//router.use(nocache());
const passport = require('passport'), HeaderAPIKeyStrategy = require('passport-headerapikey').HeaderAPIKeyStrategy;
router.use(passport.initialize());
passport.use(new HeaderAPIKeyStrategy(         // false is do verify() need req
    { header: 'Authorization', prefix: 'Api-Key ' }, false,
    async function(apikey, done) {
        try {
            let user = await database_server.findUserByKey(apikey);

            if(user !== null) {
                user.key = apikey;
                return done(null, user);
            }
            else return done(null, false);
        } catch(e) {
            return done(e);
        }
    }

));

router.all("/unauthorized", function(req, res) {
    res.json({error: true});
});

router.use("/v1", (function() {
    let v1 = express.Router();

    v1.use("/login", require("./api_controllers/v1/login_api"));
    v1.use("/projects", require("./api_controllers/v1/projects_api"));
    v1.use("/users", require("./api_controllers/v1/users_api"));
    v1.use("/docker", require("./api_controllers/v1/docker_api"));
    v1.use("/processes", require("./api_controllers/v1/processes_api"));
    v1.use("/logs", require("./api_controllers/v1/logs_api"));
    v1.use("/mails", require("./api_controllers/v1/mails_api"));
    v1.use("/git", require("./api_controllers/v1/git_api"));

    v1.use("/plugins", plugins_manager.getRouter());

    return v1;
})());

module.exports = router;