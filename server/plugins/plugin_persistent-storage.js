const project_manager = require("../project_manager");
const pfs = require("fs").promises;
const rmfr = require("rmfr");

function startPlugin(projectname, containerconfig, network, plugincontainer, pluginconfig) {
    
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