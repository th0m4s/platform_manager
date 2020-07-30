function drop() {
    process.setgid(getGID());
    process.setuid(getUID());
}

function droppingOptions() {
    return {
        uid: getUID(),
        gid: getGID()
    }
}

function getUID() {
    return parseInt(process.env.PROC_UID);
}

function getGID() {
    return parseInt(process.env.PROC_GID);
}


module.exports.drop = drop;
module.exports.droppingOptions = droppingOptions;
module.exports.getUID = getUID;
module.exports.getGID = getGID;
