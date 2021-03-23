const docker_manager = require("../../../docker_manager");
const project_manager = require("../../../project_manager");
const database_server = require("../../../database_server");
const crypto = require("crypto");

allExecsPid = {};

function pidReceived(execId, pid) {
    if(allExecsPid[execId] != undefined && allExecsPid[execId] <= 1 && pid > 1)
        allExecsPid[execId] = pid;
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

        await exec.resize({
            h: rows, w: cols
        });
    };
    
    let onData = (msg) => {
        stream.write(msg);
    };

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

            default:
                socket.emit("terminal_error", {message: "Unknown exec type."});
                return;
        }

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

        let onExit = (code) => {
            socket.emit("exit", code);
            onDisconnect();
        };
        
        let onDisconnect = async () => {
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

    socket.on("terminal", onTerminal);
}

// based on npm gritty package (https://github.com/cloudcmd/gritty)
function initializeNamespace(namespace) {
    namespace.on("connection", handleConnection);
}

module.exports.initializeNamespace = initializeNamespace;
module.exports.pidReceived = pidReceived;