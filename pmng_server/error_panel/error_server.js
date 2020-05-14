const express = require("express");
const app = express();
const logger = require('simple-node-logger').createSimpleLogger();

app.all("*", (req, res) => {
    res.send("No server found for this domain.");
});

function start() {
    app.listen(8099, () => {
        logger.info("Error server started.");
    });
}


start();