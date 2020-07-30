const NodeCache = require("node-cache"), projects_cache = new NodeCache(), domains_cache = new NodeCache(), domains_valid_cache = new NodeCache();
const runtime_cache_delay = 60000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const database_server = require("./database_server");
const path = require("path");
const plugins_manager = require("./plugins_manager");
const simpleGit = require("simple-git/promise");
const intercom = require("./intercom/intercom_client").connect();

const pfs = require("fs").promises;
const PROJECTS_PATH = process.env.PROJECTS_PATH;

// TODO: change Project to a class
/**
 * Represents a user fetched from the database.
 * @typedef{{id: number, name: string, ownerid: number, userenv: Object, type: string | null, version: number, plugins: Object, autostart: false}} Project
*/

/**
 * Fetches a project from the database.
 * @param {string} project_name The name of the project to find.
 * @param {boolean} check Checks if the project exists before fetching it (result is also rejected if set *false* and if project doesn't exist).
 * @return {Promise<Project>} A promise resolved with the project if it exists.
 */
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

/**
 * Fetches a project from the cache or the database.
 * @param {string} project_name 
 * @param {boolean} check Checks if the project exists before fetching it (result is also rejected if set *false* and if project doesn't exist).
 * @returns {Promise<Project>} A promise resolved with the project if it exists.
 */
function getProject(project_name, check = true) {
    if(projects_cache.has(project_name)) return Promise.resolve(projects_cache.get(project_name));
    else return _getProject(project_name, check).then(project => {
        projects_cache.set(project_name, project, 300);
        return project;
    });
}

/**
 * Creates a project, installing all corresponding plugins and prepares the filesystem (including git repository).
 * @param {string} projectname The name of the project to create.
 * @param {number} ownerid The id of the owner that will own that project.
 * @param {Object} env An object with properties corresponding to the project environment variables.
 * @param {string[]} plugins An array of plugins names.
 * @returns {Promise} A promise resolved when the project is successfully and completely created.
 */
function addProject(projectname, ownerid, env, plugins) {
    let configs = {}, pluginProm = [];
    plugins.forEach((plugin) => {
        if(plugin.trim().length > 0) {
            configs[plugin] = plugins_manager.getDefaultConfig(plugin);
            pluginProm.push(plugins_manager.install(plugin, projectname, configs[plugin]));
        }
    });
    return Promise.all(pluginProm).then(() => {
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
    });
}

/**
 * Gets the project name associated with a custom domain.
 * @param {string} custom_domain A custom domain to check
 * @returns {Promise<string>} A promise resolved with the project name (or a rejection if not found). 
 */
function _getProjectFromCustomDomain(custom_domain) {
    return database_server.database("domains").where("domain", custom_domain).select("projectname").then((results) => {
        if(results == null || results.length != 1) return Promise.reject("Invalid domain: No corresponding project found");
        else return getProject(results[0].projectname);
    });
}

/**
 * Gets the project associated with a custom domain (like *_getProjectFromCustomDomain()*) but can require subs to be enabled.
 * @param {string} custom_domain The custom domain to check.
 * @param {boolean} useSub Check if subs are enabled.
 * @returns {Promise<string | boolean>} A promise resolved with a project name or *false* if the domain is not found or doesn't have subs enabled (and they were required with *useSub* = *true*).
 */
function _checkCustomDomain(custom_domain, useSub) {
    return database_server.database("domains").where("domain", custom_domain).select(["projectname", "enablesub"]).then((results) => {
        if(results == null || results.length != 1) return false
        else if(useSub && results[0].enablesub == "false") return false;
        else return results[0].projectname;
    });
}

/**
 * Gets the project associated with a custom domain (like *getProjectFromCustomDomain()*) but can require subs to be enabled (with cached results).
 * @param {string} custom_domain The custom domain to check.
 * @param {boolean} useSub Check if subs are enabled.
 * @returns {Promise<string | boolean>} A promise resolved with a project name or *false* if the domain is not found or doesn't have subs enabled (and they were required with *useSub* = *true*).
 */
function checkCustomDomain(custom_domain, useSub) {
    let search = custom_domain + "_" + (useSub ? "true" : "false");
    if(domains_valid_cache.has(search)) return domains_valid_cache.get(search);
    else {
        let res = _checkCustomDomain(custom_domain, useSub);
        domains_valid_cache.set(search, res, 300);
        return res;
    }
}

/**
 * Adds a custom domain for a project into the database.
 * @param {string} projectname The project name to add the domain to.
 * @param {string} custom_domain The custom domain to add.
 * @param {boolean} enablesub Whether enable the subdomains for the domain.
 * @returns {Promise} A promise resolved when the domain is added to the database (HTTPS might not be enabled instantly). 
 */
