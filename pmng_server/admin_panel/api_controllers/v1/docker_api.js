const express = require('express'), router = express.Router();
const docker_manager = require("../../../docker_manager");
const api_auth = require("./api_auth");
const logger = require("../../../platform_logger").logger();

router.get("/running", (req, res) => {
    api_auth(req, res, function(user) {
        return docker_manager.getRunningContainers().then((containers) => {
            res.json({error: false, code: 200, containers: containers});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: error});
        });
    });
});

router.get("/details/:nameOrId", (req, res) => {
    api_auth(req, res, function(user) {
        return docker_manager.getContainerDetails(req.params.nameOrId).then((details) => {
            res.json({error: false, code: 200, details: details});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: error});
        });
    });
});

module.exports = router;