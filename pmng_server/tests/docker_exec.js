const Docker = require("node-docker-api").Docker;
const docker = new Docker({socketPath: "/var/run/docker.sock"});

(async () => {
    let container = await docker.container.create({
        Image: "pmng/node",
        name: "docker_tests_node",
        Tty: true,
        HostConfig: {
            AutoRemove: true
        },
        Entrypoint: ["/bin/bash"]
    });

    await container.start();

    let execute = async (command, logReceived = undefined, buffer = false) => {
        let exec = await container.exec.create({
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
            Cmd: ["/bin/bash", "-c", command]
        });

        let stream = await exec.start({
            Detach: false
        });

        return new Promise((resolve, reject) => {
            let out = logReceived == undefined ? "" : undefined;
            let err = logReceived == undefined ? "" : undefined;
            stream.on("data", (data) => {
                if(out == undefined && buffer) {
                    logReceived(data);
                } else {
                    let string = data.toString(), contents = string.substring(8), stream = string.charCodeAt(0);
                    if(out == undefined) {
                        logReceived(stream, contents);
                    } else if(stream == 1) out += contents;
                    else err += contents;
                }
            });

            stream.on("end", () => {
                resolve({out, err})
            });

            stream.on("error", () => {
                reject({out, err});
            });
        });
    };

    console.log("Start exec:");
    console.log(await execute("echo test >&1"));
    console.log("Exec ended!");

    await container.stop();
})();