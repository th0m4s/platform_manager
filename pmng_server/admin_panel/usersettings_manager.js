const database_server = require("../database_server");

const SETTINGS = {
    thin_buttons: {
        type: "boolean",
        default: false,
        displayName: "Thin buttons on lists with multiple action buttons"
    },
    landing_page: {
        type: "enum",
        values: {  // keys are internal values, then values are displayed values
            dashboard: "Dashboard",
            projects: "Projects",
            subprocesses: "Platform subprocesses",
            dnschallenges: "DNS challenges"
        },
        default: "dashboard", // here default is the internal value
        displayName: "Landing page after login"
    }
}

function getDefaultSettings() {
    return Object.fromEntries(Object.entries(SETTINGS).map(([key, value]) => [key, value.default]));
}

async function getUserSettings(userid) {
    return Object.assign({}, getDefaultSettings(), await database_server.database("users").where("id", userid).select("settings").first().then((x) => x.settings ?? "null").then(JSON.parse));
}

async function getUserNameSettings(username) {
    return Object.assign({}, getDefaultSettings(), await database_server.database("users").where("name", username).select("settings").first().then((x) => x.settings ?? "null").then(JSON.parse));
}

function setUserSettings(userid, settings) {
    settings = Object.fromEntries(Object.entries(settings).filter(([key, _]) => SETTINGS[key] != undefined));
    return database_server.database("users").where("id", userid).update("settings", JSON.stringify(settings));
}

async function getUserSetting(userid, setting) {
    return (await getUserSettings(userid))?.[setting];
}

async function getUserNameSetting(username, setting) {
    return (await getUserNameSettings(username))?.[setting];
}

async function setUserSetting(userid, setting, value, throwIfInvalid = false) {
    if(SETTINGS[setting] != undefined) {
        let correctType = SETTINGS[setting].type;
        let currentType = typeof value;
        let valid = false;

        switch(correctType) {
            case "number":
                if(currentType == "number") valid = true;
                else if(currentType == "string") {
                    value = parseInt(value);
                    valid = !isNaN(value);
                }
                break;
            case "boolean":
                if(currentType == "boolean") valid = true;
                else if(currentType == "number") {
                    value = value != 0;
                    valid = true;
                }
                else if(currentType == "string") {
                    value = value.toLowerCase();
                    valid = value == "true" || value == "false";
                    value = value == "true";
                }
                break;
            case "string":
                if(currentType == "string") valid = true;
                else if(currentType == "boolean" || currentType == "number") {
                    value = value?.toString() ?? ("" + value);
                    valid = true;
                }
                break;
            case "enum":
                if(currentType == "string")
                    valid = SETTINGS[setting].values[value] != undefined;
                break;
        }

        if(valid) {
            let settings = await getUserSettings(userid);
            settings[setting] = value;
            await setUserSettings(userid, settings);
        } else if(throwIfInvalid) {
            throw new Error("Invalid setting value!");
        }
    } else if(throwIfInvalid) {
        throw new Error("Invalid setting key!");
    }
}


module.exports.SETTINGS = SETTINGS;
module.exports.getUserSettings = getUserSettings;
module.exports.getUserNameSettings = getUserNameSettings;
module.exports.setUserSettings = setUserSettings;
module.exports.getUserSetting = getUserSetting;
module.exports.getUserNameSetting = getUserNameSetting;
module.exports.setUserSetting = setUserSetting;