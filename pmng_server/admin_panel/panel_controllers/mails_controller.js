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
        res.locals.emails = await mail_manager.getUserMissingPasswords(req.user.id, req.user.scope, false);
        if(res.locals.emails.length == 0) {
            delete req.session.account.mailsNeedPwd;
            res.redirect("/panel/dashboard");
        } else {
            req.setAllHeader(false);
            req.setPage(res, "Missing mail passwords", "mails", "passwords");
            res.render("mails/passwords");
        }
    } else res.redirect("/panel/mails");
});

router.get("/", (req, res) => {
    res.redirect("/panel/mails/users");
});

router.get("/domains", async (req, res) => {
    res.locals.domains = await mail_manager.getMailDatabase("virtual_domains").where(mail_manager.knexProjectnameSelector(req.user.id, req.user.scope, true)).select("*");

    req.setPage(res, "Mail domains", "mails", "domains");
    res.render("mails/domains");
});

router.get("/users", async (req, res) => {
    let selector = mail_manager.knexProjectnameSelector(req.user.id, req.user.scope, true);
    res.locals.users = (await mail_manager.getMailDatabase("virtual_users").where(selector).select(["id", "domain_id", "email", "projectname", "system"])).map((x) => {x.system = x.system == "true"; return x;});
    res.locals.aliases = (await mail_manager.getMailDatabase("virtual_aliases").where(selector).select(["id", "domain_id", "source", "destination", "projectname", "system"])).map((x) => {x.system = x.system == "true"; return x;});

    req.setPage(res, "Mail users and aliases", "mails", "users");
    res.render("mails/users");
});

router.get("/aliases", (req, res) => {
    res.redirect("/panel/mails/users#aliases");
});

function getDomainsList(req) {
    return mail_manager.getMailDatabase("virtual_domains").where(mail_manager.knexProjectnameSelector(req.user.id, req.user.scope, true)).select(["id", "name"]);
}

router.get("/users/create", async (req, res) => {
    req.setPage(res, "Create a new mail user", "mails", "create_user");
    res.locals.domains = await getDomainsList(req);
    res.render("mails/manage_user");
});

router.get("/users/edit/:mailid", (req, res) => {
    let mailid = parseInt(req.params.mailid);
    if(isNaN(mailid)) {
        res.redirect("/panel/mails/users");
    } else {
        mail_manager.getMailDatabase("virtual_users").where("id", mailid).andWhere(mail_manager.knexProjectnameSelector(req.user.id, req.user.scope, true)).select(["id", "domain_id", "quota", "projectname", "email"]).then(async (mailResult) => {
            if(mailResult.length == 0) {
                req.flash("warning", "Invalid mail id.");
                res.redirect("/panel/mails/users");
            } else {
                req.setPage(res, "Edit a mail user", "mails", "edit_user");
                res.locals.domains = await getDomainsList(req);
                res.locals.edit = mailResult[0];
                res.render("mails/manage_user");
            }
        });
    }
});

router.all("/*", function(req, res) {req.flash("warning", "This page doesn't exist."); res.redirect("/panel/mails/users");});
module.exports = router;