const database_server = require("../database_server");
const docker_manager = require("../docker_manager");
const string_utils = require("../string_utils");
const Knex = require("knex");
const path = require("path");
const pfs = require("fs").promises;
const mdb = require('knex-mariadb');
const logger = require("../platform_logger").logger();
const intercom = require("../intercom/intercom_client").connect();

let _mailKnex = undefined;
const MAIL_DBNAME = "mail_server";
function getMailDatabase() {
    if(_mailKnex == undefined) {
        let config = Object.assign({}, database_server.DB_CONFIG);
        config.database = MAIL_DBNAME;

        _mailKnex = Knex({
            client: mdb,
            connection: config 
        });
    }

    return _mailKnex;
}

function _mailDbInstalled() {
    return database_server.database.raw("SHOW DATABASES;").then((results) => {
        let dbs = [];
        for(let result of results[0])
            dbs.push(result.Database);

        if(!dbs.includes(MAIL_DBNAME)) return false;
        let mailKnex = getMailDatabase();
        return Promise.all([
            mailKnex.schema.hasTable("virtual_domains"), mailKnex.schema.hasTable("virtual_users"), mailKnex.schema.hasTable("virtual_aliases")]).then((results) => {
            return !results.includes(false) ? true : undefined;
          }).catch(() => { return false; });
    })
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
        }, mailKnex).then(() => {
            return Promise.all([
                database_server.createTableIfNotExists("virtual_users", (users) => {
                    users.increments("id").primary().index().notNullable();
                    users.integer("domain_id", 10).unsigned().notNullable();
                    users.string("password", 106).notNullable();
                    users.string("email", 100).notNullable().unique();
                    users.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
                }, mailKnex).then(() => {
                    return true;
                }),
                database_server.createTableIfNotExists("virtual_aliases", (aliases) => {
                    aliases.increments("id").primary().index().notNullable();
                    aliases.integer("domain_id", 10).unsigned().notNullable();
                    aliases.string("source", 100).notNullable()/*.unique()*/;
                    aliases.string("destination", 100).notNullable();
                    aliases.foreign("domain_id").references("id").inTable("virtual_domains").onDelete("CASCADE");
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

const server_version = "9"; // |   like panel_pma to restart container when config is changed
const forceRestart = true; //  |
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

                Binds.push(path.join(__dirname, "./https/greenlock.d/live/" + process.env.ROOT_DOMAIN + "/fullchain.pem") + ":/var/spool/postfix/fullchain.pem:ro");
                Binds.push(path.join(__dirname, "./https/greenlock.d/live/" + process.env.ROOT_DOMAIN + "/privkey.pem") + ":/var/spool/postfix/privkey.pem:ro");
            }
            postfixMainConfig = string_utils.replaceArgs(postfixMainConfig, pfMainArgs);
            let pfMainIncFile = path.resolve(postfixDefaultDir, "main.inc.cf");
            await pfs.writeFile(pfMainIncFile, postfixMainConfig);
            Binds.push(pfMainIncFile + ":/etc/postfix/main.cf");

            let pfSqlFiles = ["mysql-virtual-mailbox-domains", "mysql-virtual-mailbox-maps", "mysql-virtual-alias-maps", "mysql-virtual-email2email"];
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
            let dvFiles = ["dovecot.defaults.conf", "conf.d/10-mail.defaults.conf", "conf.d/10-auth.defaults.conf", "conf.d/10-master.defaults.conf", "conf.d/10-ssl.defaults.conf", "conf.d/auth-sql.defaults.conf.ext", "dovecot-sql.defaults.conf.ext"];
            let dvConfig = Object.assign({}, pfMainArgs, sqlReplaceArgs);
            if(sqlHosts.startsWith("unix:")) dvConfig.__DBMAIL_HOST = "/var/spool/postfix/var/run/mysqld/mysqld.sock";

            for(let dvFile of dvFiles) {
                let dvFileConfig = await pfs.readFile(path.resolve(dovecotDefaultDir, path.basename(dvFile)), "utf-8");
                dvFileConfig = string_utils.replaceArgs(dvFileConfig, dvConfig);
                dvFileConfig = string_utils.keepConfigLines(dvFileConfig, enableSSL ? ["tlsonly"] : ["notls"], enableSSL ? ["notls"] : ["tlsonly"]);
                let dvIncFile = path.resolve(dovecotDefaultDir, path.basename(dvFile).replace(".defaults", ".inc"));
                await pfs.writeFile(dvIncFile, dvFileConfig);
                Binds.push(dvIncFile + ":/etc/dovecot/" + dvFile.replace(".inc", ""));
            }

            let portBindings = {"587/tcp": [{HostPort: "578"}]};
            if(enableSSL) {
                portBindings["993/tcp"] = [{HostPort: "993"}];
                portBindings["995/tcp"] = [{HostPort: "995"}];
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
                HostConfig: {
                    PortBindings: portBindings,
                    AutoRemove: true,
                    NetworkMode: "bridge",
                    Binds
                }
            }).then((container) => {
                return container.start();
            }).then(() => {
                logger.info("Mail server container started.");
            }).catch((error) => {
                logger.error("Cannot start mail server container: " + error);
            });
        }
    });
}

async function initialize(maildirectory) {
    if(!(await isMailInstalled())) await installMailDatabase();
    return checkAndStart(maildirectory, forceRestart);
}


module.exports.MAIL_DBNAME = MAIL_DBNAME;
module.exports.isMailInstalled = isMailInstalled;
module.exports.isMailInstalledCache = isMailInstalledCache;
module.exports.getMailDatabase = getMailDatabase;
module.exports.installMailDatabase = installMailDatabase;
module.exports.initialize = initialize;