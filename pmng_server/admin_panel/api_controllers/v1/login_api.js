const express = require('express'), router = express.Router();
const database_server = require("../../../database_server");
const api_auth = require("./api_auth");

router.post("/", async function(req, res) {
    let user = req.body.user, password = req.body.password;
    if(user == undefined || password == undefined) {
        res.status(400).json({error: true, code: 400, message: "Please provide user and password."});
    } else {
        try {
            let userObj = await database_server.findUserByName(user);
            if(userObj == null) {
                res.status(403).json({error: true, code: 403, message: "Invalid user."});
            } else {
                let check = await database_server.comparePassword(userObj.id, password);
                if(check) {
                    let key = await database_server.generateKey(userObj.id, "api");
                    res.status(200).json({error: true, code: 200, message: "Logged in.", key: key});
                } else res.status(403).json({error: true, code: 403, message: "Invalid password."});
            }
        } catch(e) {
            res.status(500).json({error: true, code: 500, message: "Server error: Cannot generate the key.", error: e});
        }
    }
});

router.delete("/", function(req, res) {
    api_auth(req, res, function(user) {
        database_server.revokeKey(user.key).then(() => {      
            res.status(200).json({error: false, code: 200, message: "Key successfully disabled."});
        }).catch(() => {
            res.status(500).json({error: true, code: 500, message: "Unable to revoke key."});
        });
    });
});


module.exports = router;