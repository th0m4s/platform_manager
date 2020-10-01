const express = require('express'), router = express.Router();
const database_server = require("../../database_server");
const mail_manager = require("../../mails/mail_manager");

router.all("*", async function(req, res, next) {
    if(!(await database_server.isInstalled())) {
        req.flash("warn", "Please install the platform first.");
        res.redirect("/panel/login/install");
    } else if(req.user === undefined) {
        req.flash("warn", "Please login to access this page.");
        res.redirect("/panel/login");
    } else next();
});

router.get("/setPasswords", async (req, res) => {
    if(req.session.account.mailsNeedPwd === true) {
        res.locals.emails = await mail_manager.getMailDatabase("virtual_users").whereIn("projectname", function () {
            this.where("ownerid", req.user.id).select("name").from(database_server.DB_NAME + ".projects");
        }).andWhere("pwdset", "false").select(["id", "email"]);

        req.setAllHeader(false);
        req.setPage(res, "Missing passwords", "mails", "passwords");
        res.render("mails/passwords");
    } else res.redirect("/panel/mails");
});

router.get("/", (req, res) => {
    res.redirect("/panel/mails/domains");
});

router.get("/domains", (req, res) => {
    res.send("notdoneyet");
});

router.get("/users", (req, res) => {
    res.send("notdoneyet");
});


router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/mails/domains");});
module.exports = router;