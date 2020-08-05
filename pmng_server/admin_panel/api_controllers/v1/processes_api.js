const express = require('express'), router = express.Router();
const api_auth = require("./api_auth");
const database_server = require("../../../database_server");
const intercom = require("../../../intercom/intercom_client").connect();

router.get("/restart/:subp_id", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            intercom.sendPromise("subprocesses", {id: req.params.subp_id, command: "restart"}, {
                autoReject: true, autoResolve: false
            }).then((response) => {
                res.json(response);
            }).catch((error) => {
                res.json({error: true, message: error});
            });
        } else res.json({error: true, code: 403, message: "Unauthorized: Invalid user scope."});
    });
});

router.get("/check/:subp_id", (req, res) => {
    api_auth(req, res, function(user) {
        if(database_server.checkScope(user.scope, "admin")) {
            intercom.sendPromise("subprocesses", {id: req.params.subp_id, command: "check"}, {
                autoReject: true, autoResolve: false
            }).then((response) => {
                res.json(response);
            }).catch((error) => {
                res.json({error: true, message: error});
            })
        } else res.json({error: true, code: 403, message: "Unauthorized: Invalid user scope.", running: false});
    });
});

module.exports = router;