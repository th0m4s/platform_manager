let socket, challenges = {}, invertedIndex = {};

function getIndex(host, token) {
    return btoa(host + "$ _ _ $" + token);
}

function getCid(host, token) {
    return invertedIndex[getIndex(host, token)];
}

function init() {
    socket = io("/v1/system");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("setup", {type: "dns_challenges"});
        });

        socket.on("unauthorized", function(err) {
            $.notify({message: "Unable to authenticate to the socket."}, {type: "danger"});
            $("#challenges-status").html("Unable to load DNS challenges.");

            console.log("Unauthorized from the socket", err);
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost."}, {type: "danger"});
        $("#challenges-status").html("Connection with the DNS challenges server lost (socket error).");

        console.log("Socket error", err);
    });

    socket.on("dns_challenges_add", (addMessage) => {
        let cid = Math.floor(Math.random()*1000000);
        let {host, token} = addMessage;

        challenges[cid] = {host, token};
        invertedIndex[getIndex(host, token)] = cid;

        addChallengeLine({cid, host, token});
    });

    socket.on("dns_challenges_remove", (removeMessage) => {
        let {host, token} = removeMessage;
        let cid = getCid(host, token);

        if(cid != undefined) {
            delete challenges[cid];
            delete invertedIndex[getIndex(host, token)];

            $("#challenge-" + cid).remove();
            updateStatusCount();
        }
    });

    socket.on("setup", (status) => {
        if(status.error) {
            $.notify({message: "Cannot setup server connection."}, {type: "danger"});
            $("#challenges-status").html("Unable to load DNS challenges.");

            console.log("Socket error", status.error);
        } else updateStatusCount();
    });
}

function formatHost(host) {
    return host.replace(window.root_domain, "<b>" + window.root_domain + "</b>");
}

function addChallengeLine(challenge) {
    $("#challenges-list").append(`<li class="list-group-item" id="challenge-${challenge.cid}">
        ${formatHost(challenge.host)}<samp class="ml-md-4 text-secondary">${challenge.token}</samp>
        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><button id="challenge-${challenge.cid}-rembtn" onclick="dns_challenges.askRemove(${challenge.cid})" class="btn btn-sm btn-danger"><i class="fas fa-trash-alt"></i> Remove</button></div></span></li>`);

    updateStatusCount();
}

function updateStatusCount() {
    if(Object.keys(challenges).length == 0) {
        $("#challenges-status").show().html("No DNS challenge found.");
        $("#challenges-card").hide();
    } else {
        $("#challenges-status").hide();
        $("#challenges-card").show();
    }
}

let lastRemoveCid = undefined;
function askRemove(cid) {
    let challenge = challenges[cid];

    if(challenge != undefined) {
        lastRemoveCid = cid;
        $("#deleteModal-content").html("Do you really want to remove the challenge on host <i>" + formatHost(challenge.host) + "</i> with value:<br/><samp class='text-secondary'>" + challenge.token + "</samp>"
            + "<br/><br/><i class='fas fa-exclamation-triangle'></i> Warning: If you didn't create manually this challenge, removing it can cause issues about SSL certificates renewal.");
    
        $("#deleteModal").modal();
    }
}

function confirmRemove() {
    $("#deleteModal").modal("hide");

    if(lastRemoveCid != undefined) {
        $("#challenge-" + lastRemoveCid + "-rembtn").attr("disabled", "disabled");

        socket.emit("dns_challenge_cmd", {
            command: "remove", ...challenges[lastRemoveCid]
        });

        lastRemoveCid = undefined;
    }
}

function openAddPopup() {
    $("#addPopup-host").val("");
    $("#addPopup-token").val("");

    $("#addPopup").modal();
}

function confirmAdd() {
    let host = $("#addPopup-host").val().trim().toLowerCase();
    let token = $("#addPopup-token").val().trim();

    if(host.length > 0 && token.length > 0) {
        $("#addPopup").modal("hide");
        host += "." + window.root_domain;
        socket.emit("dns_challenge_cmd", {command: "set", host, token});
    } else {
        $.notify({message: "Invalid or empty fields."}, {type: "warning", z_index: 9999, placement: {from: "bottom", align: "center"}, animate: {enter: "animated fadeInUp", exit: "animated fadeOutDown"}});
    }
}

window.dns_challenges = {init, askRemove, confirmRemove, openAddPopup, confirmAdd};