const BasePHPBuildpack = require("./base/base_php");

class NginxPHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger) {
        logger("Using NGINX/PHP7 server type.");
        super.build(projectName, projectData, utils, logger);
    }
}

module.exports = NginxPHPBuildpack;