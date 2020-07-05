const base_php = require("./base/base_php");

async function build(projectname, deployFolder, logger) {
    logger("Using NGINX/PHP7 server type.");
    return base_php.build(projectname, deployFolder, logger);
}

module.exports.build = build;