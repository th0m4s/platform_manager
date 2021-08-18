const intercom = require("../../../intercom/intercom_client").connect();
const os = require("os");
const cron = require("node-cron");
const exitHook = require("async-exit-hook");
const child_process = require("child_process");
const pfs = require("fs").promises;
const path = require("path");
const dns = require("native-node-dns");
const historyDir = path.resolve(path.dirname(require("../../../platform_logger").LOG_FILE), "processes");
const statsInterval = parseInt(process.env.STATS_INTERVAL);

let hostUsageHistory = []; // this array is reversed, first is latest
let minuteHistory = {}, oldMinuteHistory = {};
let hourHistory = {};

// should be placed in some sort of utils file
function median(values){
    if(values.length == 0) return 0;
  
    values.sort((a, b) => {
        return a-b;
    });
  
    let half = Math.floor(values.length / 2);
    if (values.length % 2 == 0)
        return values[half];
  
    return (values[half-1] + values[half]) / 2;
}

let memSave = ["rss", "heapTotal", "heapUsed"], cpuSave = ["user", "sys"]; // total is not user+system, it's all host cpu usage
function saveMinute() {
    let minute = new Date().getMinutes()-1;
    if(minute < 0) minute = 59;
    for(let id in minuteHistory) {
        let values = minuteHistory[id];
        let minMedMax = [[], []]; // 0 mem   1 cpu

        for(let type of memSave) {
            let typeVal = values.map((x) => x.mem[type]);
            minMedMax[0].push([Math.min(...typeVal), median(typeVal), Math.max(...typeVal)]);
        }

        for(let type of cpuSave) {
            let typeVal = values.map((x) => x.cpu[type] / x.cpu.total);
            minMedMax[1].push([Math.min(...typeVal), median(typeVal), Math.max(...typeVal)]);
        }

        hourHistory[id][minute] = minMedMax;
        oldMinuteHistory[id] = minuteHistory[id].slice();
        minuteHistory[id].length = 0;
    }
}

const usageHistory = parseInt(process.env.USAGE_HISTORY);
async function saveFile() {
    let timestamp = Math.floor(Date.now()/1000);

    let values = {};
    for(let id in hourHistory) {
        let idValues = hourHistory[id];
        let idHistory = [];

        for(let i = 0; i < 60; i++)
            idHistory.push(idValues[i]);

        values[id] = idHistory;
        hourHistory[id] = {};
    }

    try {
        let dirStats = await pfs.stat(historyDir);
        if(!dirStats.isDirectory()) {
            await pfs.unlink(historyDir);
            throw new Error(); // not a directory, delete the file and throw to create the directory inside the catch
        }
    } catch(error) {
        await pfs.mkdir(historyDir);
    }

    await pfs.writeFile(path.resolve(historyDir, "usage_" + timestamp + ".json"), JSON.stringify(values));

    // clear old usage files
    for(let filePath of await pfs.readdir(historyDir)) {
        // maybe replace checks with regex
        if(filePath.startsWith("usage_") && filePath.endsWith(".json")) {
            let fileTime = parseInt(filePath.substring(6).split(".")[0]);
            if(!isNaN(fileTime)) {
                let diff = timestamp - fileTime;
                if(diff > usageHistory) {
                    let fullPath = path.resolve(historyDir, filePath);
                    let stats = await pfs.stat(fullPath);
                    if(stats.isFile())
                        await pfs.unlink(fullPath);
                }
            }
        }
    }
}

// inspired from npm package os-utils (https://github.com/oscmejia/os-utils/blob/master/lib/osutils.js)
function getDiskSpace() {
    return new Promise((resolve, reject) => {
        child_process.exec("df -k", function(error, stdout, stderr) {
            if(error != null) {
                reject({error, message: stderr});
            } else {
                let lines = stdout.split("\n");
                let line = lines[1];
            
                lines = lines.filter((x) => x.trim().endsWith("/"));
                if(lines.length > 0) line = lines[0];  	
            
                let str_disk_info = line.replace( /[\s\n\r]+/g, " ");
                let disk_info = str_disk_info.split(" ");
        
                let total = Math.ceil(disk_info[1] * 1024);
                let used = Math.ceil(disk_info[2] * 1024);
                let free = Math.ceil(disk_info[3] * 1024);
        
                resolve({total, free, used});
            }
        });
    });
}

