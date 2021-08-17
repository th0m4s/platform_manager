const ROOT_DOMAIN = process.env.ROOT_DOMAIN;
const OTHER_DOMAINS = (process.env.OTHER_DOMAINS?.trim().length > 0 ? process.env.OTHER_DOMAINS.split(",") : null) ?? [];

const project_regex = new RegExp("^(?<project>[a-z-0-9]{4,32})\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
const special_regex = new RegExp("^(?<special>www|admin|git|mail|ns(1|2)|ftp)\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
// same values as in forbidden_names in projects_api

const plugin_regex = new RegExp("^plugin_(?<plugin>[a-z-0-9]{4,32}).js$");
const storageDisk_regex = new RegExp("^(?<project>[a-z-0-9]{4,32}).img$");
const project_manager = require("./project_manager");

function getModifiedFromOtherDomains(requested) {
    if(requested == null) return requested;

    let modified = requested;
    for(let domain of OTHER_DOMAINS) {
        if(modified.endsWith(domain)) {
            modified = modified.substring(0, modified.length - domain.length) + ROOT_DOMAIN;
            break;
        }
    }

    return modified;
}

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

function simplifyCustom(domain) {
    if(domain.startsWith("www."))
        return {simplified: true, domain: domain.substring(4, domain.length)};
    else return {simplified: false, domain};
}

/**
 * Checks with the database if this domain is bound to a project.
 * @param {string} domain The custom domain to check with the database.
 * @return {Promise<string>} A promised resolved with the project name or with null if this custom domain doesn't exist in the database.
 */
async function testCustom(originalDomain) {
    let {domain, simplified} = simplifyCustom(originalDomain);
    let project = await project_manager.checkCustomDomain(domain, simplified);
    if(project !== false) {
        return project;
    } else return null;
}

/**
 * Checks if the domain is either formatted as a project subdomain or a custom domain existing in the database.
 * This function calls testProject, and if no result is found, then calls testCustom.
 * @param {string} domain The domain to check.
 * @returns {{project: string, custom: boolean}} An object with a project property indicating the project name. It not found, it'll be *null*, otherwise, a *custom* boolean indicates if it was found because of a custom domain.
 */
async function testProjectOrCustom(domain) {
    let project = testProject(domain);
    if(project != undefined) return {project, custom: false};

    project = await testCustom(domain);
    if(project != undefined) return {project, custom: true};

    return {project: null};
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
/**
 * Checks if this URL is a request for an ACME challenge.
 * @param {string} url The url to check for an ACME challenge.
 * @returns {boolean} *true* if this is an ACME challenge, *false* otherwise.
 */
function isACMEChallenge(url) {
    return url.startsWith("/.well-known/acme-challenge/");
}

module.exports.OTHER_DOMAINS = OTHER_DOMAINS;
module.exports.getModifiedFromOtherDomains = getModifiedFromOtherDomains;
module.exports.testSpecial = testSpecial;
module.exports.testProject = testProject;
module.exports.testProjectOrCustom = testProjectOrCustom;
module.exports.simplifyCustom = simplifyCustom;
module.exports.testCustom = testCustom;
module.exports.testStorageDisk = testStorageDisk;
module.exports.testPlugin = testPlugin;
module.exports.isACMEChallenge = isACMEChallenge;