const strategy = require("../https/challenge_strategy");
const tester = require('acme-dns-01-test');

tester.testZone('dns-01', "example.com", strategy.create()).then(() => console.log("PASSED")).catch((err) => console.log("FAILED", err));