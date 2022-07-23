let socket = undefined;

function init() {
    //utils.showInfiniteLoading("Loading users...");
    window.hideMain();
    socket = io("/v1/users");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("setup", {type: "list"});

            listUsers();
        });
        socket.on("unauthorized", function(err) {
            //utils.hideLoading();
            window.showMain();
            $.notify({message: "Unable to authenticate to the socket. You may need to reload the page."}, {type: "danger"});

            console.log("Unauthorized from the socket", err);
        });
    });

    socket.on("error", (err) => {
        //utils.hideLoading();
        window.showMain();
        $.notify({message: "Connection with the socket lost. You may need to reload the page."}, {type: "danger"});

        console.log("Socket error", err);
    });

    socket.on("user_action", (message) => {
        let user = message.user;
        switch(message.action) {
            case "add":
                displayUser(user);
                thin_buttons.prepareButtons();
                break;
            case "remove":
                $("#line-" + user).remove();
                break;
        }
    });
}

function displayUser(user) {
    let content = `<li class="list-group-item line-user" id="line-${user.name}">`
    + `<b>User #${user.id} : </b> ${user.fullname} (${user.name})<span class="ml-md-4"><i>${user.email}</i> (permission level ${user.scope})</span>`
    + `<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-primary thinable-btn" onclick="users_all.editUser('${user.name}')"><i class="fas fa-edit"></i> <span>Edit</span></button><button class="btn btn-sm thinable-btn btn-danger" ${window.currentUsername == user.name ? "disabled " : ""}onclick="users_all.deleteUser('${user.name}')"><i class="fas fa-trash-alt"></i> <span>Delete</span></button></div></span></li>`;

    $("#users-list").append(content);
}

function clearLists() {
    $("#users-list").html("");
}

function listUsers() {
    $.getJSON("/api/v1/users/list").fail((xhr, status, error) => {
        $.notify({message: `Unable to list users because of a server error.`}, {type: "danger"});
        console.warn(error);

        $(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page.");
    }).done((response) => {
        if(response.error) {
            $.notify({message: `Unable to list users because of an application error.`}, {type: "danger"});
            console.warn(response.code, response.message);

            $(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page.");
        } else {
            let users = response.users;
            clearLists();


            $("#users-status").hide();
            $("#users-card").show();

            for(let user of users) {
                displayUser(user);
            }

            thin_buttons.prepareButtons();
        }
    }).always(() => {
        //utils.hideLoading();
        window.showMain();
    });
}

let confirmUsername = undefined;
function confirm() {
    if(confirmUsername == undefined) return;
    let deleteUsername = confirmUsername;
    confirmUsername = undefined;
    $("#confirmModal").modal("hide");

    utils.showInfiniteLoading("Deleting user " + deleteUsername + "...");
    $.getJSON("/api/v1/users/delete/" + deleteUsername).fail((xhr, status, err) => {
        console.warn(err);
        $.notify({message: "Unable to delete this user (server error). See console for details."}, {type: "danger"});
    }).done((response) => {
        if(response.error) {
            console.warn(response.message);
            $.notify({message: "Unable to delete this user (application error). See console for details."}, {type: "danger"});
        } else {
            $("#line-" + deleteUsername).remove();
            $.notify({message: "The user was successfully deleted."}, {type: "success"});
        }
    }).always(() => {
        utils.hideLoading();
    });
}

function editUser(username) {
    location.href = "/panel/users/edit/" + username;
}

let lastCid = 0;
function deleteUser(username) {
    if(lastCid > 0) clearInterval(lastCid);

    confirmUsername = username;
    $("#confirmModal-content").html("Do you really want to delete the user <i>" + username + "</i>?"
        + "<br/><br/><i class='fas fa-exclamation-triangle'></i> Warning: This action is irreversible! All the projects and their associated contents owned by this user will be removed for ever!");
    $("#confirmModal").modal();

    let button = $("#confirmModal-button").html("Please wait 10s...").attr("disabled", "disabled"), i = 10;
    lastCid = setInterval(() => {
        i--;
        if(i == 0) {
            clearInterval(lastCid);
            lastCid = 0;
            button.html("Sure, delete this user").removeAttr("disabled");
        } else button.html("Please wait " + i + "s...");
    }, 1000);
}


window.users_all = {init, confirm, deleteUser, editUser};