const BuildAddon = require("./lib_addon");
const bent = require("bent");
const fs = require("fs"), pfs = fs.promises;
const path = require("path");

async function bentFollowRedirect(url, maxRedirect = 3) {
    let bentObj = bent();

    let req = null;
    let cnt = 0;

    while(req == null && cnt < maxRedirect) {
        try {
            let tempReq = await bentObj(url);
            req = tempReq;
        } catch(e) {
            if(e.statusCode == 302) {
                url = e.headers.location;
            } else throw e;
        }

        cnt++;
    }

    return req;
}

class AppBinary extends BuildAddon {
    static async addon(projectName, addonData, utils, logger) {
        let apps = addonData.apps;
        if(apps == undefined) throw "No apps were provided for the addon.";
        else if(!Array.isArray(apps)) throw "Apps is not an array of apps to install.";

        //let bentAdmin = bent("http" + (process.env.ENABLE_HTTPS.toLowerCase() == "true" ? "s" : "") + "://admin." + process.env.ROOT_DOMAIN + "/");

        for(let app of apps) {
            switch(app) {
                case "phantomjs":
                    let filename = "dockerized-phantomjs.tar.gz";
    
                    logger("Downloading PhantomJS...");
                    let downloadPaths = utils.temporaryFile(filename);
                    try {
                        let writeStream = fs.createWriteStream(downloadPaths.host);
                        let downloadStream = await bentFollowRedirect("https://github.com/fgrehm/docker-phantomjs2/releases/download/v2.0.0-20150722/dockerized-phantomjs.tar.gz");

                        downloadStream.pipe(writeStream);
    
                        await new Promise((resolve, reject) => {
                            downloadStream.on("error", reject);
                            downloadStream.on("end", resolve);
                        });
                    } catch(error) {
                        throw "Cannot download PhantomJS: " + error;
                    }
    
                    logger("Extracting archive...");
                    let tempDir = path.dirname(downloadPaths.container);
                    let extractExec = await utils.execCommand("tar -xzf " + filename + " -C /tmp/ && cp -R /tmp/etc/fonts /etc/ && cp -R /tmp/lib/* /lib/ && cp -R /tmp/lib64 / && cp -R /tmp/usr/lib/* /usr/lib/ && cp -R /tmp/usr/lib/x86_64-linux-gnu /usr/ && cp -R /tmp/usr/share/* /usr/share/ && cp /tmp/usr/local/bin/phantomjs /usr/bin/ && rm -rf /tmp/*", undefined, false, "root", tempDir);
                    if(extractExec.code != 0)
                        throw "Cannot extract PhantomJS archive: " + extractExec.err;
                    logger("PhantomJS files added to the project.");

                    await pfs.unlink(downloadPaths.host);
                    logger("Temporary files removed. App installation done.");

                    break;
                default:
                    throw "Invalid app provided. Cannot build addon.";
            }
        }
    }

    static displayName() {
        return "App Binaries";
    }
}

module.exports = AppBinary;