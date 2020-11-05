const express = require('express'), router = express.Router();
const originalBodyParser = require("body-parser");
const bodyParser = require("../../body_parser");
const rgit_manager = require("../../../remote_git/remote_git_manager");
const project_manager = require("../../../project_manager");
const api_auth = require("./api_auth");

router.post("/:remote/webhooks/push/:project_name", originalBodyParser.text({type: "application/json"}), (req, res) => {
    res.send("hi!");
});

router.get("/:remote/listRepositories", (req, res) => {
    api_auth(req, res, async function(user) {
        let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
        if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
        else try { res.status(200).json({error: false, repositories: await remote.listRepositories(user.id)}); }
        catch(error) { res.status(500).json({error: true, message: "Cannot list repositories.", details: error.toString()}); }
    });
});

router.get("/:remote/listBranches/*", (req, res) => {
    api_auth(req, res, async function(user) {
        let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
        if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
        else try { res.status(200).json({error: false, branches: await remote.listBranches(user.id, req.params[0])}); }
        catch(error) { res.status(500).json({error: true, message: "Cannot list branches.", details: error.toString()}); }
    });
});

router.post("/:remote/addIntegration", bodyParser(), (req, res) => {
    api_auth(req, res, async function(user) {
        let projectname = req.body.projectname || "", repo_id = (req.body.repo_id || "").toString(), branch = req.body.branch || "";
        if(projectname.length > 0 && repo_id.length > 0 && branch.length > 0) {
            return project_manager.getProject(projectname).then(async (project) => {
                if(project.ownerid != user.id) throw "Insufficient permissions.";
                let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
                if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
                else try {
                    await remote.prepareIntegration(projectname, user.id, repo_id, branch);
                    res.status(200).json({error: false, message: "Integration added."});
                } catch(error) { res.status(500).json({error: true, message: "Cannot add integration.", details: error.toString()}); }
            });
        } else res.status(401).json({error: true, code: 401, message: "Invalid request.", details: "Missing or empty parameter(s)."});
    });
});

router.get("/:remote/removeIntegration/:projectname", (req, res) => {
    api_auth(req, res, async function(user) {
        let projectname = req.params.projectname.trim();
        return project_manager.getProject(projectname).then(async (project) => {
            if(project.ownerid != user.id) throw "Insufficient permissions.";
            let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
            if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
            else try {
                await remote.removeIntegration(projectname, user.id);
                res.status(200).json({error: false, message: "Integration removed."});
            } catch(error) { res.status(500).json({error: true, message: "Cannot remove integration.", details: error.toString()}); }
        });
    });
});

module.exports = router;