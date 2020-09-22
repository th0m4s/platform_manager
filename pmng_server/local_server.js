const logger = require("./platform_logger").logger();
const net = require("net");
const project_manager = require("./project_manager");
const fs = require("fs"), pfs = fs.promises;
const rmfr = require("rmfr");
const child_process = require("child_process");
const tar = require("tar");
const path = require("path");
const database_server = require("./database_server");
const docker_manager = require("./docker_manager");
const intercom = require("./intercom/intercom_client").connect();
const string_utils = require("./string_utils");
const privileges = require("./privileges");

const LINE = "\n-----> ", SPACES = "       ";
let predeploys = {};

/**
 * Starts the local platform server.
 */
function start() {
    privileges.drop();

    let server = net.createServer();
    server.on("connection", function (connection) {
        let command = "", isProcessing = false, processExit = () => {};
        connection.on("data", async (buffer) => {
            if(isProcessing) return;
            command += buffer.toString("utf-8");
            if(command.endsWith("\n")) {
                isProcessing = true;
                
                let parts = command.trim().split(":");
                if(parts.length >= 2) {
                    let projectname = parts[1];
                    let localCommand = projectname != undefined ? parts[0] : "";
                    switch(localCommand.toLowerCase()) {
                        case "deploy":
                            try {
                                await project_manager.projectExists(projectname);
                            } catch(error) {   // not using LINE because first line doesn't have line margin (\n)
                                // normally this would not happen, because only called from hooks directory inside project folder
                                connection.write("-----> Cannot deploy " + projectname + ". This project doesn't exist.\n");
                                connection.end();
                                break;
                            }

                            if(predeploys[projectname] !== true) {
                                connection.write("-----> Cannot deploy " + projectname + ". Predeployment tests not available.");
                                connection.end();
                                break;
                            } else delete predeploys[projectname];

                            logger.tag("LCLSRV", "Deploying project " + projectname + "...");
                            let currentBuildPath = project_manager.getProjectBuild(projectname, false);
                            let saveBuildPath = project_manager.getProjectBuild(projectname, true);
                            let buildImageName = project_manager.getProjectImage(projectname);

                            let stopContainerIfError = true, lastBuildExists = false;

                            try {
                                connection.write("-----> Starting deployment for project " + projectname + "...\n");

                                try {
                                    await pfs.access(currentBuildPath);
                                    lastBuildExists = true;
                                    connection.write(LINE + "Saving last build...\n");
                                    await pfs.rename(currentBuildPath, saveBuildPath);
                                    connection.write(SPACES + "Build saved.\n");
                                } catch(moveError) {
                                    // no archive build
                                }

                                let restoreSave = async () => {
                                    try {
                                        await pfs.access(saveBuildPath);
                                        await pfs.rename(saveBuildPath, currentBuildPath);
                                    } catch(error) {/* no save to restore */}
                                };

                                processExit = async () => {
                                    await restoreSave();
                                };

                                let buildImage = undefined;
                                try {
                                    buildImage = await docker_manager.docker.image.get(buildImageName).status();
                                } catch(imageError) {
                                    // no image
                                }

                                let buildFolder = project_manager.getProjectDeployFolder(projectname, false); // should exits from predeploy
                                let projectCodeFolder = path.resolve(buildFolder, "project"); // contains repo/project code
                                let tempBuildFolder = path.resolve(buildFolder, "tempBuild"); // temp dir for addons/buildpack

                                let projectRepo = project_manager.getProjectRepository(projectname);

                                let settingsFile = path.resolve(buildFolder, "settings.json");

                                await Promise.all([pfs.mkdir(projectCodeFolder), pfs.mkdir(tempBuildFolder)])
                                connection.write(LINE + "Exporting project repository...\n");
                                let export_process = child_process.spawn("/bin/bash", ["-c", "git archive master | tar -xf - -C " + projectCodeFolder], {cwd: projectRepo});

                                await new Promise((resolve, reject) => {
                                    let error = "";
                                    export_process.stderr.on("data", (data) => {
                                        error += data;
                                    });

                                    export_process.on("exit", () => {
                                        if(error.length > 0) {
                                            reject(error);
                                        } else {
                                            connection.write(SPACES + "Project exported.\n");
                                            resolve();
                                        }
                                    });
                                });

                                let lastSaveImage = undefined;
                                if(lastBuildExists) {
                                    let extractLastSaveFolder = path.join(buildFolder, "lastExtracted");
                                    /*await pfs.mkdir(extractLastSaveFolder);

                                    await tar.x({
                                        file: saveBuildPath,
                                        cwd: extractLastSaveFolder
                                    }, ["settings.json"]);*/
                                    // not exporting last build, already done from predeploy tests

                                    let lastSettings = JSON.parse(await pfs.readFile(path.join(extractLastSaveFolder, "settings.json")));
                                    if(lastSettings.build != undefined && lastSettings.build.mode == "image") {
                                        try {
                                            lastSaveImage = (await docker_manager.docker.image.get(lastSettings.build.image).status()).data.Id;
                                        } catch(e) {
                                            // last save image is already deleted if 404
                                            if(e.statusCode != 404) throw e;
                                        }
                                    }
                                }
                                
                                let projectData, addons, hasAddons = false, hasRunAddons = false;
                                try {
                                    let fileData = JSON.parse(await pfs.readFile(path.resolve(projectCodeFolder, "project.json")));
                                    projectData = fileData.project;
                                    addons = fileData.addons || [];
                                    hasAddons = addons.length > 0;
                                } catch(error) {
                                    throw "Cannot find the required project.json. Please create this file and push it to deploy the project.";
                                }

                                let type = projectData.type.replace(/\./g, "");
                                projectData.version = projectData.version || "latest";
                                let typeVersion = projectData.version;
                                if(type !== undefined && type.length > 0) {
                                    try {
                                        let buildpack = require("./buildpacks/pack_" + type);

                                        let availableAddons = buildpack.availableAddons(projectData);
                                        for(let addon of addons) {
                                            if(!(availableAddons.includes(addon.name || ""))) throw "Addon '" + addon.name + "' is not available for this buildpack.";
                                            try {
                                                // require to check if exists, and caches for future require
                                                require("./buildpacks/addons/addon_" + addon.name);

                                                let deployOnly = addon.deployOnly || false; // no problem with || because default is false
                                                addon.deployOnly = deployOnly;
                                                if(!deployOnly) hasRunAddons = true;
                                            } catch(e) {
                                                if(e.code == "MODULE_NOT_FOUND") throw "Addon '" + addon.name + "' doesn't exist.";
                                                else throw e;
                                            }
                                        }

                                        connection.write(LINE + "Starting deployment container...");
                                        let image = docker_manager.getImageFromType(type, typeVersion);

                                        if(image == undefined) {
                                            throw "Unknown project type (image not found for this type and version: " + type + ":" + typeVersion + ")";
                                        }

                                        let container = null;
                                        try {
                                            container = await docker_manager.docker.container.create({
                                                Image: image,
                                                name: docker_manager.getProjectDeployingContainer(projectname),
                                                Tty: true,
                                                Labels: {
                                                    "pmng.containertype": "deployment",
                                                    "pmng.projectname": projectname
                                                },
                                                HostConfig: {
                                                    AutoRemove: true,
                                                    Binds: [projectCodeFolder + ":/var/project", tempBuildFolder + ":/var/tempBuild"]
                                                },
                                                Entrypoint: ["/bin/bash"] // create infinite running container
                                            });

                                            await container.start();

                                            processExit = () => {
                                                return Promise.all([restoreSave, container.stop]);
                                            };
                                        } catch(error) {
                                            if(error.statusCode == 409) {
                                                stopContainerIfError = false;
                                                throw "This project is already being deployed (the deployment container already exists.)";
                                            } else throw error;
                                        }
                                    

                                        let execCommand = (command, logReceived = undefined, buffer = false, user = "project", wd = "/var/project") => {
                                            return docker_manager.utils.execCommand(container.exec, command, logReceived, buffer, user, wd);
                                        };

                                        let readFile = (filename) => {
                                            filename = path.resolve(projectCodeFolder, filename);
                                            if(!filename.startsWith(projectCodeFolder)) throw "Cannot access file outside of project.";

                                            return pfs.readFile(filename);
                                        }

                                        let exists = (type, name) => {
                                            return docker_manager.utils.pathExists(container.exec, type, name, "/var/project");
                                        }

                                        let temporaryFile = (name) => {
                                            return {host: path.resolve(tempBuildFolder, name), container: "/var/tempBuild/" + name};
                                        }

                                        let writeFile = (filename, contents) => {
                                            filename = path.resolve(projectCodeFolder, filename);
                                            if(!filename.startsWith(projectCodeFolder)) throw "Cannot access file outside of project.";

                                            return pfs.writeFile(filename, contents);
                                        }

                                        let nextProtected = false;
                                        let setNextProtected = (protection) => {
                                            nextProtected = protection;
                                        }

                                        let dockerUtils = {execCommand, readFile, exists, temporaryFile, writeFile, setNextProtected};
                                        connection.write(" Started.\n");

                                        let lastNewLine = true;
                                        let addonLogger = (message, newLine = true) => {
                                            connection.write((newLine && !lastNewLine ? "\n" : "") + (lastNewLine ? SPACES + "  [ADDON] " : "") + message + (newLine ? "\n" : ""));
                                            lastNewLine = newLine;
                                        };

                                        if(hasRunAddons) {
                                            for(let addonData of addons) {
                                                if(addonData.deployOnly) continue;

                                                if(!lastNewLine) {
                                                    connection.write("\n");
                                                    lastNewLine = true;
                                                }

                                                let addonName = addonData.name;
                                                let addon = require("./buildpacks/addons/addon_" + addonName);

                                                try {
                                                    connection.write(SPACES + "Executing addon " + addon.displayName() + " (" + addonName + ")...\n");
                                                    await addon.addon(projectname, addonData, dockerUtils, addonLogger);
                                                } catch(e) {
                                                    throw "Addon error: " + e;
                                                }
                                            }

                                            connection.write(SPACES + "Committing project...");
                                            await container.commit({repo: buildImageName});
                                            connection.write(" Image exported.\n");
                                        }

                                        // now reiterates all addons and add only deploy addons
                                        for(let addonData of addons) {
                                            if(!addonData.deployOnly) continue;

                                            if(!lastNewLine) {
                                                connection.write("\n");
                                                lastNewLine = true;
                                            }

                                            let addonName = addonData.name;
                                            let addon = require("./buildpacks/addons/addon_" + addonName);

                                            try {
                                                connection.write(SPACES + "Executing deployment addon " + addon.displayName() + " (" + addonName + ")...\n");
                                                await addon.addon(projectname, addonData, dockerUtils, addonLogger);
                                            } catch(e) {
                                                throw "Deployment addon error: " + e;
                                            }
                                        }

                                        connection.write((hasAddons ? LINE : SPACES) + "Executing buildpack...\n");

                                        let startCmd = [];
                                        try {
                                            startCmd = await buildpack.build(projectname, projectData, dockerUtils, (message) => {
                                                connection.write(SPACES + "  [BUILDPACK] " + message + "\n");
                                            }, hasAddons);
                                        } catch(e) {
                                            throw "Buildpack error: " + e;
                                        }

                                        let settings = {project: {type: type, entrypoint: startCmd, version: typeVersion}, build: {version: 3, mode: "archive", nextProtected}};

                                        if(hasRunAddons) {
                                            settings.build.mode = "image";
                                            settings.build.image = buildImageName;
                                        }

                                        await pfs.writeFile(settingsFile, JSON.stringify(settings));
                                        connection.write(SPACES + "Project built.\n");

                                        connection.write(LINE + "Stopping deployment container...");
                                        await container.stop();
                                        connection.write(" Stopped.\n");
                                        stopContainerIfError = false;

                                    } catch(e) {
                                        if(e.code == "MODULE_NOT_FOUND") throw "Project type '" + type + "' is incorrect.";
                                        else throw e;
                                    }
                                } else throw "Cannot find process type in project.json.";

                                connection.write(LINE + "Compressing...\n");
                                await tar.c({
                                    file: currentBuildPath,
                                    gzip: true,
                                    cwd: buildFolder
                                }, ["project", "settings.json"]);

                                let compressedSize = "Unknown size";
                                try {
                                    compressedSize = string_utils.formatBytes((await pfs.stat(currentBuildPath)).size, 1);
                                } catch(error) { }

                                connection.write(SPACES + "Done: " + compressedSize + " \n");

                                // new deployment is archive, so delete image if exists
                                if(!hasAddons && lastSaveImage == undefined && buildImage != undefined) await buildImage.remove({force: true});

                                await clearDeploy(buildFolder, connection, false);

                                connection.write(LINE + "Updating database...");
                                let newVersion = 0;
                                await new Promise((resolve, reject) => {
                                    database_server.database("projects").where("name", projectname).select("version").then((results) => {
                                        if(results == null || results.length != 1) reject("Unable to fetch database information.");
                                        else {
                                            newVersion = results[0].version+1;
                                            resolve(database_server.database("projects").where("name", projectname).update({version: newVersion, type: type, forcepush: "false"}));
                                        }
                                    });
                                });

                                project_manager.invalidateCachedProject(projectname);

                                connection.write(" Database updated.\n");
                                connection.write(SPACES + "Project version v" + newVersion + " deployed.\n");
                            
                                if(await docker_manager.isProjectContainerRunning(projectname)) {
                                    let stopped = false;
                                    try {

                                        connection.write(LINE + "Stopping current project container...\n");
                                        await intercom.sendPromise("dockermng", {command: "stopProject", project: projectname});
                                        stopped = true;

                                        connection.write(SPACES + "Stopped. Restarting project to apply changes...\n");
                                        await intercom.sendPromise("dockermng", {command: "startProject", project: projectname});
                                        
                                        connection.write(LINE + "Project successfully deployed and restarted into a container.\n");
                                    } catch(error) {
                                        if(stopped)
                                            connection.write("Cannot restart the project container: " + error + "\n");
                                        else connection.write("Cannot stop the project container: " + error + "\n");
                                    }
                                } else {
                                    connection.write(LINE + "Run pmng project:start or click Start from your admin panel to start this project.\n")
                                }

                                if(lastSaveImage != undefined) {
                                    // everything went well and last version used an image, delete it by id
                                    try {
                                        await docker_manager.docker.image.get(lastSaveImage).remove();
                                    } catch(error) {
                                        connection.write(SPACES + "Cannot delete old build image with id " + lastSaveImage + ".\n");
                                    }
                                }

                                logger.tag("LCLSRV", "Project " + projectname + " deployed.");
                            } catch(error) {
                                logger.tagWarn("LCLSRV", "Deployment of project " + projectname + " failed:", error);

                                connection.write(LINE + "An error occured during deployment:\n" + error + "\n");
                                connection.write(SPACES + "Please solve the issue and recommit any change to deploy this project.\n");

                                await processExit();
                                processExit = () => {};

                                if(stopContainerIfError) {
                                    await docker_manager.docker.container.list({filters: {name: [docker_manager.getProjectDeployingContainer(projectname)]}}).then((containers) => {
                                        let prom = [];
                                        for(let container of containers) prom.push(container.stop());
                                        return Promise.allSettled(prom);
                                    });
                                }
                            }

                            connection.end();
                            break;
                        case "predeploy":
                            let mode = parts[1].toLowerCase();
                            projectname = parts[2];
                            if(projectname != undefined) {
                                if(mode == "msg") {
                                    try {
                                        await project_manager.projectExists(projectname);
                                    } catch(error) { // normally this would not happen, because only called from hooks directory inside project folder
                                        connection.write("-----> Cannot push " + projectname + ". This project doesn't exist.\n");
                                        connection.end();
                                        break;
                                    }

                                    let buildFolder = project_manager.getProjectDeployFolder(projectname, false);
                                    let currentBuildPath = project_manager.getProjectBuild(projectname, false);

                                    if(await clearDeploy(buildFolder, connection, true)) connection.write("\n");
                                    await pfs.mkdir(buildFolder);

                                    let lastBuildExists = false;
                                    try {
                                        await pfs.access(currentBuildPath);
                                        lastBuildExists = true;
                                    } catch(moveError) {
                                        // no archive build
                                    }

                                    let canPush = true;
                                    if(lastBuildExists) {
                                        let lastExtracted = path.join(buildFolder, "lastExtracted");
                                        await pfs.mkdir(lastExtracted);
    
                                        await tar.x({
                                            file: currentBuildPath,
                                            cwd: lastExtracted
                                        }, ["settings.json"]);
    
                                        let lastSettings = JSON.parse(await pfs.readFile(path.join(lastExtracted, "settings.json")));
                                        canPush = !(lastSettings.build != undefined && lastSettings.build.version >= 3 && lastSettings.build.nextProtected);

                                        if(!canPush) {
                                            let project = await project_manager.getProject(projectname);
                                            canPush = project.forcepush;
                                        }
                                    }

                                    if(canPush) {
                                        predeploys[projectname] = true;
                                        connection.write("-----> Accepting changes from local repository...\n");
                                        connection.write(SPACES + "If you quit the git process, the deployment will continue in the background.\n\n");
                                        connection.end();
                                    } else {
                                        predeploys[projectname] = false;
                                        connection.write("-----> Cannot accept changes because the project " + projectname + " is protected.\n");
                                        connection.write(SPACES + "Please open your admin panel and allow pushes for this project.\n");
                                        connection.end();

                                        await clearDeploy(buildFolder, undefined);
                                    }

                                    break;
                                } else if(mode == "exit") {
                                    let exitWithCode = (code) => {
                                        connection.write(code.toString());
                                        connection.end();
                                    }

                                    let lastStatus = predeploys[projectname] === true;
                                    exitWithCode(lastStatus ? 0 : 1);
                                    if(!lastStatus) delete predeploys[projectname];

                                    break;
                                }
                            }
                        default:
                            connection.write("Unknown command.\n");
                            connection.end();
                    }
                } else {
                    connection.write("Malformed command.\n");
                    connection.end();
                }
            }
        });

        connection.on("error", (err) => {
            // maybe voluntarily
        });

        connection.on("close", (hadError) => {
            processExit();
        });
    });

    server.listen(8042, "127.0.0.1", () => {
        logger.info("Local server started.");
    });
}

async function clearDeploy(buildFolder, connection, lastTime = true) {
    try {
        await pfs.access(buildFolder);
        // should be deleted
        if(connection != undefined) connection.write((lastTime ? "-----> Deployment files from last version detected. Deleting..." : LINE + "Removing temporary deployment files...") + "\n");
        await rmfr(buildFolder);
        if(connection != undefined) connection.write(SPACES + (lastTime ? "Last deployment files deleted." : "Temporary files removed.") + "\n");
        return true;
    } catch(error) {
        if(!lastTime) connection.write(SPACES + "Could not delete deployment files. Will be cleared next time.\n");
        return false;
    }
}


start();