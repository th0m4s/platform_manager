const FtpSrv = require('ftp-srv');
const logger = require('simple-node-logger').createSimpleLogger();
const privileges = require("../privileges");
const database_server = require("../database_server");
const FTPfs = require("./ftp_fs");
const blackhole = require("bunyan-blackhole");

const ftpServer = new FtpSrv({
    url: "ftp://0.0.0.0:21",
    pasv_url: process.env.SERVER_HOST,
    pasv_min: 21001,
    pasv_max: 21999,
    greeting: "Welcome to the Platform Manager storages FTP server!",
    log: blackhole()
});

function start() {
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


    ftpServer.listen().then(() => {
        privileges.drop();
        logger.info("FTP server started.");
    });
}

start();