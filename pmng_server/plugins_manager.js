let loadedPlugins = {};
function getPlugin(plugin) {
    if(!loadedPlugins.hasOwnProperty(plugin)) {
        loadedPlugins[plugin] = require("./plugins/plugin_" + plugin);
    }

    return loadedPlugins[plugin];
}

function getDefaultConfig(plugin) {
    return getPlugin(plugin).getDefaultConfig();
}

function install(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).installPlugin(projectname, pluginconfig);
}

function uninstall(plugin, projectname, pluginconfig) {
    return getPlugin(plugin).uninstallPlugin(projectname, pluginconfig);
}


module.exports.getDefaultConfig = getDefaultConfig;
module.exports.install = install;
module.exports.uninstall = uninstall;
module.exports.getPlugin = getPlugin;