const Docker = require("node-docker-api").Docker;
const docker = new Docker({socketPath: "/var/run/docker.sock"});

(async function() {
    let containers = await docker.container.list({all: true, filters: {name: ["eager_raman"]}});
    console.log(containers);
})();