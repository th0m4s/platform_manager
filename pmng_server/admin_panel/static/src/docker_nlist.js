let socket = undefined;

function init() {
    utils.showInfiniteLoading("Loading networks..."),
    socket = io("/v1/docker");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("setup", {type: "networks"});

            listNetworks();
        });
        socket.on("unauthorized", function(err) {
            utils.hideLoading();
            $.notify({message: "Unable to authenticate to the socket. Please reload the page."}, {type: "danger"});

            console.log("Unauthorized from the socket", err);
        });
    });

    socket.on("error", (err) => {
        utils.hideLoading();
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});

        console.log("Socket error", err);
    });

    socket.on("network_action", (message) => {
        let item = message.item;
        switch(message.action) {
            case "add":
                addNetwork(item);
                break;
            case "remove":
                $("#line-" + item).remove();
                break;
        }
    });
}

function setStatusMessage(hasNetworks) {
    if(!hasNetworks) {
        $("#networks-status").html("No network found (check your Docker installation for bridge, none and host networks).").show();
        $("#networks-card").hide();
    } else {
        $("#networks-status").hide();
        $("#networks-card").show();
    }
}

function addNetwork(network) {
    let content = `<li class="list-group-item line-network" data-sort="${network.name}" id="line-${network.name}">`
    + `<b>Network ${getNDetailsLink(network.name)}</b> <i>(id ${getNDetailsLink(network.networkId)})</i>`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_nlist.showNetworkDetails('${network.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

    $("#networks-list").append(content);

    updateNetworksOrder();
}

function listNetworks() {
    $.getJSON("/api/v1/docker/networks/list").fail((xhr, status, error) => {
        $.notify({message: `Unable to list networks because of a server error.`}, {type: "danger"});
        console.warn(error);

        $(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page.");
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to list networks because of an application error.`}, {type: "danger"});
            console.warn(response.code, response.message);

            $(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page.");
        } else {
            let networks = response.networks;

            if(networks.length == 0) {
                setStatusMessage(false);
            } else {
                setStatusMessage(true);
                $("#networks-status").hide();
                for(let network of networks) {
                    addNetwork(network);
                }
            }
        }
    }).always(() => {
        utils.hideLoading();
    });
}

function updateNetworksOrder() {
    let list = $("#networks-list");
    let array = $.makeArray(list.children(".line-network"));

    array = array.sort((a, b) => {
        let valA = $(a).attr("data-sort"), valB = $(b).attr("data-sort");
        if(valA < valB) return -1;
        else if(valA > valB) return 1;
        else return 0;
    });

    list.html("");
    $.each(array, function() {
        list.append(this);
    });
}

function showNetworkDetails(networkName) {
    window.location.href = "details/" + networkName;
}

function getNDetailsLink(value) {
    return `<a href="details/${value}" class="docker-link">${value}</a>`;
}

window.docker_nlist = {init, showNetworkDetails};