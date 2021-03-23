# Platform Manager

Plaform Manager *aka. PMNG* is a NodeJS program to manage dockerized projects on a physical machine or a virtual server, including Docker management, admin panel, Git server and many more...

## Requirements

This project requires a Unix-based operating system (Windows and MacOS are not supported) running NodeJS `v15.0.0` or above.

The only officially support platform is Ubuntu, but any other should work including Debian.

This program also requires a MariaDB server and Docker (these can run on another device). They can be installed using the following command on Debian and its derivatives:
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

Give the contents of that directory to your program user...
```bash
chown -R pmng:pmng ./
```

...and get back the ownership of a system file) then link it to the `/etc/logrotate.d` directory:
```bash
chown root:root ./utils/pmng.logrotate
ln -s /etc/pmng/utils/pmng.logrotate /etc/logrotate.d/pmng
```

Now login as your program user and edit with your favorite editor the `.env` conf file:
```bash
su pmng
nano .env
```
Check `.env.sample` for a list of all available settings.

You then need to create 3 directories for projects, plugins and saves. These can be located inside `/etc/pmng` but can also be elsewhere (just change the config options in `.env`):
```bases
mkdir ./projects ./plugins ./saves
```
