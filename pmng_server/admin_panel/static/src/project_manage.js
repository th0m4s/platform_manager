import "./css/project_manage.css";

let forbidden_names = [];
let containerRunning = 0; // 0 no info, 1 running, -1 stopped
// only for edit

function canBeNum(value) {
    return typeof value === "number" || (value != null && typeof value === "string" && value.trim().length > 0 && !isNaN(Number(value))); // not using parseFloat because "3px" is a valid number
}

function init() {
    const plugins = ["mariadb", "redis", "persistent-storage", "custom-port", "srv-record", "plan-limiter", "auto-redirect", "server-timing"];

    let inputCollabs = $("#input-collaborators");
    inputCollabs.tagsinput({ tagClass: "badge-secondary tagsbadge" });
    setImmediate(() => utils.updateTagsInputWidth());

    const checkText = " (Checking...)";
    inputCollabs.on("beforeItemAdd", (event) => {
        if(event.item.toLowerCase() == current) event.cancel = true;
    }).on("itemAdded", (event) => {
        let name = event.item;
        let badge = null, badges = $("#collab-badges").children("span");
        for(let i = 0; i < badges.length; i++) {
            let elem = $(badges.get(i));
            if(elem.text() == name) {
                badge = elem;
                break;
            }
        }

        let lname = name.toLowerCase();

        let html = badge.html();
        badge.html(`<span id="status-collab-${lname}">${lname + checkText}</span>` + html.substring(lname.length, html.length));
        badge = $("#status-collab-" + lname);

        if(event.options == undefined || !event.options.default) {
            $.getJSON("/api/v1/users/exists/" + lname).fail((xhr, status, error) => {
                $.notify({message: `Unable to check user <i>${lname}</i> because of a server error.`}, {type: "danger"});
                console.warn(error);

                inputCollabs.tagsinput("remove", name);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: `Unable to check user <i>${lname}</i> because of an application error.`}, {type: "warning"});
                    console.warn(response.code, response.message);

                    inputCollabs.tagsinput("remove", name);
                } else if(response.exists) {
                    badge.html(lname).parent().removeClass("badge-secondary").addClass("badge-info");
                } else {
                    $.notify({message: `User <i>${lname}</i> doesn't exist.`}, {type: "warning"});
                    inputCollabs.tagsinput("remove", name);
                }
            });

        } else {
            badge.html(lname).parent().removeClass("badge-secondary").addClass("badge-info");
        }
    });

    inputCollabs.tagsinput("input").parent().attr("id", "collab-badges");

    let inputPlugins = $("#input-plugins");
    let taggedPlugins = inputPlugins.tagsinput("input");
    /*inputPlugins.tagsinput({
        typeahead: ["mariadb", "redis"]
    });*/

    taggedPlugins.typeahead({
        hint: false,
        highlight: true,
        minLength: 1
    },
    {
        name: 'plugins',
        source: new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: plugins
        })
    });

    taggedPlugins.on("typeahead:select", (ev, suggestion) => {
        inputPlugins.tagsinput("add", suggestion);
    });

    inputPlugins.on("itemAdded", (event) => {
        if(!plugins.includes(event.item)) {
            inputPlugins.tagsinput("remove", event.item);
            $.notify({message: "This plugin doesn't exists."}, {type: "warning"});
        }
    });
    
    if(edit) {
        $.get("/api/v1/projects/isrunning/" + values.name).fail((xhr, status, error) => {
            $.notify({message: "Unable to check if project is running."}, {type: "warning"});
            console.warn("Unable to access project state (server error):", error);
        }).done((response) => {
            if(response.error) {
                $.notify({message: "Unable to check if project is running."}, {type: "warning"});
                console.warn("Unable to access project state (application error):", error);
            } else {
                if(response.running)
                    containerRunning = 1;
                else containerRunning = -1;
            }
        });

        for(let [key, value] of Object.entries(values.userenv)) {
            displayEnv(key, value)
        }

        for(let [key, value] of Object.entries(values.customconf)) {
            displayCustomConf(key, value)
        }

        // domains are not in project. they should be fetched from the domains table
        values.domains.forEach((domain) => {
            displayDomain(domain.domain, domain.enablesub, domain.full_dns);
        });

        Object.keys(values.plugins).forEach((plugin) => {
            inputPlugins.tagsinput("add", plugin);
        });

        values.collabs.forEach((collab) => {
            inputCollabs.tagsinput("add", collab, {default: true});
        });
    }

    $.getJSON("/api/v1/projects/forbiddennames").fail((xhr, status, error) => {
        console.warn("Cannot get forbidden names", error);
    }).done((response) => {
        forbidden_names = response;
    });

    window.onbeforeunload = () => {
        if(!saving && ((!edit && $("#input-project-name").val().length > 0) || getChanges().count > 0)) {
            return "You have unsaved changes on this page. Do you want to leave?";
            // some browser don't display this message
        }
    }
}

