const express = require('express'), router = express.Router();
const bodyParser = require("body-parser");
const rgit_manager = require("../../../remote_git/remote_git_manager");
const api_auth = require("./api_auth");

router.post("/:remote/webhooks/push/:project_name", bodyParser.text({type: "application/json"}), (req, res) => {
    res.send("hi!");
});

router.get("/:remote/listRepositories", (req, res) => {
    api_auth(req, res, async function(user) {
        let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
        if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
        else try { res.status(200).json({error: false, repositories: await remote.listRepositories(user.id)}); }
        catch(error) { res.status(500).json({error: true, message: "Cannot list repositories.", details: error}); }
    });
});

router.get("/:remote/listBranches/*", (req, res) => {
    api_auth(req, res, async function(user) {
        let remote = await rgit_manager.getRemote(req.params.remote.toLowerCase());
        if(remote == undefined) res.status(404).json({error: true, code: 404, message: "Invalid remote.", details: "The remote doesn't exist."});
        else try { res.status(200).json({error: false, branches: await remote.listBranches(user.id, req.params[0])}); }
        catch(error) { res.status(500).json({error: true, message: "Cannot list branches.", details: error}); }
    });
});

module.exports = router;