function addCustomDomain(projectname, custom_domain, enablesub) {
    intercom.send("greenlock", {command: "addCustom", domain: custom_domain}) // if https not enabled, no greenlock callback will be executed
    return database_server.database("domains").insert({domain: custom_domain, projectname: projectname, enablesub: enablesub ? "true" : "false"});
}

/**
 * Adds a collaborator to a project into the database.
 * @param {string} projectname The project name to add the collaborator to.
 * @param {string} username The username of the collaborator.
 * @param {"view" | "manage"} mode The collaboration mode (*view* or *manage*).
 * @returns {Promise} A promise resolved when the collaborator is added into the database.
 */
function addCollaborator(projectname, username, mode = "view") {
    return database_server.findUserId(username).then((id) => {
        return database_server.database("collabs").insert({projectname: projectname, userid: id, mode: mode});
    });
}

/**
 * Gets the project associated with a custom domain with cached results.
 * @param {string} custom_domain The custom domain to check.
 * @param {boolean} useSub Check if subs are enabled.
 * @returns {Promise<string | boolean>} A promise resolved with a project name or rejected if the domain is not found.
 */
function getProjectFromCustomDomain(custom_domain) {
    if(domains_cache.has(custom_domain)) return Promise.resolve(domains_cache.get(custom_domain));
    else return _getProjectFromCustomDomain(custom_domain).then(project => {
        domains_cache.set(custom_domain, project, 300);
        return project;
    });
}

/**
 * Gets multiple projects from the cache or the database (like *getProject()*).
 * @param {string[]} names The project names to fetch. 
 * @param {boolean} check Check if projects exist before fetching.
 * @returns {Object} Returns an object with a property for each project. 
 */
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
/**
 * Invalidates the cache of all the processes about a project.
 * @param {string} project_name The project name to invalidate.
 */
function invalidateCachedProject(project_name) {
    intercom.send("projectsmng", {command: "invalidateProject", project: project_name});
}

// public function that broadcasts the command
/**
 * Invalidates the cache of all the processes about a custom domain.
 * @param {string} custom_domain The custom domain to invalidate.
 */
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

/**
 * Checks if a project exists.
 * @param {string} project_name The project name to check.
 * @returns {Promise<true>} A promise resolved with *true* if the project exists, else rejected with an error message.
 */
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

/**
 * Sets the configuration of all plugins for a specific project.
 * @param {string} project_name The project name to save the configuration for.
 * @param {Object} allConfig The plugins configurations.
 * @returns {Promise} A promise resolved when the configuration is saved.
 */
function setPluginsConfig(project_name, allConfig) {
    return database_server.database("projects").where("name", project_name).update({plugins: JSON.stringify(allConfig)}).then(() => {
        invalidateCachedProject(project_name);
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

function _getProjectStorage(project_name) {
    return path.join(process.env.PLUGINS_PATH, "storages", "mounts", project_name);
}; const getProjectStorage = runtime_cache(_getProjectStorage);

/**
 * Gets an array of owned projects.
 * @param {number} userId The owner of the projects to find.
 * @param {number} after The last fetched project (exclusive).
 * @param {number} limit The maximum amount of projects to fetch.
 * @returns {{projects: Project[], hasMore: boolean}} An object with the projects and a hasMore property to indicate if more projects are available for a next call.
 */
function listOwnedProjects(userId, after, limit) {
    return database_server.database("projects").where("ownerid", userId).andWhere("id", ">", after).select("*").then((results) => {
        return {projects: results.slice(0, limit), hasMore: results.length > limit};
    });
}

/**
 * Gets an array of projects where a user is a collaborator.
 * @param {number} userId The user with the collaborations.
 * @param {number} after The last fetched project (exclusive).
 * @param {number} limit The maximum amount of projects to fetch.
 * @returns {{projects: Project[], hasMore: boolean}} An object with the projects and a hasMore property to indicate if more projects are available for a next call.
 */
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

/**
 * Checks if a user can access a project.
 * @param {string} projectname The project to check.
 * @param {number} userid The id of the user that want the access.
 * @param {"view" | "manage"} manageMode Check against that mode.
 * @returns {Promise<string>} A promise resolved with *projectName* if the user has sufficient permissions, else rejected with an error message.
 * All collaborations can *view* a project, but the *manage* mode requires to be set in the database as it enables modifications on the project.
 */
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
module.exports.getProjectStorage = getProjectStorage;
module.exports.getProjectFromCustomDomain = getProjectFromCustomDomain;
module.exports.invalidateCachedProject = invalidateCachedProject;
module.exports.invalidCachedDomain = invalidCachedDomain;
module.exports.checkCustomDomain = checkCustomDomain;
module.exports.projectExists = projectExists;
module.exports.listOwnedProjects = listOwnedProjects;
module.exports.listCollabProjects = listCollabProjects;
module.exports.setPluginsConfig = setPluginsConfig;
module.exports.canAccessProject = canAccessProject;