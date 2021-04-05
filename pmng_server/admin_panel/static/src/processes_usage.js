import './css/processes_usage.css';

let color = Chart.helpers.color;
let chartColors = ["#3B6A9C", "#007BFF", "#86C0FF"];

let socket = undefined, authenticated = false, lastSystemCpu;
function init() {
    socket = io("/v1/system");
    window.socket = socket;

    socket.on("connect", function() {
        authenticated = false;

        console.log("Socket connected.");
        socket.emit("authentication", {key: API_KEY});

        socket.on("authenticated", function() {
            if(authenticated) return;
            authenticated = true;

            console.log("Socket authenticated.");
            socket.emit("setup", {type: "processes", proc: "all"});
        });

        socket.on("unauthorized", function(err) {
            $.notify({message: "Unable to authenticate to the socket. Please reload the page."}, {type: "danger"});
            console.error("Unauthorized from the socket", err);
        });

        socket.on("setup", (message) => {
            if(message.error) {
                $.notify({message: "Unable to setup the socket. Please reload the page."}, {type: "danger"});
                console.error("Socket setup error", message.message);
            } else {
                showCharts();
                $("#toggle-visible-group").show();
            }
        })

        socket.on("usage", (message) => {
            let x = Date.now();

            let memChart = charts.mem[message.id];
            if(memChart != undefined) {
                let mem = message.mem;
                memChart.data.datasets[0].data.push({x, y: mem.rss});
                memChart.data.datasets[1].data.push({x, y: mem.heapTotal});
                memChart.data.datasets[2].data.push({x, y: mem.heapUsed});

                memChart.update({preservation: true});
            }

            let cpuChart = charts.cpu[message.id];
            if(cpuChart != undefined) {
                let cpu = message.cpu; // total is not process total, it's all host usage
                let userPerc = Math.round(cpu.user / cpu.total * 1000)/10;
                let sysPerc = Math.round(cpu.sys / cpu.total * 1000)/10;

                cpuChart.data.datasets[0].data.push({x, y: userPerc + sysPerc});
                cpuChart.data.datasets[1].data.push({x, y: userPerc});
                cpuChart.data.datasets[2].data.push({x, y: sysPerc});

                cpuChart.update({preservation: true});
            }
        });

        socket.on("pid", (message) => {
            $(".pid-" + message.id).html(" (" + message.pid + ")").show();
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});
        console.log("Socket error", err);
    });

    $("#fullscreenGraph-modal").on("hidden.bs.modal", () => {
        restoreExitFullscreen();
    });
}

let charts = {mem: {}, cpu: {}}, chartsShown = false;
function showCharts() {
    let grid = $("#subprocesses-row");
    if(chartsShown) return;
    chartsShown = true;

    for(let [id, subprocess] of Object.entries(window.subprocesses)) {
        if(!window.not_applicable.includes(id)) {
            if(subprocess.check < 2) {
                let canRestart = subprocess.check >= 0;
                grid.append(`<div class="col-xl-4 col-lg-6 col-12 mb-3 chart-panel" id="cell-${id}"><h5 class="subprocess-title" style="display: inline-block;" data-toggle="tooltip" title="${subprocess.text}">${subprocess.name}<span style="display: none;" class="pid-${id}"></span>:</h5>`
                    + `<div class="btn-group btn-group-sm" style="position: absolute; right: 15; top: -4; height: 31px" role="group">` + (canRestart ? `<button class="btn btn-info" data-action="restart" onclick="processes_usage.buttonClicked('${id}')" id="button-${id}"><i class="fas fa-undo-alt"></i></button>` : "")
                    + `<button class="btn btn-secondary" onclick="processes_usage.fullscreen('${id}')"><i class="fas fa-expand-alt"></i></button></div>`
                    + `<div style="width: 100%;" class="row chart-row" id="charts-${id}"><div class="col-12 chart-parent chart-mem"><canvas id="mem-${id}"></canvas></div><div class="col-12 chart-parent chart-cpu" style="display: none;"><canvas id="cpu-${id}"></canvas></div></div></div>`);
                
                charts.mem[id] = new Chart($("#mem-" + id), {
                    type: "line",
                    data: {
                        datasets: [
                            {label: "RSS", data: [], borderColor: chartColors[0], fill: false},
                            {label: "Heap Total", data: [], borderColor: chartColors[1], fill: false},
                            {label: "Heap Used", data: [], borderColor: chartColors[2], fill: false}
                        ]
                    },
                    options: {
                        scales: {
                            xAxes: [{
                                type: "realtime",
                                realtime: {
                                    duration: 60000,
                                    delay: 2000,
                                    pause: false,
                                    ttl: undefined,
                                },
                                ticks: {
                                    display: false
                                }
                            }],
                            yAxes: [{
                                type: "linear",
                                ticks: {
                                    beginAtZero: true,
                                    suggestedMin: 0,
                                    suggestedMax: 1024*1024*10,
                                    callback: (value) => {
                                        if(value < 1) return value;
                                        return window.utils.string.formatBytes(value, 0, true);
                                    }
                                }
                            }]
                        },
                        maintainAspectRatio: false
                    }
                });

                charts.cpu[id] = new Chart($("#cpu-" + id), {
                    type: "line",
                    data: {
                        datasets: [
                            {label: "Process total %", data: [], borderColor: chartColors[0], fill: false},
                            {label: "User %", data: [], borderColor: chartColors[1], fill: false},
                            {label: "System %", data: [], borderColor: chartColors[2], fill: false}
                        ]
                    },
                    options: {
                        scales: {
                            xAxes: [{
                                type: "realtime",
                                realtime: {
                                    duration: 60000,
                                    delay: 2000,
                                    pause: false,
                                    ttl: undefined,
                                },
                                ticks: {
                                    display: false
                                }
                            }],
                            yAxes: [{
                                type: "linear",
                                ticks: {
                                    beginAtZero: true,
                                    suggestedMin: 0,
                                    suggestedMax: 2,
                                    callback: (value) => {
                                        return value + "%";
                                    }
                                }
                            }]
                        },
                        maintainAspectRatio: false
                    }
                });
            }
        }
    }

    grid.show();
    $("#subprocesses-status").hide();

    // recall tooltip because new ones were added
    $('.subprocess-title[data-toggle="tooltip"]').tooltip({
        html: true,
        placement: "bottom",
        template: "<div class='tooltip subprocess-tooltip' role='tooltip'><div class='arrow'></div><div class='tooltip-inner'></div></div>"
    });
}

