const pfs = require("fs").promises;
const path = require("path");
const database_server = require("../database_server");

const GIT_USER_AGENT = "PlatformManager v1.0.0";

let remoteCache = {}, remotesList = [], initialized = false;
async function _checkInitialized() {
    if(!initialized) {
        remotesList = (await pfs.readdir(path.resolve(__dirname, "remotes"))).filter((x) => x.startsWith("remote_") && x.endsWith(".js")).map((x) => x.substring(7, x.length-3));
        initialized = true;
    }
}

function getRemote(remoteName = ".", forceSync = false) {
    if(remoteName.includes(".")) return undefined;

    let _getRemote = () => {
        if(!remotesList.includes(remoteName)) return undefined;

        if(remoteCache[remoteName] == undefined) remoteCache[remoteName] = require("./remotes/remote_" + remoteName);
        return remoteCache[remoteName];
    }

    if(forceSync) {
        return _getRemote();
    } else {
        return _checkInitialized().then(_getRemote);
    }
}

async function listRemotes(userid) {
    await _checkInitialized();
    if(userid == undefined) return remotesList;
    else {
        let available = (await Promise.allSettled(remotesList.map((x) => 
            database_server.database("remote_git_users").where("userid", userid).andWhere("remote", x).count("* as count").then((res) => [x, res.length > 0 && res[0].count > 0]))))
            .map((x) => x.status == "fulfilled" ? x.value : undefined).filter((x) => x != undefined);

        return Object.fromEntries(available);
    }
}

async function listRemotesDetails(userid) {
    return Object.fromEntries(userid == undefined
        ? (await listRemotes()).map((x) => [x, getRemote(x, true)])
        : Object.entries(await listRemotes(userid)).map((x) => [x[0], Object.assign({available: x[1]}, getRemote(x[0], true).getDetails())]));
}

async function listIntegrations(projectName) {
    await _checkInitialized();

    let gitIntegrations = await database_server.database("remote_git_integrations").where("projectname", projectName).select(["id", "git_userid", "repo", "branch"]);
    return Promise.allSettled(gitIntegrations.map((inte) => database_server.database("remote_git_users").where("id", inte.git_userid).select("remote").then((res) => [res[0].remote, Object.assign(inte, {remote: res[0].remote})]))).then((results) => {
        return Object.fromEntries(results.map((x) => x.status == "fulfilled" ? x.value : undefined).filter((x) => x != undefined));
    });
}

module.exports.getRemote = getRemote;
module.exports.listRemotes = listRemotes;
module.exports.listRemotesDetails = listRemotesDetails;
module.exports.listIntegrations = listIntegrations;
module.exports.GIT_USER_AGENT = GIT_USER_AGENT;