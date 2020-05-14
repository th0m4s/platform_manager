function init() {
    utils.showInfiniteLoading("Loading projects...");
    requestOwned(requestLimit).always(() => {
        requestCollab(requestLimit).always(() => {
            utils.hideLoading();
            startIntervalChecking();
        });
    });
}

let checkIntervalId = -1;
function stopChecking() {
    if(checkIntervalId > 0) {
        clearInterval(checkIntervalId);
        checkIntervalId = -1;
    } 
}

function startIntervalChecking() {
    checkIntervalId = setInterval(() => {
        checkStates(allProjects, true);
    }, 10*1000);
}

let allProjects = [];
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
        allProjects = allProjects.concat(names);
        checkStates(names, false);
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
        allProjects = allProjects.concat(names);
        checkStates(names, false);
    }
}

function getProjectHtml(project, disabled) {
    let d = disabled ? " disabled" : "";
    return `<li class="list-group-item" id="line-project-${project.name}" data-state="unknown">`
    + `<b>Project #${project.id} : </b>${project.name} (v${project.version})<span class="text-secondary d-block d-md-inline"><samp class="ml-4">${project.version > 0 ? project.type : "No version deployed"}</samp></span>`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="projects_list.details('${project.name}')"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-primary" onclick="projects_list.editProject('${project.name}')"${d}><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-info" data-current="info" id="button-state-${project.name}" onclick="projects_list.updateState('${project.name}')" ${disabled ? 'data-perm="no"' : ""} data-version="${project.version}" disabled><i class="fas fa-sync fa-spin"></i> Syncing...</button>`
    + `<button class="btn btn-sm btn-secondary" id="button-restart-${project.name}" onclick="projects_list.restartProject('${project.name}')" ${disabled ? 'data-perm="no"' : ""} disabled><i class="fas fa-undo-alt"></i> Restart</button><button class="btn btn-sm btn-danger" onclick="projects_list.deleteProject('${project.name}')"${d}><i class="fas fa-trash-alt"></i> Delete</button></div></span></li>`;
}

function checkStates(projects, canStop) {
    $.getJSON("/api/v1/projects/arerunning/" + projects.join(",")).done((response) => {
        if(response.error) {
            projects.forEach((projectname) => {
                setCanRestart(projectname, false);
                setProjectState(projectname, "warning", null, "Unknown", true, "unknown");
            });

            console.warn(response.message);
            $.notify({message: "Unable to check states (application error). See console for details."}, {type: "danger"});
            if(canStop) stopChecking();
        } else {
            for(let [projectname, state] of Object.entries(response.results)) {
                if(state) {
                    setCanRestart(projectname, true);
                    setProjectState(projectname, "dark", "stop", "Stop", false, "running");
                } else {
                    setCanRestart(projectname, false);
                    setProjectState(projectname, "success", "play", "Start", false, "stopped");
                }
            }
        }
    }).fail((xhr, status, error) => {
        projects.forEach((projectname) => {
            setCanRestart(projectname, false);
            setProjectState(projectname, "warning", null, "Unknown", true, "unknown");
        });

        console.warn(error);
        $.notify({message: "Unable to check states (server error). See console for details."}, {type: "danger"});
        if(canStop) stopChecking();
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

function details(projectname) {
    location.href = "details/" + projectname;
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
                setCanRestart(projectname, false);
                if(checkIntervalId == -1) startIntervalChecking();
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
                setCanRestart(projectname, true);
                if(checkIntervalId == -1) startIntervalChecking();
            }
        }).always(() => {
            utils.hideLoading();
        });
    } else {
        // unknown
        $.notify({message: "Unknown actual state. Please refresh the page and inspect docker events."}, {type: "warning"});
    }
}

function setCanRestart(projectname, canRestart) {
    let btn = $("#button-restart-" + projectname);
    if(!canRestart) btn.attr("disabled", "disabled");
    else if(btn.attr("data-perm") !== "no") btn.removeAttr("disabled");
}

function restartProject(projectname) {
    let actualState = $("#line-project-" + projectname).attr("data-state");
    if(actualState == "running") {
        utils.showInfiniteLoading("Restarting project...");
        $.getJSON("/api/v1/projects/stop/" + projectname).fail((xhr, status, err) => {
            console.warn(err);
            $.notify({message: "Unable to restart this project (stopping server error). See console for details."}, {type: "danger"});
            setCanRestart(projectname, false);
            utils.hideLoading();
        }).done((response) => {
            if(response.error) {
                console.warn(response.message);
                $.notify({message: "Unable to restart this project (stopping application error). See console for details."}, {type: "danger"});
                setCanRestart(projectname, false);
                utils.hideLoading();
            } else {
                setProjectState(projectname, "success", "play", "Start", false, "stopped");
                setCanRestart(projectname, false);
                if(checkIntervalId == -1) startIntervalChecking();

                // restart automacally
                $.getJSON("/api/v1/projects/start/" + projectname).fail((xhr, status, err) => {
                    console.warn(err);
                    $.notify({message: "Unable to restart this project (starting server error). See console for details."}, {type: "danger"});
                    $.notify({message: "The project was stopped during the process. You will need to restart it manually."}, {type: "warning"});
                    utils.hideLoading();
                }).done((response) => {
                    if(response.error) {
                        console.warn(response.message);
                        $.notify({message: "Unable to restart this project (starting application error). See console for details."}, {type: "danger"});
                        $.notify({message: "The project was stopped during the process. You will need to restart it manually."}, {type: "warning"});
                        utils.hideLoading();
                    } else {
                        $.notify({message: "The project was successfully restarted."}, {type: "success"});
                        setProjectState(projectname, "dark", "stop", "Stop", false, "running");
                        setCanRestart(projectname, true);
                        if(checkIntervalId == -1) startIntervalChecking();

                        utils.hideLoading();
                    }
                });
            }
        });
    } else {
        $.notify({message: "Cannot restart a non running project."}, {type: "warning"});
        setCanRestart(projectname, false);
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
module.exports.restartProject = restartProject;
module.exports.details = details;