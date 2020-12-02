const Docker = require("node-docker-api").Docker;
const project_manager = require("./project_manager");
const intercom = require("./intercom/intercom_client").connect();
const fs = require("fs"), pfs = fs.promises;
const rmfr = require("rmfr");
const tar = require("tar");
const tar_stream = require("tar-stream"),  tar_fs = require('tar-fs');;
const path = require("path");
const logger = require("./platform_logger").logger();
const database_server = require("./database_server");
const plugins_manager = require("./plugins_manager");
const plans_manager = require("./plans_manager");
const child_process = require("child_process");
const regex_utils = require("./regex_utils");
const privileges = require("./privileges");
const treekill = require("tree-kill");
const DockerContainer = require("node-docker-api/lib/container").Container;

const docker = new Docker(Object.assign({version: process.env.DOCKER_API_VERSION}, process.env.DOCKER_MODE == "socket" ? {socketPath: process.env.DOCKER_SOCKET} : {protocol: process.env.DOCKER_MODE, host: process.env.DOCKER_HOST, port: parseInt(process.env.DOCKER_PORT)}));
// even if (await docker.version()).ApiVersion is always set to last version, requests will behave like specified in DOCKER_API_VERSION

/**
 * Gets the name of the main container for a specific project.
 * @param {string} projectname The project name for the container.
 * @returns {string} The full container name for that project.
 */
function getProjectMainContainer(projectname) {
    return "pmng_" + projectname + "_main";
}

/**
 * Gets the name of the deploy container for a specific project.
 * @param {string} projectname The project name for the container.
 * @returns {string} The full container name for that project.
 */
function getProjectDeployingContainer(projectname) {
    return "pmng_" + projectname + "_deploying";
}

/**
 * Gets the name of a specific plugin container for a specific project.
 * @param {string} projectname The project name associated with the plugin.
 * @param {string} plugin The plugin name for the container.
 * Cannot be main, net nor deploying (reserved for main container and project network).
 * @returns {string} The container name for this combination of plugin and project.
 */
function getProjectPluginContainer(projectname, plugin) {
    return "pmng_" + projectname + "_" + plugin;
}

/**
 * Gets the network name of a specific project.
 * @param {string} projectname The project name for the network.
 * @returns {string} The network name for that project.
 */
function getProjectNetworkName(projectname) {
    return "pmng_" + projectname + "_net";
}

/**
 * Tests if a project is currently running in a Docker container.
 * @param {string} projectname The project to test.
 * @returns {Promise<boolean>} A promise resolved with *true* if this project is running, *false* otherwise.
 */
function isProjectContainerRunning(projectname) {
    return docker.container.list({filters: {name: [getProjectMainContainer(projectname)]}}).then((containers) => {
        return containers.length > 0 && containers[0].data.State == "running";
    });
}

/**
 * Tests if multiple projects are running inside their own Docker container.
 * @param {string[]} projects An array of projects names to test.
 * @returns {Promise<Object>} A promise resolved with an object including each project as a property. *true* if the project is running, *false* otherwise.
 */
function areProjectContainersRunning(projects) {
    return docker.container.list().then((containers) => {
        let byName = {};
        containers.forEach((container) => {
            let name = container.data.Names[0];
            name = name.substring(1, name.length);
            byName[name] = container;
        });

        let results = {};
        projects.forEach((project) => {
            let containerName = getProjectMainContainer(project);
            if(byName[containerName] !== undefined) {
                results[project] = byName[containerName].data.State == "running";
            } else {
                results[project] = false;
            }
        });

        return results;
    });
}

let startingProjects = [], stoppingProjects = [], intervalId = -1;
/**
 * Registers all the Docker intercom callbacks on the main thread.
 * @returns {Promise} A promise resolved when the Docker manager is fully enabled on the main thread.
 */
