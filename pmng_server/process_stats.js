const intercom = require("./intercom/intercom_client").connect();
const os = require("os");

/**
 * Util function to calculate important cpu stats with *process.cpuUsage()*.
 * @param {NodeJS.CpuUsage} previous The last CpuUsage object returned by *process.cpuUsage()*.
 * @returns {{current: {total: number, user: number, sys: number}, previous: NodeJS.CpuUsage}} Returns both the numeric results in a *current* property and the
 * *NodeJS.CpuUsage* object for a future use in the *previous* (aka will be previous next time) property.
 */
function getCpu(previous) {
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
    
    // total is calculted here because each process can execute this as a different interval (if the main thread is occupied)
    // and percentages need to be accurate. normally, total will always be the same for each process.
    let total = user + nice + sys + idle + irq;
    let newPrevious = process.cpuUsage();
    newPrevious.total = total;

    return {current: {total: total - (previous == undefined ? 0 : previous.total), user: Math.floor((newPrevious.user-(previous?.user??0))/1000), sys: Math.floor((newPrevious.system-(previous?.system??0))/1000)}, previous: newPrevious};
}

/**
 * Starts a stats interval for the given process. This function will periodically send usage and memory stats via the intercom.
 * This should be called automatically by *platform_logger*.
 */
function stats() {
    let previousCpu = getCpu();
    let sendStats = () => {
        previousCpu = getCpu(previousCpu.previous);
        intercom.send("stats", {pid: process.pid, cpu: previousCpu.current, mem: process.memoryUsage()});
    }

    let statsInterval = setInterval(sendStats, parseInt(process.env.STATS_INTERVAL));
}

/**
 * Registers a PID callack (and send the current PID) for a process that doesn't support *subprocess_util*.
 * @param {string} id The process name/id to register.
 */
function pidId(id) {
    let sendPid = () => {
        intercom.send("pid", {pid: process.pid, id});
    }

    sendPid();
    intercom.subscribe(["req_pid"], sendPid);
}


module.exports.stats = stats;
module.exports.pidId = pidId;