const RemoteGit = require("../lib_remote_git");
const rgit_manager = require("../remote_git_manager");
const GithubStrategy = require("passport-github").Strategy;
const database_server = require("../../database_server");
const passport = require("passport");
const Octokit = require("@octokit/rest").Octokit;
const string_utils = require("../../string_utils");

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

    static async _getGitUser(userId) {
        let gitUser = await database_server.database("remote_git_users").where("remote", "github").andWhere("userid", userId).select("*");
        if(gitUser.length == 0) throw "Account not linked!";

        return gitUser[0];
    }

    static async _getOctokit(userId, returnGitUser = false) {
        let gitUser = await this._getGitUser(userId);
        let token = await rgit_manager.ensureTokenValid(gitUser);

        let octokit =  new Octokit({
            userAgent: rgit_manager.GIT_USER_AGENT,
            auth: token
        });

        if(!returnGitUser) return octokit;
        else return {octokit, gitUser};
    }

    static async listRepositories(userId) {
        let octokit = userId instanceof Octokit ? userId : await this._getOctokit(userId);

        let response = await octokit.request("GET /user/repos?per_page=100");
        if(this._validResp(response)) {
            return response.data.map((x) => {
                return {
                    repo_id: x.id.toString(), private: x.private, default_branch: x.default_branch, full_name: x.full_name
                }
            })
        } else throw response;
    }

    static async listBranches(userId, repository) {
        let octokit = userId instanceof Octokit ? userId : await this._getOctokit(userId);

        let response = await octokit.request("GET /repos/" + repository + "/branches");
        if(this._validResp(response)) {
            return response.data.map((x) => x.name);
        } else throw response;
    }

    static _getUrl(projectname) {
        return "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/api/v1/git/github/webhooks/push/" + projectname;
    }

    static _validResp(resp) {
        return resp.status >= 200 && resp.status < 300;
    }

    static async prepareIntegration(projectname, userId, repo_id, branch) {
        let {octokit, gitUser} = await this._getOctokit(userId, true);

        let repo = "";
        for(let _repo of await this.listRepositories(octokit)) {
            if(_repo.repo_id.toString() == repo_id.toString()) {
                repo = _repo.full_name;
                break;
            }
        }

        if(repo.length == 0) throw "Invalid repository id!";
        let repoParts = repo.split("/");
        if(repoParts.length != 2) throw "Invalid repository!";

        let secret = string_utils.generatePassword(32);
        await database_server.database("remote_git_integrations").insert({projectname, git_userid: gitUser.id, secret, repo, repo_id, branch});

        let response = await octokit.repos.createWebhook({
            owner: repoParts[0], repo: repoParts[1],
            config: {
                url: this._getUrl(projectname),
                content_type: "json",
                secret
            }
        });

        if(!this._validResp(response)) throw response;
    }

    static async removeIntegration(projectname, userId) {
        let {octokit, gitUser} = await this._getOctokit(userId, true);

        let integration = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id).andWhere("projectname", projectname).select("*");
        if(integration.length == 0) throw "Integration doesn't exist!";
        else integration = integration[0];

        let repoParts = integration.repo.split("/");
        if(repoParts.length != 2) throw "Invalid repository!";

        let webhooks = await octokit.repos.listWebhooks({
            owner: repoParts[0], repo: repoParts[1], per_page: 50
        });

        if(!this._validResp(webhooks)) throw webhooks;
        
        let toRemove = [], requiredUrl = this._getUrl(projectname);
        for(let webhook of webhooks.data) {
            let url = webhook.config.url;
            if(url == requiredUrl) toRemove.push(webhook.id);
        }

        await Promise.all(toRemove.map((x) => 
            octokit.repos.deleteWebhook({
                owner: repoParts[0], repo: repoParts[1], hook_id: x
            }).then((resp) => { if(!this._validResp(resp)) throw resp; })
        ));

        await database_server.database("remote_git_integrations").where("id", integration.id).delete();
    }

    static async unlinkAccount(userId) {
        let gitUser = this._getGitUser(userId);
        let integrations = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id);

        return Promise.all(integrations.map((x) => this.removeIntegration(x.projectname, userId)));
    }

    static async push(req, res, next) {

    }
}


module.exports = RemoteGithub;