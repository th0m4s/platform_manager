const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const BootstrapEmail = require("bootstrap-email");

process.chdir(__dirname);
const srcDir = path.resolve(__dirname, "src");
const distDir = path.resolve(__dirname, "dist");

function buildFile(name) {
    name = path.basename(name);
    console.log("  Building " + name + "...");

    let be = new BootstrapEmail(path.resolve(srcDir, name), {cheerioOptions: {decodeEntities: false}});
    be.compileAndSave(path.resolve(distDir, name));
}

function buildAllFiles() {
    console.log("Building all files...");

    let srcList = fs.readdirSync(srcDir), distList = fs.readdirSync(distDir);
    for(let name of srcList)
        distList.splice(distList.indexOf(name), 1);

    for(let unkName of distList)
        fs.unlinkSync(path.resolve(distDir, unkName));

    if(srcList.length > 0) {
        let be = new BootstrapEmail(srcList.map((x) => path.resolve(srcDir, x)), {cheerioOptions: {decodeEntities: false}});
        be.compileAndSave(srcList.length == 1 ? path.resolve(distDir, srcList[0]) : distDir);
    }
}

buildAllFiles();

if(process.argv.includes("--watch")) {
    console.log("Watching mail templates for changes...");

    let templatesWatcher = chokidar.watch(srcDir, {ignoreInitial: true});
    templatesWatcher.on("add", file => {buildFile(path.basename(file))})
        .on("change", file => {buildFile(path.basename(file))})
        .on("unlink", file => {fs.unlinkSync(path.resolve(distDir, path.basename(file)))});
}