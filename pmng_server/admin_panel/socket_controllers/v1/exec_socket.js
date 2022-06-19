const docker_manager = require("../../../docker_manager");
const project_manager = require("../../../project_manager");
const database_server = require("../../../database_server");
const mail_manager = require("../../../mails/mail_manager");
const intercom = require("../../../intercom/intercom_client").connect();
const crypto = require("crypto");
const pty = require("node-pty");

allExecsPid = {};

function pidReceived(execId, pid) {
    if(allExecsPid[execId] != undefined && allExecsPid[execId] <= 1 && pid > 1)
        allExecsPid[execId] = pid;
}

let systemShells = {};

let allowSystemShell = (shellId) => {
    if(systemShells[shellId] != undefined && systemShells[shellId].systemAllowed != true) {
        systemShells[shellId].systemAllowed = true;
        systemShells[shellId].emit("correct_system_code", {});
        return true;
    }

    return false;
}

const systemTimeoutMinutes = 10;

function startSystemTimeout(shellId, seconds) {
    setTimeout(() => {
        if(systemShells[shellId] != undefined) {
            systemShells[shellId].systemAllowed = false;
            systemShells[shellId].emit("system_timeout", {});
            systemShells[shellId].disconnect();
            delete systemShells[shellId];
        }
    }, seconds * 1000);
}

function handleConnection(socket) {
    let containerExec = undefined;
    let exec = undefined;
    let stream = undefined;

    let onResize = async (size) => {
        size = size || {};
        
        let {
            cols = 80,
            rows = 25,
        } = size;

        if(socket.execType == "system_shell") {
            exec.resize(cols, rows);
        } else {
            await exec.resize({
                h: rows, w: cols
            });
        }
    };
    
    let onData = (msg) => {
        stream.write(msg);
    };

    let onRequestTerminal = (params) => {
        switch(params.execType) {
            case "system_shell":
                if(!database_server.checkScope(socket.user.scope, "system")) {
                    socket.emit("terminal_error", {message: "Not enough permissions."});
                    return;
                }

                let shellId = crypto.randomBytes(16).toString("hex");
                systemShells[shellId] = socket;
                socket.systemAllowed = false;
                socket.shellId = shellId;
                
                let allowCode = crypto.randomBytes(4).toString("hex").toUpperCase();
                socket.allowCode = allowCode;
                
                if(process.env.SHOW_SYSTEMSHELL_CODES_IN_CONSOLE?.toLowerCase() == "true")
                    console.log("Shell request allow code: " + allowCode + " (shellId: " + shellId + ")");

                let mailLinksStart = "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/panel/system/shell/";
                mail_manager.sendClientMail(socket.user.email, "Platform Manager - System shell request", "hostshell_request", {allowCode,
                    username: socket.user.username,
                    ipaddress: socket.request.headers["x-forwarded-for"] ?? socket.request.connection.remoteAddress,
                    fullname: socket.user.fullname,
                    lifetime: systemTimeoutMinutes + " minutes",
                    allowcode: allowCode,
                    allowlink: mailLinksStart + "allow/" + shellId + "/" + allowCode,
                    denylink: mailLinksStart + "deny/" + shellId
                }).catch((error) => {
                    socket.emit("terminal_error", {message: "Cannot send request mail: " + (error.message ?? error)});
                });
                
                let simpleOnDisconnect = () => {
                    socket.removeListener("disconnect", simpleOnDisconnect);

                    delete systemShells[shellId];
                }

                socket.on("disconnect", simpleOnDisconnect);
                break;
            default:
                socket.emit("terminal_error", {message: "Unknown exec type."});
                return;
        }
    }

    let onTerminal = async (params) => {
        if(stream != undefined) {
            socket.emit("terminal_error", {message: "A terminal already exists for this connection!"});
            return;
        }

        params = params || {};
        let {
            rows,
            cols,
        } = params;

        let containerName = undefined;
        socket.execType = params.execType;

        switch(params.execType) {
            case "project":
                let projectName = params.name;

                if(!(await project_manager.canAccessProject(projectName, socket.user.id, true))) {
                    socket.emit("terminal_error", {message: "Project not found or not enough permissions."});
                    return;
                }
        
                if(!(await docker_manager.isProjectContainerRunning(projectName))) {
                    socket.emit("terminal_error", {message: "The project is not running."});
                    return;
                }

                containerName = docker_manager.getProjectMainContainer(projectName);
                break;

            case "container":
                containerName = params.name;

                if(!database_server.checkScope(socket.user.scope, "docker")) {
                    socket.emit("terminal_error", {message: "Not enough permissions."});
                    return;
                }

                if(!(await docker_manager.isContainerRunning(containerName))) {
                    socket.emit("terminal_error", {message: "The container is not running."});
                    return;
                }

                break;

            case "system_shell":
                if(!(socket.systemAllowed === true)) {
                    socket.emit("terminal_error", {message: "Access denied."});
                    return;
                }
                break;

            default:
                socket.emit("terminal_error", {message: "Unknown exec type."});
                return;
        }

        if(params.execType == "system_shell") {
            exec = pty.spawn("bash", [], {
                name: "xterm-color",
                cols: cols,
                rows: rows,
                cwd: process.env.HOME,
                encoding: "utf8"
            });

            startSystemTimeout(socket.shellId, 60 * systemTimeoutMinutes);
            stream = exec;
        } else {
            if(containerName == undefined) {
                socket.emit("terminal_error", {message: "Unexpected error: Invalid container after checks."});
                return;
            }

            let execId = crypto.randomBytes(4).toString("hex");

            if(containerExec == undefined) {
                containerExec = docker_manager.docker.container.get(containerName).exec;
            }

            if(exec == undefined) {
                exec = await containerExec.create({
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    User: "root",
                    Tty: true,
                    WorkingDir: "/",
                    Cmd: ["/bin/bash", "-c", "/var/run/exec.sh " + execId + " /bin/bash"]
                });
            }
            
            allExecsPid[execId] = 0;

            stream = await exec.start({
                Detach: false,
                Tty: true,
                stdin: true
            });

            await new Promise((resolve) => setTimeout(resolve, 200));

            await exec.resize({
                h: rows, w: cols
            });
        }

        let onExit = (code) => {
            socket.emit("exit", code);
            onDisconnect();
        };
        
        let onDisconnect = async () => {
            if(params.execType == "system_shell") {
                exec.kill(9);
            } else {
                stream.removeListener("end", onExit);
                stream.destroy();

                let pid = allExecsPid[execId];

                if(pid > 1) {
                    // we will run an other exec as a kill
                    let killExec = await containerExec.create({
                        AttachStdin: false,
                        AttachStdout: true,
                        AttachStderr: true,
                        User: "root",
                        Tty: false,
                        WorkingDir: "/",
                        Cmd: ["pkill", "-9", "-P", pid.toString()]
                    });

                    await killExec.start({
                        Detach: false
                    });
                }

                delete allExecsPid[execId];
            }
            
            socket.removeListener("resize", onResize);
            socket.removeListener("data", onData);
            socket.removeListener("terminal", onTerminal);
            socket.removeListener("disconnect", onDisconnect);
        };
        
        stream.on("data", (data) => {
            socket.emit("data", data.toString("utf-8"));
        });
        
        stream.on("end", onExit);
        
        socket.on("data", onData);
        socket.on("resize", onResize);
        socket.on("disconnect", onDisconnect);
    }

    let onCheckCode = (message) => {
        if(message.code == undefined || message.code.trim() == "") {
            socket.emit("terminal_error", {message: "Code not provided."});
            return;
        }

        if(message.code == socket.allowCode) {
            allowSystemShell(socket.shellId);
        } else {
            if(socket.invalidTries == undefined) socket.invalidTries = 0;
            socket.invalidTries++;
            socket.emit("terminal_error", {message: "Invalid code."});

            if(socket.invalidTries >= 3) {
                socket.emit("too_many_invalid_tries", {});
                socket.disconnect();
            }

        }
    }

    socket.on("terminal", onTerminal);
    socket.on("request_terminal", onRequestTerminal);
    socket.on("check_code", onCheckCode);
}

