const intercom = require("./intercom/intercom_client").connect();
const os = require("os");

function getCpu(previous) {
    let cpus = os.cpus();
    let processCpu = process.cpuUsage(previous);
    
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
    
    let total = user + nice + sys + idle + irq;
    let newPrevious = process.cpuUsage();
    newPrevious.total = total;

    return {current: {total: total - (previous == undefined ? 0 : previous.total), user: Math.floor(processCpu.user/1000), sys: Math.floor(processCpu.system/1000)}, previous: newPrevious};
}

function stats() {
    let previousCpu = getCpu();
    let sendStats = () => {
        previousCpu = getCpu(previousCpu.previous);
        intercom.send("stats", {pid: process.pid, cpu: previousCpu.current, mem: process.memoryUsage()});
    }

    let statsInterval = setInterval(sendStats, parseInt(process.env.STATS_INTERVAL));
}

function pidId(id) {
    let sendPid = () => {
        intercom.send("pid", {pid: process.pid, id});
    }

    sendPid();
    intercom.subscribe(["req_pid"], sendPid);
}


module.exports.stats = stats;
module.exports.pidId = pidId;