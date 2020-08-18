const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger, hasAddons) {
        logger("Using Apache2/PHP7 server type.");
        return super.build(projectName, projectData, utils, logger, hasAddons);
    }
}

module.exports = ApachePHPBuildpack;