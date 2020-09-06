const project_manager = require("../project_manager");
const pfs = require("fs").promises;
const getfoldersize = require("get-folder-size");
const string_utils = require("../string_utils");
const plans_manager = require("../plans_manager");
const regex_utils = require("../regex_utils");
const intercom = require("../intercom/intercom_client").connect(); 
const path = require("path");
const child_process = require("child_process");
const runtime_cache_delay = 8000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const Plugin = require("./lib_plugin");

function _mountProject(project) {
    return intercom.sendPromise("rootProcessor", {command: "storagePlugin", action: "mount", project: project});
}

function _umountProject(project) {
    return intercom.sendPromise("rootProcessor", {command: "storagePlugin", action: "unmount", project});
}

function _getUsage(projectname) {
    return new Promise((resolve) => {
        // usage doesn't reject, they resolve with type: "measure_error"
        let projectstorage = project_manager.getProjectStorage(projectname);
        getfoldersize(projectstorage, (err, size) => {
            if(err) {
                resolve({type: "measure_error", error: err});
            } else {
                pfs.stat(path.resolve(projectstorage, "..", "..", "disks", projectname + ".img")).then((diskStats) => {
                    let allocatedSize = diskStats.size;
                    resolve({type: "limited", value: size, formatted: string_utils.formatBytes(size) + " used out of " + string_utils.formatBytes(allocatedSize) + " (" + parseFloat(size / allocatedSize * 100).toFixed(0) + "%).", maximum: allocatedSize});
                }).catch((error) => {
                    resolve({type: "measure_error", error});
                });
            }
        });
    });
};

class PersistentStoragePlugin extends Plugin {
    static startGlobalPlugin(plugindirectory) {
        // TODO: check is baseDir could be replaced by plugindirectory
        let baseDir = path.join(process.env.PLUGINS_PATH, "storages");
        return pfs.readdir(path.join(baseDir, "disks")).then((files) => {
            let existingDisks = [];
            for(let file of files) {
                let projectName = regex_utils.testStorageDisk(file);
                if(projectName != null) existingDisks.push(projectName);
            }

            return new Promise((resolve) => {
                child_process.exec("mount | grep " + baseDir, {}, (error, stdout, stderr) => {
                    let results = stdout.split("\n");
                    for(let line of results) {
                        if(line.length > 0) {
                            // TODO: check if "mount" output list format is always the same
                            let projectName = line.split(" on ")[0].split("/").splice(-1)[0].split(".")[1];
                            if(projectName != undefined && projectName.length > 0) existingDisks.splice(existingDisks.indexOf(projectName), 1);
                        }
                    }

                    let mountProm = [];

                    // existingDisks doesn't contains already mounted disks
                    for(let project of existingDisks) {
                        mountProm.push(_mountProject(project));
                    }

                    Promise.all(mountProm).then(resolve);
                });
            });
            
        });
    }

    // not using docker volumes, just binding a directory from host to container
    // mounted folder will be temp converted to volume and remounted into the container
    // because volumes cannot be accessed outside docker (via ftp for example)
    static async startProjectPlugin(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
        containerconfig.HostConfig.Binds = [project_manager.getProjectStorage(projectname) + ":/var/storage"];
        return containerconfig;
    }

    static postInstall(projectname, allconfigs) {
        let projectStorage = project_manager.getProjectStorage(projectname), baseDir = path.join(projectStorage, "..", "..");
        return pfs.mkdir(projectStorage).then(async () => {
            let projectOwnerId = (await project_manager.getProject(projectname)).ownerid;
            let storageSize = allconfigs.hasOwnProperty("plan-limiter") ? allconfigs["plan-limiter"].storage : 0;
            if(storageSize == 0) storageSize = await plans_manager.userMaxStorage(projectOwnerId);
            if(storageSize == 0) storageSize = 10737418240; // if user entered 0 and if plan limit is 0, limit to 10g (user can then use a higher value)

            await new Promise((resolve) => {
                child_process.exec("truncate -s " + storageSize + " ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
            });

            await new Promise((resolve) => {
                child_process.exec("mkfs -t ext4 ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
            });

            return _mountProject(projectname);
        });
    }

    static uninstallPlugin(projectname, pluginconfig) {
        return _umountProject(projectname).then((response) => {
            if(response.error) return Promise.reject("Cannot unmount project storage directory.");
            else {
                let mountedFolder = project_manager.getProjectStorage(projectname);
                 return pfs.rmdir(mountedFolder).then(() => {
                    return pfs.unlink(path.join(mountedFolder, "..", "..", "disks", projectname + ".img"));
                });
            }
        });
    }

    static getUsage = runtime_cache(_getUsage);

    static async updateFilesize(projectname, oldsize, newsize) {
        if(oldsize == newsize) return;
        let projectStorage = project_manager.getProjectStorage(projectname), baseDir = path.join(projectStorage, "..", "..");

        try {
            await pfs.access(path.join(baseDir, "disks", projectname + ".img"));
        } catch(error) {
            throw "Cannot access disk file: " + error;
        }

        // TODO: why not allow to keep the disk mounted if newsize > oldsize
        // disks support on-line resizing (but not shrinking)
        await _umountProject(projectname);

        await new Promise((resolve) => {
            child_process.exec("e2fsck -fy ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
        });

        if(oldsize > newsize) {
            await new Promise((resolve) => {
                child_process.exec("resize2fs ./disks/" + projectname + ".img " + newsize, {cwd: baseDir}, resolve);
            });
        }

        await new Promise((resolve) => {
            child_process.exec("truncate -s " + newsize + " ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
        });

        if(newsize > oldsize) {
            await new Promise((resolve) => {
                child_process.exec("resize2fs ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
            });
        }

        await _mountProject(projectname);
    }
}

module.exports = PersistentStoragePlugin;