const docker_manager = require("../../../docker_manager");
const database_server = require("../../../database_server");
const project_manager = require("../../../project_manager");

function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            setup = true;
            switch(message.type) {
                case "projects_list":
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
                    break;
                case "networks":
                    if(socket.hasAccess("DOCKER")) {
                        socket.join("list_networks");
                    } else {
                        setup = false;
                        socket.emit("setup", {error: true, message: "Insufficient permissions."});
                    }
                    break;
                case "containers":
                    if(socket.hasAccess("DOCKER")) {
                        socket.join("list_containers");
                    } else {
                        setup = false;
                        socket.emit("setup", {error: true, message: "Insufficient permissions."});
                    }
                    break;
                default:
                    setup = false;
                    socket.emit("setup", {error: true, message: "Invalid socket type."});
                    break;
            }

            if(setup) {
                socket.emit("setup", {error: false, message: "Socket setup."});
            }
        });
    });

    docker_manager.registerEvents((eventData) => {
        switch(eventData.Type) {
            case "container":
                processContainerAction(namespace, eventData);
                break;
            case "network":
                processNetworkAction(namespace, eventData);
                break;
        }
    });
}

function processContainerAction(namespace, eventData) {
    switch(eventData.Action) {
        case "start":
            namespace.to("list_containers").emit("container_action", {action: "add", item: docker_manager.sortContainer(eventData.id, eventData.Actor.Attributes.name || "", eventData.Actor.Attributes, eventData.Actor.Attributes.image)})
            if(eventData.Actor.Attributes["pmng.containertype"] == "project") {
                let projectName = eventData.Actor.Attributes["pmng.projectname"];
                namespace.to("project_" + projectName).emit("project_action", {action: "start", project: projectName});
            }
            break;
        case "die": // stop only send if specifically stopped via api
            namespace.to("list_containers").emit("container_action", {action: "remove", item: eventData.Actor.Attributes.name});
            if(eventData.Actor.Attributes["pmng.containertype"] == "project") {
                let projectName = eventData.Actor.Attributes["pmng.projectname"];
                namespace.to("project_" + projectName).emit("project_action", {action: "stop", project: projectName});
            }
            break;
    }
}

function processNetworkAction(namespace, eventData) {
    // also connect and disconnect for details
    switch(eventData.Action) {
        case "create":
            namespace.to("list_networks").emit("network_action", {action: "add", item: {networkId: eventData.Actor.ID, name: eventData.Actor.Attributes.name}});
            break;
        case "destroy": // remove? only destroy is sent
            namespace.to("list_networks").emit("network_action", {action: "remove", item: eventData.Actor.Attributes.name});
            break;
    }
}


module.exports.initializeNamespace = initializeNamespace;