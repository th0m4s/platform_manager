function init() {
    if(location.hash == "#aliases") {
        // window.history.replaceState({}, null, location.href.split("#")[0]);
        setPanelView("aliases");
    } else {
        setPanelView("users");
    }

    let usersList = $("#users-list");
    for(let user of window.users) {
        let systemClass = "";
        let flags = [];
        if(user.projectname != null) flags.push("for project " + user.projectname);
        if(user.system) {
            systemClass = " user-system";
            flags.push("<i>system</i>");
        }

        usersList.append(`<li class="list-group-item row-user${systemClass}" data-sort="${user.id}" id="row-user-${user.id}"><b>Mail user #${user.id}:</b> <a class="project-link" target="_blank" href="mailto:${user.email}">${user.email}</a><span class="mx-3">` + (flags.length > 0 ? `(${flags.join(", ")})` : "") + `</span>
        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/login/sso/webmail?uid=${user.id}" class="btn btn-sm btn-info thinable-btn"><i class="fas fa-sign-in-alt"></i> <span>Webmail</span></a><a href="/panel/mails/users/edit/${user.id}" class="btn btn-sm thinable-btn btn-primary"><i class="fas fa-edit"></i> <span>Edit</span></a><button onclick="mails_users.deleteUser(${user.id}, '${user.email}')" class="btn btn-sm thinable-btn btn-danger"${user.system ? " disabled" : ""}><i class="fas fa-trash-alt"></i> <span>Remove</span></button></div></span></li>`);
    } 

    let aliasesList = $("#aliases-list");
    for(let alias of window.aliases) {
        let systemClass = "";
        let flags = [];
        if(alias.projectname != null) flags.push("for project " + alias.projectname);
        if(alias.system) {
            systemClass = " alias-system";
            flags.push("<i>system</i>");
        }

        aliasesList.append(`<li class="list-group-item row-alias${systemClass}" data-sort="${alias.id}" id="row-alias-${alias.id}"><b>Alias #${alias.id}:</b> <a class="project-link" target="_blank" href="mailto:${alias.source}">${alias.source}</a> <i>to</i> <a class="project-link" target="_blank" href="mailto:${alias.destination}">${alias.destination}</a> <span class="mx-3">` + (flags.length > 0 ? `(${flags.join(", ")})` : "") + `</span>
        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/mails/aliases/edit/${alias.id}" class="btn btn-sm thinable-btn btn-primary${alias.system ? " disabled" : ""}"><i class="fas fa-edit"></i> <span>Edit</span></a><button onclick="mails_users.deleteAlias(${alias.id}, '${alias.source}')" class="btn btn-sm thinable-btn btn-danger"${alias.system ? " disabled" : ""}><i class="fas fa-trash-alt"></i> <span>Remove</span></button></div></span></li>`);
    } 


    hideSystemUsers(true, true);
    hideSystemAliases(true, true);
    updateSystemCounters();
    thin_buttons.prepareButtons();
}

let currentPanel = undefined;
const possible_panels = ["users", "aliases"];
function setPanelView(panel) {
    if(panel != undefined && !possible_panels.includes(panel)) return;

    if(panel == "aliases") {
        window.history.replaceState({}, null, location.href.split("#")[0] + "#aliases");
    } else window.history.replaceState({}, null, location.href.split("#")[0]);

    $(".chevron").removeClass("fa-chevron-down").addClass("fa-chevron-right").css("margin-left", "0px");
    for(let possiblePanel of possible_panels) $("." + possiblePanel + "-only").hide();
    if(panel != undefined) {
        $("." + panel + "-only").show();
        $(".chevron-" + panel).addClass("fa-chevron-down").removeClass("fa-chevron-right").css("margin-left", "-6px");
    }

    updateNoUsers();
    updateNoAliases();
    currentPanel = panel;

    requestAnimationFrame(() => {
        thin_buttons.prepareButtons();
    });
}

function panelViewClicked(panel) {
    if(currentPanel == panel) setPanelView(undefined);
    else setPanelView(panel);
}

