#!/usr/bin/env node
// executed by root cron task
const pfs = require("fs").promises;
const dns = require("dns"), ip6addr = require("ip6addr");
const child_process = require("child_process");
const getJSON = require("bent")("json");
const net = require("net");

const PID_FILE="/var/run/pmng.pid";
const PMNG_DIR="/etc/pmng";

process.chdir(PMNG_DIR);
require("dotenv").config();

function restartProject() {
    child_process.execSync("/usr/sbin/service pmng restart");
    console.log("Restart command sent.\n");
}

async function performCheck() {
    console.log(">>>> Performing check on " + new Date().toString() + ":");
    try {
        let pid = parseInt(await pfs.readFile(PID_FILE));
        console.log("Read PID file: " + pid);

        if(process.kill(pid, 0)) {
            console.log("A program is running with this PID.");

            try {
                let ipv4 = process.env.HOST_A, ipv6 = process.env.HOST_AAAA;
                if(ipv4.toLowerCase() != "disabled") {
                    let ipv4resp = await new Promise((resolve) => {
                        dns.resolve(process.env.ROOT_DOMAIN, "A", (error, result) => {
                            if(error != null) {
                                resolve({error: error, status: false});
                            } else if(ip6addr.compare(result[0], ipv4) == 0) {
                                resolve({error: null, status: true});
                            } else {
                                resolve({error: null, status: false});
                            }
                        });
                    });

                    if(ipv4resp.error != null) {
                        console.error("IPv4 test check failed: " + ipv4resp.error);
                        return restartProject();
                    } else if(!ipv4resp.status) {
                        console.error("IPv4 test check failed: Incorrect resolved IP.");
                        return restartProject();
                    } else {
                        console.log("IPv4 test passed.");
                    }
                } else {
                    console.log("Don't have to check IPv4.");
                }

                if(ipv6.toLowerCase() != "disabled") {
                    let ipv6resp = await new Promise((resolve) => {
                        dns.resolve(process.env.ROOT_DOMAIN, "AAAA", (error, result) => {
                            if(error != null) {
                                resolve({error: error, status: false});
                            } else if(ip6addr.compare(result[0], ipv6) == 0) {
                                resolve({error: null, status: true});
                            } else {
                                resolve({error: null, status: false});
                            }
                        });
                    });

                    if(ipv6resp.error != null) {
                        console.error("IPv6 test check failed: " + ipv6resp.error);
                        return restartProject();
                    } else if(!ipv6resp.status) {
                        console.error("IPv6 test check failed: Incorrect resolved IP.");
                        return restartProject();
                    } else {
                        console.log("IPv6 test passed.");
                    }
                } else {
                    console.log("Don't have to check IPv6.");
                }

                console.log("Checking admin panel (port and redirection)...");
                try {
                    let response = await getJSON("http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s": "") + "://admin." + process.env.ROOT_DOMAIN + "/check");
                    if(response.server != "adminpanel") {
                        console.error("Wrong response from admin panel: " + JSON.stringify(response));
                        return restartProject();
                    } else {
                        console.log("Panel, ports and redirections are working.");
                    }
                } catch(error) {
                    console.error("Cannot connect to the admin panel.");
                    return restartProject();
                }

                console.log("Checking intercom server...");
                let intercomConn = net.createConnection(8043);
                try {
                    await new Promise((resolve, reject) => {
                        intercomConn.on("error", (error) => {
                            if(error.code == "ECONNREFUSED") {
                                reject("Cannot connect to intercom server.");
                            } else reject("Unknown error while trying to connect to intercom: " + error.code);
                        });

                        intercomConn.on("data", (buffer) => {
                            try {
                                let message = buffer.toString();
                                if(message.startsWith("stat:")) {
                                    message = JSON.parse(message.substring(5));
                                    if(message.msg != "welcome") {
                                        reject("Incorrect message received from intercom: " + JSON.stringify(message));
                                    } else {
                                        console.log("Intercom working: up and running.");
                                        resolve();
                                    }
                                } else {
                                    reject("Incorrect data received from intercom: " + message);
                                }
                            } catch(error) {
                                reject("Could not check intercom server: " + error);l
                            }
                        });

                        setTimeout(() => {
                            if(!intercomConn.destroyed) reject("Intercom connection timedout.");
                        }, 3000);
                    });
                } catch(error) {
                    intercomConn.destroy();

                    console.error(error);
                    return restartProject();
                }

                intercomConn.destroy();
            } catch(error) {
                console.error("Unexpected error during health check: " + error);
                return;
            }

        } else {
            console.error("No program is running with this PID. Restarting project...");
            return restartProject();
        }
    } catch(error) {
        console.log("Cannot read PID file. Program must not be running (and was previously successfully stopped).");
        return;
    }

    console.log("All tests passed succesfully. Bye!\n");
}

if(process.getuid() != 0) {
    console.error("You must be root to run the health check (cannot check pid file without these privileges).\n");
} else {
    performCheck();
}
