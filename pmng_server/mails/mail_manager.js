const database_server = require("../database_server");
const docker_manager = require("../docker_manager");
const string_utils = require("../string_utils");
const regex_utils = require("../regex_utils");
const subprocess_util = require("../subprocess_util");
const Knex = require("knex");
const path = require("path");
const pfs = require("fs").promises;
const mdb = require('knex-mariadb');
const logger = require("../platform_logger").logger();
const unixcrypt = require("unixcrypt");
const ejs = require("ejs");
const intercom = require("../intercom/intercom_client").connect();
const nodemailer = require("nodemailer");

let _mailKnex = undefined;
const MAIL_DBNAME = "mail_server";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN;
function getMailDatabase(table) {
    if(_mailKnex == undefined) {
        let config = Object.assign({}, database_server.DB_CONFIG);
        config.database = MAIL_DBNAME;

        _mailKnex = Knex({
            client: mdb,
            connection: config 
        });
    }

    return table == undefined ? _mailKnex : _mailKnex(table);
}

async function mailDatabaseUpgrader(newVersion) {
    let mailKnex = getMailDatabase();

    switch(newVersion) {
        case 1:
            await database_server.createTableIfNotExists("virtual_domains", (domains) => {
                domains.increments("id").primary().index().notNullable();
                domains.string("name", 50).notNullable();
                domains.string("projectname", 32).nullable();
                domains.integer("cdomainid", 10).nullable().unsigned();
                domains.enum("system", ["true", "false"]).defaultTo("false");
                domains.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
                domains.foreign("cdomainid").references("id").inTable(database_server.DB_NAME + ".domains").onDelete("CASCADE").onUpdate("SET NULL");
            }, mailKnex);

            await Promise.all([
                database_server.createTableIfNotExists("virtual_users", (users) => {
                    users.increments("id").primary().index().notNullable();
                    users.integer("domain_id", 10).unsigned().notNullable();
                    users.string("password", 106).notNullable();
                    users.string("email", 100).notNullable().unique();
                    users.string("projectname", 32).nullable();
                    users.string("quota", 16).defaultTo("100M").notNullable();
                    users.enum("system", ["true", "false"]).defaultTo("false");
                    users.enum("pwdset", ["true", "false"]).defaultTo("true"); // should manually set to false when auto-creating mail users
                    users.string("sso_decrypt", 24);
                    users.string("sso_encrypt", 106);
                    users.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
                    users.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
                }, mailKnex),
                database_server.createTableIfNotExists("virtual_aliases", (aliases) => {
                    aliases.increments("id").primary().index().notNullable();
                    aliases.integer("domain_id", 10).unsigned().notNullable();
                    aliases.string("source", 100).notNullable()/*.unique()*/;
                    aliases.string("destination", 100).notNullable();
                    aliases.string("projectname", 32).nullable();
                    aliases.enum("system", ["true", "false"]).defaultTo("false");
                    aliases.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
                    aliases.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
                }, mailKnex)]);
            break;
    }
}

let installing = false;
const LAST_MAIL_DB_VERSION = 1;
async function upgradeMailDatabaseIfNeeded() {
    if(installing) throw new Error("Already installing/upgrading mail server...");
    installing = true;
    let updateStatus = await database_server.installDatabase("mail", LAST_MAIL_DB_VERSION, mailDatabaseUpgrader);
    installing = false;

    if(updateStatus) {
        logger.tag("MAIL", "Mail installation completed.");
    } else {
        logger.tagError("MAIL", "Mail installation failed.");
        throw new Error("Cannot install or update mail database!");
    }
}

