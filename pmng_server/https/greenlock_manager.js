const Greenlock = require("greenlock");
const path = require("path");
const intercom = require("../intercom/intercom_client").connect();
const runtime_cache_delay = 300000, runtime_cache = require("runtime-caching").cache({timeout: runtime_cache_delay});
const tls = require("tls");
const pfs = require("fs").promises;

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

    greenlock.manager.defaults({
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

    let localDomain = process.env.ROOT_DOMAIN;
    add(localDomain);

    intercom.subscribe(["greenlock"], (message) => {
        let command = message.command, domain = message.domain;
        switch(command) {
            case "addCustom":
                add(domain);
                break;
            case "removeCustom":
                remove(domain);
                break;
        }
    });
}

function add(domain) {
    greenlock.add({
        subject: domain,
        altnames: [domain, "*." + domain]
    });
}

function remove(domain) {
    greenlock.remove(domain);
}

function _getSecureContext(serverFile, onlyOptions = false) {
    return pfs.readFile(path.join(__dirname, "..", "./https/greenlock.d/live/" + serverFile + "/fullchain.pem")).then((cert) => {
        return pfs.readFile(path.join(__dirname, "..", "./https/greenlock.d/live/" + serverFile + "/privkey.pem")).then((key) => {
            let options = {
                key: key,
                cert: cert
            };

            return onlyOptions ? options : tls.createSecureContext(options);
        });
    });
}; const getSecureContext = runtime_cache(_getSecureContext);

module.exports.init = init;
module.exports.getSecureContext = getSecureContext;
