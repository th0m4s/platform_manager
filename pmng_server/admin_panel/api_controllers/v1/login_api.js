const express = require('express'), router = express.Router();
const login_utils = require("../../login_utils");
const database_server = require("../../../database_server");
const api_auth = require("./api_auth");

router.get("/version", (req, res) => {
    res.json({error: false, cli_version: process.env.CLI_VERSION});
});

router.post("/", async function(req, res) {
    let username = req.body.user, password = req.body.password;
    if(username == undefined || password == undefined) {
        res.status(400).json({error: true, code: 400, message: "Please provide user and password."});
    } else {
        try {
            let {auth, user, tries, retryIn} = await login_utils.loginUser(username, password, "api");
            if(auth === true) {
                res.status(200).json({error: false, code: 200, message: "Logged in.", key: user.key});
            } else if(tries > 0) {
                res.status(403).json({error: true, code: 403, message: "Invalid credentials." + (tries <= 3 ? " " + tries + " attempt" + (tries == 1 ? "" : "s") + " remaining." : "")});
            } else {
                let retryText = retryIn > 60 ? Math.ceil(retryIn/60) + " minutes" : (retryIn == 1 ? "1 second" : retryIn + " seconds");
                res.status(429).json({error: true, code: 429, message: "Too many invalid login attempts. Please try again in " + retryText + ".", retryIn});
            }
        } catch(error) {
            res.status(500).json({error: true, code: 500, message: "Server error while login.", error});
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

router.post("/passwordReset", async (req, res) => {
    let hash = (req.body.hash || "").trim(), password = (req.body.password || "").trim();
    if(hash.length == 0 || password.length == 0) {
        res.status(400).json({error: true, code: 400, message: "Invalid parameters."});
    } else {
        database_server.database("password_resets").where("hash", hash).andWhere("used_at", null).select("user_id").then((checkResults) => {
            if(checkResults.length == 0) {
                res.status(403).json({error: true, code: 403, message: "Invalid reset hash (maybe it has expired)."});
            } else {
                let userid = checkResults[0].user_id;
                database_server.hashPassword(password).then((hashedPassword) => {
                    return database_server.database("users").where("id", userid).update({password: hashedPassword});
                }).then(() => {
                    return Promise.all([database_server.database("password_resets").where("hash", hash).update({used_at: database_server.database.fn.now()}),
                        database_server.database("password_resets").where("user_id", userid).andWhere("used_at", null).andWhereNot("hash", hash).update({used_at: 0})]); // clear other active links
                }).then(() => {
                    res.status(200).json({error: false, code: 200, message: "Password updated."});
                }).catch((error) => {
                    res.status(500).json({error: true, code: 500, message: "Cannot update user password: " + error});
                });
            }
        }).catch((error) => {
            res.status(500).json({error: true, code: 500, message: "Cannot check existing reset hash: " + error});
        });
    }
});


module.exports = router;