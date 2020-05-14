const logger = require("simple-node-logger").createSimpleLogger();
const net = require("net");
const project_manager = require("./project_manager");
const pfs = require("fs").promises;
const rmfr = require("rmfr");
const child_process = require("child_process");
const tar = require("tar");
const path = require("path");
const database_server = require("./database_server");
const docker_manager = require("./docker_manager");
const intercom = require("./intercom/intercom_client").connect();
const string_utils = require("./string_utils");

const LINE = "\n-----> ", SPACES = "       ";

function start() {
    let server = net.createServer();
    server.on("connection", function (connection) {
        let command = "", isProcessing = false;
        connection.on("data", async (buffer) => {
            if(isProcessing) return;
            command += buffer.toString("utf-8");
            if(command.endsWith("\n")) {
                isProcessing = true;
                
                let parts = command.trim().split(":");
                if(parts.length >= 2) {
                    switch(parts[0].toLowerCase()) {
                        case "deploy":
                            let projectname = parts[1];
                            try {
                                await project_manager.projectExists(projectname);
                            } catch(error) {   // not using LINE because first line doesn't have line margin (\n)
                                connection.write("-----> Cannot deploy " + projectname + ". This project doesn't exist.\n");
                                connection.end();
                                break;
                            }

                            try {
                                connection.write("-----> Starting deployment for project " + projectname + "...\n");

                                let currentBuildPath = project_manager.getProjectBuild(projectname, false);
                                let saveBuildPath = project_manager.getProjectBuild(projectname, true);

                                try {
                                    await pfs.access(currentBuildPath);
                                    connection.write(LINE + "Saving last build...\n");
                                    await pfs.rename(currentBuildPath, saveBuildPath);
                                    connection.write(SPACES + "Build saved.\n");
                                } catch(error) {
                                    // first deploy, no version to save
                                }

                                let projectFolder = project_manager.getProjectFolder(projectname);
                                let deployFolder = project_manager.getProjectDeployFolder(projectname, false);
                                let projectRepo = project_manager.getProjectRepository(projectname);

                                let settingsFile = path.resolve(projectFolder, "settings.json");

                                try {
                                    await pfs.access(deployFolder);
                                    // deploy folder remains should be deleted
                                    connection.write(LINE + "Deploy folder from last version detected. Deleting it...\n");
                                    await rmfr(deployFolder);
                                    connection.write(SPACES + "Last deploy folder deleted.\n");
                                } catch(error) {
                                    // normally ok
                                }

                                try {
                                    await pfs.access(settingsFile);
                                    await pfs.unlink(settingsFile);
                                } catch(error) {
                                    // normally ok
                                }

                                connection.write(LINE + "Exporting project repository...\n");
                                await pfs.mkdir(deployFolder);
                                let export_process = child_process.spawn("/bin/bash", ["-c", "git archive master | tar -xf - -C " + deployFolder], {cwd: projectRepo});

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

                                connection.write(LINE + "Building project...\n");
                                
                                let projectData = {};
                                try {
                                projectData = JSON.parse(await pfs.readFile(path.resolve(deployFolder, "project.json"))).project;
                                } catch(error) {
                                    throw new Error("Cannot access project.json. Please create this file before deploying this project.");
                                }

                                let type = projectData.type.replace(/\./g, "");
                                if(type !== undefined && type.length > 0) {
                                    try {
                                        let startCmd = await require("./buildpacks/pack_" + type).build(projectname, deployFolder, (message) => {
                                            connection.write(SPACES + "  [BUILDPACK] " + message + "\n");
                                        });

                                        await pfs.writeFile(settingsFile, JSON.stringify({project: {type: type, entrypoint: startCmd}}));
                                    } catch(e) {
                                        if(e.code == "MODULE_NOT_FOUND") throw new Error("Process type '" + type + "' is incorrect.");
                                        else throw new Error("Buildpack error: " + e);
                                    }
                                } else throw new Error("Cannot find process type in project.json");
                                connection.write(SPACES + "Project built.\n");

                                connection.write(LINE + "Compressing...\n");
                                await tar.c({
                                    file: currentBuildPath,
                                    gzip: true,
                                    cwd: projectFolder
                                }, [path.relative(projectFolder, deployFolder), path.relative(projectFolder, settingsFile)]);

                                let compressedSize = "Unknown size";
                                try {
                                    compressedSize = string_utils.formatBytes((await pfs.stat(currentBuildPath)).size, 1);
                                } catch(error) { }

                                connection.write(SPACES + "Done: " + compressedSize + " \n");

                                connection.write(LINE + "Removing temporary deployment files...\n");
                                await rmfr(deployFolder);
                                await pfs.unlink(settingsFile);
                                connection.write(SPACES + "Temporary files removed.\n");

                                connection.write(LINE + "Updating database...\n");
                                let newVersion = 0;
                                await new Promise((resolve, reject) => {
                                    database_server.database("projects").where("name", projectname).select("version").then((results) => {
                                        if(results == null || results.length != 1) reject("Unable to fetch database information.");
                                        else {
                                            newVersion = results[0].version+1;
                                            resolve(database_server.database("projects").where("name", projectname).update({version: newVersion, type: type}));
                                        }
                                    });
                                });

                                project_manager.invalidateCachedProject(projectname);

                                connection.write(SPACES + "Database updated.\n");
                                connection.write(SPACES + "Project version v" + newVersion + " deployed.\n");
                            
                                if(await docker_manager.isProjectContainerRunning(projectname)) {
                                    try {

                                        connection.write(LINE + "Stopping current project container...\n");
                                        await intercom.sendPromise("dockermng", {command: "stopProject", project: projectname});

                                        connection.write(SPACES + "Stopped. Restarting project to apply changes...\n");
                                        await intercom.sendPromise("dockermng", {command: "startProject", project: projectname});
                                        
                                        connection.write(SPACES + "Project successfully deployed into a container.\n");
                                    } catch(error) {
                                        connection.write("Cannot stop or restart the project container: " + error + "\n");
                                    }
                                } else {
                                    connection.write(LINE + "Run pmng project:start or click Start from your admin panel to start this project.\n")
                                }


                            } catch(error) {
                                connection.write(LINE + "An error occured during deployment:\n" + error + "\n");
                                connection.write(SPACES + "Please solve the issue and recommit any change to deploy this project.\n");

                                try {
                                    await pfs.access(saveBuildPath);
                                    await pfs.rename(saveBuildPath, currentBuildPath);
                                } catch(error) {/* no save to restore */}
                            }

                            connection.end();
                            break;
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
    });

    server.listen(8042, "127.0.0.1", () => {
        logger.info("Local server started.");
    });
}


start();