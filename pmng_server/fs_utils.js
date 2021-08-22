const pfs = require("fs").promises;

async function moveDirectory(source, dest, forbidden_names = [], forbidden_root_names = []) {
    try {
        await pfs.mkdir(dest);
    } catch(e) {
        if(e.code != "EEXIST") throw e;
    }

    let subs = await Promise.all((await pfs.readdir(source)).map((x) => pfs.stat(path.join(source, x)).then((stat) => {
        return [x, stat];
    })));

    let current = [];
    for(let [name, stat] of subs) {

        if(!forbidden_files.includes(name) && !forbidden_root_files.includes(name)) {
            if(stat.isDirectory()) {
                current.push(moveDirectory(path.join(source, name), path.join(dest, name), forbidden_names));
            } else if(stat.isFile()) {
                current.push(pfs.rename(path.join(source, name), path.join(dest, name)));
            }
        }
    }

    return Promise.all(current);
}


module.exports.moveDirectory = moveDirectory;