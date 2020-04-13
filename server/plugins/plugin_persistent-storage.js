const project_manager = require("../project_manager");
const pfs = require("fs").promises;
const rmfr = require("rmfr");

// not using volumes, just binding a directory from host to container
function startPlugin(projectname, containerconfig, network, plugincontainer, pluginconfig) {
    containerconfig.HostConfig.Binds = [project_manager.getProjectStorage(projectname) + ":/var/storage"];
    return containerconfig;
}

function installPlugin(projectname, pluginconfig) {
    return pfs.mkdir(project_manager.getProjectStorage(projectname));
}

function uninstallPlugin(projectname, pluginconfig) {
    return rmfr(project_manager.getProjectStorage(projectname));
}


module.exports.startPlugin = startPlugin;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;

module.exports.defaultConfig = {};