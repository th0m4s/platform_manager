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
        store: {
            module: "greenlock-store-fs",
            basepath: path.resolve(__dirname, "greenlock.d")
        },
        challenges: getChallenges(true) // at least one (as full dns is true by default, set dns-01 to be the default challenge)
    });

    let localDomain = process.env.ROOT_DOMAIN;
    add(localDomain, true);

    intercom.subscribe(["greenlock"], (message) => {
        let command = message.command, domain = message.domain, full_dns = message.full_dns;
        switch(command) {
            case "addCustom":
                add(domain, full_dns);
                break;
            case "removeCustom":
                remove(domain);
                break;
            case "edition":
                remove(domain);
                add(domain, full_dns);
                break;
        }
    });
}

function getChallenges(full_dns) {
    if(full_dns) {
        return {
            "dns-01": {
                module: path.resolve(__dirname, "strategies", "dns_challenge_strategy")
            }
        };
    } else {
        return {
            "http-01": {
                module: path.resolve(__dirname, "strategies", "http_challenge_strategy")
            }
        };
    }
}

function add(domain, full_dns = true) {
    greenlock.add({
        subject: domain,
        altnames: [domain, ...(full_dns ? ["*." + domain] : ["www." + domain])],
        challenges: getChallenges(full_dns)
    });
}

function remove(domain) {
    greenlock.remove({
        subject: domain
    });
}

function _getSecureContext(serverFile, onlyOptions = false) {
    return greenlock.get(serverFile).then((pems) => {
        let options = {
            key: pems.privkey,
            cert: site.pems.cert + "\n" + site.pems.chain + "\n"
        };

        return onlyOptions ? options : tls.createSecureContext(options);
    });
}; const getSecureContext = runtime_cache(_getSecureContext);

module.exports.init = init;
module.exports.getSecureContext = getSecureContext;
