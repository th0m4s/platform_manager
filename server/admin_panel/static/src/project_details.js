function init() {
    const plugins = ["mariadb", "redis", "persistent-storage"];

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
        for(let [key, value] of Object.entries(values.userenv)) {
            displayEnv(key, value)
        }

        // domains are not in project. they should be fetched from the domains table
        values.domains.forEach((domain) => {
            displayDomain(domain.domain, domain.enablesub);
        });

        Object.keys(values.plugins).forEach((plugin) => {
            inputPlugins.tagsinput("add", plugin);
        });

        values.collabs.forEach((collab) => {
            inputCollabs.tagsinput("add", collab, {default: true});
        });
    }
}

function displayEnv(key, value) {
    $("#env-list").append(`<div class="row env-row mb-2"><div class="col-md-4"><input type="text" required class="form-control input-env-key" placeholder="Variable name" value="${key}"></div><div class="col-md-8">`
     + `<div class="input-group"><input type="text" class="form-control input-env-val" placeholder="Value" value="${value}"><div class="input-group-append">`
     + `<button class="btn btn-primary button-add-env-line" style="display: none;" type="button" onclick="project_details.addEnv()"><i class="fas fa-plus"></i> Add new</button>`
     + `<button class="btn btn-danger btn-delete" type="button" onclick="project_details.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`);
     updateAdd();
}

function addEnv() {
    displayEnv("", "");
}

function deleteRow(button) {
    $(button).parent().parent().parent().parent().remove();
    updateAdd();
}

function displayDomain(domain, enabled) {
    let randomKey = Math.round(Math.random()*100000);
    $("#domains-list").append(`<div class="row domain-row mb-2"><div class="col">`
     + `<div class="input-group"><input type="text" class="form-control input-domain" placeholder="Custom domain" value="${domain}"><div class="input-group-append"><div class="input-group-text">`
     + `<div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-enablesub" id="domain-sub-${randomKey}"${enabled ? " checked" : ""}><label class="custom-control-label no-select" for="domain-sub-${randomKey}">Enable subdomains (like www)</label></div></div>`
     + `<button class="btn btn-primary button-add-domain-line" style="display: none;" type="button" onclick="project_details.addDomain()"><i class="fas fa-plus"></i> Add new</button>`
     + `<button class="btn btn-danger btn-delete" type="button" onclick="project_details.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`);
     updateAdd();
}

function addDomain() {
    displayDomain("", true);
}

