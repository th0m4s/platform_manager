const express = require('express'), router = express.Router();
const docker_manager = require("../../../docker_manager");
const api_auth = require("./api_auth");
const logger = require("../../../platform_logger").logger();
const database_server = require("../../../database_server");

router.get("/containers/running", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "docker")) {
            docker_manager.getRunningContainers().then((containers) => {
                res.json({error: false, code: 200, containers: containers});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: error});
            });
        } else res.status(403).json({error: true, code: 403, message: "Unauthorized: Invalid user scope."});
    });
});

router.get("/containers/details/:reference", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "docker")) {
            docker_manager.getContainerDetails(req.params.reference).then((details) => {
                res.json({error: false, code: 200, details: details});
            }).catch((error) => {
                if(error.statusCode == 404) {
                    res.status(404).json({error: true, code: 404, message: "No such container."});
                } else res.status(500).json({error: true, code: 500, message: error});
            });
        } else res.status(403).json({error: true, code: 403, message: "Unauthorized: Invalid user scope."});
    });
});

router.get("/networks/list", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "docker")) {
            docker_manager.listNetworks().then((networks) => {
                res.json({error: false, code: 200, networks: networks});
            }).catch((error) => {
                res.status(500).json({error: true, code: 500, message: error});
            });
        } else res.status(403).json({error: true, code: 403, message: "Unauthorized: Invalid user scope."});
    });
});

router.get("/networks/details/:reference", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "docker")) {
            docker_manager.getNetworkDetails(req.params.reference).then((details) => {
                res.json({error: false, code: 200, details: details});
            }).catch((error) => {
                if(error.statusCode == 404) {
                    res.status(404).json({error: true, code: 404, message: "No such network."});
                } else res.status(500).json({error: true, code: 500, message: error});
            });
        } else res.status(403).json({error: true, code: 403, message: "Unauthorized: Invalid user scope."});
    });
});

module.exports = router;