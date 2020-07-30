const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static build(projectname, deployFolder, logger) {
        logger("Using Apache2/PHP7 server type.");
        super.build(projectname, deployFolder, logger);
    }
}

module.exports = ApachePHPBuildpack;