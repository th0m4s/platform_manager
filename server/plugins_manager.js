const defaultConfigs = {

};

function getDefaultConfig(plugin) {
    return (defaultConfigs.hasOwnProperty(plugin) ? defaultConfigs[plugin] : {});
}


module.exports.getDefaultConfig = getDefaultConfig;