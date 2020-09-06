/**
 * Generates a random string (or password) with a random count of characters with a specific alphabet.
 * @param {number} min The minimum number of characters to include (inclusive).
 * @param {number} max The maximum number of characters to include (exclusive).
 * @param {string} alphabet A string of characters which can be found in the password.
 */
function generatePassword(min = 10, max = 20, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    return Array(Math.floor(Math.random()*(max-min))+min).fill(alphabet).map(function(x) { return x[Math.floor(Math.random() * x.length)] }).join('')
}

// see https://stackoverflow.com/a/18650828/6301383
/**
 * Formats an amount of bytes in a human readable string with a specific amount of decimals.
 * @param {number} bytes The amount of bytes to format.
 * @param {number} decimals The number of decimals to include.
 * @returns {string} The formatted bytes string.
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0B";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +  sizes[i];
}

module.exports.generatePassword = generatePassword;
module.exports.formatBytes = formatBytes;