function init() {}
function confirm() {
    let password = $("#input-password").val().trim();
    let confirm = $("#input-confirm").val().trim();
    let inputs = $("#load-inputs");

    if(password.length > 0 && password == confirm) {
        inputs.addClass("disabled").attr("disabled", "disabled");
        $.post("/api/v1/login/passwordReset", {hash, password}).fail((xhr, error, status) => {
            $.notify({message: "Cannot reset password (server error): " + error}, {type: "danger"});
            console.warn(error);

            inputs.removeClass("disabled").removeAttr("disabled");
        }).done((response) => {
            if(response.error) {
                $.notify({message: "Cannot reset password (application error): " + response.message}, {type: "danger"});
                console.warn(error);

                inputs.removeClass("disabled").removeAttr("disabled");
            } else {
                utils.addNotification("Password reset. You can now login.", "success");
                location.href = "/panel/login";
            }
        });
    } else {
        $.notify({message: "Passwords don't match."}, {type: "warning"});
    }

    return false;
}

window.pwdreset_change = {init, confirm};