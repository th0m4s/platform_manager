
function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            if(socket.hasAccess("admin")) {
                setup = true;
                if(setup) {
                    socket.emit("setup", {error: false, message: "Socket setup."});
                }
            } else {
                socket.emit("setup", {error: true, message: "Insufficient permissions."});
            }
        });
    });
}

module.exports.initializeNamespace = initializeNamespace;