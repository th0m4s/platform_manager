const fs = require("fs");
const BasePHPBuildpack = require("./base/base_php");

class ApachePHPBuildpack extends BasePHPBuildpack {
    static async build(projectName, projectData, utils, logger, hasAddons) {
        logger("Using Apache2/PHP7 server type.");
        let entrypoint = await super.build(projectName, projectData, utils, logger, hasAddons);

        let checkConfFolder = async () => {
            if(!(await utils.exists("d", "conf.d")))
                await utils.execCommand("mkdir ./conf.d");
        }

        let compressionOption = projectData.server_options?.compression;
        if(compressionOption != undefined) {
            let compressionType = typeof compressionOption;
            if(Array.isArray(compressionOption)) compressionType = "array";

            let compressionConf = "";

            let addMimeCompressions = (mimes) => {
                compressionConf += "AddOutputFilterByType DEFLATE " + mimes.join(" ") + "\n"
            }

            let addExtensionCompressions = (extensions) => {
                compressionConf += "<FilesMatch \"\\.(" + extensions.join("|") + ")$\">\nSetOutputFilter DEFLATE\n</FilesMatch>\n";
            }

            switch(compressionType) {
                case "boolean":
                    if(compressionOption) {
                        logger("Enabling default compression...");
                        addMimeCompressions(["text/html", "text/plain", "text/xml", "text/css", "application/javascript", "application/json", "application/xml", "application/xhtml+xml", "image/svg+xml"]);
                    }
                    break;
                case "string":
                    if(compressionOption.match(/^([a-zA-Z0-9.]{1,12}[ ,]{0,1})+$/g)) {
                        logger("Enabling extensions compression...");
                        addExtensionCompressions(compressionOption.split(/[ ,]/));
                    } else if(compressionOption.match(/^(\w+\/[-.\w]+(?:\+[-.\w]+)?[ ,]{0,1})+$/g)) {
                        logger("Enabling MIME types compression...");
                        addMimeCompressions(compressionOption.split(/[ ,]/));
                    }
                    break;
                case "array":
                    let mimes = compressionOption.filter((x) => x.match(/^\w+\/[-.\w]+(?:\+[-.\w]+)?$/g));
                    let extensions = compressionOption.filter((x) => !mimes.includes(x) && x.match(/^[a-zA-Z0-9.]{1,12}$/g));

                    if(mimes.length > 0) {
                        logger("Enabling MIME types compression...");
                        addMimeCompressions(mimes);
                    }

                    if(extensions.length > 0) {
                        logger("Enabling extenstions compression...");
                        addExtensionCompressions(extensions);
                    }
                    break;
            }

            if(compressionConf != "") {
                try {
                    await checkConfFolder();
                    await utils.writeFile("conf.d/compression.conf", "<IfModule mod_deflate.c>\n" + compressionConf + "</IfModule>");
                } catch(error) {
                    throw "Cannot write compression settings: " + error;
                }
            }
        }

        let cacheOption = projectData.server_options?.cachecontrol;
        if(cacheOption != undefined) {
            let cacheConf = "";
            let cacheType = typeof cacheOption;

            switch(cacheType) {
                case "boolean":
                    if(projectData.options.options.cachecontrol) {
                        logger("Enabling default cache control...");
                        logger("WARNING: Cache-Control header will be set to all files!");
                        cacheConf = "Header set Cache-Control \"max-age=604800, public\"";
                    }
                    break;
                case "string":
                    if(cacheOption == "$assets") {
                        logger("Enabling cache control for assets...");
                        cacheConf = "<FilesMatch \"\\.(ico|jpg|jpeg|png|gif|avif|apng|jfif|pjpeg|pjp|tif|tiff|bmp|webp|webm|mp4|mov|mkv|avi|m4v|mpeg|ogv|css|js|svg|woff|woff2|ttf|eot|otf|mp3|m4a|aac|oga|ogg|wav)$\">\nHeader set Cache-Control \"max-age=604800, public\"\n</FilesMatch>";
                    } else if(cacheOption == "$lighthouse") {
                        logger("Enabling cache control according to Lighthouse efficient cache policy (97 days for assets)...");
                        cacheConf = "<FilesMatch \"\\.(ico|jpg|jpeg|png|gif|avif|apng|jfif|pjpeg|pjp|tif|tiff|bmp|webp|webm|mp4|mov|mkv|avi|m4v|mpeg|ogv|css|js|svg|woff|woff2|ttf|eot|otf|mp3|m4a|aac|oga|ogg|wav)$\">\nHeader set Cache-Control \"max-age=8380800, public\"\n</FilesMatch>";
                    } else {
                        logger("Enabling cache control...");
                        logger("WARNING: Cache-Control header will be set to all files!");
                        cacheConf = "Header set Cache-Control \"" + cacheOption + "\"";
                    }
                    break;
                case "object":
                    if(Array.isArray(cacheOption)) break;

                    for(let [extensions, rule] of Object.entries(cacheOption)) {
                        if(!extensions.match(/^([a-zA-Z0-9.]{1,12}[ ,]{0,1})+$/g))
                            continue;

                        logger("Enabling cache control for " + extensions.join(", ") + "...");
                        cacheConf += "<FilesMatch \"\\.(" + extensions.join(",") + ")$\">\nHeader set Cache-Control \"" + rule + "\"\n</FilesMatch>\n";
                    }
                    break;
            }

            if(cacheConf != "") {
                try {
                    await checkConfFolder();
                    await utils.writeFile("conf.d/cache_control.conf", cacheConf);
                } catch(error) {
                    throw "Cannot write cache-control settings: " + error;
                }
            }
        }

        return entrypoint;
    }

    static async imageDetails(projectData) {
        return super._imageDetails("pmng/apache2-php7");
    }
}

module.exports = ApachePHPBuildpack;