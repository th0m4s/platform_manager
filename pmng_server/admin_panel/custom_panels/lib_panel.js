class CustomPanel {
    static async startPanel(mainPanelInstance) { }
    static route() { return undefined; }
    static handleRequest(req, res, next) { next(); }
    static setHeaderLinks(headerLinks) { }
}

module.exports = CustomPanel;