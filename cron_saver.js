#!/usr/bin/env node
// executed by user cron task
const pfs = require("fs").promises;
const path = require("path");
const tar = require("tar");

const PMNG_DIR="/etc/pmng";
process.chdir(PMNG_DIR);
require("dotenv").config();


async function saveStorages() {
    let startTime = new Date();
    console.log(">>>> Saving contents on " + startTime.toString() + ":");
    try {
        let storagesDir = path.resolve(process.env.PLUGINS_PATH, "storages", "mounts");
        let projects = await pfs.readdir(storagesDir);
        let savesCount = parseInt(process.env.SAVES_COUNT);
        startTime = startTime.getTime();

        for(let project of projects) {
            if(project == "ledosmaths" || project == "naixd") continue;
            // temporary fix for large projects

            let projectStorageDir = path.resolve(storagesDir, project);
            try {
                let stats = await pfs.stat(projectStorageDir);
                if(!stats.isDirectory()) {
                    console.log(project + " is not a directory. Continue...");
                    continue;
                } else {
                    console.log("Saving project " + project + "...");
                }
            } catch(error) {
                console.warn("Cannot access " + project + ". Continue...");
                continue;
            }

            let projectDir = path.resolve(process.env.SAVES_PATH, project)
            let projectSavesDir = path.resolve(projectDir, "storages");
            let projectSqlDir = path.resolve(projectDir, "databases");

            let saves = [];
            try {
                saves = await pfs.readdir(projectSavesDir);
            } catch(error) {
                await pfs.mkdir(projectDir);
                await pfs.mkdir(projectSavesDir);
                await pfs.mkdir(projectSqlDir);
            }

            let contents = await pfs.readdir(projectStorageDir);
            if(contents.includes("lost+found")) contents.splice(contents.indexOf("lost+found"), 1);

            if(contents.length == 0) {
                console.log("Project " + project + " is empty. Continue...");
            } else {
                let savePath = path.resolve(projectSavesDir, project + "_" + startTime + ".tar.gz");
                await tar.c({
                    file: savePath,
                    gzip: true,
                    cwd: projectStorageDir
                }, contents);

                console.log("Project " + project + " saved!");

                // only keep n saves from process.env.SAVES_COUNT
                let timestamps = [];
                for(let save of saves) {
                    if(save.startsWith(project + "_")) timestamps.push(parseInt(save.split(".")[0].split("_")[1]));
                }

                timestamps.sort();

                for(let i = 0; i < Math.max(0, timestamps.length - savesCount); i++) {
                    await pfs.unlink(path.resolve(projectSavesDir, project + "_" + timestamps[i] + ".tar.gz"));
                }
            }
        }
    } catch(error) {
        console.error("Cannot save storages:");
        console.error(error);
    }

    console.log("");
}

saveStorages();
