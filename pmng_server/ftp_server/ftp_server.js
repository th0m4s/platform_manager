const FtpSrv = require('ftp-srv');
const logger = require("../platform_logger").logger();
const privileges = require("../privileges");
const database_server = require("../database_server");
const FTPfs = require("./ftp_fs");
const blackhole = require("bunyan-blackhole");
const greenlock_manager = require("../https/greenlock_manager");

const ftpHostType = process.env.FTP_HOST_TYPE;
const ftpListenAddr = process.env["HOST_" + ftpHostType];

function getServerSecureContext() {
    // reusing https certificates from greenlock
    return greenlock_manager.getSecureContext(process.env.ROOT_DOMAIN, true).catch(() => {
        console.warn("Cannot get FTP TLS certificate because it doesn't exist for the main domain yet.");
        return false;
    });
}

let ftpServer;
const forceTLS = process.env.ENABLE_HTTPS.toLowerCase() == "true";
async function start() {
    ftpServer = new FtpSrv({
        url: "ftp://" + ftpListenAddr + ":21",
        pasv_url: ftpListenAddr,
        pasv_min: 21001,
        pasv_max: 21999,
        tls: (forceTLS ? await getServerSecureContext() : false),
        greeting: "Welcome to the Platform Manager storages FTP server!",
        log: blackhole("FTP")
    });    

    ftpServer.on('login', ({connection, username, password}, resolve, reject) => {
        database_server.findUserByName(username).then((user) => {
            if(user == null) return reject("Bad credentials");
            return database_server.comparePassword(user.id, password).then((result) => {
                if(result === true) {
                    resolve({fs: new FTPfs(connection, user)});
                } else reject("Bad credentials"); // same message as if user doesn't exist
            });
        }).catch(reject);
    });

    if(process.env["HOST_" + ftpHostType].toLowerCase() != "disabled") {
        ftpServer.listen().then(() => {
            privileges.drop();
            logger.tag("FTP", "FTP server started.");
        });
    } else {
        logger.tagWarn("FTP", "Cannot start FTP server. Listen mode " + ftpHostType + " is disabled.");
    }
}

start();