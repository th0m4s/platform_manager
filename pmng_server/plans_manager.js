const database_server = require("./database_server");
const { use } = require("passport");

function getPlanDetails(planId) {
    return database_server.database("plans").where("id", planId).select("usage").then((plans) => {
        if(plans.length == 0) return database_server.database("plans").where("name", "default").select("usage").then((results) => {
            if(results.length == 0) throw "No default plan.";
            else return results[0].usage;
        });

        return plans[0].usage;
    }).then((usage) => {
        return JSON.parse(usage);
    });
}

// TODO: move this in database_server
function resolveUser(userInfo) {
    if(typeof userInfo == "string") return database_server.findUserByName(userInfo);
    else if(typeof userInfo == "number") return database_server.findUserById(userInfo);
    else if(typeof userInfo == "object") return Promise.resolve(userInfo);
    else return Promise.resolve(null);
}

// TODO: use cache and invalidate
function canUserCreateProject(userInfo) {
    return resolveUser(userInfo).then((user) => {
        if(user == null) return false;

        return getPlanDetails(user.plan).then((plan) => {
            if(plan.projects.max <= 0) return true;
            
            return database_server.database("projects").where("ownerid", user.id).count("* as count").then((counts) => {
                return counts[0].count < plan.projects.max;
            });
        });
    })
}

function userMaxMemory(userInfo) {
    return resolveUser(userInfo).then((user) => {
        if(user == null) user = {plan: 1};

        return getPlanDetails(user.plan).then((plan) => {
            let maxMemory = plan.docker.memory;
            return (maxMemory > 0 && maxMemory < 4) ? 512 : maxMemory;
        });
    })
}

function userMaxStorage(userInfo) {
    return resolveUser(userInfo).then((user) => {
        if(user == null) user = {plan: 1};

        return getPlanDetails(user.plan).then((plan) => {
            let maxStorage = plan.storages.max;
            return maxStorage > 0 ? maxStorage : 10737418240; // default to 10g
        });
    })
}

module.exports.getPlanDetails = getPlanDetails;
module.exports.canUserCreateProject = canUserCreateProject;
module.exports.userMaxMemory = userMaxMemory;
module.exports.userMaxStorage = userMaxStorage;