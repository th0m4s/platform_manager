let owned = false;
function init() {
    // owner is empty if you are the owned
    if(window.owner.length > 0) {
        $("#owner-info").html(" (project owned by " + window.owner + ")");
    } else owned = true;

    $("#rgitinte-status").html("No git integrations on this project.");
    updateGitInte();

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

    updateForcepushText(window.project.forcepush).parent().removeAttr("disabled");
}

function updateGitInte() {
    let inteCount = Object.keys(window.project.rgitIntegrations).length, hasInte = inteCount > 0;
    if(inteCount > 0) {
        let rGitInteList = $("#rgitinte-list").html("");
        for(let [remote, inte] of Object.entries(window.project.rgitIntegrations)) {
            rGitInteList.append(getGitInteLineHtml(remote, inte.repo, inte.branch, !owned));
        }
    }

    $("#rgitinte-status")[hasInte ? "hide": "show"]();
    $("#rgitinte-card")[hasInte ? "show": "hide"]();

    $("#rgitinte-add")[inteCount < Object.keys(window.remoteGits).length && owned ? "show" : "hide"]();
}

function getCollabModeText(mode) {
    if(mode == "view") {
        return "View-only mode";
    } else { // manage
        return "Full-access mode";
    }
}

function getGitInteLineHtml(remote, repo, branch, disabled) {
    let details = window.remoteGits[remote];

    return `<li class="list-group-item" id="line-rgitinte-${remote}">`
    + `<b>${(details.icon != false ? `<i class="${details.icon}"></i> ` : "") + details.name}: </b>${repo} <span class="text-secondary d-block d-md-inline"><samp class="ml-4">${branch}</samp></span>`
    + (!disabled ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeGitInte('${remote}', this)"><i class="fas fa-trash-alt"></i> Remove</button>`
    + `</div></span>` : "") + '</li>';
}

function getCollabLineHtml(collabid, userid, username, mode, disabled) {
    setImmediate(() => {
        $("#button-collab-invert-" + collabid).removeClass("btn-info");
        setCollabModeButton(collabid, mode);
    });

    return `<li class="list-group-item" id="line-collab-${collabid}">`
    + `<b>Collaboration #${collabid}: </b>${username} (user #${userid})<span class="text-secondary d-block d-md-inline"><samp class="ml-4" id="collab-explaination-${collabid}">${getCollabModeText(mode)}</samp></span>`
    + (!disabled ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeCollab('${username}', ${collabid}, this)"><i class="fas fa-trash-alt"></i> Remove</button>`
    + `<button class="btn btn-sm btn-info" data-mode="unknown" id="button-collab-invert-${collabid}" onclick="project_details.invertCollabMode(${collabid})"><i class="fas fa-sync fa-spin"></i> Loading...</button></div></span>` : "") + '</li>';
}

function getDomainLineHtml(domainid, domain, subs, disabled) {
    return `<li class="list-group-item" id="line-domain-${domainid}">`
    + `<b>Custom domain #${domainid}: </b>${domain} (subs ${subs ? "enabled" : "disabled"})`
    + (!disabled ? `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeDomain('${domain}', ${domainid}, this)"><i class="fas fa-trash-alt"></i> Remove</button></div></span>` : "") + '</li>';
}

function getPluginLineHtml(plugin, details, disabled) {
    return `<li class="list-group-item" id="line-plugin-${plugin}">`
    + `<b>Plugin ${plugin}: </b> <span id="plugin-usage-${plugin}">Loading usage...</span>`
    + '<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;">' + (details.detailed ? `<button class="btn btn-sm btn-info" onclick="project_details.pluginDetails('${plugin}')"><i class="fas fa-info-circle"></i> View plugin details</button>` : "")
    + ((details.configurable && !disabled) ? `<button class="btn btn-sm btn-primary" onclick="project_details.editPlugin('${plugin}')"><i class="fas fa-edit"></i> Edit plugin configuration</button>` : "") + `</div></span></li>`;
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
        case "rgitinte":
            $.getJSON("/api/v1/git/" + lastRemoveId + "/removeIntegration/" + window.project.name).fail((xhr, status, error) => {
                $.notify({message: "Cannot remove this integration. Open the console for details."}, {type: "danger"});
                console.error("Cannot remove integration (server " + status + "): " + error);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: "Cannot remove this integration. Open the console for details."}, {type: "danger"});
                    console.error("Cannot remove integration (application): " + error);
                } else {
                    $.notify({message: "Integration successfully removed."}, {type: "success"});
                    delete window.project.rgitIntegrations[lastRemoveId];
                    updateGitInte();
                }
            }); 
            break;
        default:
            $.notify({message: `Cannot delete an object of type ${lastRemoveMode}.`}, {type: "warning"});
            break;
    }
}

