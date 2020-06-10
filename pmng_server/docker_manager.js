const Docker = require("node-docker-api").Docker;
const project_manager = require("./project_manager");
const intercom = require("./intercom/intercom_client").connect();
const fs = require("fs"), pfs = fs.promises;
const rmfr = require("rmfr");
const tar = require("tar");
const path = require("path");
const logger = require("./platform_logger").logger();
const database_server = require("./database_server");
const plugins_manager = require("./plugins_manager");
const child_process = require("child_process");
const regex_utils = require("./regex_utils");
const treekill = require("tree-kill");

const docker = new Docker(process.env.DOCKER_MODE == "socket" ? {socketPath: process.env.DOCKER_SOCKET} : {protocol: process.env.DOCKER_MODE, host: process.env.DOCKER_HOST, port: parseInt(process.env.DOCKER_PORT)});

function getProjectMainContainer(projectname) {
    return "pmng_" + projectname + "_main";
}

// a plugin cannot be named main nor net
// some plugins like persistent-storage don't need a container
function getProjectPluginContainer(projectname, plugin) {
    return "pmng_" + projectname + "_" + plugin;
}

function getProjectNetworkName(projectname) {
    return "pmng_" + projectname + "_net";
}

function isProjectContainerRunning(projectname) {
    return docker.container.list({filters: {name: [getProjectMainContainer(projectname)]}}).then((containers) => {
        return containers.length > 0 && containers[0].data.State == "running";
    });
}

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
async function maininstance() {
    let delayWaited = 0, delayNeeded = parseInt(process.env.DOCKER_START_DELAY), intervalDelay = 500, messageSent = false;
    while(true) {
        try {
            await docker.info();
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

    logger.info("Docker is running.");

    // loading plugins (starting global plugins containers)
    // paths relative to platform.js:
    //    - plugins is normally the data directory
    //    - server/plugins contains the plugins scripts
    pluginsConfigFile = path.join(process.env.PLUGINS_PATH, "config.json");
    await pfs.readFile(pluginsConfigFile).then((config) => {
        config = JSON.parse(config);

        return pfs.readdir("./pmng_server/plugins").then((files) => {
            let prom = [];
            files.forEach((file) => {
                let pluginname = regex_utils.testPlugin(file);
                if(pluginname !== null) {
                    if(config[pluginname] == undefined) {
                        config[pluginname] = {};
                    }

                    prom.push(plugins_manager.getPlugin(pluginname).startGlobalPlugin(path.join(process.env.PLUGINS_PATH, pluginname), config[pluginname], (newConfig) => {
                        config[pluginname] = newConfig;
                        return pfs.writeFile(pluginsConfigFile, JSON.stringify(config));
                    }));
                }
            });

            Promise.allSettled(prom).then((states) => {
                states.forEach((state) => {
                    if(state.status != "fulfilled") {
                        logger.warn("Cannot start global plugin: " + state.reason);
                    }
                });
            });
        });
    });

    intercom.subscribe(["dockermng"], (message, id) => {
        let projectname = message.project || ""; // some commands don't need project
        switch(message.command) {
            case "stopProject":
                stopProject(projectname).then(() => {
                    intercom.respond(id, {error: false, message: "Project stopped."});
                }).catch((error) => {
                    intercom.respond(id, {error: true, message: "Cannot stop project: " + error});
                });
                break;
            case "startProject":
                startProject(projectname).then(() => {
                    clearStarting(projectname).then(() => intercom.respond(id, {error: false, message: "Project started."}));
                }).catch((error) => {
                    clearStarting(projectname).then(() => intercom.respond(id, {error: true, message: "Cannot start project " + projectname + ": " + error}));
                });
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
                                            prom.push(startProject(result.name));
                                        }
                                    });

                                    if(prom.length > 0) {
                                        Promise.allSettled(prom).then((states) => {
                                            let successes = 0;
                                            states.forEach((state) => {
                                                if(state.status == "fulfilled") {
                                                    successes++;
                                                } else {
                                                    logger.warn("Error during autostart: " + state.reason);
                                                }
                                            });

                                            if(successes > 0) logger.info("Successfully autostarted " + successes + " container(s).");
                                        });
                                    } else logger.info("No container to autostart (they can already be up and running).");
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
}

// only for maininstance
function stopProject(projectname, force = false) {
    return (force ? Promise.resolve(true) : isProjectContainerRunning(projectname)).then((result) => {
        if(!result) return Promise.reject("Cannot stop a stopped project.");
        stoppingProjects.push(projectname);
        return docker.container.list({filters: {label: ["pmng.projectname=" + projectname]}}).then((containers) => {
            let prom = [];
            containers.forEach((container) => {
                prom.push(container.stop().catch((err) => {
                    if(!force) return Promise.reject("Cannot stop " + container.data.Names[0] + ": " + err);
                })); // delete is automatic
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
                    docker.network.list({filters: {name: [projectNetworkName]}}).then((networks) => {
                        return networks[0].remove().catch((err) => {
                            if(!force) return Promise.reject("Cannot remove network for project " + projectname + ": " + err);
                        });
                    });
                }), dbProm])
            });
        });
    });
}

