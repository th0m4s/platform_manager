/**
 * Generates a random string (or password) with a random count of characters with a specific alphabet.
 * @param {number} min The minimum number of characters to include (inclusive).
 * @param {number} max The maximum number of characters to include (exclusive).
 * @param {string} alphabet A string of characters which can be found in the password.
 */
function generatePassword(min = 10, max = 20, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    if(max <= min) max = min+1;
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

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +  sizePrefixes[i] + (tens && i > 0 ? "B" : "");
}

/**
 * Parses a string representation of the size into a bytes count.
 * @param {string} sizeInput The string representation of the size to parse.
 * @returns {number} The numbers of bytes specified by *sizeInput* if it represents a valid size, *NaN* otherwise.
 */
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
                if(secondEnd == "B") return NaN;
                else storage = validParseFloat(sizeInput)*Math.pow(1000, sizePrefixes.indexOf(secondEnd))
            } else storage = validParseFloat(sizeInput + secondEnd);
        }
    } else {
        storage = validParseFloat(sizeInput + lastChar);
    }

    return Math.floor(storage);
}

const numberRegex = /^[\d.]+$/;
/**
 * Stricly parses a positive float number from a string representation (parseFloat allows letters arround number, validParseFloat not).
 * @param {string} value The string representation of the value to test.
 * @returns {number} The stricly parsed float value if the input is in the correct form, *NaN* otherwise.
 * @deprecated Use the *Number()* constructor that is using the same behaviour.
 */
function validParseFloat(value) {
    return numberRegex.test(value) ? parseFloat(value) : NaN;
}

/**
 * Batch regex to replace multiple parts of a given text.
 * @param {string} text The text to search and replace in.
 * @param {object} args An object containing search values as keys and replacements as values.
 * @returns {text} The modified text with all arguments replaced. 
 */
function replaceArgs(text, args) {
    for(let arg of Object.entries(args)) {
        text = text.replace(new RegExp(arg[0], "g"), arg[1]);
    }

    return text;
}

/**
 * Modify a *configuration* file and only keeps certain lines based on *keepsLines* and *removeLines* tags.
 * @param {string} text A configuration file or any given text to modify. 
 * @param {Array<string>} keepLines Tags to remove in front of lines to keep.
 * @param {Array<string>} removeLines Tags of lines that should not be included in the result (ie. removed).
 * @returns {string} A new text only containing valid lines.
 */
function keepConfigLines(text, keepLines, removeLines = []) {
    let newLines = [];
    for(let line of text.split("\n")) {
        let keep = true;
        for(let keep of keepLines) {
            if(line.startsWith(keep + ":")) {
                line = line.substring(keep.length+1);
                break;
            }
        }

        for(let rem of removeLines) {
            if(line.startsWith(rem + ":")) {
                keep = false;
                break;
            }
        }

        if(keep) newLines.push(line);
    }

    return newLines.join("\n");
}

module.exports = {generatePassword, formatBytes, validParseFloat, parseBytesSize, replaceArgs, keepConfigLines};