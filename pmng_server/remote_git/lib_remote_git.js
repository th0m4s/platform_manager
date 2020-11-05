class RemoteGit {
    static getDetails() { return {icon: false, name: "NotImplemented"}; }

    static auth(req, res, next) { req.flash("warning", "This remote is not implemented."); res.redirect("/panel/users/me"); }
    static authCallback(req, res, next) { this.auth(req, res, next); }

    static async listRepositories(userId) { return []; }
    static async listBranches(userId, repository) { return []; }
    static async createRepository(repositoryName, privateRepo) { throw "Remote not implemented."; }

    static async push(req, res, next) { res.status(404).json({error: true, code: 404, message: "Invalid git remote.", details: "Remote not implemented."}); }
}

module.exports = RemoteGit;