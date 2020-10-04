class CustomPanel {
    static async startPanel(mainPanelInstance) { }
    static route() { return undefined; }
    static requiresUtils() { return false; } // if true, handleRequest will be called after all admin utils
    static handleRequest(req, res, next) { next(); }
    static setHeaderLinks(headerLinks) { }
}

module.exports = CustomPanel;