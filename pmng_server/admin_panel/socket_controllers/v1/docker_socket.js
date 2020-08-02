const docker_manager = require("../../../docker_manager");

function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            if(socket.hasAccess("DOCKER")) {
                setup = true;
                switch(message.type) {
                    case "networks":
                        socket.join("list_networks");
                        break;
                    case "containers":
                        socket.join("list_containers");
                        break;
                    default:
                        setup = false;
                        socket.emit("setup", {error: true, message: "Invalid socket type."});
                        break;
                }

                if(setup) {
                    socket.emit("setup", {error: false, message: "Socket setup."});
                }
            } else {
                socket.emit("setup", {error: true, message: "Insufficient permissions."});
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
            break;
        case "die": // stop only send if specifically stopped via api
            namespace.to("list_containers").emit("container_action", {action: "remove", item: eventData.Actor.Attributes.name});
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