const privileges = require("../privileges");

async function startSecondaryWebServers() {
    await require("./ftp_server/ftp_server").start();
    privileges.drop();

    require("./error_panel/error_server").start();
    require("./git_server").start();
}


if(require.main === module) {
    startSecondaryWebServers();
}