const LOGFILE_NAME = "project.log";
// only for maininstance
function attachLogs(projectname, container) {
    let logStream = fs.createWriteStream(path.resolve(project_manager.getProjectLogsFolder(projectname), LOGFILE_NAME), {flags: "a"});
    return container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true,
        since: Date.now()/1000
    }).then((stream) => {
        stream.on("data", (log) => {
            let data = log.toString("utf-8").split("\n");
            let lastType = "      ";
            data.forEach((line) => {
                if(line.length > 0) {
                    let type = line[7];
                    line = line.slice(8);
                    switch(type) {
                        case "+":
                            type = "INFO  ";
                            break;
                        case ",":
                            type = "WARN  ";
                            break;
                        case "-":
                            type = "ERROR ";
                            break;
                        case "(":
                            type = lastType;
                            break;
                        default:
                            line = type + line;
                            type = "UNKN  ";
                            break;
                    }

                    lastType = type;

                    let parts = line.split(" ");
                    logStream.write(parts[0] + " " + type + " " + parts.slice(1) + "\n");
                }
            });
        });

        stream.on("error", (err) => {
            logStream.write((new Date().toISOString()) + " SYSERR " + err);
        });

        stream.on("close", () => {
            if(stoppingProjects.includes(projectname)) {
                stoppingProjects.splice(stoppingProjects.indexOf(projectname), 1);
            } else {
                logger.warn("Container of project " + projectname + " was closed without stopping project.");
                stopProject(projectname, true).then(() => { // maybe use finally
                    stoppingProjects.splice(stoppingProjects.indexOf(projectname), 1);
                });
            }
        });
    });
}

// only for maininstance
function startProject(projectname) {
    return isProjectContainerRunning(projectname).then(async (result) => {
        if(result) return Promise.reject("Cannot start a running project.");

        if(startingProjects.includes(projectname)) return Promise.reject("Cannot start a starting project.");
        startingProjects.push(projectname);

        let project = await project_manager.getProject(projectname, true);

        // check build
        let buildPath = project_manager.getProjectBuild(projectname);
        await pfs.access(buildPath);

        // rotate log file
        let logFolder = project_manager.getProjectLogsFolder(projectname);
        let logFile = path.join(logFolder, LOGFILE_NAME);
        let rotateConf = path.join(logFolder, "rotate.conf"), rotateStatus = path.join(logFolder, "rotate.status");

        await pfs.writeFile(rotateConf, logFile + " {\n\tsize 1\n\trotate 7\n\tcompress\n\tdelaycompress\n\tmissingok\n}");
        child_process.execSync("logrotate -s " + rotateStatus + " " + rotateConf);

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

        let settings = JSON.parse(await pfs.readFile(path.resolve(startingFolder, "settings.json"))).project;
        let type = settings.type;
        let entrypoint = settings.entrypoint;
        
        let imageName = getImageFromType(type);
        if(imageName == undefined) throw new Error("Unknown image for project");

        let env = [], specialEnv = ["PORT", "PROJECT_VERSION", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
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
                prom.push(network.remove());
            });

            return Promise.all(prom);
        });

        // create closed network
        await docker.network.create({
            Name: networkName,
            CheckDuplicates: true,
            Driver: "bridge", // default
            Labels: {
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
                NetworkMode: networkName
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [networkName]: {
                        Aliases: ["project-" + projectname, "project"] // same as hostname
                    }
                }
            }
        };

        // each plugin can modify the main container and can create another container based on the given name and correctly set label pmng.containertype to plugin
        let plugins = project.plugins;
        for(let [pluginName, pluginConfig] of Object.entries(plugins)) {
            containerConfig = await plugins_manager.getPlugin(pluginName).startProjectPlugin(projectname, containerConfig, networkName, getProjectPluginContainer(projectname, pluginName), pluginConfig);
        }

        // create container
        let container = await docker.container.create(containerConfig);

        let projectFilesFolder = path.resolve(startingFolder, "deploying");
        let projectArchive = path.resolve(startingFolder, "archive.tar");
        
        // archive without gzip project
        let archiveFiles = await pfs.readdir(projectFilesFolder);
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
    });
}

