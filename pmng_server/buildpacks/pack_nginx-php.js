const BasePHPBuildpack = require("./base/base_php");

class NginxPHPBuildpack extends BasePHPBuildpack {
    static build(projectname, utils, logger) {
        logger("Using NGINX/PHP7 server type.");
        super.build(projectname, utils, logger);
    }
}

module.exports = NginxPHPBuildpack;