const docker_manager = require("../../../docker_manager");

function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            // todo allow non docker scope if stats with owned project container
            if(socket.hasAccess("DOCKER")) {
                setup = true;
                switch(message.type) {
                    case "networks":
                        socket.join("list_networks");
                        break;
                    case "containers":
                        socket.join("list_containers");
                        break;
                    case "stats":
                        let container = (message.container || "").trim();
                        if(container.length == 0) {
                            setup = false;
                            socket.emit("setup", {error: true, message: "Invalid container name."});
                        } else setupStats(namespace, socket, container);
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

function setupStats(namespace, socket, containerName) {
    docker_manager.docker.container.get(containerName).status().then((container) => {
        if(currentStats[containerName] == undefined) currentStats[containerName] = 0;
        currentStats[containerName]++;

        if(currentStats[containerName] == 1) {
            // first stats attach
            container.stats().then((stats) => {
                stats.on("data", (statsData) => {
                    statsData = JSON.parse(statsData.toString("utf-8"));
                    
                    let mem_max = statsData.memory_stats.limit;
                    let mem_used = statsData.memory_stats.usage - statsData.memory_stats.stats.cache;
                    // mem_perc is calculated on the client

                    let cpu_delta = statsData.cpu_stats.cpu_usage.total_usage -  statsData.precpu_stats.cpu_usage.total_usage;
                    let system_cpu_delta = statsData.cpu_stats.system_cpu_usage - statsData.precpu_stats.system_cpu_usage;
                    let cpu_usage = (isNaN(cpu_delta) || isNaN(system_cpu_delta)) ? 0 : cpu_delta / system_cpu_delta * 100.0;

                    let net_tx = 0, net_rx = 0;
                    for(let net of Object.values(statsData.networks)) {
                        net_tx += net.tx_bytes;
                        net_rx += net.rx_bytes;
                    }

                    namespace.to("docker_stats_" + containerName).emit("stats", {mem_max, mem_used, cpu_usage, net: {tx: net_tx, rx: net_rx}});
                });

                stats.on("close", () => {
                    namespace.to("docker_stats_" + containerName).emit("stats_error", {stopped: true, message: "Container stopped!"});
                });

                stats.on("error", (error) => {
                    delete currentStats[containerName];
                    namespace.to("docker_stats_" + containerName).emit("stats_error", {stopped: false, message: "Stats stream error: " + error});
                });
            }).catch((error) => {
                delete currentStats[containerName];
                namespace.to("docker_stats_" + containerName).emit("stats_error", {stopped: false, message: "Cannot attach to a stats stream: " + error});
            });
        }

        socket.join("docker_stats_" + containerName);
        socket.on("disconnect", () => {
            currentStats[containerName]--;
            if(currentStats[containerName] == 0) {
                delete currentStats[containerName];
            }
        });
    }).catch((error) => {
        if(error.statusCode == 404) socket.emit("stats_error", {message: "Invalid container."});
        else socket.emit("stats_error", {message: "Cannot get container stats: " + error});
        // the page should also redirects because the refresh api will also respond with an error
    });
}

let currentStats = {};

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