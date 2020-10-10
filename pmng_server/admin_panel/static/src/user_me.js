function init() {
    $("#input-username").val(user.name);
    $("#input-fullname").val(user.fullname);
    $("#input-email").val(user.email);

    showNewEmail(newEmail);

    window.onbeforeunload = () => {
        let changes = getChanges();
        if(changes == null || Object.keys(changes).length > 0) {
            return "You have unsaved changes on this page. Do you want to leave?";
            // some browser don't display this message
        }
    }
}

let canChangeEmail = true;
function showNewEmail(email) {
    if(email == undefined) {
        canChangeEmail = true;
        $("#email-change").hide();
        $("#input-email").removeAttr("disabled").removeClass("always-disabled");
    } else {
        canChangeEmail = false;
        $("#email-change-email").html(email).parent().show();
        $("#input-email").attr("disabled", "disabled").addClass("always-disabled");
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
    if(newEmail != user.email && canChangeEmail) changes.email = newEmail;

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
                    if(response.code == 202) {
                        $.notify({message: "Email change request created. Please first allow the change by clicking Allow on your current email address."}, {type: "success"});
                        showNewEmail(changes.email);
                        $("#input-email").val(user.email);
                    } else {
                        $.notify({message: "Changes saved."}, {type: "success"});
                        if(response.code == 206) {
                            $.notify({message: "Email was not updated because a request already exists."}, {type: "warning"});
                            showNewEmail(response.newEmail);
                            delete changes.email;
                        } else {
                            if(changes.email != undefined) {
                                $.notify({message: "To allow the email change, please click Allow on your current email address."}, {type: "info"});
                                $("#input-email").val(user.email);
                                showNewEmail(changes.email);
                                delete changes.email;
                            }
                        }
                    }

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

function cancelEChange404() {
    showNewEmail(undefined);
    $.notify({message: "No email change request was found."}, {type: "info"});
}

function cancelEmailChange() {
    if(!canChangeEmail) {
        $("#email-change-email").removeAttr("href");
        $.getJSON("/api/v1/users/me/cancelEmailChange").fail((xhr, status, error) => {
            if(status == 404) cancelEChange404();
            else {
                $.notify({message: "Unable to cancel the email change request. Please click Deny in the mail you received on your current email address."}, {type: "danger"});
                console.warn("Cannot cancel email change request (server error):", error);
            }
        }).done((response) => {
            if(response.error) {
                if(response.code == 404) cancelEChange404();
                else {
                    $.notify({message: "Cannot cancel the email change request. Please click Deny in the mail you received on your current email address."}, {type: "danger"});
                    console.warn("Cannot cancel email change request (application error):", response.message);
                }
            } else {
                $.notify({message: "Email change request successfully canceled."}, {type: "success"});
                showNewEmail(undefined);
            }
        }).always(() => {
            $("#email-change-email").attr("href", "#");
        });
    }

    return false;
}


window.user_me = {init, save, resetSSOPassword, cancelEmailChange};