const project_manager = require("../project_manager");
const pfs = require("fs").promises;
const getfoldersize = require("get-folder-size");
const string_utils = require("../string_utils");
const regex_utils = require("../regex_utils");
const intercom = require("../intercom/intercom_client").connect(); 
const path = require("path");
const child_process = require("child_process");
const runtime_cache_delay = 30000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});

const STORAGE_SIZE = 10737418240; // 10GB

function startGlobalPlugin(plugindirectory) {
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
function startProjectPlugin(projectname, containerconfig, network, plugincontainername, pluginconfig) {
    containerconfig.HostConfig.Binds = [project_manager.getProjectStorage(projectname) + ":/var/storage"];
    return containerconfig;
}

async function stopProjectPlugin(projectname) {

}

function projectContainerCreated(projectname, containerconfig, networkname, plugincontainername, pluginconfig) {
    
}


function installPlugin(projectname, pluginconfig) {
    let projectStorage = project_manager.getProjectStorage(projectname), baseDir = path.join(projectStorage, "..", "..");
    return pfs.mkdir(projectStorage).then(async () => {
        await new Promise((resolve) => {
            child_process.exec("truncate -s " + STORAGE_SIZE + " ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
        });

        await new Promise((resolve) => {
            child_process.exec("mkfs -t ext4 ./disks/" + projectname + ".img", {cwd: baseDir}, resolve);
        });

        return _mountProject(projectname);
    });
}

function _mountProject(project) {
    return intercom.sendPromise("rootProcessor", {command: "storagePlugin", action: "mount", project: project});
}

function uninstallPlugin(projectname, pluginconfig) {
    return intercom.sendPromise("rootProcessor", {command: "storagePlugin", action: "unmount", project: projectname}).then((response) => {
        if(response.error) return Promise.reject("Cannot unmount project storage directory.");
        else {
            let mountedFolder = project_manager.getProjectStorage(projectname);
             return pfs.rmdir(mountedFolder).then(() => {
                return pfs.unlink(path.join(mountedFolder, "..", "..", "disks", projectname + ".img"));
            });
        }
    });
}

function getDefaultConfig() {
    return {};
}

function _getUsage(projectname) {
    return new Promise((resolve) => {
        // usage doesn't reject, they resolve with type: "measure_error"
        getfoldersize(project_manager.getProjectStorage(projectname), (err, size) => {
            if(err) {
                resolve({type: "measure_error", error: err});
            } else {
                resolve({type: "limited", value: size, formatted: string_utils.formatBytes(size) + " used out of " + string_utils.formatBytes(STORAGE_SIZE) + " (" + parseFloat(size / STORAGE_SIZE * 100).toFixed(0) + "%).", maximum: STORAGE_SIZE});
            }
        });
    });
}; const getUsage = runtime_cache(_getUsage);


module.exports.startGlobalPlugin = startGlobalPlugin;
module.exports.startProjectPlugin = startProjectPlugin;
module.exports.stopProjectPlugin = stopProjectPlugin;
module.exports.projectContainerCreated = projectContainerCreated;
module.exports.installPlugin = installPlugin;
module.exports.uninstallPlugin = uninstallPlugin;
module.exports.getUsage = getUsage;
module.exports.prepareRouter = () => {};
module.exports.getConfigForm = () => [];

module.exports.getDefaultConfig = getDefaultConfig;