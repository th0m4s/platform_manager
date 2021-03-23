const logger = require("../platform_logger").logger();
const express = require("express"), admin = express(), containerCom = express();
const intercom = require("../intercom/intercom_client").connect();
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");
const privileges = require("../privileges");
const socket_auth = require("./socket_controllers/socket_auth");
const socketio_auth = require("socketio-auth");
const fs = require("fs");
const child_process = require("child_process");
const got = require("got");
const panelRouter = require("./panel_router");

function handleCustomPanel(route, panel) {
    return (req, res, next) => {
        if(req.originalUrl == "/" + route) res.redirect("/" + route + "/");
        else panel.handleRequest(req, res, next);
    };
}

// not declared in panel_router because custom panels can modify this
let headerLinks = {
    dashboard: {
        name: "Dashboard",
        type: "link",
        link: "/panel/dashboard",
        active: ["home"],
        allHeader: false,
        access: true
    },
    projects: {
        name: "Projects",
        type: "list",
        active: ["projects"],
        allHeader: true,
        access: true,
        list: {
            list: {
                name: "List projects",
                link: "/panel/projects/list",
                active: ["projects", "list"]
            },
            create: {
                name: "Create a project",
                link: "/panel/projects/create",
                active: ["projects", "create"]
            }
        }
    },
    mails: {
        name: "Mails",
        type: "list",
        active: ["mails"],
        allHeader: true,
        access: true,
        list: {
            users: {
                name: "Users and aliases",
                link: "/panel/mails/users",
                active: ["mails", "users"]
            },
            domains: {
                name: "Domains",
                link: "/panel/mails/domains",
                active: ["mails", "domains"]
            }
        }
    },
    docker: {
        name: "Docker",
        type: "list",
        active: ["docker"],
        allHeader: true,
        access: "docker",
        list: {
            containers: {
                name: "List containers",
                link: "/panel/docker/containers/list",
                active: ["docker", "containers"]
            },
            networks: {
                name: "List networks",
                link: "/panel/docker/networks/list",
                active: ["docker", "networks"]
            }
        }
    },
    processes: {
        name: "Processes",
        type: "link",
        link: "/panel/processes",
        active: ["processes", "usage"],
        allHeader: true,
        access: "system"
    },
    users: {
        name: "Users",
        type: "list",
        active: ["users"],
        allHeader: true,
        access: "admin",
        list: {
            list: {
                name: "List users",
                link: "/panel/users/all",
                active: ["users", "all"]
            },
            create: {
                name: "Create a user",
                link: "/panel/users/create",
                active: ["users", "create"]
            }
        }
    }
};


const favicon = path.join(__dirname, "static", "images", "favicon.ico");

function authNamespace(namespace) {
    socketio_auth(namespace, socket_auth);
    return namespace;
}

async function start() {
    // need to create container com server as root
    containerCom.listen(path.resolve(process.env.CONTAINERUTILS_MOUNT_PATH, "container_com.sock"), () => {
        logger.info("Container com server started.");
    });

    privileges.drop();

    for(let name of fs.readdirSync(path.resolve(__dirname, "custom_panels"))) {
        let fullpath = path.resolve(__dirname, "custom_panels", name);
        let stat = fs.statSync(fullpath);
    
        if(stat.isDirectory()) {
            for(let file of fs.readdirSync(fullpath)) {
                if(file.startsWith("panel_")) {
                    let panel = require(path.resolve(fullpath, file.replace(".js", "")));
                    let route = panel.route();
    
                    if(route != undefined) {
                        if(await panel.startPanel(panelRouter)) {
                            let copyLinks = Object.assign({}, headerLinks);
                            panel.setHeaderLinks(copyLinks);
                            if(copyLinks != undefined) headerLinks = copyLinks;

                            admin.use("/" + route, handleCustomPanel(route, panel));
                        }
                        
                        break;
                    }
                }
            }
        }
    }
    
    admin.set('view engine', 'ejs');
    admin.set('views', path.join(__dirname, '/views'));
    admin.set('etag', false);
    
    // admin.use(passport.initialize());
    // need to initialize and session in the same file
    
    admin.all("/check", (req, res) => {
        res.json({server: "adminpanel"});
    });
    
    admin.all("/pid", (req, res) => {
        res.json({pid: process.pid});
    });
    
    admin.use("/static", express.static(path.join(__dirname, "static", "dist")));


    admin.get("/favicon.ico", function(req, res) {
        res.sendFile(favicon);
    });
    
    admin.use("/api", require("./api_router"));
    admin.use("/panel", panelRouter.getRouter(headerLinks));
    
    admin.all("/", function(req, res) {
        res.redirect("/panel");
    });

    let server = admin.listen(8080, () => {
        logger.info("Admin server started.");
    });

    let io = require('socket.io')(server);
    require("./socket_controllers/v1/docker_socket").initializeNamespace(authNamespace(io.of("/v1/docker")));
    require("./socket_controllers/v1/projects_socket").initializeNamespace(authNamespace(io.of("/v1/projects")));
    require("./socket_controllers/v1/logs_socket").initializeNamespace(authNamespace(io.of("/v1/logs")));
    require("./socket_controllers/v1/users_socket").initializeNamespace(authNamespace(io.of("/v1/users")));
    require("./socket_controllers/v1/processes_socket").initializeNamespace(authNamespace(io.of("/v1/processes")));

    const exec_socket = require("./socket_controllers/v1/exec_socket");
    exec_socket.initializeNamespace(authNamespace(io.of("/v1/exec")));

    containerCom.get("/exec/:execId/:pid", (req, res) => {
        let execId = req.params.execId;
        let pid = parseInt(req.params.pid);

        console.log("received", execId, pid);
    
        if(!isNaN(pid)) exec_socket.pidReceived(execId, pid);
        res.end();
    });

    intercom.send("dockermng", {command: "analyzeRunning"});
    if(process.env.ENABLE_HTTPS.toLowerCase() == "true") greenlock_manager.init();
}

start();