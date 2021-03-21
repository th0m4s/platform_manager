curl -s -o /dev/null --unix-socket /var/run/pmng_execs.sock http://localhost/exec/$1/$$
su - project -s /bin/bash "-c ${@:2}"