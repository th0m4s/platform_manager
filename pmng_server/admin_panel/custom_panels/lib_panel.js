class CustomPanel {
    static async startPanel() { }
    static route() { return undefined; }
    static requiresUtils() { return false; } // if true, handleRequest will be called after all admin utils
    static handleRequest(req, res, next) { next(); }
}

module.exports = CustomPanel;