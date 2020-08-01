const database_server = require("../../database_server");

module.exports = {
    authenticate: (socket, data, callback) => {
        database_server.findUserByKey(data.key).then((user) => {
            if(user !== null) {
                user.key = data.key;
                socket.hasAccess = (scopeString) => {
                    return database_server.checkScope(user.scope, scopeString)
                };
                socket.user = user;
                callback(null, true);
            } else callback(null, false);
        }).catch(callback);
    }
}