function pluginDetails(plugin) {
    utils.showInfiniteLoading("Loading plugin details...");

    $.getJSON("/api/v1/projects/pluginDetails/" + window.project.name + "/" + plugin).fail((xhr, status, error) => {
        $.notify({message: `Unable to plugins details because of a server error.`}, {type: "danger"});
        console.warn("Cannot load plugin details:", error);
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to plugins details because of an application error.`}, {type: "danger"});
            console.warn("Cannot load plugin details:", error);
        } else {
            let hasDetails = true;
            let details = response.details;

            switch(details.type) {
                case "html":
                    $("#detailsModal-content").html(details.html);
                    break;
                default:
                    hasDetails = false;
                    break;
            }

            if(hasDetails) {
                $("#detailsModal-title").html("Details of plugin <i>" + plugin + "</i>");
                $("#detailsModal").modal();

                if($(".hidden-details").length > 0) {
                    detailsVisible = true;
                    toggleHiddenDetails();
                    $("#detailsShowHide-button").show();
                } else $("#detailsShowHide-button").hide();
            } else $.notify({message: `This plugin doesn't have any details here.`}, {type: "warning"});
        }
    }).always(() => {
        utils.hideLoading();
    });
}

let detailsVisible = true;
function toggleHiddenDetails() {
    if(detailsVisible) {
        $("#detailsShowHide-button").html("Reveal sensitive hidden details");
        $(".hidden-details").css("user-select", "none").css("filter", "blur(5px)");
    } else {
        $("#detailsShowHide-button").html("Hide sensitive details");
        $(".hidden-details").css("user-select", "inherit").css("filter", "blur(0px)");
    }

    detailsVisible = !detailsVisible;
}

function updateForcepushText(newState) {
    if(newState) {
        return $("#forcepush-text").html("Cancel git forced push");
    } else {
        return $("#forcepush-text").html("Allow git forced push");
    }
}

