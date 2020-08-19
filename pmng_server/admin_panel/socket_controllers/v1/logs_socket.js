const Tail = require("tail").Tail;
const path = require("path");
const project_manager = require("../../../project_manager");

let projectTails = {};

function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        socket.on("project_logs", async (projectMessage) => {
            let projectName = projectMessage.project;
            if(await project_manager.projectExists(projectName)) {
                try {
                    await project_manager.canAccessProject(projectName, socket.user.id, false);
                    joinProjectLogs(namespace, socket, projectName);
                } catch(error) {
                    socket.emit("error_message", {message: "Cannot attach to the project " + projectName + ": " + error.message});
                }
            } else socket.emit("error_message", {message: "Cannot find the requested project " + projectName + "."});
        });

        socket.on("disconnect", () => {
            for(let room of Object.keys(socket.rooms)) {
                if(room.startsWith("project_logs_")) {
                    let project = room.substring(13);
                    projectTails[project].count--;
                    if(projectTails[project].count == 0) projectTails[project].tail.unwatch();
                }
            }
        });
    });
}

function joinProjectLogs(namespace, socket, project) {
    if(projectTails[project] == undefined) {
        let tail = new Tail(path.resolve(project_manager.getProjectLogsFolder(project), "project.log"), {follow: true});
        tail.on("error", (error) => {
            namespace.to("projects_logs_" + project).emit("log_error", {error});
        });

        tail.on("line", (line) => {
            namespace.to("project_logs_" + project).emit("project_log", {line});
        });

        projectTails[project] = {
            count: -1,
            tail
        }
    }

    let actualCount = projectTails[project].count;
    if(actualCount == -1) {
        projectTails[project].count = 0;
    } else if(actualCount == 0) {
        projectTails[project].tail.watch();
    }

    projectTails[project].count++;
    socket.emit("logs_start_position", {position: projectTails[project].tail.pos});
    socket.join("project_logs_" + project);
}

module.exports.initializeNamespace = initializeNamespace;