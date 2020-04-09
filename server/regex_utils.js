const project_regex = new RegExp("^(?<project>[a-z-0-9]{4,32})\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
const special_regex = new RegExp("^(?<special>admin|git|ns(1|2))\\\." + process.env.ROOT_DOMAIN.replace(/\./g, "\\.") + "$");
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

module.exports.testSpecial = testSpecial;
module.exports.testProject = testProject;
module.exports.testCustom = testCustom;