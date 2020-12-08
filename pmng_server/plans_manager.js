const database_server = require("./database_server");

/**
 * Represents a user under different forms.
 * @typedef {string | number | object} UserResolvable
*/

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
/**
 * Resolves a *UserResolvable* into a *User* object.
 * @param {UserResolvable} userInfo A user resolvable
 * @returns {Promise<import("./database_server").User>} The resolved user.
 */
function resolveUser(userInfo) {
    if(typeof userInfo == "string") return database_server.findUserByName(userInfo);
    else if(typeof userInfo == "number") return database_server.findUserById(userInfo);
    else if(typeof userInfo == "object") return Promise.resolve(userInfo);
    else return Promise.resolve(null);
}

// TODO: use cache and invalidate
/**
 * Checks if a user can create a new project.
 * @param {UserResolvable} userInfo A user resolvable for the user to check.
 * @returns {Promise<boolean>} *true* if the user can create a new project, *false* otherwise.
 */
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

/**
 * Gets the maximum memory in megabytes per project allocated to a user.
 * @param {UserResolvable} userInfo A user resolvable for the user to check.
 * @returns {Promise<number>} The maximum memory for a project in megabytes.
 * 0 means no limit and any plan limit between 0 and 4 return a default value of 512 megabytes.
 */
function userMaxMemory(userInfo) {
    return resolveUser(userInfo).then((user) => {
        if(user == null) user = {plan: 1};

        return getPlanDetails(user.plan).then((plan) => {
            let maxMemory = plan.docker.memory;
            return (maxMemory > 0 && maxMemory < 4) ? 512 : maxMemory;
        });
    })
}

/**
 * Gets the maximum storage space for a single project in bytes.
 * @param {UserResolvable} userInfo A user resolvable for the user to check.
 * @returns {Promise<number>} The maximum space of a *persistent-storage* volume in bytes.
 */
function userMaxStorage(userInfo) {
    return resolveUser(userInfo).then((user) => {
        if(user == null) user = {plan: 1};

        return getPlanDetails(user.plan).then((plan) => {
            return plan.storages.max;
        });
    })
}

module.exports.getPlanDetails = getPlanDetails;
module.exports.canUserCreateProject = canUserCreateProject;
module.exports.userMaxMemory = userMaxMemory;
module.exports.userMaxStorage = userMaxStorage;