async function maininstance() {
    let delayWaited = 0, delayNeeded = parseInt(process.env.DOCKER_START_DELAY), intervalDelay = 500, messageSent = false;
    while(true) {
        try {
            await docker.ping();
            break;
        } catch(error) {
            if(!messageSent) {
                logger.info("Docker not running. Waiting for initialization....");
                messageSent = true;
            }

            if(delayWaited >= delayNeeded) {
                logger.warn("Docker not running. Cannot continue.");
                // removing pid file as we are still with root permissions
                await pfs.unlink("/var/run/pmng.pid");
                treekill(process.pid); // kill subprocesses (like intercom - others are not started)
            }

            await new Promise((resolve) => {
                setTimeout(resolve, intervalDelay);
            }); // wait before new try
            delayWaited += intervalDelay;
        }
    }

    logger.tag("DOCKER", "Docker is running.");
    
    // required images like panels/servers/... are ensured just before container creation, with the exception of php images required by panels
    const required_images = [
        {name: "pmng/base", dockerfile: "file:" + path.resolve(__dirname, "docker_images", "base", "Dockerfile")},
        {name: "pmng/apache2-php7", dockerfile: "file:" + path.resolve(__dirname, "docker_images", "php", "apache-php")},
        {name: "pmng/nginx-php7", dockerfile: "file:" + path.resolve(__dirname, "docker_images", "php", "nginx-php")}
    ];

    logger.tag("DOCKER", "Checking default required images...");
    for(let requiredImage of required_images)
        await ensureImageExists(requiredImage.name, requiredImage.dockerfile, {latest: true, adminLogs: true});

    logger.tag("DOCKER", "Starting global plugins...");
    // loading plugins (starting global plugins containers)
    // paths relative to platform.js:
    //    - plugins is normally the data directory
    //    - server/plugins contains the plugins scripts
    pluginsConfigFile = path.join(process.env.PLUGINS_PATH, "config.json");
    await pfs.readFile(pluginsConfigFile).then((config) => {
        config = JSON.parse(config);

        return pfs.readdir("./pmng_server/plugins").then((files) => {
            let prom = [], hooksStarted = [];
            files.forEach((file) => {
                let pluginname = regex_utils.testPlugin(file);
                if(pluginname !== null) {
                    if(config[pluginname] == undefined) {
                        config[pluginname] = {};
                    }

                    let plugin = plugins_manager.getPlugin(pluginname);
                    hooksStarted.push(plugin.initializeHooks);
                    prom.push(plugin.startGlobalPlugin(path.join(process.env.PLUGINS_PATH, pluginname), config[pluginname], (newConfig) => {
                        config[pluginname] = newConfig;
                        return pfs.writeFile(pluginsConfigFile, JSON.stringify(config));
                    }).catch((error) => {
                        throw {pluginname, error};
                    }));
                }
            });

            plugins_manager.waitForHooks().then(() => {
                for(let cb of hooksStarted) {
                    cb();
                }
            });

            Promise.allSettled(prom).then((states) => {
                states.forEach((state) => {
                    if(state.status != "fulfilled") {
                        logger.warn("Cannot start global plugin " + state.reason.pluginname + ": " + state.reason.error);
                    }
                });
            });
        });
    });

    intercom.subscribe(["dockermng"], (message, respond) => {
        let projectname = message.project || ""; // some commands don't need project
        switch(message.command) {
            case "stopProject":
                stopProject(projectname).then(() => {
                    respond({error: false, message: "Project stopped."});
                }).catch((error) => {
                    respond({error: true, message: error});
                });
                break;
            case "startProject":
                startProject(projectname).then(() => {
                    clearStarting(projectname).then(() => respond({error: false, message: "Project started."}));
                }).catch((error) => {
                    clearStarting(projectname).then(() => respond({error: true, message: error}));
                });
                break;
            case "getPort":
                if(portMappings.hasOwnProperty(projectname)) respond({error: false, port: portMappings[projectname]});
                else respond({error: true});
            case "requestPorts":
                respond(portMappings);
                break;
            case "analyzeRunning":
                logger.info("Searching for running docker containers...");
                docker.container.list({filters: {label: ["pmng.containertype=project"]}}).then((containers) => {
                    let alreadyRunning = [];
                    if(containers.length > 0) {
                        logger.info("Indexing " + containers.length + " container(s).");

                        containers.forEach((container) => {
                            let projectname = container.data.Labels["pmng.projectname"];
                            alreadyRunning.push(projectname);
                            let port = -1;
                            container.data.Ports.some((portObject) => {
                                let actualPort = portObject.PublicPort;
                                if(actualPort >= firstPort/* && actualPort < firstPluginPort*/) {
                                    port = actualPort;
                                    return true;
                                } else return false;
                            });

                            if(port == -1) {
                                logger.warn(projectname + "container doesn't have a public port. Stopping it.");
                                container.stop();
                            } else {
                                logger.info("Binding " + projectname + " to port " + port);
                                attachLogs(projectname, container).then(() => {
                                    // container is working
                                    addPort(projectname, port);
                                }).catch((error) => {
                                    // something's wrong, stop the container
                                    logger.warn(projectname + " cannot be attached and will be stopped: " + error);
                                    stopProject(projectname, true);
                                });
                            }
                        });
                    } else logger.info("No containers running.");

                    database_server.isInstalled().then((result) => {
                        if(result) {
                            logger.info("Searching for autostart containers...");
                            database_server.database("projects").where("autostart", "true").select("*").then((results) => {
                                if(results == null || results.length == 0) logger.info("No autostart container found.");
                                else {
                                    let prom = [];
                                    results.forEach((result) => {
                                        if(!alreadyRunning.includes(result.name)) {
                                            logger.info("Autostarting " + result.name + "...");
                                            prom.push(startProject(result.name).then(() => {
                                                return result.name;
                                            }).catch((reason) => {
                                                throw {project: result.name, message: reason};
                                            }));
                                        }
                                    });

                                    if(prom.length > 0) {
                                        Promise.allSettled(prom).then((states) => {
                                            let successes = 0;
                                            states.forEach((state) => {
                                                if(state.status == "fulfilled") {
                                                    clearStarting(state.value);
                                                    successes++;
                                                } else {
                                                    clearStarting(state.reason.project);
                                                    logger.warn("Error during autostart: " + state.reason.message);
                                                }
                                            });

                                            if(successes > 0) logger.info("Successfully autostarted " + successes + " container(s).");
                                        });
                                    } else logger.info("No container to autostart (can already be up and running).");
                                }
                            });
                        }
                    });
                });
                break;
        }
    });

    intervalId = setInterval(() => {
        docker.container.list({filters: {label: ["pmng.containertype=project"]}}).then((containers) => {
            containers.forEach((container) => {
                if(container.data.Status.indexOf("unhealthy") !== -1) {
                    // unhealthy container == port not used
                    stopProject(container.data.Labels["pmng.projectname"], true);
                }
            });
        });
    }, 60*1000); // check containers every minute

    logger.tag("DOCKER", "Docker Manager initialized!");
}

