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
            if(e.statusCode == 302 || e.statusCode == 301) {
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
            let appData = {};
            if(typeof app === "object") {
                appData = app;
                app = appData.name;
            }

            switch(app) {
                case "phantomjs":
                    let phantomFilename = "dockerized-phantomjs.tar.gz";
    
                    logger("Downloading PhantomJS...");
                    let phantomDownloadPaths = utils.temporaryFile(phantomFilename);
                    try {
                        let writeStream = fs.createWriteStream(phantomDownloadPaths.host);
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
                    let phantomTempDir = path.dirname(phantomDownloadPaths.container);
                    let extractExec = await utils.execCommand("tar -xzf " + phantomFilename + " -C /tmp/ && cp -R /tmp/etc/fonts /etc/ && cp -R /tmp/lib/* /lib/ && cp -R /tmp/lib64 / && cp -R /tmp/usr/lib/* /usr/lib/ && cp -R /tmp/usr/lib/x86_64-linux-gnu /usr/ && cp -R /tmp/usr/share/* /usr/share/ && cp /tmp/usr/local/bin/phantomjs /usr/bin/ && rm -rf /tmp/*", undefined, false, "root", phantomTempDir);
                    if(extractExec.code != 0)
                        throw "Cannot extract PhantomJS archive: " + extractExec.err;
                    logger("PhantomJS files added to the project.");

                    await pfs.unlink(phantomDownloadPaths.host);
                    logger("Temporary files removed. App installation done.");

                    break;
                case "dotnet":
                    let dotnetFilename = "dotnet-install.sh";

                    logger("Installing required librairies...");
                    let resp = await utils.execCommand("apk add --no-cache icu-libs krb5-libs libgcc libintl libssl1.1 libstdc++ zlib", undefined, false, "root");
                    if(resp.err.trim().length > 0) throw resp.err;
    
                    logger("Downloading .NET install script...");
                    let dotnetDownloadPaths = utils.temporaryFile(dotnetFilename);
                    try {
                        let writeStream = fs.createWriteStream(dotnetDownloadPaths.host);
                        let downloadStream = await bentFollowRedirect("https://dot.net/v1/dotnet-install.sh");

                        downloadStream.pipe(writeStream);
    
                        await new Promise((resolve, reject) => {
                            downloadStream.on("error", reject);
                            downloadStream.on("end", resolve);
                        });
                    } catch(error) {
                        throw "Cannot download install script: " + error;
                    }

                    logger("Installing .NET from script...");
                    let dotnetTempDir = path.dirname(dotnetDownloadPaths.container);
                    let installExec = await utils.execCommand("chmod +x " + dotnetFilename + " && ./" + dotnetFilename + " --install-dir /usr/share/dotnet" + (appData.channel != undefined ? (" -c " + appData.channel) : "") + (appData.version != undefined ? (" -v " + appData.version) : ""), undefined, false, "root", dotnetTempDir);
                    if(installExec.code != 0)
                        throw "Cannot install .NET: " + installExec.err;

                    logger("Installing dotnet-script...");
                    let dotnetScriptExec = await utils.execCommand("/usr/share/dotnet/dotnet tool install -g dotnet-script", undefined, false, "root", dotnetTempDir);
                    if(dotnetScriptExec.code != 0)
                        throw "Cannot install dotnet-script: " + dotnetScriptExec.err;
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