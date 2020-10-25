const intercom = require("../../../intercom/intercom_client").connect();

let currentPIDs = {};
function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            if(socket.hasAccess("SYSTEM")) {
                setup = true;
                socket.join("usage_" + message.proc);
                socket.emit("setup", {error: false, message: "Socket setup."});

                for(let entry of Object.entries(currentPIDs))
                    socket.emit("pid", {pid: entry[0], id: entry[1]});
            } else {
                socket.emit("setup", {error: true, message: "Insufficient permissions."});
            }
        });
    });

    intercom.subscribe(["pid"], (message) => {
        currentPIDs[message.pid] = message.id;
        namespace.to("usage_all").emit("pid", message);
        namespace.to("usage_" + message.id).emit("pid", message);
    });

    intercom.send("req_pid", {});
    intercom.subscribe(["stats"], (message) => {
        let id = currentPIDs[message.pid];
        if(id != undefined) {
            message.id = id;
            namespace.to("usage_all").emit("usage", message);
            namespace.to("usage_" + id).emit("usage", message);
        }
    });
}

module.exports.initializeNamespace = initializeNamespace;