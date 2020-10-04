const database_server = require("../database_server");
const docker_manager = require("../docker_manager");
const string_utils = require("../string_utils");
const Knex = require("knex");
const path = require("path");
const pfs = require("fs").promises;
const mdb = require('knex-mariadb');
const logger = require("../platform_logger").logger();
const unixcrypt = require("unixcrypt");

let _mailKnex = undefined;
const MAIL_DBNAME = "mail_server";
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

function _mailDbInstalled() {
    let mailKnex = getMailDatabase();
    if(mailKnex == undefined) return Promise.resolve(false);
    return Promise.all([
        mailKnex.schema.hasTable("virtual_domains"), mailKnex.schema.hasTable("virtual_users"), mailKnex.schema.hasTable("virtual_aliases")]).then((results) => {
        return !results.includes(false) ? true : undefined;
    }).catch(() => { return false; });
}

function isMailInstalled() {
    return _mailDbInstalled().then((result) => {
        installedCached = result;
        return result;
    });
}

let installedCached = false;
function isMailInstalledCache() {
    return installedCached;
}

let installing = false;
function installMailDatabase() {
    if(installing) return Promise.reject("Already installing mail server...");
    installing = true;

    return isMailInstalled().then((installed) => {
        if(installed) throw "Mail server already installed.";

        logger.tag("MAIL", "Starting mail server installation...");
        
        let mailKnex = getMailDatabase();
        return database_server.createTableIfNotExists("virtual_domains", (domains) => {
            domains.increments("id").primary().index().notNullable();
            domains.string("name", 50).notNullable();
            domains.string("projectname", 32).nullable();
            domains.integer("cdomainid", 10).nullable().unsigned();
            domains.enum("system", ["true", "false"]).defaultTo("false");
            domains.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
            domains.foreign("cdomainid").references("id").inTable(database_server.DB_NAME + ".domains").onDelete("CASCADE").onUpdate("SET NULL");
        }, mailKnex).then(() => {
            return Promise.all([
                database_server.createTableIfNotExists("virtual_users", (users) => {
                    users.increments("id").primary().index().notNullable();
                    users.integer("domain_id", 10).unsigned().notNullable();
                    users.string("password", 106).notNullable();
                    users.string("email", 100).notNullable().unique();
                    users.string("projectname", 32).nullable();
                    users.enum("system", ["true", "false"]).defaultTo("false");
                    users.enum("pwdset", ["true", "false"]).defaultTo("true"); // should manually set to false when auto-creating mail users
                    users.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
                    users.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
                }, mailKnex).then(() => {
                    return true;
                }),
                database_server.createTableIfNotExists("virtual_aliases", (aliases) => {
                    aliases.increments("id").primary().index().notNullable();
                    aliases.integer("domain_id", 10).unsigned().notNullable();
                    aliases.string("source", 100).notNullable()/*.unique()*/;
                    aliases.string("destination", 100).notNullable();
                    aliases.string("projectname", 32).nullable();
                    aliases.enum("system", ["true", "false"]).defaultTo("false");
                    aliases.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
                    aliases.foreign("projectname").references("name").inTable(database_server.DB_NAME + ".projects").onDelete("CASCADE").onUpdate("SET NULL");
                }, mailKnex).then(() => {
                    return true;
                })
            ]).then((results) => {
                if(results.includes(false)) throw "Cannot install databases.";
            });
        }).then(() => {
            installedCached = true;
            logger.tag("MAIL", "Mail installation completed.");
        }).catch((error) => {
            logger.tagError("MAIL", "Mail installation failed: " + error);
            throw error;
        });
    });
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
    } else if(domain != process.env.ROOT_DOMAIN) projectName = domain.substring(0, domain.length-process.env.ROOT_DOMAIN.length-1);

    let usersResults = await mailDb().where("domain_id", domainId).select("*"), selectKey = isSystem ? "email" : "source";
    let inserts = [], proms = [], requiredMails = ["abuse", "postmaster", "webmaster", "hostmaster"];
    for(let result of usersResults) {
        let name = result[selectKey].split("@")[0];
        if(requiredMails.includes(name)) {
            requiredMails.splice(requiredMails.indexOf(name), 1);
            let mailIsSystem = result.system.toLowerCase() == "true", updates = {};
            if(!mailIsSystem) updates.system = "true";
            let reqMail = name + "@" + (projectName == "" ? "" : projectName + ".") + process.env.ROOT_DOMAIN;
            if(!isSystem) {
                if(result.destination != reqMail) updates.destination = reqMail;
            } else if(result.email != reqMail) {
                updates.email = reqMail;
            }

            if(Object.keys(updates).length > 0) proms.push(mailDb().where("id", result.id).update(updates));
        }
    }

    for(let remainingName of requiredMails) {
        let mail = remainingName + "@" + (projectName == "" ? "" : projectName + ".") + process.env.ROOT_DOMAIN;
        if(isSystem) inserts.push({system: "true", pwdset: "false", email: mail, password: cryptPassword(string_utils.generatePassword(16, 24)), domain_id: domainId, projectName: projectName == "" ? undefined : projectName});
        else inserts.push({system: "true", domain_id: domainId, source: remainingName + "@" + domain, destination: mail, projectName: projectName == "" ? undefined : projectName});
    }
    
    return Promise.all(proms.concat(mailDb().insert(inserts)));
}