// only for maininstance
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

// only for maininstance
function addPort(projectname, port) {
    portMappings[projectname] = port;
    intercom.send("portBroadcast", {command: "addPort", project: projectname, port: port});
}

// only for mainstance
function removePort(projectname) {
    if(portMappings.hasOwnProperty(projectname)) {
        delete portMappings[projectname];

        intercom.send("portBroadcast", {command: "remPort", project: projectname});
    }
}

let portMappings = {}, firstPort = 11001, lastPort = 11999/*, firstPluginPort = 12001*/;
// 11001 is for project

const types = {"node": "pmng/node", "apache-php": "pmng/apache2-php7"};
function getImageFromType(type) {
    return types[type];
}

function clearStarting(projectname) {
    startingProjects.splice(startingProjects.indexOf(projectname), 1);
    let prom = []
    /*let buildPath = project_manager.getProjectBuild(projectname);
    pfs.access(buildPath).then(() => {
        prom.push(pfs.unlink(buildPath));
    });*/

    let startingFolder = project_manager.getProjectDeployFolder(projectname, true);
    pfs.access(startingFolder).then(() => {
        prom.push(rmfr(startingFolder));
    });

    return Promise.all(prom);
}

function getRunningContainers() {
    return docker.container.list().then((containers) => {
        let sorted = {projects: [], platform: [], others: []};
        for(let container of containers) {
            let labels = container.data.Labels, type = labels["pmng.containertype"], cid = container.data.Id.slice(0, 12);
            
            let names = container.data.Names, name = "";
            if(names !== undefined & names.length > 0) name = names[0].slice(1); // remove first slash in name

            if(type == undefined) {
                sorted.others.push({name: name, id: cid, kind: "not_pmng", image: container.data.Image});
            } else {
                let projectname = labels["pmng.projectname"], pluginname = labels["pmng.pluginname"];
                // can be undefined, but can only declare one time the variables with these names
                switch(type) {
                    case "project":
                        sorted.projects.push({name: name, id: cid, projectname: projectname});
                        break;
                    case "plugin":
                        sorted.platform.push({name: name, id: cid, projectname: projectname, kind: "plugin", pluginname: pluginname});
                        break;
                    case "globalplugin":
                        sorted.platform.push({name: name, id: cid, kind: "globalplugin", pluginname: pluginname});
                        break;
                    default:
                        sorted.others.push({name: name, id: cid, kind: "not_reco", image: container.data.Image});
                        break;
                }
            }
        }

        return sorted;
    });
}

function getContainerDetails(value) {
    // value is name or id

    // inspect api route is renamed status
    // if value is name, it will be given to the inspect route that will correctly identify it
    // but the resulting container will have its name in the container.id field (see container.data.Id for correct id)
    return docker.container.get(value).status().then((container) => {
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


module.exports.docker = docker;
module.exports.isProjectContainerRunning = isProjectContainerRunning;
module.exports.areProjectContainersRunning = areProjectContainersRunning;
module.exports.getRunningContainers = getRunningContainers;
module.exports.getContainerDetails = getContainerDetails;
module.exports.listNetworks = listNetworks;
module.exports.maininstance = maininstance;