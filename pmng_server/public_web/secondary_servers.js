function startSecondaryWebServers() {
    require("../error_panel/error_server").start();
    require("../git_server").start();
}


if(require.main === module) {
    startSecondaryWebServers();
}