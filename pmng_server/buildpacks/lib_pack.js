class Buildback {
    // TODO: are arguments ok (count, order, names, ...)?
    static async build(projectName, projectData, utils, logger, hasAddons) { return ["bash"]; }

    static availableAddons(projectData) { return []; }

    static async imageDetails(projectData) {
        return {
            image: undefined,
            built: false,
            build: async () => { throw "Cannot build empty image."; }
        }
    }
}

module.exports = Buildback;