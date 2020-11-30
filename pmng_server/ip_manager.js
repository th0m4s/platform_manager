const net = require("net");
const database_server = require("./database_server");

function detectScan(req) {

}

let defaultBanDuration = parseInt(process.env.DEFAULT_IPBAN_DURATION); if(isNaN(defaultBanDuration)) defaultBanDuration = 10800;
function banIP(ip, duration = defaultBanDuration) {
    let type = checkIPType(ip);
    if(type == false) return;

    let now = Math.floor(Date.now()/1000);
    let unbanAt = now + duration;

    blocklist.addAddress(ip, type);
    bansExpirations[ip] = unbanAt;

    return database_server.database("ip_bans").insert({ip, type, banned_at: new Date(), planned_unban_at: new Date(unbanAt*1000)}).then(console.log).catch(console.log);
}

function unbanIP(ip) {
    let type = checkIPType(ip);
    if(type == false) return;

}

let bansExpirations = {}, blocklist = new net.BlockList();
async function refreshBanList() {
    if((await database_server.isInstalled()) != true) return;

    let results = await database_server.database("ip_bans").select("*");
    for(let result of results) console.log(result);
}

function isIPBanned(ip) {
    let type = checkIPType(ip);
    if(type == false) return false;

    return blocklist.check(ip, type);
}

function checkIPType(ip) {
    if(net.isIPv4(ip)) return "ipv4";
    else if(net.isIPv6(ip)) return "ipv6";
    else return false;
}


module.exports.detectScan = detectScan;
module.exports.banIP = banIP;
module.exports.unbanIP = unbanIP;
module.exports.refreshBanList = refreshBanList;
module.exports.loadBans = refreshBanList;
module.exports.isIPBanned = isIPBanned;
