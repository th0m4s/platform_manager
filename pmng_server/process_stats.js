let intercom = require("./intercom/intercom_client").connect();;

function stats() {
    let previousCpu = undefined;
    let sendStats = () => {
        previousCpu = process.cpuUsage(previousCpu);
        intercom.send("stats", {pid: process.pid, cpu: {u: previousCpu.user, s: previousCpu.s}, mem: process.memoryUsage()});
    }

    let statsInterval = setInterval(sendStats, parseInt(process.env.STATS_INTERVAL));
}

function pidId(id, callStats = false) {
    let sendPid = () => {
        intercom.send("pid", {pid: process.pid, id});
    }

    sendPid();
    intercom.subscribe(["req_pid"], sendPid);

    if(callStats) stats();
}


module.exports.stats = stats;
module.exports.pidId = pidId;