let visible = {mem: true, cpu: false};
function toggleVisible(type) {
    let button = $("#toggle-visible-" + type);
    visible[type] = !visible[type];

    $(".toggle-visible").blur();

    if(visible[type]) button.addClass("active");
    else button.removeClass("active");

    let visibleCount = (visible.mem ? 1 : 0) + (visible.cpu ? 1 : 0);
    if(visibleCount == 0) {
        visible[type == "mem" ? "cpu" : "mem"] = true;
        $("#toggle-visible-" + (type == "mem" ? "cpu" : "mem")).addClass("active");
    }

    if(visible.mem) $(".chart-mem").show();
    else $(".chart-mem").hide();

    if(visible.cpu) $(".chart-cpu").show();
    else $(".chart-cpu").hide();

    if(visibleCount <= 1) { // can be 0, but in reality will be 1
        $(".chart-parent").removeClass("col-lg-6").addClass("col-12");
        $(".chart-panel").addClass("col-xl-4 col-lg-6 col-12").removeClass("col-xl-6");
    } else {
        $(".chart-parent").removeClass("col-12").addClass("col-lg-6");
        $(".chart-panel").removeClass("col-xl-4 col-lg-6 col-12").addClass("col-xl-6");
    }
}

let lastSubprocessId = undefined;
function restartSubprocess(id) {
    let subprocess = window.subprocesses[id];
    lastSubprocessId = id;

    $("#restartModal-content").html("Do you want to restart the <i>" + subprocess.name + "</i> subprocess?");
    $("#restartModal").modal();
}

function buttonClicked(id) {
    let action = $("#button-" + id).attr("data-action");
    if(action == "restart") restartSubprocess(id);
    else if(action == "check") checkSubprocess(id, 0);
    else if(action == "start") {
        lastSubprocessId = id;
        confirmRestart(false);
    }
}

function restoreExitFullscreen() {
    if(lastFullscreenId != undefined) {
        $("#charts-" + lastFullscreenId).appendTo("#cell-" + lastFullscreenId);
        lastFullscreenId = undefined;
    }
}

let lastFullscreenId = undefined;
function fullscreen(id) {
    restoreExitFullscreen();
    lastFullscreenId = id;

    $("#charts-" + id).appendTo("#fullscreenGraph-parent");

    let pidClass = "pid-" + id;
    $("#fullscreenGraph-title").html(subprocesses[id].name + "<span class='" + pidClass + "'>" + $("." + pidClass).html() + "</span>");

    $("#fullscreenGraph-modal").modal();
}

function checkSubprocess(id, delay = 0) {
    let button = $("#button-" + id);
    button.attr("disabled", "disabled").removeClass("btn-info").removeClass("btn-warning").addClass("btn-secondary").html("<i class='fas fa-sync fa-spin'></i>");

    setTimeout(() => {
        $.getJSON("/api/v1/processes/check/" + id).fail((xhr, status, error) => {
            setButtonAction(id, false);
        }).done((response) => {
            if(response.error) {
                setButtonAction(id, false);
            } else {
                if(response.running) {
                    setButtonAction(id, true);
                } else {
                    $("#button-" + id).removeClass("btn-info").removeClass("btn-secondary").addClass("btn-warning").attr("data-action", "start").html("<i class='fas fa-play'></i>").removeAttr("disabled");
                }
            }
        });
    }, delay);
}

function setButtonAction(id, restart) {
    let button = $("#button-" + id);
    button.removeAttr("disabled");
    if(restart) {
        button.removeClass("btn-warning").addClass("btn-info").removeClass("btn-secondary").html("<i class='fas fa-undo-alt'></i>").attr("data-action", "restart");
    } else {
        button.removeClass("btn-warning").removeClass("btn-info").addClass("btn-secondary").html("Check").attr("data-action", "check");
    }
}

function confirmRestart(restart = true) {
    let subprocess = window.subprocesses[lastSubprocessId];
    let needCheck = subprocess.check > 0;
    
    $("#restartModal").modal("hide");
    utils.showInfiniteLoading((restart ? "Restarting" : "Starting") + " subprocess...");

    $.getJSON("/api/v1/processes/restart/" + lastSubprocessId).fail((xhr, status, error) => {
        if(needCheck) {
            $.notify({message: `A server error occured during the restart procedure. Open the console for details.`}, {type: "danger"});
            console.warn(error);
        }
    }).done((response) => {
        if(response.error) {
            $.notify({message: `An application occured during the restart procedure. Open the console for details.`}, {type: "danger"});
            console.warn(response.error);
        } else {
            $.notify({message: "Restart signal sent."}, {type: "info"});
        }
    }).always(() => {
        utils.hideLoading();
        checkSubprocess(lastSubprocessId, needCheck ? 1500 : 7000);
    });
}


window.processes_usage = {init, buttonClicked, confirmRestart, toggleVisible, fullscreen};