// checks for default system accounts
async function checkDomainIdUsers(domainId) {
    let tableName = undefined, mailDb = (tn) => getMailDatabase()(tn || tableName);
    let mailDomainResult = await mailDb("virtual_domains").where("id", domainId).select(["name", "system"]);
    if(mailDomainResult.length == 0) throw "Invalid domain id.";

    let isSystem = mailDomainResult[0].system.toLowerCase() == "true";
    tableName = "virtual_" + (isSystem ? "users" : "aliases");
    let domain = mailDomainResult[0].name;

    let projectName = "";
    if(!isSystem) {
        let projectNameResult = await database_server.database("domains").where("domain", domain).select("projectname");
        if(projectNameResult.length == 0) throw "Invalid domain bound to project (" + domain + ").";
        projectName = projectNameResult[0].projectname;
    } else if(domain != ROOT_DOMAIN) projectName = domain.substring(0, domain.length-ROOT_DOMAIN.length-1);

    let usersResults = await mailDb().where("domain_id", domainId).select("*"), selectKey = isSystem ? "email" : "source";
    let inserts = [], proms = [], requiredMails = ["abuse", "postmaster", "webmaster", "hostmaster"];
    if(domain == ROOT_DOMAIN) requiredMails.push("pmng");
    for(let result of usersResults) {
        let name = result[selectKey].split("@")[0];
        if(requiredMails.includes(name)) {
            requiredMails.splice(requiredMails.indexOf(name), 1);
            let mailIsSystem = result.system.toLowerCase() == "true", updates = {};
            if(!mailIsSystem) updates.system = "true";
            let reqMail = name + "@" + (projectName == "" ? "" : projectName + ".") + ROOT_DOMAIN;
            if(!isSystem) {
                if(result.destination != reqMail) updates.destination = reqMail;
            } else if(result.email != reqMail) {
                updates.email = reqMail;
            }

            if(Object.keys(updates).length > 0) proms.push(mailDb().where("id", result.id).update(updates));
        }
    }

    for(let remainingName of requiredMails) {
        let mail = remainingName + "@" + (projectName == "" ? "" : projectName + ".") + ROOT_DOMAIN;
        let ssoPassword = string_utils.generatePassword(16, 24), ssoEncrypt = cryptPassword(ssoPassword);
        if(isSystem && remainingName == "pmng") inserts.push({system: "true", pwdset: "true", email: mail, password: cryptPassword(string_utils.generatePassword(16, 24)), domain_id: domainId, projectName: undefined, sso_decrypt: ssoPassword, sso_encrypt: ssoEncrypt});
        else if(isSystem) inserts.push({system: "true", pwdset: "false", email: mail, password: cryptPassword(string_utils.generatePassword(16, 24)), domain_id: domainId, projectName: projectName == "" ? undefined : projectName, sso_decrypt: ssoPassword, sso_encrypt: ssoEncrypt});
        else inserts.push({system: "true", domain_id: domainId, source: remainingName + "@" + domain, destination: mail, projectName: projectName == "" ? undefined : projectName});
    }
    
    return Promise.all(proms.concat(mailDb().insert(inserts)));
}

function getMailContainer() {
    return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=server", "pmng.server=mails"]}}).then((containers) => {
        return containers?.[0] ?? null;
    });
}

