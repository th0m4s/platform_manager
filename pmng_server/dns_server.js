const logger = require("./platform_logger").logger();
const dns = require("native-dns"), dns_server = dns.createServer();
const dns_consts = require('native-dns-packet').consts;
const regex_utils = require("./regex_utils");
const project_manager = require("./project_manager");
const database_server = require("./database_server");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();

const getResponse = (question, type) => {
    return dns[type]({
        name: question,
        address: process.env["HOST_" + type],
        ttl: process.env.DNS_TTL,
    });
}

let challenges = {};
let isInstalled = false;

const A_ENABLED = process.env.HOST_A.toLowerCase() != "disabled";
const AAAA_ENABLED = process.env.HOST_AAAA.toLowerCase() != "disabled";

dns_server.on("request", async function(request, response) {
    let question = request.question[0];
    let requestedName = question.name.toLowerCase();
    let questionType = dns_consts.QTYPE_TO_NAME[question.type];
    
    switch(questionType) {
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

            break;

        case "AAAA":
            if(!AAAA_ENABLED) break;
        case "A":
            if(!A_ENABLED && !AAAA_ENABLED) break;

            let special = regex_utils.testSpecial(requestedName);
            if(special !== null) {
                if(special.toLowerCase() != "ftp" || questionType == process.env.FTP_HOST_TYPE) response.answer.push(getResponse(requestedName, questionType));
            } else {
                if(isInstalled !== true) {
                    isInstalled = await database_server.isInstalled();
                }
    
                if(isInstalled === true) {
                    let project = regex_utils.testProject(requestedName);
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

            break;
    }

    response.send();
});

function start() {
    dns_server.serve(parseInt(process.env.DNS_PORT), "0.0.0.0", () => {
        logger.info("DNS server started.");
        privileges.drop();
    });

    intercom.subscribe(["dnsChallenges"], (message, id) => {
        let command = message.command, host = message.host, token = message.token;
        switch(command) {
            case "set":
                if(challenges[host] == undefined) challenges[host] = [];
                challenges[host].push(token);
                intercom.respond(id, {error: false});
                break;
            case "get":
                intercom.respond(id, {error: false, token: challenges[host]});
                break;
            case "remove":
                if(challenges[host] != undefined) {
                    challenges[host].splice(challenges[host].indexOf(token), 1);
                    if(challenges[host].length == 0) delete challenges[host];
                }
                intercom.respond(id, {error: false});
                break;
        }
    });
}

start();