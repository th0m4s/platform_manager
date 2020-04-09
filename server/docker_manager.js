const Docker = require("node-docker-api").Docker;
const project_manager = require("./project_manager");
const intercom = require("./intercom/intercom_client").connect();
const fs = require("fs").promises;
const rmfr = require("rmfr");
const tar = require("tar");
const path = require("path");
const logger = require('simple-node-logger').createSimpleLogger();

const docker = new Docker(process.env.DOCKER_MODE == "socket" ? {socketPath: process.env.DOCKER_SOCKET} : {protocol: process.env.DOCKER_MODE, host: process.env.DOCKER_HOST, port: parseInt(process.env.DOCKER_PORT)});

function getProjectMainContainer(projectname) {
    return "project_" + projectname + "_main";
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

let startingProjects = [];
function maininstance() {
    intercom.subscribe(["dockermng"], (message, id) => {
        let projectname = message.project || ""; // some commands don't need project
        switch(message.command) {
            case "stopProject":
                isProjectContainerRunning(projectname).then((result) => {
                    if(!result) return Promise.reject("Cannot stop a stopped project.");
            
                    return docker.container.list({filters: {name: [getProjectMainContainer(projectname)]}}).then((containers) => {
                        let prom = [];
                        containers.forEach((container) => { // normally only one because plugins not implemented
                            prom.push(container.stop()); // delete is automatic
                        });

                        removePort(projectname);
            
                        return Promise.all(prom);
                    });
                }).then(() => {
                    intercom.respond(id, {error: false, message: "Project stopped."});
                }).catch((error) => {
                    intercom.respond(id, {error: true, message: "Cannot stop project: " + error});
                });
                break;
            case "startProject":
                isProjectContainerRunning(projectname).then(async (result) => {
                    if(result) return Promise.reject("Cannot start a running project.");
            
                    if(startingProjects.includes(projectname)) return Promise.reject("Cannot start a starting project.");
                    startingProjects.push(projectname);

                    try {
                        let project = await project_manager.getProject(projectname, true);

                        // check build
                        let buildPath = project_manager.getProjectBuild(projectname);
                        await fs.access(buildPath);

                        // if starting folder exists, delete it
                        let startingFolder = project_manager.getProjectDeployFolder(projectname, true);
                        try {
                            await fs.access(startingFolder);
                            await rmfr(startingFolder);
                        } catch(e) {}
                        await fs.mkdir(startingFolder);

                        // extracting build
                        await tar.x({
                            file: buildPath,
                            cwd: startingFolder
                        });

                        let settings = JSON.parse(await fs.readFile(path.resolve(startingFolder, "settings.json"))).project;
                        let type = settings.type;
                        let entrypoint = settings.entrypoint;
                        
                        let imageName = getImageFromType(type);
                        if(imageName == undefined) throw new Error("Unknown image for project");

                        let env = [], specialEnv = ["PORT", "PROJECT_VERSION"];
                        for(let [key, value] of Object.entries(project.userenv)) {
                            if(!specialEnv.includes(key.toUpperCase())) env.push(key + "=" + value);
                        }

                        // add version env
                        env.push("PROJECT_VERSION=" + project.version);

                        // request port
                        let hostPort = requestPort(projectname);
                        // port broadcasted by requestPort
                        
                        let exposedPort = {};
                        exposedPort[hostPort + "/tcp"] = {}; // hostport = containerport
                        env.push("PORT=" + hostPort);

                        let portBindings = {}; // bind the two ports
                        portBindings[hostPort + "/tcp"] = [{HostPort: hostPort.toString()}];

                        // create container
                        let container = await docker.container.create({
                            Image: imageName,
                            name: getProjectMainContainer(projectname),
                            Labels: {
                                "pmng.containertype": "project",
                                "pmng.projectname": projectname
                            },
                            Env: env,
                            Entrypoint: entrypoint,
                            ExposedPorts: exposedPort,
                            HostConfig: {
                                PortBindings: portBindings,
                                AutoRemove: true
                            }
                        });

                        let projectFilesFolder = path.resolve(startingFolder, "deploying");
                        let projectArchive = path.resolve(startingFolder, "archive.tar");
                        
                        // archive without gzip project
                        let archiveFiles = await fs.readdir(projectFilesFolder);
                        await tar.c({
                            file: projectArchive,
                            cwd: projectFilesFolder
                        }, archiveFiles);

                        // send tar to container
                        await container.fs.put(projectArchive, {
                            path: "/var/project"
                        });

                        // start the container
                        await container.start();

                        clearStarting(projectname).then(() => intercom.respond(id, {error: false, message: "Project started."}));
                    } catch(error) {
                        console.warn(error);
                        clearStarting(projectname).then(() => intercom.respond(id, {error: true, message: "Cannot start project: " + error}));
                    }
                })
                break;
            case "analyzeRunning":
                logger.info("Searching for running docker containers...");
                docker.container.list({filters: {label: ["pmng.containertype=project"]}}).then((containers) => {
                    if(containers.length > 0) {
                        logger.info("Indexing " + containers.length + " container(s).");

                        containers.forEach((container) => {
                            let projectname = container.data.Labels["pmng.projectname"];
                            let port = -1;
                            container.data.Ports.some((portObject) => {
                                let actualPort = portObject.PublicPort;
                                if(actualPort >= firstPort && actualPort < firstPluginPort) {
                                    port = actualPort;
                                    return true;
                                } else return false;
                            });

                            if(port == -1) {
                                logger.warn(projectname + "container doesn't have a public port. Stopping it.");
                                container.stop();
                            } else {
                                logger.info("Binding " + projectname + " to port " + port);
                                addPort(projectname, port);
                            }
                        });
                    } else logger.info("No containers running.");
                });
                break;
        }
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

let portMappings = {}, firstPort = 11001, firstPluginPort = 21001;
// 11001 is for project
// 21001 is for plugins

const types = {"node": "pmng/node", "apache-php": "pmng/apache2-php7"};
function getImageFromType(type) {
    return types[type];
}

function clearStarting(projectname) {
    startingProjects.splice(startingProjects.indexOf(projectname), 1);
    let prom = []
    /*let buildPath = project_manager.getProjectBuild(projectname);
    fs.access(buildPath).then(() => {
        prom.push(fs.unlink(buildPath));
    });*/

    let startingFolder = project_manager.getProjectDeployFolder(projectname, true);
    fs.access(startingFolder).then(() => {
        prom.push(rmfr(startingFolder));
    });

    return Promise.all(prom);
}


module.exports.docker = docker;
module.exports.isProjectContainerRunning = isProjectContainerRunning;
module.exports.areProjectContainersRunning = areProjectContainersRunning;
module.exports.maininstance = maininstance;