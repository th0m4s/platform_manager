let lastVerifs = {}, saving = false;
let containerRunning = 0; // see project_manage.ejs

function init() {
    let inputs = window.inputs;
    let html = "";
    let verifs = {};

    for(let input of inputs) {
        let hasRemoteCheck = input.remoteCheck != undefined;
        switch(input.type) {
            case "number":
            case "email":
            case "text":
            case "password":
                html += generateInputBar(input.type, input.text, input.small || "", input.placeholder || "", input.config, hasRemoteCheck);
                if(hasRemoteCheck) {
                    verifs[input.config] = () => {
                        return new Promise((resolve, reject) => {
                            let checkVal = getValue(input.type, input.config, false);
                            if(window.config[input.config] == checkVal) {
                                resolve("No change.");
                            } else {
                                $.getJSON("/api/v1/plugins/" + window.pluginname + input.remoteCheck + window.projectname + "/" + checkVal).fail((xhr, status, error) => {
                                    console.warn("Unable to check value for " + input.config + ":", error);
                                    allowSave();
        
                                    reject("Unable to check value for input " + input.config + ".");
                                }).done((response) => {
                                    if(response.valid) {
                                        resolve(response.message);
                                    } else {
                                        reject(response.message);
                                    }
                                });
                            }
                        })
                    };
                }
                break;
        }
    }

    lastVerifs = verifs;
    $("#inputs").html(html);

    for(let input of inputs) {
        setValue(input.type, input.config, window.config[input.config]);
    }

    allowSave();


    // copied from project_manage.ejs
    $.get("/api/v1/projects/isrunning/" + window.projectname).fail((xhr, status, error) => {
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

    window.onbeforeunload = () => {
        if(!saving && getChanges().length > 0) {
            return "You have unsaved changes on this page. Do you want to leave?";
            // some browser don't display this message (just a confirm popup)
        }
    }
}

function allowSave() {
    $("#save-button").removeAttr("disabled");
}

let lastChanges = [];
function save() {
    $("#save-button").attr("disabled", "disabled");

    let changes = getChanges();

    if(changes.length > 0) {
        lastChanges = changes;

        let prom = [];
        for(let verif of Object.values(lastVerifs)) {
            prom.push(verif());
        }

        Promise.all(prom).then(() => {
            allowSave();

            let restartText = "<br/>Unable to check if this project is running.<br/>It may require a manual restart to apply the new configuration.";
            if(containerRunning == 1) restartText = "Your project will be restarted to apply this configuration.";
            else if(containerRunning == -1) restartText = "This configuration will be used on the next start of your project.";

            $("#confirmModal-content").html("Do you want to save this configuration?<br/>" + restartText);
            $("#confirmModal").modal();
        }).catch((message) => {
            $.notify({message: "Cannot submit configuration: " + message}, {type: "warning"});
            allowSave();
        });
    } else {
        $.notify({message: "No changes made."}, {type: "warning"});
        allowSave();
    }

    return false;
}

function confirmSave() {
    $("#confirmModal").modal("hide");
    if(lastChanges.length > 0) {
        utils.showInfiniteLoading("Saving plugin configuration...");
        $.post("/api/v1/plugins/" + window.pluginname, {changes: lastChanges, project: window.projectname}).fail((xhr, status, error) => {
            console.warn("Save error (server): " + error);
            $.notify({message: "Cannot save plugin config (server error). See console for details."}, {type: "danger"});
            allowSave();
            utils.hideLoading();
        }).done((response) => {
            if(response.error) {
                console.warn("Save error (application): " + response.message);
                $.notify({message: "Cannot save plugin config (application error). See console for details."}, {type: "danger"});
                allowSave();
                utils.hideLoading();
            } else {
                saving = true;
                location.href = "../../details/" + window.projectname + "/saved";
                // message is sent with express flash on the /saved page
            }
        });
    }
}

function checkOne(config) {
    lastVerifs[config]().then(() => {
        $("#input-" + config).addClass("valid").removeClass("invalid");
    }).catch((message) => {
        $("#input-" + config).addClass("invalid").removeClass("valid");
        $.notify({message: "Cannot validate " + config + ": " + message}, {type: "warning"});
    }).finally(() => {
        if($("input.invalid").length > 0) $("#save-button").attr("disabled", "disabled");
        else allowSave();
    });
}

function getChanges() {
    let changes = [];

    for(let input of window.inputs) {
        let newValue = getValue(input.type, input.config, true);
        if(newValue != window.config[input.config]) changes.push([input.config, newValue]);
    }

    return changes;
}

function getValue(type, config, convert) {
    switch(type) {
        case "email":
        case "text":
        case "password":
            return $("#input-" + config).val();
        case "number":
            return (convert ? parseInt : (x) => x)($("#input-" + config).val());
        case "checkbox":
            return (convert ? (x) => (x ? "true" : "false") : (x) => x)($("#input-" + config).is(":checked"));
    }
}

function setValue(type, config, value) {
    switch(type) {
        case "email":
        case "text":
        case "password":
        case "number":
            $("#input-" + config).val(value);
            break;
        case "checkbox":
            $("#input-" + config).attr("checked", value);
            break;
    }
}

function generateInputBar(type, text, small, placeholder, config, hasRemoteCheck) {
    return `<div class="form-group"><label for="input-collaborators" class="mb-1">${text}:</label><input required` + (hasRemoteCheck ? ` onchange="plugin_config.checkOne('${config}')"` : "") +` type="${type}" class="form-control" id="input-${config}" placeholder="${placeholder}">` + (small.length > 0 ? `<small id="small-${config}" class="form-text text-muted">${small}</small>` : "") + `</div>`;
}

window.plugin_config = {init, save, checkOne, confirmSave};