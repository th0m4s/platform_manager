const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger, hasAddons) {
        logger("Using Apache2/PHP7 server type.");
        return super.build(projectName, projectData, utils, logger, hasAddons);
    }

    static async imageDetails(projectData) {
        return super._imageDetails("pmng/apache2-php7");
    }
}

module.exports = ApachePHPBuildpack;