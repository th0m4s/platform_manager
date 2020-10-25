const mail_manager = require("../mails/mail_manager");
const string_utils = require("../string_utils");
const plugins_manager = require("../plugins_manager");
const database_server = require("../database_server");
const unixcrypt = require("unixcrypt");

function checkDatabaseUser(dbKnex, userId, dbUsername, dbPassword) {
    return dbKnex.raw("SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = '" + dbUsername + "') AS 'exists';").then((results) => {
        let values = results[0]; // raw always give array of results and columns defs
        let exists = values[0].exists != 0;

        let returnPassword = false;
        if(dbPassword == undefined) {
            dbPassword = string_utils.generatePassword(16, 24);
            returnPassword = true;
        }

        if(!exists) {
            return dbKnex.raw("CREATE USER '" + dbUsername + "' IDENTIFIED BY '" + dbPassword + "';").then(async () => {
                // grant to all required projects databases
                let mdbPlugin = plugins_manager.getPlugin("mariadb");

                let ownedProjects = await database_server.database("projects").where("ownerid", userId).select("name");
                for(let projectLine of ownedProjects)
                    mdbPlugin.updatePrivileges(projectLine.name, userId, "manage", dbKnex);

                let collabProjects = await database_server.database("collabs").where("userid", userId).select("*");
                for(let collabLine of collabProjects)
                    mdbPlugin.updatePrivileges(collabLine.projectname, userId, collabLine.mode, dbKnex);                
            }).then(() => {
                if(returnPassword) return dbPassword;
            });
        }
    })
}

function currentTimestamp() {
    return Math.floor(Date.now()/1000);
}

let usernameTries = {};
const maxTries = 5, expireAfter = parseInt(process.env.ADMIN_LOGIN_FAIL_TIME);

async function loginUser(username, password, keyType) {
    currentTime = currentTimestamp();
    if(usernameTries[username] == undefined) usernameTries[username] = {tries: 0, lastTime: currentTime};
    if(currentTime - usernameTries[username].lastTime >= expireAfter) {
        usernameTries[username].tries = 1;
    } else {
        usernameTries[username].tries++;
    }

    let noAuth = () => {
        let res = {auth: false, tries: maxTries - usernameTries[username].tries};
        if(res.tries <= 0) res.retryIn = usernameTries[username].lastTime+expireAfter-currentTime;
        return res;
    }

    if(usernameTries[username].tries > maxTries) return noAuth();
    usernameTries[username].lastTime = currentTime;

    let user = await database_server.findUserByName(username);
    if(user == null) return noAuth();
    if((await database_server.comparePassword(user.id, password)) !== true) return noAuth();
    delete usernameTries[username];

    let key = await database_server.generateKey(user.id, keyType);
    user.key = key;

    await database_server.getPluginKnex().then((pluginKnex) => {
        // TODO: grant privileges where needed
        return Promise.all([
            checkDatabaseUser(pluginKnex, user.id, username, password),
            checkDatabaseUser(pluginKnex, user.id, "dbau_" + username, undefined).then((newPassword) => {
                if(newPassword != undefined) {
                    return database_server.database("users").where("name", username).update({dbautopass: newPassword});
                }
            })
        ]);
    });

    // checks mail missing user passwords
    let mailMissingCount = await mail_manager.getUserMissingPasswords(user.id, user.scope, true);
    if(mailMissingCount > 0)
        req.session.account.mailsNeedPwd = true;
    
    // checks mail missing sso passwords
    let mailDb = mail_manager.getMailDatabase();
    let mailMissingSso = await mailDb("virtual_users").where("sso_decrypt", null).orWhere("sso_encrypt", null).select("id");
    let mmSsoProms = [];
    for(let missingSso of mailMissingSso) {
        let mailSsoPassword = string_utils.generatePassword(16, 24);
        let encrypted = unixcrypt.encrypt(mailSsoPassword);
        mmSsoProms.push(mailDb("virtual_users").where("id", missingSso.id).update({sso_decrypt: mailSsoPassword, sso_encrypt: encrypted}));
    }
    if(mmSsoProms.length > 0) await Promise.all(mmSsoProms);

    return {auth: true, user};
}


module.exports.loginUser = loginUser;