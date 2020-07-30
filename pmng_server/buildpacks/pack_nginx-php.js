const BasePHPBuildpack = require("./base/base_php");

class NginxPHPBuildpack extends BasePHPBuildpack {
    static build(projectname, deployFolder, logger) {
        logger("Using NGINX/PHP7 server type.");
        super.build(projectname, deployFolder, logger);
    }
}

module.exports = NginxPHPBuildpack;