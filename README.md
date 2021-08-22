# Platform Manager

Plaform Manager *aka. PMNG* is a NodeJS program to manage dockerized projects on a physical machine or a virtual server, including Docker management, admin panel, Git server and many more...

## Requirements

This project requires a Unix-based operating system (Windows and MacOS are not supported) running NodeJS `v15.0.0` or above and Yarn.

The only officially supported platform is Ubuntu, but any other should work including Debian.

This program also requires a MariaDB server and Docker (these can run on another device). They can be installed using the following command on Debian and its derivatives (as `root`):
```bash
apt install mariadb-server docker
```

## Installation

PMNG starts as `root` but drops its privileges after all the port bindings are done, so make sure to have a user ready for that, like `pmng`.

As `root`, create a directory for the program and clone the program inside the newly created directory:
```bash
mkdir /etc/pmng && cd /etc/pmng
git clone https://github.com/th0m4s/platform_manager.git .
```

Now edit with your favorite editor the `.env` conf file:
```bash
nano .env
```
Check `.env.sample` for a list of all available settings.
Further edits of this file should be done as your program user to avoid permission errors.

Only when your configuration is ready and still as root, run the `checkinstall` Yarn command to install some system files, check permissions and install node packages inside *node_modules* with:
```bash
yarn run checkinstall
```

Then your setup is ready, you can start the service as root with:
```bash
service pmng start
```

And stop or restart it with (still as root):
```bash
service pmng (stop|restart)
```

## Update

You need to pull the files (not as `root`) from the repository with:
```bash
git pull
```

If you see that *yarn.lock*, *package.json* or a file inside */utils* was modified, please run as `root` the `checkinstall` Yarn command to update system files and/or *node_modules*:
```bash
yarn run checkinstall
```

When you're ready, restart the service (as `root`) with:
```bash
service pmng restart
```