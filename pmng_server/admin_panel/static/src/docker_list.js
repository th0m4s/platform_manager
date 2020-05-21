function init() {
    utils.showInfiniteLoading("Loading containers..."),
    window.refreshInterval = setInterval(refreshContainers, 10*1000);
    refreshContainers();
}

let fetchError = false, loadHidden = false;;
function refreshContainers() {
    $.getJSON("/api/v1/docker/running").fail((xhr, status, error) => {
        if(!fetchError) {
            $.notify({message: `Unable to list containers because of a server error.`}, {type: "danger"});
            fetchError = true;
            clearInterval(window.refreshInterval);

            $(".status-msg").html("An error occured while the list was retrieved by the server. Please try again.");
        }
        console.warn(error);
    }).done((response) => {
        if(response.error) {
            if(!fetchError) {
                $.notify({message: `Unable to list containers because of an application error.`}, {type: "danger"});
                fetchError = true;
                clearInterval(window.refreshInterval);

                $(".status-msg").html("An error occured while the list was processed by the platform. Please try again.");
            }
            console.warn(response.code, response.message);
        } else {
            let containers = response.containers;

            if(containers.projects.length == 0) {
                $("#projects-card").hide();
                $("#projects-status").html("No running project containers.").show();
            } else {
                $("#projects-status").hide();
                let list = $("#projects-list").html("");
                for(let container of containers.projects) {
                    let content = `<li class="list-group-item" id="line-project-${container.name}">`
                        + `<b>Project ${container.projectname} : </b> Running in container <i>${container.name}</i> (id ${container.id})`
                        + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

                    list.append(content);
                }
                list.parent().show();
            }

            if(containers.platform.length == 0) {
                $("#platform-card").hide();
                $("#platform-status").html("No running platform containers.").show();
            } else {
                $("#platform-status").hide();
                let list = $("#platform-list").html("");
                for(let container of containers.platform) {
                    let content = `<li class="list-group-item" id="line-platform-${container.name}">`
                        + `<b>${_getPlatfomrKindDisplay(container.kind) + " " + (container.pluginname || "<i>Unknown</i>") + (container.kind == "plugin" ? ` (for project <i>${container.projectname}</i>)` : "")} : </b> Running in container <i>${container.name}</i> (id ${container.id})`
                        + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

                    list.append(content);
                }
                list.parent().show();
            }

            if(containers.others.length == 0) {
                $("#others-card").hide();
                $("#others-status").html("No other running containers.").show();
            } else {
                $("#others-status").hide();
                let list = $("#others-list").html("");
                for(let container of containers.others) {
                    let content = `<li class="list-group-item" id="line-others-${container.name}">`
                        + `<b>${_getOtherKindDisplay(container.kind) + " <i>" + container.name}</i> : </b> Based on image <i>${container.image}</i> (id ${container.id})`
                        + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

                    list.append(content);
                }
                list.parent().show();
            }
        }
    }).always(() => {
        if(!loadHidden) {
            loadHidden = true;
            utils.hideLoading();
        }
    });
}

function _getPlatfomrKindDisplay(kind) {
    return {globalplugin: "Global plugin", plugin: "Plugin"}[kind] || "";
}

function _getOtherKindDisplay(kind) {
    return {"not_reco": "Unrecognized PMNG container", "not_pmng": "Third party container"}[kind] || "";
}

function showContainerDetails(containerName) {
    window.location.href = "details/name/" + containerName;
}


module.exports.init = init;
module.exports.showContainerDetails = showContainerDetails;