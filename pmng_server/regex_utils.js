const project_regex = new RegExp("^(?<project>[a-z-0-9]{4,32})\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
const special_regex = new RegExp("^(?<special>www|admin|git|mail|ns(1|2)|ftp)\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
// same values as in forbidden_names in projects_api

const plugin_regex = new RegExp("^plugin_(?<plugin>[a-z-0-9]{4,32}).js$");
const storageDisk_regex = new RegExp("^(?<project>[a-z-0-9]{4,32}).img$");
const project_manager = require("./project_manager");

/**
 * Checks if the domain is a special domain for the platform.
 * @param {string} domain The domain to check the special on.
 * @returns {string} The special name if found in the domain, null otherwise.
 */
function testSpecial(domain) {
    let match = domain.match(special_regex);
    if(match != null) return match.groups.special;
    else return null;
}

/**
 * Checks if this domain is the correct format for a project subdomain. Project may not exist in the database.
 * @param {string} domain The domain to test the project on.
 * @returns {string} The project name if found in the domain, null otherwise.
 */
function testProject(domain) {
    let match = domain.match(project_regex);
    if(match != null) return match.groups.project;
    else return null;
}

/**
 * Checks with the database if this domain is bound to a project.
 * @param {string} domain The custom domain to check with the database.
 * @return {Promise<string>} A promised resolved with the project name or with null if this custom domain doesn't exist in the database.
 */
async function testCustom(domain) {
    let useSub = false;
    if(domain.startsWith("www.")) {
        useSub = true;
        domain = domain.substring(4, domain.length);
    }
    
    let project = await project_manager.checkCustomDomain(domain, useSub);
    if(project !== false) {
        return project;
    } else return null;
}

async function testProjectOrCustom(domain) {
    /*let project = testProject(domain);
    if(project != null) return project;

    return testCustom(domain);*/
    return testProject(domain) || testCustom(domain);
}

/**
 * Checks if a file is a plugin JS file.
 * @param {string} filename The filename to check.
 * @returns {boolean} If the file is a correct plugin, returns *true*, *false* otherwise.
 */
function testPlugin(filename) {
    let match = filename.match(plugin_regex);
    if(match != null) return match.groups.plugin;
    else return null;
}

/**
 * Checks if a file is a project permanent storage disk.
 * @param {string} filename The filename to check.
 * @returns {boolean} If the file is a correct storage disk, returns *true*, *false* otherwise.
 */
function testStorageDisk(filename) {
    let match = filename.match(storageDisk_regex);
    if(match != null) return match.groups.project;
    else return null;
}

// TODO: use testACMEChallenge that returns the token
function isACMEChallenge(url) {
    return url.startsWith("/.well-known/acme-challenge/");
}

module.exports.testSpecial = testSpecial;
module.exports.testProject = testProject;
module.exports.testProjectOrCustom = testProjectOrCustom;
module.exports.testCustom = testCustom;
module.exports.testStorageDisk = testStorageDisk;
module.exports.testPlugin = testPlugin;
module.exports.isACMEChallenge = isACMEChallenge;