import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/js/fontawesome';
import '@fortawesome/fontawesome-free/js/solid';
import '@fortawesome/fontawesome-free/js/regular';
import '@fortawesome/fontawesome-free/js/brands';
import 'animate.css';
import 'bootstrap4-tagsinput-umd/tagsinput.css'
import './style.css';

window.$ = require("jquery");

require("bootstrap");
require("bootstrap-notify");
require("bootstrap4-tagsinput-umd/tagsinput");

window.Cookies = require("js-cookie");
window.Bloodhound = require("corejs-typeahead/dist/typeahead.bundle");

window.utils = require("./utils");

window.projects_list = require("./projects_list");
window.project_details = require("./project_details");

$.notifyDefaults({
    delay: 3000
});

$(document).ready(() => {
    utils.showCookieNotifications();
})