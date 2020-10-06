function init() {
    let domainsInput = $("#input-domain");
    for(let domain of window.domains) {
        domainsInput.append(`<option value="${domain.id}">${domain.name}</option>`);
    }

    if(edit) {
        $("#input-username").val(values.email.split("@")[0]);
        $("#input-domain").val(values.domain_id);
    }

    window.onbeforeunload = () => {
        if(!saving && (!edit && getForm().completion >= 0 || Object.keys(getChanges()).length > 0)) {
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

function getForm() {
    let data = {}, completedFields = 0;

    data.username = $("#input-username").val().trim();
    if(data.username.length > 0) completedFields++;

    data.domain = parseInt($("#input-domain").val().trim());
    if(!isNaN(data.domain)) completedFields++;

    data.quota = $("#input-quota").val().trim();
    if(data.quota.length > 0) completedFields++;

    data.password = $("#input-password").val().trim();
    if((!edit && data.password.length == 0) || $("#input-confirmpass").val().trim() != data.password) {
        if(data.password.length > 0) {
            $.notify({message: "The passwords are not identical."}, {type: "warning"});
            completedFields--;
        }
        data.password = "";
    } else completedFields++;

    let completion = -1;
    if((edit && completedFields >= 3) || (!edit && completedFields == 4)) completion = 1;
    else if(completedFields > 0) completion = 0;

    return {completion, data};
}

function getChanges() {
    let differences = {};

    let newAddrData = getForm();
    if(newAddrData.completion > 0) {
        newAddrData = newAddrData.data;

        if(newAddrData.quota != values.quota)
            differences.quota = newAddrData.quota;

        if(newAddrData.password.length > 0)
            differences.password = window.unixcrypt.encrypt(newAddrData.password);
    } else return null;

    return differences;
}

function confirm() {
    let confirmButton = $("#confirm-button");
    if(!edit) {
        let addrForm = getForm();
        if(addrForm.completion == 1) {
            saving = true;
            disableAllInputs();
            utils.disableButton(confirmButton, "Creating the address...");

            addrForm.data.encrypted = true;
            $.post("/api/v1/mails/users/create", addrForm.data).fail((xhr, status, error) => {
                saving = false;
                $.notify({message: "Unable to create this address. See console for details."}, {type: "danger"});
                console.warn("Unable to create address (server error):", error);

                enableAllInputs();
                utils.enableButton(confirmButton, "Create this address");
            }).done((response) => {
                if(response.error) {
                    saving = false;
                    $.notify({message: "Unable to create this address. See console for details."}, {type: "danger"});
                    console.warn("Unable to create address (application error):", error);

                    enableAllInputs();
                    utils.enableButton(confirmButton, "Create this address");
                } else {
                    utils.addNotification("Address successfully added.", "success");
                    location.href = "/panel/mails/users";
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
    
                if(changes.quota != undefined)
                    text += `<li>Quota: ${changes.quota} <small>(from ${values.quota})</small></li>`;
    
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
    changes.encrypted = true;
    lastDifferences = undefined;
    let confirmButton = $("#confirm-button");

    saving = true;
    disableAllInputs();
    utils.disableButton(confirmButton, "Saving changes...");

    $("#confirmModal").modal("hide");
    $.post("/api/v1/mails/users/edit/" + values.id, changes).fail((xhr, status, error) => {
        saving = false;
        $.notify({message: "Unable to edit this address. See console for details."}, {type: "danger"});
        console.warn("Unable to edit address (server error):", error);

        enableAllInputs();
        utils.enableButton(confirmButton, "Edit this address");
    }).done((response) => {
        if(response.error) {
            saving = false;
            $.notify({message: "Unable to edit this address. See console for details."}, {type: "danger"});
            console.warn("Unable to edit address (application error):", error);

            enableAllInputs();
            utils.enableButton(confirmButton, "Edit this address");
        } else {
            utils.addNotification("Address successfully edited.", "success");
            location.href = "/panel/mails/users";
        }
    });
}

function resetSSOPassword() {
    let button = $("#reset-ssopassword").attr("disabled", "disabled");
    $.getJSON("/api/v1/mails/users/resetssopassword/" + values.id).fail((xhr, status, error) => {
        $.notify({message: "Unable to reset the SSO password. See console for details."}, {type: "danger"});
        console.warn("Unable to reset the SSO password (server error):", error);
    }).done((response) => {
        if(response.error) {
            $.notify({message: "Unable to reset the SSO password. See console for details."}, {type: "danger"});
            console.warn("Unable to reset the SSO password (application error):", error);
        } else {
            $.notify({message: "Webmail SSO password reset."}, {type: "success"});
        }
    }).always(() => {
        button.removeAttr("disabled");
    });
}


window.mails_manageuser = {init, confirm, confirmSave, resetSSOPassword};