function init() {
    utils.showInfiniteLoading("Loading projects...");
    requestOwned(requestLimit).always(() => {
        requestCollab(requestLimit).always(() => {
            utils.hideLoading();
        });
    });
}

function addOwnedProjects(projects) {
    let list = $("#owned-list");
    let names = [];
    projects.forEach((project) => {
        names.push(project.name);
        lastOwnedProjectId = Math.max(lastOwnedProjectId, project.id);
        list.append(getProjectHtml(project, false));
    });

    if(projects.length > 0) {
        list.parent().show();
        checkStates(names);
    }
}

function addCollabProjects(results) {
    let list = $("#collab-list");
    let names = [];
    results.forEach((result) => {
        names.push(result.project.name);
        lastCollabId = Math.max(lastCollabId, result.id);
        list.append(getProjectHtml(result.project, result.mode !== "manage"));
    });

    if(results.length > 0) {
        list.parent().show();
        checkStates(names);
    }
}

function getProjectHtml(project, disabled) {
    let d = disabled ? " disabled" : "";
    return `<li class="list-group-item" id="line-project-${project.name}" data-state="unknown">`
    + `<b>Project #${project.id} : </b>${project.name} (v${project.version})<span class="text-secondary d-block d-md-inline"><samp class="ml-4">${project.version > 0 ? project.type : "No version deployed"}</samp></span>`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-primary" onclick="projects_list.editProject('${project.name}')"${d}><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-info" data-current="info" id="button-state-${project.name}" onclick="projects_list.updateState('${project.name}')" ${disabled ? 'data-perm="no"' : ""} data-version="${project.version}" disabled><i class="fas fa-sync fa-spin"></i> Syncing...</button>`
    + `<button class="btn btn-sm btn-danger" onclick="projects_list.deleteProject('${project.name}')"${d}><i class="fas fa-trash-alt"></i> Delete</button></div></span></li>`;
}

function checkStates(projects) {
    $.getJSON("/api/v1/projects/arerunning/" + projects.join(",")).done((response) => {
        if(response.error) {
            projects.forEach((projectname) => {
                setProjectState(projectname, "warning", null, "Unknown", true, "unknown");
            });

            console.warn(response.message);
            $.notify({message: "Unable to check states (application error). See console for details."}, {type: "danger"});
        } else {
            for(let [projectname, state] of Object.entries(response.results)) {
                if(state) {
                    setProjectState(projectname, "dark", "stop", "Stop", false, "running");
                } else {
                    setProjectState(projectname, "success", "play", "Start", false, "stopped");
                }
            }
        }
    }).fail((xhr, status, error) => {
        projects.forEach((projectname) => {
            setProjectState(projectname, "warning", null, "Unknown state", true, "unknown");
        });

        console.warn(error);
        $.notify({message: "Unable to check states (server error). See console for details."}, {type: "danger"});
    });
}

function setProjectState(projectname, type, icon, text, disabled, state) {
    let button = $("#button-state-" + projectname);
    let current = button.attr("data-current");
    button.parent().parent().parent().attr("data-state", state);
    button.removeClass("btn-" + current).addClass("btn-" + type).attr("data-current", type).html((icon != null ? `<i class="fas fa-${icon}"></i> ` : "") + text);
    if(disabled) button.attr("disabled", "disabled");
    else if(button.attr("data-perm") !== "no" && parseInt(button.attr("data-version")) > 0) button.removeAttr("disabled");
}

const requestLimit = 10;
let lastOwnedProjectId = 0;
function requestOwned(limit) {
    limit = limit || requestLimit;
    return $.getJSON("/api/v1/projects/list/owned/" + lastOwnedProjectId + "/" + limit).fail((xhr, status, error) => {
        $("#owned-status").html(utils.generateAlert("danger", "Server error encountered, unable to get owned projects."));
        console.warn("Unable to fetch owned projects (server error):", error);
    }).done((data) => {
        if(data.error) {
            $("#owned-status").show().html(utils.generateAlert("danger", "Fetching error encountered, unable to get owned projects."));
            console.warn("Unable to fetch owned projects (application error):", error);
        } else {
            let results = data.results;
            if(results.projects.length > 0) $("#owned-status").hide();
            else $("#owned-status").html("No projects found.");
            addOwnedProjects(results.projects);
            if(results.hasMore) {
                utils.enableButton($("#owned-more").show(), "Load more projects");
            } else $("#owned-more").hide();
        }
    });
}

let lastCollabId = 0;
function requestCollab(limit) {
    limit = limit || requestLimit;
    return $.getJSON("/api/v1/projects/list/collabs/" + lastCollabId + "/" + limit).fail((xhr, status, error) => {
        $("#collab-status").html(utils.generateAlert("danger", "Server error encountered, unable to get collab projects."));
        console.warn("Unable to fetch collab projects (server error):", error);
    }).done((data) => {
        if(data.error) {
            $("#collab-status").show().html(utils.generateAlert("danger", "Fetching error encountered, unable to get collab projects."));
            console.warn("Unable to fetch collab projects (application error):", error);
        } else {
            let results = data.results;
            if(results.projects.length > 0) $("#collab-status").hide();
            else $("#collab-status").html("No projects found.");
            addCollabProjects(results.projects);
            if(results.hasMore) {
                utils.enableButton($("#collab-more").show(), "Load more projects");
            } else $("#collab-more").hide();
        }
    });;
}

function editProject(projectname) {
    location.href = "edit/" + projectname;
}

let lastDeleteProject = undefined;
function deleteProject(projectname) {
    lastDeleteProject = projectname;
    $("#deleteModal-content").html(`Do you really want to permanently delete the project <i>${projectname}</i> from the database and remove all of its contents.<br/><b>This cannot be undone.</b>`);
    let confirm = $("#button-confirm-delete");
    utils.disableButton(confirm, "Please wait...");
    setTimeout(() => {
        utils.enableButton(confirm, "Sure, I want to delete this project");
    }, 5000);

    $("#deleteModal").modal();
}

function confirmDelete() {
    $("#deleteModal").modal("hide");
    if(lastDeleteProject == undefined) return;
    let currentDelete = lastDeleteProject;
    lastDeleteProject = undefined;

    utils.showInfiniteLoading("Deleting the project...");
    $.getJSON("/api/v1/projects/delete/" + currentDelete).fail((xhr, status, err) => {
        console.warn(err);
        $.notify({message: "Unable to delete this project (server error). See console for details."}, {type: "danger"});
    }).done((response) => {
        if(response.error) {
            console.warn(response.message);
            $.notify({message: "Unable to delete this project (application error). See console for details."}, {type: "danger"});
        } else {
            $("#line-project-" + currentDelete).remove();
            $.notify({message: "The project was successfully deleted."}, {type: "success"});
        }
    }).always(() => {
        utils.hideLoading();
    });
}

function updateState(projectname) {
    let actualState = $("#line-project-" + projectname).attr("data-state");
    if(actualState == "running") {
        utils.showInfiniteLoading("Stopping project...");
        $.getJSON("/api/v1/projects/stop/" + projectname).fail((xhr, status, err) => {
            console.warn(err);
            $.notify({message: "Unable to stop this project (server error). See console for details."}, {type: "danger"});
        }).done((response) => {
            if(response.error) {
                console.warn(response.message);
                $.notify({message: "Unable to stop this project (application error). See console for details."}, {type: "danger"});
            } else {
                $.notify({message: "The project was successfully stopped."}, {type: "success"});
                setProjectState(projectname, "success", "play", "Start", false, "stopped");
            }
        }).always(() => {
            utils.hideLoading();
        });
    } else if(actualState == "stopped") {
        utils.showInfiniteLoading("Starting project...");
        $.getJSON("/api/v1/projects/start/" + projectname).fail((xhr, status, err) => {
            console.warn(err);
            $.notify({message: "Unable to start this project (server error). See console for details."}, {type: "danger"});
        }).done((response) => {
            if(response.error) {
                console.warn(response.message);
                $.notify({message: "Unable to start this project (application error). See console for details."}, {type: "danger"});
            } else {
                $.notify({message: "The project was successfully started."}, {type: "success"});
                setProjectState(projectname, "dark", "stop", "Stop", false, "running");
            }
        }).always(() => {
            utils.hideLoading();
        });
    } else {
        // unknown
        $.notify({message: "Unknown actual state. Please refresh the page and inspect docker events."}, {type: "warning"});
    }
}


module.exports.init = init;
module.exports.requestLimit = requestLimit;
module.exports.requestOwned = requestOwned;
module.exports.requestCollab = requestCollab;
module.exports.editProject = editProject;
module.exports.deleteProject = deleteProject;
module.exports.confirmDelete = confirmDelete;
module.exports.updateState = updateState;