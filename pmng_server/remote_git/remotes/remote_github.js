const RemoteGit = require("../lib_remote_git");
const rgit_manager = require("../remote_git_manager");
const GithubStrategy = require("passport-github").Strategy;
const database_server = require("../../database_server");
const passport = require("passport");
const Octokit = require("@octokit/rest").Octokit;

let passportAuthDone = false;
class RemoteGithub extends RemoteGit {
    static getDetails() {
        return {icon: "fab fa-github", name: "GitHub"};
    }

    static _passportAuth() {
        if(passportAuthDone) return;
        passportAuthDone = true;

        passport.use(new GithubStrategy({
            clientID: process.env.GITHUB_CLIENTID,
            clientSecret: process.env.GITHUB_CLIENTSECRET,
            passReqToCallback: false,
            scope: "repo",
            callbackURL: "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/panel/git/github/auth/callback"
        }, function(accessToken, refreshToken, profile, cb) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            cb(null, profile);
        }));
    }

    static auth(req, res, next) {
        this._passportAuth();
        return passport.authenticate("github")(req, res, next);
    }

    static authCallback(req, res, next) {
        this._passportAuth();
        return passport.authenticate("github", async (err, user, info) => {
            if(err) req.flash("danger", "Unable to link GitHub account: " + err);
            else if(user === false) req.flash("warn", "GitHub link was canceled.");
            else {
                try {
                    let existingConnection = await database_server.database("remote_git_users").where("userid", req.user.id).andWhere("remote", "github").count("* as count");
                    if(existingConnection.length == 0 || existingConnection[0].count == 0) {
                        let hasRefresh = user.refreshToken != undefined, now = Math.floor(Date.now()/1000);
                        await database_server.database("remote_git_users").insert({userid: req.user.id, remote: "github", access_token: user.accessToken, expire_time: hasRefresh ? now + 28800 : undefined, refresh_token: user.refreshToken, refresh_expire: hasRefresh ? now + 15811200 : undefined});
                        req.flash("success", "GitHub account linked with success.");
                    } else req.flash("warn", "Your GitHub account is already linked, please first unlink your account and try again.");
                } catch(error) {
                    req.flash("danger", "Unable to save your GitHub account: " + error);
                }
                
            }

            res.redirect("/panel/users/me");
        })(req, res, next);
    }

    static async listRepositories(userId) {
        let gitUser = await database_server.database("remote_git_users").where("remote", "github").andWhere("userid", userId).select("*");
        if(gitUser.length == 0) throw "Account not linked!";

        gitUser = gitUser[0];
        let token = await rgit_manager.ensureTokenValid(gitUser);

        let octokit = new Octokit({
            userAgent: rgit_manager.GIT_USER_AGENT,
            auth: token
        });

        let response = await octokit.request("GET /user/repos");
        if(response.status == 200) {
            return response.data.map((x) => {
                return {
                    repo_id: x.id.toString(), private: x.private, default_branch: x.default_branch, full_name: x.full_name
                }
            })
        } else throw response;
    }

    static async listBranches(userId, repository) {
        let gitUser = await database_server.database("remote_git_users").where("remote", "github").andWhere("userid", userId).select("*");
        if(gitUser.length == 0) throw "Account not linked!";

        gitUser = gitUser[0];
        let token = await rgit_manager.ensureTokenValid(gitUser);

        let octokit = new Octokit({
            userAgent: rgit_manager.GIT_USER_AGENT,
            auth: token
        });

        let response = await octokit.request("GET /repos/" + repository + "/branches");
        if(response.status == 200) {
            return response.data.map((x) => x.name);
        } else throw response;
    }

    static async push(req, res, next) {
        
    }
}


module.exports = RemoteGithub;