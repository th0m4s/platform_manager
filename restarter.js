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
                    console.log(resp);

                    await new Promise((resolve) => {
                        setTimeout(resolve, 1000);
                    });

                    let checkResp = await intercom.sendPromise("subprocesses", {id: input, command: "check"});
                    if(checkResp.running) {
                        console.log("SUCCESS: Process restarted and running (checked via isRunning).");
                    } else throw "Process restarted but not found running.";
                } catch(error) {
                    console.log("FAILED:", error);
                }
            }
        }
    }
})();