function generatePassword(min = 10, max = 20, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    return Array(Math.floor(Math.random()*(max-min))+min).fill(alphabet).map(function(x) { return x[Math.floor(Math.random() * x.length)] }).join('')
}

// see https://stackoverflow.com/a/18650828/6301383
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0B";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +  sizes[i];
}

module.exports.generatePassword = generatePassword;
module.exports.formatBytes = formatBytes;