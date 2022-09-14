import "./css/processes_usage.css";

let chartColors = ["#3B6A9C", "#007BFF", "#86C0FF"];
let socket = undefined, authenticated = false;
let memChart, cpuChart, statsInterval = 1000;
let systemStartedAt = undefined, uptimeIntervalId = -1;

function init() {
    socket = io("/v1/system", {transports: ["websocket"]});
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
                addData({free: parseInt(data.mem.free / data.mem.total * 1000) / 10, available: parseInt(data.mem.available / data.mem.total * 1000) / 10}, parseInt(data.cpu.used / data.cpu.total * 1000) / 10, time);
            }
        });

        socket.on("system_info", (message) => {
            $("#info-os").html(`${message.os.hostname} running ${message.os.platform} ${message.os.release}`);
            $("#info-node-version").html(`${message.node.version} (${message.node.arch})`);

            if(uptimeIntervalId > 0) clearInterval(uptimeIntervalId);
            systemStartedAt = moment().add(-parseInt(message.os.uptime), "seconds");
            let updateUptime = () => $("#info-os-uptime").html("(started " + systemStartedAt.fromNow() + ")");
            updateUptime().attr("title", systemStartedAt.format("LLLL"));
            uptimeIntervalId = setInterval(updateUptime, 1000);
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
                                {label: "Available memory %", data: [], borderColor: chartColors[0], fill: false},
                                {label: "Free memory %", data: [], borderColor: chartColors[1], fill: false}
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
                                {label: "CPU usage %", data: [], borderColor: chartColors[0], fill: false}
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
            addData({free: parseInt(message.mem.free / message.mem.total * 1000) / 10, available: parseInt(message.mem.available / message.mem.total * 1000) / 10}, parseInt(message.cpu.used / message.cpu.total * 1000) / 10);
        });
    });

    socket.on("error", (err) => {
        $.notify({message: "Connection with the socket lost. Please reload the page."}, {type: "danger"});
        console.log("Socket error", err);
    });
}

let lastDrawnX = 0;
function addData({free: freemem, available: availablemem}, cpu, x = -1) {
    $("#info-mem").html(availablemem + "%");
    $("#info-cpu").html(cpu + "%");

    if(x < 0) x = Date.now();
    if(x <= lastDrawnX) return;
    lastDrawnX = x;

    memChart.data.datasets[0].data.push({x, y: availablemem});
    memChart.data.datasets[1].data.push({x, y: freemem});
    memChart.update();

    cpuChart.data.datasets[0].data.push({x, y: cpu});
    cpuChart.update();
}


window.dashboard = {init};