/**
 * Only for main thread. Stops a project and clears all the associated resources (plugins containers and network).
 * @param {string} projectname The project name to stop.
 * @param {boolean} force If set to *true*, forces the stop even if the prechecks failed.
 * @returns {Promise} A promise resolved when the project is stopped and all the the associated plugins containers and network are removed.
 */
function stopProject(projectname, force = false) {
    return (force ? Promise.resolve(true) : isProjectContainerRunning(projectname)).then((result) => {
        if(!result) return Promise.reject("Cannot stop a stopped project.");
        stoppingProjects.push(projectname);
        logger.tag("DOCKER", "Stopping project " + projectname + "...", force ? "(forced)" : undefined);
        return docker.container.list({filters: {label: ["pmng.projectname=" + projectname/*, "pmng.containertype=plugin"*/]}}).then((containers) => {
            let prom = [];
            containers.forEach((container) => {
                // check if deployment instead of listing only plugins because must stop main container
                if(container.data.Labels["pmng.containertype"] != "deployment") {
                    prom.push(container.stop().catch((err) => {
                        if(!force) return Promise.reject("Cannot stop " + container.data.Names[0] + ": " + err);
                    })); // delete is automatic
                }
            });

            // updating database
            let dbProm = database_server.database("projects").where("name", projectname).update({autostart: "false"});

            removePort(projectname);

            let projectNetworkName = getProjectNetworkName(projectname);

            // project and per-project plugins stopped, executing plugin callbacks
            return project_manager.getProject(projectname).then((project) => {
                let pluginsProm = [];
                for(let [pluginName, pluginConfig] of Object.entries(project.plugins)) {
                    pluginsProm.push(plugins_manager.getPlugin(pluginName).stopProjectPlugin(projectname, pluginConfig, projectNetworkName));
                }

                return Promise.all(pluginsProm);
            }).then(() => {
                return Promise.all([Promise.all(prom).then(() => {
                    // when all containers are removed
                    // ... remove project network
                    return docker.network.list({filters: {name: [projectNetworkName]}}).then((networks) => {
                        return networks[0].remove().catch((err) => {
                            if(!force) return Promise.reject("Cannot remove network for project " + projectname + ": " + err);
                        });
                    });
                }), dbProm])
            }).then(() => {
                logger.tag("DOCKER", "Project " + projectname + " stopped.");
            });
        }).catch((error) => {
            logger.tagWarn("DOCKER", "Cannot stop project " + projectname + ":", error);
            throw error;
        });
    });
}

