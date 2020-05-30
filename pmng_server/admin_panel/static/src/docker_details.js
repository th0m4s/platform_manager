function init() {
    utils.showInfiniteLoading("Loading container details..."),
    window.refreshInterval = setInterval(refreshDetails, 10*1000);
    refreshDetails();
}

let fetchError = false, loadHidden = false;
function refreshDetails() {
    $.getJSON("/api/v1/docker/details/" + window.nameOrId).fail((xhr, status, error) => {
        if(!fetchError) {
            $.notify({message: `Unable to refresh container details because of a server error.`}, {type: "danger"});
            fetchError = true;
            clearInterval(window.refreshInterval);
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


module.exports.init = init;