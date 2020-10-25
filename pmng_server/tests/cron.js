const cron = require("node-cron");

cron.schedule("0 * * * *", () => {
    console.log("hour");
});

cron.schedule("* * * * *", () => {
    console.log("minute", new Date().getMinutes());
});