function drop() {
    process.setgid(getGID());
    process.setuid(getUID());
}

function droppingOptions(asObject = true) {
    return asObject ? {
        uid: getUID(),
        gid: getGID()
    } : [getUID(), getGID()];
}

function getUID() {
    return parseInt(process.env.PROC_UID);
}

function getGID() {
    return parseInt(process.env.PROC_GID);
}


module.exports.drop = drop;
module.exports.droppingOptions = droppingOptions;