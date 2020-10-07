function init() {
    let domainsInput = $("#input-domain");
    for(let domain of window.domains) {
        domainsInput.append(`<option value="${domain.id}">${domain.name}</option>`);
    }

    if(edit) {
        $("#input-username").val(values.source.split("@")[0]);
        $("#input-domain").val(values.domain_id);
    }

    window.onbeforeunload = () => {
        if(!saving && ((!edit && canCreate()) || hasChange())) {
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

function getSourceName() {
    return $("#input-username").val().trim();
}

function getSourceDomainId() {
    return $("#input-domain").val();
}

function getDestination() {
    return $("#input-destination").val().trim();
}

function hasChange() {
    return getDestination().toLowerCase() != values.destination.toLowerCase();
}

function canCreate() {
    return getSourceName().length > 0 && getDestination().trim().length > 0;
}

function confirm() {
    let confirmButton = $("#confirm-button");
    if(!edit) {
        if(canCreate()) {
            saving = true;
            disableAllInputs();
            utils.disableButton(confirmButton, "Creating the alias...");

            let formData = {sourceUser: getSourceName(), sourceDomainId: getSourceDomainId(), destination: getDestination()};
            $.post("/api/v1/mails/aliases/create", formData).fail((xhr, status, error) => {
                saving = false;
                $.notify({message: "Unable to create this alias. See console for details."}, {type: "danger"});
                console.warn("Unable to create alias (server error):", error);

                enableAllInputs();
                utils.enableButton(confirmButton, "Create this alias");
            }).done((response) => {
                if(response.error) {
                    saving = false;
                    $.notify({message: "Unable to create this alias. See console for details."}, {type: "danger"});
                    console.warn("Unable to create alias (application error):", error);

                    enableAllInputs();
                    utils.enableButton(confirmButton, "Create this alias");
                } else {
                    utils.addNotification("Alias successfully added.", "success");
                    location.href = "/panel/mails/users#aliases";
                }
            });
        } else $.notify({message: "Please fill in all the required inputs."}, {type: "warning"});
    } else {
        if(hasChange()) {
            $.post("/api/v1/mails/aliases/edit/" + values.id, {destination: getDestination()}).fail((xhr, status, error) => {
                saving = false;
                $.notify({message: "Unable to edit this alias. See console for details."}, {type: "danger"});
                console.warn("Unable to edit alias (server error):", error);
        
                enableAllInputs();
                utils.enableButton(confirmButton, "Edit this alias");
            }).done((response) => {
                if(response.error) {
                    saving = false;
                    $.notify({message: "Unable to edit this alias. See console for details."}, {type: "danger"});
                    console.warn("Unable to edit alias (application error):", error);
        
                    enableAllInputs();
                    utils.enableButton(confirmButton, "Edit this alias");
                } else {
                    utils.addNotification("Alias successfully edited.", "success");
                    location.href = "/panel/mails/users#aliases";
                }
            });
        } else {
            $.notify({message: "No change made."}, {type: "warning"});
        }
    }


    return false;
}

window.mails_managealias = {init, confirm};