function hideSystemUsers(hide, setCheckbox = true) {
    let checkbox = $("#hide-system-users");
    if(setCheckbox && hide) checkbox.prop("checked", true);
    else if(setCheckbox) checkbox.prop("checked", false);

    if(hide) $(".user-system").appendTo("#hidden-users");
    else $(".user-system").appendTo("#users-list");
    updateListOrder("#users-list", ".row-user");

    updateNoUsers();
}

function updateNoUsers() {
    if($(".row-user:visible").length > 0)
        $("#no-users").hide();
    else $("#no-users").show();
}

function hideSystemAliases(hide, setCheckbox = true) {
    let checkbox = $("#hide-system-aliases");
    if(setCheckbox && hide) checkbox.prop("checked", true);
    else if(setCheckbox) checkbox.prop("checked", false);

    if(hide) $(".alias-system").appendTo("#hidden-aliases");
    else $(".alias-system").appendTo("#aliases-list");
    updateListOrder("#aliases-list", ".row-alias");

    updateNoAliases();
}

function updateNoAliases() {
    if($(".row-alias:visible").length > 0)
        $("#no-aliases").hide();
    else $("#no-aliases").show();
}

function updateListOrder(listId, childrenSelector) {
    let list = $(listId);
    let array = $.makeArray(list.children(childrenSelector));

    array = array.sort((a, b) => {
        let valA = parseInt($(a).attr("data-sort")), valB = parseInt($(b).attr("data-sort"));
        if(valA < valB) return -1;
        else if(valA > valB) return 1;
        else return 0;
    });

    list.html("");
    $.each(array, function() {
        list.append(this);
    });
}

function updateSystemCounters() {
    $("#counter-users").html($(".user-system").length + "/" + $(".row-user").length);
    $("#counter-aliases").html($(".alias-system").length + "/" + $(".row-alias").length);
}

function toggleSystemUsers(checkbox) {
    hideSystemUsers($(checkbox).is(":checked"), false);
}

function toggleSystemAliases(checkbox) {
    hideSystemAliases($(checkbox).is(":checked"), false);
}

function deleteUser(id, email) {
    $("#deleteModal-title").html("Remove an email user");
    $("#deleteModal-content").html("Do you really want to remove the address <i>" + email + "</i>? This action is irreversible!<br/><br/>If aliases exist for this address, they'll be deleted.");
    deleteType = "user";
    deleteId = id;
    $("#deleteModal").modal();
}

function deleteAlias(id, source) {
    $("#deleteModal-title").html("Remove an email alias");
    $("#deleteModal-content").html("Do you really want to remove the alias <i>" + source + "</i>?");
    deleteType = "alias";
    deleteId = id;
    $("#deleteModal").modal();
}

let deleteType = undefined, deleteId = 0;
function confirmDelete() {
    if(!(["user", "alias"].includes(deleteType)) || deleteId <= 0) return;
    let pluralType = deleteType == "user" ? "users" : "aliases";

    $("#deleteModal").modal("hide");
    utils.showInfiniteLoading("Removing " + deleteType + "...");
    $.getJSON("/api/v1/mails/" + pluralType + "/delete/" + deleteId).fail((xhr, status, error) => {
        $.notify({message: "Unable to remove this " + deleteType + ". See console for details."}, {type: "danger"});
        console.warn("Unable to delete record (server error):", error);
    }).done((response) => {
        if(response.error) {
            $.notify({message: "Unable to remove this " + deleteType + ". See console for details."}, {type: "danger"});
            console.warn("Unable to delete record (application error):", error);
        } else {
            $.notify({message: deleteType[0].toUpperCase() + deleteType.substring(1)  + " successfully removed."}, {type: "success"});
            $("#row-" + deleteType + "-" + deleteId).remove();
            updateSystemCounters();
            if(deleteType == "user") updateNoUsers();
            else updateNoAliases();
        }
    }).always(() => {
        utils.hideLoading();
        deleteId = 0;
        deleteType = undefined;
    });
}

window.mails_users = {init, setPanelView, panelViewClicked, toggleSystemUsers, toggleSystemAliases, deleteUser, deleteAlias, confirmDelete};