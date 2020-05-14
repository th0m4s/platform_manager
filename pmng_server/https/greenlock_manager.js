const Greenlock = require("greenlock");
const path = require("path");
let greenlock = null;

function init() {
    greenlock = Greenlock.create({
        packageRoot: path.resolve(__dirname, "greenlock.d"),
        configDir: "./",
        staging: process.env.NODE_ENV != "production",
        maintainerEmail: process.env.WEBMASTER_MAIL,
        packageAgent: "PlatformManager/1.0.0",
        notify: function(event, details) {
            if (event == "error") {
                console.error("err " + details);
            }
        }
    });

    let localDomain = process.env.ROOT_DOMAIN;

    greenlock.add({
        subject: localDomain,
        altnames: [localDomain, "*." + localDomain],
        subscriberEmail: process.env.WEBMASTER_MAIL,
        agreeToTerms: true,
        challenges: {
            "dns-01": {
                module: path.resolve(__dirname, "challenge_strategy")
            }
        },
        store: {
            module: "greenlock-store-fs",
            basepath: path.resolve(__dirname, "greenlock.d")
        }
    });
}


module.exports.init = init;