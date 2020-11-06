const RemoteGit = require("../lib_remote_git");
const rgit_manager = require("../remote_git_manager");
const originalBodyParser = require("body-parser");
const GithubStrategy = require("passport-github").Strategy;
const database_server = require("../../database_server");
const project_manager = require("../../project_manager");
const passport = require("passport");
const crypto = require("crypto");
const simpleGit = require("simple-git/promise");
const Octokit = require("@octokit/rest").Octokit;
const string_utils = require("../../string_utils");

// name of the git cli remote name
const INTEGRATION_REMOTE_NAME = "github_integration";

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
        let gitUser = isNaN(userId) ? userId : await this._getGitUser(userId);
        userId = gitUser.userid;

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
        let gitUser = isNaN(userId) ? userId : await this._getGitUser(userId);
        userId = gitUser.userid;
        
        let integrations = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id);

        return Promise.all(integrations.map((x) => this.removeIntegration(x.projectname, userId))).then(() => 
            database_server.database("remote_git_users").where("id", gitUser.id).delete());
    }

    static async push(req, res) {
        let projectname = req.params.projectname || "", projectlength = projectname.length;
        if(projectlength >= 4 && projectlength <= 32) {
            // TODO: maybe also store remote on remote_git_integrations
            let project = await project_manager.getProject(projectname);
            let gitUser = await this._getGitUser(project.ownerid);
            gitUser.access_token = await rgit_manager.ensureTokenValid(gitUser);

            let gitInte = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id).andWhere("projectname", projectname);
            if(gitInte.length != 1) throw {status: 404, message: "GitHub integration doesn't exist for this project."};
            gitInte = gitInte[0];

            await new Promise((resolve) => originalBodyParser.text({type: "application/json"})(req, res, resolve));
            let {secret, repo_id, branch} = gitInte;
            let bodyText = req.body, body = JSON.parse(bodyText);

            let hash = crypto.createHash("sha256");
            hash.update(bodyText);
            let requiredSignature = hash.digest("hex");

            let givenSignature = req.headers["x-hub-signature-256"] ?? "";
            if(!givenSignature.startsWith("sha256=")) givenSignature = givenSignature.substring(7);
            // if(givenSignature !== requiredSignature) throw {status: 403, message: "Invalid signature."};

            let repo = body.repository.full_name;
            let givenRepo_id = body.repository.id;

            if(givenRepo_id != repo_id) throw {status: 404, message: "Invalid repository id."};
            let refParts = body.ref.split("/");

            if(refParts.length < 3) throw {status: 401, message: "Malformed git ref."};
            let givenBranch = refParts.slice(2).join("/");
            if(givenBranch != branch) res.status(202).json({error: false, code: 202, message: "Push accepted but branch doesn't match."});
            else {
                let gitRepo = simpleGit(project_manager.getProjectRepository(projectname));
                let actualRemotes = (await gitRepo.getRemotes()).map((x) => x.name);

                if(actualRemotes.includes(INTEGRATION_REMOTE_NAME)) await gitRepo.removeRemote(INTEGRATION_REMOTE_NAME);
                await gitRepo.addRemote(INTEGRATION_REMOTE_NAME, "https://" + gitUser.access_token + "@github.com/" + repo + ".git");

                await gitRepo.fetch(INTEGRATION_REMOTE_NAME, branch);
                await gitRepo.reset(["--hard", INTEGRATION_REMOTE_NAME + "/" + branch]);
                res.status(200).json({error: false, code: 200, message: "Received hook and pulled repository"});
            }
        } else throw {status: 401, message: "Invalid project name."};
    }
}


module.exports = RemoteGithub;