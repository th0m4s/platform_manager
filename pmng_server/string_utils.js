/**
 * Generates a random string (or password) with a random count of characters with a specific alphabet.
 * @param {number} min The minimum number of characters to include (inclusive).
 * @param {number} max The maximum number of characters to include (exclusive).
 * @param {string} alphabet A string of characters which can be found in the password.
 */
function generatePassword(min = 10, max = 20, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    return Array(Math.floor(Math.random()*(max-min))+min).fill(alphabet).map(function(x) { return x[Math.floor(Math.random() * x.length)] }).join('')
}

const sizePrefixes = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"];
// see https://stackoverflow.com/a/18650828/6301383
/**
 * Formats an amount of bytes in a human readable string with a specific amount of decimals.
 * @param {number} bytes The amount of bytes to format.
 * @param {number} decimals The number of decimals to include.
 * @param {boolean} tens If *true*, will format bytes in powers of 10, if *false*, in powers of 2^10.
 * @returns {string} The formatted bytes string.
 */
function formatBytes(bytes, decimals = 2, tens = false) {
    if (bytes === 0) return "0B";

    const k = tens ? 1000 : 1024;
    const dm = decimals < 0 ? 0 : decimals;

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +  sizePrefixes[i] + (tens ? "B" : "");
}

function parseBytesSize(sizeInput) {
    sizeInput = sizeInput.toString().trim();
    if(sizeInput.length == 0) return NaN;

    let lastChar = sizeInput.slice(-1);
    sizeInput = sizeInput.substr(0, sizeInput.length-1);
    if(sizePrefixes.includes(lastChar)) {
        if(lastChar != "B") storage = validParseFloat(sizeInput)*Math.pow(1024, sizePrefixes.indexOf(lastChar));
        else {
            let secondEnd = sizeInput.slice(-1);
            sizeInput = sizeInput.substr(0, sizeInput.length-1);
            if(sizePrefixes.includes(secondEnd)) {
                if(secondEnd == "B") return naN;
                else storage = validParseFloat(sizeInput)*Math.pow(1000, sizePrefixes.indexOf(secondEnd))
            } else storage = validParseFloat(sizeInput + secondEnd);
        }
    } else {
        storage = validParseFloat(sizeInput + lastChar);
    }

    return Math.floor(storage);
}

const numberRegex = /^[\d.]+$/;
function validParseFloat(value) {
    return numberRegex.test(value) ? parseFloat(value) : NaN;
}

module.exports.generatePassword = generatePassword;
module.exports.formatBytes = formatBytes;
module.exports.validParseFloat = validParseFloat;
module.exports.parseBytesSize = parseBytesSize;