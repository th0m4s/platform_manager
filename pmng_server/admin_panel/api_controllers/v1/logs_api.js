const express = require('express'), router = express.Router();
const projects_manager = require("../../../project_manager");
const fs = require("fs"), pfs = fs.promises;
const util = require("util"), pfsRead = util.promisify(fs.read);
const path = require("path");
const api_auth = require("./api_auth");

router.get("/project/:project/previousLogs/:before", function(req, res) {
    api_auth(req, res, function(user) {
        let projectname = req.params.project, before = parseInt(req.params.before);
        if(isNaN(before) || before < 0) {
            res.json({error: true, message: "before parameter is not a valid positive integer."})
        } else {
            projects_manager.canAccessProject(projectname, user.id, false).then(() => {
                let filename = path.resolve(projects_manager.getProjectLogsFolder(projectname), "project.log");
                pfs.open(filename, "r").then((fh) => {
                    let buffer = Buffer.alloc(before);
                    return pfsRead(fh.fd, buffer, 0, before, 0).then((readRes) => {
                        fh.close();
                        return readRes;
                    });
                }).then((readRes) => {
                    let lines = readRes.buffer.toString().split("\n").filter((line) => line.trim().length > 0);
                    res.json({error: false, bytesRead: readRes.bytesRead, lines});
                }).catch((error) => {
                    res.json({error: true, message: "Cannot read logs file: " + error});
                });
            }).catch((response) => {
                res.json(response);
            });
        }
    });
});

router.get("/project/:project/logs", (req, res) => {
    api_auth(req, res, function(user) {
        let projectname = req.params.project;
        projects_manager.canAccessProject(projectname, user.id, false).then(() => {
            let filename = path.resolve(projects_manager.getProjectLogsFolder(projectname), "project.log");
            res.sendFile(filename);
        }).catch((response) => {
            res.sendStatus(response.code || 500);
        });
    });
});

module.exports = router;