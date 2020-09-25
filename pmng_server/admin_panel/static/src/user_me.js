function init() {
    $("#input-username").val(user.name);
    $("#input-fullname").val(user.fullname);
    $("#input-email").val(user.email);

    window.onbeforeunload = () => {
        let changes = getChanges();
        if(changes == null || Object.keys(changes).length > 0) {
            return "You have unsaved changes on this page. Do you want to leave?";
            // some browser don't display this message
        }
    }
}

function getChanges() {
    let changes = {};

    let newPassword = $("#input-newpass").val().trim();
    if(newPassword.length > 0) {
        if(newPassword != $("#input-confirmpass").val().trim()) {
            return null;
        } else changes.password = newPassword;
    }

    let newFullname = $("#input-fullname").val().trim();
    if(newFullname != user.fullname) changes.fullname = newFullname;

    let newEmail = $("#input-email").val().trim();
    if(newEmail != user.email) changes.email = newEmail;

    return changes;
}

function applyLocalUser(changes) {
    user = Object.assign(user, changes);
}

function selectAllInputs() {
    return $("input, #confirm-button");
}

function disableAllInputs() {
    selectAllInputs().attr("disabled", "disabled").addClass("disabled");
}

function enableAllInputs() {
    selectAllInputs().removeAttr("disabled").removeClass("disabled");
    $(".always-disabled").attr("disabled", "disabled").addClass("disabled");
}

function save() {
    let changes = getChanges();
    if(Object.keys(changes).length == 0) {
        $.notify({message: "No changes made."}, {type: "warning"});
    } else {
        let currentPassword = $("#input-password").val().trim();
        if(currentPassword.length < 8) {
            $.notify({message: "Invalid current password."}, {type: "warning"});
        } else {
            let confirmButton = $("#confirm-button");

            disableAllInputs();
            utils.disableButton(confirmButton, "Saving changes...");

            $.post("/api/v1/users/me", {changes, currentPassword}).fail((xhr, status, error) => {
                $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
                console.warn("Unable to edit account (server error):", error);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: "Unable to save the changes. See console for details."}, {type: "danger"});
                    console.warn("Unable to edit account (application error):", error);
                } else {
                    $.notify({message: "Changes saved."}, {type: "success"});
                    applyLocalUser(changes);
                    $("input[type=password]").val("");
                }
            }).always(() => {
                enableAllInputs();
                utils.enableButton(confirmButton, "Save changes");
            });
        }
    }

    return false;
}

function resetSSOPassword() {
    let button = $("#reset-dbautopass").attr("disabled", "disabled");
    $.getJSON("/api/v1/users/me/resetdbautopass").fail((xhr, status, error) => {
        $.notify({message: "Unable to reset the database SSO password. See console for details."}, {type: "danger"});
        console.warn("Unable to reset dbautopass (server error):", error);
    }).done((response) => {
        if(response.error) {
            $.notify({message: "Unable to reset the database SSO password. See console for details."}, {type: "danger"});
            console.warn("Unable to reset dbautopass (application error):", error);
        } else {
            $.notify({message: "Database SSO password reset."}, {type: "success"});
        }
    }).always(() => {
        button.removeAttr("disabled");
    });
}


window.user_me = {init, save, resetSSOPassword};