const express = require('express'), router = express.Router();
const crypto = require("crypto");
const bodyParser = require("body-parser");

const GITHUB_HOOKS_SECRET = process.env.GITHUB_HOOKS_SECRET;
router.post("/webhooks/github/push/:project_name", bodyParser.raw(), (req, res) => {
    let bodyText = req.body.toString("utf-8");
    let body = JSON.parse(bodyText);

    let requiredSignature = crypto.createHmac("sha256", GITHUB_HOOKS_SECRET).update(bodyText).digest("hex").toLowerCase();
    let signature = req.headers["x-hub-signature-256"].toLowerCase();

    let isCorrect = requiredSignature === signature;
    console.log("Received push webhook for project " + req.params.project_name + " with signature " + signature + " and status " + isCorrect + "(" + requiredSignature + ")");

    res.json({received: true, correct: isCorrect});
});

module.exports = router;