const fs = require("fs"), pfs = fs.promises;
const chownr = require("chownr");
const path = require("path");
const privileges = require("../pmng_server/privileges");
const child_process = require("child_process");

(async () => {
    if(process.getuid() != 0) {
        console.error("Please run this command as root or with:");
        console.error("  sudo yarn run checkinstall");
        console.error();

        process.exit(1);
    }

    require("dotenv").config();
    process.env.HOME = process.env.PROC_HOME;

    console.log("PLATFORM MANAGER INSTALL SCRIPT");

    const cwd = process.cwd();
    const userDroppingOptions = privileges.droppingOptions(false);

    console.log("  - Checking directory ower...");
    chownr.sync(cwd, ...userDroppingOptions);

    let containerUtilsDir = path.resolve(cwd, "container_utils");
    try {
        await pfs.access(containerUtilsDir);
        console.log("  - Checking owner of container_utils directory...");
        chownr.sync(containerUtilsDir, 0, 0);
    } catch(_) {
        console.log("  - Creating container_utils directory...");
        await pfs.mkdir(containerUtilsDir);
    }
    
    let utilsDir = path.resolve(cwd, "utils");

    let logrotateEtcPath = "/etc/logrotate.d/pmng", logrotateUtilsPath = path.resolve(utilsDir, "pmng.logrotate");
    try {
        await pfs.access(logrotateEtcPath);
        await pfs.unlink(logrotateEtcPath);
    } catch(_) { }
    console.log("  - Copying logrotate configuration...");
    await pfs.copyFile(logrotateUtilsPath, logrotateEtcPath);
    await pfs.chown(logrotateEtcPath, 0, 0);
    await pfs.chmod(logrotateEtcPath, 0o644);


    let serviceEtcPath = "/etc/init.d/pmng", serviceUtilsPath = path.resolve(utilsDir, "pmng.service");
    try {
        await pfs.access(serviceEtcPath);
        await pfs.unlink(serviceEtcPath);
    } catch(_) { }
    console.log("  - Copying service file...");
    await pfs.writeFile(serviceEtcPath, (await pfs.readFile(serviceUtilsPath)).toString("utf-8").replace(/%PMNG_MAIN_SCRIPT%/g, path.resolve(cwd, "platform_manager.js")));
    await pfs.chown(serviceEtcPath, 0, 0);
    await pfs.chmod(serviceEtcPath, 0o744);

    let specialPaths = ["projects", "plugins", "saves"];
    for(let specialFolder of specialPaths) {
        let specialPath = process.env[specialFolder.toUpperCase() + "_PATH"];

        console.log("  - Checking " + specialFolder + " folder...");
        try {
            await pfs.access(specialPath);
        } catch(_) {
            console.log("  - Creating " + specialFolder + " folder...");
            await pfs.mkdir(specialPath);
        }
        chownr.sync(specialPath, ...userDroppingOptions);
    }

    privileges.drop();

    console.log("\n  - Installing packages...");
    child_process.execSync("yarn install", {stdio: "inherit"});
})();