const LOGFILE_NAME = "project.log";
/**
 * Attachs to the logs of a container and writes them to a project specific file.
 * @param {string} projectname The name of the project for the file path.
 * @param {DockerContainer} container The container object to attach to.
 * @returns {Promise} A resolved promise when the logs are successfully attached.
 */
function attachLogs(projectname, container) {
    logger.tag("DOCKER", "Attaching logs to project " + projectname + "...");
    let logFile = path.resolve(project_manager.getProjectLogsFolder(projectname), LOGFILE_NAME);
    let logStream = fs.createWriteStream(logFile, {flags: "a"});
    return pfs.chown(logFile, ...privileges.droppingOptions(false)).then(() => {
        return container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            timestamps: true,
            since: Date.now()/1000
        });
    }).then((stream) => {
        stream.on("data", (log) => {
            let data = log.toString("utf-8").split("\n");
            data.forEach((line) => {
                if(line.length > 0) {
                    let cstream = line.charCodeAt(0);
                    line = line.slice(8);
            
                    let type = "UNK";
                    if(cstream == 1) type = "INF";
                    else if(cstream == 2) type = "ERR";

                    let parts = line.split(" ");
                    logStream.write(parts[0] + " " + type + " " + parts.slice(1).join(" ") + "\n");
                }
            });
        });

        stream.on("error", (err) => {
            logStream.write((new Date().toISOString()) + " SYS " + err);
        });

        stream.on("close", () => {
            logStream.close();
            if(stoppingProjects.includes(projectname)) {
                stoppingProjects.splice(stoppingProjects.indexOf(projectname), 1);
            } else {
                logger.warn("Container of project " + projectname + " was closed without stopping project.");
                stopProject(projectname, true).then(() => { // maybe use finally
                    stoppingProjects.splice(stoppingProjects.indexOf(projectname), 1);
                });
            }
        });
    }).then(() => {
        logger.tag("DOCKER", "Logs of project " + projectname + " attached.");
    }).catch((error) => {
        logger.tagWarn("DOCKER", "Could not attach to the logs of project " + projectname + ":", error);
        throw error;
    });
}

/**
 * Only for main thread. Starts a project container and its plugins.
 * @param {string} projectname The project to start.
 * @returns {Promise} A promise resolved when the project and all its resources (plugins, network) are created and started.
 */
