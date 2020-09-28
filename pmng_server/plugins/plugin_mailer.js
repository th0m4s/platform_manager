const Plugin = require("./lib_plugin");
const pfs = require("fs").promises;
const mail_manager = require("../mails/mail_manager");

class MailerPlugin extends Plugin {
    static isProjectBased() {
        return false;
    }

    static async startGlobalPlugin(plugindirectory, globalconfig, setconfig) {
        try { // create plugin dir if it doesn't exist
            await pfs.access(plugindirectory);
        } catch(error) { await pfs.mkdir(plugindirectory); }

        return mail_manager.initialize(plugindirectory);
    }
}

module.exports = MailerPlugin;