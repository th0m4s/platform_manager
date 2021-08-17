const logger = require("./platform_logger").logger();
const dns = require("native-node-dns"), dns_server = dns.createServer();
const dns_consts = require("native-node-dns-packet").consts;
const regex_utils = require("./regex_utils");
const project_manager = require("./project_manager");
const database_server = require("./database_server");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();
const subprocess_util = require("./subprocess_util");

const getResponse = (question, type) => {
    return dns[type]({
        name: question,
        address: process.env["HOST_" + type],
        ttl: process.env.DNS_TTL,
    });
}

let challenges = {};
let isInstalled = false;
let customHooks = [];

const A_ENABLED = process.env.HOST_A.toLowerCase() != "disabled";
const AAAA_ENABLED = process.env.HOST_AAAA.toLowerCase() != "disabled";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN;
const OTHER_DOMAINS = (process.env.OTHER_DOMAINS?.trim().length > 0 ? process.env.OTHER_DOMAINS.split(",") : null) ?? [];

dns_server.on("request", async function(request, response) {
    let question = request.question[0];
    let requestedName = question.name.toLowerCase();
    let questionType = dns_consts.QTYPE_TO_NAME[question.type];
    
    switch(questionType) {
        case "NS":
            if(requestedName == ROOT_DOMAIN || OTHER_DOMAINS.includes(requestedName) || await regex_utils.testCustom(requestedName) != null) {
                response.answer.push(dns.NS({
                    name: requestedName,
                    data: "ns1." + ROOT_DOMAIN,
                    ttl: 3600
                }));

                response.answer.push(dns.NS({
                    name: requestedName,
                    data: "ns2." + ROOT_DOMAIN,
                    ttl: 3600
                }));
            }
            break;

        case "TXT":
            if(challenges.hasOwnProperty(requestedName)) {
                for(let txtRecord of challenges[requestedName]) {
                    response.answer.push(dns.TXT({
                        name: requestedName,
                        data: [txtRecord],
                        ttl: 300
                    }));
                }
            }

            response.answer.push(dns.TXT({
                name: requestedName,
                data: ["v=spf1" + (A_ENABLED ? " ip4:" + process.env.HOST_A : "") + (AAAA_ENABLED ? " ip6:" + process.env.HOST_AAAA : "") + " ~all"],
                ttl: 900
            }));

            break;

        case "MX":
            response.answer.push(dns.MX({
                name: requestedName,
                ttl: 900,
                exchange: "mail." + ROOT_DOMAIN,
                priority: 10
            }));

            response.answer.push(dns.MX({
                name: requestedName,
                ttl: 86400, // 24*3600 = a day
                exchange: ROOT_DOMAIN,
                priority: 100
            }));

            break;

        case "AAAA":
            if(!AAAA_ENABLED) break;
        case "A":
            if(!A_ENABLED && !AAAA_ENABLED) break;

            if(requestedName == ROOT_DOMAIN || OTHER_DOMAINS.includes(requestedName)) {
                response.answer.push(getResponse(requestedName, questionType));
            } else {
                let modifiedRequested = requestedName;
                for(let domain of OTHER_DOMAINS) {
                    if(modifiedRequested.endsWith(domain)) {
                        modifiedRequested = modifiedRequested.substring(0, modifiedRequested.length - domain.length) + ROOT_DOMAIN;
                        break;
                    }
                }

                let special = regex_utils.testSpecial(modifiedRequested);
                if(special !== null) {
                    if(special.toLowerCase() != "ftp" || questionType == process.env.FTP_HOST_TYPE) response.answer.push(getResponse(requestedName, questionType));
                } else {
                    if(isInstalled !== true) {
                        isInstalled = await database_server.isInstalled();
                    }
        
                    if(isInstalled === true) {
                        let project = regex_utils.testProject(modifiedRequested);
                        if(project != null) {        
                            try {
                                await project_manager.projectExists(project);
                
                                response.answer.push(getResponse(requestedName, questionType));
                            } catch(e) {
                                // doesnot exist
                            }
                        } else if((await regex_utils.testCustom(requestedName)) != null) {
                            response.answer.push(getResponse(requestedName, questionType));
                        }
                    }
                }
            }

            break;
    }

    // custom hooks if required
    // TODO: rewrite challenges with dns hooks
    for(let hook of customHooks) {
        if(hook.enabled && (hook.types.length == 0 || hook.types.includes(questionType))) {
            let newResponses = await Promise.race([
                new Promise((resolve) => {
                    setTimeout(() => resolve(false), 500);
                }),

                intercom.sendPromise(hook.subject, Object.assign({dnsType: questionType, dnsName: requestedName}, hook.message))
            ]);

            if(newResponses !== false) {
                newResponses = newResponses || [];
                for(let resp of newResponses) {
                    response.answer.push(resp);
                }
            } else {
                // too long, disable hook
                hook.enabled = false;
            }
        }
    }

    response.send();
});

/**
 * Starts the DNS server and subscribes to the intercom DNS challenges.
 */
function start() {
    // it should normally be done using subprocess_util, but dns_server is not launched using the special fork
    require("./process_stats").pidId("dns_server");

    dns_server.serve(parseInt(process.env.DNS_PORT), "0.0.0.0", () => {
        logger.info("DNS server started.");
        privileges.drop();
    });

    subscribeIntercom(false);
}

async function subscribeIntercom(isMaster) {
    intercom.subscribe(["dnsChallenges"], (message, respond) => {
        let {command, host, token} = message;
        switch(command) {
            case "set":
                if(challenges[host] == undefined) challenges[host] = [];
                challenges[host].push(token);
                if(isMaster) respond({error: false});
                break;
            case "get":
                if(isMaster) respond({error: false, token: challenges[host]});
                break;
            case "remove":
                if(challenges[host] != undefined) {
                    let index = challenges[host].indexOf(token);
                    if(index >= 0) {
                        challenges[host].splice(index, 1);
                        if(challenges[host].length == 0) delete challenges[host];
                    }
                }
                if(isMaster) respond({error: false});
                break;
        }
    });

    intercom.subscribe(["dnsHooks"], (message) => {
        let {subject, types, message: askMessage} = message;
        if(types == undefined) types = [];
        else if (typeof types == "string") types = [types];

        if(subject != undefined && typeof askMessage == "object") {
            customHooks.push({subject, message: askMessage, types, enabled: true});
        }
    });

    if(isMaster) {
        intercom.subscribe(["dnsChildRequestAll"], (message, respond) => {
            respond({customHooks, challenges});
        });
    } else {
        let resp = await intercom.sendPromise("dnsChildRequestAll", {});
        customHooks = resp.customHooks;
        challenges = resp.challenges;

        logger.info("DNS child received hooks and challenges from master.");
    }

    intercom.send("hookStarted", {hook: "dns"});
}

function master() {
    logger.info("Starting DNS master manager...");
    subscribeIntercom(true);

    logger.info("Forking DNS server...");
    subprocess_util.forkNamed("./pmng_server/dns_server", "dns_server", "local dns_server"); // path is relative to platform_manager.js
}

if(require.main === module) start();
// else we were require'd by the platform_manager to start the master


module.exports.master = master;