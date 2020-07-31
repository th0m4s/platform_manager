const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static build(projectname, utils, logger) {
        logger("Using Apache2/PHP7 server type.");
        super.build(projectname, utils, logger);
    }
}

module.exports = ApachePHPBuildpack;