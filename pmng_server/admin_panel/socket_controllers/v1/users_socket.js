
const intercom = require("../../../intercom/intercom_client").connect();

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
                socket.join("users_list");
                socket.emit("setup", {error: false, message: "Socket setup."});
            } else socket.emit("setup", {error: true, message: "Insufficient permissions."});
        });
    });

    intercom.subscribe(["usersevents"], (message) => {
        let event = message.event, user = message.user;
        switch(event) {
            case "add":
            case "remove":
                namespace.to("users_list").emit("user_action", {action: event, user});
                break;
        }
    });
}

module.exports.initializeNamespace = initializeNamespace;