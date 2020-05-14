function disableButton(button, text) {
    let btn = $(button).addClass("disabled").attr("disabled", "disabled");
    if(text != undefined) btn.html(text)
}

function enableButton(button, text) {
    let btn = $(button).removeClass("disabled").removeAttr("disabled");
    if(text != undefined) btn.html(text);
}

let modalShown = false, lastText = "";
function showInfiniteLoading(text) {
    lastText = text;
    $("#loading-content").html(text);
    modalShown = true;
    $("#modal-loading").modal({
        backdrop: "static",
        keyboard: false
    });
} 
function hideLoading() {
    modalShown = false;
    $("#modal-loading").modal("hide");
}

$(document).ready(() => {
    $("#modal-loading").on("shown.bs.modal", () => {
        if(!modalShown) hideLoading();
    }); 
    $("#modal-loading").on("hidden.bs.modal", () => {
        if(modalShown) showInfiniteLoading(lastText);
    });

    updateTagsInputWidth();
});

function updateTagsInputWidth() {
    let inputs = $(".bootstrap-tagsinput input");
    for(let i = 0; i < inputs.length; i++) {
        let input = $(inputs.get(i));
        input.attr("size", input.attr("placeholder").length);
    }
}

function generateAlert(type, message) {
    return '<div class="alert alert-' + type + '" role="alert">' + message + '</div>';
}

const defaultNotif = {danger: [], warning: [], success: [], info: []};
function addNotification(message, type) {
    let actual = Cookies.getJSON("notifications") || defaultNotif;
    actual[type].push(message);
    Cookies.set("notifications", actual);
}

function showCookieNotifications() {
    let notifs = Cookies.getJSON("notifications") || defaultNotif;
    for(let [type, messages] of Object.entries(notifs)) {
        messages.forEach((message) => {
            $.notify({message: message}, {type: type});
        })
    }

    Cookies.remove("notifications");
}


module.exports.disableButton = disableButton;
module.exports.showInfiniteLoading = showInfiniteLoading;
module.exports.hideLoading = hideLoading;
module.exports.generateAlert = generateAlert;
module.exports.enableButton = enableButton;
module.exports.updateTagsInputWidth = updateTagsInputWidth;
module.exports.addNotification = addNotification;
module.exports.showCookieNotifications = showCookieNotifications;
module.exports.updateTagsInputWidth = updateTagsInputWidth;