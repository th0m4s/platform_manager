function init() {
    let list = $("#subprocesses-list");

    for(let [id, subprocess] of Object.entries(window.subprocesses)) {
        list.append(`<li class="list-group-item"><b>${subprocess.name} (${id}) :</b> ${subprocess.usage}`
            + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" data-action="restart" onclick="processes_platform.buttonClicked('${id}')" id="button-${id}"><i class="fas fa-undo-alt"></i> Restart</button></div></span> </li>`);
    }

    list.parent().show();
    $("#subprocesses-status").hide();
}

let lastSubprocessId = undefined;
function restartSubprocess(id) {
    let subprocess = window.subprocesses[id];
    lastSubprocessId = id;

    $("#restartModal-content").html("Do you want to restart the <i>" + subprocess.name + "</i> subprocess?");
    $("#restartModal").modal();
}

function buttonClicked(id) {
    let action = $("#button-" + id).attr("data-action");
    if(action == "restart") restartSubprocess(id);
    else if(action == "check") checkSubprocess(id, false);
    else if(action == "start") {
        lastSubprocessId = id;
        confirmRestart(false);
    }
}

function checkSubprocess(id, delay = true) {
    let button = $("#button-" + id);
    button.attr("disabled", "disabled").removeClass("btn-info").removeClass("btn-warning").addClass("btn-secondary").html("<i class='fas fa-sync fa-spin'></i> Checking...");

    setTimeout(() => {
        $.getJSON("/api/v1/processes/check/" + id).fail((xhr, status, error) => {
            setButtonAction(id, false);
        }).done((response) => {
            if(response.error) {
                setButtonAction(id, false);
            } else {
                if(response.running) {
                    setButtonAction(id, true);
                } else {
                    $("#button-" + id).removeClass("btn-info").removeClass("btn-secondary").addClass("btn-warning").attr("data-action", "start").html("<i class='fas fa-play'></i> Start").removeAttr("disabled");
                }
            }
        });
    }, delay ? 1500 : 0);
}

function setButtonAction(id, restart) {
    let button = $("#button-" + id);
    button.removeAttr("disabled");
    if(restart) {
        button.removeClass("btn-warning").addClass("btn-info").removeClass("btn-secondary").html("<i class='fas fa-undo-alt'></i> Restart").attr("data-action", "restart");
    } else {
        button.removeClass("btn-warning").removeClass("btn-info").addClass("btn-secondary").html("Manual check").attr("data-action", "check");
    }
}

function confirmRestart(restart = true) {
    let subprocess = window.subprocesses[lastSubprocessId];
    let special = subprocess.special;
    
    $("#restartModal").modal("hide");
    utils.showInfiniteLoading((restart ? "Restarting" : "Starting") + " subprocess...");

    $.getJSON("/api/v1/processes/restart/" + lastSubprocessId).fail((xhr, status, error) => {
        if(special == 0) {
            $.notify({message: `A server error occured during the restart procedure. View the console for details.`}, {type: "danger"});
            console.warn(error);
        }
    }).done((response) => {
        if(response.error) {
            $.notify({message: `An application occured during the restart procedure. View the console for details.`}, {type: "danger"});
            console.warn(response.error);
        } else {
            $.notify({message: "Restart signal sent."}, {type: "info"});
        }
    }).always(() => {
        utils.hideLoading();
        checkSubprocess(lastSubprocessId, true);
    });
}

window.processes_platform = {init, buttonClicked, confirmRestart};