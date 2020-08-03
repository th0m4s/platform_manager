let socket = undefined;

function init() {
    utils.showInfiniteLoading("Loading containers..."),
    socket = io("/v1/docker");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("setup", {type: "containers"});

            listContainers();
        });
        socket.on("unauthorized", function(err) {
            utils.hideLoading();
            $.notify({message: "Unable to authenticate to the socket. You may need to reload the page."}, {type: "danger"});

            console.log("Unauthorized from the socket", err);
        });
    });

    socket.on("error", (err) => {
        utils.hideLoading();
        $.notify({message: "Connection with the socket lost. You may need to reload the page."}, {type: "danger"});

        console.log("Socket error", err);
    });

    socket.on("container_action", (message) => {
        let item = message.item;
        switch(message.action) {
            case "add":
                let method = undefined;
                switch(item.category) {
                    case "projects":
                        method = addProjectContainer;
                        break;
                    case "platform":
                        method = addPlatformContainer;
                        break;
                    case "others":
                        method = addOtherContainer;
                        break;
                }

                if(method != undefined) method(item.result);
                break;
            case "remove":
                $("#line-" + item).remove();
                break;
        }

        setCardState("projects", $(".line-project").length > 0);
        setCardState("platform", $(".line-platform").length > 0);
        setCardState("others", $(".line-other").length > 0);
    });
}

let noTexts = {
    projects: "No running project containers.",
    platform: "No running platform containers.",
    others: "No other running containers."
}
function setCardState(card, hasItem) {
    if(!hasItem) {
        $("#" + card + "-card").hide();
        $("#" + card + "-status").html(noTexts[card]).show();
    } else {
        $("#" + card + "-card").show();
        $("#" + card + "-status").hide();
    }
}

function clearLists() {
    $(".containers-list").html("");
}

function addProjectContainer(container) {
    let content = `<li class="list-group-item line-project" id="line-${container.name}">`
    + `<b>Project ${container.projectname} : </b> Running in container <i>${getCDetailsLink(container.name)}</i> (id ${getCDetailsLink(container.id)})`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_clist.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

    $("#projects-list").append(content);
}

function addPlatformContainer(container) {
    let content = `<li class="list-group-item line-platform" id="line-${container.name}">`
    + `<b>${_getPlatformKindDisplay(container.kind) + (container.kind != "deployment" ? " " + (container.pluginname || "<i>Unknown</i>") : "") + (container.kind == "plugin" ? ` (for project <i>${container.projectname}</i>)` : (container.kind == "deployment" ? ` of project ${container.projectname}` : ""))} : </b> Running in container <i>${getCDetailsLink(container.name)}</i> (id ${getCDetailsLink(container.id)})`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_c
    list.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

    $("#platform-list").append(content);
}

function addOtherContainer(container) {
    let content = `<li class="list-group-item line-other" id="line-${container.name}">`
    + `<b>${_getOtherKindDisplay(container.kind) + " <i>" + getCDetailsLink(container.name)}</i> : </b> Based on image <i>${container.image}</i> (id ${getCDetailsLink(container.id)})`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_clist.showContainerDetails('${container.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

    $("#others-list").append(content);
}

function listContainers() {
    $.getJSON("/api/v1/docker/containers/running").fail((xhr, status, error) => {
        $.notify({message: `Unable to list containers because of a server error.`}, {type: "danger"});
        console.warn(error);

        $(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page.");
        socket.close();
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to list containers because of an application error.`}, {type: "danger"});
            console.warn(response.code, response.message);

            $(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page.");
            socket.close();
        } else {
            let containers = response.containers;
            clearLists();

            if(containers.projects.length == 0) {
                setCardState("projects", false);
            } else {
                setCardState("projects", true);
                for(let container of containers.projects) {
                    addProjectContainer(container);
                }
            }

            if(containers.platform.length == 0) {
                setCardState("platform", false);
            } else {
                setCardState("platform", true);
                for(let container of containers.platform) {
                    addPlatformContainer(container);
                }
            }

            if(containers.others.length == 0) {
                setCardState("others", false);
            } else {
                setCardState("others", true);
                for(let container of containers.others) {
                    addOtherContainer(container);
                }
            }
        }
    }).always(() => {
        utils.hideLoading();
    });
}

function _getPlatformKindDisplay(kind) {
    return {globalplugin: "Global plugin", plugin: "Plugin", deployment: "Deployment"}[kind] || "";
}

function _getOtherKindDisplay(kind) {
    return {"not_reco": "Unrecognized PMNG container", "not_pmng": "Third party container"}[kind] || "";
}

function showContainerDetails(containerName) {
    window.location.href = "details/" + containerName;
}

function getCDetailsLink(value) {
    return `<a href="details/${value}" class="docker-link">${value}</a>`;
}

window.docker_clist = {init, showContainerDetails};