const intercom = require("./pmng_server/intercom/intercom_client").connect();
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    while(true) {
        let input = (await new Promise((resolve) => {
            readline.question("Enter the name of the process to restart or .exit to exit: ", resolve);
        })).trim();

        if(input != "") {
            if(input == ".exit") {
                process.exit();
            } else {
                try {
                    let resp = await intercom.sendPromise("subprocesses", {id: input, command: "restart"});
    
                    console.log("SUCCESS:", resp);
                } catch(error) {
                    console.log("FAILED:", error);
                }
            }
        }
    }
})();