const server_version = "24"; // |   like panel_pma to restart container when config is changed
const forceRestart = process.env.NODE_ENV == "development";
function checkAndStart(maildirectory, shouldRestart) {
    return getMailContainer().then(async (container) => {
        if(container == null || shouldRestart || container.data.Labels["pmng.serverversion"] != server_version) {
            await container?.stop();
            await docker_manager.ensureImageExists("pmng/server-mail", "file:" + path.resolve(__dirname, "..", "docker_images", "mails", "alpine-mailer"), {latest: true, adminLogs: true});

            // convert historical save folder
            let vhostsDirectory = path.resolve(maildirectory, "vhosts");
            let pfSpool = path.resolve(maildirectory, "postfixSpool");
            let shouldConvert = true;
            try {
                await pfs.access(vhostsDirectory);
                shouldConvert = false;
            } catch(not_found) { }

            if(shouldConvert) {
                logger.tag("MAIL", "Converting save folder...");
                await intercom.sendPromise("rootProcessor", {command: "mailManager", action: "convert", paths: {maildirectory, vhostsDirectory, pfSpool}});
                logger.tag("MAIL", "Mail folder converted.");
            }

            let Binds = [vhostsDirectory + ":/var/mail/vhosts", pfSpool + ":/var/spool/postfix", path.resolve(maildirectory, "logs") + ":/var/log"];
            // SQL MAIL USER

            let mailSqlUser = "mailuser", mailSqlPassword = string_utils.generatePassword(16, 24);
            await database_server.database.raw("GRANT SELECT ON `" + MAIL_DBNAME + "`.* TO '" + mailSqlUser + "'@'%' IDENTIFIED BY '" + mailSqlPassword + "';");
            let sqlHosts = (process.env.DB_MODE == "socket" ? "unix:/var/spool/postfix/var/run/mysqld/mysqld.sock" : (process.env.DB_HOST + (parseInt(process.env.DB_PORT) != 3306 ? ":" + process.env.DB_PORT : "")));
            let sqlReplaceArgs = {__DBMAIL_USER: mailSqlUser, __DBMAIL_PASS: mailSqlPassword, __DBMAIL_NAME: MAIL_DBNAME, __DBMAIL_HOST: sqlHosts};
            if(sqlHosts.startsWith("unix:")) Binds.push(process.env.DB_SOCKET + ":/var/spool/postfix/var/run/mysqld/mysqld.sock");

            // POSTFIX
            let postfixDefaultDir = path.resolve(__dirname, "configurations", "postfix"), enableSSL = process.env.ENABLE_HTTPS.toLowerCase() == "true";
            // main.cf
            let postfixMainConfig = string_utils.keepConfigLines(await pfs.readFile(path.resolve(postfixDefaultDir, "main.defaults.cf"), "utf-8"), enableSSL ? ["tlsonly"] : ["notls"], enableSSL ? ["notls"] : ["tlsonly"]);
            let pfMainArgs = {__ROOT_DOMAIN: ROOT_DOMAIN};
            if(enableSSL) {
                pfMainArgs.__TLS_FULLCHAIN = "/var/spool/postfix/fullchain.pem";
                pfMainArgs.__TLS_PRIVKEY = "/var/spool/postfix/privkey.pem";

                Binds.push(path.join(__dirname, "../https/greenlock.d/live/" + ROOT_DOMAIN + "/fullchain.pem") + ":/var/spool/postfix/fullchain.pem:ro");
                Binds.push(path.join(__dirname, "../https/greenlock.d/live/" + ROOT_DOMAIN + "/privkey.pem") + ":/var/spool/postfix/privkey.pem:ro");
            }
            postfixMainConfig = string_utils.replaceArgs(postfixMainConfig, pfMainArgs);
            let pfMainIncFile = path.resolve(postfixDefaultDir, "main.inc.cf");
            await pfs.writeFile(pfMainIncFile, postfixMainConfig);
            Binds.push(pfMainIncFile + ":/etc/postfix/main.cf");

            let pfSqlFiles = ["mysql-virtual-mailbox-domains", "mysql-virtual-mailbox-maps", "mysql-virtual-alias-maps", "mysql-virtual-email2email", "mysql-smtpd-sender-login-maps"];
            for(let pfSqlFile of pfSqlFiles) {
                let sqlFileConfig = await pfs.readFile(path.resolve(postfixDefaultDir, pfSqlFile + ".defaults.cf"), "utf-8");
                sqlFileConfig = string_utils.replaceArgs(sqlFileConfig, sqlReplaceArgs);
                let pfSqlIncFile = path.resolve(postfixDefaultDir, pfSqlFile + ".inc.cf");
                await pfs.writeFile(pfSqlIncFile, sqlFileConfig);
                Binds.push(pfSqlIncFile + ":/etc/postfix/" + pfSqlFile + ".cf");
            }

            // master.cf
            let postfixMasterConfig = string_utils.keepConfigLines(await pfs.readFile(path.resolve(postfixDefaultDir, "master.defaults.cf"), "utf-8"), enableSSL ? ["tlsonly"] : [""], enableSSL ? [""] : ["tlsonly"]);
            let pfMasterIncFile = path.resolve(postfixDefaultDir, "master.inc.cf");
            await pfs.writeFile(pfMasterIncFile, postfixMasterConfig);
            Binds.push(pfMasterIncFile + ":/etc/postfix/master.cf");


            // DOVECOT
            let dovecotDefaultDir = path.resolve(__dirname, "configurations", "dovecot");
            let dvFiles = ["dovecot.defaults.conf", "conf.d/10-mail.defaults.conf", "conf.d/10-auth.defaults.conf", "conf.d/10-master.defaults.conf", "conf.d/10-ssl.defaults.conf", "conf.d/auth-sql.defaults.conf.ext", "dovecot-sql.defaults.conf.ext", "dovecot-sql-sso.defaults.conf.ext", "dovecot-sql-users.defaults.conf.ext", "conf.d/20-imap.defaults.conf", "conf.d/20-pop3.defaults.conf", "conf.d/15-lda.defaults.conf", "conf.d/90-quota.defaults.conf"/*, "dovecot-sql-expire.defaults.conf.ext"*/];
            let dvConfig = Object.assign({}, pfMainArgs, sqlReplaceArgs);
            if(sqlHosts.startsWith("unix:")) dvConfig.__DBMAIL_HOST = "/var/spool/postfix/var/run/mysqld/mysqld.sock";

            for(let dvFile of dvFiles) {
                let dvFileConfig = await pfs.readFile(path.resolve(dovecotDefaultDir, path.basename(dvFile)), "utf-8");
                dvFileConfig = string_utils.replaceArgs(dvFileConfig, dvConfig);
                dvFileConfig = string_utils.keepConfigLines(dvFileConfig, enableSSL ? ["tlsonly"] : ["notls"], enableSSL ? ["notls"] : ["tlsonly"]);
                let dvIncFile = path.resolve(dovecotDefaultDir, path.basename(dvFile).replace(".defaults", ".inc"));
                await pfs.writeFile(dvIncFile, dvFileConfig);
                Binds.push(dvIncFile + ":/etc/dovecot/" + dvFile.replace(".defaults", ""));
            }

            let portBindings = {"25/tcp": [{HostPort: "25"}]};
            // normally 25 is not encrypted and should not be available if enableSSL is true
            if(enableSSL) {
                portBindings["993/tcp"] = [{HostPort: "993"}];
                portBindings["995/tcp"] = [{HostPort: "995"}];
                portBindings["587/tcp"] = [{HostPort: "587"}];
                portBindings["465/tcp"] = [{HostPort: "465"}];
            } else {
                portBindings["143/tcp"] = [{HostPort: "143"}];
                portBindings["110/tcp"] = [{HostPort: "110"}];
            }

            await docker_manager.docker.container.create({
                Image: "pmng/server-mail",
                Hostname: "mailserver",
                name: "pmng_server_mails",
                Labels: {
                    "pmng.containertype": "server",
                    "pmng.server": "mails",
                    "pmng.serverversion": server_version
                },
                StopTimeout: 2,
                ExposedPorts: Object.fromEntries(Object.entries(portBindings).map((pb) => {pb[1] = {}; return pb;})),
                HostConfig: {
                    PortBindings: portBindings,
                    AutoRemove: true,
                    NetworkMode: "bridge",
                    Binds
                }
            }).then((container) => {
                return container.start();
            }).then(async () => {
                logger.tag("MAIL", "Mail server container started.");
                let mailDb = getMailDatabase(), mailDomainsDb = () => mailDb("virtual_domains");
                // mailDomainsDb is a function because each request needs a different object

                // check all virtual_domains
                logger.tag("MAIL", "Checking virtual domains...");
                let allDomains = regex_utils.OTHER_DOMAINS.slice();
                allDomains.push(ROOT_DOMAIN);
                await mailDomainsDb().whereIn("name", allDomains).select("*").then((result) => {
                    /*if(result.length == 0) return mailDomainsDb().insert({name: ROOT_DOMAIN, system: "true"});
                    else if(result[0].system != "true") return mailDomainsDb().where("name", ROOT_DOMAIN).update({system: "true"});*/

                    let waitDomains = [];

                    for(let line of result) {
                        if(line.system != "true") waitDomains.push(mailDomainsDb().where("name", line.name).update({system: "true"}));
                        let domainIndex = allDomains.indexOf(line.name);
                        if(domainIndex >= 0) allDomains.splice(domainIndex, 1); 
                    }

                    for(let domain of allDomains) {
                        waitDomains.push(mailDomainsDb().insert({name: domain, system: "true"}));
                    }

                    return Promise.all(waitDomains);
                });

                let requiredDomains = {};
                await database_server.database("projects").select(["name", "id"]).then((projects) => {
                    for(let project of projects)
                        requiredDomains[project.name + "." + ROOT_DOMAIN] = {system: true, projectname: project.name, cdomainid: null};
                });

                // if full_dns == false, sending will work, but not receiving unless mx records are set correctly
                await database_server.database("domains")/*.where("full_dns", "true")*/.select(["domain", "projectname", "id"]).then((domains) => {
                    for(let domain of domains)
                        requiredDomains[domain.domain] = {system: false, projectname: domain.projectname, cdomainid: domain.id};
                });

                // select doesn't need "*" if there is no where() (else it crashes because the query builder asks for 'select *,* from...')
                await mailDomainsDb().select().then((domains) => {
                    let prom = [];
                    for(let {id, name, system, projectname, cdomainid} of domains) {
                        let requiredDomain = requiredDomains[name];
                        if(requiredDomain == undefined) {
                            if(name != ROOT_DOMAIN) prom.push(mailDomainsDb().where("name", name).delete());
                        } else {
                            system = system.toLowerCase() == "true";
                            let domUpdates = {};
                            if(requiredDomain.system != system)
                                domUpdates.system = requiredDomain.system ? "true" : "false";
                            
                            if(requiredDomain.projectname != projectname)
                                domUpdates.projectname = requiredDomain.projectname;

                            if(requiredDomain.cdomainid != cdomainid)
                                domUpdates.cdomainid = requiredDomain.cdomainid;

                            if(Object.keys(domUpdates).length > 0) prom.push(mailDomainsDb().where("name", name).update(domUpdates));
                            delete requiredDomains[name];
                        }
                    }

                    return Promise.all(prom);
                });

                let newRows = [];
                for(let [domain, requiredDomain] of Object.entries(requiredDomains))
                    newRows.push({name: domain, system: requiredDomain.system ? "true" : "false", projectname: requiredDomain.projectname, cdomainid: requiredDomain.cdomainid});
                if(newRows.length > 0) await mailDomainsDb().insert(newRows);

                let requiredDomainIds = []; // refetch domains because new ones were inserted, others deleted
                // TODO: don't do a refetch (difficult because need new ids)
                await mailDomainsDb().select().then((domains) => {
                    requiredDomainIds = domains.map((domain) => domain.id);
                });


                // check all virtual_users
                logger.tag("MAIL", "Checking virtual users and aliases...");
                let usersProm = [];
                for(let domainId of requiredDomainIds)
                    usersProm.push(checkDomainIdUsers(domainId));
                await Promise.all(usersProm);
                logger.tag("MAIL", "Mail ready!");
            }).catch((error) => {
                logger.tagError("MAIL", "Cannot start mail server container." + (error.message ?? error));
                throw error;
            });
        }
    });
}

