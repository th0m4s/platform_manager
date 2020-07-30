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
});

function showMain() {
    $("#loading-container").hide();
    $("#main-container").show();
}

let noLoadingTimeout = setTimeout(() => {
    showMain();
}, 500);

window.loadAndInit = function(script) {
    if(noLoadingTimeout > 0) {
        clearTimeout(noLoadingTimeout);
        noLoadingTimeout = -1;
    }
    $.getScript("/static/js/" + script + ".dist.js", () => {
        showMain();
        window[script].init();
    });
}

console.log("%cStop! Developper console ahead!", "color: red; font-size: 30px; font-weight: bold;");
console.log("This is your browser developper console. Do not copy/paste or write any command you don't understand, as it may be used to take the total control of your account and your projects.");
console.log("Your unique account identifier (API key) is stored in the webpage to be used by lists and actions. It may be extracted from this console.");
