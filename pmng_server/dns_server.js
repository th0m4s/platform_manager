const logger = require("./platform_logger").logger();
const dns = require("native-dns"), dns_server = dns.createServer();
const regex_utils = require("./regex_utils");
const project_manager = require("./project_manager");
const database_server = require("./database_server");
const privileges = require("./privileges");
const intercom = require("./intercom/intercom_client").connect();

const getResponse = (question) => {
    return dns.A({
        name: question,
        address: process.env.SERVER_HOST,
        ttl: process.env.DNS_TTL,
    });
}

let challenges = {};
let isInstalled = false;

dns_server.on("request", async function(request, response) {
    let question = request.question[0].name.toLowerCase();
    
    if(challenges.hasOwnProperty(question)) {
        response.answer.push(dns.TXT({
            name: question,
            address: challenges[question],
            ttl: 300
        }));
    } else {
        if(regex_utils.testSpecial(question) !== null) {
            response.answer.push(getResponse(question));
        } else {
            if(isInstalled !== true) {
                isInstalled = await database_server.isInstalled();
            }

            if(isInstalled === true) {
                let project = regex_utils.testProject(question);
                if(project != null) {        
                    try {
                        await project_manager.projectExists(project);
        
                        response.answer.push(getResponse(question));
                    } catch(e) {
                        // doesnot exist
                    }
                } else if((await regex_utils.testCustom(question)) != null) {
                    response.answer.push(getResponse(question));
                }
            }
        }
    }

    response.send();
});

function start() {
    dns_server.serve(parseInt(process.env.DNS_PORT), "0.0.0.0", () => {
        logger.info("DNS server started.");
        privileges.drop();
    });
}

start();