function getRowTypeAttr(value) {
    if(typeof value === "number") return "num_forced";
    else if(canBeNum(value)) return "str_forced";
    else return "str_default";
}

function getRowTypeButtons() {
    return "<span class='rowtype-buttons'><span class='rowtype-str' onclick='project_manage.setRowTypeFromButton(this, \"num\");'>str</span><span class='rowtype-num' onclick='project_manage.setRowTypeFromButton(this, \"str\");'>num</span></span>";
}

function setRowTypeFromButton(button, type) {
    $(button).parent().parent().parent().parent().parent().attr("data-rowtype", type + "_forced");
}

function displayEnv(key, value) {
    let rdnId = Math.floor(Math.random()*10000000);
    $("#env-list").append(`<div class="row env-row mb-2"><div class="col-md-4"><input type="text" required class="form-control input-env-key" placeholder="Variable name" value="${key}"></div><div class="col-md-8">`
     + `<div class="input-group"><input type="text" class="form-control input-env-val" oninput="project_manage.onRowInput(this);" placeholder="Value" id="env_${rdnId}"><div class="input-group-append">`
     // + `<button class="btn btn-primary button-add-env-line" style="display: none;" type="button" onclick="project_manage.addEnv()"><i class="fas fa-plus"></i> Add new</button>`
     + `<button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`);
     $("#env_" + rdnId).val(value);
     updateAdd();
}

function displayCustomConf(key, value) {
    let rdnId = Math.floor(Math.random()*10000000);
    $("#customconf-list").append(`<div class="row customconf-row mb-2" data-rowtype="${getRowTypeAttr(value)}"><div class="col-md-4"><input type="text" required class="form-control input-customconf-key" placeholder="Variable name" value="${key}"></div><div class="col-md-8">`
     + `<div class="input-group"><input type="text" class="form-control input-customconf-val" oninput="project_manage.onRowInput(this);" placeholder="Value" id="customconf_${rdnId}"><div class="input-group-append">`
     // + `<button class="btn btn-primary button-add-env-line" style="display: none;" type="button" onclick="project_manage.addEnv()"><i class="fas fa-plus"></i> Add new</button>`
     + `${getRowTypeButtons()}<button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`);
     $("#customconf_" + rdnId).val(value);
     updateAdd();
}

function onRowInput(input) {
    input = $(input);

    let row = input.parent().parent().parent();
    let currentType = row.attr("data-rowtype");
    if(canBeNum(input.val())) {
        row.attr("data-rowtype", currentType == "str_default" ? "str_forced" : currentType);
    } else row.attr("data-rowtype", "str_default");
}

function addEnv() {
    displayEnv("", "");
}

function addCustomConf() {
    displayCustomConf("", "");
}

function deleteRow(button) {
    $(button).parent().parent().parent().parent().remove();
    updateAdd();
}

function displayDomain(domain, enabled, fulldns) {
    let randomKey = Math.round(Math.random()*100000);
    $("#domains-list").append(`<div class="row domain-row mb-2"><div class="col">`
     + `<div class="input-group"><input type="text" class="form-control input-domain" placeholder="Custom domain" value="${domain}"><div class="input-group-append">`
     + `<div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-enablesub" id="domain-sub-${randomKey}"${enabled ? " checked" : ""}><label class="custom-control-label no-select" for="domain-sub-${randomKey}">Enable subdomains</label></div></div>`
     + `<div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-fulldns" id="domain-fulldns-${randomKey}"${fulldns ? " checked" : ""}><label class="custom-control-label no-select" for="domain-fulldns-${randomKey}">Enable full DNS management</label></div></div>`
     // + `<button class="btn btn-primary button-add-domain-line" style="display: none;" type="button" onclick="project_manage.addDomain()"><i class="fas fa-plus"></i> Add new</button>`
     + `<button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`);
     updateAdd();
}

