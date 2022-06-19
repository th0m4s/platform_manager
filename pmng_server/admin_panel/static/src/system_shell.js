const {FitAddon} = require("xterm-addon-fit");
const {WebglAddon} = require("xterm-addon-webgl");
const currify = require("currify"), wrap = require("wraptile");

import "./css/project_exec.css";

const Terminal = window.xterm.Terminal;
const defaultFontFamily = "Menlo, Consolas, \"Liberation Mono\", Monaco, \"Lucida Console\", monospace";

let socket = undefined;

function _onDisconnect(terminal) {
    terminal.writeln("terminal disconnected...");
}

function _onData(terminal, data) {
    terminal.write(data);
}

function _onTermResize(socket, {cols, rows}) {
    socket.emit("resize", {cols, rows});
}

function _onTermData(socket, data) {
    socket.emit("data", data);
}

function _onWindowResize(fitAddon) {
    try {
        fitAddon.fit.bind(fitAddon)();
    } catch(_) { }
}

const onDisconnect = wrap(_onDisconnect);
const onData = currify(_onData);
const onTermResize = currify(_onTermResize);
const onTermData = currify(_onTermData);
const onWindowResize = wrap(_onWindowResize);

function createTerminal() {
    let terminalContainer = $("#project_exec-console").get(0)

    let fitAddon = new FitAddon();
    let webglAddon = new WebglAddon();
    let terminal = new Terminal({
        scrollback: 1000,
        tabStopWidth: 4,
        defaultFontFamily,
    });
    
    terminal.open(terminalContainer);
    terminal.focus();
    
    terminal.loadAddon(webglAddon);
    terminal.loadAddon(fitAddon);
    fitAddon.fit();
    
    terminal.onResize(onTermResize(socket));
    terminal.onData(onTermData(socket));
    
    window.addEventListener("resize", onWindowResize(fitAddon));
    
    let {cols, rows} = terminal;
    socket.emit("terminal", {cols, rows, execType: "system_shell"});
    fitAddon.fit();
    
    socket.on("disconnect", onDisconnect(terminal));
    socket.on("data", onData(terminal));
    
    return {
        socket,
        terminal,
    };
}

function requestTerminal() {
    $("#requestModal").modal({
        backdrop: "static",
        keyboard: false
    });

    socket.emit("request_terminal", {execType: "system_shell"});
}

function init() {
    socket = io("/v1/exec", {reconnection: false});

    socket.on("connect", function(){
        console.log("Socket connected.")
        socket.emit("authentication", {key: API_KEY});

        socket.on("authenticated", function() {
            console.log("Socket authenticated.");
            requestTerminal();
        });

        socket.on("unauthorized", function(err) {
            $.notify({message: "Unable to authenticate to the socket. Please reload the page."}, {type: "danger"});
            console.error("Unauthorized from the socket", err);
        });

        socket.on("terminal_error", (message) => {
            $.notify({message: "Terminal error: " + message.message}, {type: "danger", z_index: 9999});
            console.error("Terminal error:", message.message);
        });

        socket.on("too_many_invalid_tries", () => {
            $("#requestModal").modal("hide");
            $.notify({message: "Too many invalid tries. Please reload the page."}, {type: "danger"});
        });

        socket.on("request_denied", () => {
            $("#requestModal").modal("hide");
            $.notify({message: "Request denied. Please reload the page."}, {type: "danger"});
        });

        socket.on("system_timeout", () => {
            $("#requestModal").modal("hide");
            $.notify({message: "Ran out of allowed time. Please reload the page."}, {type: "danger"});
        })

        socket.on("correct_system_code", () => {
            $("#requestModal").modal("hide");
            createTerminal();
        });

        socket.on("exit", () => {
            $("#closedModal").modal({
                backdrop: "static",
                keyboard: false
            });
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});
        console.log("Socket error", err);
    });
}

function confirm_code() {
    socket.emit("check_code", {code: $("#access_code").val()});
}

function cancel() {
    socket.emit("cancel_shell_request", {});
}

window.system_shell = {init, confirm_code, cancel};
