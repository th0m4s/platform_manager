const Knex = require("knex");
const mdb = require('knex-mariadb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require("./platform_logger").logger();
const runtime_cache_delay = 60000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});

const DB_NAME = "platform_manager";
const knex = Knex({
    client: mdb,
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: DB_NAME
    }
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

function findUserByName(username) {
    return knex("users").where("name", username).select("*").then((results) => {
        if(results.length != 1) return null;
        else return results[0];
    });
}

function findUserById(id) {
    return knex("users").where("id", id).select("*").then((results) => {
        if(results.length != 1) return null;
        else return results[0];
    });
}

function findUserByKey(key) {
    return knex("keys").where("key", key).andWhere("expired", "false").select("userid").then((results) => {
        if(results.length != 1) return null;
        else return findUserById(results[0].userid);
    });
}

function installDatabase() {
    return Promise.all([
        knex.schema.createTable("users", (users) => {
            users.increments("id").primary().index();
            users.text("name").unique();
            users.text("fullname");
            users.text("password");
            users.text("scope");
        }).then(() => {
            return true;
        }), knex.schema.createTable("keys", (keys) => {
            keys.increments("id").primary();
            keys.string("key", 64).unique().index();
            keys.integer("userid");
            keys.enum("expired", ["true", "false"]).defaultTo("false");
            keys.enum("mode", ["session", "api"]);
        }).then(() => {
            return true;
        }), knex.schema.createTable("projects", (projects) => {
            projects.increments("id").primary();
            projects.text("name").unique().index();
            projects.integer("ownerid");
            projects.text("userenv");
            projects.text("type");
            projects.integer("version").defaultTo(0);
            projects.text("plugins").defaultTo("{}");
            projects.enum("autostart", ["true", "false"]).defaultTo("false");
        }).then(() => {
            return true;
        }), knex.schema.createTable("collabs", (collabs) => {
            collabs.increments("id").primary();
            collabs.text("projectname").index();
            collabs.integer("userid");
            collabs.text("mode");
        }).then(() => {
            return true;
        }), knex.schema.createTable("domains", (domains) => {
            domains.increments("id");
            domains.text("domain");
            domains.text("projectname").notNullable();
            domains.enum("enablesub", ["true", "false"]).defaultTo("true");
        }).then(() => {
            return true;
        })
    ]).then((results) => {
        return !results.includes(false);
    }).catch((e) => { logger.error(e); return false; }); 
}

function hasDatabase() {
    return Promise.all([
      knex.schema.hasTable("users"), knex.schema.hasTable("keys"), knex.schema.hasTable("projects"), knex.schema.hasTable("collabs"), knex.schema.hasTable("domains")
    ]).then((results) => {
      return !results.includes(false);
    }).catch(() => { return false; });
}

function hasAdminUser() {
    return knex("users").select("*").where("scope", "admin").count("id AS cnt").then((total) => {
        return total[0].cnt > 0;
    });
}

function isInstalled() {
    return hasDatabase().then((result) => {
        if(!result) return false;
        else return hasAdminUser();
    }).catch(() => {return false; }).then((result) => {
        return result;
    }).catch(() => {return false; });
}

function addUser(name, fullname, password, scope) {
    return hashPassword(password).then((hash) => {
        return knex("users").insert({name: name, fullname: fullname, password: hash, scope: scope});
    });
}

function hashPassword(password) {
    return bcrypt.hash(password, parseInt(process.env.CRYPTO_ROUNDS));
}

function comparePassword(userId, password) {
    return knex("users").where("id", userId).select("password").then((lines) => {
        if(lines.length != 1) return false;
        return bcrypt.compare(password, lines[0].password);
    }).catch((e) => {
        logger.warn(e);
        return false;
    });
}

function generateKey(userId, mode) {
    let key = crypto.randomBytes(32).toString("hex");
    return knex("keys").insert({key: key, userid: userId, expired: "false", mode: mode}).then(() => {
        return key;
    });
}

function revokeKey(key) {
    return knex("keys").where("key", key).update({expired: "true"});
}

function _findUserId(username) {
    return knex("users").where("name", username).select("id").then((results) => {
        if(results == null || results.length != 1) return Promise.reject("Unknown user name.");
        return results[0].id;
    });
} const findUserId = runtime_cache(_findUserId);

module.exports.database = knex;
module.exports.findUserByName = findUserByName;
module.exports.findUserById = findUserById;
module.exports.findUserByKey = findUserByKey;
module.exports.findUserId = findUserId;
module.exports.installDatabase = installDatabase;
module.exports.hasDatabase = hasDatabase;
module.exports.hasAdminUser = hasAdminUser;
module.exports.isInstalled = isInstalled;
module.exports.addUser = addUser;
module.exports.hashPassword = hashPassword;
module.exports.comparePassword = comparePassword;
module.exports.generateKey = generateKey;
module.exports.revokeKey = revokeKey;