let socket = undefined, startByte = 0, hasFirstMessage = false, previousLoaded = false;

let previousButton = $("#previous-logs-btn");
function setPreviousButtonState(loading, enabled = false) {
    if(loading) {
        previousButton.attr("disabled", "disabled").html("<i class='fas fa-sync fa-spin'></i> Loading...");
    } else {   
        if(enabled)
            previousButton.removeAttr("disabled").html(`<i class="fas fa-backward"></i> Load previous logs`);
        else previousButton.attr("disabled", "disabled").html("Previous logs loaded");
    }
}

function loadPreviousLogs() {
    setPreviousButtonState(true);
    $.getJSON("/api/v1/logs/project/" + window.projectname + "/previousLogs/" + startByte).fail((xhr, status, error) => {
        setPreviousButtonState(false, true);
        $.notify({message: "Server error while reading logs: " + error}, {type: "danger"});
        console.error(status, error);
    }).done((response) => {
        setPreviousButtonState(false, response.error);
        if(response.error) {
            $.notify({message: "Application error while reading logs: " + response.message}, {type: "danger"});
            console.error(response.message);
        } else {
            if(response.lines.length == 0) {
                $("#logs-samp").html("No previous logs found. New logs will automatically be displayed here.");
            } else {
                if(!hasFirstMessage) $("#logs-samp").html("");

                let lines = response.lines;
                let text = "";
                for(let i = 0; i < lines.length; i++) {
                    text += getLineHtml(lines[i], "previous-log-line");
                }

                $("#logs-samp").prepend(text);
                hasFirstMessage = true;
            }
        }
    });
}

function getLineHtml(line, customClass = "") {
    let type = line.substr(31, 3);
    return `<span class="log-line${customClass == "" ? "" : " " + customClass} log-${type.toLowerCase()}">${line}</span>\n`;
}

function init() {
    socket = io("/v1/logs", {transports: ["websocket"]});

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
            display.append(getLineHtml(message.line));
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

function setDownloadButtonState(loading) {
    if(loading)
        $("#download-logs-btn").attr("disabled", "disabled").html(`<i class="fas fa-sync fa-spin"></i> Downloading...`);
    else $("#download-logs-btn").removeAttr("disabled").html(`<i class="fas fa-file-download"></i> Download current logs`);
}

function downloadAllLogs() {
    setDownloadButtonState(true);
    $.get("/api/v1/logs/project/" + window.projectname + "/logs").fail((xhr, status, error) => {
        $.notify({message: "Cannot download logs, please use the PMNG CLI: " + error}, {type: "danger"});
        console.error(status, error);
    }).done((response) => {
        download(response, window.projectname + "_" + Math.floor(Date.now()/1000) + ".log", "text/plain");
        $.notify({message: "File log successfully downloaded."}, {type: "success"});
    }).always(() => {
        setDownloadButtonState(false);
    });
}


window.project_logs = {init, loadPreviousLogs, downloadAllLogs};