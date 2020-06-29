const project_regex = new RegExp("^(?<project>[a-z-0-9]{4,32})\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
const special_regex = new RegExp("^(?<special>www|admin|git|ns(1|2)|ftp)\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
// same values as in forbidden_names in projects_api

const plugin_regex = new RegExp("^plugin_(?<plugin>[a-z-0-9]{4,32}).js$");
const storageDisk_regex = new RegExp("^(?<project>[a-z-0-9]{4,32}).img$");
const project_manager = require("./project_manager");

function testSpecial(domain) {
    let match = domain.match(special_regex);
    if(match != null) return match.groups.special;
    else return null;
}

function testProject(domain) {
    let match = domain.match(project_regex);
    if(match != null) return match.groups.project;
    else return null;
}

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

function testPlugin(filename) {
    let match = filename.match(plugin_regex);
    if(match != null) return match.groups.plugin;
    else return null;
}

function testStorageDisk(filename) {
    let match = filename.match(storageDisk_regex);
    if(match != null) return match.groups.project;
    else return null;
}

module.exports.testSpecial = testSpecial;
module.exports.testProject = testProject;
module.exports.testCustom = testCustom;
module.exports.testStorageDisk = testStorageDisk;
module.exports.testPlugin = testPlugin;