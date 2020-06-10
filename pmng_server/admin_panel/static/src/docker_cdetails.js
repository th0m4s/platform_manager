function init() {
    utils.showInfiniteLoading("Loading container details..."),
    window.refreshInterval = setInterval(refreshDetails, 10*1000);
    refreshDetails();
}

let fetchError = false, loadHidden = false, lastContainerFailed = false;
let lastCreated = null, lastStarted = null, createdInterval = -1, startedInterval = -1;
function refreshDetails() {
    $.getJSON("/api/v1/docker/containers/details/" + window.nameOrId).fail((xhr, status, error) => {
        if(!fetchError) {
            $.notify({message: `Unable to refresh container details because of a server error.`}, {type: "danger"});
            fetchError = true;
            if(xhr.status != 404) clearInterval(window.refreshInterval);
        }

        if(xhr.status == 404) {
            if(lastContainerFailed) {
                setTimeout(() => {
                    window.location.href = "../list";
                }, 3000);
                $.notify({message: `Multiple consecutive refresh failures. This container doesn't exist anymore.`}, {type: "danger"});
            } else lastContainerFailed = true;
        }

        console.warn(error);
    }).done((response) => {
        if(response.error) {
            if(!fetchError) {
                $.notify({message: `Unable to refresh container details because of an application error.`}, {type: "danger"});
                fetchError = true;
            }

            console.warn(response.code, response.message);
        } else {
            lastContainerFailed = false;

            let details = response.details;

            $("#info-name").html(getCDetailsLink(details.name, "containers"));
            $("#info-id").html(getCDetailsLink(details.containerId, "containers"));
            
            $("#info-image").html(details.image);

            let created = moment(details.createdAt);
            if(lastCreated == null || lastCreated.unix() !== created.unix()) {
                lastCreated = created;

                    if(createdInterval > 0) clearInterval(createdInterval);
                    createdInterval = setInterval(updateCreated, 1000);
                    updateCreated();

                    $("#info-created").html(created.format("LLL"));
            }
            
            let started = moment(details.startedAt);
            if(lastStarted == null || lastStarted.unix() !== started.unix()) {
                    lastStarted = started;

                    if(startedInterval > 0) clearInterval(startedInterval);
                    startedInterval = setInterval(updateStarted, 1000);
                    updateStarted();

                    $("#info-started").html(started.format("LLL"));
            }

            if (!loadHidden) {
                $("#status-msg").hide();
                $("#details-card").show();
            }

            let labelsList = $("#info-labels").html("");
            for(let [name, value] of Object.entries(details.labels)) {
                console.log(name, value);
                labelsList.append(`<li>${name}: ${value}</li>`);
            }

            let networksList = $("#info-networks").html("");
            for(let network of details.networks) {
                networksList.append(`<li class="list-group-item"><i>Name (Id):</i> ${getCDetailsLink(network.name, "networks")} (${getCDetailsLink(network.networkId, "networks")})<br/><i>IP address:</i> ${network.ipAddress} (gateway ${network.gateway})<br/><i>MAC address:</i> ${network.macAddress}<br/>${network.aliases.length > 0 ? "<i>Aliases:</i> " + network.aliases.join(", ") : ""}</li>`);
            }

        }
    }).always(() => {
        if(!loadHidden) {
            if(fetchError) {
                $("#status-msg").html("Unable to find this container.");
                setTimeout(() => {
                    window.location.href = "../list";
                }, 3000);
            }
            
            loadHidden = true;
            utils.hideLoading();
        }
    });
}

function updateCreated() {
    $("#moment-created").html(lastCreated.fromNow());
}

function updateStarted() {
    $("#moment-started").html(lastStarted.fromNow());
}

function getCDetailsLink(value, part) {
    return `<a class="docker-link" href="../../${part}/details/${value}">${value}</a>`;
}

window.docker_cdetails = {init};