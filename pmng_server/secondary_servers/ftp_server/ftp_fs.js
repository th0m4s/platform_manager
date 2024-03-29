const { FileSystem } = require("ftp-srv"), ftpErrors = require("ftp-srv/src/errors");
const project_manager = require("../../project_manager");
const path = require("path");

class FTPfs extends FileSystem {
    constructor(connection, user) {
        super(connection, {root: path.join(process.env.PLUGINS_PATH, "storages", "mounts"), cwd: "/"});
        this._user = user;
    }

    // currentDirectory is not overwritten

    _canAccess(path, writeMode) {
        let { clientPath } = super._resolvePath(path);

        if(clientPath == "/") {
            return Promise.resolve(!writeMode); // cannot write on root
        } else {
            let parts = clientPath.split("/");
            if((parts.length == 2 || parts[2].trim().length == 0) && writeMode) return Promise.resolve(false);
            // if write on root, return false
            
            let project = parts[1];
            return project_manager.canAccessProject(project, this._user.id, writeMode).then(() => {
                return (parts.length < 3 || parts[2] != "lost+found");
                // hide lost+found directory in project root (required for ext4 volume)
            }).catch(() => {
                return false;
            });
        }
    }

    get(fileName) {
        return this._canAccess(fileName, false).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else return super.get(fileName);
        });
    }

    list(path = ".") {
        return this._canAccess(path, false).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.list(path);
            }
        }).then((paths) => {
            let { clientPath } = super._resolvePath(path);
            if(clientPath == "/") {
                let prom = [], byName = {};

                paths.forEach((fileStat) => {
                    byName[fileStat.name] = fileStat;
                    prom.push(project_manager.canAccessProject(fileStat.name, this._user.id, false));
                });
                
                return Promise.allSettled(prom).then((results) => {
                    let rightsOk = [];

                    results.forEach((result) => {
                        if(result.status == "fulfilled") {
                            rightsOk.push(byName[result.value]);
                        }
                    });

                    return rightsOk;
                });
            } else {
                let parts = clientPath.split("/");
                let project = parts[1];
                return project_manager.canAccessProject(project, this._user.id, false).then(() => {
                    if(parts.length > 2 && parts[2].length > 0) return paths;
                    else {
                        let results = [];
                        for(let file of paths) {
                            if(file.name !== "lost+found") results.push(file);
                        }

                        return results;
                    }
                }).catch(() => {
                    throw new ftpErrors.FileSystemError("Unauthorized access");
                });
            }
        });
    }

    chdir(path = ".") {
        return this._canAccess(path, false).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.chdir(path);
            }
        });
    }

    write(fileName, {append = false, start = undefined} = {}) {
        return this._canAccess(fileName, true).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.write(fileName, {append, start});
            }
        });
    }

    read(fileName, {start = undefined} = {}) {
        return this._canAccess(fileName, false).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.read(fileName, {start});
            }
        });
    }

    delete(path) {
        return this._canAccess(path, true).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.delete(path);
            }
        });
    }

    mkdir(path) {
        return this._canAccess(path, true).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.mkdir(path);
            }
        });
    }

    rename(from, to) {
        return this._canAccess(from, true).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.rename(from, to);
            }
        });
    }

    chmod(path, mode) {
        return this._canAccess(path, true).then((result) => {
            if(!result) throw new ftpErrors.FileSystemError("Unauthorized access");
            else {
                return super.chmod(path, mode);
            }
        });
    }

}

module.exports = FTPfs;