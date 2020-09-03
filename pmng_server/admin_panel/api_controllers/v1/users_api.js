const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const api_auth = require("./api_auth");

router.get("/exists/:username", (req, res) => {
    api_auth(req, res, function(user) {
        database_server.findUserId(req.params.username).then((id) => {
            res.status(200).json({error: false, code: 200, message: "User found", exists: true, id});
        }).catch((err) => {
            res.status(200).json({error: false, code: 200, message: "User not found.", exists: false});
        });
    });
});

module.exports = router;