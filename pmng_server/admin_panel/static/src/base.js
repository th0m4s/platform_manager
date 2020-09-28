window.$ = require("jquery");
window.moment = require("moment");

require("bootstrap");
require("bootstrap-notify");
require("bootstrap4-tagsinput-umd/tagsinput");

window.Cookies = require("js-cookie");
window.Bloodhound = require("corejs-typeahead/dist/typeahead.bundle");

$.ajaxSetup({ cache: true });

$.notifyDefaults({
    delay: 3000
});

$(document).ready(() => {
    if(location.href.endsWith("/")) window.history.replaceState(null, "", location.href.substring(0, location.href.length-1));
    utils.showCookieNotifications();
    $('[data-toggle="tooltip"]').tooltip();
});

window.hideMain = () => {
    $("#loading-container").show();
    $("#main-container").hide();
}

window.showMain = () => {
    $("#loading-container").hide();
    $("#main-container").show();
}

let noLoadingTimeout = setTimeout(() => {
    window.showMain();
}, 500);

function load(nextScripts) {
    let script = nextScripts.shift(), isRequirement = nextScripts.length > 0;
    $.getScript(isRequirement ? script : "/static/js/" + script + ".dist.js", () => {
        if(isRequirement) {
            load(nextScripts);
        } else {
            window.showMain();
            window[script].init();
        }
    });
}

window.loadAndInit = function(script, requirements = []) {
    if(noLoadingTimeout > 0) {
        clearTimeout(noLoadingTimeout);
        noLoadingTimeout = -1;
    }
    load(requirements.concat(script));
}

console.log("%cStop! Developper console ahead!", "color: red; font-size: 30px; font-weight: bold;");
console.log("This is your browser developper console. Do not copy/paste or write any command you don't understand, as it may be used to take the total control of your account and your projects.");
console.log("Your unique account identifier (API key) is stored in the webpage to be used by lists and actions. It may be extracted from this console.");
