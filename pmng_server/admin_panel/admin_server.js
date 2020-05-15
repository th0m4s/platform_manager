const logger = require("../platform_logger").logger();
const express = require("express"), admin = express(), bodyParser = require("body-parser");
const passport = require('passport');
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");

admin.set('view engine', 'ejs');
admin.set('views', path.join(__dirname, '/views'));
admin.set('etag', false);

admin.use(bodyParser.json());
admin.use(bodyParser.urlencoded({ extended: true }));

// admin.use(passport.initialize());
// need to initialize and session in the same file

admin.use("/static", express.static(path.join(__dirname, "static", "dist")));
const favicon = path.join(__dirname, "static", "images", "favicon.ico");
admin.get("/favicon.ico", function(req, res) {
    res.sendFile(favicon);
});

admin.use("/api", require("./api_router"));
admin.use("/panel", require("./panel_router"));

admin.all("/", function(req, res) {
    res.redirect("/panel");
});

function start() {
    admin.listen(8080, () => {
        logger.info("Admin server started.");
    });

    // WIP-GREENLOCK
    //greenlock_manager.init();
}

start();