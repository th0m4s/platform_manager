const NodeCache = require("node-cache"), projects_cache = new NodeCache(), domains_cache = new NodeCache(), domains_valid_cache = new NodeCache(), ids_cache = new NodeCache();
const runtime_cache_delay = 60000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const database_server = require("./database_server");
const path = require("path");
const plugins_manager = require("./plugins_manager");
const rgit_manager = require("./remote_git/remote_git_manager");
const simpleGit = require("simple-git/promise");
const intercom = require("./intercom/intercom_client").connect();
const docker_manager = require("./docker_manager");
const plans_manager = require("./plans_manager");
const mail_manager = require("./mails/mail_manager");
const rmfr = require("rmfr");

const pfs = require("fs").promises;
const PROJECTS_PATH = process.env.PROJECTS_PATH;

// TODO: change Project to a class
/**
 * Represents a project fetched from the database.
 * @typedef {{id: number, name: string, ownerid: number, userenv: Object, customconf: Object, type: string | null, version: number, plugins: Object, autostart: boolean, forcepush: boolean, allow_https: boolean}} Project
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
                project.customconf = JSON.parse(project.customconf);
                project.plugins = JSON.parse(project.plugins);
                project.autostart = project.autostart.toLowerCase() == "true";
                project.forcepush = project.forcepush.toLowerCase() == "true";
                project.allow_https = project.allow_https.toLowerCase() == "true";

                return project;
            }
        });
    });
}

/**
 * Fetches a project from the cache or the database.
 * @param {string} project_name The name of the project to fetch.
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
 * @param {Object} customconf An object containing custom realtime configuration variables.
 * @param {string[]} plugins An array of plugins names.
 * @returns {Promise} A promise resolved when the project is successfully and completely created.
 */
function addProject(projectname, ownerid, env, customconf, plugins) {
    return plans_manager.canUserCreateProject(ownerid).then((canCreate) => {
        if(!canCreate) throw "User cannot create more projects.";
    }).then(() => {
        return database_server.database("projects").insert({name: projectname, ownerid, userenv: env, customconf, version: 0, plugins: {}}).then(() => {
            return pfs.mkdir(getProjectFolder(projectname)).then(() => {
                let repo = getProjectRepository(projectname);
                return Promise.all([pfs.mkdir(repo), pfs.mkdir(getProjectLogsFolder(projectname))]).then(() => {
                    return simpleGit(repo).init(true).then(() => {
                        let postUpdate = path.resolve(repo, "hooks", "post-update"), preReceive = path.resolve(repo, "hooks", "pre-receive");
                        return Promise.all([
                            pfs.writeFile(preReceive, "#!/bin/bash\necho predeploy:msg:" + projectname + " | netcat localhost 8042\nexit $(($(echo predeploy:exit:" + projectname + " | netcat localhost 8042)))").then(() => {
                                return pfs.chmod(preReceive, "700"); // or 0o700
                            }),
                            pfs.writeFile(postUpdate, "#!/bin/bash\ngit update-server-info\necho deploy:" + projectname + " | netcat localhost 8042").then(() => {
                                return pfs.chmod(postUpdate, "700");
                            })
                        ]);
                    });
                });
            });
        });
    }).then(() => {
        let configs = {}, pluginProm = [];
        plugins.forEach((plugin) => {
            if(plugin.trim().length > 0) {
                if(!plugins_manager.getPlugin(plugin).isProjectBased()) return;

                configs[plugin] = plugins_manager.getDefaultConfig(plugin);
                pluginProm.push(plugins_manager.install(plugin, projectname, configs[plugin]));
            }
        });

        return Promise.all(pluginProm).then(() => {
            return database_server.database("projects").where("name", projectname).update({plugins: configs});
        }).then(() => {
            return configs;
        });
    }).then((configs) => {
        let postInstalls = [];
        for(let plugin of Object.keys(configs))
            postInstalls.push(plugins_manager.postInstall(plugin, projectname, configs));

        return Promise.all(postInstalls);
    }).then(() => {
        return mail_manager.addProjectDomain(projectname);
    }).then(() => {
        return getIdFromName(projectname);
    }).then((id) => {
        intercom.send("projectsevents", {event: "add", project: projectname, owner: ownerid, id});

        return id;
    });
}

/**
 * Gets the id of a project from its name from the cache or the database.
 * @param {string} name The name of the project to find the id for.
 * @returns {number} The id of the requested project or 0 if the project doesn't exist.
 */
function getIdFromName(name) {
    if(ids_cache.has(name)) return Promise.resolve(ids_cache.get(name));
    else return database_server.database("projects").where("name", name).select("id").then((results) => {
        if(results.length == 0) return 0;
        else {
            let id = results[0].id;
            ids_cache.set(name, id);

            return id;
        }
    });
}