let currentPIDs = {};
let dnsChallenges = {};
function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            if(message.type == "dashboard") {
                // TODO: why system access not required?
                // maybe to fill the dashboard of all users?

                setup = true;
                socket.join("dashboard_stats");

                socket.emit("setup", {error: false, message: "Socket setup."});
                socket.emit("stats_interval", {interval: statsInterval});

                socket.emit("usage_history", hostUsageHistory);
                socket.emit("system_info", {
                    os: {
                        version: os.version(),
                        platform: os.platform(),
                        release: os.release()
                    },
                    node: {
                        version: process.version,
                        arch: process.arch
                    }
                });

                getDiskSpace().then(({total, used}) => {
                    socket.emit("disk_space", {error: false, total, used});
                }).catch(({message}) => {
                    socket.emit("disk_space", {error: true, message});
                });

                socket.usageType = message.type;
            } else if(socket.hasAccess("SYSTEM")) {
                switch(message.type) {
                    case "processes":
                        setup = true;
                        socket.join("usage_" + message.proc);
                        socket.emit("stats_interval", {interval: statsInterval});

                        setImmediate(() => {
                            for(let entry of Object.entries(currentPIDs)) {
                                let eid = entry[1];
                                if(message.proc == "all" || message.proc == eid) {
                                    socket.emit("pid", {pid: entry[0], id: eid});
                                    socket.emit("usage_history", {id: eid, history: oldMinuteHistory[eid]});
                                }
                            }
                        });
                        break;
                    case "dns_challenges":
                        setup = true;
                        socket.join("dns_challenges");

                        setImmediate(() => {
                            for(let [host, tokens] of Object.entries(dnsChallenges)) {
                                for(let token of tokens) {
                                    socket.emit("dns_challenges_add", {host, token});
                                }
                            }
                        });
                        break;
                    default:
                        socket.emit("setup", {error: true, message: "Unknown system socket type."});
                        break;
                }

                if(setup) {
                    socket.emit("setup", {error: false, message: "Socket setup."});
                    socket.usageType = message.type;
                }
            } else {
                socket.emit("setup", {error: true, message: "Insufficient permissions."});
            }
        });

        socket.on("dns_challenge_cmd", (message) => {
            if(setup && socket.usageType == "dns_challenges") {
                let {command, host, token} = message;
                if(["set", "remove"].includes(command)) intercom.send("dnsChallenges", {command, host, token});
                else if(command == "check") {
                    dns.resolve(message.host, "TXT", "8.8.8.8", (error, results) => {
                        socket.emit("dns_challenges_checked", {error, results: results.map(x => x.join(" ")), uniqueResponseId: message.uniqueResponseId, cid: message.cid});
                    });
                }
            } else {
                socket.emit("dns_challenge_error", {message: "Socket was not set up."});
            }
        });
    });

    intercom.subscribe(["pid"], (message) => {
        let id = message.id;

        currentPIDs[message.pid] = id;
        namespace.to("usage_all").emit("pid", message);
        namespace.to("usage_" + id).emit("pid", message);

        if(minuteHistory[id] == undefined) minuteHistory[id] = [];
        if(oldMinuteHistory[id] == undefined) oldMinuteHistory[id] = [];
        if(hourHistory[id] == undefined) hourHistory[id] = {};
    });

    intercom.send("req_pid", {});
    intercom.subscribe(["stats"], (message) => {
        let id = currentPIDs[message.pid];
        if(id != undefined) {
            message.id = id;
            namespace.to("usage_all").emit("usage", message);
            namespace.to("usage_" + id).emit("usage", message);

            delete message.id;
            delete message.pid;

            oldMinuteHistory[id].push(message);
            minuteHistory[id].push(message);
        }
    });

    intercom.subscribe(["dnsChallenges"], (message) => {
        let {command, host, token} = message;
        switch(command) {
            case "set":
                if(dnsChallenges[host] == undefined) dnsChallenges[host] = [];
                dnsChallenges[host].push(token);

                namespace.to("dns_challenges").emit("dns_challenges_add", {host, token});
                break;
            case "remove":
                if(dnsChallenges[host] != undefined) {
                    let index = dnsChallenges[host].indexOf(token);
                    if(index >= 0) {
                        dnsChallenges[host].splice(index, 1);
                        if(dnsChallenges[host].length == 0) delete dnsChallenges[host];

                        namespace.to("dns_challenges").emit("dns_challenges_remove", {host, token});
                    }
                }
                break;
        }
    });

    cron.schedule("0 * * * *", saveFile);
    cron.schedule("* * * * *", saveMinute);

    let maxHostHistory = 70*1000 / statsInterval, lastCpuFullHost = {total: 0, used: 0};
    setInterval(() => {
        let cpus = os.cpus();
    
        let user = 0;
        let nice = 0;
        let sys = 0;
        let idle = 0;
        let irq = 0;
        
        for(let cpu of cpus){
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            irq += cpu.times.irq;
            idle += cpu.times.idle;
        }

        let used = user + nice + sys + irq;
        let total = used + idle;

        let currentHostCpu = {used: used - lastCpuFullHost.used, total: total - lastCpuFullHost.total};
        lastCpuFullHost = {total, used};

        let freemem = os.freemem(), totalmem = os.totalmem();
        let currentHostMem = {total: totalmem, used: totalmem - freemem};

        let currentUsage = {cpu: currentHostCpu, mem: currentHostMem};

        if(hostUsageHistory.unshift(currentUsage) > maxHostHistory) {
            hostUsageHistory.splice(maxHostHistory);
        }

        namespace.to("dashboard_stats").emit("stats", currentUsage);
    }, statsInterval);

    exitHook(async (callback) => {
        saveMinute();
        await saveFile();
        callback();
    });
}

module.exports.initializeNamespace = initializeNamespace;