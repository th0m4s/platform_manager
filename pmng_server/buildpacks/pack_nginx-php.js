const BasePHPBuildpack = require("./base/base_php");

class NginxPHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger, hasAddons) {
        logger("Using NGINX/PHP7 server type.");
        return super.build(projectName, projectData, utils, logger, hasAddons);
    }
}

module.exports = NginxPHPBuildpack;