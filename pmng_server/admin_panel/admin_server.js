const logger = require("../platform_logger").logger();
const express = require("express"), admin = express(), bodyParser = require("body-parser");
const passport = require('passport');
const path = require("path");
const greenlock_manager = require("../https/greenlock_manager");

// health checker (ip6addr also works with ipv4)
const health = {dns: require("dns"), ip6addr: require("ip6addr")};

admin.set('view engine', 'ejs');
admin.set('views', path.join(__dirname, '/views'));
admin.set('etag', false);

admin.use(bodyParser.json());
admin.use(bodyParser.urlencoded({ extended: true }));

// admin.use(passport.initialize());
// need to initialize and session in the same file

admin.use("/static", express.static(path.join(__dirname, "static", "dist")));
const favicon = path.join(__dirname, "static", "images", "favicon.ico");
admin.get("/favicon.ico", function(req, res) {
    res.sendFile(favicon);
});

admin.use("/api", require("./api_router"));
admin.use("/panel", require("./panel_router"));

admin.use("/health_status", (req, res) => {
    let ipv4 = process.env.HOST_A, ipv6 = process.env.HOST_AAAA;
    let promises = [];

    if(ipv4.toLowerCase() != "disabled") {
        promises.push(new Promise((resolve) => {
            health.dns.resolve(process.env.ROOT_DOMAIN, "A", (error, result) => {
                if(error != null) {
                    resolve({
                        name: "ipv4", value: {enabled: true, status: false, message: error}
                    });
                } else if(health.ip6addr.compare(result[0], ipv4) == 0) {
                    resolve({
                        name: "ipv4", value: {enabled: true, status: true}
                    });
                } else {
                    resolve({
                        name: "ipv4", value: {enabled: true, status: false}
                    });
                }
            });
        }));
    } else {
        promises.push(Promise.resolve({name: "ipv4", value: {enabled: false}}));
    }

    if(ipv6.toLowerCase() != "disabled") {
        promises.push(new Promise((resolve) => {
            health.dns.resolve(process.env.ROOT_DOMAIN, "AAAA", (error, result) => {
                if(error != null) {
                    resolve({
                        name: "ipv6", value: {enabled: true, status: false, message: error}
                    });
                } else if(health.ip6addr.compare(result[0], ipv6) == 0) {
                    resolve({
                        name: "ipv6", value: {enabled: true, status: true}
                    });
                } else {
                    resolve({
                        name: "ipv6", value: {enabled: true, status: false}
                    });
                }
            });
        }));
    } else {
        promises.push(Promise.resolve({name: "ipv6", value: {enabled: false}}));
    }

    Promise.all(promises).then((results) => {
        let response = {};
        for(let {name, value} of results) {
            response[name] = value;
        }

        res.json(response);
    });
});

admin.all("/", function(req, res) {
    res.redirect("/panel");
});

function start() {
    admin.listen(8080, () => {
        logger.info("Admin server started.");
    });

    if(process.env.ENABLE_HTTPS.toLowerCase() == "true") greenlock_manager.init();
}

start();