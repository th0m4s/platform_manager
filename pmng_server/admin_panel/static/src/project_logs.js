let socket = undefined, startByte = 0, hasFirstMessage = false, previousLoaded = false;

let previousButton = $("#previous-logs-btn");
function setPreviousButtonState(loading, enabled = false) {
    if(loading) {
        previousButton.attr("disabled", "disabled").html("<i class='fas fa-sync fa-spin'></i> Loading...");
    } else {   
        previousButton.html(`<i class="fas fa-backward"></i> Load previous logs`);
        if(enabled)
            previousButton.removeAttr("disabled");
        else previousButton.attr("disabled", "disabled");
    }
}

function loadPreviousLogs() {
    setPreviousButtonState(true);
    $.getJSON("/api/v1/logs/project/" + window.projectname + "/previousLogs/" + startByte).fail((xhr, status, error) => {
        setPreviousButtonState(false, true);
    }).done((response) => {
        setPreviousButtonState(false, response.error);
        if(response.error) {

        } else {
            if(response.lines.length == 0) {
                $("#logs-samp").html("No previous logs found. New logs will automatically be displayed here.");
            } else {
                if(!hasFirstMessage) $("#logs-samp").html("");

                let text = "<span style='color: #aaa;'>";
                for(let line of response.lines) {
                    text += line + "\n";
                }

                $("#logs-samp").prepend(text + "</span>");
                hasFirstMessage = true;
            }
        }
    });
}

function init() {
    socket = io("/v1/logs");

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});
        let display = $("#logs-samp");
        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            socket.emit("project_logs", {project: window.projectname});
            display.html("This panel will automatically updates when logs are received. Use the above button to load previous logs.");
        });
        socket.on("unauthorized", function(err) {
            $.notify({message: "Unable to authenticate to the socket. Please reload the page."}, {type: "danger"});
            console.error("Unauthorized from the socket", err);
        });

        socket.on("logs_start_position", (message) => {
            startByte = message.position;
            console.log("Start reading from byte " + startByte);
            setPreviousButtonState(false, true);
        });

        socket.on("project_log", (message) => {
            if(!hasFirstMessage) {
                hasFirstMessage = true;
                display.html("");
            }
            display.append(message.line + "\n");
        });

        socket.on("log_error", (message) => {
            $.notify({message: "Log reading error. Please reload the page (open console for details)."}, {type: "danger"});
            console.error("Log error:", message.error);
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});
        console.log("Socket error", err);
    });
}


window.project_logs = {init, loadPreviousLogs};