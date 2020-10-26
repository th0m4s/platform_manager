const intercom = require("../../../intercom/intercom_client").connect();
const cron = require("node-cron");
const exitHook = require("async-exit-hook");
const pfs = require("fs").promises;
const path = require("path");
const historyDir = path.resolve(path.dirname(require("../../../platform_logger").LOG_FILE), "processes");

let minuteHistory = {};
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

let memSave = ["rss", "heapTotal", "heapUsed"], cpuSave = ["total", "user", "sys"]; // total is not user+system, it's all host cpu usage
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
            let typeVal = values.map((x) => x.cpu[type]);
            minMedMax[1].push([Math.min(...typeVal), median(typeVal), Math.max(...typeVal)]);
        }

        hourHistory[id][minute] = minMedMax;
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
                    filePath = path.resolve(historyDir, filePath);
                    let stats = await pfs.stat(filePath);
                    if(stats.isFile())
                        await pfs.unlink(filePath);
                }
            }
        }
    }
}

let currentPIDs = {};
function initializeNamespace(namespace) {
    namespace.on("connection", (socket) => {
        let setup = false;
        socket.on("setup", (message) => {
            if(setup) {
                socket.emit("setup", {error: true, message: "Socket already setup."});
                return;
            }

            if(socket.hasAccess("SYSTEM")) {
                setup = true;
                socket.join("usage_" + message.proc);
                socket.join("cpu");
                socket.emit("setup", {error: false, message: "Socket setup."});

                for(let entry of Object.entries(currentPIDs))
                    socket.emit("pid", {pid: entry[0], id: entry[1]});
            } else {
                socket.emit("setup", {error: true, message: "Insufficient permissions."});
            }
        });
    });

    intercom.subscribe(["pid"], (message) => {
        let id = message.id;

        currentPIDs[message.pid] = id;
        namespace.to("usage_all").emit("pid", message);
        namespace.to("usage_" + id).emit("pid", message);

        if(minuteHistory[id] == undefined) minuteHistory[id] = [];
        if(hourHistory[id] == undefined) hourHistory[id] = {};
    });

    intercom.send("req_pid", {});
    intercom.subscribe(["stats"], (message) => {
        let id = currentPIDs[message.pid];
        if(id != undefined) {
            message.id = id;
            namespace.to("usage_all").emit("usage", message);
            namespace.to("usage_" + id).emit("usage", message);

            minuteHistory[id].push(message);
        }
    });

    cron.schedule("0 * * * *", saveFile);
    cron.schedule("* * * * *", saveMinute);

    exitHook(async (callback) => {
        saveMinute();
        await saveFile();
        callback();
    });
}

module.exports.initializeNamespace = initializeNamespace;