function addDomain() {
    displayDomain("", true, true);
}

function updateAdd() {
    /*if($(".env-row").length > 0) $("#button-add-env").hide();
    else $("#button-add-env").show();*/

    if($(".domain-row").length > 0) {
        // $("#button-add-domain").hide();
        $("#domain-info").show();
    } else {
        // $("#button-add-domain").show();
        $("#domain-info").hide();
    }
}

function selectAllInputs() {
    return $("input, .bootstrap-tagsinput, .button-add-domain-line, .button-add-env-line, .btn-delete, #button-add-domain, #button-add-env");
}

function disableAllInputs() {
    selectAllInputs().attr("disabled", "disabled").addClass("disabled");
}

function enableAllInputs() {
    selectAllInputs().removeAttr("disabled").removeClass("disabled");
    $(".always-disabled").attr("disabled", "disabled").addClass("disabled");
}

let lastDifferences = undefined;
function confirm() {
    let confirmButton = $("#confirm-button");
    if(!edit) {
        let projectData = {};
        projectData.projectname = $("#input-project-name").val();

        if(forbidden_names.includes(projectData.projectname.toLowerCase())) {
            $.notify({message: "This name cannot be used for a project."}, {type: "danger"});
            return false;
        }

        saving = true;
        disableAllInputs();
        utils.disableButton(confirmButton, "Creating the project...");

        projectData.pluginnames = $("#input-plugins").val().split(",");
        projectData.collaborators = $("#input-collaborators").val().split(",");

        if(projectData.pluginnames.length > 0 && projectData.pluginnames[0].trim().length == 0) projectData.pluginnames = [];
        if(projectData.collaborators.length > 0 && projectData.collaborators[0].trim().length == 0) projectData.collaborators = [];

        let envrows = $(".env-row"), userenv = {};
        for(let i = 0; i < envrows.length; i++) {
            let row = $(envrows.get(i));
            let key = row.find(".input-env-key").val().trim();
            if(key.length > 0) userenv[key] = row.find(".input-env-val").val();
        }
        projectData.userenv = userenv;

        let confrows = $(".customconf-row"), customconf = {};
        for(let i = 0; i < confrows.length; i++) {
            let row = $(confrows.get(i));
            let key = row.find(".input-customconf-key").val().trim();
            if(key.length > 0) {
                let val = row.find(".input-customconf-val").val();
                if(row.attr("data-rowtype") == "num_forced") {
                    let numVal = Number(val);
                    if(!isNaN(numVal)) val = numVal;
                }
    
                wantconf[key] = val;
            }
        }
        projectData.customconf = customconf;

        let domrows = $(".domain-row"), domains = [];
        for(let i = 0; i < domrows.length; i++) {
            let row = $(domrows.get(i));
            let domain = row.find(".input-domain").val().trim();
            if(domain.length > 0) domains.push({domain: domain, enablesub: row.find(".input-enablesub").is(":checked")});
        }
        projectData.customdomains = domains;

        $.post("/api/v1/projects/create", projectData).fail((xhr, status, error) => {
            saving = false;
            $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
            console.warn("Unable to create project (server error):", error);

            enableAllInputs();
            utils.enableButton(confirmButton, "Create this project");
        }).done((response) => {
            if(response.error) {
                saving = false;
                if(response.code == 409) {
                    utils.addNotification(response.message, "warning");
                    location.href = "list";
                } else {
                    $.notify({message: "Unable to create this project. See console for details."}, {type: "danger"});
                    console.warn("Unable to create project (application error):", error);

                    enableAllInputs();
                    utils.enableButton(confirmButton, "Create this project");
                }
            } else {
                utils.addNotification("Project successfully created.", "success");
                location.href = "list";
            }
        });
    } else {
        let changes = getChanges();
        let count = changes.count, differences = changes.differences;

        if(count > 0) {
            let diffTexts = [], specialTexts = [], needDelay = false, needRestart = false, specialWithoutRestart = 0;
            lastDifferences = differences;

            if(differences.plugins.remove.length > 0) {
                let text = "You removed the following plugin" + (differences.plugins.remove.length > 1 ? "s" : "") + ":<ul>";
                needRestart = true;
                differences.plugins.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                    if(item == "persistent-storage") {
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the persistent-storage plugin, you are removing all the files stored for this project.");
                    } else if(item == "mariadb") {
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the mariadb plugin, you are removing all the contents of the database of this project.")
                    } else if(item == "custom-port") {
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the custom-port plugin, your project will not be accessible through the customized port, and this port will be available for another project.")
                    }
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.plugins.add.length > 0) {
                let text = "You added the following plugin" + (differences.plugins.add.length > 1 ? "s" : "") + ":<ul>";
                needRestart = true;
                differences.plugins.add.forEach((item) => {
                    text += "<li>" + item + "</li>";
                    if(item == "custom-port") {
                        specialWithoutRestart++;
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-info-circle'></i> Information: The custom-port plugin will not be initialized and will not be bound to any port until you select one from the Details page of the project.");
                    } else if(item == "plan-limiter") {
                        specialWithoutRestart++;
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-info-circle'></i> Information: The plan-limiter plugin will not be initialized and your project will continue to use the maximum allowed settings until you setup the plugin from the Details page of the project..");
                    } else if(item == "server-timing") {
                        specialWithoutRestart++;
                        needDelay = true;
                        specialTexts.push("<i class='fas fa-info-circle'></i> Information: The server-timing plugin will not be enabled until you setup rules from the Details page of the project.");
                    }
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.collabs.remove.length > 0) {
                let text = "You removed the following collaborator" + (differences.collabs.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.collabs.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.collabs.add.length > 0) {
                let text = "You added the following collaborator" + (differences.collabs.add.length > 1 ? "s" : "") + ":<ul>";
                differences.collabs.add.forEach((item) => {
                    text += "<li>" + item + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.remove.length > 0) {
                let text = "You removed the following custom domain" + (differences.domains.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.add.length > 0) {
                let text = "You added the following custom domain" + (differences.domains.add.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.add.forEach((item) => {
                    text += "<li>" + item.domain + " (" + getDomainInfoText(item, false) + ")</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.modify.length > 0) {
                let text = "You modified the following custom domain" + (differences.domains.modify.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.modify.forEach((item) => {
                    text += "<li>" + item.domain + " (" + getDomainInfoText(item, true) + ")</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            // env
            if(differences.env.remove.length > 0) {
                let text = "You removed the following environment variable" + (differences.env.remove.length > 1 ? "s" : "") + ":<ul>";
                needRestart = true;
                differences.env.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.env.add.length > 0) {
                let text = "You added the following environment variable" + (differences.env.add.length > 1 ? "s" : "") + ":<ul>";
                needRestart = true;
                differences.env.add.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.value + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.env.modify.length > 0) {
                let text = "You modified the following environment variable" + (differences.env.modify.length > 1 ? "s" : "") + ":<ul>";
                needRestart = true;
                differences.env.modify.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.newvalue + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            // custom conf
            if(differences.customconf.remove.length > 0) {
                let text = "You removed the following realtime configuration variable" + (differences.customconf.remove.length > 1 ? "s" : "") + ":<ul>";
                specialWithoutRestart++;
                differences.customconf.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.customconf.add.length > 0) {
                let text = "You added the following realtime configuration variable" + (differences.customconf.add.length > 1 ? "s" : "") + ":<ul>";
                specialWithoutRestart++;
                differences.customconf.add.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.value;

                    if(typeof item.value == "number") {
                        text += "<span class='confirm-rc-small'>(number)</span>";
                    } else if(canBeNum(item.value)) {
                        text += "<span class='confirm-rc-small'>(string)</span>";
                    }

                    text += "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.customconf.modify.length > 0) {
                let text = "You modified the following realtime configuration variable" + (differences.customconf.modify.length > 1 ? "s" : "") + ":<ul>";
                specialWithoutRestart++;
                differences.customconf.modify.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.newvalue;

                    if(typeof item.newvalue == "number") {
                        text += "<span class='confirm-rc-small'>(number)</span>";
                    } else if(canBeNum(item.newvalue)) {
                        text += "<span class='confirm-rc-small'>(string)</span>";
                    }

                    text += "</li>";
                });
                text += "</ul>";
                diffTexts.push(text);
            }

            if(specialWithoutRestart == count) needRestart = false;

            let restartText = "";
            if(needRestart) {
                restartText = "<br/><br/>";
                switch(containerRunning) {
                    case -1:
                        restartText += "Changes will be applied on the next start.";
                        break;
                    case 0:
                        restartText += "Unable to check if the project is running. Changes may require a manual restart.";
                        break;
                    case 1:
                        restartText += "Your project will be restarted to apply the changes.";
                        break;
                }
            }

            lastNeedRestart = needRestart;

            $("#confirmModal-content").html("Do you want to save this project?<br/><br/>" + diffTexts.join("") + (specialTexts.length == 0 ? "" : "<br/>" + specialTexts.join("<br/>")) + restartText);

            let confirmButton = $("#button-confirm-save");
            if(needDelay) {
                utils.disableButton(confirmButton, "Are you sure?");
                setTimeout(() => {
                    utils.enableButton(confirmButton, "Confirm save");
                }, 5000 );
            } else {
                utils.enableButton(confirmButton, "Confirm save");
            }

            $("#confirmModal").modal();
        } else {
            $.notify({message: "No modifications made."}, {type: "info"});
        }

    }

    return false;
}

function getDomainInfoText(item, edition) {
    if(item[edition ? "new_enablesub" : "enablesub"]) {
        if(item[edition ? "new_fulldns" : "full_dns"]) {
            return "subs and full dns enabled";
        } else {
            return "subs enabled, full dns disabled";
        }
    } else {
        if(item[edition ? "new_fulldns" : "full_dns"]) {
            return "subs disabled, full dns enabled"
        } else {
            return "subs and full dns disabled";
        }
    }
}

function getChanges() {
    let wantpluginnames = $("#input-plugins").val().split(",");
    let wantcollaborators = $("#input-collaborators").val().split(",");

    let envrows = $(".env-row"), wantenv = {};
    for(let i = 0; i < envrows.length; i++) {
        let row = $(envrows.get(i));
        let key = row.find(".input-env-key").val().trim();
        if(key.length > 0) wantenv[key] = row.find(".input-env-val").val();
    }

    let confrows = $(".customconf-row"), wantconf = {};
    for(let i = 0; i < confrows.length; i++) {
        let row = $(confrows.get(i));
        let key = row.find(".input-customconf-key").val().trim();
        if(key.length > 0) {
            let val = row.find(".input-customconf-val").val();
            if(row.attr("data-rowtype") == "num_forced") {
                let numVal = Number(val);
                if(!isNaN(numVal)) val = numVal;
            }

            wantconf[key] = val;
        }
    }

    let domrows = $(".domain-row"), wantdomains = [];
    for(let i = 0; i < domrows.length; i++) {
        let row = $(domrows.get(i));
        let domain = row.find(".input-domain").val().trim();
        if(domain.length > 0) wantdomains.push({domain: domain, enablesub: row.find(".input-enablesub").is(":checked"), full_dns: row.find(".input-fulldns").is(":checked")});
    }

    // check differences
    let differences = {}, count = 0;
    differences.plugins = {add: [], remove: []};
    let originalplugins = Object.keys(values.plugins);
    // removed plugins
    for(let originalplugin of originalplugins) {
        if(!wantpluginnames.includes(originalplugin)) {
            differences.plugins.remove.push(originalplugin);
            count++;
        }
    }

    // added plugins
    wantpluginnames.forEach((wantpluginname) => {
        if(wantpluginname.trim().length > 0) {
            if(!originalplugins.includes(wantpluginname)) {
                differences.plugins.add.push(wantpluginname);
                count++;
            }
        }
    });

    differences.collabs = {add: [], remove: []};
    // removed collabs
    for(let originalcollab of values.collabs) {
        if(!wantcollaborators.includes(originalcollab)) {
            differences.collabs.remove.push(originalcollab);
            count++;
        }
    }

    // added collabs
    wantcollaborators.forEach((wantcollaborator) => {
        if(wantcollaborator.trim().length > 0) {
            if(!values.collabs.includes(wantcollaborator)) {
                differences.collabs.add.push(wantcollaborator);
                count++;
            }
        }
    });


    differences.domains = {add: [], remove: [], modify: []};
    let originalDomains = [], wantdomainsobject = {};
    for(let d of wantdomains) {
        wantdomainsobject[d.domain] = {enablesub: d.enablesub, full_dns: d.full_dns};
    }
    let wantdomainskeys = Object.keys(wantdomainsobject);

    // removed and modified domains
    for(let allDomain of values.domains) {
        let originalDomain = allDomain.domain;
        originalDomains.push(originalDomain);

        if(!wantdomainskeys.includes(originalDomain)) {
            differences.domains.remove.push(originalDomain);
            count++;
        } else if(allDomain.enablesub != wantdomainsobject[originalDomain].enablesub || allDomain.full_dns != wantdomainsobject[originalDomain].full_dns) {
            differences.domains.modify.push({domain: originalDomain, new_enablesub: wantdomainsobject[originalDomain].enablesub, new_fulldns: wantdomainsobject[originalDomain].full_dns});
            count++;
        }
    }

    // added domains
    for(let allWantdomain of wantdomains) {
        if(!originalDomains.includes(allWantdomain.domain)) {
            differences.domains.add.push(allWantdomain);
            count++;
        }
    }

    differences.env = {add: [], remove: [], modify: []}
    let wantenvkeys = Object.keys(wantenv), originalenvkeys = Object.keys(values.userenv);

    for(let originalkey of originalenvkeys) {
        if(!wantenvkeys.includes(originalkey)) {
            differences.env.remove.push(originalkey);
            count++;
        } else if(values.userenv[originalkey] !== wantenv[originalkey]) {
            differences.env.modify.push({key: originalkey, newvalue: wantenv[originalkey]});
            count++;
        }
    }

    for(let wantkey of wantenvkeys) {
        if(!originalenvkeys.includes(wantkey)) {
            differences.env.add.push({key: wantkey, value: wantenv[wantkey]});
            count++;
        }
    }

    differences.customconf = {add: [], remove: [], modify: []}
    let wantconfkeys = Object.keys(wantconf), originalconfkeys = Object.keys(values.customconf);

    for(let originalkey of originalconfkeys) {
        if(!wantconfkeys.includes(originalkey)) {
            differences.customconf.remove.push(originalkey);
            count++;
        } else if(values.customconf[originalkey] !== wantconf[originalkey]) {
            differences.customconf.modify.push({key: originalkey, newvalue: wantconf[originalkey]});
            count++;
        }
    }

    for(let wantkey of wantconfkeys) {
        if(!originalconfkeys.includes(wantkey)) {
            differences.customconf.add.push({key: wantkey, value: wantconf[wantkey]});
            count++;
        }
    }

    return {differences, count};
}

let saving = false, lastNeedRestart = false;
function confirmSave() {
    if(lastDifferences == null) return;
    let differences = lastDifferences;
    lastDifferences = null;

    saving = true;
    $("#confirmModal").modal("hide");

    let confirmButton = $("#confirm-button");
    disableAllInputs();
    utils.disableButton(confirmButton, "Saving the project...");

    $.post("/api/v1/projects/edit/" + values.name, {differences: JSON.stringify(differences), restart: (containerRunning != -1 && lastNeedRestart) ? "true" : "false"}).fail((xhr, status, error) => {
        saving = false;
        $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
        console.warn("Unable to save the project (server error):", error);

        enableAllInputs();
        $("#input-project-name").attr("disabled", "disabled");
        utils.enableButton(confirmButton, "Save this project");
    }).done((response) => {
        if(response.error) {
            saving = false;
            $.notify({message: "Unable to save this project. See console for details."}, {type: "danger"});
            console.warn("Unable to save the project (application error):", error);

            enableAllInputs();
            $("#input-project-name").attr("disabled", "disabled");
            utils.enableButton(confirmButton, "Save this project");
        } else {
            utils.addNotification("Project successfully saved.", "success");
            location.href = "../list";
        }
    });
}

window.project_manage = {init, addEnv, addDomain, addCustomConf, deleteRow, confirm, confirmSave, onRowInput, setRowTypeFromButton};