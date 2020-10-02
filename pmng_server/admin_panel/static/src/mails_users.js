function init() {
    setPanelView("users");

    let usersList = $("#users-list");
    for(let user of window.users) {
        let systemClass = "";
        let flags = [];
        if(user.projectname != null) flags.push("for project " + user.projectname);
        if(user.system) {
            systemClass = " user-system";
            flags.push("<i>system</i>");
        }

        usersList.append(`<li class="list-group-item row-user${systemClass}"><b>Mail user #${user.id}:</b> ${user.email}<span class="mx-3">(${flags.join(", ")})</span>
        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/mails/edit/user/${user.id}" class="btn btn-sm btn-primary"><i class="fas fa-edit"></i> Edit</a><button class="btn btn-sm btn-danger"${user.system ? " disabled" : ""}><i class="fas fa-trash-alt"></i> Remove</button></div></span></li>`);
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

        aliasesList.append(`<li class="list-group-item row-alias${systemClass}"><b>Alias #${alias.id}:</b> ${alias.source} <i>to</i> ${alias.destination} <span class="mx-3">(${flags.join(", ")})</span>
        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/mails/edit/alias/${alias.id}" class="btn btn-sm btn-primary"><i class="fas fa-edit"></i> Edit</a><button class="btn btn-sm btn-danger"${alias.system ? " disabled" : ""}><i class="fas fa-trash-alt"></i> Remove</button></div></span></li>`);
    } 


    hideSystemUsers(true, true);
    hideSystemAliases(true, true);
    updateSystemCounters();
}

let currentPanel = undefined;
const possible_panels = ["users", "aliases"];
function setPanelView(panel) {
    if(panel != undefined && !possible_panels.includes(panel)) return;

    $(".chevron").removeClass("fa-chevron-down").addClass("fa-chevron-right").css("margin-left", "0px");
    for(let possiblePanel of possible_panels) $("." + possiblePanel + "-only").hide();
    if(panel != undefined) {
        $("." + panel + "-only").show();
        $(".chevron-" + panel).addClass("fa-chevron-down").removeClass("fa-chevron-right").css("margin-left", "-6px");
    }

    currentPanel = panel;
}

function panelViewClicked(panel) {
    if(currentPanel == panel) setPanelView(undefined);
    else setPanelView(panel);
}

function hideSystemUsers(hide, setCheckbox = true) {
    let checkbox = $("#hide-system-users");
    if(setCheckbox && hide) checkbox.prop("checked", true);
    else if(setCheckbox) checkbox.prop("checked", false);

    if(hide) $(".user-system").hide();
    else $(".user-system").show();

    if($(".row-user:visible").length > 0)
        $("#no-users").hide();
    else $("#no-users").show();
}

function hideSystemAliases(hide, setCheckbox = true) {
    let checkbox = $("#hide-system-aliases");
    if(setCheckbox && hide) checkbox.prop("checked", true);
    else if(setCheckbox) checkbox.prop("checked", false);

    if(hide) $(".alias-system").hide();
    else $(".alias-system").show();

    if($(".row-alias:visible").length > 0)
        $("#no-aliases").hide();
    else $("#no-aliases").show();
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


window.mails_users = {init, setPanelView, panelViewClicked, toggleSystemUsers, toggleSystemAliases};