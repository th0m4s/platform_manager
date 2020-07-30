/**
 * Drop the privileges on the current process according to the UID and GID set in the *.env* configuration file.
 */
function drop() {
    process.setgid(getGID());
    process.setuid(getUID());
}

/**
 * Returns the options to drop a process or an execution.
 * @param {boolean} asObject Change the return mode between object and array.
 * @returns {{uid: number, gid: number} | [number, number]} If *asObject* is *true*, return an object with *uid* and *gid* properties,
 * else return an array of two numbers (*uid* as 0 and *gid* as 1 - useful for array destructuration).
 */
function droppingOptions(asObject = true) {
    return asObject ? {
        uid: getUID(),
        gid: getGID()
    } : [getUID(), getGID()];
}

/**
 * Gets the configured UID.
 * @returns {number} The parsed UID as a number.
 */
function getUID() {
    return parseInt(process.env.PROC_UID);
}

/**
 * Gets the configured GID.
 * @returns {number} The parsed GID as a number.
 */
function getGID() {
    return parseInt(process.env.PROC_GID);
}


module.exports.drop = drop;
module.exports.droppingOptions = droppingOptions;