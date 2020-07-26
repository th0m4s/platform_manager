const express = require("express");
const app = express();
const logger = require("../platform_logger").logger();
const path = require("path");
const privileges = require("../privileges");

const stylePath = path.join(__dirname, "static/style.css");
app.get("/style.css", (req, res) => {
    res.sendFile(stylePath);
})

const errorPage = path.join(__dirname, "static/port_error.html");
app.all("*", (req, res) => {
    res.sendFile(errorPage);
});

function start() {
    privileges.drop();

    app.listen(8099, () => {
        logger.info("Error server started.");
    });
}


start();