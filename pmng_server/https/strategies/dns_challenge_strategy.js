const intercom = require("../../intercom/intercom_client").connect();

module.exports.create = function () {
    let m = {};

    m.init = async function(deps) {
        intercom.changeConfig({autoReject: false});
        return null;
    }

    m.zones = function(opts) {
        return Promise.resolve([]); // optional
    }

    m.set = function(opts) {
        return intercom.sendPromise("dnsChallenges", {command: "set", host: opts.challenge.dnsHost, token: opts.challenge.dnsAuthorization}).then((response) => {
            if(response.error) throw "Cannot set DNS challenge.";
        });
    }

    m.get = function(opts) {
        return intercom.sendPromise("dnsChallenge", {command: "get", host: opts.challenge.dnsHost}).then((response) => {
            if(response.error) throw "Cannot get DNS challenge.";
            else return response.token;
        });
    }

    m.remove = function(opts) {
        return intercom.sendPromise("dnsChallenges", {command: "remove", host: opts.challenge.dnsHost, token: opts.challenge.dnsAuthorization}).then((response) => {
            if(response.error) throw "Cannot remove DNS challenge.";
        });
    }

    return m;
}