function addProjectDomain(projectname) {
    let mailsDb = getMailDatabase();
    return mailsDb("virtual_domains").insert({name: projectname + "." + ROOT_DOMAIN, projectname, cdomainid: null, system: "true"}).then(() => {
        return mailsDb("virtual_domains").where("projectname", projectname).select("id");
    }).then((results) => {
        if(results.length != 1) throw "Invalid new project domain id.";
        return checkDomainIdUsers(results[0].id);
    });
}

function addCustomDomain(projectname, custom_domain, cdomainid) {
    let mailsDb = getMailDatabase();
    return mailsDb("virtual_domains").insert({name: custom_domain, projectname, cdomainid, system: "false"}).then(() => {
        return mailsDb("virtual_domains").where("name", custom_domain).select("id");
    }).then((results) => {
        if(results.length != 1) throw "Invalid custom mail domain id.";
        return checkDomainIdUsers(results[0].id);
    });
}

function knexProjectnameSelector(userId, adminOrScope, manage = true) {
    if(typeof adminOrScope == "number") adminOrScope = database_server.checkScope(adminOrScope, "ADMIN");

    return function() {
        if(adminOrScope == false) {
            this.whereIn("projectname", function () {
                this.where("ownerid", userId).select("name").from(database_server.DB_NAME + ".projects");
            });
        
            this.orWhereIn("projectname", function() {
                this.where("userid", userId);
                if(manage == true) this.andWhere("mode", "manage");
                this.select("projectname").from(database_server.DB_NAME + ".collabs");
            });
        }
    };
}

