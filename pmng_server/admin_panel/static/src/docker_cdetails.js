let socketClosed = false, socket;

function init() {
    //utils.showInfiniteLoading("Loading container details...");
    window.hideMain();
    window.refreshInterval = setInterval(refreshDetails, 10*1000);
    socket = io("/v1/docker");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("setup", {type: "stats", container: window.reference});

            // TODO: refresh details with docker socket
            refreshDetails();
        });
        socket.on("unauthorized", function(err) {
            //utils.hideLoading();
            window.showMain();
            $.notify({message: "Unable to authenticate to the socket. Usage statistics will not be displayed."}, {type: "danger"});
            $("#info-stats").html("Cannot load container stats.");

            console.log("Unauthorized from the socket", err);
        });
    });

    socket.on("error", (err) => {
        //utils.hideLoading();
        window.showMain();
        $.notify({message: "Connection with the socket lost. You may need to reload the page (container stats will not work anymore)."}, {type: "danger"});
        $("#info-stats").html("Cannot load container stats: socket error.");

        console.log("Socket error", err);
    });

    socket.on("stats", (statsData) => {
        let mem_max = statsData.mem_max, mem_used = statsData.mem_used;
        $("#stats-mem").html(utils.string.formatBytes(mem_used, 0) + "/" + utils.string.formatBytes(mem_max, 0) + " (" + (mem_used/mem_max*100).toPrecision(2) + "%)");

        $("#stats-cpu").html(statsData.cpu_usage.toPrecision(2) + "%");

        let net = statsData.net;
        $("#stats-net").html("RX " + net.rx + " (" + utils.string.formatBytes(net.rx, 0) + ") / TX " + net.tx + " (" + utils.string.formatBytes(net.tx, 0) + ")");
    });

    socket.on("setup", (status) => {
        if(status.error == false) {
            // if container doesn't exist, this will be overwritten
            $("#info-stats").html("<li>Memory usage: <span id='stats-mem'>Loading...</span></li>"
                + "<li>CPU usage: <span id='stats-cpu'>Loading...</span></li>"
                + "<li>Network I/O: <span id='stats-net'>Loading...</span></li>");
        } // if important, stats_error will be emitted
    })

    socket.on("stats_error", (err) => {
        if(err.stopped == true) {
            $("#info-stats").html("The container was stopped. Please wait, we're trying to reconnect...");
            socketClosed = true;
            socket.close();
        } else {
            $("#info-stats").html("Cannot load container stats: " + (err.message || err));
        }
    });
}

let fetchError = false, loadHidden = false, lastContainerFailed = false;
let lastCreated = null, lastStarted = null, createdInterval = -1, startedInterval = -1;
function refreshDetails() {
    $.getJSON("/api/v1/docker/containers/details/" + window.reference).fail((xhr, status, error) => {
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

            if(response.code == 404) {
                if(lastContainerFailed) {
                    setTimeout(() => {
                        window.location.href = "../list";
                    }, 3000);
                    $.notify({message: `Multiple consecutive refresh failures. This container doesn't exist anymore.`}, {type: "danger"});
                } else lastContainerFailed = true;
            }

            console.warn(response.code, response.message);
        } else {
            lastContainerFailed = false;
            if(socketClosed) {
                socketClosed = false;
                socket.open();
            }

            let details = response.details;

            $("#info-name").html(getDetailsLink(details.name, "containers"));
            $("#info-id").html(getDetailsLink(details.containerId, "containers"));
            
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
                labelsList.append(`<li>${name}: ${value}</li>`);
            }

            let portsList = $("#info-ports").html("");
            for(let [name, value] of Object.entries(details.ports)) {
                for(let portData of value) {
                    portsList.append(`<li>${name}: Bound on host to ${(portData.HostIp == undefined || portData.HostIp == "0.0.0.0" ? "port " : portData.HostIp + ":") + portData.HostPort}</li>`);
                }
            }

            let networksList = $("#info-networks").html("");
            for(let network of details.networks) {
                networksList.append(`<li class="list-group-item"><i>Name (Id):</i> ${getDetailsLink(network.name, "networks")} (${getDetailsLink(network.networkId, "networks")})<br/><i>IP address:</i> ${network.ipAddress} (gateway ${network.gateway})<br/><i>MAC address:</i> ${network.macAddress}<br/>${network.aliases.length > 0 ? "<i>Aliases:</i> " + network.aliases.join(", ") : ""}</li>`);
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

window.docker_cdetails = {init};