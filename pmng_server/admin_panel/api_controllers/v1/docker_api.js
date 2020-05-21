const express = require('express'), router = express.Router();
const docker_manager = require("../../../docker_manager");
const api_auth = require("./api_auth");
const logger = require("../../../platform_logger").logger();

router.get("/running", (req, res) => {
    api_auth(req, res, function(user) {
        docker_manager.getRunningContainers().then((containers) => {
            res.json({error: false, code: 200, containers: containers});
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: error});
        });
    });
});

module.exports = router;