function toggleForcePush() {
    let newState = !window.project.forcepush;
    let button = $("#toggle-forcepush-btn");
    button.attr("disabled", "disabled");
    // $("#forcepush-text").html("Loading...");
    // don't show loading text because button's size changes too much

    $.getJSON("/api/v1/projects/updateForcepush/" + window.project.name + "/" + newState).fail((xhr, status, error) => {
        $.notify({message: `Unable to update forcepush.`}, {type: "danger"});
        console.warn("Cannot update forcepush:", error);
        textSpan.html("Server error");
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to update forcepush.`}, {type: "danger"});
            console.warn("Cannot update forcepush:", error);
            textSpan.html("Application error");
        } else {
            button.removeAttr("disabled");
            updateForcepushText(newState);
            window.project.forcepush = newState;
        }
    });
}

function addGitInte() {
    let providerSelect = $("#gitinte-provider").html("<option selected value='' id='gitinte-provider-empty'></option>");
    let existingIntegrations = Object.keys(window.project.rgitIntegrations);
    for(let remote in remoteGits)
        if(!existingIntegrations.includes(remote)) providerSelect.append(`<option value="${remote}">${remoteGits[remote].name}</option>`);

    gitInteHideRepo();
    $("#gitinte-viewaccount").hide();

    $("#addGitInte-modal select").removeAttr("disabled");
    $("#addGitInte-modal").modal();
}

function gitInteHideRepo() {
    $("#gitinte-repo").html("").parent().parent().hide();
    gitInteHideBranch();
}

function gitInteHideBranch() {
    $("#gitinte-branch").html("").parent().parent().hide();
    $("#gitinte-confirm").attr("disabled", "disabled");
}

let lastFetchedRepos = {}, lastProvider = "";
function gitInteProviderChosen() {
    $("#gitinte-provider-empty").remove();

    let provider = $("#gitinte-provider").val();
    if(provider.length > 0) {
        if(remoteGits[provider].available) {
            $("#gitinte-provider, #gitinte-repo").attr("disabled", "disabled");
            $("#gitinte-repo").parent().parent().show();
            $("#gitinte-viewaccount").hide();
            gitInteHideBranch();

            $.getJSON("/api/v1/git/" + provider + "/listRepositories").fail((xhr, status, error) => {
                $("#addGitInte-modal").modal("hide");
                $.notify({message: "Cannot list repositories. Open the console for details."}, {type: "warning"});
                console.error("Cannot list repos (server " + status + "): " + error);
            }).done((response) => {
                if(response.error) {
                    $("#addGitInte-modal").modal("hide");
                    $.notify({message: "Cannot list repositories. Open the console for details."}, {type: "warning"});
                    console.error("Cannot list repos (application): " + response.message, message.details);
                } else {
                    lastProvider = provider;
                    $("#gitinte-provider, #gitinte-repo").removeAttr("disabled");
                    let reposList = $("#gitinte-repo").html("<option selected value='' id='gitinte-repo-empty'></option>");
                    lastFetchedRepos = {};
                    lastFetchedBranches = [];
                    for(let repo of response.repositories) {
                        lastFetchedRepos[repo.repo_id] = repo;
                        reposList.append(`<option value="${repo.repo_id}">${repo.full_name}</option>`);
                    }
                }
            });
        } else {
            gitInteHideRepo();
            $("#gitinte-viewaccount").show();
        }
    } else gitInteHideRepo();
}

let lastRepoId = "";
function gitInteRepoChosen() {
    $("#gitinte-provider-empty").remove();

    let repoId = $("#gitinte-repo").val().toString();
    if(repoId.length > 0) {
        $("#gitinte-provider, #gitinte-repo, #gitinte-branch").attr("disabled", "disabled");
            $("#gitinte-branch").parent().parent().show();

            $.getJSON("/api/v1/git/" + lastProvider + "/listBranches/" + lastFetchedRepos[repoId].full_name).fail((xhr, status, error) => {
                $("#addGitInte-modal").modal("hide");
                $.notify({message: "Cannot list branches. Open the console for details."}, {type: "warning"});
                console.error("Cannot list branches (server " + status + "): " + error);
            }).done((response) => {
                if(response.error) {
                    $("#addGitInte-modal").modal("hide");
                    $.notify({message: "Cannot list branches. Open the console for details."}, {type: "warning"});
                    console.error("Cannot list branches (application): " + response.message, response.details);
                } else {
                    lastRepoId = repoId;
                    $("#gitinte-provider, #gitinte-repo, #gitinte-branch").removeAttr("disabled");
                    let branchesList = $("#gitinte-branch").html("<option selected value='' id='gitinte-branch-empty'></option>");
                    for(let branch of response.branches)
                        branchesList.append(`<option value="${branch}">${branch}</option>`);
                }
            });
    } else gitInteHideBranch();
}

function gitInteBranchChosen() {
    $("#gitinte-branch-empty").remove();
    $("#gitinte-confirm").removeAttr("disabled");
}

function confirmAddGitInte() {
    $("#addGitInte-modal").modal("hide");

    let provider = lastProvider;
    let repo_id = lastRepoId;
    let branch = $("#gitinte-branch").val() || "";

    if(provider.length > 0 && repo_id.length > 0 && branch.length > 0) {
        utils.showInfiniteLoading("Adding " + remoteGits[provider].name + " integration...");
        $.post("/api/v1/git/" + provider + "/addIntegration", {
            repo_id, branch, projectname: window.project.name
        }).fail((xhr, status, error) => {
            $.notify({message: "Cannot add this integration. Open the console for details."}, {type: "danger"});
            console.error("Cannot add integration (server " + status + "): " + error);
        }).done((response) => {
            if(response.error) {
                $.notify({message: "Cannot add this integration. Open the console for details."}, {type: "danger"});
                console.error("Cannot add integration (application): " + error);
            } else {
                $.notify({message: "Integration added with success."}, {type: "success"});
                window.project.rgitIntegrations[provider] = {branch, repo: lastFetchedRepos[repo_id].full_name, remote: provider};
                updateGitInte();
            }
        }).always(() => {
            utils.hideLoading();
        });
    } else $.notify({message: "Invalid git integration properties."}, {type: "warning"});
}

function removeGitInte(provider, btn) {
    if(window.project.rgitIntegrations[provider] != undefined) {
        lastRemoveBtn = btn;
        lastRemoveId = provider;
        lastRemoveMode = "rgitinte";
        $("#deleteModal-content").html(`Do you want to remove the ${remoteGits[provider].name} integration from this project?`);
        $("#deleteModal-title").html("Remove a git integration");
        $("#deleteModal-confirm").html("Remove this integration");
        $("#deleteModal").modal();
    } else $.notify({message: "Invalid git provider."}, {type: "warning"});
}


window.project_details = {init, invertCollabMode, removeCollab, removeDomain, confirmDelete, editPlugin, pluginDetails, toggleHiddenDetails, toggleForcePush,
    addGitInte, gitInteProviderChosen, gitInteRepoChosen, gitInteBranchChosen, confirmAddGitInte, removeGitInte};