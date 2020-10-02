function init() {
    let count = window.emails.length;
    let list = $("#passwords-list"), rowClass = count == 1 ? " only-row" : "";
    for(let {id, email} of window.emails) {
        list.append(`<div data-id="${id}" data-email="${email}" class="row mb-3 justify-content-end passwords-row${rowClass}"><div class="col-md-auto"><div class="input-group-prepend"><span class="input-group-text">${email}</span></div></div>
            <div class="col passwords-col"><div class="input-group"><input required type="password" class="form-control mail-passwords-main" id="input-${id}" placeholder="Password">
            <input required type="password" class="form-control" id="confirm-${id}" placeholder="Confirmation">
            <div class="input-group-append mail-passwords-showHover"><button onclick="mails_passwords.copyBefore(this)" class="btn btn-dark mail-passwords-copyBefore" type="button"><i class="fas fa-copy"></i> Copy from previous</button><button onclick="mails_passwords.copyNext(this)" class="btn btn-secondary mail-passwords-copyNext" type="button"><i class="fas fa-clipboard"></i> Copy to next</button></div></div></div></div>`);
    }

    if(count == 1) {
        $("#missing-some").html("one");
    } else if(count == 0) {
        location.reload();
    }

    updateSizes();
    $(window).resize(function() {
        updateSizes();
    });
}

function updateSizes() {
    $(".passwords-col").css("max-width", "");
    let maxPrepend = 0, colSize = 0;
    $(".passwords-row").each((index, element) => {
        element = $(element);
        let prependW = element.find(".input-group-prepend").width();
        if(prependW > maxPrepend) {
            maxPrepend = prependW;
            colSize = element.find(".passwords-col").width();
        }
    });

    if(colSize > 0) $(".passwords-col").css("max-width", colSize);
}

function sendForm() {
    let passwords = [], errorConfirm = undefined;
    $(".passwords-row").each((index, element) => {
        element = $(element);

        let password = element.find("input.mail-passwords-main").val();
        let confirm = element.find("input:not(.mail-passwords-main)").val();

        if(confirm != password) {
            errorConfirm = element.attr("data-email");
            return false;
        }

        passwords.push({id: element.attr("data-id"), password});
    });

    let plural = window.emails.length > 1 ? "s" : "";
    if(errorConfirm != undefined) {
        $.notify({message: "Confirmation for <i>" + errorConfirm + "</i> is incorrect."}, {type: "warning"});
    } else {
        let encrypt = window.unixcrypt.encrypt;
        utils.showInfiniteLoading("Encrypting password" + plural + "...");

        setTimeout(() => {
            passwords = passwords.map(({id, password}) => { return {id, password: encrypt(password)} });
            utils.showInfiniteLoading("Saving password" + plural + "...");
            $.post("/api/v1/mails/setPasswords", {encrypted: true, passwords}).fail((xhr, status, error) => {
                $.notify({message: "Cannot save password" + plural + ". See console for details.<br/>If the error keeps repeating, try logout and login again."}, {type: "danger"});
                console.error("Cannot save (server error):", error);
            }).done((response) => {
                if(response.error) {
                    $.notify({message: "Cannot save password" + plural + ". See console for details.<br/>If the error keeps repeating, try logout and login again."}, {type: "danger"});
                    console.error("Cannot save (application error):", message);
                } else {
                    utils.addNotification("Mail password" + plural + " saved.", "success");
                    location.reload();
                }
            }).always(() => {
                utils.hideLoading();
            })
        }, 500);
    }

    return false;
}

function copyNext(btn) {
    let row = $(btn).parent().parent().parent().parent();
    let password = row.find("input.mail-passwords-main").val();
    let confirm = row.find("input:not(.mail-passwords-main)").val();

    row.nextAll().find("input.mail-passwords-main").val(password);
    row.nextAll().find("input:not(.mail-passwords-main)").val(confirm);
}

function copyBefore(btn) {
    let row = $(btn).parent().parent().parent().parent();
    let prevRow = row.prev();
    console.log(row);
    console.log(prevRow);

    let password = prevRow.find("input.mail-passwords-main").val();
    let confirm = prevRow.find("input:not(.mail-passwords-main)").val();

    row.find("input.mail-passwords-main").val(password);
    row.find("input:not(.mail-passwords-main)").val(confirm);
}

window.mails_passwords = {init, sendForm, copyNext, copyBefore};