const server_version = "17"; // |   like panel_pma to restart container when config is changed
const forceRestart = process.env.NODE_ENV == "development";
function checkAndStart(maildirectory, shouldRestart) {
    return docker_manager.docker.container.list({filters: {label: ["pmng.containertype=server", "pmng.server=mails"]}}).then(async (containers) => {
        if(containers.length == 0 || shouldRestart || containers[0].data.Labels["pmng.serverversion"] != server_version) {
            if(containers.length > 0) await containers[0].stop();
            let Binds = [maildirectory + ":/var/mail/vhosts"];

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
            let pfMainArgs = {__ROOT_DOMAIN: process.env.ROOT_DOMAIN};
            if(enableSSL) {
                pfMainArgs.__TLS_FULLCHAIN = "/var/spool/postfix/fullchain.pem";
                pfMainArgs.__TLS_PRIVKEY = "/var/spool/postfix/privkey.pem";

                Binds.push(path.join(__dirname, "../https/greenlock.d/live/" + process.env.ROOT_DOMAIN + "/fullchain.pem") + ":/var/spool/postfix/fullchain.pem:ro");
                Binds.push(path.join(__dirname, "../https/greenlock.d/live/" + process.env.ROOT_DOMAIN + "/privkey.pem") + ":/var/spool/postfix/privkey.pem:ro");
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
            let dvFiles = ["dovecot.defaults.conf", "conf.d/10-mail.defaults.conf", "conf.d/10-auth.defaults.conf", "conf.d/10-master.defaults.conf", "conf.d/10-ssl.defaults.conf", "conf.d/auth-sql.defaults.conf.ext", "dovecot-sql.defaults.conf.ext", "dovecot-sql-sso.defaults.conf.ext"];
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
                logger.info("Mail server container started.");
                let mailDb = getMailDatabase(), mailDomainsDb = () => mailDb("virtual_domains");
                // mailDomainsDb is a function because each request needs a different object

                // check all virtual_domains
                logger.tag("MAIL", "Checking virtual domains...");
                await mailDomainsDb().where("name", process.env.ROOT_DOMAIN).select("*").then((result) => {
                    if(result.length == 0) return mailDomainsDb().insert({name: process.env.ROOT_DOMAIN, system: "true"});
                    else if(result[0].system != "true") return mailDomainsDb().where("name", process.env.ROOT_DOMAIN).update({system: "true"});
                });

                let requiredDomains = {};
                await database_server.database("projects").select(["name", "id"]).then((projects) => {
                    for(let project of projects)
                        requiredDomains[project.name + "." + process.env.ROOT_DOMAIN] = {system: true, projectname: project.name, cdomainid: null};
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
                            if(name != process.env.ROOT_DOMAIN) prom.push(mailDomainsDb().where("name", name).delete());
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
                logger.error("Cannot start mail server container.");
                throw error;
            });
        }
    });
}

function knexProjectnameSelector(userId, adminOrScope) {
    if(typeof adminOrScope == "number") adminOrScope = database_server.checkScope(adminOrScope, "ADMIN");

    return function() {
        this.whereIn("projectname", function () {
            this.where("ownerid", userId).select("name").from(database_server.DB_NAME + ".projects");
        });
    
        this.orWhereIn("projectname", function() {
            this.where("userid", userId).andWhere("mode", "manage").select("projectname").from(database_server.DB_NAME + ".collabs");
        });
    
        if(adminOrScope) this.orWhere("projectname", null);
    };
}

function getUserMissingPasswords(userId, userScope = 99, count = false) {
    let queryBuilder = getMailDatabase("virtual_users").where(knexProjectnameSelector(userId, userScope)).andWhere("pwdset", "false");
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

    if(!(await isMailInstalled())) await installMailDatabase();
    return checkAndStart(maildirectory, forceRestart);
}


module.exports.MAIL_DBNAME = MAIL_DBNAME;
module.exports.isMailInstalled = isMailInstalled;
module.exports.isMailInstalledCache = isMailInstalledCache;
module.exports.getMailDatabase = getMailDatabase;
module.exports.installMailDatabase = installMailDatabase;
module.exports.checkDomainIdUsers = checkDomainIdUsers;
module.exports.cryptPassword = cryptPassword;
module.exports.getUserMissingPasswords = getUserMissingPasswords;
module.exports.knexProjectnameSelector = knexProjectnameSelector;
module.exports.initialize = initialize;