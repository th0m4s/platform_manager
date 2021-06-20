const database_server = require("../database_server");
const path = require("path");
const express = require("express");
const privileges = require("../privileges");
const pfs = require("fs").promises;
const logger = require("../platform_logger").logger();
const rootCom = express(), userCom = express();

async function listenRootCom() {
    let comSocketFile = path.resolve(process.env.CONTAINERUTILS_MOUNT_PATH, "container_com.sock");

    try {
        await pfs.access(comSocketFile);
        await pfs.unlink(comSocketFile);
    } catch(_) { }

    let resolve = null;
    let listenResult = new Promise((_resolve) => {
        resolve = _resolve;
    });

    logger.info("Starting root container com server...");
    rootCom.listen(comSocketFile, () => {
        logger.info("Root container com server started.");
        resolve();
    });

    await listenResult;

    return {prepareRoutes: (exec_socket) => {
        rootCom.get("/exec/:execId/:pid", (req, res) => {
            let execId = req.params.execId;
            let pid = parseInt(req.params.pid);
        
            if(!isNaN(pid)) exec_socket.pidReceived(execId, pid);
            res.end();
        });
    }};
}

async function listenUserCom() {
    let comSocketFile = path.resolve(process.env.CONTAINERUTILS_MOUNT_PATH, "user_container_com.sock");

    try {
        await pfs.access(comSocketFile);
        await pfs.unlink(comSocketFile);
    } catch(_) { }

    let resolve = null;
    let listenResult = new Promise((_resolve) => {
        resolve = _resolve;
    });

    logger.info("Starting user container com server...");
    userCom.listen(comSocketFile, () => {
        logger.info("User container com server started.");
        resolve();
    });

    await listenResult;

    return {prepareRoutes: () => {
        userCom.get("/customConf/:key/:variable", async (req, res) => {
            let {key, variable} = req.params;
    
            if(key.length != 16) {
                res.status(403).json({error: true, code: 403, message: "Invalid key!"});
            } else {
                try {
                    let dbResponse = await database_server.getCustomConfFromKey(key, variable);
                    if(dbResponse === null) {
                        res.status(403).json({error: true, code: 403, message: "Invalid key!"});
                    } else if(dbResponse === undefined) {
                        res.status(404).json({error: true, code: 404, message: "Undefined variable."});
                    } else {
                        res.json({error: false, code: 200, value: dbResponse});
                    }
                } catch(error) {
                    res.status(500).json({error: true, code: 500, message: "Server error: " + error});
                }
            }
        });
    }, dropPrivileges: async () => {
        await pfs.chown(comSocketFile, ...privileges.droppingOptions(false));
    }};
}


module.exports.listenRootCom = listenRootCom;
module.exports.listenUserCom = listenUserCom;