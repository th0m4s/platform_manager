const NodeCache = require("node-cache"), projects_cache = new NodeCache(), domains_cache = new NodeCache(), domains_valid_cache = new NodeCache();
const runtime_cache_delay = 60000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const database_server = require("./database_server");
const path = require("path");
const plugins_manager = require("./plugins_manager");
const simpleGit = require("simple-git/promise");
const intercom = require("./intercom/intercom_client").connect();

const pfs = require("fs").promises;
const PROJECTS_PATH = process.env.PROJECTS_PATH;


function _getProject(project_name, check = true) {
    return (check ? projectExists(project_name) : Promise.resolve()).then(() => {
        return database_server.database("projects").where("name", project_name).select("*").then((lines) => {
            if(lines.length != 1) return Promise.reject("Invalid project: Unable to select database record.");
            else {
                let project = lines[0];
                project.userenv = JSON.parse(project.userenv);
                project.plugins = JSON.parse(project.plugins);

                return project;
            }
        });
    });
}

function getProject(project_name, check = true) {
    if(projects_cache.has(project_name)) return Promise.resolve(projects_cache.get(project_name));
    else return _getProject(project_name, check).then(project => {
        projects_cache.set(project_name, project, 300);
        return project;
    });
}

function addProject(projectname, ownerid, env, plugins) {
    let configs = {};
    plugins.forEach((plugin) => {
        if(plugin.trim().length > 0) configs[plugin] = plugins_manager.getDefaultConfig(plugin);
    });
    return database_server.database("projects").insert({name: projectname, ownerid: ownerid, userenv: env, version: 0, plugins: configs}).then(() => {
        return pfs.mkdir(getProjectFolder(projectname)).then(() => {
            let repo = getProjectRepository(projectname);
            return Promise.all([pfs.mkdir(repo), pfs.mkdir(getProjectLogsFolder(projectname))]).then(() => {
                return simpleGit(repo).init(true).then(() => {
                    let postUpdate = path.resolve(repo, "hooks", "post-update");
                    return pfs.writeFile(postUpdate, "#!/bin/bash\ngit update-server-info\necho deploy:" + projectname + " | netcat localhost 8042").then(() => {
                        return pfs.chmod(postUpdate, "700"); // or 0o700
                    });
                });
            });
        });
    });
}

function _getProjectFromCustomDomain(custom_domain) {
    return database_server.database("domains").where("domain", custom_domain).select("projectname").then((results) => {
        if(results == null || results.length != 1) return Promise.reject("Invalid domain: No corresponding project found");
        else return getProject(results[0].projectname);
    });
}

function _checkCustomDomain(custom_domain, useSub) {
    return database_server.database("domains").where("domain", custom_domain).select(["projectname", "enablesub"]).then((results) => {
        if(results == null || results.length != 1) return false
        else if(useSub && results[0].enablesub == "false") return false;
        else return results[0].projectname;
    });
}

function checkCustomDomain(custom_domain, useSub) {
    let search = custom_domain + "_" + (useSub ? "true" : "false");
    if(domains_valid_cache.has(search)) return domains_valid_cache.get(search);
    else {
        let res = _checkCustomDomain(custom_domain, useSub);
        domains_valid_cache.set(search, res, 300);
        return res;
    }
}

function addCustomDomain(projectname, custom_domain, enablesub) {
    return database_server.database("domains").insert({domain: custom_domain, projectname: projectname, enablesub: enablesub ? "true" : "false"});
}

function addCollaborator(projectname, username, mode) {
    return database_server.findUserId(username).then((id) => {
        return database_server.database("collabs").insert({projectname: projectname, userid: id, mode: mode});
    });
}

function getProjectFromCustomDomain(custom_domain) {
    if(domains_cache.has(custom_domain)) return Promise.resolve(domains_cache.get(custom_domain));
    else return _getProjectFromCustomDomain(custom_domain).then(project => {
        domains_cache.set(custom_domain, project, 300);
        return project;
    });
}

function getMultipleProjects(names, check = true) {
    let promises = [];
    names.forEach((name) => { promises.push(getProject(name, false)); });
    return Promise.all(promises).then((results) => {
        let projects = {};
        results.forEach((result) => {
            projects[result.name] = result;
        });
        return projects;
    });
}

// public function that broadcasts the command
function invalidateCachedProject(project_name) {
    intercom.send("projectsmng", {command: "invalidateProject", project: project_name});
}

