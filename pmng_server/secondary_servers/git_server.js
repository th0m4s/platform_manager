const http = require('http');
const child_process = require('child_process');
const git_backend = require('git-http-backend');
const zlib = require('zlib');
const project_manager = require("../project_manager");
const database_server = require("../database_server");
const logger = require("../platform_logger").logger();
const auth = require("basic-auth");
const privileges = require("../privileges");

const server = http.createServer(function (req, res) {
    let repo = req.url.split('/')[1].trim();
    if(repo.length == 0) return res.end();
    if(!repo.endsWith(".git")) return res.end();

    repo = repo.substring(0, repo.length-4);
    project_manager.projectExists(repo).then(() => {
        let credentials = auth(req);     // login by key instead of password to protect privacy
        if(credentials === undefined) return unauthorized(res);
        database_server.findUserByKey(credentials.pass).then((user) => {
            if(user == null) return unauthorized(res);
            else if(user.name !== credentials.name) return unauthorized(res);

            project_manager.canAccessProject(repo, user.id).then(() => {
                let dir = project_manager.getProjectRepository(repo);
                let reqStream = req.headers['content-encoding'] == 'gzip' ? req.pipe(zlib.createGunzip()) : req;
                reqStream.pipe(git_backend(req.url, function (err, service) {
                    if (err) {
                        // logger.warn(err);
                        return res.end(err + '\n');
                    }
                    
                    res.setHeader('content-type', service.type);
                    // console.log(service.action, repo, service.fields);

                    let cmd = service.cmd;
                    
                    var ps = child_process.spawn(cmd, service.args.concat(dir));
                    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
                    
                })).pipe(res);
            }).catch((err) => {
                return unauthorized(res);
            })
        }).catch((err) => {
            return res.end(err + "\n");
        });
    }).catch((err) => {
        return res.end(err + "\n");
    });
});

/**
 * Sends an Unauthorized header and message to the git client.
 * @param {http.ServerResponse} res The response object of the unauthorized connection.
 */
function unauthorized(res) {
    res.setHeader("WWW-Authenticate", "Basic realm=\"git repository\"");
    res.statusCode = 401; // respond with 401 and WWW-Authenticate to force git to try again with credentials
    res.end();
}

/**
 * Starts the git web subserver. It creates a link between an http server and a git server.
 */
function start() {
    server.listen(8081, "127.0.0.1", () => {
        logger.tag("GIT", "Git server started.");
    });
}

if(require.main === module) {
    privileges.drop();
    start();
}


module.exports.start = start;