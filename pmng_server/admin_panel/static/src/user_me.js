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

    if(Object.keys(remoteGits).length > 0) {
        $("#gitusers-status").hide();
        let gitProvidersList = $("#gitusers-list").html("");
        for(let [remote, details] of Object.entries(remoteGits)) {
            let l = details.available;
            gitProvidersList.append(`<li class="list-group-item" id="line-gituser-${remote}"><b>${(details.icon != false ? `<i class="${details.icon}"></i> ` : "") + details.name} </b> <span class="text-secondary d-block d-md-inline"><samp class="ml-4" id="status-gituser-${remote}">${l ? "Account linked" : "Account not linked"}</samp></span>`
                + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-${l ? "secondary" : "primary"}" onclick="user_me.invertGitProvider('${remote}', this)"><i class="fas fa-${l ? "unlink" : "link"}"></i> ${l ? "Unlink" : "Link"} account</button></div></span></li>`);
        }

        gitProvidersList.parent().show();
    } else $("#gitusers-status").html("No git provider found.").show();
    
    if(Object.keys(settingsData).length > 0) {
        $("#usersettings-status").hide();
        let userSettingsList = $("#usersettings-list").html("");
        for(let [key, data] of Object.entries(settingsData)) {
            let {type, displayName} = data;
            switch(type) {
                case "string":
                case "number":
                    userSettingsList.append(`<li class="list-group-item p-2 pl-3"><div class="usersetting-name pt-0 my-1 d-inline-block">${displayName}:</div><input value="${USER_SETTINGS[key]}" type="${type == "number" ? "number" : "text"}" class="form-control form-control-sm w-25 float-right" id="input-usersetting-${key}" placeholder="${data.placeholder == undefined ? "" : data.placeholder}"></li>`);
                    break;
                case "enum":
                    let values = "";
                    for(let [internal, display] of Object.entries(data.values))
                        values += `<option value=${internal}${USER_SETTINGS[key] == internal ? " selected" : ""}>${display}</option>`;
                    userSettingsList.append(`<li class="list-group-item p-2 pl-3"><div class="usersetting-name pt-0 my-1 d-inline-block">${displayName}:</div><select class="form-control custom-select-sm custom-select w-25 float-right" id="input-usersetting-${key}">${values}</select></li>`)
                    break;
                case "boolean":
                    userSettingsList.append(`<li class="list-group-item"><span class="usersetting-name">${displayName}:</span><input type="checkbox"${USER_SETTINGS[key] ? " checked" : ""} class="float-right mt-2 mb-1" id="input-usersetting-${key}"></li>`);
                    break;
                default:
                    console.warn("No valid type for user setting", key, "found", type);
                    userSettingsList.append(`Invalid data type for <code>${key}</code> (found type <code>${type}</code>).`);
                    break;
            }

            $("#input-usersetting-" + key).on("input", (event) => {
                let source = $(event.target);
                let value = source.val();
                if(type == "boolean") value = source.is(":checked");

                $.post("/api/v1/users/settings/" + key, {value}).fail((xhr, status, error) => {
                    $.notify({message: "Cannot save user setting."}, {type: "warning"});
                    console.warn("Cannot save user setting (server error):", error);
                }).done((response) => {
                    if(response.error) {
                        $.notify({message: "Cannot save user setting."}, {type: "warning"});
                        console.warn("Cabbot save user setting (application error):", response.message);
                    }
                });
            });
        }

        userSettingsList.parent().show();
    } else $("#usersettings-status").html("No user settings found.").show();
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

function invertGitProvider(remote, button) {
    let remoteDetails = remoteGits[remote];
    if(remoteDetails != undefined) {
        button = $(button).attr("disabled", "disabled");

        if(!remoteDetails.available) location.href = "/panel/git/" + remote + "/auth";
        else {
            $.getJSON("/api/v1/git/" + remote + "/unlinkAccount").fail((xhr, status, error) => {
                $.notify({message: "Unable to unlink your " + remoteDetails.name + " account."}, {type: "danger"});
                console.error("Cannot unlink " + remote + " account (server error)", status, error);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: "Unable to unlink your " + remoteDetails.name + " account."}, {type: "danger"});
                    console.error("Cannot unlink " + remote + " account (application error)", error);
                } else {
                    remoteDetails.available = false;
                    $(button).addClass("btn-primary").removeClass("btn-secondary").html("<i class='fas fa-link'></i> Link account");
                    $("#status-gituser-" + remote).html("Account not linked");
                    $.notify({message: remoteDetails.name + " account unlinked successfully."}, {type: "success"});
                }
            }).always(() => {
                button.removeAttr("disabled");
            });
        }
    }
}


window.user_me = {init, save, resetSSOPassword, cancelEmailChange, invertGitProvider};