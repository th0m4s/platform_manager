const RemoteGit = require("../lib_remote_git");
const rgit_manager = require("../remote_git_manager");
const originalBodyParser = require("body-parser");
const GitlabStrategy = require("passport-gitlab2");
const database_server = require("../../database_server");
const project_manager = require("../../project_manager");
const passport = require("passport");
const crypto = require("crypto");
const simpleGit = require("simple-git/promise");
const os = require("os");
const pfs = require("fs").promises;
const path = require("path");
const rmfr = require("rmfr");
const {Gitlab} = require("@gitbeaker/node");
const string_utils = require("../../string_utils");
const oauth2Refresh = require("passport-oauth2-refresh");

// name of the git cli remote name
const INTEGRATION_REMOTE_NAME = "gitlab_integration";
const LOCAL_REMOTE_NAME = "local_pmng";
const INTEGRATION_BRANCH = "integration";

const ACCESS_EXPIRATION = 7200;
const REFRESH_EXPIRATION = 15811200;

let passportAuthDone = false;
class RemoteGitlab extends RemoteGit {
    static getDetails() {
        return {icon: "fab fa-gitlab", name: "GitLab"};
    }

    static _passportAuth() {
        if(passportAuthDone) return;
        passportAuthDone = true;

        let strategy = new GitlabStrategy({
            clientID: process.env.GITLAB_CLIENTID,
            clientSecret: process.env.GITLAB_CLIENTSECRET,
            passReqToCallback: false,
            scope: "api read_repository",
            callbackURL: "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/panel/git/gitlab/auth/callback"
        }, function(accessToken, refreshToken, profile, cb) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            cb(null, profile);
        });

