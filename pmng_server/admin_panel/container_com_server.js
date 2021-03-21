const express = require("express");
const containerCom = express();
const intercom = require("../intercom/intercom_client").connect();
const pfs = require("fs").promises;

async function start() {
    containerCom.get("/exec/:execId/:pid", (req, res) => {
        let execId = req.params.execId;
        let pid = parseInt(req.params.pid);

        console.log("received", execId, pid);
    
        if(!isNaN(pid)) intercom.send("containerCom", {command: "execPid", execId, pid});
        res.end();
    });

    containerCom.get("/status", (req, res) => {
        res.send("running");
    });
    
    let containerComSocketPath = process.env.CONTAINER_SOCKET_PATH;
    try {
        await pfs.access(containerComSocketPath);
        await pfs.unlink(containerComSocketPath);
    } catch(_) { }

    containerCom.listen(containerComSocketPath, () => {
        console.log("Container socket server started (listening on " + process.env.CONTAINER_SOCKET_PATH + ").");
    });
}

start();

