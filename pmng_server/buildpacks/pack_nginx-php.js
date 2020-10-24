const BasePHPBuildpack = require("./base/base_php");

class NginxPHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger, hasAddons) {
        logger("Using NGINX/PHP7 server type.");
        return super.build(projectName, projectData, utils, logger, hasAddons);
    }
    
    static async imageDetails(projectData) {
        return super._imageDetails("pmng/nginx-php7");
    }
}

module.exports = NginxPHPBuildpack;