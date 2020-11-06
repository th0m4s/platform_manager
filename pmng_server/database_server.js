const Knex = require("knex");
const mdb = require('knex-mariadb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require("./platform_logger").logger();
const runtime_cache_delay = 60000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const plugin_mdb = require("./plugins/plugin_mariadb");
const string_utils = require("./string_utils");
const intercom = require("./intercom/intercom_client").connect();

const DB_NAME = "platform_manager";
const DB_CONFIG = {
    database: DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

if(process.env.DB_MODE == "remote") {
    DB_CONFIG.host = process.env.DB_HOST;
    DB_CONFIG.port = process.env.DB_PORT;
} else {
    DB_CONFIG.socketPath =  process.env.DB_SOCKET;
}

/** Represents a connection to the platform database. */
const knex = Knex({
    client: mdb,
    connection: DB_CONFIG 
});

// check at least database creation (needed for sessions store of admin panel)
// tables are created in installDatabase
knex.raw("SHOW DATABASES;").catch((error) => {
    if(error.toString().includes("Unknown database")) {
        delete knex.client.connectionSettings.database;
        knex.raw("CREATE DATABASE `" + DB_NAME + "`;").then(() => {
            knex.client.connectionSettings.database = DB_NAME;
        });
    }
});

// TODO: change User to a class
/**
 * Represents a user fetched from the database.
 * @typedef{{id: number, fullname: string, name: string, email: string, password: string, scope: number}} User
*/

/**
 * Returns a user based on its *username*.
 * @param {string} username The username of the requested user.
 * @param {boolean} stripPassword Empty the user password from the result.
 * @returns {Promise<User>} A new user object filled with the corresponding user's data or *null* if this username is not associated with a user.
 */
function findUserByName(username, stripPassword = true) {
    return knex("users").where("name", username).select("*").then((results) => {
        if(results.length != 1) return null;
        else {
            if(stripPassword) results[0].password = "";
            return results[0];
        };
    });
}

/**
 * Returns a user based on its id.
 * @param {number} id The id of the requested user.
 * @param {boolean} stripPassword Empty the user password from the result.
 * @returns {Promise<User>} A new user object filled with the corresponding user's data or *null* if this id doesn't exist in the database.
 */
function findUserById(id, stripPassword = true) {
    return knex("users").where("id", id).select("*").then((results) => {
        if(results.length != 1) return null;
        else {
            if(stripPassword) results[0].password = "";
            return results[0];
        };
    });
}

/**
 * Finds a user in the database with an access token.
 * @param {string} key The token of the requested user.
 * @returns {Promise<user>} A new user object filled with the corresponding user's data or *null* if this token doesn't exist or is expired.
 */
function findUserByKey(key) {
    return knex("keys").where("key", key).andWhere("expired", "false").select("userid").then((results) => {
        if(results.length != 1) return null;
        else return findUserById(results[0].userid);
    });
}

function createTableIfNotExists(name, schemaCallback, currentKnex = knex) {
    return currentKnex.schema.hasTable(name).then((result) => {
        if(!result) return currentKnex.schema.createTable(name, schemaCallback);
    });
}

/**
 * Creates all the required database for the platform.
 * @returns {Promise<boolean>} A promise resolved with *true* if the installation was successfull (all required tables created), *false* otherwise.
 */
function installDatabase() {
    return createTableIfNotExists("users", (users) => {
        users.increments("id").primary().index();
        users.text("name").unique();
        users.text("fullname");
        users.text("email");
        users.text("password");
        users.text("dbautopass");
        users.integer("scope");
        users.integer("plan").defaultTo(1);
    }).then(() => {
        return Promise.all([
            createTableIfNotExists("projects", (projects) => {
                projects.increments("id").primary();
                projects.string("name", 32).unique().index();
                projects.integer("ownerid", 10).unsigned();
                projects.text("userenv");
                projects.text("type");
                projects.integer("version").defaultTo(0);
                projects.text("plugins").defaultTo("{}");
                projects.enum("autostart", ["true", "false"]).defaultTo("false");
                projects.enum("forcepush", ["true", "false"]).defaultTo("false");
                projects.enum("allow_https", ["true", "false"]).defaultTo("true");
                projects.foreign("ownerid").references("id").inTable("users");
            }), createTableIfNotExists("remote_git_users", (rgitusers) => {
                rgitusers.increments("id").primary();
                rgitusers.integer("userid", 10).unsigned();
                rgitusers.string("remote", 16).notNullable();
                rgitusers.string("remote_user", 48).nullable().defaultTo(null);
                rgitusers.string("access_token", 128).notNullable();
                rgitusers.datetime("expire_time");
                rgitusers.string("refresh_token", 128);
                rgitusers.datetime("refresh_expire");
                rgitusers.foreign("userid").references("id").inTable("users");
            })
        ])
    }).then(() => {
        return Promise.all([
            createTableIfNotExists("keys", (keys) => {
                keys.increments("id").primary();
                keys.string("key", 64).unique().index();
                keys.integer("userid", 10).unsigned().nullable();
                keys.enum("expired", ["true", "false"]).defaultTo("false");
                keys.enum("mode", ["session", "api"]);
                keys.foreign("userid").references("id").inTable("users").onDelete("CASCADE");
            }), createTableIfNotExists("collabs", (collabs) => {
                collabs.increments("id").primary();
                collabs.string("projectname", 32).index();
                collabs.integer("userid", 10);
                collabs.enum("mode", ["view", "manage"]).defaultTo("view");
                collabs.foreign("projectname").references("name").inTable("projects").onDelete("CASCADE");
                collabs.foreign("userid").references("id").inTable("users").onDelete("CASCADE");
            }), createTableIfNotExists("domains", (domains) => {
                domains.increments("id").primary();
                domains.text("domain").unique().index();
                domains.string("projectname", 32).notNullable();
                domains.enum("enablesub", ["true", "false"]).defaultTo("true");
                domains.foreign("projectname").references("name").inTable("projects").onDelete("CASCADE");
            }), createTableIfNotExists("plans", (plans) => {
                plans.increments("id").primary();
                plans.text("name").unique().index();
                plans.text("usage").defaultTo("{}");
                plans.decimal("price", 3, 2).defaultTo(0);
                plans.enum("restricted", ["true", "false"]).defaultTo("false");
            }).then(() => {
                return hasDefaultPlans();
            }).then((exists) => {
                if(!exists) return knex("plans").insert([
                    {name: "default", usage: JSON.stringify({projects: {max: 10}, docker: {memory: 512}, storages: {max: 10737418240}})},
                    {name: "admin", usage: JSON.stringify({projects: {max: 0}, docker: {memory: 0}, storages: {max: 0}}), restricted: "true"}
                ]);
            }), createTableIfNotExists("password_resets", (pResets) => {
                pResets.increments("id").primary();
                pResets.string("hash", 32).unique().index().notNullable();
                pResets.integer("user_id", 10).unsigned().notNullable();
                pResets.datetime("created_at").notNullable().defaultTo(knex.fn.now());
                pResets.datetime("used_at").defaultTo(null);
                pResets.datetime("canceled_at").defaultTo(null);
                pResets.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
            }), createTableIfNotExists("email_changes", (eChanges) => {
                eChanges.increments("id").primary();
                eChanges.string("allow_hash", 32).unique().index().notNullable();
                eChanges.string("confirm_hash", 32).unique().index().notNullable();
                eChanges.integer("user_id", 10).unsigned().notNullable();
                eChanges.string("old_email", 128).notNullable();
                eChanges.string("new_email", 128).notNullable();
                eChanges.datetime("created_at").notNullable().defaultTo(knex.fn.now());
                eChanges.datetime("allowed_at").defaultTo(null);
                eChanges.datetime("confirmed_at").defaultTo(null);
                eChanges.datetime("canceled_at").defaultTo(null);
                eChanges.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
            }), createTableIfNotExists("remote_git_integrations", (rgitinte) => {
                rgitinte.increments("id").primary();
                rgitinte.integer("git_userid", 10).unsigned().notNullable();
                rgitinte.string("projectname", 32).notNullable();
                rgitinte.string("secret", 32).defaultTo(null);
                rgitinte.string("repo", 64).notNullable();
                rgitinte.string("repo_id", 64).notNullable();
                rgitinte.string("branch", 32).notNullable();
                rgitinte.foreign("git_userid").references("id").inTable("remote_git_users");
                rgitinte.foreign("projectname").references("name").inTable("projects");
            })
        ]).then(() => {
            return true;
        }).catch((e) => { logger.error(e); return false; }); 
    })
}

function hasDefaultPlans() {
    return knex("plans").where("name", "default").orWhere("name", "admin").select("id").then((results) => {
        return results.length >= 2;
    });
}

/**
 * Checks if the database is correctly setup.
 * 
 * To check if the platform is installed, prefer *isInstalled()*.
 * @returns {Promise<boolean>} A promise resolved with *true* if all the database is setup (with all the required tables), *false* otherwise.
 */
function hasDatabase() {
    return Promise.all([
      knex.schema.hasTable("users"), knex.schema.hasTable("keys"), knex.schema.hasTable("projects"), knex.schema.hasTable("collabs"), knex.schema.hasTable("domains"), 
        knex.schema.hasTable("plans").then((exists) => {
          if(!exists) return false;
          else return hasDefaultPlans();
      }), knex.schema.hasTable("password_resets"), knex.schema.hasTable("email_changes"), knex.schema.hasTable("remote_git_users"), knex.schema.hasTable("remote_git_integrations")
    ]).then((results) => {
      return !results.includes(false);
    }).catch(() => { return false; });
}

/**
 * Checks if a least one admin user exists on the platform.
 * @returns {Promise<boolean>} A promise resolved with *true* if at least one admin user exists on the platform, *false* otherwise.
 */
function hasAdminUser() {
    return knex("users").select("*").where("scope", 1).count("id AS cnt").then((total) => {
        return total[0].cnt > 0;
    });
}

/**
 * Checks if the entire platform is installed by checking *hasDatabase* and *hasAdminUser*.
 * Database operations should not be executed if this returns false.
 * @returns {Promise<boolean>} A promise resolved with the installed state of the platform.
 */
function isInstalled() {
    return hasDatabase().then((result) => {
        if(!result) return false;
        else return hasAdminUser();
    }).catch(() => {return false; }).then((result) => {
        return result;
    }).catch(() => {return false; });
}

let _pluginKnex = undefined;
async function getPluginKnex(db) {
    if(_pluginKnex == undefined) _pluginKnex = await plugin_mdb.localKnex();
    return db == undefined ? _pluginKnex : _pluginKnex(db);
}

function isUsernameValid(username) {
    // maybe deny underscore in username (it will disable all names starting with dbu_/dbau_)
    // same regex as in the users/manage view
    return username.match(/^(?!db(a|)u_.*$)[a-z][a-z0-9_-]{3,15}$/) != null;
}

/**
 * Adds a user into the database based on the given user's data.
 * @param {string} name Its username.
 * @param {string} fullname Its fullname.
 * @param {string} password Its clear password.
 * @param {string} email Its email.
 * @param {number} scope Its corresponding scope as a number.
 * @param {number} plan Its associated plan as a number.
 * @returns {Promise} A promise resolved when the user is successfully added into the database.
 */
function addUser(name, fullname, password, email, scope, plan) {
    if(!isUsernameValid(name)) return Promise.reject("Invalid username.");
    let autoDatabasePassword = string_utils.generatePassword(16, 24);

    return Promise.all([hashPassword(password).then((hash) => {
        return knex("users").insert({name, fullname, password: hash, email, scope, plan});
    }), getPluginKnex().then((plk) => Promise.all([
        plk.raw("CREATE USER '" + name + "' IDENTIFIED BY '" + password + "';"),
        plk.raw("CREATE USER 'dbau_" + name + "' IDENTIFIED BY '" + autoDatabasePassword + "';")
    ]))]).then(() => {
        return findUserId(name);
    }).then((id) => {
        intercom.send("usersevents", {event: "add", user: {id, name, fullname, email, scope}})
    });
}

function removeUser(username) {
    // TODO: move all the code from users_api to here because projects/collabs/integrations are deleted separately
    return Promise.all([knex("users").where("name", username).delete(), getPluginKnex().then((plk) => Promise.all([plk.raw("DROP USER '" + username + "';"), plk.raw("DROP USER 'dbau_" + username + "';")]))]).then(() => {
        intercom.send("usersevents", {event: "remove", user: username})
    });
}

/**
 * Hashes a password using the correct algorithm and settings.
 * @param {string} password The clear password.
 */
function hashPassword(password) {
    return bcrypt.hash(password, parseInt(process.env.CRYPTO_ROUNDS));
}

/**
 * Checks if a password is correct for a specific user (resolved from its id).
 * @param {number} userId The id of the user to check the password against.
 * @param {string} password The clear password to check.
 * @returns {Promise<boolean>} A promise resolved with the comparison result.
 */
function comparePassword(userId, password) {
    return knex("users").where("id", userId).select("password").then((lines) => {
        if(lines.length != 1) return false;
        return bcrypt.compare(password, lines[0].password);
    }).catch((e) => {
        logger.warn(e);
        return false;
    });
}

/**
 * Generates an access token for a specific user (resolved from its id) only valid for the given mode.
 * @param {number} userId The user id to generate the key for.
 * @param {string} mode The associated mode (*session* or *api*).
 * @returns {Promise<string>} A promise resolved with the newly generated key if no error happened.
 */
function generateKey(userId, mode) {
    let key = crypto.randomBytes(32).toString("hex");
    return knex("keys").insert({key: key, userid: userId, expired: "false", mode: mode}).then(() => {
        return key;
    });
}

/**
 * Revokes a specific key to log the user out of his session or invalidate any new future API request.
 * @param {string} key The key to revoke.
 * @returns {Promise} A promise that will be resolved when the key is successfully revoked.
 */
function revokeKey(key) {
    return knex("keys").where("key", key).update({expired: "true"});
}

function _findUserId(username) {
    return knex("users").where("name", username).select("id").then((results) => {
        if(results == null || results.length != 1) return Promise.reject("Unknown user name.");
        return results[0].id;
    });
} const findUserId = runtime_cache(_findUserId);

/**
 * Checks if a project allows to be served with HTTPS.
 * @param {string} project The project name to check.
 * @returns {Promise<boolean>} A promise resolved with *true* if the project allows to be served with HTTPS, *false* otherwise.
 */
function projectAllowHttps(project) {
    return knex("projects").where("name", project).select("allow_https").then((results) => {
        if(results.length == 0) return false;
        else return results[0].allow_https.toLowerCase() == "true";
    }).catch(() => false);
}

// project https allowance should be checked separately
// TODO: for now, "allow" means "force redirect" from http to https
/**
 * Checks if a custom domain allows to be used with HTTPS (similar to *projectAllowHttps()*).
 * @param {string} domain The custom domain to check.
 * @returns {Promise<boolean>} A promise resolved with *true* if the custom domain allows to be used with HTTPS, *false* otherwise.
 */
function domainAllowHttps(domain) {
    return knex("domains").where("domain", domain).select("allow_https").then((results) => {
        if(results.length == 0) return false;
        else return results[0].allow_https == "true";
    }).catch(() => false);
}

function userChangingMail(userId) {
    return knex("email_changes").where("user_id", userId).andWhere("confirmed_at", null).andWhere("canceled_at", null).select("new_email").then((results) => {
        if(results.length == 0) return undefined;
        else return results[0].new_email;
    });
}

const SCOPES = {ADMIN: 1, SYSTEM: 9, DOCKER: 20, USER: 99};
/**
 * Checks if a integer user scope is valid against a scope level.
 * @param {number} userScopeId The user scope integer representation.
 * @param {string} requestedScope The string representation of the requested level.
 * @returns {boolean} *true* if the user level is above the requested scope, *false* otherwise.
 */
function checkScope(userScopeId, requestedScope) {
    requestedScope = requestedScope.toUpperCase();
    return SCOPES.hasOwnProperty(requestedScope) && userScopeId <= SCOPES[requestedScope];
}

module.exports.DB_NAME = DB_NAME;
module.exports.DB_CONFIG = DB_CONFIG;
module.exports.database = knex;
module.exports.findUserByName = findUserByName;
module.exports.findUserById = findUserById;
module.exports.findUserByKey = findUserByKey;
module.exports.findUserId = findUserId;
module.exports.installDatabase = installDatabase;
module.exports.hasDatabase = hasDatabase;
module.exports.hasAdminUser = hasAdminUser;
module.exports.isInstalled = isInstalled;
module.exports.getPluginKnex = getPluginKnex;
module.exports.createTableIfNotExists = createTableIfNotExists;
module.exports.addUser = addUser;
module.exports.removeUser = removeUser;
module.exports.hashPassword = hashPassword;
module.exports.comparePassword = comparePassword;
module.exports.generateKey = generateKey;
module.exports.revokeKey = revokeKey;
module.exports.projectAllowHttps = projectAllowHttps;
module.exports.domainAllowHttps = domainAllowHttps;
module.exports.userChangingMail = userChangingMail;
module.exports.checkScope = checkScope;