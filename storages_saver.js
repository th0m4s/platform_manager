#!/usr/bin/env node
// executed by user cron task
const pfs = require("fs").promises;
const path = require("path");
const tar = require("tar");

const PMNG_DIR="/etc/pmng";

process.chdir(PMNG_DIR);
require("dotenv").config();


async function saveStorages() {
    console.log(">>>> Saving storages on " + new Date().toString() + ":");
    try {
        let storagesDir = path.resolve(process.env.PLUGINS_PATH, "storages", "mounts");
        let projects = await pfs.readdir(storagesDir);

        for(let project of projects) {
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

            let projectSavesDir = path.resolve(process.env.SAVES_PATH, project);

            try {
                await pfs.access(projectSavesDir);
            } catch(error) {
                await pfs.mkdir(projectSavesDir);
            }

            let contents = await pfs.readdir(projectStorageDir);
            if(contents.includes("lost+found")) contents.splice(contents.indexOf("lost+found"), 1);

            if(contents.length == 0) {
                console.log("Project " + project + " is empty. Continue...");
            } else {
                let savePath = path.resolve(projectSavesDir, project + "_" + (new Date().getTime()) + ".tar.gz");
                await tar.c({
                    file: savePath,
                    gzip: true,
                    cwd: projectStorageDir
                }, contents);

                console.log("Project " + project + " saved!");
            }
        }
    } catch(error) {
        console.error("Cannot save storages:");
        console.error(error);
    }

    console.log("");
}

saveStorages();