function startProject(projectname) {
    return isProjectContainerRunning(projectname).then(async (result) => {
        if(result) return Promise.reject("Cannot start a running project.");

        if(startingProjects.includes(projectname)) return Promise.reject("Cannot start a starting project.");
        startingProjects.push(projectname);

        logger.tag("DOCKER", "Starting project " + projectname + "...");

        try {
            let project = await project_manager.getProject(projectname, true);

            // clear remaining secondary project containers (like plugins)
            // TODO: make this clear in a separate function (because same clear in stopProject)
            await docker.container.list({filters: {label: ["pmng.projectname=" + projectname/*, "pmng.containertype=plugin"*/]}}).then((containers) => {
                let prom = [];
                containers.forEach((container) => {
                    // like for stopProject, don't delete deployment
                    if(container.data.Labels["pmng.containertype"] != "deployment") {
                        prom.push(container.stop().catch((err) => {
                            return Promise.reject("Error during prestart clean. Cannot stop " + container.data.Names[0] + ": " + err);
                        })); // delete is automatic
                    }
                });

                return Promise.all(prom);
            });

            // check build
            let buildPath = project_manager.getProjectBuild(projectname);
            await pfs.access(buildPath);

            // rotate log file
            let logFolder = project_manager.getProjectLogsFolder(projectname);
            let logFile = path.join(logFolder, LOGFILE_NAME);
            let rotateConf = path.join(logFolder, "rotate.conf"), rotateStatus = path.join(logFolder, "rotate.status");

            await pfs.writeFile(rotateConf, logFile + " {\n\tsize 1\n\trotate 7\n\tcompress\n\tdelaycompress\n\tcreate\n\tmissingok\n}");
            try {
                child_process.execSync("logrotate -s " + rotateStatus + " " + rotateConf, privileges.droppingOptions(true));
            } catch(e) {}

            // if starting folder exists, delete it
            let startingFolder = project_manager.getProjectDeployFolder(projectname, true);
            try {
                await pfs.access(startingFolder);
                await rmfr(startingFolder);
            } catch(e) {}
            await pfs.mkdir(startingFolder);

            // extracting build
            await tar.x({
                file: buildPath,
                cwd: startingFolder
            });

            let fullSettings = JSON.parse(await pfs.readFile(path.resolve(startingFolder, "settings.json")));
            let projectSettings = fullSettings.project, buildSettings = fullSettings.build || {};
            let buildVersion = buildSettings.version || (fullSettings.buildVersion || 1), buildMode = buildSettings.mode || "archive";
            let type = projectSettings.type, entrypoint = projectSettings.entrypoint;
            
            let imageName = undefined;
            try {
                let buildpack = require("./buildpacks/pack_" + type);
                let imageDetails = buildMode == "archive" ? (await buildpack.imageDetails(projectSettings)) : {image: buildSettings.image, built: true, build: async () => {}};
            
                imageName = imageDetails.image;
                if(!imageDetails.built)
                    await imageDetails.build();
            } catch(e) {
                if(e.code == "MODULE_NOT_FOUND") throw "Project type '" + type + "' is incorrect.";
                else throw e;
            }
                   
            if(imageName == undefined) throw "Unknown image for project.";

            let env = [], specialEnv = ["PORT", "PROJECT_VERSION", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "CUSTOM_PORT"];
            for(let [key, value] of Object.entries(project.userenv)) {
                if(!specialEnv.includes(key.toUpperCase())) env.push(key + "=" + value);
            }

            // add version env
            env.push("PROJECT_VERSION=" + project.version);

            // request port
            let hostPort = requestPort(projectname);
            // port broadcasted by requestPort

            if(hostPort == 0) {
                return Promise.reject("Unable to find free port for this project.");
            }
            
            env.push("PORT=" + hostPort);

            let portBindings = {}; // bind the two ports
            portBindings[hostPort + "/tcp"] = [{HostPort: hostPort.toString()}];

            let networkName = getProjectNetworkName(projectname);

            // if network already exists (normally deleted on stop or prune), delete it
            await docker.network.list({filters: {name: [networkName]}}).then((networks) => {
                let prom = [];
                networks.forEach((network) => { // normally only one exists, but as is this is a total clear, also remove possible duplicates
                    prom.push(docker.network.get(network.id).status().then((networkDetails) => {
                        let containersDisc = [];

                        // if network exists, normally remaining plugins containers were already stopped (and so disconnected),
                        // but as it is a total clear, disconnect everything manually
                        for(let containerId of Object.keys(networkDetails.data.Containers)) {
                            containersDisc.push(network.disconnect({
                                Container: containerId
                            }));
                        }

                        return Promise.all(containersDisc).then(() => {
                            network.remove();
                        });
                    }));
                });

                return Promise.all(prom);
            });

            // create closed network
            await docker.network.create({
                Name: networkName,
                CheckDuplicates: true,
                Driver: "bridge", // default
                Labels: {
                    "pmng.networktype": "project",
                    "pmng.projectname": projectname
                }
            });

            let containerConfig = {
                Image: imageName,
                Hostname: "project-" + projectname,
                name: getProjectMainContainer(projectname),
                Labels: {
                    "pmng.containertype": "project",
                    "pmng.projectname": projectname
                },
                Env: env,
                Healthcheck: {
                    Test: ["CMD-SHELL", "exit $(( $(netstat -a | grep \":" + hostPort + "\" | grep \"LISTEN\" | wc -l) * -1 + 1))"],
                    Interval: 1000000000*30, // in ns (10^-9s)
                    Timeout: 1000000000*10,
                    Retries: 2
                },
                StopTimeout: 3,
                Entrypoint: entrypoint,
                ExposedPorts: {
                    [hostPort + "/tcp"]: {}
                },
                HostConfig: {
                    PortBindings: portBindings,
                    AutoRemove: true,
                    NetworkMode: networkName,
                    Memory: (await plans_manager.userMaxMemory(project.ownerid))*1024*1024 // if no limit (0), it will be multiplied but stay at 0 which indicates unlimited
                },
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkName]: {
                            Aliases: ["project-" + projectname, "project"] // same as hostname
                        }
                    }
                }
            };

            // plugins can set options will be used by startProject that doesn't fit within containerconfig
            let setupFlags = {removeEntries: []};

            // each plugin can modify the main container and can create another container based on the given name and correctly set label pmng.containertype to plugin
            let plugins = project.plugins;
            for(let [pluginName, pluginConfig] of Object.entries(plugins)) {
                containerConfig = await plugins_manager.getPlugin(pluginName).startProjectPlugin(projectname, containerConfig, networkName, getProjectPluginContainer(projectname, pluginName), pluginConfig, setupFlags) || containerConfig;
            }

            // create container
            let container = await docker.container.create(containerConfig);

            let projectFilesFolder = path.resolve(startingFolder, buildVersion == 1 ? "deploying" : "project");
            let projectArchive = path.resolve(startingFolder, "archive.tar");
            
            // archive without gzip project
            let archiveFiles = await pfs.readdir(projectFilesFolder);
            for(let entry of (setupFlags.removeEntries || [])) {
                let index = archiveFiles.indexOf(entry);
                if(index >= 0) archiveFiles.splice(index, 1);
            }
            await tar.c({
                file: projectArchive,
                cwd: projectFilesFolder
            }, archiveFiles);

            // send tar to container
            await container.fs.put(projectArchive, {
                path: "/var/project"
            });

            // container ready, maybe other stuff to do before start
            for(let [pluginName, pluginConfig] of Object.entries(plugins)) {
                await plugins_manager.getPlugin(pluginName).projectContainerCreated(projectname, containerConfig, networkName, getProjectPluginContainer(projectname, pluginName), pluginConfig);
            }

            // start the container
            await container.start();
            // attach logs
            await attachLogs(projectname, container);

            // updating database
            try {
                await database_server.database("projects").where("name", projectname).update({autostart: "true"});
            } catch(error) {}
        } catch(error) {
            logger.tagWarn("DOCKER", "Cannot start project " + projectname + ":", error);
            throw error;
        }
    }).then(() => {
        logger.tag("DOCKER", "Project " + projectname + " started.");
    });
}

