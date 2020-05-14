function drop() {
    process.setgid(process.env.PROC_GID);
    process.setuid(process.env.PROC_UID);
}


module.exports.drop = drop;