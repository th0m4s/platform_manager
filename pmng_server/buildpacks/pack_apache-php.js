const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static build(projectName, projectData, utils, logger) {
        logger("Using Apache2/PHP7 server type.");
        super.build(projectName, projectData, utils, logger);
    }
}

module.exports = ApachePHPBuildpack;