async function execCommand(containerExec, command, logReceived = undefined, buffer = false, user = "root", wd = "/") {
    let exec = await containerExec.create({
        AttachStdin: false,
        AttachStdout: true,
        AttachStderr: true,
        User: user,
        WorkingDir: wd,
        Cmd: ["/bin/bash", "-c", command]
    });

    let stream = await exec.start({
        Detach: false
    });

    return new Promise((resolve, reject) => {
        let out = logReceived == undefined ? "" : undefined;
        let err = logReceived == undefined ? "" : undefined;
        stream.on("data", (data) => {
            if(out == undefined && buffer) {
                logReceived(data);
            } else {
                let string = data.toString(), contents = string.substring(8), dataStream = string.charCodeAt(0);
                if(out == undefined) {
                    logReceived(dataStream, contents);
                } else if(dataStream == 1) out += contents;
                else err += contents;
            }
        });

        stream.on("end", () => {
            exec.status().then((result) => {
                resolve({out, err, code: result.data.ExitCode});
            });
        });

        stream.on("error", () => {
            reject({out, err});
        });
    });
}

/**
 * Checks if a path exists in the container
 * @param {docker.exec} containerExec The exec controller of a docker container.
 * @param {"f" | "d"} type Bash mode: *f* for file, *d* for directory.
 * @param {string} path The container path to check from the root of the project.
 */
function pathExists(containerExec, type, path, wd = "/") {
    if(!(["f", "d"].includes(type))) throw "Invalid check type.";
    return execCommand(containerExec, "[[ -" + type + " " + path + " ]]", undefined, false, "root", wd).then(({out, err, code}) => {
        if(err.length > 0) throw err;
        else return code == 0;
    });
}

/**
 * Requests a free port on the host machine and broadcasts it to all the public webservers.
 * @param {string} projectname The project to request a port for.
 * @returns {number} The attributed port for this project.
 */
function requestPort(projectname) {
    let wantPort = firstPort;
    let usedPorts = Object.values(portMappings).sort();
    
    usedPorts.some((port) => {
        if(wantPort == port) {
            wantPort++;
            return false;
        } return true;
    });

    if(wantPort > lastPort) return 0;

    intercom.send("portBroadcast", {command: "addPort", project: projectname, port: wantPort});

    portMappings[projectname] = wantPort;
    return wantPort;
}


/**
 * Caches a port for a specific project and broadcasts it to all the webservers.
 * @param {string} projectname The project to associate the port with.
 * @param {number} port The port to broadcast.
 */
