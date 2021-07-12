module.exports = {
    Logger: require("./pmng_server/platform_logger"),
    Intercom: {
        Client: require("./pmng_server/intercom/intercom_client"),
        Server: require("./pmng_server/intercom/intercom_server")
    },
    ProcessStats: require("./pmng_server/process_stats"),
    SubprocessUtils: require("./pmng_server/subprocess_utils")
}