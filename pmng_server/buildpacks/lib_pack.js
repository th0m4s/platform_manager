class Buildback {
    // TODO: are arguments ok (count, order, names, ...)?
    static async build(projectName, projectData, utils, logger, hasAddons) { return ["bash"]; }
    static availableAddons(projectData) { return []; }
}

module.exports = Buildback;