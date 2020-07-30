function init() {
    utils.showInfiniteLoading("Loading networks..."),
    window.refreshInterval = setInterval(refreshNetworks, 10*1000);
    refreshNetworks();
}

let fetchError = false, loadHidden = false;
function refreshNetworks() {
    $.getJSON("/api/v1/docker/networks/list").fail((xhr, status, error) => {
        if(!fetchError) {
            $.notify({message: `Unable to list networks because of a server error.`}, {type: "danger"});
            fetchError = true;
            clearInterval(window.refreshInterval);

            $(".status-msg").html("An error occured while the list was retrieved by the server. Please try again." + (xhr.status == 403 ? "<br/>Unauthorized access." : ""));
        }
        console.warn(error);
    }).done((response) => {
        if(response.error) {
            if(!fetchError) {
                $.notify({message: `Unable to list networks because of an application error.`}, {type: "danger"});
                fetchError = true;
                clearInterval(window.refreshInterval);

                $(".status-msg").html("An error occured while the list was processed by the platform. Please try again.");
            }
            console.warn(response.code, response.message);
        } else {
            let networks = response.networks;

            if(networks.length == 0) {
                $("#networks-card").hide();
                // should never happen because you always have the 3 default networks
                $("#networks-status").html("No network found (check your Docker installation for bridge, none and host networks).").show();
            } else {
                $("#networks-status").hide();
                let list = $("#networks-list").html("");
                let sortProp = "name";
                networks = networks.sort((a, b) => {
                    if(a[sortProp] < b[sortProp]) return -1;
                    else if(a[sortProp] > b[sortProp]) return 1;
                    else return 0;
                });
                for(let network of networks) {
                    let content = `<li class="list-group-item" id="line-network-${network.name}">`
                        + `<b>Network ${getNDetailsLink(network.name)}</b> <i>(id ${getNDetailsLink(network.networkId)})</i>`
                        + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_nlist.showNetworkDetails('${network.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;

                    list.append(content);
                }
                list.parent().show();
                $("#networks-status").html();
            }
        }
    }).always(() => {
        if(!loadHidden) {
            loadHidden = true;
            utils.hideLoading();
        }
    });
}

function showNetworkDetails(networkName) {
    window.location.href = "details/" + networkName;
}

function getNDetailsLink(value) {
    return `<a href="details/${value}" class="docker-link">${value}</a>`;
}

window.docker_nlist = {init, showNetworkDetails};