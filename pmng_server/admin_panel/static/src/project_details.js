function init() {
    // owner is empty if you are the owned
    let owned = true;
    if(window.owner.length > 0) {
        owned = false;
        $("#owner-info").html(" (project owned by " + window.owner + ")");
    }

    if(window.project.collabs.length > 0) {
        let collabsList = $("#collabs-list");
        for(let collab of window.project.collabs) {
            collabsList.append(getCollabLineHtml(collab.collabid, collab.userid, collab.name, collab.mode, !owned));
        }

        collabsList.parent().show();
        $("#collabs-status").hide();
    } else $("#collabs-status").html("No collaborations on this project.");


    if(window.project.domains.length > 0) {
        let domainsList = $("#domains-list");
        for(let domain of window.project.domains) {
            domainsList.append(getDomainLineHtml(domain.domainid, domain.domain, domain.enablesub, !owned));
        }

        domainsList.parent().show();
        $("#domains-status").hide();
    } else $("#domains-status").html("No custom domains bound to this project.");

    if(Object.keys(window.project.plugins).length > 0) {
        let pluginsList = $("#plugins-list");
        for(let [plugin, details] of Object.entries(window.project.plugins)) {
            pluginsList.append(getPluginLineHtml(plugin, details, !owned));
        }

        let pluginCheckIntervalId = setInterval(refreshPlugins, 30*1000);
        refreshPlugins();

        pluginsList.parent().show();
        $("#plugins-status").hide();
    } else $("#plugins-status").html("No plugins added to this project.");
}

function getCollabModeText(mode) {
    if(mode == "view") {
        return "View-only mode";
    } else { // manage
        return "Full-access mode";
    }
}

function getCollabLineHtml(collabid, userid, username, mode, disabled) {
    setImmediate(() => {
        $("#button-collab-invert-" + collabid).removeClass("btn-info");
        setCollabModeButton(collabid, mode);
    });

    return `<li class="list-group-item" id="line-collab-${collabid}">`
    + `<b>Collaboration #${collabid} : </b>${username} (user #${userid})<span class="text-secondary d-block d-md-inline"><samp class="ml-4" id="collab-explaination-${collabid}">${getCollabModeText(mode)}</samp></span>`
    + (!disabled ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeCollab('${username}', ${collabid}, this)"><i class="fas fa-trash-alt"></i> Remove</button>`
    + `<button class="btn btn-sm btn-info" data-mode="unknown" id="button-collab-invert-${collabid}" onclick="project_details.invertCollabMode(${collabid})"><i class="fas fa-sync fa-spin"></i> Loading...</button></div></span>` : "") + '</li>';
}