/**
 * Completely removes a project from the database, removing it's repository, container and plugins.
 * @param {string} projectname The project name to remove.
 * @returns {Promise} A promise resolved when the project is successfully removed.
 */
function deleteProject(projectname) {
    let project = undefined;
    return docker_manager.isProjectContainerRunning(projectname).then((isrunning) => {
        return (isrunning ? intercom.sendPromise("dockermng", {command: "stopProject", project: projectname}) : Promise.resolve());
    }).then(() => {
        invalidateCachedProject(projectname);
        return getProject(projectname);
    }).then((dbProject) => {
        project = dbProject;
        // save project ouside of promise to be used later in projectsevents

        let prom = [];
        for(let [key, value] of Object.entries(project.plugins)) {
            prom.push(plugins_manager.uninstall(key, projectname, value));
        }

        return Promise.all(prom);
    }).then(() => {
        return database_server.database("domains").where("projectname", projectname).select("*");
    }).then((domains_results) => {
        // remove domains from greenlock (removed from database in next then);
        for(let result of domains_results) {
            intercom.send("greenlock", {command: "removeCustom", domain: result.domain});
        }

        // now list git integrations
        return rgit_manager.listIntegrations(projectname);
    }).then((gitIntegrations) => {
        // remove git integrations
        return Promise.all(Object.keys(gitIntegrations).map((x) => rgit_manager.getRemote(x).then((remote) => remote.removeIntegration(projectname, project.ownerid))));
    }).then(() => {
        return Promise.all([
            database_server.database("projects").where("name", projectname).delete(),
            /*database_server.database("domains").where("projectname", projectname).delete(),
            database_server.database("collabs").where("projectname", projectname).delete(),*/
            rmfr(getProjectFolder(projectname))
        ]);
    }).then(() => {
        invalidCachedDomain(projectname);
        invalidateCachedProject(projectname);
        intercom.send("projectsevents", {event: "delete", project: project});
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
 * @param {boolean} full_dns Delegate the entire zone to the Platform Manager.
 * @returns {Promise} A promise resolved when the domain is added to the database (HTTPS might not be enabled instantly). 
 */
function addCustomDomain(projectname, custom_domain, enablesub, full_dns) {
    intercom.send("greenlock", {command: "addCustom", domain: custom_domain, full_dns}) // if https not enabled, no greenlock callback will be executed
    return database_server.database("domains").insert({domain: custom_domain, projectname, enablesub: enablesub ? "true" : "false", full_dns: full_dns ? "true" : "false"}).then(() => {
        return database_server.database("domains").where("domain", custom_domain).select("id");
    }).then((results) => {
        if(results.length == 0) throw "Cannot add custom domain into database (empty id result.)";
        return mail_manager.addCustomDomain(projectname, custom_domain, results[0].id);
    });
}

/**
 * Adds a collaborator to a project into the database.
 * @param {string} projectname The project name to add the collaborator to.
 * @param {string} username The username of the collaborator.
 * @param {"view" | "manage"} mode The collaboration mode (*view* or *manage*).
 * @returns {Promise} A promise resolved with the user id when the collaborator is added into the database.
 */
function addCollaborator(projectname, username, mode = "view") {
    return database_server.findUserId(username).then((id) => {
        return database_server.database("collabs").insert({projectname: projectname, userid: id, mode: mode}).then(() => {
            return id;
        });
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
            ids_cache.del(message.project);
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

function _getProjectImage(project_name) {
    return "pmng/build_" + project_name;
    // TODO: is cache useful (as no function is called, just strings concat)
}; const getProjectImage = runtime_cache(_getProjectImage);

function _getProjectStorage(project_name) {
    return path.join(process.env.PLUGINS_PATH, "storages", "mounts", project_name);
}; const getProjectStorage = runtime_cache(_getProjectStorage);

/**
 * Gets a valid URL bound to a project.
 * @param {string} projectname The project to find the URL for.
 * @returns {string} The project subdomain or the first custom domain if at least one exists.
 */
function getProjectUrl(projectname) {
    let protocol = "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://";
    return database_server.database("domains").where("projectname", projectname).orderBy("id", "asc").limit(1).select("*").then((results) => {
        if(results.length == 0) return protocol + projectname + "." + process.env.ROOT_DOMAIN;
        else {
            let domain = results[0];
            return protocol + (domain.enablesub == "true" ? "www." : "") + domain.domain;
        }
    });
}

/**
 * Adds a new URL property to a Project structure.
 * @param {Project} project The original project structure to find a URL for.
 * @returns {Project} A project with a new URL property from getProjectUrl.
 */
async function addProjectUrl(project) {
    project.url = await getProjectUrl(project.name);
    return project;
}

/**
 * Sanitizes a project structure by keeping only non-sensitive fields.
 * @param {Project} project The project to sanitize.
 * @returns {Project} A new Project structure with only essential fields.
 */
function sanitizeProject(project) {
    return {id: project.id, version: project.version, name: project.name, type: project.type};
}

/**
 * Gets an array of owned projects.
 * @param {number} userId The owner of the projects to find.
 * @param {number} after The last fetched project (exclusive).
 * @param {number} limit The maximum amount of projects to fetch.
 * @param {boolean} sanitize Whether or not sanitize projects by removing unecessary informations.
 * @returns {{projects: Project[], hasMore: boolean}} An object with the projects and a hasMore property to indicate if more projects are available for a next call.
 */
function listOwnedProjects(userId, after, limit, sanitize = true) {
    return database_server.database("projects").where("ownerid", userId).andWhere("id", ">", after).limit(limit+1).select("*").then((results) => {
        let prom = [], projects = results.slice(0, limit).map(sanitize ? sanitizeProject : (x) => x);
        for(let project of projects)
            prom.push(addProjectUrl(project));
        // projects is modified in place, so just wait for all promises to resolve then use the same array as a return value

        return Promise.all(prom).then(() => {
            return {projects, hasMore: results.length > limit};
        });
    });
}

/**
 * Gets an array of projects where a user is a collaborator.
 * @param {number} userId The user with the collaborations.
 * @param {number} after The last fetched project (exclusive).
 * @param {number} limit The maximum amount of projects to fetch.
 * @param {boolean} sanitize Whether or not sanitize projects by removing unecessary informations.
 * @returns {{projects: Project[], hasMore: boolean}} An object with the projects and a hasMore property to indicate if more projects are available for a next call.
 */
function listCollabProjects(userId, after, limit, sanitize = true) {
    return database_server.database("collabs").where("userid", userId).andWhere("id", ">", after).select("*").limit(limit+1).then((results) => {
        let res = {};
        results.forEach((result) => {
            res[result.projectname] = result;
        });
        return getMultipleProjects(Object.keys(res), false).then((objects) => {
            let prom = [], projects = [];
            for(let [key, value] of Object.entries(objects)) {
                let project = sanitize ? sanitizeProject(value) : value;
                projects.push({project, mode: res[key].mode, id: res[key].id});
                prom.push(addProjectUrl(project));
                // the project will be modified in place for each result
            }

            return Promise.all(prom).then(() => {
                return {projects: projects.slice(0, limit), hasMore: results.length > limit};
            });
        });
    });
}

/**
 * Checks if a user can access a project.
 * @param {string} projectname The project to check.
 * @param {number} userid The id of the user that want the access.
 * @param {boolean} manageMode Check against that mode.
 * @returns {Promise<string>} A promise resolved with *projectName* if the user has sufficient permissions, else rejected with an error message.
 * All collaborations can *view* a project, but the *manage* mode requires to be set in the database as it enables modifications on the project.
 */
function canAccessProject(projectname, userid, manageMode) {
    return database_server.database("projects").where("name", projectname).select("ownerid").then((results) => {
        if(results == null || results.length != 1) return Promise.reject({error: true, code: 404, message: "Project doesn't exist."});
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
module.exports.getIdFromName = getIdFromName;
module.exports.deleteProject = deleteProject;
module.exports.addCustomDomain = addCustomDomain;
module.exports.addCollaborator = addCollaborator;
module.exports.getProjectRepository = getProjectRepository;
module.exports.getProjectFolder = getProjectFolder;
module.exports.getProjectLogsFolder = getProjectLogsFolder;
module.exports.getProjectDeployFolder = getProjectDeployFolder;
module.exports.getProjectBuild = getProjectBuild;
module.exports.getProjectImage = getProjectImage;
module.exports.getProjectStorage = getProjectStorage;
module.exports.getProjectFromCustomDomain = getProjectFromCustomDomain;
module.exports.invalidateCachedProject = invalidateCachedProject;
module.exports.invalidCachedDomain = invalidCachedDomain;
module.exports.checkCustomDomain = checkCustomDomain;
module.exports.projectExists = projectExists;
module.exports.getProjectUrl = getProjectUrl;
module.exports.addProjectUrl = addProjectUrl;
module.exports.listOwnedProjects = listOwnedProjects;
module.exports.listCollabProjects = listCollabProjects;
module.exports.setPluginsConfig = setPluginsConfig;
module.exports.canAccessProject = canAccessProject;