        passport.use(strategy);
        oauth2Refresh.use(strategy);
    }

    static auth(req, res, next) {
        this._passportAuth();
        return passport.authenticate("gitlab")(req, res, next);
    }

    static authCallback(req, res, next) {
        this._passportAuth();
        return passport.authenticate("gitlab", async (err, user, info) => {
            if(err) req.flash("danger", "Unable to link GitLab account: " + err);
            else if(user === false) req.flash("warn", "GitLab link was canceled.");
            else {
                try {
                    let existingConnection = await database_server.database("remote_git_users").where("userid", req.user.id).andWhere("remote", "gitlab").count("* as count");
                    if(existingConnection.length == 0 || existingConnection[0].count == 0) {
                        let hasRefresh = user.refreshToken != undefined, now = Math.floor(Date.now()/1000);
                        await database_server.database("remote_git_users").insert({userid: req.user.id, remote: "gitlab", access_token: user.accessToken, expire_time: hasRefresh ? new Date((now + ACCESS_EXPIRATION)*1000) : undefined, refresh_token: user.refreshToken, refresh_expire: hasRefresh ? new Date((now + REFRESH_EXPIRATION)*1000) : undefined});
                        req.flash("success", "GitLab account linked with success.");
                    } else req.flash("warn", "Your GitLab account is already linked, please first unlink your account and try again.");
                } catch(error) {
                    req.flash("danger", "Unable to save your GitLab account: " + error);
                }
                
            }

            res.redirect("/panel/users/me");
        })(req, res, next);
    }

    static async _ensureUserValid(gitUser) {
        let now = Math.floor(Date.now()/1000);
        if(gitUser.expire_time != undefined && now >= Math.floor(gitUser.expire_time.getTime()/1000)) {
            this._passportAuth();
            return new Promise((resolve, reject) => {
                oauth2Refresh.requestNewAccessToken("gitlab", gitUser.refresh_token, async (err, accessToken, refreshToken) => {
                    if(err) reject(err);
                    else {
                        refreshToken = refreshToken ?? gitUser.refresh_token;
    
                        gitUser.access_token = accessToken;
                        gitUser.expire_time = new Date((now + ACCESS_EXPIRATION)*1000);
                        gitUser.refresh_token = refreshToken;
                        gitUser.refresh_expire = new Date((now + REFRESH_EXPIRATION)*1000);
        
                        await database_server.database("remote_git_users").where("id", gitUser.id).update(gitUser);
                        resolve(gitUser);
                    }
                });
            })
        }
    }

    static async _getGitUser(userId) {
        let gitUser = await database_server.database("remote_git_users").where("remote", "gitlab").andWhere("userid", userId).select("*");
        if(gitUser.length == 0) throw "Account not linked!";

        return gitUser[0];
    }

    static async _getGitlab(userId, returnGitUser = false) {
        let gitUser = isNaN(userId) ? userId : await this._getGitUser(userId);
        userId = gitUser.userid;

        await this._ensureUserValid(gitUser);
        let token = gitUser.access_token;

        let gitlab = new Gitlab({oauthToken: token});

        if(!returnGitUser) return gitlab;
        else return {gitlab, gitUser};
    }

    static async listRepositories(userId) {
        let gitlab = typeof userId == "object" ? userId : await this._getGitlab(userId);

        let gitlabUser = await gitlab.Users.current();
        let repos = await gitlab.Users.projects(gitlabUser.id);
        return repos.map((x) => {
            return {
                repo_id: x.id.toString(), private: x.visibility != "public", default_branch: x.default_branch, full_name: x.path_with_namespace
            }
        });
    }

    static async listBranches(userId, repository) {
        let gitlab = typeof userId == "object" ? userId : await this._getGitlab(userId);

        let branches = await gitlab.Branches.all(repository);
        return branches.map((x) => x.name);
    }

    static _getUrl(projectname) {
        return "http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/api/v1/git/gitlab/webhooks/push/" + projectname;
    }

    static async prepareIntegration(projectname, userId, repo_id, branch) {
        let {gitlab, gitUser} = await this._getGitlab(userId, true);

        let repo = "";
        for(let _repo of await this.listRepositories(gitlab)) {
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

        // could have used repo_id, but by using the repo name, we ensure that it exists
        await gitlab.ProjectHooks.add(repo, this._getUrl(projectname), {token: secret, push_events_branch_filter: branch});
    }

    static async removeIntegration(projectname, userId) {
        let {gitlab, gitUser} = await this._getGitlab(userId, true);

        let integration = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id).andWhere("projectname", projectname).select("*");
        if(integration.length == 0) throw "Integration doesn't exist!";
        else integration = integration[0];

        let repoParts = integration.repo.split("/");
        if(repoParts.length != 2) throw "Invalid repository!";

        let webhooks = await gitlab.ProjectHooks.all(integration.repo);
        let toRemove = [], requiredUrl = this._getUrl(projectname);
        for(let webhook of webhooks) {
            let url = webhook.url;
            if(url == requiredUrl) toRemove.push(webhook.id);
        }

        await Promise.all(toRemove.map((x) => gitlab.ProjectHooks.remove(integration.repo, x)));
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

            let eventName = req.headers["x-gitlab-event"];
            if(eventName.toLowerCase() == "push hook") {
                await this._ensureUserValid(gitUser);

                let gitInte = await database_server.database("remote_git_integrations").where("git_userid", gitUser.id).andWhere("projectname", projectname).select("*");
                if(gitInte.length != 1) throw {status: 404, message: "GitLab integration doesn't exist for this project."};
                gitInte = gitInte[0];

                await new Promise((resolve) => originalBodyParser.json()(req, res, resolve));
                let body = req.body;

                let token = req.headers["x-gitlab-token"] ?? "";
                if(token !== secret) throw {status: 403, message: "Invalid GitLab token."};

                let repo = body.project.path_with_namespace;
                let givenRepo_id = body.project.id;

                if(givenRepo_id != repo_id) throw {status: 404, message: "Invalid repository id."};
                let refParts = body.ref.split("/");

                if(refParts.length < 3) throw {status: 401, message: "Malformed git ref."};
                let givenBranch = refParts.slice(2).join("/");
                if(givenBranch != branch) res.status(202).json({error: false, code: 202, message: "Push accepted but branch doesn't match."});
                else {
                    let repoDir = await pfs.mkdtemp(path.resolve(os.tmpdir(), "pmng_git_gitlab_"));
                    let gitRepo = simpleGit(repoDir);
                    await gitRepo.init();
                    await gitRepo.addRemote(INTEGRATION_REMOTE_NAME, "https://oauth2:" + gitUser.access_token + "@gitlab.com/" + repo + ".git");
                    await gitRepo.addRemote(LOCAL_REMOTE_NAME, project_manager.getProjectRepository(projectname));

                    /*await gitRepo.fetch(INTEGRATION_REMOTE_NAME, branch);
                    await gitRepo.reset(["--hard", INTEGRATION_REMOTE_NAME + "/" + branch]);*/

                    // files from local not present in integration are removed on merge
                    await gitRepo.pull(LOCAL_REMOTE_NAME, "master");
                    await gitRepo.checkout(["-b", INTEGRATION_BRANCH]);
                    await gitRepo.pull(INTEGRATION_REMOTE_NAME, "master");
                    await gitRepo.checkout("master");
                    await gitRepo.merge([INTEGRATION_BRANCH]);
                    await gitRepo.push(LOCAL_REMOTE_NAME, "master");

                    await rmfr(repoDir);
                    res.status(200).json({error: false, code: 200, message: "Received hook and pulled/repushed repository"});
                }
            } else throw {status: 400, message: "Invalid GitLab event."};
        } else throw {status: 401, message: "Invalid project name."};
    }
}


module.exports = RemoteGitlab;