function addPort(projectname, port) {
    portMappings[projectname] = port;
    intercom.send("portBroadcast", {command: "addPort", project: projectname, port: port});
}

/**
 * Removes a port for a specific project from all the cached webservers.
 * @param {string} projectname The project to remove the port for.
 */
function removePort(projectname) {
    if(portMappings.hasOwnProperty(projectname)) {
        delete portMappings[projectname];

        intercom.send("portBroadcast", {command: "remPort", project: projectname});
    }
}

let portMappings = {}, firstPort = 49152, lastPort = 49999;

async function ensureImageExists(name, dockerfile, {latest = false, adminLogs = true, buildLogs = false} = {}) {
    let nameParts = name.split(":");
    if(nameParts.length == 1) nameParts.push("latest");

    let existingImages = await docker.image.list({filters: {reference: [name]}});
    if(dockerfile == undefined || dockerfile.trim().length == 0) return existingImages.length > 0;
    if(existingImages.length > 0) return;

    let pullImage = dockerfile == "pull";
    let tarPack = undefined;
    
    if(!pullImage) {
        if(dockerfile.startsWith("file:")) {
            tarPack = tar_fs.pack(dockerfile.substring(5), {
                map: (header) => {
                    if(header.type == "file" && header.name == ".") {
                        // only adding the Dockerfile, so rename entry
                        header.name = "Dockerfile";
                    }
    
                    return header;
                }
            });
        } else {
            tarPack = tar_stream.pack();
            tarPack.entry({name: "Dockerfile"}, dockerfile, () => tarPack.finalize());
        }
    
        if(tarPack == undefined) throw "Invalid Dockerfile contents.";
    }

    if(adminLogs) logger.tag("DOCKER", (pullImage ? "Pulling" : "Building") + " image " + name + "...");
    let buildStream = await (pullImage ? docker.image.create({}, {fromImage: nameParts[0], tag: nameParts[1]}) : docker.image.build(tarPack, {t: name}));
    await new Promise((resolve, reject) => {
        buildStream.on("data", (d) => {
            let lines = d.toString().trim().split("\n");
            for(let line of lines) {
                let data = JSON.parse(line.trim());
                if(data.stream && buildLogs) console.log(data.stream.trim());
                if(data.errorDetail)
                    reject(data.errorDetail.message);
            }
        });
        buildStream.on("error", reject);
        buildStream.on("end", resolve);
    });
    
    if(adminLogs) logger.tag("DOCKER", "Image " + name + " " + (pullImage ? "pulled" : "built") + "!");

    if(!pullImage && latest && name.includes(":")) { // if there is no version tag, it's already the latest one
        docker.image.get(name).tag({repo: name.split(":")[0], tag: "latest"}).catch((error) => {
            logger.tagWarn("DOCKER", "Cannot tag latest image " + tag + ": " + error);
        });
    }
}

/**
 * Clears the filesystem start resources for a specific project.
 * @param {string} projectname The project name of which to clear the start resources.
 * @returns {Promise} A promise resolved when all the start resources are cleared.
 */
function clearStarting(projectname) {
    startingProjects.splice(startingProjects.indexOf(projectname), 1);
    let prom = []
    /*let buildPath = project_manager.getProjectBuild(projectname);
    pfs.access(buildPath).then(() => {
        prom.push(pfs.unlink(buildPath));
    });*/

    let startingFolder = project_manager.getProjectDeployFolder(projectname, true);
    pfs.access(startingFolder).then(() => {
        prom.push(new Promise((resolve) => {
            pfs.access(startingFolder).then(() => {
                rmfr(startingFolder).then(resolve);
            }).catch(resolve);
        }));
    });

    return Promise.all(prom);
}

/**
 * Gets a list of all the running containers on the platform, sorted by projects, plugins and unknown type.
 * @returns {{projects: {name: string, id: string, projectname: string}[],
 * platform: {name: string, id: string, kind: string, pluginname: string, projectname: string | undefined}[],
 * others: {name: string, id: string, kind: string, image: string}[]}} A sorted list of all the containers.
 */
function getRunningContainers() {
    return docker.container.list({filters: {status: ["running"]}}).then((containers) => {
        let sorted = {projects: [], platform: [], others: []};
        for(let container of containers) {
            let name = "";
            if(container.data.Names != undefined && container.data.Names.length > 0) name = container.data.Names[0].slice(1);
            let sortResult = sortContainer(container.data.Id, name, container.data.Labels, container.data.Image);
            sorted[sortResult.category].push(sortResult.result);
        }

        return sorted;
    });
}

