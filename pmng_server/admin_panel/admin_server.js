const logger = require("../platform_logger").logger();
const express = require("express"), admin = express(), bodyParser = require("body-parser");
const passport = require('passport');
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");
const privileges = require("../privileges");
const socket_auth = require("./socket_controllers/socket_auth");
const socketio_auth = require("socketio-auth");
const fs = require("fs");

let utilsPanels = {};
function handleCustomPanel(route, panel) {
    return (req, res, next) => {
        if(req.originalUrl == "/" + route) res.redirect("/" + route + "/");
        else panel.handleRequest(req, res, next);
    };
}

for(let name of fs.readdirSync(path.resolve(__dirname, "custom_panels"))) {
    let fullpath = path.resolve(__dirname, "custom_panels", name);
    let stat = fs.statSync(fullpath);

    if(stat.isDirectory()) {
        for(let file of fs.readdirSync(fullpath)) {
            if(file.startsWith("panel_")) {
                let panel = require(path.resolve(fullpath, file.replace(".js", "")));
                let route = panel.route();

                if(route != undefined) {
                    panel.startPanel();
                    if(panel.requiresUtils()) utilsPanels[route] = panel;
                    else admin.use("/" + route, handleCustomPanel(route, panel));

                    break;
                }
            }
        }
    }
}

admin.set('view engine', 'ejs');
admin.set('views', path.join(__dirname, '/views'));
admin.set('etag', false);

admin.use(bodyParser.json());
admin.use(bodyParser.urlencoded({ extended: true }));

for(let [route, panel] of Object.entries(utilsPanels)) {
    admin.use("/" + route, handleCustomPanel(route, panel));
}

// admin.use(passport.initialize());
// need to initialize and session in the same file

admin.all("/check", (req, res) => {
    res.json({server: "adminpanel"});
});

admin.all("/pid", (req, res) => {
    res.json({pid: process.pid});
});

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

function authNamespace(namespace) {
    socketio_auth(namespace, socket_auth);
    return namespace;
}

function start() {
    privileges.drop();

    let server = admin.listen(8080, () => {
        logger.info("Admin server started.");
    });

    let io = require('socket.io')(server);
    require("./socket_controllers/v1/docker_socket").initializeNamespace(authNamespace(io.of("/v1/docker")));
    require("./socket_controllers/v1/projects_socket").initializeNamespace(authNamespace(io.of("/v1/projects")));
    require("./socket_controllers/v1/logs_socket").initializeNamespace(authNamespace(io.of("/v1/logs")));

    if(process.env.ENABLE_HTTPS.toLowerCase() == "true") greenlock_manager.init();
}

start();