function getUserMissingPasswords(userId, userScope = 99, count = false) {
    let queryBuilder = getMailDatabase("virtual_users").where(knexProjectnameSelector(userId, userScope, true)).andWhere("pwdset", "false");
    return count ? queryBuilder.count("* as count").then((x) => x[0].count) : queryBuilder.select(["id", "email"]);
}

function cryptPassword(password) {
    return unixcrypt.encrypt(password);
}

async function initialize(maildirectory) {
    await database_server.database.raw("SHOW DATABASES;").then((results) => {
        let dbs = [];
        for(let result of results[0])
            dbs.push(result.Database);

        if(!dbs.includes(MAIL_DBNAME)) return database_server.database.raw("CREATE DATABASE `" + MAIL_DBNAME + "`;");
    });

    if(!(await database_server.checkVersion("mail", LAST_MAIL_DB_VERSION)))
        await upgradeMailDatabaseIfNeeded();

    subprocess_util.fakeFork("mails_server", () => {
        return getMailContainer().then((container) => {
            return container != null;
        });
    }, async () => {
        await checkAndStart(maildirectory, true);
    });

    return checkAndStart(maildirectory, forceRestart);
}

function sendClientMail(to, subject, template, locals = {}) {
    let enableSec = process.env.ENABLE_HTTPS.toLowerCase() == "true", sender = "pmng@" + ROOT_DOMAIN;
    locals = Object.assign({copyright: "<a href='http" + (enableSec ? "s" : "") + "://admin." + ROOT_DOMAIN + "/'>© 2020-2022 Platform Manager</a>"}, locals);
    return pfs.readFile(path.resolve(__dirname, "templates", "dist", template + ".ejs"), "utf-8").then((templateContents) => {
        return ejs.render(templateContents, locals, {async: true});
    }).then((renderedTemplate) => {
        return pfs.readFile(path.resolve(__dirname, "templates", "plain", template + ".txt"), "utf-8").then((plain) => {
            return ejs.render(plain, locals, {async: true});
        }).then((renderedPlain) => {
            return {renderedPlain, renderedTemplate};
        });
    }).then(({renderedTemplate, renderedPlain}) => {
        return getMailDatabase("virtual_users").where("email", sender).select("sso_decrypt").then((result) => {return {ssoDec: result[0].sso_decrypt, renderedTemplate, renderedPlain}});
    }).then(({ssoDec, renderedTemplate, renderedPlain}) => {
        let transport = nodemailer.createTransport({
            host: "mail." + ROOT_DOMAIN,
            port: enableSec ? 465 : 25,
            secure: enableSec,
            auth: {
                user: sender,
                pass: ssoDec
            }
         });

         return transport.sendMail({from: '"Platform Manager" <' + sender + '>', to: locals.fullname != undefined ? ('"' + locals.fullname + '" <' + to + '>') : to, subject, text: renderedPlain, html: renderedTemplate});
    }).catch((error) => {
        throw "Cannot send mail: " + error;
    });
}


module.exports.MAIL_DBNAME = MAIL_DBNAME;
module.exports.getMailDatabase = getMailDatabase;
module.exports.checkDomainIdUsers = checkDomainIdUsers;
module.exports.cryptPassword = cryptPassword;
module.exports.getUserMissingPasswords = getUserMissingPasswords;
module.exports.addProjectDomain = addProjectDomain;
module.exports.addCustomDomain = addCustomDomain;
module.exports.knexProjectnameSelector = knexProjectnameSelector;
module.exports.initialize = initialize;
module.exports.sendClientMail = sendClientMail;
