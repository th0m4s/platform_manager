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
const { build } = require("./buildpacks/lib_pack");

const LINE = "\n-----> ", SPACES = "       ";

/**
 * Starts the local platform server.
 */
function start() {
    privileges.drop();

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

                            let currentBuildPath = project_manager.getProjectBuild(projectname, false);
                            let saveBuildPath = project_manager.getProjectBuild(projectname, true);

                            let stopContainerIfError = true;

                            try {
                                connection.write("-----> Starting deployment for project " + projectname + "...\n");

                                try {
                                    await pfs.access(currentBuildPath);
                                    connection.write(LINE + "Saving last build...\n");
                                    await pfs.rename(currentBuildPath, saveBuildPath);
                                    connection.write(SPACES + "Build saved.\n");
                                } catch(error) {
                                    // first deploy, no version to save
                                }

                                let buildFolder = project_manager.getProjectDeployFolder(projectname, false);
                                let projectCodeFolder = path.resolve(buildFolder, "project");

                                let projectRepo = project_manager.getProjectRepository(projectname);

                                let settingsFile = path.resolve(buildFolder, "settings.json");

                                try {
                                    await pfs.access(buildFolder);
                                    // should be deleted
                                    connection.write(LINE + "Deployment files from last version detected. Deleting...\n");
                                    await rmfr(buildFolder);
                                    connection.write(SPACES + "Last deployment files deleted.\n");
                                } catch(error) {
                                    // normally ok
                                }

                                await pfs.mkdir(buildFolder); // will create the build.tgz
                                await pfs.mkdir(projectCodeFolder); // will contain the repository code
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
                                
                                let projectData = {};
                                try {
                                    projectData = JSON.parse(await pfs.readFile(path.resolve(projectCodeFolder, "project.json"))).project;
                                } catch(error) {
                                    throw "Cannot find the required project.json. Please create this file and push it to deploy the project.";
                                }

                                let type = projectData.type.replace(/\./g, "");
                                if(type !== undefined && type.length > 0) {
                                    try {
                                        let buildpack = require("./buildpacks/pack_" + type);

                                        connection.write(LINE + "Starting deployment container...");
                                        let image = docker_manager.getImageFromType(type);

                                        let container = null;
                                        try {
                                            container = await docker_manager.docker.container.create({
                                                Image: image,
                                                name: docker_manager.getProjectDeployingContainer(projectname),
                                                Tty: true,
                                                HostConfig: {
                                                    AutoRemove: true,
                                                    Binds: [projectCodeFolder + ":/var/project"]
                                                },
                                                Entrypoint: ["/bin/bash"] // create infinite running container
                                            });

                                            await container.start();
                                        } catch(error) {
                                            console.log(error);
                                            if(error.code == 409) {
                                                stopContainerIfError = false;
                                                throw "This project is already being deployed (the deployment container already exists.)";
                                            } else throw error;
                                        }
                                    

                                        let execCommand = async (command, logReceived = undefined, buffer = false) => {
                                            let exec = await container.exec.create({
                                                AttachStdin: false,
                                                AttachStdout: true,
                                                AttachStderr: true,
                                                WorkingDir: "/var/project",
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
                                                        let string = data.toString(), contents = string.substring(8), stream = string.charCodeAt(0);
                                                        if(out == undefined) {
                                                            logReceived(stream, contents);
                                                        } else if(stream == 1) out += contents;
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
                                        };

                                        let readFile = (filename) => {
                                            filename = path.resolve(projectCodeFolder, filename);
                                            if(!filename.startsWith(projectCodeFolder)) throw "Cannot access file outside of project.";

                                            return pfs.readFile(filename);
                                        }

                                        /**
                                         * Checks if a path exists in the container
                                         * @param {"f" | "d"} type Bash mode: *f* for file, *d* for directory .
                                         * @param {*} path The container path to check from the root of the project.
                                         */
                                        let exists = (type, name) => {
                                            // TODO: rewrite with local files
                                            let fullpath = path.resolve("/var/project", name);
                                            return execCommand("[[ -" + type + " " + fullpath + " ]]").then(({out, err, code}) => {
                                                if(err.length > 0) throw err;
                                                else return code == 0;
                                            });
                                        }

                                        connection.write(" Started.\n");
                                        connection.write(SPACES + "Executing buildpack...\n");

                                        let startCmd = [];
                                        try {
                                            startCmd = await buildpack.build(projectname, {execCommand, readFile, exists}, (message) => {
                                                connection.write(SPACES + "  [BUILDPACK] " + message + "\n");
                                            });
                                        } catch(e) {
                                            throw "Buildpack error: " + e;
                                        }

                                        await pfs.writeFile(settingsFile, JSON.stringify({project: {type: type, entrypoint: startCmd}, buildVersion: 2}));
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

                                connection.write(LINE + "Removing temporary deployment files...\n");
                                await rmfr(buildFolder);
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
                                        
                                        connection.write(LINE + "Project successfully deployed and restarted into a container.\n");
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