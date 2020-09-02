const intercom = require("../../intercom/intercom_client").connect();

module.exports.create = function () {
    let m = {};

    m.init = async function(deps) {
        intercom.changeConfig({autoReject: false});
        return null;
    }

    m.set = function(opts) {
        return intercom.sendPromise("httpChallenges", {command: "set", domain: opts.challenge.altname, token: opts.challenge.token, contents: opts.challenge.keyAuthorization}).then((response) => {
            if(response.error) throw "Cannot set HTTP challenge.";
        });
    }

    m.get = function(opts) {
        return intercom.sendPromise("httpChallenges", {command: "get", domain: opts.challenge.altname, token: opts.challenge.token}).then((response) => {
            if(response.error) throw "Cannot get HTTP challenge.";
            else return response.contents;
        });
    }

    m.remove = function(opts) {
        return intercom.sendPromise("httpChallenges", {command: "remove", domain: opts.challenge.altname, token: opts.challenge.token}).then((response) => {
            if(response.error) throw "Cannot remove HTTP challenge.";
        });
    }

    return m;
}