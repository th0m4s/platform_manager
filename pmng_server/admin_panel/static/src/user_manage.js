let saving = false;

function init() {
    window.onbeforeunload = () => {
        if(!saving && (!edit && getUserForm().completion >= 0 || Object.keys(getChanges(true)).length > 0)) {
            return "You have unsaved changes on this page. Do you want to leave?";
            // some browser don't display this message
        }
    }
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

function getUserForm(silent = false) {
    let userData = {}, completedFields = 0;

    userData.name = $("#input-username").val().trim();
    if(userData.name.length > 0) completedFields++;

    userData.fullname = $("#input-fullname").val().trim();
    if(userData.fullname.length > 0) completedFields++;

    userData.email = $("#input-email").val().trim();
    if(userData.email.length > 0) completedFields++;

    userData.scope = parseInt($("#input-permlevel").val().trim());
    if(!isNaN(userData.scope)) completedFields++;

    userData.password = $("#input-password").val().trim();
    if((!edit && userData.password.length == 0) || $("#input-confirmpass").val().trim() != userData.password) {
        if(userData.password.length > 0) {
            if(!silent) $.notify({message: "The passwords are not identical."}, {type: "warning"});
            completedFields--;
        }
        userData.password = "";
    } else completedFields++;

    let completion = -1;
    if((edit && completedFields >= 4) || (!edit && completedFields == 5)) completion = 1;
    else if(completedFields > 0) completion = 0;

    return {completion, userData};
}

function getChanges(silent = false) {
    let differences = {};

    let newUserData = getUserForm(silent);
    if(newUserData.completion > 0) {
        newUserData = newUserData.userData;

        if(newUserData.fullname != values.fullname)
            differences.fullname = newUserData.fullname;

        if(newUserData.scope != values.scope)
            differences.scope = newUserData.scope;

        if(newUserData.email != values.email)
            differences.email = newUserData.email;

        if(newUserData.password.length > 0)
            differences.password = newUserData.password;
    } else return null;

    return differences;
}

function confirm() {
    let confirmButton = $("#confirm-button");
    if(!edit) {
        let userForm = getUserForm();
        if(userForm.completion == 1) {
            saving = true;
            disableAllInputs();
            utils.disableButton(confirmButton, "Creating the user...");

            $.post("/api/v1/users/create", userForm.userData).fail((xhr, status, error) => {
                saving = false;
                $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
                console.warn("Unable to create user (server error):", error);

                enableAllInputs();
                utils.enableButton(confirmButton, "Create this user");
            }).done((response) => {
                if(response.error) {
                    saving = false;
                    $.notify({message: "Unable to create this user. See console for details."}, {type: "danger"});
                    console.warn("Unable to create user (application error):", error);

                    enableAllInputs();
                    utils.enableButton(confirmButton, "Create this user");
                } else {
                    utils.addNotification("User successfully added.", "success");
                    location.href = "all";
                }
            });
        }
    } else {
        let changes = getChanges();
        if(changes != null) {
            let count = Object.keys(changes).length;

            if(count == 0) {
                $.notify({message: "No changes made."}, {type: "warning"});
            } else {
                lastDifferences = changes;
                let text = "You modified the following propert" + (count == 1 ? "y" : "ies") + ":<ul>";
    
                if(changes.fullname != undefined)
                    text += `<li>Fullname: ${changes.fullname} <small>(from ${values.fullname})</small></li>`;
    
                if(changes.email != undefined)
                    text += `<li>Email address: ${changes.email}<br/><small>(from ${values.email})</small></li>`;
    
                if(changes.scope != undefined)
                    text += `<li>Permission level: ${changes.scope} <small>(from ${values.scope})</small></li>`;
    
                if(changes.password != undefined)
                    text += `<li>Account password (hidden)</li>`;
    
                text += "</ul>";
    
                $("#confirmModal-content").html(text);
                $("#confirmModal").modal();
            }
        }
    }


    return false;
}

let lastDifferences = undefined;
function confirmSave() {
    if(lastDifferences == undefined) return;
    let changes = lastDifferences;
    lastDifferences = undefined;
    let confirmButton = $("#confirm-button");

    saving = true;
    disableAllInputs();
    utils.disableButton(confirmButton, "Saving changes...");

    $("#confirmModal").modal("hide");
    $.post("/api/v1/users/edit/" + values.name, changes).fail((xhr, status, error) => {
        saving = false;
        $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
        console.warn("Unable to edit user (server error):", error);

        enableAllInputs();
        utils.enableButton(confirmButton, "Edit this user");
    }).done((response) => {
        if(response.error) {
            saving = false;
            $.notify({message: "Unable to edit this user. See console for details."}, {type: "danger"});
            console.warn("Unable to edit user (application error):", error);

            enableAllInputs();
            utils.enableButton(confirmButton, "Edit this user");
        } else {
            utils.addNotification("User successfully edited.", "success");
            location.href = "../all";
        }
    });
}

function resetSSOPassword() {
    let button = $("#reset-dbautopass").attr("disabled", "disabled");
    $.getJSON("/api/v1/users/edit/" + values.name + "/resetdbautopass").fail((xhr, status, error) => {
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

window.user_manage = {init, confirm, confirmSave, getUserForm, getChanges, resetSSOPassword};