function updateAdd() {
    if($(".env-row").length > 0) $("#button-add-env").hide();
    else $("#button-add-env").show();

    if($(".domain-row").length > 0) {
        $("#button-add-domain").hide();
        $("#domain-info").show();
    } else {
        $("#button-add-domain").show();
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
}

let lastDifferences = undefined;
function confirm() {
    let confirmButton = $("#confirm-button");
    if(!edit) {
        disableAllInputs();
        utils.disableButton(confirmButton, "Creating the project...");

        let projectData = {};
        projectData.projectname = $("#input-project-name").val();
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

        let domrows = $(".domain-row"), domains = [];
        for(let i = 0; i < domrows.length; i++) {
            let row = $(domrows.get(i));
            let domain = row.find(".input-domain").val().trim();
            if(domain.length > 0) domains.push({domain: domain, enablesub: row.find(".input-enablesub").is(":checked")});
        }
        projectData.customdomains = domains;

        $.post("/api/v1/projects/create", projectData).fail((xhr, status, error) => {
            $.notify({message: "Unable to contact server. See console for details."}, {type: "danger"});
            console.warn("Unable to create project (server error):", error);

            enableAllInputs();
            utils.enableButton(confirmButton, "Create this project");
        }).done((response) => {
            if(response.error) {
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
        let wantpluginnames = $("#input-plugins").val().split(",");
        let wantcollaborators = $("#input-collaborators").val().split(",");

        let envrows = $(".env-row"), wantenv = {};
        for(let i = 0; i < envrows.length; i++) {
            let row = $(envrows.get(i));
            let key = row.find(".input-env-key").val().trim();
            if(key.length > 0) wantenv[key] = row.find(".input-env-val").val();
        }

        let domrows = $(".domain-row"), wantdomains = [];
        for(let i = 0; i < domrows.length; i++) {
            let row = $(domrows.get(i));
            let domain = row.find(".input-domain").val().trim();
            if(domain.length > 0) wantdomains.push({domain: domain, enablesub: row.find(".input-enablesub").is(":checked")});
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
            wantdomainsobject[d.domain] = d.enablesub;
        }
        let wantdomainskeys = Object.keys(wantdomainsobject);

        // removed and modified domains
        for(let allDomain of values.domains) {
            let originalDomain = allDomain.domain;
            originalDomains.push(originalDomain);

            if(!wantdomainskeys.includes(originalDomain)) {
                differences.domains.remove.push(originalDomain);
                count++;
            } else if(allDomain.enablesub != wantdomainsobject[originalDomain]) {
                differences.domains.modify.push({domain: originalDomain, newstate: wantdomainsobject[originalDomain]});
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

        if(count > 0) {
            let diffTexts = [];
            lastDifferences = differences;

            if(differences.plugins.remove.length > 0) {
                let text = "You removed the following plugin" + (differences.plugins.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.plugins.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.plugins.add.length > 0) {
                let text = "You added the following plugin" + (differences.plugins.add.length > 1 ? "s" : "") + ":<ul>";
                differences.plugins.add.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.collabs.remove.length > 0) {
                let text = "You removed the following collaborator" + (differences.collabs.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.collabs.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.collabs.add.length > 0) {
                let text = "You added the following collaborator" + (differences.collabs.add.length > 1 ? "s" : "") + ":<ul>";
                differences.collabs.add.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.remove.length > 0) {
                let text = "You removed the following custom domain" + (differences.domains.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.add.length > 0) {
                let text = "You added the following custom domain" + (differences.domains.add.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.add.forEach((item) => {
                    text += "<li>" + item.domain + (item.enablesub ? " (subs enabled)" : " (subs disabled)") + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.domains.modify.length > 0) {
                let text = "You modified the following custom domain" + (differences.domains.modify.length > 1 ? "s" : "") + ":<ul>";
                differences.domains.modify.forEach((item) => {
                    text += "<li>" + item.domain + (item.newstate ? ": subs enabled" : ": subs disabled") + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            // env
            if(differences.env.remove.length > 0) {
                let text = "You removed the following environment variable" + (differences.env.remove.length > 1 ? "s" : "") + ":<ul>";
                differences.env.remove.forEach((item) => {
                    text += "<li>" + item + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.env.add.length > 0) {
                let text = "You added the following environment variable" + (differences.env.add.length > 1 ? "s" : "") + ":<ul>";
                differences.env.add.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.value + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            if(differences.env.modify.length > 0) {
                let text = "You modified the following environment variable" + (differences.env.modify.length > 1 ? "s" : "") + ":<ul>";
                differences.env.modify.forEach((item) => {
                    text += "<li>" + item.key + ": " + item.newvalue + "</li>";
                })
                text += "</ul>";
                diffTexts.push(text);
            }

            $("#confirmModal-content").html("Do you want to save this project?<br/><br/>" + diffTexts.join(""));
            $("#confirmModal").modal();
        } else {
            $.notify({message: "No modifications made."}, {type: "info"});
        }

    }

    return false;
}

function confirmSave() {
    if(lastDifferences == null) return;
    let differences = lastDifferences;
    lastDifferences = null;

    $("#confirmModal").modal("hide");

    let confirmButton = $("#confirm-button");
    disableAllInputs();
    utils.disableButton(confirmButton, "Saving the project...");

    $.post("/api/v1/projects/edit/" + values.name, {differences: JSON.stringify(differences)});
}


module.exports.init = init;
module.exports.addEnv = addEnv;
module.exports.addDomain = addDomain;
module.exports.deleteRow = deleteRow;
module.exports.confirm = confirm;
module.exports.confirmSave = confirmSave;