// public function that broadcasts the command
function invalidCachedDomain(custom_domain) {
    intercom.send("projectsmng", {command: "invalidateDomains", domain: custom_domain})
}

intercom.subscribe(["projectsmng"], (message) => {
    switch(message.command) {
        case "invalidateProject":
            projects_cache.del(message.project);
            break;
        case "invalidateDomains":
            let custom_domain = message.domain;
            domains_cache.del(custom_domain);
            domains_valid_cache.del(custom_domain + "_true");
            domains_valid_cache.del(custom_domain + "_false");
            break;
    }
}); 

function projectExists(project_name) {
    return Promise.all([
        pfs.access(getProjectFolder(project_name)).then(() => {return true;}).catch(() => {return Promise.reject("Project does not exists: Unable to access project foler.")}),
        database_server.database("projects").select("*").where("name", project_name).count("id AS cnt").then((total) => {
            return total[0].cnt > 0;
        })
    ]).then((results) => {
        if(!results.includes(false)) return true;
        else return Promise.reject("Project does not exists: Unable to find project in database.");
    });
}

function _getProjectFolder(project_name) {
    return path.join(PROJECTS_PATH, project_name);
}; const getProjectFolder = runtime_cache(_getProjectFolder);

function _getProjectRepository(project_name) {
    return path.join(getProjectFolder(project_name), project_name + ".git");
}; const getProjectRepository = runtime_cache(_getProjectRepository);

function _getProjectLogsFolder(project_name) {
    return path.join(getProjectFolder(project_name), "logs");
}; const getProjectLogsFolder = runtime_cache(_getProjectLogsFolder);

function _getProjectDeployFolder(project_name, starting) {
    return path.join(getProjectFolder(project_name), starting ? "starting" : "deploying");
}; const getProjectDeployFolder = runtime_cache(_getProjectDeployFolder);

function _getProjectBuild(project_name, save = false) {
    return path.join(getProjectFolder(project_name), "build." + (save ? "save." : "") + "tgz");
}; const getProjectBuild = runtime_cache(_getProjectBuild);

function listOwnedProjects(userId, after, limit) {
    return database_server.database("projects").where("ownerid", userId).andWhere("id", ">", after).select("*").then((results) => {
        return {projects: results.slice(0, limit), hasMore: results.length > limit};
    });
}

function listCollabProjects(userId, after, limit) {
    return database_server.database("collabs").where("userid", userId).andWhere("id", ">", after).select("*").then((results) => {
        let res = {};
        results.forEach((result) => {
            res[result.projectname] = result;
        });
        return getMultipleProjects(Object.keys(res), false).then((objects) => {
            let projects = [];
            for(let [key, value] of Object.entries(objects)) {
                projects.push({project: value, mode: res[key].mode, id: res[key].id});
            }
            return {projects: projects.slice(0, limit), hasMore: results.length > limit};
        });
    });
}

function canAccessProject(projectname, userid, manageMode) {
    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results == null || results.length != 1) return Promise.reject({error: true, code: 405, message: "Project doesn't exist."});
        else if(results[0].ownerid === userid) return projectname; // user owns project
        else return database_server.database("collabs").where("projectname", projectname).andWhere("userid", userid).select("mode").then((results) => {
            if(results == null || results.length != 1) return Promise.reject({error: true, code: 403, message: "Not a collaborator."});
            else if(results[0].mode === "view" && manageMode) return Promise.reject({error: true, code: 403, message: "Not enough privileges."});
            else return projectname; // correct access mode for collab
        });
    })
}


module.exports.getProject = getProject;
module.exports.addProject = addProject;
module.exports.addCustomDomain = addCustomDomain;
module.exports.addCollaborator = addCollaborator;
module.exports.getProjectRepository = getProjectRepository;
module.exports.getProjectFolder = getProjectFolder;
module.exports.getProjectLogsFolder = getProjectLogsFolder;
module.exports.getProjectDeployFolder = getProjectDeployFolder;
module.exports.getProjectBuild = getProjectBuild;
module.exports.getProjectFromCustomDomain = getProjectFromCustomDomain;
module.exports.invalidateCachedProject = invalidateCachedProject;
module.exports.invalidCachedDomain = invalidCachedDomain;
module.exports.checkCustomDomain = checkCustomDomain;
module.exports.projectExists = projectExists;
module.exports.listOwnedProjects = listOwnedProjects;
module.exports.listCollabProjects = listCollabProjects;
module.exports.canAccessProject = canAccessProject;