function getDomainLineHtml(domainid, domain, subs, disabled) {
    return `<li class="list-group-item" id="line-domain-${domainid}">`
    + `<b>Custom domain #${domainid} : </b>${domain} (subs ${subs ? "enabled" : "disabled"})`
    + (!disabled ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeDomain('${domain}', ${domainid}, this)"><i class="fas fa-trash-alt"></i> Remove</button></div></span>` : "") + '</li>';
}

function getPluginLineHtml(plugin, details, disabled) {
    return `<li class="list-group-item" id="line-plugin-${plugin}">`
    + `<b>Plugin ${plugin} : </b> <span id="plugin-usage-${plugin}">Loading usage...</span>`
    + ((details.configurable && !disabled) ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-primary" onclick="project_details.editPlugin('${plugin}')"><i class="fas fa-edit"></i> Edit plugin configuration</button></div></span>` : "") + `</li>`;
}

function setCollabModeButton(collabid, mode) {  // texts are inverted
    $("#button-collab-invert-" + collabid).html(mode == "view" ? '<i class="fas fa-lock"></i> Give full access' : '<i class="fas fa-lock-open"></i> Demote access')
        .removeClass("btn-" + (mode == "view" ? "primary" : "success")).addClass("btn-" + (mode == "view" ? "success" : "primary")).attr("data-mode", mode);
    $("#collab-explaination-" + collabid).html(getCollabModeText(mode));
}

let usageErrorSent = false;
function refreshPlugins() {
    $.getJSON("/api/v1/projects/usage/" + window.project.name).fail((xhr, status, error) => {
        if(!usageErrorSent) {
            $.notify({message: `Unable to check usage status because of a server error.`}, {type: "danger"});
            usageErrorSent = true;
        }
        console.warn(error);
    }).done((response) => {
        if(response.error) {
            if(!usageErrorSent) {
                $.notify({message: `Unable to check usage status because of an application error.`}, {type: "danger"});
                usageErrorSent = true;
            }
            console.warn(response.code, response.message);
        } else {
            for(let [plugin, usage] of Object.entries(response.usage)) {
                let statusDom = $("#plugin-usage-" + plugin);
                switch(usage.type) {
                    case "measure_error":
                        console.warn(usage.error);
                        statusDom.html("Unable to measure usage for this plugin.");
                        break;
                    case "unlimited":
                    case "limited":
                        statusDom.html(usage.formatted);
                        break;
                    case "custom_text":
                        statusDom.html(usage.text);
                        break;
                    case "not_measurable":
                        statusDom.html("Usage not measurable for this plugin.");
                        break;
                }
            }
        }
    });
}

function invertCollabMode(collabid) {
    let newMode = "view";
    if($("#button-collab-invert-" + collabid).attr("data-mode") == "view") {
        newMode = "manage";
    }

    let btn = $("#button-collab-invert-" + collabid);
    utils.disableButton(btn);

    $.post("/api/v1/projects/updatecollab/" + collabid + "/" + newMode).fail((xhr, status, error) => {
        $.notify({message: `Unable to change the mode of this collaboration because of a server error.`}, {type: "danger"});
        console.warn(error);
        utils.enableButton(btn);
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to change the mode of this collaboration because of an application error.`}, {type: "danger"});
            console.warn(error);

            utils.enableButton(btn);
        } else {
            setCollabModeButton(collabid, newMode);
            if(newMode == "view") {
                $.notify({message: `Collaboration mode changed to <i>View-only</i>.`}, {type: "success"});
            } else {
                $.notify({message: `Collaboration mode changed to <i>Full-access</i>.`}, {type: "success"});
            }
            utils.enableButton(btn);
        }
    });
}

function editPlugin(plugin) {
    location.href = "../pluginConfig/" + window.project.name + "/" + plugin;
}

let lastRemoveId = undefined, lastRemoveMode = undefined, lastRemoveBtn = undefined;

function removeCollab(username, collabid, btn) {
    lastRemoveBtn = btn;
    lastRemoveId = collabid;
    lastRemoveMode = "collab";
    $("#deleteModal-content").html(`Do you want to remove <i>${username}</i> as a collaborator from this project?`);
    $("#deleteModal-title").html("Remove a collaborator");
    $("#deleteModal-confirm").html("Remove this collaborator");
    $("#deleteModal").modal();
}

function removeDomain(domain, domainid, btn) {
    lastRemoveBtn = btn;
    lastRemoveId = domainid;
    lastRemoveMode = "domain";
    $("#deleteModal-content").html(`Do you want to remove the domain <i>${domain}</i> from this project?`);
    $("#deleteModal-title").html("Remove a custom domain");
    $("#deleteModal-confirm").html("Remove this domain");
    $("#deleteModal").modal();
}

function confirmDelete() {
    $("#deleteModal").modal("hide");
    utils.disableButton(lastRemoveBtn);
    switch(lastRemoveMode) {
        case "collab":
            $.post("/api/v1/projects/removecollab/" + lastRemoveId).fail((xhr, status, error) => {
                $.notify({message: `Unable to remove this collaboration because of a server error.`}, {type: "danger"});
                console.warn(error);
                utils.enableButton(lastRemoveBtn);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: `Unable to remove this collaboration because of an application error.`}, {type: "danger"});
                    console.warn(error);
                    utils.enableButton(lastRemoveBtn);
                } else {
                    $(lastRemoveBtn).parent().parent().parent().remove();
                    $.notify({message: `This collaborator was removed for the project.`}, {type: "success"});
                }
            });
            break;
        case "domain":
            $.post("/api/v1/projects/removedomain/" + lastRemoveId).fail((xhr, status, error) => {
                $.notify({message: `Unable to remove this custom domain because of a server error.`}, {type: "danger"});
                console.warn(error);
                utils.enableButton(lastRemoveBtn);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: `Unable to remove this custom domain because of an application error.`}, {type: "danger"});
                    console.warn(error);
                    utils.enableButton(lastRemoveBtn);
                } else {
                    $(lastRemoveBtn).parent().parent().parent().remove();
                    $.notify({message: `This custom domain was removed.<br/>Users cannot use it anymore to access the project.`}, {type: "success"});
                }
            });
            break;
        default:
            $.notify({message: `Cannot delete an object of type ${lastRemoveMode}.`}, {type: "warning"});
            break;
    }
}

window.project_details = {init, invertCollabMode, removeCollab, removeDomain, confirmDelete, editPlugin};