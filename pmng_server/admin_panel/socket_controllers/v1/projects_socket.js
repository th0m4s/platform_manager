const docker_manager = require("../../../docker_manager");
const project_manager = require("../../../project_manager");

function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        socket.on("listen_project", async (projectMessage) => {
            let projectName = projectMessage.project;
            if(await project_manager.projectExists(projectName)) {
                try {
                    await project_manager.canAccessProject(projectName, socket.user.id, "view");
                    socket.join("project_" + projectName);
                } catch(error) {
                    socket.emit("error_message", {message: "Cannot attach to the project " + projectName + ": " + error.message});
                }
            } else socket.emit("error_message", {message: "Cannot find the requested project " + projectName + "."});
        });
    });

    docker_manager.registerEvents((eventData) => {
        if(eventData.Type == "container") {
            switch(eventData.Action) {
                case "start":
                    if(eventData.Actor.Attributes["pmng.containertype"] == "project") {
                        let projectName = eventData.Actor.Attributes["pmng.projectname"];
                        namespace.to("project_" + projectName).emit("project_action", {action: "start", project: projectName});
                    }
                    break;
                case "die": // not "stop", see docker_socket
                    if(eventData.Actor.Attributes["pmng.containertype"] == "project") {
                        let projectName = eventData.Actor.Attributes["pmng.projectname"];
                        namespace.to("project_" + projectName).emit("project_action", {action: "stop", project: projectName});
                    }
                    break;
            }
        }
    });
}

module.exports.initializeNamespace = initializeNamespace;