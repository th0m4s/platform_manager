let loadedPlugins = {};
function getPlugin(plugin) {
    if(!loadedPlugins.hasOwnProperty(plugin)) {
        try {
            loadedPlugins[plugin] = require("./plugins/plugin_" + plugin);
        } catch(error) {
            loadedPlugins[plugin] = {defaultConfig: {}};
        }
    }

    return loadedPlugins[plugin];
}

function getDefaultConfig(plugin) {
    return getPlugin(plugin).defaultConfig;
}


module.exports.getDefaultConfig = getDefaultConfig;
module.exports.getPlugin = getPlugin;