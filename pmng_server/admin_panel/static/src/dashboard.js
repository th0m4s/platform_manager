import "./css/processes_usage.css";

let chartColor = "#3B6A9C";
let socket = undefined, authenticated = false;
let memChart, cpuChart, statsInterval = 1000;

function init() {
    socket = io("/v1/system");
    window.socket = socket;

    socket.on("connect", function() {
        utils.enableSocketPause();
        authenticated = false;

        console.log("Socket connected.");
        socket.emit("authentication", {key: API_KEY});

        socket.on("authenticated", function() {
            if(authenticated) return;
            authenticated = true;

            console.log("Socket authenticated.");
            socket.emit("setup", {type: "dashboard"});
        });

        socket.on("unauthorized", function(err) {
            $.notify({message: "Unable to authenticate to the socket. Please reload the page."}, {type: "danger"});
            console.error("Unauthorized from the socket", err);
        });

        socket.on("stats_interval", (message) => {
            statsInterval = message.interval;
        });

        socket.on("usage_history", (history) => {
            let time = Date.now() - statsInterval * history.length;

            for(let data of history.reverse()) {
                time += statsInterval;
                addData(parseInt(data.mem.used / data.mem.total * 1000) / 10, parseInt(data.cpu.used / data.cpu.total * 1000) / 10, time);
            }
        });

        socket.on("system_info", (message) => {
            $("#info-os").html(`${message.os.version} on ${message.os.platform} ${message.os.release}`);
            $("#info-node-version").html(`${message.node.version} (${message.node.arch})`);
        });

        socket.on("disk_space", (message) => {
            if(message.error) {
                $("#info-disk-bar").parent().hide();
                $("#info-disk").html("Cannot read disk space!");

                console.error(message.error, message.message);
            } else {
                let perc = parseInt(message.used / message.total * 1000) / 10;
                $("#info-disk-bar").css("width", perc + "%").parent().show();
                $("#info-disk").html(`${window.utils.string.formatBytes(message.used)}/${window.utils.string.formatBytes(message.total)} (${perc}%)`);
            }
        });

        socket.on("setup", (message) => {
            if(message.error) {
                $.notify({message: "Unable to setup the socket. Please reload the page."}, {type: "danger"});
                console.error("Socket setup error", message.message);
            } else {
                $("#graphs-status").hide();

                if(memChart == undefined) {
                    memChart = new Chart($("#mem-chart"), {
                        type: "line",
                        data: {
                            datasets: [
                                {label: "Memory usage %", data: [], borderColor: chartColor, fill: false}
                            ]
                        },
                        options: {
                            legend: {
                                display: false
                            },
                            scales: {
                                xAxes: [{
                                    type: "realtime",
                                    realtime: {
                                        duration: 60000,
                                        delay: 3000,
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
                                        suggestedMax: 100,
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

                if(cpuChart == undefined) {
                    cpuChart = new Chart($("#cpu-chart"), {
                        type: "line",
                        data: {
                            datasets: [
                                {label: "CPU usage %", data: [], borderColor: chartColor, fill: false}
                            ]
                        },
                        options: {
                            legend: {
                                display: false
                            },
                            scales: {
                                xAxes: [{
                                    type: "realtime",
                                    realtime: {
                                        duration: 60000,
                                        delay: 3000,
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
                                        suggestedMax: 100,
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
        });

        socket.on("stats", (message) => {
            addData(parseInt(message.mem.used / message.mem.total * 1000) / 10, parseInt(message.cpu.used / message.cpu.total * 1000) / 10);
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});
        console.log("Socket error", err);
    });
}

let lastDrawnX = 0;
function addData(mem, cpu, x = -1) {
    $("#info-mem").html(mem + "%");
    $("#info-cpu").html(cpu + "%");

    if(x < 0) x = Date.now();
    if(x <= lastDrawnX) return;
    lastDrawnX = x;

    memChart.data.datasets[0].data.push({x, y: mem});
    memChart.update();

    cpuChart.data.datasets[0].data.push({x, y: cpu});
    cpuChart.update();
}


window.dashboard = {init};