// based on npm gritty package (https://github.com/cloudcmd/gritty)
function initializeNamespace(namespace) {
    namespace.on("connection", handleConnection);

    intercom.subscribe(["system_shell_request"], (message, respond) => {
        let shellId = message.shellId;

        if(shellId == undefined) {
            respond({error: true, message: "No shell id provided."});
        } else {
            switch(message.type) {
                case "deny":
                    if(systemShells[shellId] != undefined) {
                        systemShells[shellId].emit("request_denied", {});
                        systemShells[shellId].disconnect();
                        delete systemShells[shellId];
                        respond({error: false, message: "System shell denied."});
                    } else {
                        respond({error: true, message: "Shell request not found."});
                    }
                case "allow":
                    if(systemShells[shellId] != undefined) {
                        if(systemShells[shellId].allowCode != message.allowCode) {
                            respond({error: true, message: "Invalid allow code."});
                        } else {
                            if(systemShells[shellId].systemAllowed === true) {
                                respond({error: true, message: "System shell already allowed."});
                            } else {
                                if(allowSystemShell(shellId)) {
                                    respond({error: false, message: "Shell request allowed."});
                                } else {
                                    respond({error: true, message: "Shell request not found or already allowed."});
                                }
                            }
                        }
                    }
                    break;
                default:
                    respond({error: true, message: "Unknown action."});
                    break;
            }
        }
    });
}

module.exports.initializeNamespace = initializeNamespace;
module.exports.pidReceived = pidReceived;