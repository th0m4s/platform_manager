import "./css/thin_buttons.css";

let settingRead = false;
function prepareButtons() {
    requestAnimationFrame(() => {
        let buttons = $(".thinable-btn:not(.thinprep):visible");
    
        for(let button of buttons) {
            button = $(button);
            button.css("--original-width", (button.outerWidth() + ((button.children("svg").length == 0) ? 18 : 0)) + "px");
        }

        buttons.addClass("thinprep");

        if(!settingRead) {
            settingRead = true;

            if(USER_SETTINGS.thin_buttons) {
                body.addClass("thin-buttons");
            }
        }
    });
}

let body = $(document.body);
function toggle() {
    body.toggleClass("thin-buttons");

    let isThin = body.hasClass("thin-buttons");
    USER_SETTINGS.thin_buttons = isThin;

    $.post("/api/v1/users/settings/thin_buttons", {value: isThin}).fail((xhr, status, error) => {
        $.notify({message: "Unable save thin buttons state. See console for details."}, {type: "warning"});
        console.warn("Unable to save thin buttons state (server error):", error);
    }).done((response) => {
        if(response.error) {
            $.notify({message: "Unable save thin buttons state. See console for details."}, {type: "warning"});
            console.warn("Unable to save thin buttons state (application error):", error);
        }
    });
}

window.thin_buttons = {prepareButtons, toggle}