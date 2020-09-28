function init() {
    //utils.showInfiniteLoading("Loading network details...");
    window.hideMain();
    window.refreshInterval = setInterval(refreshDetails, 10*1000);
    refreshDetails();
}

let fetchError = false, loadHidden = false, lastNetworkFailed = false;
let lastCreated = null, createdInterval = -1;
function refreshDetails() {
    $.getJSON("/api/v1/docker/networks/details/" + window.reference).fail((xhr, status, error) => {
        if(!fetchError) {
            $.notify({message: `Unable to refresh network details because of a server error.`}, {type: "danger"});
            fetchError = true;
            if(xhr.status != 404) clearInterval(window.refreshInterval);
        }

        if(xhr.status == 404) {
            if(lastNetworkFailed) {
                setTimeout(() => {
                    window.location.href = "../list";
                }, 3000);
                $.notify({message: `Multiple consecutive refresh failures. This network doesn't exist anymore.`}, {type: "danger"});
            } else lastNetworkFailed = true;
        }

        console.warn(error);
    }).done((response) => {
        if(response.error) {
            if(!fetchError) {
                $.notify({message: `Unable to refresh network details because of an application error.`}, {type: "danger"});
                fetchError = true;
            }

            console.warn(response.code, response.message);
        } else {
            lastNetworkFailed = false;

            let details = response.details;

            $("#info-name").html(getDetailsLink(details.name, "networks"));
            $("#info-id").html(getDetailsLink(details.networkId, "networks"));
            
            $("#info-driver").html(details.driver);

            let created = moment(details.createdAt);
            if(lastCreated == null || lastCreated.unix() !== created.unix()) {
                lastCreated = created;

                    if(createdInterval > 0) clearInterval(createdInterval);
                    createdInterval = setInterval(updateCreated, 1000);
                    updateCreated();

                    $("#info-created").html(created.format("LLL"));
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

            let containersList = $("#info-containers").html("");
            for(let container of details.containers) {
                containersList.append(`<li class="list-group-item"><i>Name (Id):</i> ${getDetailsLink(container.name, "containers")} (${getDetailsLink(container.id, "containers")})<br/><i>IP address:</i> ${container.ipAddress.split("/")[0]}<br/><i>MAC address:</i> ${container.macAddress}</li>`);
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
            //utils.hideLoading();
            window.showMain();
        }
    });
}

function updateCreated() {
    $("#moment-created").html(lastCreated.fromNow());
}

function updateStarted() {
    $("#moment-started").html(lastStarted.fromNow());
}

function getDetailsLink(value, part) {
    return `<a class="docker-link" href="../../${part}/details/${value}">${value}</a>`;
}

window.docker_ndetails = {init};