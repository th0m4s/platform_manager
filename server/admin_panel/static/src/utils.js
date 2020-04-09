function disableButton(button, text) {
    $(button).html(text).addClass("disabled").attr("disabled", "disabled");
}

function enableButton(button, text) {
    $(button).html(text).removeClass("disabled").removeAttr("disabled");
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