const passport = require('passport');

module.exports = function(req, res, success) {
    passport.authenticate("headerapikey", function(err, user, info) {
        if(err != null) res.json({error: true, code: 500, message: "Server error during authentification: " + err});
        else if(info !== undefined) res.json({error: true, code: 403, message: "Missing key."});
        else if(user === false) res.json({error: true, code: 403, message: "Invalid key."});
        else if(success !== undefined) {
            try {
                success(user);
            } catch(err) {
                res.json({error: true, code: 500, message: "Server error during processing of auth callback: " + err});
            }
        }
    })(req, res, undefined);
}