function sortContainer(id, name, labels, image) {
    let type = labels["pmng.containertype"];
    id = id.slice(0, 12);

    if(type == undefined) {
        return {category: "others", result: {name: name, id, kind: "not_pmng", image}};
    } else {
        let projectname = labels["pmng.projectname"], pluginname = labels["pmng.pluginname"];
        // can be undefined, but can only declare one time the variables with these names
        switch(type) {
            case "project":
                return {category: "projects", result: {name, id, projectname}};
            case "plugin":
                return {category: "platform", result: {name, id, projectname, kind: "plugin", pluginname}};
            case "deployment":
                return {category: "platform", result: {name, id, projectname, kind: "deployment"}};
            case "globalplugin":
                return {category: "platform", result: {name, id, kind: "globalplugin", pluginname}};
            case "panel":
                return {category: "platform", result: {name, id, kind: "panel", panel: labels["pmng.panel"]}}
            case "server":
                return {category: "platform", result: {name, id, kind: "server", server: labels["pmng.server"]}}
            default:
                return {category: "others", result: {name, id, kind: "not_reco", image}};
        }
    }
}

/**
 * Returns the details about a specific container;
 * @param {string} reference Reference of the container (name or id).
 * @returns The container's details
 */
function getContainerDetails(reference) {
    // inspect api route is renamed status
    // if reference is name, it will be given to the inspect route that will correctly identify it
    // but the resulting container will have its name in the container.id field (see container.data.Id for correct id)
    return docker.container.get(reference).status().then((container) => {
        let data = container.data, networks = [];
        for(let [name, network] of Object.entries(data.NetworkSettings.Networks)) {
            networks.push({
                name: name,
                networkId: network.NetworkID,
                aliases: network.Aliases || [],
                ipAddress: network.IPAddress,
                gateway: network.Gateway,
                macAddress: network.MacAddress
            });
        }

        return {
            containerId: data.Id, // full id
            name: data.Name.slice(1),
            createdAt: data.Created,
            startedAt: data.State.StartedAt,
            image: data.Config.Image,
            labels: data.Config.Labels,
            networks: networks
        }
    });
}

/**
 * Lists all networks of the Docker host.
 * @returns An array of networks name and id.
 */
function listNetworks() {
    // only list names and ids
    return docker.network.list().then((networks) => {
        let results = [];
        for(let network of networks) {
            let nData = network.data;

            results.push({
                networkId: nData.Id,
                name: nData.Name,
            });
        }
        return results;
    });
}

/**
 * Gets the details about a specific network.
 * @param {string} reference The network reference (name or id).
 * @return The details of this network.
 */
function getNetworkDetails(reference) {
    return docker.network.get(reference).status().then((network) => {
        let data = network.data, containers = [];
        for(let [id, container] of Object.entries(data.Containers)) {
            containers.push({
                id: id,
                name: container.Name,
                ipAddress: container.IPv4Address,
                macAddress: container.MacAddress
            });
        }

        return {
            networkId: data.Id,
            name: data.Name,
            createdAt: data.Created,
            driver: data.Driver,
            config: data.IPAM.Config[0],
            labels: data.Labels,
            containers: containers
        }
    });
}

let eventsCallbacks = [];
function registerEvents(callback) {
    if(eventsCallbacks.length == 0) {
        docker.events({since: Date.now()/1000}).then((stream) => {
            stream.on("data", (data) => {
                let eventData = JSON.parse(data.toString());
                for(let eventCb of eventsCallbacks) {
                    eventCb(eventData);
                }
            });
        });
    }
    
    eventsCallbacks.push(callback);
}


module.exports.docker = docker;
module.exports.isProjectContainerRunning = isProjectContainerRunning;
module.exports.areProjectContainersRunning = areProjectContainersRunning;
module.exports.utils = {execCommand, pathExists};
module.exports.getRunningContainers = getRunningContainers;
module.exports.getContainerDetails = getContainerDetails;
module.exports.listNetworks = listNetworks;
module.exports.getNetworkDetails = getNetworkDetails;
module.exports.ensureImageExists = ensureImageExists;
module.exports.getProjectDeployingContainer = getProjectDeployingContainer;
module.exports.registerEvents = registerEvents;
module.exports.sortContainer = sortContainer;
module.exports.maininstance = maininstance;
