const express = require('express'), router = express.Router();
const api_auth = require("./api_auth");
const mail_manager = require("../../../mails/mail_manager");
const unixcrypt = require("unixcrypt");

router.post("/setPasswords", (req, res) => {
    api_auth(req, res, async function(user) {
        let encrypted = req.body.encrypted === true, p = (_p) => (encrypted ? _p : unixcrypt.encrypt(_p));
        let passwords = req.body.passwords;

        if(passwords.length > 0) {
            try {
                let ids = (await mail_manager.getUserMissingPasswords(user.id, user.scope, false)).map((r) => r.id), error = undefined;
                for(let {id} of passwords) {
                    if(!ids.includes(parseInt(id))) {
                        error = id;
                        break;
                    }
                }

                if(error !== undefined) res.status(403).json({error: true, code: 403, message: "Invalid email id given: " + error});
                else {
                    let mailDb = mail_manager.getMailDatabase(), prom = [];
                    for(let {id, password} of passwords) {
                        prom.push(mailDb("virtual_users").where("id", id).update({pwdset: "true", password: p(password)}));
                    }

                    await Promise.all(prom);
                    res.status(200).json({error: false, code: 200, message: "Mail passwords saved."});
                }
            } catch(error) {
                res.status(500).json({error: true, code: 500, message: "Cannot save passwords: " + error});
            }
        } else res.status(400).json({error: true, code: 400, message: "Bad Request: No passwords."});
    });
});

module.exports = router;